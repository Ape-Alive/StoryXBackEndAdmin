const prisma = require('../config/database')

class MenuManagementRepository {
  constructor(menuModelName, buttonModelName) {
    this.menuModelName = menuModelName
    this.buttonModelName = buttonModelName
  }

  get menuModel() {
    return prisma[this.menuModelName]
  }

  get buttonModel() {
    return prisma[this.buttonModelName]
  }

  async findAllMenus() {
    return this.menuModel.findMany({
      include: {
        buttons: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async findMenuById(id) {
    return this.menuModel.findUnique({
      where: { id },
      include: {
        buttons: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })
  }

  async findMenusByParentId(parentId) {
    return this.menuModel.findMany({
      where: { parentId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async createMenu(data) {
    return this.menuModel.create({ data })
  }

  async updateMenu(id, data) {
    return this.menuModel.update({ where: { id }, data })
  }

  async deleteMenu(id) {
    return this.menuModel.delete({ where: { id } })
  }

  async findButtonById(id) {
    return this.buttonModel.findUnique({ where: { id } })
  }

  async findButtonsByMenuId(menuId) {
    return this.buttonModel.findMany({
      where: { menuId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async createButton(data) {
    return this.buttonModel.create({ data })
  }

  async updateButton(id, data) {
    return this.buttonModel.update({ where: { id }, data })
  }

  async deleteButton(id) {
    return this.buttonModel.delete({ where: { id } })
  }
}

function createBackendMenuRepository() {
  return new MenuManagementRepository('backendMenu', 'backendMenuButton')
}

function createClientMenuRepository() {
  return new MenuManagementRepository('clientMenu', 'clientMenuButton')
}

module.exports = {
  MenuManagementRepository,
  createBackendMenuRepository,
  createClientMenuRepository,
}
