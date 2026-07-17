const backendRoleRepository = require('../repositories/backendRole.repository')
const { ROLES } = require('../constants/roles')
const { SUPER_ADMIN_ROLE_KEY, ROLE_KEY_PATTERN } = require('../constants/backendRole')
const { buildMenuTree } = require('../utils/menuTree')
const { NotFoundError, BadRequestError, ForbiddenError, ConflictError } = require('../utils/errors')

function canReadBackendRole(userRole) {
  return [
    ROLES.SUPER_ADMIN,
    ROLES.PLATFORM_ADMIN,
    ROLES.OPERATOR,
    ROLES.READ_ONLY,
  ].includes(userRole)
}

function canWriteBackendRole(userRole) {
  return [ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN].includes(userRole)
}

function canManageBackendRoleLifecycle(userRole) {
  return userRole === ROLES.SUPER_ADMIN
}

function serializeRole(role) {
  if (!role) return role
  const { _count, ...rest } = role
  return {
    ...rest,
    permissionCount: _count?.permissions ?? 0,
  }
}

function splitGrantedIds(permissions = []) {
  const grantedMenuIds = []
  const grantedButtonIds = []
  permissions.forEach(item => {
    if (item.targetType === 'menu') grantedMenuIds.push(item.targetId)
    if (item.targetType === 'button') grantedButtonIds.push(item.targetId)
  })
  return { grantedMenuIds, grantedButtonIds }
}

function collectAllFrontendPermissionCodes(flatMenus) {
  const menuPermissionCodes = []
  const buttonPermissionCodes = []
  flatMenus.forEach(menu => {
    if (menu.frontendPermissionCode) {
      menuPermissionCodes.push(menu.frontendPermissionCode)
    }
    ;(menu.buttons || []).forEach(button => {
      if (button.frontendPermissionCode) {
        buttonPermissionCodes.push(button.frontendPermissionCode)
      }
    })
  })
  return {
    menuPermissionCodes: [...new Set(menuPermissionCodes)],
    buttonPermissionCodes: [...new Set(buttonPermissionCodes)],
  }
}

function collectGrantedFrontendPermissionCodes(flatMenus, grantedMenuIds, grantedButtonIds) {
  const menuIdSet = new Set(grantedMenuIds)
  const buttonIdSet = new Set(grantedButtonIds)
  const menuPermissionCodes = []
  const buttonPermissionCodes = []

  flatMenus.forEach(menu => {
    if (menuIdSet.has(menu.id) && menu.frontendPermissionCode) {
      menuPermissionCodes.push(menu.frontendPermissionCode)
    }
    ;(menu.buttons || []).forEach(button => {
      if (buttonIdSet.has(button.id) && button.frontendPermissionCode) {
        buttonPermissionCodes.push(button.frontendPermissionCode)
      }
    })
  })

  return {
    menuPermissionCodes: [...new Set(menuPermissionCodes)],
    buttonPermissionCodes: [...new Set(buttonPermissionCodes)],
  }
}

function collectGrantedBackendPermissionCodes(flatMenus, grantedMenuIds, grantedButtonIds) {
  const menuIdSet = new Set(grantedMenuIds)
  const buttonIdSet = new Set(grantedButtonIds)
  const menuPermissionCodes = []
  const buttonPermissionCodes = []

  flatMenus.forEach(menu => {
    if (menuIdSet.has(menu.id) && menu.backendPermissionCode) {
      menuPermissionCodes.push(menu.backendPermissionCode)
    }
    ;(menu.buttons || []).forEach(button => {
      if (buttonIdSet.has(button.id) && button.backendPermissionCode) {
        buttonPermissionCodes.push(button.backendPermissionCode)
      }
    })
  })

  return {
    menuPermissionCodes: [...new Set(menuPermissionCodes)],
    buttonPermissionCodes: [...new Set(buttonPermissionCodes)],
  }
}

function collectAllBackendPermissionCodes(flatMenus) {
  const menuPermissionCodes = []
  const buttonPermissionCodes = []
  flatMenus.forEach(menu => {
    if (menu.backendPermissionCode) {
      menuPermissionCodes.push(menu.backendPermissionCode)
    }
    ;(menu.buttons || []).forEach(button => {
      if (button.backendPermissionCode) {
        buttonPermissionCodes.push(button.backendPermissionCode)
      }
    })
  })
  return {
    menuPermissionCodes: [...new Set(menuPermissionCodes)],
    buttonPermissionCodes: [...new Set(buttonPermissionCodes)],
  }
}

