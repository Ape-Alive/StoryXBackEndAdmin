/**
 * C 端 API 与客户端菜单权限码映射（frontendPermissionCode）
 */

const CLIENT_MENU = key => `CLIENT_MENU_${String(key).replace(/-/g, '_').toUpperCase()}_VIEW`

const AI_INVOKE = [
  CLIENT_MENU('text-source'),
  CLIENT_MENU('production-base-settings'),
  CLIENT_MENU('script-structure'),
  CLIENT_MENU('character-modeling'),
  CLIENT_MENU('audio-video'),
  CLIENT_MENU('draw-canvas'),
  CLIENT_MENU('intelligent-voice'),
]

const RESOURCE_READ = [
  CLIENT_MENU('production-base-settings'),
  CLIENT_MENU('character-modeling'),
  CLIENT_MENU('audio-video'),
  CLIENT_MENU('script-structure'),
]

const API_KEY_MANAGE = [CLIENT_MENU('global-config')]

const VOICE_PROFILE_WRITE = [CLIENT_MENU('intelligent-voice')]

module.exports = {
  CLIENT_API_PERMISSIONS: {
    AI_INVOKE,
    RESOURCE_READ,
    API_KEY_MANAGE,
    VOICE_PROFILE_WRITE,
  },
}
