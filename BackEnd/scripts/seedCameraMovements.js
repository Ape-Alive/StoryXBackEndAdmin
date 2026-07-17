/* eslint-disable no-console */
require('dotenv').config()
const prisma = require('../src/config/database')
const officialItems = require('../src/seeds/cameraMovementOfficial.data')

async function main() {
  for (const item of officialItems) {
    await prisma.cameraMovementItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        movementKey: item.key,
        name: item.name,
        tagLabel: item.tagLabel,
        prompt: item.prompt,
        previewUrl: item.previewUrl,
        type: item.type,
        isActive: true,
        sortOrder: item.sortOrder,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      },
      update: {
        movementKey: item.key,
        name: item.name,
        tagLabel: item.tagLabel,
        prompt: item.prompt,
        previewUrl: item.previewUrl,
        type: item.type,
        isActive: true,
        sortOrder: item.sortOrder,
        updatedAt: new Date(item.updatedAt),
      },
    })
  }
  console.log(`Seeded ${officialItems.length} official camera movement items`)
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
