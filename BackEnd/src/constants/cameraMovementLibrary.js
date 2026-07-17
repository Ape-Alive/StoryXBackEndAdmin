const MOVEMENT_TYPES = ['official', 'custom']

const MOVEMENT_TYPE_LABELS = {
  official: '官方',
  custom: '自定义',
}

function validateMovementType(type) {
  if (!MOVEMENT_TYPES.includes(type)) {
    throw new Error(`Invalid movement type: ${type}`)
  }
}

module.exports = {
  MOVEMENT_TYPES,
  MOVEMENT_TYPE_LABELS,
  validateMovementType,
}
