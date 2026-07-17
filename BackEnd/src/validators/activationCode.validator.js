const { body, param, query } = require('express-validator')
const { MAX_BATCH_COUNT } = require('../constants/activationCode')

const listActivationCodesValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 200 }),
  query('status').optional().isIn(['unused', 'used', 'expired', 'revoked']),
  query('packageId').optional().isString(),
  query('createdBy').optional().isString(),
  query('batchId').optional().isString(),
  query('keyword').optional().isString(),
]

const idParamValidator = [param('id').notEmpty().isString()]

const createActivationCodeValidator = [
  body('packageId').optional({ values: 'falsy' }).isString().notEmpty(),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('邮箱格式无效'),
  body('phone')
    .optional({ values: 'falsy' })
    .isString()
    .isLength({ min: 5, max: 32 })
    .withMessage('手机号格式无效'),
  body('expiresAt').optional({ values: 'falsy' }).isISO8601().withMessage('过期时间格式无效'),
  body('expiresInDays').optional().isInt({ min: 1, max: 3650 }),
  body('count').optional().isInt({ min: 1, max: MAX_BATCH_COUNT }),
  body('remark').optional({ values: 'falsy' }).isString().isLength({ max: 500 }),
]

const updateActivationCodeValidator = [
  ...idParamValidator,
  body('packageId').optional({ values: 'falsy' }).isString().notEmpty(),
  body('email')
    .optional({ values: 'null' })
    .custom((v) => v === null || v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))),
  body('phone')
    .optional({ values: 'null' })
    .custom((v) => v === null || v === '' || (typeof v === 'string' && v.length <= 32)),
  body('expiresAt').optional({ values: 'falsy' }).isISO8601(),
  body('expiresInDays').optional().isInt({ min: 1, max: 3650 }),
  body('remark').optional({ values: 'null' }).isString().isLength({ max: 500 }),
]

module.exports = {
  listActivationCodesValidator,
  idParamValidator,
  createActivationCodeValidator,
  updateActivationCodeValidator,
}
