const { query } = require('express-validator');

/**
 * 获取调用与积分趋势验证
 */
const getCallPointsTrendValidator = [
  query('timeRange')
    .optional()
    .isIn(['24h', '7d', '30d'])
    .withMessage('timeRange must be 24h, 7d, or 30d')
];

/**
 * 获取风控触发记录验证
 */
const getRealtimeRiskTriggersValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('limit must be between 1 and 20')
];

module.exports = {
  getCallPointsTrendValidator,
  getRealtimeRiskTriggersValidator
};
