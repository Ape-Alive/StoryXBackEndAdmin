/**
 * 用户状态常量
 */
const USER_STATUS = {
  NORMAL: 'normal',      // 正常
  FROZEN: 'frozen',      // 冻结
  BANNED: 'banned'       // 封禁
};

/**
 * 用户状态说明
 */
const USER_STATUS_DESC = {
  [USER_STATUS.NORMAL]: '正常',
  [USER_STATUS.FROZEN]: '冻结',
  [USER_STATUS.BANNED]: '封禁'
};

module.exports = {
  USER_STATUS,
  USER_STATUS_DESC
};
