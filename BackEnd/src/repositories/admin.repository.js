const prisma = require('../config/database');
const { NotFoundError } = require('../utils/errors');

/**
 * 管理员数据访问层
 */
class AdminRepository {
  /**
   * 获取管理员列表（分页）
   */
  async findAdmins(filters = {}, pagination = { page: 1, pageSize: 20 }, sort = {}) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where = {};

    if (filters.id) {
      where.id = filters.id;
    }

    if (filters.username) {
      where.username = { contains: filters.username };
    }

    if (filters.email) {
      where.email = { contains: filters.email };
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.createdAt) {
      where.createdAt = {};
      if (filters.createdAt.gte) {
        where.createdAt.gte = new Date(filters.createdAt.gte);
      }
      if (filters.createdAt.lte) {
        where.createdAt.lte = new Date(filters.createdAt.lte);
      }
    }

    if (filters.lastLogin) {
      where.lastLogin = {};
      if (filters.lastLogin.gte) {
        where.lastLogin.gte = new Date(filters.lastLogin.gte);
      }
      if (filters.lastLogin.lte) {
        where.lastLogin.lte = new Date(filters.lastLogin.lte);
      }
    }

    // 构建排序
    const orderBy = {};
    if (sort.createdAt) {
      orderBy.createdAt = sort.createdAt;
    } else if (sort.lastLogin) {
      orderBy.lastLogin = sort.lastLogin;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      prisma.admin.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              operationLogs: true
            }
          }
        }
      }),
      prisma.admin.count({ where })
    ]);

    // 格式化数据
    const formattedData = data.map(admin => ({
      ...admin,
      operationLogCount: admin._count.operationLogs
    }));

    return {
      data: formattedData,
      total,
      page,
      pageSize
    };
  }

  /**
   * 根据 ID 获取管理员
   */
  async findById(adminId) {
    return await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            operationLogs: true
          }
        }
      }
    });
  }

  /**
   * 根据 ID 获取管理员详情（包含操作日志）
   */
  async findAdminDetail(adminId) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        operationLogs: {
          take: 10,
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            action: true,
            targetType: true,
            targetId: true,
            details: true,
            ipAddress: true,
            result: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            operationLogs: true
          }
        }
      }
    });

    if (!admin) {
      throw new NotFoundError('Admin not found');
    }

    return admin;
  }

  /**
   * 根据用户名获取管理员
   */
  async findByUsername(username) {
    return await prisma.admin.findUnique({
      where: { username }
    });
  }

  /**
   * 根据邮箱获取管理员
   */
  async findByEmail(email) {
    return await prisma.admin.findUnique({
      where: { email }
    });
  }

  /**
   * 创建管理员
   */
  async create(data) {
    return await prisma.admin.create({
      data: {
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role,
        status: data.status || 'active'
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true
      }
    });
  }

  /**
   * 更新管理员信息
   */
  async update(adminId, data) {
    const updateData = {};

    if (data.username !== undefined) updateData.username = data.username;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.password !== undefined) updateData.password = data.password;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;

    updateData.updatedAt = new Date();

    return await prisma.admin.update({
      where: { id: adminId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true
      }
    });
  }

  /**
   * 更新管理员状态
   */
  async updateStatus(adminId, status) {
    return await prisma.admin.update({
      where: { id: adminId },
      data: {
        status,
        updatedAt: new Date()
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true
      }
    });
  }

  /**
   * 更新管理员角色
   */
  async updateRole(adminId, role) {
    return await prisma.admin.update({
      where: { id: adminId },
      data: {
        role,
        updatedAt: new Date()
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        updatedAt: true
      }
    });
  }

  /**
   * 删除管理员
   */
  async delete(adminId) {
    return await prisma.admin.delete({
      where: { id: adminId }
    });
  }

  /**
   * 批量更新状态
   */
  async batchUpdateStatus(ids, status) {
    return await prisma.admin.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        status,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 批量删除
   */
  async batchDelete(ids) {
    return await prisma.admin.deleteMany({
      where: {
        id: { in: ids }
      }
    });
  }

  /**
   * 统计 super_admin 数量
   */
  async countSuperAdmins() {
    return await prisma.admin.count({
      where: {
        role: 'super_admin'
      }
    });
  }

  /**
   * 批量导出管理员数据
   */
  async exportAdmins(filters = {}) {
    const where = {};

    if (filters.id) {
      where.id = filters.id;
    }

    if (filters.username) {
      where.username = { contains: filters.username };
    }

    if (filters.email) {
      where.email = { contains: filters.email };
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.createdAt) {
      where.createdAt = {};
      if (filters.createdAt.gte) {
        where.createdAt.gte = new Date(filters.createdAt.gte);
      }
      if (filters.createdAt.lte) {
        where.createdAt.lte = new Date(filters.createdAt.lte);
      }
    }

    return await prisma.admin.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}

module.exports = new AdminRepository();

