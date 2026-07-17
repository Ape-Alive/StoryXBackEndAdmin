const SUPPORTED_LANGUAGES = [
  { language: 'zh', label: '简体中文' },
  { language: 'en', label: 'English' },
  { language: 'ja', label: '日本語' },
]

const REQUIRED_LANGUAGE = 'zh'

const PERMISSION_CODE_REGEX = /^[A-Z][A-Z0-9_]*$/

const ROOT_PARENT_ID = '0'

const LEGACY_LOCALE_MAP = {
  'zh-CN': 'zh',
  'en-US': 'en',
  'ja-JP': 'ja',
}

function resolveLanguage(item) {
  if (item?.language != null && String(item.language).trim()) {
    return String(item.language).trim()
  }
  if (item?.locale != null && String(item.locale).trim()) {
    const legacy = String(item.locale).trim()
    return LEGACY_LOCALE_MAP[legacy] || legacy
  }
  return ''
}

function resolveLabel(item) {
  if (item?.label != null && String(item.label).trim()) {
    return String(item.label).trim()
  }
  if (item?.name != null && String(item.name).trim()) {
    return String(item.name).trim()
  }
  return ''
}

function normalizePermissionCode(value) {
  if (value == null || value === '') return null
  return String(value).trim()
}

function validatePermissionCode(value, fieldName, { required = false } = {}) {
  const code = normalizePermissionCode(value)
  if (code == null) {
    if (required) throw new Error(`${fieldName} is required`)
    return null
  }
  if (!PERMISSION_CODE_REGEX.test(code)) {
    throw new Error(`${fieldName} must be UPPER_SNAKE_CASE`)
  }
  return code
}

function normalizeI18nNames(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map(item => ({
      language: resolveLanguage(item),
      label: resolveLabel(item),
    }))
    .filter(item => item.language && item.label)
}

function validateI18nNames(raw, { requireZh = false } = {}) {
  const items = normalizeI18nNames(raw)
  if (requireZh) {
    const zhItem = items.find(item => item.language === REQUIRED_LANGUAGE)
    if (!zhItem) {
      throw new Error('Simplified Chinese (zh) label is required')
    }
  }
  const languages = new Set()
  for (const item of items) {
    if (languages.has(item.language)) {
      throw new Error(`Duplicate language: ${item.language}`)
    }
    languages.add(item.language)
  }
  return items
}

function normalizeParentId(raw) {
  if (raw == null || raw === '' || raw === 0 || raw === '0') return ROOT_PARENT_ID
  return String(raw).trim()
}

module.exports = {
  SUPPORTED_LANGUAGES,
  REQUIRED_LANGUAGE,
  PERMISSION_CODE_REGEX,
  ROOT_PARENT_ID,
  normalizePermissionCode,
  validatePermissionCode,
  normalizeI18nNames,
  validateI18nNames,
  normalizeParentId,
}
