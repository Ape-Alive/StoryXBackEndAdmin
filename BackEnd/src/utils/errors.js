/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400)
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401)
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', extra = {}) {
    super(message, 403)
    Object.assign(this, extra)
  }
}

class NoEntitlementError extends ForbiddenError {
  constructor(message = 'No active entitlement', subscriptionGuide = null) {
    super(message, {
      code: 'NO_ENTITLEMENT',
      subscriptionGuide,
    })
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource Not Found') {
    super(message, 404)
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409)
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation Error', errors = []) {
    super(message, 400)
    this.errors = errors
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error') {
    super(message, 500)
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Too Many Requests') {
    super(message, 429)
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NoEntitlementError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
  TooManyRequestsError,
}
