const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { UnauthorizedError, NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');

/**
 * 认证服务
 */
class AuthService {
    /**
     * 管理员登录（使用邮箱 + 密码 + 图片验证码）
     */
    async login(email, password, captchaCode, sessionId) {
        // 验证验证码
        const captchaService = require('./captcha.service');
        await captchaService.verifyLoginCaptcha(sessionId, captchaCode);

        // 查找管理员（通过邮箱）
        const admin = await prisma.admin.findUnique({
            where: { email }
        });

        if (!admin) {
            throw new UnauthorizedError('Invalid credentials');
        }

        // 检查账号状态
        if (admin.status !== 'active') {
            throw new UnauthorizedError('Account is inactive');
        }

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            throw new UnauthorizedError('Invalid credentials');
        }

        // 更新最后登录时间
        await prisma.admin.update({
            where: { id: admin.id },
            data: { lastLogin: new Date() }
        });

        // 生成 JWT Token
        const token = jwt.sign(
            {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '24h'
            }
        );

        // 记录登录日志
        const logService = require('./log.service');
        await logService.logAdminAction({
            adminId: admin.id,
            action: 'LOGIN',
            targetType: 'admin',
            targetId: admin.id,
            details: { username: admin.username },
            result: 'success'
        });

        return {
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        };
    }

    /**
     * 获取当前管理员信息
     */
    async getCurrentAdmin(adminId) {
        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                status: true,
                lastLogin: true,
                createdAt: true
            }
        });

        if (!admin) {
            throw new NotFoundError('Admin not found');
        }

        return admin;
    }

    /**
     * 创建管理员（仅超级管理员可以创建）
     * @param {Object} data - 管理员数据
     * @param {String} creatorId - 创建者ID（必须是 super_admin）
     */
    async createAdmin(data, creatorId) {
        const { ROLES } = require('../constants/roles');

        // 验证创建者必须是 super_admin
        if (!creatorId) {
            throw new UnauthorizedError('Creator ID is required');
        }

        const creator = await prisma.admin.findUnique({
            where: { id: creatorId }
        });

        if (!creator || creator.role !== ROLES.SUPER_ADMIN) {
            throw new UnauthorizedError('Only super admin can create administrators');
        }

        // 验证角色（不能是超级管理员）
        if (data.role === ROLES.SUPER_ADMIN) {
            throw new BadRequestError('Super admin cannot be created through this method');
        }

        // 验证角色是否有效
        const validRoles = [
            ROLES.PLATFORM_ADMIN,
            ROLES.OPERATOR,
            ROLES.RISK_CONTROL,
            ROLES.FINANCE,
            ROLES.READ_ONLY
        ];
        if (!validRoles.includes(data.role)) {
            throw new BadRequestError('Invalid role');
        }

        // 检查用户名是否已存在
        const existingUsername = await prisma.admin.findUnique({
            where: { username: data.username }
        });
        if (existingUsername) {
            throw new ConflictError('Username already exists');
        }

        // 检查邮箱是否已存在
        const existingEmail = await prisma.admin.findUnique({
            where: { email: data.email }
        });
        if (existingEmail) {
            throw new ConflictError('Email already exists');
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // 创建管理员
        const admin = await prisma.admin.create({
            data: {
                username: data.username,
                email: data.email,
                password: hashedPassword,
                role: data.role,
                status: data.status || 'active'
            }
        });

        // 记录操作日志
        const logService = require('./log.service');
        await logService.logAdminAction({
            adminId: creatorId,
            action: 'CREATE_ADMIN',
            targetType: 'admin',
            targetId: admin.id,
            details: {
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        });

        return {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            role: admin.role,
            status: admin.status
        };
    }


    /**
     * 修改密码
     */
    async changePassword(adminId, oldPassword, newPassword) {
        const admin = await prisma.admin.findUnique({
            where: { id: adminId }
        });

        if (!admin) {
            throw new NotFoundError('Admin not found');
        }

        // 验证旧密码
        const isValidPassword = await bcrypt.compare(oldPassword, admin.password);
        if (!isValidPassword) {
            throw new UnauthorizedError('Invalid old password');
        }

        // 加密新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 更新密码
        await prisma.admin.update({
            where: { id: adminId },
            data: { password: hashedPassword }
        });

        // 记录操作日志
        const logService = require('./log.service');
        await logService.logAdminAction({
            adminId: adminId,
            action: 'CHANGE_PASSWORD',
            targetType: 'admin',
            targetId: adminId,
            details: {},
            result: 'success'
        });

        return { success: true };
    }

    /**
     * 批量导入管理员账号（Excel）
     * 注意：批量导入跳过验证码验证（因为是管理员操作）
     */
    async batchRegister(dataList, defaultPassword = null, adminId = null, ipAddress = null) {
        const { ROLES } = require('../constants/roles');
        const results = [];
        const logService = require('./log.service');

        // 如果没有提供默认密码，生成随机密码
        const generateRandomPassword = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
            let password = '';
            for (let i = 0; i < 12; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return password;
        };

        for (let i = 0; i < dataList.length; i++) {
            const data = dataList[i];
            const result = {
                row: i + 2, // Excel 行号（第一行是标题）
                username: data.username,
                email: data.email,
                role: data.role,
                status: 'success',
                message: '',
                password: null
            };

            try {
                // 验证角色（不能是超级管理员）
                if (data.role === ROLES.SUPER_ADMIN) {
                    throw new BadRequestError('Super admin cannot be registered');
                }

                // 检查邮箱是否已存在
                const existingEmail = await prisma.admin.findUnique({
                    where: { email: data.email.trim() }
                });
                if (existingEmail) {
                    throw new ConflictError('Email already registered');
                }

                // 检查用户名是否已存在
                const existingUsername = await prisma.admin.findUnique({
                    where: { username: data.username.trim() }
                });
                if (existingUsername) {
                    throw new ConflictError('Username already exists');
                }

                // 使用提供的密码或生成随机密码
                const password = data.password || defaultPassword || generateRandomPassword();
                const hashedPassword = await bcrypt.hash(password, 10);

                // 创建管理员账号
                const admin = await prisma.admin.create({
                    data: {
                        username: data.username.trim(),
                        email: data.email.trim(),
                        password: hashedPassword,
                        role: data.role.trim() || ROLES.READ_ONLY,
                        status: 'active'
                    }
                });

                result.message = 'Registered successfully';
                result.password = password; // 保存密码以便返回给管理员

                // 记录注册日志
                if (adminId) {
                    await logService.logAdminAction({
                        adminId,
                        action: 'BATCH_REGISTER',
                        targetType: 'admin',
                        targetId: admin.id,
                        details: {
                            username: admin.username,
                            email: admin.email,
                            role: admin.role,
                            batch: true
                        },
                        ipAddress
                    });
                }
            } catch (error) {
                result.status = 'failed';
                result.message = error.message || 'Registration failed';
            }

            results.push(result);
        }

        return results;
    }
}

module.exports = new AuthService();
