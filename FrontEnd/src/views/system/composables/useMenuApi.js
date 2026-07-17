import * as backendMenuApi from '@/api/backendMenu'
import * as clientMenuApi from '@/api/clientMenu'

const API_MAP = {
  backend: {
    getMeta: backendMenuApi.getBackendMenuMeta,
    getTree: backendMenuApi.getBackendMenuTree,
    getById: backendMenuApi.getBackendMenuById,
    createMenu: backendMenuApi.createBackendMenu,
    updateMenu: backendMenuApi.updateBackendMenu,
    deleteMenu: backendMenuApi.deleteBackendMenu,
    listButtons: backendMenuApi.getBackendMenuButtons,
    createButton: backendMenuApi.createBackendMenuButton,
    updateButton: backendMenuApi.updateBackendMenuButton,
    deleteButton: backendMenuApi.deleteBackendMenuButton,
  },
  client: {
    getMeta: clientMenuApi.getClientMenuMeta,
    getTree: clientMenuApi.getClientMenuTree,
    getById: clientMenuApi.getClientMenuById,
    createMenu: clientMenuApi.createClientMenu,
    updateMenu: clientMenuApi.updateClientMenu,
    deleteMenu: clientMenuApi.deleteClientMenu,
    listButtons: clientMenuApi.getClientMenuButtons,
    createButton: clientMenuApi.createClientMenuButton,
    updateButton: clientMenuApi.updateClientMenuButton,
    deleteButton: clientMenuApi.deleteClientMenuButton,
  },
}

export function useMenuApi(menuType) {
  return API_MAP[menuType]
}

export function flattenMenuTree(tree, result = []) {
  tree.forEach(node => {
    result.push(node)
    if (node.children?.length) {
      flattenMenuTree(node.children, result)
    }
  })
  return result
}

export const REQUIRED_LANGUAGE = 'zh'

export function createEmptyI18nNames() {
  return [{ language: REQUIRED_LANGUAGE, label: '' }]
}

export function defaultMenuForm() {
  return {
    id: null,
    name: '',
    i18nNames: createEmptyI18nNames(),
    path: '',
    frontendPermissionCode: '',
    backendPermissionCode: '',
    parentId: '0',
    sortOrder: 0,
  }
}

export function defaultButtonForm() {
  return {
    id: null,
    menuId: null,
    name: '',
    i18nNames: createEmptyI18nNames(),
    isVisible: true,
    isDisabled: false,
    frontendPermissionCode: '',
    backendPermissionCode: '',
    sortOrder: 0,
  }
}

export function validateI18nNamesRequired(i18nNames) {
  const zhItem = (i18nNames || []).find(item => {
    const language = item.language || (item.locale === 'zh-CN' ? 'zh' : item.locale)
    return language === REQUIRED_LANGUAGE
  })
  const label = zhItem?.label ?? zhItem?.name
  return Boolean(label?.trim())
}