class BackendRoleService {
  assertRead(userRole) {
    if (!canReadBackendRole(userRole)) {
      throw new ForbiddenError('Permission denied')
    }
  }

  assertWrite(userRole) {
    if (!canWriteBackendRole(userRole)) {
      throw new ForbiddenError('Permission denied')
    }
  }

  assertManageLifecycle(userRole) {
    if (!canManageBackendRoleLifecycle(userRole)) {
      throw new ForbiddenError('Only super admin can create or delete roles')
    }
  }

  async listAssignableRoles(userRole) {
    this.assertRead(userRole)
    const roles = await backendRoleRepository.findAll()
    return roles
      .filter(role => role.roleKey !== SUPER_ADMIN_ROLE_KEY && role.status === 'active')
      .map(role => ({
        roleKey: role.roleKey,
        name: role.name,
        isSystem: role.isSystem,
      }))
  }

  async list(userRole) {
    this.assertRead(userRole)
    const roles = await backendRoleRepository.findAll()
    return roles.map(serializeRole)
  }

  async getDetail(id, userRole) {
    this.assertRead(userRole)
    const role = await backendRoleRepository.findById(id)
    if (!role) throw new NotFoundError('Backend role not found')
    return serializeRole(role)
  }

  async create(data, userRole) {
    this.assertManageLifecycle(userRole)

    const roleKey = data.roleKey != null ? String(data.roleKey).trim() : ''
    if (!roleKey) throw new BadRequestError('roleKey is required')
    if (!ROLE_KEY_PATTERN.test(roleKey)) {
      throw new BadRequestError('roleKey must start with a letter and contain only lowercase letters, numbers, and underscores')
    }
    if (roleKey === SUPER_ADMIN_ROLE_KEY) {
      throw new BadRequestError('Cannot create super admin role')
    }

    const name = data.name != null ? String(data.name).trim() : ''
    if (!name) throw new BadRequestError('name is required')

    const existing = await backendRoleRepository.findByRoleKey(roleKey)
    if (existing) throw new ConflictError('roleKey already exists')

    const maxSortOrder = await backendRoleRepository.findMaxSortOrder()
    const role = await backendRoleRepository.create({
      roleKey,
      name,
      description: data.description != null ? String(data.description).trim() || null : null,
      isSystem: false,
      sortOrder: maxSortOrder + 10,
      status: 'active',
    })

    return serializeRole({ ...role, _count: { permissions: 0 } })
  }

  async remove(id, userRole) {
    this.assertManageLifecycle(userRole)
    const role = await backendRoleRepository.findById(id)
    if (!role) throw new NotFoundError('Backend role not found')

    if (role.roleKey === SUPER_ADMIN_ROLE_KEY) {
      throw new BadRequestError('Super admin role cannot be deleted')
    }
    if (role.isSystem) {
      throw new BadRequestError('System built-in role cannot be deleted')
    }

    const adminCount = await backendRoleRepository.countAdminsByRole(role.roleKey)
    if (adminCount > 0) {
      throw new BadRequestError(`Cannot delete role: ${adminCount} admin user(s) are using this role`)
    }

    await backendRoleRepository.delete(id)
    return { id }
  }

  async update(id, data, userRole) {
    this.assertWrite(userRole)
    const existing = await backendRoleRepository.findById(id)
    if (!existing) throw new NotFoundError('Backend role not found')

    const payload = {}
    if (data.name !== undefined) {
      const name = String(data.name).trim()
      if (!name) throw new BadRequestError('name cannot be empty')
      payload.name = name
    }
    if (data.description !== undefined) {
      payload.description = data.description != null ? String(data.description).trim() || null : null
    }
    if (data.sortOrder !== undefined) {
      payload.sortOrder = Number(data.sortOrder)
    }
    if (data.status !== undefined) {
      payload.status = String(data.status).trim()
    }

    const role = await backendRoleRepository.update(id, payload)
    return serializeRole({ ...role, _count: existing._count })
  }

