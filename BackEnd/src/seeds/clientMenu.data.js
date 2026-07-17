/**
 * 客户端前端菜单种子数据
 * 来源：StoryX/FrontEnd/src/components/Sidebar.vue
 */

function zh(label) {
  return [{ language: 'zh', label }]
}

function permCodes(key) {
  const code = `CLIENT_MENU_${key.replace(/-/g, '_').toUpperCase()}`
  return {
    frontendPermissionCode: `${code}_VIEW`,
    backendPermissionCode: `${code}_MANAGE`,
  }
}

const CLIENT_MENU_GROUPS = [
  {
    id: 'cm-group-creation-process',
    name: '创作流程',
    path: '/menu-group/creation-process',
    sortOrder: 10,
    children: [
      { id: 'cm-text-source', key: 'text-source', name: '内容中心', path: '/project/text-source', sortOrder: 10 },
      {
        id: 'cm-production-base-settings',
        key: 'production-base-settings',
        name: '生产基础设定',
        path: '/project/production-base-settings',
        sortOrder: 20,
      },
      {
        id: 'cm-script-structure',
        key: 'script-structure',
        name: '内容结构化',
        path: '/project/script-structure',
        sortOrder: 30,
      },
      {
        id: 'cm-character-modeling',
        key: 'character-modeling',
        name: '资产建模',
        path: '/project/character-modeling',
        sortOrder: 40,
      },
      { id: 'cm-audio-video', key: 'audio-video', name: '音视频生成', path: '/project/audio-video', sortOrder: 50 },
    ],
  },
  {
    id: 'cm-group-creation-tools',
    name: '创作工具',
    path: '/menu-group/creation-tools',
    sortOrder: 20,
    children: [
      { id: 'cm-draw-canvas', key: 'draw-canvas', name: 'AI 画布', path: '/project/draw-canvas', sortOrder: 10 },
      {
        id: 'cm-intelligent-voice',
        key: 'intelligent-voice',
        name: '智能语音',
        path: '/project/intelligent-voice',
        sortOrder: 20,
      },
    ],
  },
  {
    id: 'cm-group-project-management',
    name: '项目管理',
    path: '/menu-group/project-management',
    sortOrder: 30,
    children: [
      { id: 'cm-project-config', key: 'project-config', name: '项目配置', path: '/project/project-config', sortOrder: 10 },
      { id: 'cm-project-assets', key: 'project-assets', name: '素材库', path: '/project/assets', sortOrder: 20 },
      { id: 'cm-project-props', key: 'project-props', name: '道具库', path: '/project/props', sortOrder: 30 },
      { id: 'cm-project-costumes', key: 'project-costumes', name: '服饰库', path: '/project/costumes', sortOrder: 40 },
    ],
  },
  {
    id: 'cm-group-global',
    name: '全局导航',
    path: '/menu-group/global',
    sortOrder: 40,
    children: [
      { id: 'cm-dashboard', key: 'dashboard', name: '项目看板', path: '/', sortOrder: 10 },
      { id: 'cm-global-assets', key: 'global-assets', name: '全局素材', path: '/assets', sortOrder: 20 },
      { id: 'cm-global-config', key: 'global-config', name: '全局配置', path: '/global-config', sortOrder: 30 },
      {
        id: 'cm-browser-automation',
        key: 'browser-automation',
        name: '浏览器自动化',
        path: '/browser-automation',
        sortOrder: 40,
      },
      { id: 'cm-profile', key: 'profile', name: '个人中心', path: '/profile', sortOrder: 50 },
    ],
  },
]

function flattenClientMenus() {
  const menus = []
  for (const group of CLIENT_MENU_GROUPS) {
    const groupPerms = permCodes(group.id.replace('cm-group-', ''))
    menus.push({
      id: group.id,
      name: group.name,
      i18nNames: zh(group.name),
      path: group.path,
      parentId: '0',
      sortOrder: group.sortOrder,
      ...groupPerms,
    })
    for (const child of group.children) {
      menus.push({
        id: child.id,
        name: child.name,
        i18nNames: zh(child.name),
        path: child.path,
        parentId: group.id,
        sortOrder: child.sortOrder,
        ...permCodes(child.key),
      })
    }
  }
  return menus
}

module.exports = {
  CLIENT_MENU_GROUPS,
  flattenClientMenus,
}
