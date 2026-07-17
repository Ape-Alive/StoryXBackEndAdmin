#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config()
const { generateKeyPairPem } = require('../src/utils/otaSigning')

const keys = generateKeyPairPem()
console.log('=== OTA Ed25519 Signing Keys ===')
console.log('\n# Add to StoryXBackEndAdmin BackEnd/.env:')
console.log(`OTA_SIGNING_PRIVATE_KEY="${keys.privateKey.trim().replace(/\n/g, '\\n')}"`)
console.log(`OTA_SIGNING_PUBLIC_KEY="${keys.publicKey.trim().replace(/\n/g, '\\n')}"`)
console.log('\n# Add to StoryX BackEnd/.env (electron):')
console.log(`OTA_SIGNING_PUBLIC_KEY="${keys.publicKey.trim().replace(/\n/g, '\\n')}"`)
