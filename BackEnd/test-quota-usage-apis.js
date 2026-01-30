/**
 * 测试额度使用情况查询接口
 *
 * 使用方法：
 * 1. 确保后端服务已启动（npm run dev）
 * 2. 先登录获取 token，然后修改下面的 TOKEN
 * 3. 运行：node test-quota-usage-apis.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5800';
const TOKEN = 'YOUR_TOKEN_HERE'; // 请替换为实际的 token

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json'
};

// 测试函数
async function testAPI(name, method, url, params = null) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`测试: ${name}`);
    console.log(`${method} ${url}`);
    if (params) {
      console.log('参数:', JSON.stringify(params, null, 2));
    }
    console.log('-'.repeat(60));

    let response;
    if (method === 'GET') {
      response = await axios.get(url, { headers, params });
    } else if (method === 'POST') {
      response = await axios.post(url, params, { headers });
    }

    console.log('状态码:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    console.log('✅ 成功');
  } catch (error) {
    console.log('❌ 失败');
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('错误信息:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('错误:', error.message);
    }
  }
}

async function runTests() {
  console.log('\n🚀 开始测试额度使用情况查询接口\n');

  // 1. 获取额度列表
  await testAPI(
    '获取额度列表',
    'GET',
    `${BASE_URL}/api/quotas`,
    { page: 1, pageSize: 10 }
  );

  // 2. 获取用户的所有额度（需要替换 userId）
  const userId = 'USER_ID_HERE'; // 请替换为实际的用户ID
  await testAPI(
    '获取用户的所有额度',
    'GET',
    `${BASE_URL}/api/quotas/users/${userId}`
  );

  // 3. 获取用户额度详情
  await testAPI(
    '获取用户额度详情',
    'GET',
    `${BASE_URL}/api/quotas/users/${userId}/detail`
  );

  // 4. 获取额度统计信息
  await testAPI(
    '获取额度统计信息',
    'GET',
    `${BASE_URL}/api/quotas/statistics`
  );

  // 5. 获取额度流水列表
  await testAPI(
    '获取额度流水列表',
    'GET',
    `${BASE_URL}/api/quota-records`,
    { page: 1, pageSize: 10, type: 'decrease' }
  );

  // 6. 获取使用趋势统计（按日）
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // 最近30天

  await testAPI(
    '获取使用趋势统计（按日）',
    'GET',
    `${BASE_URL}/api/quotas/usage/trend`,
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      period: 'day'
    }
  );

  // 7. 获取使用趋势统计（按月）
  await testAPI(
    '获取使用趋势统计（按月）',
    'GET',
    `${BASE_URL}/api/quotas/usage/trend`,
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      period: 'month'
    }
  );

  // 8. 获取套餐使用排行
  await testAPI(
    '获取套餐使用排行',
    'GET',
    `${BASE_URL}/api/quotas/usage/package-ranking`,
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 10
    }
  );

  // 9. 获取用户使用排行
  await testAPI(
    '获取用户使用排行',
    'GET',
    `${BASE_URL}/api/quotas/usage/user-ranking`,
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 10
    }
  );

  // 10. 获取使用分布统计
  await testAPI(
    '获取使用分布统计',
    'GET',
    `${BASE_URL}/api/quotas/usage/distribution`
  );

  // 11. 获取用户详细使用统计
  await testAPI(
    '获取用户详细使用统计',
    'GET',
    `${BASE_URL}/api/quotas/users/${userId}/usage`,
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }
  );

  console.log('\n' + '='.repeat(60));
  console.log('✅ 所有测试完成');
  console.log('='.repeat(60) + '\n');
}

// 运行测试
if (TOKEN === 'YOUR_TOKEN_HERE') {
  console.log('⚠️  请先设置 TOKEN 和 userId');
  console.log('1. 登录获取 token');
  console.log('2. 修改脚本中的 TOKEN 和 userId');
  console.log('3. 重新运行脚本\n');
} else {
  runTests().catch(console.error);
}
