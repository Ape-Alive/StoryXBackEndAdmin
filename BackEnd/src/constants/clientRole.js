const ROLE_KEY_PATTERN = /^[a-z][a-z0-9_]*$/

const DEFAULT_ROLE_PRIORITIES = {
  enterprise_team_user: 400,
  package_paid_user: 300,
  software_paid_user: 200,
  software_trial_user: 100,
}

const ROLE_KEY_TO_PACKAGE_TYPE = {
  software_trial_user: 'trial',
  package_paid_user: 'paid',
  software_paid_user: 'paid',
  enterprise_team_user: 'paid',
}

module.exports = {
  ROLE_KEY_PATTERN,
  DEFAULT_ROLE_PRIORITIES,
  ROLE_KEY_TO_PACKAGE_TYPE,
}
