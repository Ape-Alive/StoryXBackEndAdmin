/* eslint-disable no-console */
require('dotenv').config()
const prisma = require('../src/config/database')
const { CLIENT_ROLE_SEEDS } = require('../src/seeds/clientRole.data')

async function main() {
  for (const role of CLIENT_ROLE_SEEDS) {
    await prisma.clientRole.upsert({
      where: { roleKey: role.roleKey },
      create: role,
      update: {
        name: role.name,
        description: role.description,
        sortOrder: role.sortOrder,
        priority: role.priority,
        status: 'active',
      },
    })
  }
  console.log(`✅ 客户端角色种子数据已填充 ${CLIENT_ROLE_SEEDS.length} 条`)
}

main()
  .catch(err => {
    console.error('❌ 客户端角色种子填充失败:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
