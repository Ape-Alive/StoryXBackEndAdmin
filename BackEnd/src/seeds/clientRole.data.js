const CLIENT_ROLE_SEEDS = [
  {
    id: 'cr-software-paid-user',
    roleKey: 'software_paid_user',
    name: '软件付费用户',
    description: '已购买软件授权的用户，可使用软件付费功能。',
    priority: 200,
    sortOrder: 10,
  },
  {
    id: 'cr-package-paid-user',
    roleKey: 'package_paid_user',
    name: '套餐付费用户',
    description: '已购买套餐的用户，可使用套餐内包含的能力。',
    priority: 300,
    sortOrder: 20,
  },
  {
    id: 'cr-software-trial-user',
    roleKey: 'software_trial_user',
    name: '软件试用用户',
    description: '处于软件试用期的用户，可使用试用范围内的功能。',
    priority: 100,
    sortOrder: 30,
  },
  {
    id: 'cr-enterprise-team-user',
    roleKey: 'enterprise_team_user',
    name: '企业团队用户',
    description: '企业/团队账号用户，可使用团队协作相关能力。',
    priority: 400,
    sortOrder: 40,
  },
]

module.exports = { CLIENT_ROLE_SEEDS }
