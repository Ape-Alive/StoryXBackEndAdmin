const backendRoleService = require('../services/backendRole.service')
const ResponseHandler = require('../utils/response')

class BackendRoleController {
  async list(req, res, next) {
    try {
      const data = await backendRoleService.list(req.user?.role)
      return ResponseHandler.success(res, data, 'Backend roles retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async listOptions(req, res, next) {
    try {
      const data = await backendRoleService.listAssignableRoles(req.user?.role)
      return ResponseHandler.success(res, data, 'Assignable backend roles retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async getDetail(req, res, next) {
    try {
      const data = await backendRoleService.getDetail(req.params.id, req.user?.role)
      return ResponseHandler.success(res, data, 'Backend role retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async create(req, res, next) {
    try {
      const data = await backendRoleService.create(req.body, req.user?.role)
      return ResponseHandler.success(res, data, 'Backend role created successfully', 201)
    } catch (error) {
      next(error)
    }
  }

  async remove(req, res, next) {
    try {
      const data = await backendRoleService.remove(req.params.id, req.user?.role)
      return ResponseHandler.success(res, data, 'Backend role deleted successfully')
    } catch (error) {
      next(error)
    }
  }

  async update(req, res, next) {
    try {
      const data = await backendRoleService.update(req.params.id, req.body, req.user?.role)
      return ResponseHandler.success(res, data, 'Backend role updated successfully')
    } catch (error) {
      next(error)
    }
  }

  async getPermissions(req, res, next) {
    try {
      const data = await backendRoleService.getPermissions(req.params.id, req.user?.role)
      return ResponseHandler.success(res, data, 'Backend role permissions retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async savePermissions(req, res, next) {
    try {
      const data = await backendRoleService.savePermissions(req.params.id, req.body, req.user?.role)
      return ResponseHandler.success(res, data, 'Backend role permissions saved successfully')
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new BackendRoleController()
