const prisma = require('../config/database');
const emailService = require('./email.service');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const crypto = require('crypto');

/**
 * 验证码服务
 */
class VerificationService {
  /**
   * 生成6位数字验证码
   */
  generateCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * 发送后台管理员注册验证码
   */
  async sendAdminRegisterCode(email, role) {
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestError('Invalid email format');
    }

    // 验证角色（不能是超级管理员）
    const { ROLES } = require('../constants/roles');
    if (role === ROLES.SUPER_ADMIN) {
      throw new BadRequestError('Super admin cannot be registered');
    }

    // 检查邮箱是否已被注册（检查 Admin 表）
    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    });
    if (existingAdmin) {
      throw new BadRequestError('Email already registered');
    }

    // 检查是否在1分钟内发送过验证码（防刷）
    const recentCode = await prisma.emailVerification.findFirst({
      where: {
        email,
        type: 'register',
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000) // 1分钟内
        },
        used: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (recentCode) {
      throw new BadRequestError('Please wait 60 seconds before requesting another code');
    }

    // 生成验证码
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期

    // 保存验证码到数据库
    await prisma.emailVerification.create({
      data: {
        email,
        code,
        type: 'register',
        expiresAt,
        used: false
      }
    });

    // 发送邮件
    try {
      await emailService.sendVerificationCode(email, code, '管理员注册');
    } catch (error) {
      // 如果邮件发送失败，删除验证码记录
      await prisma.emailVerification.deleteMany({
        where: {
          email,
          code,
          type: 'admin_register'
        }
      });
      throw new BadRequestError('Failed to send verification email. Please try again later.');
    }

    return {
      success: true,
      message: 'Verification code sent successfully',
      expiresIn: 600 // 10分钟，单位：秒
    };
  }

  /**
   * 验证后台管理员注册验证码
   */
  async verifyAdminRegisterCode(email, code) {
    // 查找验证码
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        type: 'admin_register',
        used: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!verification) {
      throw new BadRequestError('Invalid verification code');
    }

    // 检查是否过期
    if (new Date() > verification.expiresAt) {
      throw new BadRequestError('Verification code has expired');
    }

    // 标记为已使用
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { used: true }
    });

    return {
      success: true,
      verified: true
    };
  }

  /**
   * 清理过期的验证码
   */
  async cleanExpiredCodes() {
    const result = await prisma.emailVerification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return { deletedCount: result.count };
  }
}

module.exports = new VerificationService();
