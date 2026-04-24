const voiceProfileService = require('../services/voiceProfile.service')
const ResponseHandler = require('../utils/response')

class VoiceProfileController {
  async getVoiceProfiles(req, res, next) {
    try {
      const filters = {
        voiceId: req.query.voiceId,
        name: req.query.name,
        scope: req.query.scope,
        userId: req.query.userId,
        modelId: req.query.modelId,
        isActive: req.query.isActive,
      }

      const pagination = {
        page: parseInt(req.query.page) || 1,
        pageSize: parseInt(req.query.pageSize) || 20,
      }

      const sort = {
        createdAt: req.query.order === 'asc' ? 'asc' : 'desc',
      }

      const includeAll =
        req.query.includeAll === true ||
        req.query.includeAll === 'true' ||
        req.query.includeAll === '1' ||
        req.query.includeAll === 1

      // userId 参数：'null' -> null；不传 -> undefined
      if (filters.userId === 'null') filters.userId = null
      if (filters.userId === '' || filters.userId === undefined) delete filters.userId
      if (filters.modelId === '' || filters.modelId === undefined) delete filters.modelId

      const userRole = req.user?.role
      const userId = req.user?.id

      const result = await voiceProfileService.getVoiceProfiles(
        filters,
        pagination,
        sort,
        userRole,
        userId,
        includeAll
      )

      return ResponseHandler.paginated(res, result.data, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      })
    } catch (error) {
      next(error)
    }
  }

  async getVoiceProfileDetail(req, res, next) {
    try {
      const { id } = req.params
      const userRole = req.user?.role
      const userId = req.user?.id
      const profile = await voiceProfileService.getVoiceProfileDetail(id, userRole, userId)
      return ResponseHandler.success(res, profile, 'Voice profile retrieved successfully')
    } catch (error) {
      next(error)
    }
  }

  async createVoiceProfile(req, res, next) {
    try {
      const userId = req.user?.id
      const userRole = req.user?.role
      const profile = await voiceProfileService.createVoiceProfile(req.body, userId, userRole)
      return ResponseHandler.success(res, profile, 'Voice profile created successfully', 201)
    } catch (error) {
      next(error)
    }
  }

  async updateVoiceProfile(req, res, next) {
    try {
      const { id } = req.params
      const userId = req.user?.id
      const userRole = req.user?.role
      const profile = await voiceProfileService.updateVoiceProfile(id, req.body, userId, userRole)
      return ResponseHandler.success(res, profile, 'Voice profile updated successfully')
    } catch (error) {
      next(error)
    }
  }

  async deleteVoiceProfile(req, res, next) {
    try {
      const { id } = req.params
      const userId = req.user?.id
      const userRole = req.user?.role
      await voiceProfileService.deleteVoiceProfile(id, userId, userRole)
      return ResponseHandler.success(res, null, 'Voice profile deleted successfully')
    } catch (error) {
      next(error)
    }
  }

  async cloneVoiceProfile(req, res, next) {
    try {
      const userId = req.user?.id
      const userRole = req.user?.role
      const result = await voiceProfileService.cloneVoiceProfile(req.body, userId, userRole)
      return ResponseHandler.success(res, result, 'Voice profile cloned successfully', 201)
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new VoiceProfileController()

