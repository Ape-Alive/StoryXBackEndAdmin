const prisma = require('../config/database');

/**
 * 风控数据访问层
 */
class RiskRepository {
  /**
   * 获取风控规则列表
   */
  async findRules(filters = {}, pagination = { page: 1, pageSize: 20 }) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {};

    if (filters.name) {
      where.name = { contains: filters.name };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true' || filters.isActive === true;
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

    const orderBy = [
      { priority: 'desc' },
      { createdAt: 'desc' }
    ];

    const [data, total] = await Promise.all([
      prisma.riskRule.findMany({
        where,
        skip,
        take: pageSize,
        orderBy
      }),
      prisma.riskRule.count({ where })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 根据 ID 获取规则
   */
  async findRuleById(id) {
    return await prisma.riskRule.findUnique({
      where: { id }
    });
  }

  /**
   * 根据名称获取规则
   */
  async findRuleByName(name) {
    return await prisma.riskRule.findUnique({
      where: { name }
    });
  }

  /**
   * 创建风控规则
   */
  async createRule(data) {
    return await prisma.riskRule.create({
      data: {
        name: data.name,
        description: data.description,
        conditions: JSON.stringify(data.conditions),
        action: data.action,
        actionParams: data.actionParams ? JSON.stringify(data.actionParams) : null,
        priority: data.priority || 0,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
  }

  /**
   * 更新风控规则
   */
  async updateRule(id, data) {
    const updateData = {};

    if (data.description !== undefined) updateData.description = data.description;
    if (data.conditions !== undefined) updateData.conditions = JSON.stringify(data.conditions);
    if (data.action !== undefined) updateData.action = data.action;
    if (data.actionParams !== undefined) {
      updateData.actionParams = data.actionParams ? JSON.stringify(data.actionParams) : null;
    }
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    updateData.updatedAt = new Date();

    return await prisma.riskRule.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * 删除风控规则
   */
  async deleteRule(id) {
    return await prisma.riskRule.delete({
      where: { id }
    });
  }

  /**
   * 获取风控触发记录
   */
  async findTriggers(filters = {}, pagination = { page: 1, pageSize: 20 }) {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    const where = {};

    if (filters.ruleId) {
      where.ruleId = filters.ruleId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.modelId) {
      where.modelId = filters.modelId;
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

    const orderBy = {
      createdAt: 'desc'
    };

    const [data, total] = await Promise.all([
      prisma.riskTrigger.findMany({
        where,
        skip,
        take: pageSize,
        orderBy
      }),
      prisma.riskTrigger.count({ where })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  /**
   * 创建风控触发记录
   */
  async createTrigger(data) {
    return await prisma.riskTrigger.create({
      data: {
        ruleId: data.ruleId,
        userId: data.userId || null,
        modelId: data.modelId || null,
        conditions: JSON.stringify(data.conditions),
        action: data.action,
        actionResult: data.actionResult ? JSON.stringify(data.actionResult) : null,
        status: data.status || 'pending'
      }
    });
  }
}

module.exports = new RiskRepository();
