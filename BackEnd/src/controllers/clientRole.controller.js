const clientRoleService = require('../services/clientRole.service')
const ResponseHandler = require('../utils/response')

class ClientRoleController {
  async list(req, res, next) {
    try {
      const data = await clientRoleService.list(req.user?.role)
      return ResponseHandler.success(res, data, 'Client roles retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async getDetail(req, res, next) {
    try {
      const data = await clientRoleService.getDetail(req.params.id, req.user?.role)
      return ResponseHandler.success(res, data, 'Client role retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async create(req, res, next) {
    try {
      const data = await clientRoleService.create(req.body, req.user?.role)
      return ResponseHandler.success(res, data, 'Client role created successfully', 201)
    } catch (error) {
      next(error)
    }
  }

  async remove(req, res, next) {
    try {
      const data = await clientRoleService.remove(req.params.id, req.user?.role)
      return ResponseHandler.success(res, data, 'Client role deleted successfully')
    } catch (error) {
      next(error)
    }
  }

  async update(req, res, next) {
    try {
      const data = await clientRoleService.update(req.params.id, req.body, req.user?.role)
      return ResponseHandler.success(res, data, 'Client role updated successfully')
    } catch (error) {
      next(error)
    }
  }

  async getPermissions(req, res, next) {
    try {
      const data = await clientRoleService.getPermissions(req.params.id, req.user?.role)
      return ResponseHandler.success(res, data, 'Client role permissions retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async savePermissions(req, res, next) {
    try {
      const data = await clientRoleService.savePermissions(req.params.id, req.body, req.user?.role)
      return ResponseHandler.success(res, data, 'Client role permissions saved successfully')
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new ClientRoleController()
