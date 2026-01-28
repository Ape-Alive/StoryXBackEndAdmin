const bcrypt = require('bcryptjs');
const adminRepository = require('../repositories/admin.repository');
const { NotFoundError, BadRequestError, ConflictError, ForbiddenError } = require('../utils/errors');
const { ROLES } = require('../constants/roles');

/**
 * 管理员业务逻辑层
 */
class AdminService {
  /**
   * 获取管理员列表
   */
  async getAdmins(filters = {}, pagination = {}, sort = {}) {
    // 构建查询条件
    const queryFilters = {};

    if (filters.adminId) {
      queryFilters.id = filters.adminId;
    }

    if (filters.username) {
      queryFilters.username = filters.username;
    }

    if (filters.email) {
      queryFilters.email = filters.email;
    }

    if (filters.role) {
      queryFilters.role = filters.role;
    }

    if (filters.status) {
      queryFilters.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      queryFilters.createdAt = {};
      if (filters.startDate) queryFilters.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) queryFilters.createdAt.lte = new Date(filters.endDate);
    }

    if (filters.lastLoginStart || filters.lastLoginEnd) {
      queryFilters.lastLogin = {};
      if (filters.lastLoginStart) queryFilters.lastLogin.gte = new Date(filters.lastLoginStart);
      if (filters.lastLoginEnd) queryFilters.lastLogin.lte = new Date(filters.lastLoginEnd);
    }

    // 构建排序
    const sortOrder = {};
    if (sort.orderBy) {
      const order = sort.order === 'desc' ? 'desc' : 'asc';
      sortOrder[sort.orderBy] = order;
    } else {
      sortOrder.createdAt = 'desc'; // 默认按创建时间倒序
    }

    // 获取数据
    const result = await adminRepository.findAdmins(
      queryFilters,
      {
        page: pagination.page || 1,
        pageSize: pagination.pageSize || 20
      },
      sortOrder
    );

