const prisma = require('../config/database')
const clientRoleService = require('./clientRole.service')
const { ACCESS_STATUS, ACCESS_STATUS_MESSAGES } = require('../constants/entitlement')

function toNumber(value) {
  if (value == null) return 0
  return parseFloat(value) || 0
}

function serializePackageForGuide(pkg) {
  let availableModels = null
  if (pkg.availableModels) {
    try {
      const parsed = JSON.parse(pkg.availableModels)
      availableModels = Array.isArray(parsed) && parsed.length > 0 ? parsed : null
    } catch {
      availableModels = null
    }
  }

  return {
    id: pkg.id,
    name: pkg.name,
    displayName: pkg.displayName,
    description: pkg.description,
    type: pkg.type,
    duration: pkg.duration,
    durationUnit: pkg.durationUnit,
    quota: pkg.quota != null ? toNumber(pkg.quota) : null,
    price: pkg.price != null ? toNumber(pkg.price) : null,
    priceUnit: pkg.priceUnit,
    discount: pkg.discount != null ? toNumber(pkg.discount) : null,
    isRecommend: pkg.isRecommend,
    guideScene: pkg.guideScene,
    clientRole: pkg.clientRole
      ? {
          id: pkg.clientRole.id,
          roleKey: pkg.clientRole.roleKey,
          name: pkg.clientRole.name,
          priority: pkg.clientRole.priority,
        }
      : null,
    availableModels,
  }
}

function buildSubscriptionGuide(accessStatus, availablePackages, historyHint = null, boundPackages = []) {
  const titles = {
    [ACCESS_STATUS.NO_PACKAGE]: '开通套餐后即可使用',
    [ACCESS_STATUS.ALL_EXPIRED]: '套餐已过期，请续费',
    [ACCESS_STATUS.NOT_STARTED]: '套餐尚未生效',
    [ACCESS_STATUS.PACKAGE_DISABLED]: '套餐不可用',
    [ACCESS_STATUS.ROLE_NO_PERMISSION]: '权限配置异常',
  }

  const descriptions = {
    [ACCESS_STATUS.NO_PACKAGE]: '选择合适的套餐开通后即可使用全部功能。',
    [ACCESS_STATUS.ALL_EXPIRED]: '您之前的套餐已全部过期，续费或购买新套餐后可继续使用。',
    [ACCESS_STATUS.NOT_STARTED]: '您已购买套餐，但尚未到生效时间，请耐心等待或联系客服。',
    [ACCESS_STATUS.PACKAGE_DISABLED]: '您当前绑定的套餐已被停用，请联系客服或购买其他套餐。',
    [ACCESS_STATUS.ROLE_NO_PERMISSION]:
      '您的套餐已生效（见下方「注册已绑定」标记），但对应客户端角色尚未配置菜单权限。请联系管理员配置后重新登录。',
  }

  const boundPackageIds = [...new Set((boundPackages || []).map((p) => p.packageId).filter(Boolean))]

  return {
    reason: accessStatus,
    title: titles[accessStatus] || '需要订阅',
    description: descriptions[accessStatus] || ACCESS_STATUS_MESSAGES[accessStatus],
    actions: [],
    availablePackages: availablePackages || [],
    boundPackageIds,
    boundPackages: boundPackages || [],
    historyHint,
  }
}

function classifyUserPackages(userPackages, now) {
  const all = userPackages || []
  const notStarted = all.filter((up) => up.startedAt > now)
  const timeValid = all.filter((up) => up.startedAt <= now && (!up.expiresAt || up.expiresAt > now))
  const expired = all.filter((up) => up.expiresAt && up.expiresAt <= now)
  const disabledActive = timeValid.filter((up) => !up.package?.isActive)
  const active = timeValid.filter((up) => up.package?.isActive)

  return { all, notStarted, expired, disabledActive, active }
}

function pickEffectiveRole(activePackages) {
  let best = null
  for (const up of activePackages) {
    const role = up.package?.clientRole
    if (!role) continue
    const rolePriority = role.priority ?? 0
    const pkgPriority = up.package?.priority ?? 0
    if (
      !best ||
      rolePriority > best.rolePriority ||
      (rolePriority === best.rolePriority && pkgPriority > best.pkgPriority)
    ) {
      best = {
        userPackage: up,
        role,
        rolePriority,
        pkgPriority,
      }
    }
  }
  return best
}

function serializeActivePackage(up) {
  return {
    id: up.id,
    packageId: up.packageId,
    startedAt: up.startedAt,
    expiresAt: up.expiresAt,
    package: {
      id: up.package.id,
      name: up.package.name,
      displayName: up.package.displayName,
      type: up.package.type,
      quota: up.package.quota != null ? toNumber(up.package.quota) : null,
      clientRole: up.package.clientRole
        ? {
            id: up.package.clientRole.id,
            roleKey: up.package.clientRole.roleKey,
            name: up.package.clientRole.name,
            priority: up.package.clientRole.priority,
          }
        : null,
    },
  }
}

class UserEntitlementService {
  async getAvailablePackagesForGuide() {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      include: { clientRole: true },
      orderBy: [{ isRecommend: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    })
    return packages.map(serializePackageForGuide)
  }

