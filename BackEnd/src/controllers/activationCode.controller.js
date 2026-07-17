const activationCodeService = require('../services/activationCode.service')
const ResponseHandler = require('../utils/response')

class ActivationCodeController {
  async list(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        packageId: req.query.packageId,
        createdBy: req.query.createdBy,
        batchId: req.query.batchId,
        keyword: req.query.keyword,
      }
      const pagination = {
        page: parseInt(req.query.page, 10) || 1,
        pageSize: parseInt(req.query.pageSize, 10) || 20,
      }
      const result = await activationCodeService.list(filters, pagination)
      return ResponseHandler.paginated(res, result.data, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      })
    } catch (error) {
      next(error)
    }
  }

  async getDetail(req, res, next) {
    try {
      const item = await activationCodeService.getDetail(req.params.id)
      return ResponseHandler.success(res, item, 'Activation code retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async create(req, res, next) {
    try {
      const result = await activationCodeService.create(req.body, req.user?.id)
      return ResponseHandler.success(res, result, 'Activation code(s) created successfully', 201)
    } catch (error) {
      next(error)
    }
  }

  async update(req, res, next) {
    try {
      const item = await activationCodeService.update(req.params.id, req.body, req.user?.id)
      return ResponseHandler.success(res, item, 'Activation code updated successfully')
    } catch (error) {
      next(error)
    }
  }

  async remove(req, res, next) {
    try {
      const result = await activationCodeService.remove(req.params.id, req.user?.id)
      return ResponseHandler.success(res, result, 'Activation code deleted successfully')
    } catch (error) {
      next(error)
    }
  }

  async destroyExpired(req, res, next) {
    try {
      const result = await activationCodeService.destroyExpiredUnused()
      return ResponseHandler.success(res, result, 'Expired activation codes destroyed')
    } catch (error) {
      next(error)
    }
  }

  async getMeta(req, res, next) {
    try {
      const defaultPackageId = await activationCodeService.resolveDefaultTrialPackageId().catch(() => null)
      return ResponseHandler.success(
        res,
        {
          defaultExpireDays: parseInt(process.env.ACTIVATION_CODE_DEFAULT_EXPIRE_DAYS || '30', 10),
          maxBatchCount: require('../constants/activationCode').MAX_BATCH_COUNT,
          defaultPackageId,
          statuses: [
            { value: 'unused', label: '未使用' },
            { value: 'used', label: '已使用' },
            { value: 'expired', label: '已过期' },
            { value: 'revoked', label: '已作废' },
          ],
        },
        'Activation code meta',
      )
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new ActivationCodeController()
