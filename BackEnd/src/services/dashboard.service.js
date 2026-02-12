const prisma = require('../config/database');

/**
 * 获取日期边界（本地时区当日 00:00:00 和 23:59:59.999）
 */
function getDateBounds(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = new Date(d);
  d.setHours(23, 59, 59, 999);
  const end = new Date(d);
  return { start, end };
}

/**
 * 计算百分比变化
 */
function calcChangePercent(today, yesterday) {
  if (yesterday == null || Number(yesterday) === 0) {
    return today > 0 ? 100 : 0;
  }
  return Number((((today - yesterday) / yesterday) * 100).toFixed(1));
}

/**
 * 风控 action 映射为中文
 */
const RISK_ACTION_LABELS = {
  limit_rate: '限流',
  freeze_quota: '冻结',
  ban_account: '封禁',
  alert: '通知'
};

/**
 * 大盘仪表盘服务
 */
class DashboardService {
  /**
   * 获取汇总指标（今日营收、新增用户、AI 调用量、风险预警）
   */
  async getSummaryMetrics() {
    const now = new Date();
    const { start: todayStart, end: todayEnd } = getDateBounds(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const { start: yesterdayStart, end: yesterdayEnd } = getDateBounds(yesterday);

    const [
      todayRevenue,
      yesterdayRevenue,
      todayNewUsers,
      yesterdayNewUsers,
      todayAiCalls,
      yesterdayAiCalls,
      todayRiskAlerts,
      yesterdayRiskAlerts
    ] = await Promise.all([
      this._getRevenueInRange(todayStart, todayEnd),
      this._getRevenueInRange(yesterdayStart, yesterdayEnd),
      this._getNewUsersInRange(todayStart, todayEnd),
      this._getNewUsersInRange(yesterdayStart, yesterdayEnd),
      this._getAiCallCountInRange(todayStart, todayEnd),
      this._getAiCallCountInRange(yesterdayStart, yesterdayEnd),
      this._getRiskTriggerCountInRange(todayStart, todayEnd),
      this._getRiskTriggerCountInRange(yesterdayStart, yesterdayEnd)
    ]);

    const revenueNum = Number(todayRevenue);
    const yesterdayRevenueNum = Number(yesterdayRevenue);
    const revenueChange = calcChangePercent(revenueNum, yesterdayRevenueNum);

    const newUsersChange = calcChangePercent(todayNewUsers, yesterdayNewUsers);
    const aiCallChange = calcChangePercent(todayAiCalls, yesterdayAiCalls);
    const riskAlertsChange = todayRiskAlerts - yesterdayRiskAlerts; // 绝对值

    return {
      todayRevenue: revenueNum,
      revenueChangeYesterday: revenueChange,
      todayNewUsers,
      newUsersChangeYesterday: newUsersChange,
      todayAiCallVolume: todayAiCalls,
      aiCallVolumeChangeYesterday: aiCallChange,
      todayRiskAlerts,
      riskAlertsChangeYesterday: riskAlertsChange
    };
  }

  async _getRevenueInRange(start, end) {
    const result = await prisma.order.aggregate({
      where: {
        status: 'paid',
        paidAt: {
          gte: start,
          lte: end
        }
      },
      _sum: {
        finalAmount: true
      }
    });
    return result._sum.finalAmount || 0;
  }

  async _getNewUsersInRange(start, end) {
    return await prisma.user.count({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      }
    });
  }

  async _getAiCallCountInRange(start, end) {
    return await prisma.aICallLog.count({
      where: {
        requestTime: {
          gte: start,
          lte: end
        }
      }
    });
  }

