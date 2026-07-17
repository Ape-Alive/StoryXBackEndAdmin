/* eslint-disable no-console */
require('dotenv').config()
const prisma = require('../src/config/database')
const { flattenBackendMenus } = require('../src/seeds/backendMenu.data')
const { flattenClientMenus } = require('../src/seeds/clientMenu.data')

async function clearMenus() {
  await prisma.backendMenuButton.deleteMany()
  await prisma.clientMenuButton.deleteMany()
  await prisma.backendMenu.deleteMany()
  await prisma.clientMenu.deleteMany()
}

async function seedBackendMenus() {
  const menus = flattenBackendMenus()
  for (const menu of menus) {
    await prisma.backendMenu.upsert({
      where: { id: menu.id },
      create: menu,
      update: {
        name: menu.name,
        i18nNames: menu.i18nNames,
        path: menu.path,
        frontendPermissionCode: menu.frontendPermissionCode,
        backendPermissionCode: menu.backendPermissionCode,
        parentId: menu.parentId,
        sortOrder: menu.sortOrder,
      },
    })
  }
  return menus.length
}

async function seedClientMenus() {
  const menus = flattenClientMenus()
  for (const menu of menus) {
    await prisma.clientMenu.upsert({
      where: { id: menu.id },
      create: menu,
      update: {
        name: menu.name,
        i18nNames: menu.i18nNames,
        path: menu.path,
        frontendPermissionCode: menu.frontendPermissionCode,
        backendPermissionCode: menu.backendPermissionCode,
        parentId: menu.parentId,
        sortOrder: menu.sortOrder,
      },
    })
  }
  return menus.length
}

async function main() {
  console.log('开始填充菜单数据...')
  await clearMenus()

  const backendCount = await seedBackendMenus()
  const clientCount = await seedClientMenus()

  console.log(`✅ 后台菜单已填充 ${backendCount} 条（含 OTA 发布管理）`)
  console.log(`✅ 客户端菜单已填充 ${clientCount} 条（4 个分组 + 16 个页面）`)
}

main()
  .catch(err => {
    console.error('❌ 菜单种子数据填充失败:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
