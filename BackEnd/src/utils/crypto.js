const crypto = require('crypto');

// 使用环境变量中的JWT_SECRET作为加密密钥（如果没有则使用默认值）
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-encryption-key-change-in-production';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * 从密钥派生加密密钥
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
}

/**
 * 加密API Key
 * @param {string} text - 要加密的文本
 * @returns {string} - 加密后的字符串（格式：salt:iv:tag:encrypted）
 */
function encryptApiKey(text) {
  if (!text) {
    return null;
  }

  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(ENCRYPTION_KEY, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    // 返回格式：salt:iv:tag:encrypted
    return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    const logger = require('./logger');
    logger.error('Failed to encrypt API key:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * 解密API Key
 * @param {string} encryptedText - 加密的文本（格式：salt:iv:tag:encrypted）
 * @returns {string} - 解密后的文本
 */
function decryptApiKey(encryptedText) {
  if (!encryptedText) {
    return null;
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted format');
    }

    const [saltHex, ivHex, tagHex, encrypted] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const key = deriveKey(ENCRYPTION_KEY, salt);
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    const logger = require('./logger');
    logger.error('Failed to decrypt API key:', error);
    throw new Error('Decryption failed');
  }
}

module.exports = {
  encryptApiKey,
  decryptApiKey
};
