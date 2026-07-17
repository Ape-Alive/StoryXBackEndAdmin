const prisma = require('../config/database')

class BackendRoleRepository {
  async findAll() {
    return prisma.backendRole.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { permissions: true } },
      },
    })
  }

  async findById(id) {
    return prisma.backendRole.findUnique({
      where: { id },
      include: {
        _count: { select: { permissions: true } },
      },
    })
  }

  async findByRoleKey(roleKey) {
    return prisma.backendRole.findUnique({ where: { roleKey } })
  }

  async create(data) {
    return prisma.backendRole.create({ data })
  }

  async delete(id) {
    return prisma.backendRole.delete({ where: { id } })
  }

  async countAdminsByRole(roleKey) {
    return prisma.admin.count({ where: { role: roleKey } })
  }

  async findMaxSortOrder() {
    const result = await prisma.backendRole.aggregate({ _max: { sortOrder: true } })
    return result._max.sortOrder ?? 0
  }

  async update(id, data) {
    return prisma.backendRole.update({ where: { id }, data })
  }

  async findPermissionsByRoleId(roleId) {
    return prisma.backendRolePermission.findMany({
      where: { roleId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async replacePermissions(roleId, permissions) {
    return prisma.$transaction(async tx => {
      await tx.backendRolePermission.deleteMany({ where: { roleId } })
      if (permissions.length) {
        await tx.backendRolePermission.createMany({ data: permissions })
      }
      return tx.backendRolePermission.findMany({ where: { roleId } })
    })
  }

  async findAllMenuIds() {
    const rows = await prisma.backendMenu.findMany({ select: { id: true } })
    return rows.map(row => row.id)
  }

  async findAllButtonIds() {
    const rows = await prisma.backendMenuButton.findMany({ select: { id: true } })
    return rows.map(row => row.id)
  }

  async findAllMenusWithButtons() {
    return prisma.backendMenu.findMany({
      include: {
        buttons: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async findMenusByIds(ids) {
    if (!ids.length) return []
    return prisma.backendMenu.findMany({
      where: { id: { in: ids } },
      select: { id: true, frontendPermissionCode: true },
    })
  }

  async findButtonsByIds(ids) {
    if (!ids.length) return []
    return prisma.backendMenuButton.findMany({
      where: { id: { in: ids } },
      select: { id: true, frontendPermissionCode: true },
    })
  }
}

module.exports = new BackendRoleRepository()
