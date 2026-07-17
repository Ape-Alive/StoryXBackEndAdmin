const ACCESS_STATUS = {
  ACTIVE: 'active',
  NO_PACKAGE: 'no_package',
  ALL_EXPIRED: 'all_expired',
  NOT_STARTED: 'not_started',
  PACKAGE_DISABLED: 'package_disabled',
  ROLE_NO_PERMISSION: 'role_no_permission',
}

const ACCESS_STATUS_MESSAGES = {
  [ACCESS_STATUS.ACTIVE]: '权益有效',
  [ACCESS_STATUS.NO_PACKAGE]: '您当前没有可用套餐，请先订阅',
  [ACCESS_STATUS.ALL_EXPIRED]: '您的套餐已全部过期，请续费或重新订阅',
  [ACCESS_STATUS.NOT_STARTED]: '您的套餐尚未生效，请稍后再试',
  [ACCESS_STATUS.PACKAGE_DISABLED]: '您的套餐已被停用，请联系客服',
  [ACCESS_STATUS.ROLE_NO_PERMISSION]: '您的套餐角色未配置权限，请联系客服',
}

const NO_ENTITLEMENT_CODE = 'NO_ENTITLEMENT'

module.exports = {
  ACCESS_STATUS,
  ACCESS_STATUS_MESSAGES,
  NO_ENTITLEMENT_CODE,
}
