const { PrismaClient } = require('@prisma/client');

// Prisma 客户端实例（单例模式）
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
}

// 优雅关闭
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
