/**
 * 套餐有效期工具函数
 */

/**
 * 根据 duration 和 durationUnit 计算天数
 * @param {number|null} duration - 有效期数值
 * @param {string|null} durationUnit - 有效期单位：day, month, year
 * @returns {number|null} - 返回天数，null 表示永久
 */
function calculateDays(duration, durationUnit) {
  if (!duration || !durationUnit) {
    return null; // 永久
  }

  switch (durationUnit) {
    case 'day':
      return duration;
    case 'month':
      // 按月计算，假设每月30天
      return duration * 30;
    case 'year':
      // 按年计算，假设每年365天
      return duration * 365;
    default:
      return null;
  }
}

/**
 * 根据 duration 和 durationUnit 计算过期时间
 * @param {number|null} duration - 有效期数值
 * @param {string|null} durationUnit - 有效期单位：day, month, year
 * @param {Date} startDate - 开始日期，默认为当前时间
 * @returns {Date|null} - 返回过期时间，null 表示永久
 */
function calculateExpiryDate(duration, durationUnit, startDate = new Date()) {
  const days = calculateDays(duration, durationUnit);
  if (days === null) {
    return null; // 永久
  }

  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate;
}

/**
 * 格式化有效期显示文本
 * @param {number|null} duration - 有效期数值
 * @param {string|null} durationUnit - 有效期单位：day, month, year
 * @returns {string} - 格式化后的文本
 */
function formatDuration(duration, durationUnit) {
  if (!duration || !durationUnit) {
    return '永久';
  }

  const unitMap = {
    day: '天',
    month: '月',
    year: '年'
  };

  return `${duration}${unitMap[durationUnit] || durationUnit}`;
}

module.exports = {
  calculateDays,
  calculateExpiryDate,
  formatDuration
};