  async computeForUser(userId) {
    const now = new Date()

    const [userPackages, userQuotas, availablePackages] = await Promise.all([
      prisma.userPackage.findMany({
        where: { userId },
        include: {
          package: { include: { clientRole: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.userQuota.findMany({ where: { userId } }),
      this.getAvailablePackagesForGuide(),
    ])

    const { all, notStarted, expired, disabledActive, active } = classifyUserPackages(userPackages, now)

    let accessStatus = ACCESS_STATUS.NO_PACKAGE
    if (all.length === 0) {
      accessStatus = ACCESS_STATUS.NO_PACKAGE
    } else if (active.length > 0) {
      accessStatus = ACCESS_STATUS.ACTIVE
    } else if (notStarted.length > 0 && expired.length === 0) {
      accessStatus = ACCESS_STATUS.NOT_STARTED
    } else if (disabledActive.length > 0 && active.length === 0) {
      accessStatus = ACCESS_STATUS.PACKAGE_DISABLED
    } else {
      accessStatus = ACCESS_STATUS.ALL_EXPIRED
    }

    const effectivePick = pickEffectiveRole(active)
    const effectiveClientRoleKey = effectivePick?.role?.roleKey ?? null

    let menuPermissionCodes = []
    let buttonPermissionCodes = []
    if (effectiveClientRoleKey) {
      const codes = await clientRoleService.getFrontendPermissionCodesByRoleKey(effectiveClientRoleKey)
      menuPermissionCodes = codes.menuPermissionCodes
      buttonPermissionCodes = codes.buttonPermissionCodes
    }

    if (accessStatus === ACCESS_STATUS.ACTIVE) {
      const hasPermissions = menuPermissionCodes.length > 0 || buttonPermissionCodes.length > 0
      if (!effectiveClientRoleKey || !hasPermissions) {
        accessStatus = ACCESS_STATUS.ROLE_NO_PERMISSION
      }
    }

    const activePackageIds = new Set(active.map((up) => up.packageId))
    let totalAvailableQuota = 0
    for (const quota of userQuotas) {
      if (!quota.packageId || !activePackageIds.has(quota.packageId)) continue
      const up = active.find((item) => item.packageId === quota.packageId)
      if (!up?.package?.quota) continue
      totalAvailableQuota += toNumber(quota.available)
    }

    const hasAccess = accessStatus === ACCESS_STATUS.ACTIVE

    const historyHint =
      expired.length > 0 ? `您曾有 ${expired.length} 个套餐已过期，可续费或购买新套餐恢复使用。` : null

    const entitlement = {
      hasAccess,
      accessStatus,
      message: ACCESS_STATUS_MESSAGES[accessStatus],
      effectiveClientRoleKey,
      menuPermissionCodes,
      buttonPermissionCodes,
      totalAvailableQuota,
      activePackages: active.map(serializeActivePackage),
    }

    if (!hasAccess) {
      entitlement.subscriptionGuide = buildSubscriptionGuide(
        accessStatus,
        availablePackages,
        historyHint,
        active.map(serializeActivePackage),
      )
    }

    return entitlement
  }

  async fetchUserPackages(userId) {
    return prisma.userPackage.findMany({
      where: { userId },
      include: {
        package: { include: { clientRole: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })
  }

  getActivePackagesFromList(userPackages, now = new Date()) {
    return classifyUserPackages(userPackages, now).active
  }

  async getActiveUserPackagesForUser(userId) {
    const userPackages = await this.fetchUserPackages(userId)
    return this.getActivePackagesFromList(userPackages)
  }

  getEffectiveUserPackage(activePackages) {
    return pickEffectiveRole(activePackages)?.userPackage ?? null
  }

  /**
   * 当前用户有效客户端角色 id（无有效套餐/角色时返回 null）
   */
  async getEffectiveClientRoleId(userId) {
    if (!userId) return null
    const active = await this.getActiveUserPackagesForUser(userId)
    return pickEffectiveRole(active)?.role?.id ?? null
  }

  isModelIncludedInActivePackages(activePackages, modelId) {
    if (!activePackages?.length) return false
    for (const userPackage of activePackages) {
      const raw = userPackage.package?.availableModels
      let availableModels = null
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          availableModels = Array.isArray(parsed) && parsed.length > 0 ? parsed : null
        } catch {
          availableModels = null
        }
      }
      if (!availableModels || availableModels.length === 0 || availableModels.includes(modelId)) {
        return true
      }
    }
    return false
  }

  /**
   * 终端模型目录额外过滤：角色可见 ∩ 套餐 availableModels（任一有效套餐放行即纳入）。
   * 返回 null 表示不追加 id 限制；返回 { id: { in: [] } } 表示无一可见。
   */
  buildAvailableModelsWhere(activePackages) {
    if (!activePackages?.length) {
      return { id: { in: [] } }
    }

    const union = new Set()
    for (const userPackage of activePackages) {
      const raw = userPackage.package?.availableModels
      let availableModels = null
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          availableModels = Array.isArray(parsed) && parsed.length > 0 ? parsed : null
        } catch {
          availableModels = null
        }
      }
      if (!availableModels || availableModels.length === 0) {
        return null
      }
      for (const modelId of availableModels) {
        if (modelId) union.add(String(modelId))
      }
    }

    return { id: { in: [...union] } }
  }

  async getAvailableModelsWhereForUser(userId) {
    const active = await this.getActiveUserPackagesForUser(userId)
    return this.buildAvailableModelsWhere(active)
  }

  async assertUserHasAccess(userId) {
    const entitlement = await this.computeForUser(userId)
    if (!entitlement.hasAccess) {
      const { NoEntitlementError } = require('../utils/errors')
      throw new NoEntitlementError(entitlement.message, entitlement.subscriptionGuide)
    }
    return entitlement
  }
}

module.exports = new UserEntitlementService()
module.exports.classifyUserPackages = classifyUserPackages
module.exports.pickEffectiveRole = pickEffectiveRole
