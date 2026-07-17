const { createBackendMenuService } = require('../services/menuManagement.service')
const ResponseHandler = require('../utils/response')

const service = createBackendMenuService()

class BackendMenuController {
  async getMeta(req, res, next) {
    try {
      const meta = service.getMeta()
      return ResponseHandler.success(res, meta, 'Backend menu meta retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async getTree(req, res, next) {
    try {
      const tree = await service.getTree(req.query.keyword, req.user?.role)
      return ResponseHandler.success(res, tree, 'Backend menu tree retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async getDetail(req, res, next) {
    try {
      const item = await service.getDetail(req.params.id, req.user?.role)
      return ResponseHandler.success(res, item, 'Backend menu retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async create(req, res, next) {
    try {
      const item = await service.createMenu(req.body, req.user?.role)
      return ResponseHandler.success(res, item, 'Backend menu created successfully', 201)
    } catch (error) {
      next(error)
    }
  }

  async update(req, res, next) {
    try {
      const item = await service.updateMenu(req.params.id, req.body, req.user?.role)
      return ResponseHandler.success(res, item, 'Backend menu updated successfully')
    } catch (error) {
      next(error)
    }
  }

  async remove(req, res, next) {
    try {
      await service.removeMenu(req.params.id, req.user?.role)
      return ResponseHandler.success(res, null, 'Backend menu deleted successfully')
    } catch (error) {
      next(error)
    }
  }

  async listButtons(req, res, next) {
    try {
      const buttons = await service.listButtons(req.params.menuId, req.user?.role)
      return ResponseHandler.success(res, buttons, 'Backend menu buttons retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async createButton(req, res, next) {
    try {
      const button = await service.createButton(req.params.menuId, req.body, req.user?.role)
      return ResponseHandler.success(res, button, 'Backend menu button created successfully', 201)
    } catch (error) {
      next(error)
    }
  }

  async updateButton(req, res, next) {
    try {
      const button = await service.updateButton(
        req.params.menuId,
        req.params.buttonId,
        req.body,
        req.user?.role
      )
      return ResponseHandler.success(res, button, 'Backend menu button updated successfully')
    } catch (error) {
      next(error)
    }
  }

  async removeButton(req, res, next) {
    try {
      await service.removeButton(req.params.menuId, req.params.buttonId, req.user?.role)
      return ResponseHandler.success(res, null, 'Backend menu button deleted successfully')
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new BackendMenuController()
