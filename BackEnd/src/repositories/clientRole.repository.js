const prisma = require('../config/database')

class ClientRoleRepository {
  async findAll() {
    return prisma.clientRole.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { permissions: true } },
      },
    })
  }

  async findById(id) {
    return prisma.clientRole.findUnique({
      where: { id },
      include: {
        _count: { select: { permissions: true } },
      },
    })
  }

  async findByRoleKey(roleKey) {
    return prisma.clientRole.findUnique({ where: { roleKey } })
  }

  async create(data) {
    return prisma.clientRole.create({ data })
  }

  async update(id, data) {
    return prisma.clientRole.update({ where: { id }, data })
  }

  async delete(id) {
    return prisma.clientRole.delete({ where: { id } })
  }

  async findMaxSortOrder() {
    const result = await prisma.clientRole.aggregate({ _max: { sortOrder: true } })
    return result._max.sortOrder ?? 0
  }

  async countUsersByRole(roleKey) {
    return prisma.user.count({ where: { role: roleKey } })
  }

  async findPermissionsByRoleId(roleId) {
    return prisma.clientRolePermission.findMany({
      where: { roleId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async replacePermissions(roleId, permissions) {
    return prisma.$transaction(async tx => {
      await tx.clientRolePermission.deleteMany({ where: { roleId } })
      if (permissions.length) {
        await tx.clientRolePermission.createMany({ data: permissions })
      }
      return tx.clientRolePermission.findMany({ where: { roleId } })
    })
  }

  async findAllMenuIds() {
    const rows = await prisma.clientMenu.findMany({ select: { id: true } })
    return rows.map(row => row.id)
  }

  async findAllButtonIds() {
    const rows = await prisma.clientMenuButton.findMany({ select: { id: true } })
    return rows.map(row => row.id)
  }

  async findAllMenusWithButtons() {
    return prisma.clientMenu.findMany({
      include: {
        buttons: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
  }
}

module.exports = new ClientRoleRepository()