  async getPermissions(id, userRole) {
    this.assertRead(userRole)
    const role = await backendRoleRepository.findById(id)
    if (!role) throw new NotFoundError('Backend role not found')

    const flatMenus = await backendRoleRepository.findAllMenusWithButtons()
    const menuTree = buildMenuTree(flatMenus)

    if (role.roleKey === SUPER_ADMIN_ROLE_KEY) {
      const allMenuIds = flatMenus.map(menu => menu.id)
      const allButtonIds = flatMenus.flatMap(menu => menu.buttons.map(btn => btn.id))
      return {
        role: serializeRole(role),
        menuTree,
        grantedMenuIds: allMenuIds,
        grantedButtonIds: allButtonIds,
        isFullAccess: true,
      }
    }

    const permissions = await backendRoleRepository.findPermissionsByRoleId(id)
    const { grantedMenuIds, grantedButtonIds } = splitGrantedIds(permissions)

    return {
      role: serializeRole(role),
      menuTree,
      grantedMenuIds,
      grantedButtonIds,
      isFullAccess: false,
    }
  }

  async getFrontendPermissionCodesByRoleKey(roleKey) {
    const flatMenus = await backendRoleRepository.findAllMenusWithButtons()

    if (roleKey === SUPER_ADMIN_ROLE_KEY) {
      return collectAllFrontendPermissionCodes(flatMenus)
    }

    const role = await backendRoleRepository.findByRoleKey(roleKey)
    if (!role) {
      return { menuPermissionCodes: [], buttonPermissionCodes: [] }
    }

    const permissions = await backendRoleRepository.findPermissionsByRoleId(role.id)
    const { grantedMenuIds, grantedButtonIds } = splitGrantedIds(permissions)
    return collectGrantedFrontendPermissionCodes(flatMenus, grantedMenuIds, grantedButtonIds)
  }

  async getBackendPermissionCodesByRoleKey(roleKey) {
    const flatMenus = await backendRoleRepository.findAllMenusWithButtons()

    if (roleKey === SUPER_ADMIN_ROLE_KEY) {
      return collectAllBackendPermissionCodes(flatMenus)
    }

    const role = await backendRoleRepository.findByRoleKey(roleKey)
    if (!role) {
      return { menuPermissionCodes: [], buttonPermissionCodes: [] }
    }

    const permissions = await backendRoleRepository.findPermissionsByRoleId(role.id)
    const { grantedMenuIds, grantedButtonIds } = splitGrantedIds(permissions)
    return collectGrantedBackendPermissionCodes(flatMenus, grantedMenuIds, grantedButtonIds)
  }

  async savePermissions(id, data, userRole) {
    this.assertWrite(userRole)
    const role = await backendRoleRepository.findById(id)
    if (!role) throw new NotFoundError('Backend role not found')

    if (role.roleKey === SUPER_ADMIN_ROLE_KEY) {
      throw new BadRequestError('Super admin role permissions cannot be modified')
    }

    const menuIds = Array.isArray(data.menuIds) ? [...new Set(data.menuIds.map(String))] : []
    const buttonIds = Array.isArray(data.buttonIds) ? [...new Set(data.buttonIds.map(String))] : []

    const [validMenuIds, validButtonIds] = await Promise.all([
      backendRoleRepository.findAllMenuIds(),
      backendRoleRepository.findAllButtonIds(),
    ])
    const menuIdSet = new Set(validMenuIds)
    const buttonIdSet = new Set(validButtonIds)

    for (const menuId of menuIds) {
      if (!menuIdSet.has(menuId)) {
        throw new BadRequestError(`Invalid menu id: ${menuId}`)
      }
    }
    for (const buttonId of buttonIds) {
      if (!buttonIdSet.has(buttonId)) {
        throw new BadRequestError(`Invalid button id: ${buttonId}`)
      }
    }

    const permissions = [
      ...menuIds.map(targetId => ({ roleId: id, targetType: 'menu', targetId })),
      ...buttonIds.map(targetId => ({ roleId: id, targetType: 'button', targetId })),
    ]

    await backendRoleRepository.replacePermissions(id, permissions)

    return {
      roleId: id,
      menuIds,
      buttonIds,
      permissionCount: permissions.length,
    }
  }
}

module.exports = new BackendRoleService()
