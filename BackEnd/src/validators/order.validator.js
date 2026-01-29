const { body, query, param } = require('express-validator');

const createOrderValidator = [
  body('packageId')
    .notEmpty()
    .withMessage('Package ID is required')
    .isString()
    .withMessage('Package ID must be a string'),
  body('type')
    .optional()
    .isIn(['purchase', 'renewal', 'upgrade'])
    .withMessage('Invalid order type')
];

const getOrdersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page size must be between 1 and 1000'),
  query('status')
    .optional()
    .isIn(['pending', 'paid', 'cancelled', 'refunded', 'expired'])
    .withMessage('Invalid order status'),
  query('type')
    .optional()
    .isIn(['purchase', 'renewal', 'upgrade'])
    .withMessage('Invalid order type'),
  query('orderNo')
    .optional()
    .isString()
    .withMessage('Order number must be a string'),
  query('orderBy')
    .optional()
    .isIn(['createdAt', 'paidAt', 'amount'])
    .withMessage('Invalid order by field'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid order direction')
];

const getOrderDetailValidator = [
  param('id')
    .notEmpty()
    .withMessage('Order ID is required')
];

const cancelOrderValidator = [
  param('id')
    .notEmpty()
    .withMessage('Order ID is required')
];

module.exports = {
  createOrderValidator,
  getOrdersValidator,
  getOrderDetailValidator,
  cancelOrderValidator
};

