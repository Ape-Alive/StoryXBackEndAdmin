const { ROLES } = require('../constants/roles')
const {
  SUPPORTED_LANGUAGES,
  ROOT_PARENT_ID,
  validatePermissionCode,
  validateI18nNames,
  normalizeParentId,
} = require('../constants/menuManagement')
const {
  serializeButton,
  serializeMenu,
  buildMenuTree,
  filterMenuTree,
  collectDescendantIds,
} = require('../utils/menuTree')
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors')

function canReadMenuManagement(role) {
  return [
    ROLES.SUPER_ADMIN,
    ROLES.PLATFORM_ADMIN,
    ROLES.OPERATOR,
    ROLES.READ_ONLY,
  ].includes(role)
}

function canWriteMenuManagement(role) {
  return [ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN].includes(role)
}

class MenuManagementService {
  constructor(repository, resourceName) {
    this.repository = repository
    this.resourceName = resourceName
  }

  assertRead(role) {
    if (!canReadMenuManagement(role)) {
      throw new ForbiddenError('Permission denied')
    }
  }

  assertWrite(role) {
    if (!canWriteMenuManagement(role)) {
      throw new ForbiddenError('Permission denied')
    }
  }

  getMeta() {
    return {
      languages: SUPPORTED_LANGUAGES,
      rootParentId: ROOT_PARENT_ID,
    }
  }

  async getTree(keyword = '', userRole) {
    this.assertRead(userRole)
    const flatMenus = await this.repository.findAllMenus()
    const tree = buildMenuTree(flatMenus)
    return filterMenuTree(tree, keyword)
  }

  async getDetail(id, userRole) {
    this.assertRead(userRole)
    const menu = await this.repository.findMenuById(id)
    if (!menu) {
      throw new NotFoundError(`${this.resourceName} not found`)
    }
    return serializeMenu(menu)
  }

  async createMenu(data, userRole) {
    this.assertWrite(userRole)

    const name = data.name != null ? String(data.name).trim() : ''
    if (!name) {
      throw new BadRequestError('name is required')
    }

    const parentId = normalizeParentId(data.parentId)
    if (parentId !== ROOT_PARENT_ID) {
      const parent = await this.repository.findMenuById(parentId)
      if (!parent) {
        throw new BadRequestError('parent menu not found')
      }
    }

    let i18nNames
    try {
      i18nNames = validateI18nNames(data.i18nNames, { requireZh: true })
    } catch (err) {
      throw new BadRequestError(err.message)
    }

    let frontendPermissionCode = null
    let backendPermissionCode = null
    try {
      frontendPermissionCode = validatePermissionCode(data.frontendPermissionCode, 'frontendPermissionCode', {
        required: true,
      })
      backendPermissionCode = validatePermissionCode(data.backendPermissionCode, 'backendPermissionCode', {
        required: true,
      })
    } catch (err) {
      throw new BadRequestError(err.message)
    }

    const path = data.path != null ? String(data.path).trim() : ''
    if (!path) {
      throw new BadRequestError('path is required')
    }

    if (data.sortOrder === undefined || data.sortOrder === null || !Number.isFinite(Number(data.sortOrder))) {
      throw new BadRequestError('sortOrder is required')
    }

    const menu = await this.repository.createMenu({
      name,
      i18nNames,
      path,
      frontendPermissionCode,
      backendPermissionCode,
      parentId,
      sortOrder: Number(data.sortOrder),
    })

    return serializeMenu({ ...menu, buttons: [] }, { includeButtons: true })
  }

  async updateMenu(id, data, userRole) {
    this.assertWrite(userRole)

    const existing = await this.repository.findMenuById(id)
    if (!existing) {
      throw new NotFoundError(`${this.resourceName} not found`)
    }

    const payload = {}

    if (data.name !== undefined) {
      const name = String(data.name).trim()
      if (!name) throw new BadRequestError('name cannot be empty')
      payload.name = name
    }

    if (data.i18nNames !== undefined) {
      try {
        payload.i18nNames = validateI18nNames(data.i18nNames, { requireZh: true })
      } catch (err) {
        throw new BadRequestError(err.message)
      }
    }

    if (data.path !== undefined) {
      payload.path = data.path != null ? String(data.path).trim() || null : null
    }

    if (data.frontendPermissionCode !== undefined) {
      try {
        payload.frontendPermissionCode = validatePermissionCode(
          data.frontendPermissionCode,
          'frontendPermissionCode'
        )
      } catch (err) {
        throw new BadRequestError(err.message)
      }
    }

    if (data.backendPermissionCode !== undefined) {
      try {
        payload.backendPermissionCode = validatePermissionCode(
          data.backendPermissionCode,
          'backendPermissionCode'
        )
      } catch (err) {
        throw new BadRequestError(err.message)
      }
    }

    if (data.parentId !== undefined) {
      const parentId = normalizeParentId(data.parentId)
      if (parentId === id) {
        throw new BadRequestError('menu cannot be its own parent')
      }
      if (parentId !== ROOT_PARENT_ID) {
        const parent = await this.repository.findMenuById(parentId)
        if (!parent) {
          throw new BadRequestError('parent menu not found')
        }
        const flatMenus = await this.repository.findAllMenus()
        const descendants = collectDescendantIds(flatMenus, id)
        if (descendants.includes(parentId)) {
          throw new BadRequestError('cannot move menu under its descendant')
        }
      }
      payload.parentId = parentId
    }

    if (data.sortOrder !== undefined) {
      payload.sortOrder = Number(data.sortOrder)
    }

    const menu = await this.repository.updateMenu(id, payload)
    const withButtons = await this.repository.findMenuById(menu.id)
    return serializeMenu(withButtons)
  }

