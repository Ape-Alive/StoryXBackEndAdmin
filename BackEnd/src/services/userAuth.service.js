const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../config/database')
const { UnauthorizedError, NotFoundError, BadRequestError, ConflictError } = require('../utils/errors')
const { ROLES } = require('../constants/roles')
const userEntitlementService = require('./userEntitlement.service')

/**
 * 终端用户认证服务（C端用户）
 */
class UserAuthService {
  async buildAuthPayload(user, tokens = {}) {
    const entitlement = await userEntitlementService.computeForUser(user.id)
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      entitlement,
    }
  }

  /**
   * 发送注册验证码（终端用户注册）
   */
  async sendRegisterCode(email) {
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new BadRequestError('Invalid email format')
    }

    // 检查邮箱是否已被注册（检查 User 表）
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })
    if (existingUser) {
      throw new ConflictError('Email already registered')
    }

    // 检查是否在1分钟内发送过验证码（防刷）
    const recentCode = await prisma.emailVerification.findFirst({
      where: {
        email,
        type: 'user_register',
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000), // 1分钟内
        },
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (recentCode) {
      throw new BadRequestError('Please wait 60 seconds before requesting another code')
    }

    // 生成验证码
    const verificationService = require('./verification.service')
    const code = verificationService.generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10分钟后过期

    // 保存验证码到数据库
    await prisma.emailVerification.create({
      data: {
        email,
        code,
        type: 'user_register',
        expiresAt,
        used: false,
      },
    })

    // 发送邮件
    const emailService = require('./email.service')
    try {
      await emailService.sendVerificationCode(email, code, '注册')
    } catch (error) {
      // 如果邮件发送失败，删除验证码记录
      await prisma.emailVerification.deleteMany({
        where: {
          email,
          code,
          type: 'user_register',
        },
      })
      throw new BadRequestError('Failed to send verification email. Please try again later.')
    }

    return {
      success: true,
      message: 'Verification code sent successfully',
      expiresIn: 600, // 10分钟，单位：秒
    }
  }

  /**
   * 验证注册验证码（终端用户）
   */
  async verifyRegisterCode(email, code) {
    // 查找验证码
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        type: 'user_register',
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!verification) {
      throw new BadRequestError('Invalid verification code')
    }

    // 检查是否过期
    if (new Date() > verification.expiresAt) {
      throw new BadRequestError('Verification code has expired')
    }

    // 标记为已使用
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { used: true },
    })

    return {
      success: true,
      verified: true,
    }
  }

  /**
   * 检查用户设备数量限制
   */
  async checkDeviceLimit(userId) {
    const activePackages = await userEntitlementService.getActiveUserPackagesForUser(userId)

    const deviceCount = await prisma.device.count({
      where: {
        userId,
        status: 'active',
      },
    })

    const effectiveUserPackage = userEntitlementService.getEffectiveUserPackage(activePackages)
    const maxDevices = effectiveUserPackage?.package?.maxDevices ?? null

    if (maxDevices === null) {
      return { allowed: true, currentCount: deviceCount, maxDevices: null }
    }

    if (deviceCount >= maxDevices) {
      return {
        allowed: false,
        currentCount: deviceCount,
        maxDevices,
        message: `Device limit reached. Maximum ${maxDevices} devices allowed.`,
      }
    }

    return { allowed: true, currentCount: deviceCount, maxDevices }
  }

  /**
   * 添加或更新用户设备
   */
  async addOrUpdateDevice(userId, deviceFingerprint, ipAddress = null) {
    // 检查设备是否已存在
    const existingDevice = await prisma.device.findUnique({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint,
        },
      },
    })

    if (existingDevice) {
      // 如果设备已被 revoke，需要先检查设备数量限制
      if (existingDevice.status === 'revoked') {
        const limitCheck = await this.checkDeviceLimit(userId)
        if (!limitCheck.allowed) {
          throw new BadRequestError(limitCheck.message)
        }
      }

      // 如果设备没有名称，生成默认名称
      const updateData = {
        lastUsedAt: new Date(),
        ipAddress: ipAddress || existingDevice.ipAddress,
        status: 'active', // 恢复为 active 状态
      }

      // 如果设备没有名称，自动生成默认名称
      if (!existingDevice.name) {
        const defaultName =
          deviceFingerprint && deviceFingerprint.length >= 8
            ? `设备-${deviceFingerprint.substring(0, 8)}`
            : `设备-${deviceFingerprint || 'unknown'}`
        updateData.name = defaultName
      }

      // 更新设备最后使用时间和状态（如果是 revoked，恢复为 active）
      const device = await prisma.device.update({
        where: { id: existingDevice.id },
        data: updateData,
      })
      return device
    }

    // 检查设备数量限制
    const limitCheck = await this.checkDeviceLimit(userId)
    if (!limitCheck.allowed) {
      throw new BadRequestError(limitCheck.message)
    }

    // 基于设备指纹生成默认名称（取前8位）
    const defaultName =
      deviceFingerprint && deviceFingerprint.length >= 8
        ? `设备-${deviceFingerprint.substring(0, 8)}`
        : `设备-${deviceFingerprint || 'unknown'}`

    // 创建新设备
    const device = await prisma.device.create({
      data: {
        userId,
        deviceFingerprint,
        name: defaultName,
        ipAddress,
        status: 'active',
        lastUsedAt: new Date(),
      },
    })

    return device
  }

  /**
   * 终端用户注册（激活码 + 邮箱验证码 + 可选手机 + 设备指纹）
   * 注册成功后核销激活码并绑定其指定套餐
   */
  async register(data) {
    const activationCodeService = require('./activationCode.service')
    const userPackageService = require('./userPackage.service')

    const email = String(data.email || '').trim().toLowerCase()
    const phone =
      data.phone != null && String(data.phone).trim() !== '' ? String(data.phone).trim() : null

    const redeemable = await activationCodeService.assertRedeemable(data.activationCode, {
      email,
      phone,
    })

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      throw new ConflictError('Email already registered')
    }

    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } })
      if (existingPhone) {
        throw new ConflictError('Phone already registered')
      }
    }

    await this.verifyRegisterCode(email, data.verificationCode)

    const hashedPassword = await bcrypt.hash(data.password, 10)

    let user
    try {
      user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            phone,
            password: hashedPassword,
            role: ROLES.BASIC_USER,
            status: 'normal',
          },
        })
        await activationCodeService.markUsed(redeemable.id, created.id, tx)
        return created
      })
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictError('Email or phone already registered')
      }
      throw error
    }

    try {
      await userPackageService.assignPackage(
        {
          userId: user.id,
          packageId: redeemable.packageId,
        },
        redeemable.createdBy,
        data.ipAddress || null,
      )

      // 确认套餐已落到当前用户
      const bound = await prisma.userPackage.findFirst({
        where: {
          userId: user.id,
          packageId: redeemable.packageId,
        },
      })
      if (!bound) {
        throw new BadRequestError('套餐绑定失败，请联系管理员')
      }
    } catch (error) {
      // 补偿：套餐发放失败则回滚用户与激活码，避免半成功账号
      try {
        await prisma.activationCode.update({
          where: { id: redeemable.id },
          data: {
            status: 'unused',
            usedAt: null,
            usedByUserId: null,
          },
        })
        await prisma.user.delete({ where: { id: user.id } })
      } catch (_) {
        /* ignore */
      }
      throw error
    }

    if (data.deviceFingerprint) {
      await this.addOrUpdateDevice(user.id, data.deviceFingerprint, data.ipAddress || null)
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        type: 'user',
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      },
    )

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      entitlement: await userEntitlementService.computeForUser(user.id),
    }
  }

  /**
   * 终端用户登录（使用邮箱 + 密码 + 设备指纹）
   * 不需要图形验证码
   */
  async login(email, password, deviceFingerprint = null, ipAddress = null) {
    // 查找用户（通过邮箱）
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new UnauthorizedError('Invalid credentials')
    }

    // 检查账号状态
    if (user.status !== 'normal') {
      throw new UnauthorizedError(`Account is ${user.status}`)
    }

    // 验证密码
    if (!user.password) {
      throw new UnauthorizedError('Password not set')
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials')
    }

    // 如果提供了设备指纹，添加或更新设备（会检查设备数量限制）
    if (deviceFingerprint) {
      await this.addOrUpdateDevice(user.id, deviceFingerprint, ipAddress)
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // 获取设备ID（如果提供了设备指纹）
    let deviceId = null
    if (deviceFingerprint) {
      const device = await prisma.device.findUnique({
        where: {
          userId_deviceFingerprint: {
            userId: user.id,
            deviceFingerprint: deviceFingerprint,
          },
        },
      })
      if (device) {
        deviceId = device.id
      }
    }

    // 生成访问令牌和刷新令牌
    const tokens = await this.generateTokens(user, deviceId, ipAddress)

    return this.buildAuthPayload(user, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      token: tokens.accessToken,
    })
  }

  /**
   * 生成访问令牌和刷新令牌
   */
  async generateTokens(user, deviceId = null, ipAddress = null) {
    // 生成访问令牌（10分钟）
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        type: 'user',
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '10m', // 10分钟
      }
    )

    // 生成刷新令牌（30天）
    const refreshToken = jwt.sign(
      {
        id: user.id,
        type: 'refresh',
        deviceId: deviceId || null,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '30d', // 30天
      }
    )

    // 保存刷新令牌到数据库
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30天后过期

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        deviceId: deviceId || null,
        token: refreshToken,
        accessToken: accessToken,
        expiresAt,
        ipAddress: ipAddress || null,
      },
    })

    return {
      accessToken,
      refreshToken,
    }
  }

  /**
   * 生成一次性token（用于桌面端登录）
   * @param {string} userId - 用户ID
   * @param {string} ipAddress - IP地址（可选）
   * @param {number} expiresInMinutes - 过期时间（分钟），默认10分钟
   */
  async generateOneTimeToken(userId, ipAddress = null, expiresInMinutes = 10) {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    // 检查账号状态
    if (user.status !== 'normal') {
      throw new BadRequestError(`Account is ${user.status}`)
    }

    // 生成一次性token（JWT格式）
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes)

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: 'one_time',
        expiresAt: expiresAt.getTime(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: `${expiresInMinutes}m`,
      }
    )

    // 保存到数据库
    const oneTimeToken = await prisma.oneTimeToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        ipAddress: ipAddress || null,
      },
    })

    return {
      token,
      expiresAt,
      expiresIn: expiresInMinutes * 60, // 秒
    }
  }

  /**
   * 桌面端登录（使用一次性token和设备指纹）
   * @param {string} token - 一次性token
   * @param {string} deviceId - 设备指纹（必填）
   * @param {string} ipAddress - IP地址（可选）
   */
  async desktopLogin(token, deviceId, ipAddress = null) {
    // 验证设备指纹
    if (!deviceId) {
      throw new BadRequestError('Device ID is required')
    }

    // 查找一次性token记录
    const oneTimeTokenRecord = await prisma.oneTimeToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!oneTimeTokenRecord) {
      throw new UnauthorizedError('Invalid token')
    }

    // 检查是否已使用
    if (oneTimeTokenRecord.used) {
      throw new UnauthorizedError('Token has already been used')
    }

    // 检查是否过期
    if (oneTimeTokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('Token has expired')
    }

    // 检查用户状态
    if (oneTimeTokenRecord.user.status !== 'normal') {
      throw new UnauthorizedError(`Account is ${oneTimeTokenRecord.user.status}`)
    }

    // 标记token为已使用
    await prisma.oneTimeToken.update({
      where: { id: oneTimeTokenRecord.id },
      data: {
        used: true,
        usedAt: new Date(),
      },
    })

    // 添加或更新设备（设备指纹必填）
    await this.addOrUpdateDevice(oneTimeTokenRecord.user.id, deviceId, ipAddress)

    // 生成访问令牌和刷新令牌
    const tokens = await this.generateTokens(oneTimeTokenRecord.user, deviceId, ipAddress)

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: oneTimeTokenRecord.user.id },
      data: { lastLoginAt: new Date() },
    })

    return this.buildAuthPayload(oneTimeTokenRecord.user, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      token: tokens.accessToken,
    })
  }

  /**
   * 刷新访问令牌
   */
  async refreshAccessToken(refreshToken, deviceId = null, ipAddress = null) {
    const logger = require('../utils/logger')

    // 验证刷新令牌
    let decoded
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET)
    } catch (error) {
      logger.warn(`Invalid refresh token: ${error.name} - ${error.message}`)
      throw new UnauthorizedError('Invalid refresh token')
    }

    if (decoded.type !== 'refresh') {
      logger.warn(`Invalid token type: expected 'refresh', got '${decoded.type}'`)
      throw new UnauthorizedError('Invalid token type')
    }

    // 查找刷新令牌记录
    const refreshTokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    })

    if (!refreshTokenRecord) {
      // 尝试查找是否有已撤销或过期的记录（用于调试）
      const revokedRecord = await prisma.refreshToken.findFirst({
        where: {
          userId: decoded.id,
          token: refreshToken,
        },
      })

      if (revokedRecord) {
        if (revokedRecord.revoked) {
          logger.warn(`Refresh token found but revoked: userId=${decoded.id}, revokedAt=${revokedRecord.revokedAt}`)
          throw new UnauthorizedError('Refresh token has been revoked')
        }
        if (revokedRecord.expiresAt < new Date()) {
          logger.warn(`Refresh token found but expired: userId=${decoded.id}, expiresAt=${revokedRecord.expiresAt}`)
          throw new UnauthorizedError('Refresh token has expired')
        }
      } else {
        logger.warn(
          `Refresh token not found in database: userId=${decoded.id}, tokenLength=${
            refreshToken.length
          }, tokenPrefix=${refreshToken.substring(0, 20)}...`
        )
      }

      throw new UnauthorizedError('Refresh token not found. Please login again.')
    }

    // 检查是否已撤销
    if (refreshTokenRecord.revoked) {
      throw new UnauthorizedError('Refresh token has been revoked')
    }

    // 检查是否过期
    if (refreshTokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token has expired')
    }

    // 检查用户状态
    if (refreshTokenRecord.user.status !== 'normal') {
      throw new UnauthorizedError(`Account is ${refreshTokenRecord.user.status}`)
    }

    // 如果提供了设备ID，验证设备ID是否匹配
    if (deviceId && refreshTokenRecord.deviceId && refreshTokenRecord.deviceId !== deviceId) {
      throw new UnauthorizedError('Device ID mismatch')
    }

    // 生成新的访问令牌和刷新令牌
    const newTokens = await this.generateTokens(
      refreshTokenRecord.user,
      deviceId || refreshTokenRecord.deviceId,
      ipAddress
    )

    // 撤销旧的刷新令牌并更新最后使用时间
    await prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: {
        revoked: true,
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    })

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      entitlement: await userEntitlementService.computeForUser(refreshTokenRecord.user.id),
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    return user
  }

  /**
   * 修改用户密码
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    if (!user.password) {
      throw new BadRequestError('Password not set')
    }

    // 验证旧密码
    const isValidPassword = await bcrypt.compare(oldPassword, user.password)
    if (!isValidPassword) {
      throw new UnauthorizedError('Old password is incorrect')
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 更新密码
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    return { success: true }
  }
}

module.exports = new UserAuthService()
