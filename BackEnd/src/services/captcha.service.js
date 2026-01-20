const crypto = require('crypto');
const svgCaptcha = require('svg-captcha');
const prisma = require('../config/database');
const { BadRequestError } = require('../utils/errors');

/**
 * 验证码服务（用于登录验证）
 */
class CaptchaService {
  /**
   * 生成图片验证码（用于登录）
   * 返回验证码图片（base64）和 sessionId（用于验证）
   */
  async generateLoginCaptcha() {
    // 生成验证码配置
    const captcha = svgCaptcha.create({
      size: 4, // 验证码长度
      ignoreChars: '0o1il', // 排除容易混淆的字符
      noise: 3, // 干扰线条数量
      color: true, // 彩色
      background: '#f0f0f0', // 背景色
      width: 120,
      height: 40,
      fontSize: 50,
      charPreset: '123456789ABCDEFGHJKLMNPQRSTUVWXYZ' // 字符集（排除容易混淆的字符）
    });

    const code = captcha.text.toUpperCase(); // 转换为大写，不区分大小写验证
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期

    // 保存验证码到数据库（使用 sessionId 作为标识）
    await prisma.emailVerification.create({
      data: {
        email: `captcha_${sessionId}`, // 使用特殊格式标识这是登录验证码
        code: code.toLowerCase(), // 存储为小写，验证时不区分大小写
        type: 'login_captcha',
        expiresAt,
        used: false
      }
    });

    // 将 SVG 转换为 base64 数据 URL
    const svgBase64 = Buffer.from(captcha.data).toString('base64');
    const imageUrl = `data:image/svg+xml;base64,${svgBase64}`;

    return {
      sessionId,
      imageUrl, // 返回 base64 图片
      expiresIn: 300 // 5分钟，单位：秒
    };
  }

  /**
   * 验证登录验证码（不区分大小写）
   */
  async verifyLoginCaptcha(sessionId, code) {
    // 查找验证码
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email: `captcha_${sessionId}`,
        type: 'login_captcha',
        used: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!verification) {
      throw new BadRequestError('Invalid captcha code');
    }

    // 检查是否过期
    if (new Date() > verification.expiresAt) {
      throw new BadRequestError('Captcha code has expired');
    }

    // 验证码不区分大小写比较
    if (verification.code.toLowerCase() !== code.toLowerCase()) {
      throw new BadRequestError('Invalid captcha code');
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
  async cleanExpiredCaptchas() {
    const result = await prisma.emailVerification.deleteMany({
      where: {
        type: 'login_captcha',
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return { deletedCount: result.count };
  }
}

module.exports = new CaptchaService();

