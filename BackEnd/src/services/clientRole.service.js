const clientRoleRepository = require('../repositories/clientRole.repository')
const { ROLES } = require('../constants/roles')
const { ROLE_KEY_PATTERN } = require('../constants/clientRole')
const { buildMenuTree } = require('../utils/menuTree')
const { NotFoundError, BadRequestError, ForbiddenError, ConflictError } = require('../utils/errors')

function canReadClientRole(userRole) {
  return [
    ROLES.SUPER_ADMIN,
    ROLES.PLATFORM_ADMIN,
    ROLES.OPERATOR,
    ROLES.READ_ONLY,
  ].includes(userRole)
}

function canWriteClientRole(userRole) {
  return [ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN].includes(userRole)
}

function canManageClientRoleLifecycle(userRole) {
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

class ClientRoleService {
  assertRead(userRole) {
    if (!canReadClientRole(userRole)) {
      throw new ForbiddenError('Permission denied')
    }
  }

  assertWrite(userRole) {
    if (!canWriteClientRole(userRole)) {
      throw new ForbiddenError('Permission denied')
    }
  }

  assertManageLifecycle(userRole) {
    if (!canManageClientRoleLifecycle(userRole)) {
      throw new ForbiddenError('Only super admin can create or delete client roles')
    }
  }

  async list(userRole) {
    this.assertRead(userRole)
    const roles = await clientRoleRepository.findAll()
    return roles.map(serializeRole)
  }

  async getDetail(id, userRole) {
    this.assertRead(userRole)
    const role = await clientRoleRepository.findById(id)
    if (!role) throw new NotFoundError('Client role not found')
    return serializeRole(role)
  }

  async create(data, userRole) {
    this.assertManageLifecycle(userRole)

    const roleKey = data.roleKey != null ? String(data.roleKey).trim() : ''
    if (!roleKey) throw new BadRequestError('roleKey is required')
    if (!ROLE_KEY_PATTERN.test(roleKey)) {
      throw new BadRequestError('roleKey must start with a letter and contain only lowercase letters, numbers, and underscores')
    }

    const name = data.name != null ? String(data.name).trim() : ''
    if (!name) throw new BadRequestError('name is required')

    const existing = await clientRoleRepository.findByRoleKey(roleKey)
    if (existing) throw new ConflictError('roleKey already exists')

    const maxSortOrder = await clientRoleRepository.findMaxSortOrder()
    const role = await clientRoleRepository.create({
      roleKey,
      name,
      description: data.description != null ? String(data.description).trim() || null : null,
      sortOrder: maxSortOrder + 10,
      status: 'active',
    })

    return serializeRole({ ...role, _count: { permissions: 0 } })
  }

  async remove(id, userRole) {
    this.assertManageLifecycle(userRole)
    const role = await clientRoleRepository.findById(id)
    if (!role) throw new NotFoundError('Client role not found')

    const userCount = await clientRoleRepository.countUsersByRole(role.roleKey)
    if (userCount > 0) {
      throw new BadRequestError(`Cannot delete role: ${userCount} client user(s) are using this role`)
    }

    await clientRoleRepository.delete(id)
    return { id }
  }

  async update(id, data, userRole) {
    this.assertWrite(userRole)
    const existing = await clientRoleRepository.findById(id)
    if (!existing) throw new NotFoundError('Client role not found')

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
    if (data.priority !== undefined) {
      payload.priority = Number(data.priority)
    }
    if (data.status !== undefined) {
      payload.status = String(data.status).trim()
    }

    const role = await clientRoleRepository.update(id, payload)
    return serializeRole({ ...role, _count: existing._count })
  }

  async getPermissions(id, userRole) {
    this.assertRead(userRole)
    const role = await clientRoleRepository.findById(id)
    if (!role) throw new NotFoundError('Client role not found')

    const flatMenus = await clientRoleRepository.findAllMenusWithButtons()
    const menuTree = buildMenuTree(flatMenus)
    const permissions = await clientRoleRepository.findPermissionsByRoleId(id)
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
    const flatMenus = await clientRoleRepository.findAllMenusWithButtons()
    const role = await clientRoleRepository.findByRoleKey(roleKey)
    if (!role) {
      return { menuPermissionCodes: [], buttonPermissionCodes: [] }
    }

    const permissions = await clientRoleRepository.findPermissionsByRoleId(role.id)
    const { grantedMenuIds, grantedButtonIds } = splitGrantedIds(permissions)
    return collectGrantedFrontendPermissionCodes(flatMenus, grantedMenuIds, grantedButtonIds)
  }

  async savePermissions(id, data, userRole) {
    this.assertWrite(userRole)
    const role = await clientRoleRepository.findById(id)
    if (!role) throw new NotFoundError('Client role not found')

    const menuIds = Array.isArray(data.menuIds) ? [...new Set(data.menuIds.map(String))] : []
    const buttonIds = Array.isArray(data.buttonIds) ? [...new Set(data.buttonIds.map(String))] : []

    const [validMenuIds, validButtonIds] = await Promise.all([
      clientRoleRepository.findAllMenuIds(),
      clientRoleRepository.findAllButtonIds(),
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

    await clientRoleRepository.replacePermissions(id, permissions)

    return {
      roleId: id,
      menuIds,
      buttonIds,
      permissionCount: permissions.length,
    }
  }
}

module.exports = new ClientRoleService()
