/* eslint-disable no-console */
require('dotenv').config()
const prisma = require('../src/config/database')

const TYPE_TO_ROLE_KEY = {
  trial: 'software_trial_user',
  paid: 'package_paid_user',
  free: 'software_trial_user',
}

async function main() {
  const roles = await prisma.clientRole.findMany()
  const roleByKey = Object.fromEntries(roles.map(r => [r.roleKey, r.id]))

  const packages = await prisma.package.findMany({
    where: { clientRoleId: null },
  })

  let updated = 0
  for (const pkg of packages) {
    const roleKey = TYPE_TO_ROLE_KEY[pkg.type] || 'package_paid_user'
    const clientRoleId = roleByKey[roleKey]
    if (!clientRoleId) continue

    await prisma.package.update({
      where: { id: pkg.id },
      data: { clientRoleId },
    })
    updated += 1
  }

  console.log(`✅ 已为 ${updated} 个套餐回填 clientRoleId`)
}

main()
  .catch(err => {
    console.error('❌ 套餐 clientRoleId 回填失败:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
