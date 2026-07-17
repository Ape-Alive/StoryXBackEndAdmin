const backendRoleRepository = require('../repositories/backendRole.repository')
const { ROLES } = require('../constants/roles')
const { SUPER_ADMIN_ROLE_KEY } = require('../constants/backendRole')
const { BadRequestError } = require('../utils/errors')

async function assertAssignableAdminRole(roleKey) {
  if (!roleKey) {
    throw new BadRequestError('Role is required')
  }

  if (roleKey === ROLES.SUPER_ADMIN || roleKey === SUPER_ADMIN_ROLE_KEY) {
    throw new BadRequestError('Cannot assign super admin role')
  }

  const role = await backendRoleRepository.findByRoleKey(roleKey)
  if (!role || role.status !== 'active') {
    throw new BadRequestError('Invalid role')
  }
}

module.exports = {
  assertAssignableAdminRole,
}