    return result;
  }

  /**
   * 获取管理员详情
   */
  async getAdminDetail(adminId) {
    const admin = await adminRepository.findAdminDetail(adminId);
    return admin;
  }

  /**
   * 创建管理员（仅 super_admin）
   */
  async createAdmin(data, creatorId) {
    // 验证创建者必须是 super_admin
    if (!creatorId) {
      throw new ForbiddenError('Creator ID is required');
    }

    const creator = await adminRepository.findById(creatorId);
    if (!creator || creator.role !== ROLES.SUPER_ADMIN) {
      throw new ForbiddenError('Only super admin can create administrators');
    }

    // 验证角色（不能是超级管理员）
    if (data.role === ROLES.SUPER_ADMIN) {
      throw new BadRequestError('Super admin cannot be created through this method');
    }

    // 验证角色是否有效
    const validRoles = [
      ROLES.PLATFORM_ADMIN,
      ROLES.OPERATOR,
      ROLES.RISK_CONTROL,
      ROLES.FINANCE,
      ROLES.READ_ONLY
    ];
    if (!validRoles.includes(data.role)) {
      throw new BadRequestError('Invalid role');
    }

    // 检查用户名是否已存在
    const existingUsername = await adminRepository.findByUsername(data.username);
    if (existingUsername) {
      throw new ConflictError('Username already exists');
    }

    // 检查邮箱是否已存在
    const existingEmail = await adminRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new ConflictError('Email already exists');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 创建管理员
    const admin = await adminRepository.create({
      username: data.username,
      email: data.email,
      password: hashedPassword,
      role: data.role,
      status: data.status || 'active'
    });

    return admin;
  }

  /**
   * 更新管理员信息（仅 super_admin）
   */
  async updateAdmin(adminId, data, updaterId) {
    // 验证更新者必须是 super_admin
    if (!updaterId) {
      throw new ForbiddenError('Updater ID is required');
    }

    const updater = await adminRepository.findById(updaterId);
    if (!updater || updater.role !== ROLES.SUPER_ADMIN) {
      throw new ForbiddenError('Only super admin can update administrators');
    }

    const admin = await adminRepository.findById(adminId);
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }

    // 不能修改为 super_admin
    if (data.role === ROLES.SUPER_ADMIN) {
      throw new BadRequestError('Cannot change role to super_admin');
    }

    // 如果修改用户名，检查是否已存在
    if (data.username && data.username !== admin.username) {
      const existingUsername = await adminRepository.findByUsername(data.username);
      if (existingUsername) {
        throw new ConflictError('Username already exists');
      }
    }

    // 如果修改邮箱，检查是否已存在
    if (data.email && data.email !== admin.email) {
      const existingEmail = await adminRepository.findByEmail(data.email);
      if (existingEmail) {
        throw new ConflictError('Email already exists');
      }
    }

    // 如果修改密码，需要加密
    const updateData = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    // 验证角色是否有效（如果提供了角色）
    if (data.role) {
      const validRoles = [
        ROLES.PLATFORM_ADMIN,
        ROLES.OPERATOR,
        ROLES.RISK_CONTROL,
        ROLES.FINANCE,
        ROLES.READ_ONLY
      ];
      if (!validRoles.includes(data.role)) {
        throw new BadRequestError('Invalid role');
      }
    }

    const updated = await adminRepository.update(adminId, updateData);
    return updated;
  }

  /**
   * 更新管理员状态（仅 super_admin）
   */
  async updateAdminStatus(adminId, status, updaterId) {
    // 验证更新者必须是 super_admin
    if (!updaterId) {
      throw new ForbiddenError('Updater ID is required');
    }

    const updater = await adminRepository.findById(updaterId);
    if (!updater || updater.role !== ROLES.SUPER_ADMIN) {
      throw new ForbiddenError('Only super admin can update admin status');
    }

    const admin = await adminRepository.findById(adminId);
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }

    // 不能禁用自己
    if (adminId === updaterId && status === 'inactive') {
      throw new BadRequestError('Cannot deactivate yourself');
    }

    // 不能禁用最后一个 super_admin
    if (admin.role === ROLES.SUPER_ADMIN && status === 'inactive') {
      const superAdminCount = await adminRepository.countSuperAdmins();
      if (superAdminCount <= 1) {
        throw new BadRequestError('Cannot deactivate the last super admin');
      }
    }

    const updated = await adminRepository.updateStatus(adminId, status);
    return updated;
  }

  /**
   * 更新管理员角色（仅 super_admin）
   */
  async updateAdminRole(adminId, role, updaterId) {
    // 验证更新者必须是 super_admin
    if (!updaterId) {
      throw new ForbiddenError('Updater ID is required');
    }

    const updater = await adminRepository.findById(updaterId);
    if (!updater || updater.role !== ROLES.SUPER_ADMIN) {
      throw new ForbiddenError('Only super admin can update admin role');
    }

    const admin = await adminRepository.findById(adminId);
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }

    // 不能修改为 super_admin
    if (role === ROLES.SUPER_ADMIN) {
      throw new BadRequestError('Cannot change role to super_admin');
    }

    // 不能修改自己的角色
    if (adminId === updaterId) {
      throw new BadRequestError('Cannot change your own role');
    }

    // 验证角色是否有效
    const validRoles = [
      ROLES.PLATFORM_ADMIN,
      ROLES.OPERATOR,
      ROLES.RISK_CONTROL,
      ROLES.FINANCE,
      ROLES.READ_ONLY
    ];
    if (!validRoles.includes(role)) {
      throw new BadRequestError('Invalid role');
    }

    // 如果当前是 super_admin，不能修改（必须至少保留一个）
    if (admin.role === ROLES.SUPER_ADMIN) {
      const superAdminCount = await adminRepository.countSuperAdmins();
      if (superAdminCount <= 1) {
        throw new BadRequestError('Cannot change role of the last super admin');
      }
    }

    const updated = await adminRepository.updateRole(adminId, role);
    return updated;
  }

  /**
   * 删除管理员（仅 super_admin）
   */
  async deleteAdmin(adminId, deleterId) {
    // 验证删除者必须是 super_admin
    if (!deleterId) {
      throw new ForbiddenError('Deleter ID is required');
    }

    const deleter = await adminRepository.findById(deleterId);
    if (!deleter || deleter.role !== ROLES.SUPER_ADMIN) {
      throw new ForbiddenError('Only super admin can delete administrators');
    }

    const admin = await adminRepository.findById(adminId);
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }

    // 不能删除自己
    if (adminId === deleterId) {
      throw new BadRequestError('Cannot delete yourself');
    }

    // 不能删除最后一个 super_admin
    if (admin.role === ROLES.SUPER_ADMIN) {
      const superAdminCount = await adminRepository.countSuperAdmins();
      if (superAdminCount <= 1) {
        throw new BadRequestError('Cannot delete the last super admin');
      }
    }

    await adminRepository.delete(adminId);
    return { success: true };
  }

  /**
   * 批量更新状态（仅 super_admin）
   */
  async batchUpdateStatus(ids, status, updaterId) {
    // 验证更新者必须是 super_admin
    if (!updaterId) {
      throw new ForbiddenError('Updater ID is required');
    }

    const updater = await adminRepository.findById(updaterId);
    if (!updater || updater.role !== ROLES.SUPER_ADMIN) {
      throw new ForbiddenError('Only super admin can batch update admin status');
    }

    // 不能禁用自己
    if (ids.includes(updaterId) && status === 'inactive') {
      throw new BadRequestError('Cannot deactivate yourself');
    }

    // 检查是否有 super_admin 在列表中，且是最后一个
    if (status === 'inactive') {
      const admins = await Promise.all(
        ids.map(id => adminRepository.findById(id))
      );
      const superAdmins = admins.filter(a => a && a.role === ROLES.SUPER_ADMIN);
      if (superAdmins.length > 0) {
        const totalSuperAdminCount = await adminRepository.countSuperAdmins();
        if (totalSuperAdminCount - superAdmins.length < 1) {
          throw new BadRequestError('Cannot deactivate all super admins');
        }
      }
    }

    const result = await adminRepository.batchUpdateStatus(ids, status);
    return { count: result.count };
  }

  /**
   * 批量删除（仅 super_admin）
   */
  async batchDelete(ids, deleterId) {
    // 验证删除者必须是 super_admin
    if (!deleterId) {
      throw new ForbiddenError('Deleter ID is required');
    }

    const deleter = await adminRepository.findById(deleterId);
    if (!deleter || deleter.role !== ROLES.SUPER_ADMIN) {
      throw new ForbiddenError('Only super admin can batch delete administrators');
    }

    // 不能删除自己
    if (ids.includes(deleterId)) {
      throw new BadRequestError('Cannot delete yourself');
    }

    // 检查是否有 super_admin 在列表中，且是最后一个
    const admins = await Promise.all(
      ids.map(id => adminRepository.findById(id))
    );
    const superAdmins = admins.filter(a => a && a.role === ROLES.SUPER_ADMIN);
    if (superAdmins.length > 0) {
      const totalSuperAdminCount = await adminRepository.countSuperAdmins();
      if (totalSuperAdminCount - superAdmins.length < 1) {
        throw new BadRequestError('Cannot delete all super admins');
      }
    }

    const result = await adminRepository.batchDelete(ids);
    return { count: result.count };
  }

  /**
   * 批量导出管理员数据
   */
  async exportAdmins(filters = {}) {
    const queryFilters = {};

    if (filters.adminId) {
      queryFilters.id = filters.adminId;
    }

    if (filters.username) {
      queryFilters.username = filters.username;
    }

    if (filters.email) {
      queryFilters.email = filters.email;
    }

    if (filters.role) {
      queryFilters.role = filters.role;
    }

    if (filters.status) {
      queryFilters.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      queryFilters.createdAt = {};
      if (filters.startDate) queryFilters.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) queryFilters.createdAt.lte = new Date(filters.endDate);
    }

    const admins = await adminRepository.exportAdmins(queryFilters);
    return admins;
  }
}

module.exports = new AdminService();

