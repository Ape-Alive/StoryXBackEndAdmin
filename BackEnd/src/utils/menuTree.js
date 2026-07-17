const { ROOT_PARENT_ID } = require('../constants/menuManagement')

function serializeButton(button) {
  if (!button) return button
  return {
    id: button.id,
    menuId: button.menuId,
    name: button.name,
    i18nNames: button.i18nNames || [],
    isVisible: button.isVisible,
    isDisabled: button.isDisabled,
    frontendPermissionCode: button.frontendPermissionCode,
    backendPermissionCode: button.backendPermissionCode,
    sortOrder: button.sortOrder,
    createdAt: button.createdAt,
    updatedAt: button.updatedAt,
  }
}

function serializeMenu(menu, { includeButtons = true } = {}) {
  if (!menu) return menu
  const result = {
    id: menu.id,
    name: menu.name,
    i18nNames: menu.i18nNames || [],
    path: menu.path,
    frontendPermissionCode: menu.frontendPermissionCode,
    backendPermissionCode: menu.backendPermissionCode,
    parentId: menu.parentId,
    sortOrder: menu.sortOrder,
    createdAt: menu.createdAt,
    updatedAt: menu.updatedAt,
  }
  if (includeButtons && menu.buttons) {
    result.buttons = menu.buttons.map(serializeButton)
  }
  return result
}

function buildMenuTree(flatMenus, parentId = ROOT_PARENT_ID) {
  return flatMenus
    .filter(menu => menu.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || new Date(a.createdAt) - new Date(b.createdAt))
    .map(menu => {
      const serialized = serializeMenu(menu)
      return {
        ...serialized,
        children: buildMenuTree(flatMenus, menu.id),
      }
    })
}

function menuMatchesKeyword(menu, keyword) {
  const kw = keyword.toLowerCase()
  if (menu.name.toLowerCase().includes(kw)) return true
  const i18nNames = Array.isArray(menu.i18nNames) ? menu.i18nNames : []
  return i18nNames.some(item => {
    const label = item?.label ?? item?.name
    return label && String(label).toLowerCase().includes(kw)
  })
}

function filterMenuTree(tree, keyword) {
  if (!keyword) return tree
  const kw = keyword.trim()
  if (!kw) return tree

  const filterNodes = nodes =>
    nodes.reduce((acc, node) => {
      const children = node.children ? filterNodes(node.children) : []
      if (menuMatchesKeyword(node, kw) || children.length > 0) {
        acc.push({ ...node, children })
      }
      return acc
    }, [])

  return filterNodes(tree)
}

function collectDescendantIds(flatMenus, parentId) {
  const children = flatMenus.filter(menu => menu.parentId === parentId)
  return children.reduce((acc, child) => {
    acc.push(child.id)
    acc.push(...collectDescendantIds(flatMenus, child.id))
    return acc
  }, [])
}

module.exports = {
  serializeButton,
  serializeMenu,
  buildMenuTree,
  filterMenuTree,
  collectDescendantIds,
}
