const otaReleaseService = require('../services/otaRelease.service')
const otaReportService = require('../services/otaReport.service')
const ResponseHandler = require('../utils/response')
const { ForbiddenError } = require('../utils/errors')
const { ROLES } = require('../constants/roles')
const { assertChannelAccess } = require('../utils/otaChannelAccess')

function auditContextFromReq(req) {
  return {
    adminId: req.user?.id,
    ipAddress: req.ip,
    userType: req.user?.type,
  }
}

class OtaReleaseController {
  async getMeta(req, res, next) {
    try {
      const meta = otaReleaseService.getMeta()
      return ResponseHandler.success(res, meta, 'OTA meta retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async list(req, res, next) {
    try {
      const filters = {
        layer: req.query.layer,
        platform: req.query.platform,
        channel: req.query.channel,
        bundleType: req.query.bundleType,
        isPublished: req.query.isPublished,
        keyword: req.query.keyword,
      }
      Object.keys(filters).forEach(key => {
        if (filters[key] === '' || filters[key] === undefined) delete filters[key]
      })

      const pagination = {
        page: parseInt(req.query.page, 10) || 1,
        pageSize: parseInt(req.query.pageSize, 10) || 20,
      }

      const result = await otaReleaseService.list(filters, pagination)
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
      const item = await otaReleaseService.getDetail(req.params.id)
      return ResponseHandler.success(res, item, 'OTA release retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async create(req, res, next) {
    try {
      const item = await otaReleaseService.create(req.body, req.user?.id, req.user?.role, auditContextFromReq(req))
      return ResponseHandler.success(res, item, 'OTA release created successfully', 201)
    } catch (error) {
      next(error)
    }
  }

  async update(req, res, next) {
    try {
      const item = await otaReleaseService.update(req.params.id, req.body, req.user?.role, auditContextFromReq(req))
      return ResponseHandler.success(res, item, 'OTA release updated successfully')
    } catch (error) {
      next(error)
    }
  }

  async publish(req, res, next) {
    try {
      const item = await otaReleaseService.publish(
        req.params.id,
        req.user?.role,
        auditContextFromReq(req),
        {
          mode: req.body?.mode,
          publishAt: req.body?.publishAt,
        },
      )
      return ResponseHandler.success(res, item, 'OTA release published successfully')
    } catch (error) {
      next(error)
    }
  }

  async unpublish(req, res, next) {
    try {
      const item = await otaReleaseService.unpublish(req.params.id, req.user?.role, auditContextFromReq(req))
      return ResponseHandler.success(res, item, 'OTA release unpublished successfully')
    } catch (error) {
      next(error)
    }
  }

  async remove(req, res, next) {
    try {
      const item = await otaReleaseService.remove(req.params.id, req.user?.role, auditContextFromReq(req))
      return ResponseHandler.success(res, item, 'OTA release deleted successfully')
    } catch (error) {
      next(error)
    }
  }

  async uploadArtifact(req, res, next) {
    try {
      if (![ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.OPERATOR].includes(req.user?.role)) {
        throw new ForbiddenError('Permission denied')
      }
      const result = otaReportService.handleArtifactUpload(req.file, req.body)
      return ResponseHandler.success(res, result, 'Artifact uploaded successfully', 201)
    } catch (error) {
      next(error)
    }
  }

  async report(req, res, next) {
    try {
      const channel = req.body?.channel != null ? String(req.body.channel).trim() : 'stable'
      assertChannelAccess(channel, req)
      const item = await otaReportService.createReport(req.body)
      return ResponseHandler.success(res, item, 'OTA report recorded', 201)
    } catch (error) {
      next(error)
    }
  }

  async listReports(req, res, next) {
    try {
      const filters = {
        deviceId: req.query.deviceId,
        event: req.query.event,
        layer: req.query.layer,
      }
      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key]
      })
      const pagination = {
        page: parseInt(req.query.page, 10) || 1,
        pageSize: parseInt(req.query.pageSize, 10) || 20,
      }
      const result = await otaReportService.list(filters, pagination)
      return ResponseHandler.paginated(res, result.data, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      })
    } catch (error) {
      next(error)
    }
  }

  async check(req, res, next) {
    try {
      const data = await otaReleaseService.checkUpdates(req.body || {}, req)
      return ResponseHandler.success(res, data, 'OTA check completed')
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new OtaReleaseController()
