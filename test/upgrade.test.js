import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeVersion, isNewer, findInstallerAsset, findShaAsset, sha256, checkSha256 } from '../lib/upgrade.js'

test('normalizeVersion：去掉前导 v 并去空白', () => {
  assert.equal(normalizeVersion('v0.6.0'), '0.6.0')
  assert.equal(normalizeVersion(' 0.6.1 '), '0.6.1')
  assert.equal(normalizeVersion('0.6.0'), '0.6.0')
})

test('isNewer：数字段比较（语义化版本）', () => {
  assert.equal(isNewer('0.6.0', '0.5.0'), true)
  assert.equal(isNewer('0.5.0', '0.6.0'), false)
  assert.equal(isNewer('0.6.0', '0.6.0'), false)
  assert.equal(isNewer('0.10.0', '0.9.0'), true, '10>9 应为数字比较')
  assert.equal(isNewer('1.0.0', '0.9.9'), true)
  assert.equal(isNewer('0.6.1', '0.6.0'), true, 'patch 也更新')
})

test('findInstallerAsset / findShaAsset：按版本找自包含安装器与校验文件', () => {
  const assets = [
    { name: 'myco-install-0.5.0.sh', url: 'https://x/0.5' },
    { name: 'myco-install-0.6.0.sh', url: 'https://x/0.6' },
    { name: 'myco-install-0.6.0.sh.sha256', url: 'https://x/0.6.sha' },
  ]
  assert.ok(findInstallerAsset(assets, '0.6.0'))
  assert.equal(findInstallerAsset(assets, '0.6.0').url, 'https://x/0.6')
  assert.equal(findInstallerAsset(assets, '0.7.0'), null)
  assert.ok(findShaAsset(assets, '0.6.0'))
  assert.equal(findShaAsset(assets, '0.6.0').url, 'https://x/0.6.sha')
  assert.equal(findShaAsset(assets, '0.6.0').name, 'myco-install-0.6.0.sh.sha256')
})

test('sha256 校验：正确通过，错误拒绝', () => {
  const buf = Buffer.from('hello myco')
  const h = sha256(buf)
  assert.equal(checkSha256(buf, h), true)
  assert.equal(checkSha256(buf, 'deadbeef'), false)
  // 允许带换行的 .sha256 文本（形如 "<hex>  文件名"）
  assert.equal(checkSha256(buf, `${h}  myco-install-0.6.0.sh\n`), true)
})
