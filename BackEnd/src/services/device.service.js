const prisma = require('../config/database');
const { BadRequestError, NotFoundError } = require('../utils/errors');

/**
 * 设备服务
 */
class DeviceService {
  /**
   * 验证设备指纹格式
   */
  validateDeviceFingerprint(deviceFingerprint) {
    if (!deviceFingerprint || typeof deviceFingerprint !== 'string') {
      throw new BadRequestError('Device fingerprint is required');
    }

    // 设备指纹长度限制
    if (deviceFingerprint.length < 8 || deviceFingerprint.length > 255) {
      throw new BadRequestError('Device fingerprint must be between 8 and 255 characters');
    }

    // 设备指纹格式验证（允许字母、数字、连字符、下划线）
    const fingerprintPattern = /^[a-zA-Z0-9_-]+$/;
    if (!fingerprintPattern.test(deviceFingerprint)) {
      throw new BadRequestError('Invalid device fingerprint format');
    }

    return true;
  }

  /**
   * 检查设备是否被禁用
   */
  async checkDeviceStatus(userId, deviceFingerprint) {
    const device = await prisma.device.findUnique({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint
        }
      }
    });

    if (device && device.status === 'revoked') {
      throw new BadRequestError('Device has been revoked');
    }

    return device;
  }

  /**
   * 创建或更新设备记录
   */
  async upsertDevice(userId, deviceFingerprint, ipAddress = null, name = null) {
    // 验证设备指纹
    this.validateDeviceFingerprint(deviceFingerprint);

    // 检查设备状态
    await this.checkDeviceStatus(userId, deviceFingerprint);

    // 创建或更新设备记录
    const device = await prisma.device.upsert({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint
        }
      },
      update: {
        lastUsedAt: new Date(),
        ipAddress: ipAddress || undefined,
        status: 'active' // 如果之前被撤销，现在重新激活
      },
      create: {
        userId,
        deviceFingerprint,
        name: name || `Device ${deviceFingerprint.substring(0, 8)}`,
        ipAddress,
        status: 'active',
        lastUsedAt: new Date()
      }
    });

    return device;
  }

  /**
   * 获取用户设备列表
   */
  async getUserDevices(userId) {
    return await prisma.device.findMany({
      where: {
        userId,
        status: 'active'
      },
      orderBy: {
        lastUsedAt: 'desc'
      }
    });
  }
}

module.exports = new DeviceService();
