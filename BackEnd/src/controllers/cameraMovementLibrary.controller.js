const cameraMovementLibraryService = require('../services/cameraMovementLibrary.service')
const ResponseHandler = require('../utils/response')
const { resolveCatalogRoleContext } = require('../utils/resolveCatalogRoleContext')
const { stripCatalogRoleMeta } = require('../utils/providerSanitizer')

function isTerminalUser(req) {
  return req.user?.type === 'user'
}

function sanitizeCatalogPayload(req, payload) {
  if (!isTerminalUser(req) || payload == null) return payload
  if (Array.isArray(payload)) return payload.map(stripCatalogRoleMeta)
  return stripCatalogRoleMeta(payload)
}

class CameraMovementLibraryController {
  async getMeta(req, res, next) {
    try {
      const meta = cameraMovementLibraryService.getMeta()
      return ResponseHandler.success(res, meta, 'Camera movement library meta retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async list(req, res, next) {
    try {
      const filters = {
        type: req.query.type,
        keyword: req.query.keyword,
        isActive: req.query.isActive,
      }

      Object.keys(filters).forEach(key => {
        if (filters[key] === '' || filters[key] === undefined) {
          delete filters[key]
        }
      })

      const includeAll =
        req.query.includeAll === true ||
        req.query.includeAll === 'true' ||
        req.query.includeAll === '1' ||
        req.query.includeAll === 1

      const pagination = {
        page: parseInt(req.query.page, 10) || 1,
        pageSize: parseInt(req.query.pageSize, 10) || 20,
        includeAll,
      }

      const sort = { sort: req.query.sort || 'sortOrder' }
      const userRole = req.user?.role
      const catalogRoleContext = await resolveCatalogRoleContext(req)

      const result = await cameraMovementLibraryService.list(
        filters,
        pagination,
        sort,
        userRole,
        catalogRoleContext,
      )

      return ResponseHandler.paginated(res, sanitizeCatalogPayload(req, result.data), {
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
      const { id } = req.params
      const catalogRoleContext = await resolveCatalogRoleContext(req)
      const item = await cameraMovementLibraryService.getDetail(
        id,
        req.user?.role,
        catalogRoleContext,
      )
      return ResponseHandler.success(
        res,
        sanitizeCatalogPayload(req, item),
        'Camera movement item retrieved successfully',
      )
    } catch (error) {
      next(error)
    }
  }

  async create(req, res, next) {
    try {
      const item = await cameraMovementLibraryService.create(req.body, req.user?.role)
      return ResponseHandler.success(res, item, 'Camera movement item created successfully', 201)
    } catch (error) {
      next(error)
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params
      const item = await cameraMovementLibraryService.update(id, req.body, req.user?.role)
      return ResponseHandler.success(res, item, 'Camera movement item updated successfully')
    } catch (error) {
      next(error)
    }
  }

  async remove(req, res, next) {
    try {
      const { id } = req.params
      const hard = req.query.hard === 'true' || req.query.hard === true
      const item = await cameraMovementLibraryService.remove(id, req.user?.role, { hard })
      return ResponseHandler.success(
        res,
        item,
        hard ? 'Camera movement item deleted successfully' : 'Camera movement item deactivated successfully'
      )
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new CameraMovementLibraryController()
