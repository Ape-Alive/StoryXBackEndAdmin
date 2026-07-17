/* eslint-disable no-console */
require('dotenv').config()
const prisma = require('../src/config/database')
const { BACKEND_ROLE_SEEDS } = require('../src/seeds/backendRole.data')

async function main() {
  for (const role of BACKEND_ROLE_SEEDS) {
    await prisma.backendRole.upsert({
      where: { roleKey: role.roleKey },
      create: role,
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        sortOrder: role.sortOrder,
        status: 'active',
      },
    })
  }
  console.log(`✅ 后台角色种子数据已填充 ${BACKEND_ROLE_SEEDS.length} 条`)
}

main()
  .catch(err => {
    console.error('❌ 后台角色种子填充失败:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
