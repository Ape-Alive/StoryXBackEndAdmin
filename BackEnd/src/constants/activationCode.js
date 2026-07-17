const ACTIVATION_CODE_STATUS = {
  UNUSED: 'unused',
  USED: 'used',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
}

/** 默认未使用激活码有效天数 */
const DEFAULT_EXPIRE_DAYS = parseInt(process.env.ACTIVATION_CODE_DEFAULT_EXPIRE_DAYS || '30', 10)

/** 单次批量创建上限 */
const MAX_BATCH_COUNT = 200

/** 编码字符集（大写 + 数字，去掉易混 I/O/0/1） */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

module.exports = {
  ACTIVATION_CODE_STATUS,
  DEFAULT_EXPIRE_DAYS,
  MAX_BATCH_COUNT,
  CODE_ALPHABET,
}
