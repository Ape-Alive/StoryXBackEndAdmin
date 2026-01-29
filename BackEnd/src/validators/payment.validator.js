const { body, param } = require('express-validator');

const createPaymentValidator = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required'),
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['wxpay_native', 'alipay'])
    .withMessage('Invalid payment method'),
  body('type')
    .optional()
    .isIn(['1', '2'])
    .withMessage('Type must be 1 (pay link) or 2 (QR code)'),
  body('notifyUrl')
    .optional()
    .isURL()
    .withMessage('Notify URL must be a valid URL'),
  body('returnUrl')
    .optional()
    .isURL()
    .withMessage('Return URL must be a valid URL')
];

const getPaymentDetailValidator = [
  param('id')
    .notEmpty()
    .withMessage('Payment ID is required')
];

const queryPaymentStatusValidator = [
  param('id')
    .notEmpty()
    .withMessage('Payment ID is required')
];

const handleCallbackValidator = [
  param('platform')
    .notEmpty()
    .withMessage('Platform is required')
    .isIn(['yungouos', 'wechat_official', 'alipay_official', 'stripe'])
    .withMessage('Invalid payment platform')
];

module.exports = {
  createPaymentValidator,
  getPaymentDetailValidator,
  queryPaymentStatusValidator,
  handleCallbackValidator
};

