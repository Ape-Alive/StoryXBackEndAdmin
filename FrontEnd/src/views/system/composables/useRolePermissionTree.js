export function collectDescendantIds(node) {
  const ids = [node.id]
  ;(node.children || []).forEach(child => {
    ids.push(...collectDescendantIds(child))
  })
  return ids
}

export function getMenuCheckState(node, checkedMenuIds) {
  const allIds = collectDescendantIds(node)
  const checkedCount = allIds.filter(id => checkedMenuIds.has(id)).length
  if (checkedCount === 0) {
    return { checked: false, indeterminate: false }
  }
  if (checkedCount === allIds.length) {
    return { checked: true, indeterminate: false }
  }
  return { checked: false, indeterminate: true }
}

export function collectAncestorIds(menuId, flatMenus, rootParentId = '0') {
  const menuMap = new Map(flatMenus.map(menu => [menu.id, menu]))
  const ids = []
  let current = menuMap.get(menuId)

  while (current?.parentId && current.parentId !== rootParentId) {
    const parent = menuMap.get(current.parentId)
    if (!parent) break
    ids.push(parent.id)
    current = parent
  }

  return ids
}

export function hasCheckedInSubtree(node, checkedMenuIds) {
  if (checkedMenuIds.has(node.id)) return true
  return (node.children || []).some(child => hasCheckedInSubtree(child, checkedMenuIds))
}

export function collectButtonIdsForMenus(menuIds, flatMenus) {
  const menuMap = new Map(flatMenus.map(menu => [menu.id, menu]))
  const buttonIds = []
  menuIds.forEach(menuId => {
    menuMap.get(menuId)?.buttons?.forEach(button => buttonIds.push(button.id))
  })
  return buttonIds
}

export function sanitizeButtonIds(checkedMenuIds, checkedButtonIds, flatMenus) {
  const allowedButtonIds = new Set(collectButtonIdsForMenus([...checkedMenuIds], flatMenus))
  return new Set([...checkedButtonIds].filter(id => allowedButtonIds.has(id)))
}
