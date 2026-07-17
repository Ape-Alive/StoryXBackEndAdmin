#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const axios = require('axios')

function resolveApiBase() {
  let base = (process.env.API_BASE_URL || process.env.TEST_API_BASE || 'http://127.0.0.1:5800/api').replace(/\/$/, '')
  if (!base.endsWith('/api')) base = `${base}/api`
  return base
}

const BASE = resolveApiBase()

async function testCheck() {
  console.log('\n[1] POST /ota/check')
  const res = await axios.post(`${BASE}/ota/check`, {
    platform: 'darwin',
    arch: 'arm64',
    channel: 'stable',
    deviceId: 'e2e-test-device',
    current: {
      shell: { version: '1.0.0', buildNumber: 1000 },
      backend: { version: '1.0.0', buildNumber: 1000, baseBuild: 1000 },
      frontend: { version: '1.0.0', buildNumber: 1000 },
    },
  })
  console.log('  status:', res.status, 'updates:', Object.keys(res.data?.data?.updates || {}))
  return res.data
}

async function testReport() {
  console.log('\n[2] POST /ota/report')
  const res = await axios.post(`${BASE}/ota/report`, {
    deviceId: 'e2e-test-device',
    event: 'check',
    platform: 'darwin-arm64',
    channel: 'stable',
  })
  console.log('  status:', res.status, 'id:', res.data?.data?.id)
  return res.data
}

async function testRateLimit() {
  console.log('\n[3] Rate limit smoke (65 requests)')
  let limited = 0
  for (let i = 0; i < 65; i += 1) {
    try {
      await axios.post(`${BASE}/ota/check`, {
        deviceId: 'rate-limit-device',
        platform: 'darwin',
        arch: 'arm64',
        current: { shell: { buildNumber: 1000 }, backend: { buildNumber: 1000 }, frontend: { buildNumber: 1000 } },
      })
    } catch (e) {
      if (e.response?.status === 429) limited += 1
    }
  }
  console.log('  429 count:', limited, limited > 0 ? 'OK' : 'WARN (limit may be disabled in test env)')
}

async function testHealth() {
  console.log('\n[0] GET /health')
  const res = await axios.get(`${BASE.replace(/\/api$/, '')}/health`)
  console.log('  status:', res.status, res.data?.status)
}

async function main() {
  console.log('OTA E2E against', BASE)
  await testHealth()
  await testCheck()
  await testReport()
  await testRateLimit()
  console.log('\n✅ OTA E2E completed')
}

main().catch(err => {
  console.error('\n❌ OTA E2E failed:', err.response?.data || err.message)
  process.exit(1)
})