  async removeMenu(id, userRole) {
    this.assertWrite(userRole)

    const existing = await this.repository.findMenuById(id)
    if (!existing) {
      throw new NotFoundError(`${this.resourceName} not found`)
    }

    const flatMenus = await this.repository.findAllMenus()
    const descendantIds = collectDescendantIds(flatMenus, id)
    const idsToDelete = [id, ...descendantIds].reverse()

    for (const menuId of idsToDelete) {
      await this.repository.deleteMenu(menuId)
    }

    return null
  }

  async listButtons(menuId, userRole) {
    this.assertRead(userRole)
    const menu = await this.repository.findMenuById(menuId)
    if (!menu) {
      throw new NotFoundError(`${this.resourceName} not found`)
    }
    return menu.buttons.map(serializeButton)
  }

  async createButton(menuId, data, userRole) {
    this.assertWrite(userRole)

    const menu = await this.repository.findMenuById(menuId)
    if (!menu) {
      throw new NotFoundError(`${this.resourceName} not found`)
    }

    const name = data.name != null ? String(data.name).trim() : ''
    if (!name) {
      throw new BadRequestError('name is required')
    }

    let i18nNames
    try {
      i18nNames = validateI18nNames(data.i18nNames, { requireZh: true })
    } catch (err) {
      throw new BadRequestError(err.message)
    }

    let frontendPermissionCode = null
    let backendPermissionCode = null
    try {
      frontendPermissionCode = validatePermissionCode(data.frontendPermissionCode, 'frontendPermissionCode')
      backendPermissionCode = validatePermissionCode(data.backendPermissionCode, 'backendPermissionCode')
    } catch (err) {
      throw new BadRequestError(err.message)
    }

    const button = await this.repository.createButton({
      menuId,
      name,
      i18nNames,
      isVisible: data.isVisible !== false,
      isDisabled: data.isDisabled === true,
      frontendPermissionCode,
      backendPermissionCode,
      sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
    })

    return serializeButton(button)
  }

  async updateButton(menuId, buttonId, data, userRole) {
    this.assertWrite(userRole)

    const menu = await this.repository.findMenuById(menuId)
    if (!menu) {
      throw new NotFoundError(`${this.resourceName} not found`)
    }

    const existing = await this.repository.findButtonById(buttonId)
    if (!existing || existing.menuId !== menuId) {
      throw new NotFoundError('Menu button not found')
    }

    const payload = {}

    if (data.name !== undefined) {
      const name = String(data.name).trim()
      if (!name) throw new BadRequestError('name cannot be empty')
      payload.name = name
    }

    if (data.i18nNames !== undefined) {
      try {
        payload.i18nNames = validateI18nNames(data.i18nNames, { requireZh: true })
      } catch (err) {
        throw new BadRequestError(err.message)
      }
    }

    if (data.isVisible !== undefined) {
      payload.isVisible = data.isVisible === true
    }

    if (data.isDisabled !== undefined) {
      payload.isDisabled = data.isDisabled === true
    }

    if (data.frontendPermissionCode !== undefined) {
      try {
        payload.frontendPermissionCode = validatePermissionCode(
          data.frontendPermissionCode,
          'frontendPermissionCode'
        )
      } catch (err) {
        throw new BadRequestError(err.message)
      }
    }

    if (data.backendPermissionCode !== undefined) {
      try {
        payload.backendPermissionCode = validatePermissionCode(
          data.backendPermissionCode,
          'backendPermissionCode'
        )
      } catch (err) {
        throw new BadRequestError(err.message)
      }
    }

    if (data.sortOrder !== undefined) {
      payload.sortOrder = Number(data.sortOrder)
    }

    const button = await this.repository.updateButton(buttonId, payload)
    return serializeButton(button)
  }

  async removeButton(menuId, buttonId, userRole) {
    this.assertWrite(userRole)

    const existing = await this.repository.findButtonById(buttonId)
    if (!existing || existing.menuId !== menuId) {
      throw new NotFoundError('Menu button not found')
    }

    await this.repository.deleteButton(buttonId)
    return null
  }
}

function createBackendMenuService() {
  const { createBackendMenuRepository } = require('../repositories/menuManagement.repository')
  return new MenuManagementService(createBackendMenuRepository(), 'Backend menu')
}

function createClientMenuService() {
  const { createClientMenuRepository } = require('../repositories/menuManagement.repository')
  return new MenuManagementService(createClientMenuRepository(), 'Client menu')
}

module.exports = {
  MenuManagementService,
  createBackendMenuService,
  createClientMenuService,
}
