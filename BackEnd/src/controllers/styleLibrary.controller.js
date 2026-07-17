const styleLibraryService = require('../services/styleLibrary.service')
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

class StyleLibraryController {
  async getMeta(req, res, next) {
    try {
      const meta = styleLibraryService.getMeta()
      return ResponseHandler.success(res, meta, 'Style library meta retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async list(req, res, next) {
    try {
      const filters = {
        mediaType: req.query.mediaType,
        scene: req.query.scene,
        keyword: req.query.keyword,
        systemPromptId: req.query.systemPromptId,
        isActive: req.query.isActive,
        isFeatured: req.query.isFeatured,
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

      const sort = { sort: req.query.sort || 'recommend' }
      const userRole = req.user?.role
      const catalogRoleContext = await resolveCatalogRoleContext(req)

      const result = await styleLibraryService.list(
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
      const item = await styleLibraryService.getDetail(id, req.user?.role, catalogRoleContext)
      return ResponseHandler.success(
        res,
        sanitizeCatalogPayload(req, item),
        'Style library item retrieved successfully',
      )
    } catch (error) {
      next(error)
    }
  }

  async create(req, res, next) {
    try {
      const item = await styleLibraryService.create(req.body, req.user?.role)
      return ResponseHandler.success(res, item, 'Style library item created successfully', 201)
    } catch (error) {
      next(error)
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params
      const item = await styleLibraryService.update(id, req.body, req.user?.role)
      return ResponseHandler.success(res, item, 'Style library item updated successfully')
    } catch (error) {
      next(error)
    }
  }

  async remove(req, res, next) {
    try {
      const { id } = req.params
      const hard = req.query.hard === 'true' || req.query.hard === true
      const item = await styleLibraryService.remove(id, req.user?.role, { hard })
      return ResponseHandler.success(res, item, hard ? 'Style library item deleted successfully' : 'Style library item deactivated successfully')
    } catch (error) {
      next(error)
    }
  }

  async recordUse(req, res, next) {
    try {
      const { id } = req.params
      const catalogRoleContext = await resolveCatalogRoleContext(req)
      const item = await styleLibraryService.recordUse(id, req.user?.role, catalogRoleContext)
      return ResponseHandler.success(
        res,
        sanitizeCatalogPayload(req, item),
        'Style usage recorded successfully',
      )
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new StyleLibraryController()