  async _getRiskTriggerCountInRange(start, end) {
    return await prisma.riskTrigger.count({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      }
    });
  }

  /**
   * 获取调用与积分趋势
   * @param {string} timeRange - 24h, 7d, 30d
   */
  async getCallPointsTrend(timeRange = '24h') {
    const now = new Date();
    let start;
    let groupBy; // hour | day

    if (timeRange === '24h') {
      start = new Date(now);
      start.setHours(start.getHours() - 24);
      groupBy = 'hour';
    } else if (timeRange === '7d') {
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      groupBy = 'day';
    } else if (timeRange === '30d') {
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      groupBy = 'day';
    } else {
      start = new Date(now);
      start.setHours(start.getHours() - 24);
      groupBy = 'hour';
    }

    const dateFormat = groupBy === 'hour' ? '%Y-%m-%d %H:00:00' : '%Y-%m-%d 00:00:00';
    const raw = await prisma.$queryRawUnsafe(
      `SELECT DATE_FORMAT(requestTime, ?) as timestamp, COUNT(*) as callVolume, COALESCE(SUM(cost), 0) as pointsVolume FROM ai_call_logs WHERE requestTime >= ? GROUP BY timestamp ORDER BY timestamp ASC`,
      dateFormat,
      start
    );

    return (Array.isArray(raw) ? raw : []).map((row) => ({
      timestamp: row.timestamp ? String(row.timestamp).slice(0, groupBy === 'hour' ? 13 : 10) : null,
      callVolume: Number(row.callVolume) || 0,
      pointsVolume: Number(row.pointsVolume) || 0
    }));
  }

  /**
   * 获取模型负载占比
   */
  async getModelLoadRatio() {
    const stats = await prisma.aICallLog.groupBy({
      by: ['modelId'],
      where: {
        status: 'success'
      },
      _count: true
    });

    const totalCalls = stats.reduce((sum, s) => sum + s._count, 0);
    if (totalCalls === 0) {
      return [];
    }

    const modelIds = stats.map((s) => s.modelId);
    const models = await prisma.aIModel.findMany({
      where: { id: { in: modelIds } },
      select: { id: true, displayName: true, name: true }
    });
    const modelMap = new Map(models.map((m) => [m.id, m.displayName || m.name]));

    return stats.map((s) => ({
      modelId: s.modelId,
      modelName: modelMap.get(s.modelId) || s.modelId,
      callCount: s._count,
      percentage: Number(((s._count / totalCalls) * 100).toFixed(1))
    }));
  }

  /**
   * 获取模型提供商健康度
   */
  async getModelProviderHealth() {
    const providers = await prisma.aIProvider.findMany({
      where: { isActive: true },
      include: {
        models: {
          select: { id: true }
        }
      }
    });

    const result = [];
    for (const p of providers) {
      const quota = p.quota ? Number(p.quota) : null;
      let remainingQuotaPercentage = null;
      let status = 'healthy';

      if (quota != null && quota > 0) {
        const used = await this._getProviderUsage(p.id);
        const remaining = Math.max(0, quota - used);
        remainingQuotaPercentage = Number(((remaining / quota) * 100).toFixed(1));
        if (remainingQuotaPercentage < 20) status = 'critical';
        else if (remainingQuotaPercentage < 50) status = 'warning';
      } else {
        remainingQuotaPercentage = 100;
      }

      result.push({
        providerId: p.id,
        providerName: p.displayName || p.name,
        status,
        remainingQuotaPercentage: remainingQuotaPercentage ?? 100,
        latencyMs: null
      });
    }

    return result;
  }

  async _getProviderUsage(providerId) {
    const modelIds = await prisma.aIModel.findMany({
      where: { providerId },
      select: { id: true }
    }).then((m) => m.map((x) => x.id));

    if (modelIds.length === 0) return 0;

    const costSum = await prisma.aICallLog.aggregate({
      where: {
        modelId: { in: modelIds },
        status: 'success'
      },
      _sum: { cost: true }
    });
    return Number(costSum._sum.cost || 0);
  }

  /**
   * 获取最近风控触发记录
   */
  async getRealtimeRiskTriggers(limit = 5) {
    const triggers = await prisma.riskTrigger.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const ruleIds = [...new Set(triggers.map((t) => t.ruleId))];
    const rules = ruleIds.length > 0
      ? await prisma.riskRule.findMany({
          where: { id: { in: ruleIds } },
          select: { id: true, name: true, description: true, action: true }
        })
      : [];
    const ruleMap = new Map(rules.map((r) => [r.id, r]));

    return triggers.map((t) => {
      const rule = ruleMap.get(t.ruleId);
      let triggerReason = rule?.description || rule?.name || '风控触发';
      try {
        const conditions = JSON.parse(t.conditions || '{}');
        if (conditions.reason) triggerReason = conditions.reason;
        else if (conditions.message) triggerReason = conditions.message;
      } catch (_) {}

      return {
        id: t.id,
        userId: t.userId || '-',
        triggerReason,
        timestamp: t.createdAt,
        actionTaken: RISK_ACTION_LABELS[t.action] || t.action,
        createdAt: t.createdAt
      };
    });
  }
}

module.exports = new DashboardService();
