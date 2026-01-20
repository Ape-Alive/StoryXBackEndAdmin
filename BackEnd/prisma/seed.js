const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 创建默认超级管理员
  const hashedPassword = await bcrypt.hash('admin123456', 10);

  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'super_admin',
      status: 'active'
    }
  });

  console.log('✅ 默认超级管理员已创建:', admin.username);
  console.log('   用户名: admin');
  console.log('   密码: admin123456');
  console.log('   邮箱: admin@example.com');
  console.log('   角色: super_admin');

  console.log('\n数据库初始化完成！');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
