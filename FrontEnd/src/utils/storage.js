/**
 * 存储管理工具
 * 统一管理 localStorage 和 cookie 的存储操作
 */

// ==================== localStorage 操作 ====================

/**
 * 设置 localStorage
 * @param {string} key - 键名
 * @param {any} value - 值（会自动序列化为 JSON）
 * @param {number} expireDays - 过期天数（可选）
 */
export function setLocalStorage(key, value, expireDays = null) {
  try {
    const data = {
      value,
      timestamp: Date.now(),
      expireDays: expireDays || null
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error(`Failed to set localStorage key "${key}":`, error)
  }
}

/**
 * 获取 localStorage
 * @param {string} key - 键名
 * @param {any} defaultValue - 默认值（可选）
 * @returns {any} 存储的值，如果不存在或已过期则返回默认值
 */
export function getLocalStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key)
    if (!item) return defaultValue

    const data = JSON.parse(item)

    // 检查是否过期
    if (data.expireDays) {
      const expireTime = data.timestamp + data.expireDays * 24 * 60 * 60 * 1000
      if (Date.now() > expireTime) {
        localStorage.removeItem(key)
        return defaultValue
      }
    }

    return data.value
  } catch (error) {
    console.error(`Failed to get localStorage key "${key}":`, error)
    return defaultValue
  }
}

/**
 * 移除 localStorage
 * @param {string} key - 键名
 */
export function removeLocalStorage(key) {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Failed to remove localStorage key "${key}":`, error)
  }
}

/**
 * 清空所有 localStorage
 */
export function clearLocalStorage() {
  try {
    localStorage.clear()
  } catch (error) {
    console.error('Failed to clear localStorage:', error)
  }
}

// ==================== Cookie 操作 ====================

/**
 * 设置 Cookie
 * @param {string} key - 键名
 * @param {string} value - 值
 * @param {number} expireDays - 过期天数（可选，默认 7 天）
 * @param {object} options - 其他选项（path, domain, secure, sameSite）
 */
export function setCookie(key, value, expireDays = 7, options = {}) {
  try {
    const {
      path = '/',
      domain = '',
      secure = false,
      sameSite = 'Lax'
    } = options

    let expires = ''
    if (expireDays) {
      const date = new Date()
      date.setTime(date.getTime() + expireDays * 24 * 60 * 60 * 1000)
      expires = `; expires=${date.toUTCString()}`
    }

    const secureFlag = secure ? '; Secure' : ''
    const sameSiteFlag = sameSite ? `; SameSite=${sameSite}` : ''
    const domainFlag = domain ? `; Domain=${domain}` : ''

    document.cookie = `${key}=${encodeURIComponent(value)}${expires}; path=${path}${domainFlag}${secureFlag}${sameSiteFlag}`
  } catch (error) {
    console.error(`Failed to set cookie key "${key}":`, error)
  }
}

/**
 * 获取 Cookie
 * @param {string} key - 键名
 * @param {string} defaultValue - 默认值（可选）
 * @returns {string} Cookie 值，如果不存在则返回默认值
 */
export function getCookie(key, defaultValue = null) {
  try {
    const name = `${key}=`
    const decodedCookie = decodeURIComponent(document.cookie)
    const cookieArray = decodedCookie.split(';')

    for (let i = 0; i < cookieArray.length; i++) {
      let cookie = cookieArray[i]
      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1)
      }
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length, cookie.length)
      }
    }
    return defaultValue
  } catch (error) {
    console.error(`Failed to get cookie key "${key}":`, error)
    return defaultValue
  }
}

/**
 * 移除 Cookie
 * @param {string} key - 键名
 * @param {object} options - 选项（path, domain）
 */
export function removeCookie(key, options = {}) {
  try {
    const { path = '/', domain = '' } = options
    const domainFlag = domain ? `; Domain=${domain}` : ''
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}${domainFlag}`
  } catch (error) {
    console.error(`Failed to remove cookie key "${key}":`, error)
  }
}

// ==================== 统一存储接口 ====================

/**
 * 存储类型枚举
 */
export const StorageType = {
  LOCAL_STORAGE: 'localStorage',
  COOKIE: 'cookie'
}

/**
 * 统一设置存储
 * @param {string} key - 键名
 * @param {any} value - 值
 * @param {string} type - 存储类型（'localStorage' | 'cookie'）
 * @param {object} options - 选项（expireDays, path, domain, secure, sameSite）
 */
export function setStorage(key, value, type = StorageType.LOCAL_STORAGE, options = {}) {
  if (type === StorageType.LOCAL_STORAGE) {
    setLocalStorage(key, value, options.expireDays)
  } else if (type === StorageType.COOKIE) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    setCookie(key, stringValue, options.expireDays, {
      path: options.path,
      domain: options.domain,
      secure: options.secure,
      sameSite: options.sameSite
    })
  }
}

/**
 * 统一获取存储
 * @param {string} key - 键名
 * @param {any} defaultValue - 默认值
 * @param {string} type - 存储类型（'localStorage' | 'cookie'）
 * @returns {any} 存储的值
 */
export function getStorage(key, defaultValue = null, type = StorageType.LOCAL_STORAGE) {
  if (type === StorageType.LOCAL_STORAGE) {
    return getLocalStorage(key, defaultValue)
  } else if (type === StorageType.COOKIE) {
    const value = getCookie(key, null)
    if (value === null) return defaultValue
    try {
      // 尝试解析 JSON
      return JSON.parse(value)
    } catch {
      // 如果不是 JSON，直接返回字符串
      return value
    }
  }
  return defaultValue
}

/**
 * 统一移除存储
 * @param {string} key - 键名
 * @param {string} type - 存储类型（'localStorage' | 'cookie'）
 * @param {object} options - 选项（path, domain）
 */
export function removeStorage(key, type = StorageType.LOCAL_STORAGE, options = {}) {
  if (type === StorageType.LOCAL_STORAGE) {
    removeLocalStorage(key)
  } else if (type === StorageType.COOKIE) {
    removeCookie(key, options)
  }
}
