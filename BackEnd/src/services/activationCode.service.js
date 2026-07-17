const crypto = require('crypto')
const prisma = require('../config/database')
const activationCodeRepository = require('../repositories/activationCode.repository')
const {
  ACTIVATION_CODE_STATUS,
  DEFAULT_EXPIRE_DAYS,
  MAX_BATCH_COUNT,
} = require('../constants/activationCode')
const {
  generateActivationCode,
  normalizeActivationCode,
  isValidActivationCodeFormat,
} = require('../utils/activationCodeFormat')
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors')

class ActivationCodeService {
  async resolveDefaultTrialPackageId() {
    const pkg = await prisma.package.findFirst({
      where: { type: 'trial', isActive: true },
      orderBy: [{ isRecommend: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      select: { id: true },
    })
    if (!pkg) {
      throw new BadRequestError('未配置可用的试用套餐，请先创建 type=trial 的套餐')
    }
    return pkg.id
  }

  async assertPackage(packageId) {
    const pkg = await prisma.package.findUnique({ where: { id: packageId } })
    if (!pkg || !pkg.isActive) {
      throw new BadRequestError('套餐不存在或已停用')
    }
    return pkg
  }

  async enrichCreator(items) {
    const list = Array.isArray(items) ? items : []
    const adminIds = [...new Set(list.map((i) => i.createdBy).filter(Boolean))]
    if (adminIds.length === 0) return list

    const admins = await prisma.admin.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, username: true, email: true },
    })
    const map = Object.fromEntries(admins.map((a) => [a.id, a]))
    return list.map((item) => ({
      ...item,
      creator: map[item.createdBy] || null,
    }))
  }

  async list(filters, pagination) {
    await this.destroyExpiredUnused()
    const result = await activationCodeRepository.list(filters, pagination)
    result.data = await this.enrichCreator(result.data)
    return result
  }

  async getDetail(id) {
    await this.destroyExpiredUnused()
    const row = await activationCodeRepository.findById(id)
    if (!row) throw new NotFoundError('激活码不存在')
    const [enriched] = await this.enrichCreator([row])
    return enriched
  }

  buildExpiresAt(expiresAt, expiresInDays) {
    if (expiresAt) {
      const d = new Date(expiresAt)
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestError('expiresAt 无效')
      }
      if (d.getTime() <= Date.now()) {
        throw new BadRequestError('过期时间必须晚于当前时间')
      }
      return d
    }
    const days = Number.isFinite(Number(expiresInDays))
      ? Math.max(1, parseInt(expiresInDays, 10))
      : DEFAULT_EXPIRE_DAYS
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  }

  normalizeBoundContact({ email, phone }) {
    const normalizedEmail =
      email != null && String(email).trim() !== '' ? String(email).trim().toLowerCase() : null
    const normalizedPhone =
      phone != null && String(phone).trim() !== '' ? String(phone).trim() : null
    return { email: normalizedEmail, phone: normalizedPhone }
  }

  async createUniqueCodes(count) {
    const codes = new Set()
    let guard = 0
    while (codes.size < count && guard < count * 20) {
      codes.add(generateActivationCode())
      guard++
    }
    if (codes.size < count) {
      throw new BadRequestError('生成激活码失败，请重试')
    }

    const existing = await prisma.activationCode.findMany({
      where: { code: { in: [...codes] } },
      select: { code: true },
    })
    if (existing.length === 0) return [...codes]

    const conflict = new Set(existing.map((e) => e.code))
    const result = [...codes].filter((c) => !conflict.has(c))
    while (result.length < count) {
      const next = generateActivationCode()
      if (!conflict.has(next) && !result.includes(next)) {
        const hit = await prisma.activationCode.findUnique({ where: { code: next } })
        if (!hit) result.push(next)
      }
    }
    return result.slice(0, count)
  }

  /**
   * 创建（count=1）或批量创建激活码
   */
  async create(data, adminId) {
    if (!adminId) throw new ForbiddenError('缺少创建人')

    const count = Math.max(1, parseInt(data.count, 10) || 1)
    if (count > MAX_BATCH_COUNT) {
      throw new BadRequestError(`单次最多创建 ${MAX_BATCH_COUNT} 个激活码`)
    }

    const packageId = data.packageId || (await this.resolveDefaultTrialPackageId())
    await this.assertPackage(packageId)

    const { email, phone } = this.normalizeBoundContact(data)
    const expiresAt = this.buildExpiresAt(data.expiresAt, data.expiresInDays)
    const batchId = count > 1 ? crypto.randomUUID() : data.batchId || null
    const remark = data.remark != null ? String(data.remark).slice(0, 500) : null

    const codes = await this.createUniqueCodes(count)
    const rows = codes.map((code) => ({
      code,
      packageId,
      email,
      phone,
      status: ACTIVATION_CODE_STATUS.UNUSED,
      expiresAt,
      createdBy: adminId,
      batchId,
      remark,
    }))

    await activationCodeRepository.createMany(rows)

    const created = await prisma.activationCode.findMany({
      where: { code: { in: codes } },
      include: {
        package: {
          select: { id: true, name: true, displayName: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      batchId,
      count: created.length,
      items: await this.enrichCreator(created),
    }
  }

  async update(id, data, adminId = null) {
    const row = await activationCodeRepository.findById(id)
    if (!row) throw new NotFoundError('激活码不存在')
    if (row.status !== ACTIVATION_CODE_STATUS.UNUSED) {
      throw new BadRequestError('仅未使用的激活码可编辑')
    }
    if (row.expiresAt <= new Date()) {
      await this.destroyExpiredUnused()
      throw new BadRequestError('激活码已过期')
    }

    const patch = {}
    if (data.packageId !== undefined) {
      await this.assertPackage(data.packageId)
      patch.packageId = data.packageId
    }
    if (data.email !== undefined || data.phone !== undefined) {
      const contact = this.normalizeBoundContact({
        email: data.email !== undefined ? data.email : row.email,
        phone: data.phone !== undefined ? data.phone : row.phone,
      })
      if (data.email !== undefined) patch.email = contact.email
      if (data.phone !== undefined) patch.phone = contact.phone
    }
    if (data.expiresAt !== undefined || data.expiresInDays !== undefined) {
      patch.expiresAt = this.buildExpiresAt(data.expiresAt, data.expiresInDays)
    }
    if (data.remark !== undefined) {
      patch.remark = data.remark != null ? String(data.remark).slice(0, 500) : null
    }

    const updated = await activationCodeRepository.update(id, patch)
    if (adminId) {
      try {
        const logService = require('./log.service')
        await logService.logAdminAction({
          adminId,
          action: 'UPDATE_ACTIVATION_CODE',
          targetType: 'activation_code',
          targetId: id,
          details: patch,
        })
      } catch (_) {
        /* ignore */
      }
    }
    const [enriched] = await this.enrichCreator([updated])
    return enriched
  }

  async remove(id, adminId = null) {
    const row = await activationCodeRepository.findById(id)
    if (!row) throw new NotFoundError('激活码不存在')
    await activationCodeRepository.softDelete(id)
    if (adminId) {
      try {
        const logService = require('./log.service')
        await logService.logAdminAction({
          adminId,
          action: 'DELETE_ACTIVATION_CODE',
          targetType: 'activation_code',
          targetId: id,
          details: { code: row.code },
        })
      } catch (_) {
        /* ignore */
      }
    }
    return { id }
  }

  async destroyExpiredUnused() {
    const result = await activationCodeRepository.expireUnusedBefore(new Date())
    return { destroyed: result.count || 0 }
  }

  /**
   * 注册前校验并返回可用激活码（会顺带清理过期）
   */
  async assertRedeemable(rawCode, { email, phone } = {}) {
    await this.destroyExpiredUnused()

    const code = normalizeActivationCode(rawCode)
    if (!isValidActivationCodeFormat(code)) {
      throw new BadRequestError('激活码格式无效')
    }

    const row = await activationCodeRepository.findByCode(code)
    if (!row) {
      throw new BadRequestError('激活码不存在或已失效')
    }
    if (row.status === ACTIVATION_CODE_STATUS.USED) {
      throw new BadRequestError('激活码已被使用')
    }
    if (row.status === ACTIVATION_CODE_STATUS.REVOKED || row.deletedAt) {
      throw new BadRequestError('激活码已作废')
    }
    if (row.status === ACTIVATION_CODE_STATUS.EXPIRED || row.expiresAt <= new Date()) {
      await activationCodeRepository.expireUnusedBefore(new Date())
      throw new BadRequestError('激活码已过期')
    }
    if (!row.package?.isActive) {
      throw new BadRequestError('激活码绑定的套餐不可用')
    }
    if (!row.package.clientRoleId) {
      throw new BadRequestError('激活码绑定的套餐未配置客户端角色，请联系管理员')
    }

    const inputEmail = email != null ? String(email).trim().toLowerCase() : ''
    const inputPhone = phone != null ? String(phone).trim() : ''

    if (row.email) {
      if (!inputEmail || inputEmail !== row.email.toLowerCase()) {
        throw new BadRequestError(`该激活码已绑定邮箱 ${row.email}，请使用该邮箱注册`)
      }
    }
    if (row.phone) {
      if (!inputPhone || inputPhone !== row.phone) {
        throw new BadRequestError(`该激活码已绑定手机号 ${row.phone}，请使用该手机号注册`)
      }
    }

    return row
  }

  async markUsed(id, userId, tx = prisma) {
    const result = await tx.activationCode.updateMany({
      where: {
        id,
        status: ACTIVATION_CODE_STATUS.UNUSED,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        status: ACTIVATION_CODE_STATUS.USED,
        usedAt: new Date(),
        usedByUserId: userId,
      },
    })
    if (result.count !== 1) {
      throw new BadRequestError('激活码不可用或已被使用')
    }
    return result
  }
}

module.exports = new ActivationCodeService()
