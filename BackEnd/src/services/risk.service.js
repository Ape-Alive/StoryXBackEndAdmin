const riskRepository = require('../repositories/risk.repository');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/errors');

/**
 * 风控业务逻辑层
 */
class RiskService {
  /**
   * 获取风控规则列表
   */
  async getRules(filters = {}, pagination = {}) {
    const result = await riskRepository.findRules(filters, pagination);

    // 解析 JSON 字段
    result.data = result.data.map(rule => ({
      ...rule,
      conditions: rule.conditions ? JSON.parse(rule.conditions) : null,
      actionParams: rule.actionParams ? JSON.parse(rule.actionParams) : null
    }));

    return result;
  }

  /**
   * 获取风控规则详情
   */
  async getRuleDetail(id) {
    const rule = await riskRepository.findRuleById(id);
    if (!rule) {
      throw new NotFoundError('Risk rule not found');
    }

    // 解析 JSON 字段
    rule.conditions = rule.conditions ? JSON.parse(rule.conditions) : null;
    rule.actionParams = rule.actionParams ? JSON.parse(rule.actionParams) : null;

    return rule;
  }

  /**
   * 创建风控规则
   */
  async createRule(data, adminId = null, ipAddress = null) {
    // 验证动作类型
    const validActions = ['limit_rate', 'freeze_quota', 'ban_account', 'alert'];
    if (data.action && !validActions.includes(data.action)) {
      throw new BadRequestError('Invalid action type');
    }

    // 检查名称是否已存在
    const existing = await riskRepository.findRuleByName(data.name);
    if (existing) {
      throw new ConflictError('Rule name already exists');
    }

    const rule = await riskRepository.createRule(data);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'CREATE_RISK_RULE',
        targetType: 'risk_rule',
        targetId: rule.id,
        details: data,
        ipAddress
      });
    }

    return rule;
  }

  /**
   * 更新风控规则
   */
  async updateRule(id, data, adminId = null, ipAddress = null) {
    const rule = await riskRepository.findRuleById(id);
    if (!rule) {
      throw new NotFoundError('Risk rule not found');
    }

    // name 不可修改
    if (data.name && data.name !== rule.name) {
      throw new BadRequestError('Rule name cannot be changed');
    }

    // 验证动作类型
    const validActions = ['limit_rate', 'freeze_quota', 'ban_account', 'alert'];
    if (data.action && !validActions.includes(data.action)) {
      throw new BadRequestError('Invalid action type');
    }

    const updated = await riskRepository.updateRule(id, data);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'UPDATE_RISK_RULE',
        targetType: 'risk_rule',
        targetId: id,
        details: data,
        ipAddress
      });
    }

    return updated;
  }

  /**
   * 删除风控规则
   */
  async deleteRule(id, adminId = null, ipAddress = null) {
    const rule = await riskRepository.findRuleById(id);
    if (!rule) {
      throw new NotFoundError('Risk rule not found');
    }

    await riskRepository.deleteRule(id);

    // 记录操作日志
    if (adminId) {
      const logService = require('./log.service');
      await logService.logAdminAction({
        adminId,
        action: 'DELETE_RISK_RULE',
        targetType: 'risk_rule',
        targetId: id,
        details: { name: rule.name },
        ipAddress
      });
    }

    return { success: true };
  }

  /**
   * 获取风控触发记录
   */
  async getTriggers(filters = {}, pagination = {}) {
    const result = await riskRepository.findTriggers(filters, pagination);

    // 解析 JSON 字段
    result.data = result.data.map(trigger => ({
      ...trigger,
      conditions: trigger.conditions ? JSON.parse(trigger.conditions) : null,
      actionResult: trigger.actionResult ? JSON.parse(trigger.actionResult) : null
    }));

    return result;
  }

  /**
   * 获取监控统计数据
   */
  async getMonitorStats(filters = {}) {
    const prisma = require('../config/database');
    const { startDate, endDate } = filters;

    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Token 使用量统计
    const tokenStats = await prisma.aICallLog.aggregate({
      where: {
        requestTime: dateFilter.gte || dateFilter.lte ? { ...dateFilter } : undefined,
        status: 'success'
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        cost: true
      },
      _count: true
    });

    // 按模型统计
    const modelStats = await prisma.aICallLog.groupBy({
      by: ['modelId'],
      where: {
        requestTime: dateFilter.gte || dateFilter.lte ? { ...dateFilter } : undefined,
        status: 'success'
      },
      _sum: {
        totalTokens: true,
        cost: true
      },
      _count: true
    });

    // 按用户统计
    const userStats = await prisma.aICallLog.groupBy({
      by: ['userId'],
      where: {
        requestTime: dateFilter.gte || dateFilter.lte ? { ...dateFilter } : undefined,
        status: 'success'
      },
      _sum: {
        totalTokens: true,
        cost: true
      },
      _count: true
    });

    // QPS 统计（按小时）
    let qpsStats = [];
    try {
      const whereClause = dateFilter.gte || dateFilter.lte
        ? `WHERE status = 'success' ${dateFilter.gte ? `AND requestTime >= '${new Date(startDate).toISOString()}'` : ''} ${dateFilter.lte ? `AND requestTime <= '${new Date(endDate).toISOString()}'` : ''}`
        : `WHERE status = 'success'`;

      qpsStats = await prisma.$queryRawUnsafe(`
        SELECT
          DATE_FORMAT(requestTime, '%Y-%m-%d %H:00:00') as hour,
          COUNT(*) as callCount,
          SUM(totalTokens) as totalTokens,
          SUM(cost) as cost
        FROM ai_call_logs
        ${whereClause}
        GROUP BY hour
        ORDER BY hour ASC
      `);
    } catch (error) {
      console.error('Failed to get QPS stats:', error);
      qpsStats = [];
    }

    return {
      tokenStats: {
        totalInputTokens: tokenStats._sum.inputTokens || 0,
        totalOutputTokens: tokenStats._sum.outputTokens || 0,
        totalTokens: tokenStats._sum.totalTokens || 0,
        totalCost: tokenStats._sum.cost || 0,
        totalCalls: tokenStats._count || 0
      },
      modelStats,
      userStats,
      qpsStats: qpsStats || []
    };
  }
}

module.exports = new RiskService();
