const crypto = require('crypto')
const { CODE_ALPHABET } = require('../constants/activationCode')

/**
 * 生成形如 ABCD-EFGH-IJKL-MNOP 的大写激活码
 */
function generateActivationCode(groups = 4, groupSize = 4) {
  const parts = []
  for (let g = 0; g < groups; g++) {
    let part = ''
    for (let i = 0; i < groupSize; i++) {
      const idx = crypto.randomInt(0, CODE_ALPHABET.length)
      part += CODE_ALPHABET[idx]
    }
    parts.push(part)
  }
  return parts.join('-')
}

/**
 * 规范化用户输入的激活码（去空格、转大写）
 */
function normalizeActivationCode(raw) {
  if (raw == null) return ''
  return String(raw)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

function isValidActivationCodeFormat(code) {
  return /^[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/.test(code)
}

module.exports = {
  generateActivationCode,
  normalizeActivationCode,
  isValidActivationCodeFormat,
}
