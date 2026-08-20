import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCloudRoot } from '../lib/core/sync.js'

test('normalizeCloudRoot：字符串旧格式（仅 path，不可 sync）', () => {
  const root = normalizeCloudRoot({ spec: 'cloud:demo' }, { cloudRoots: { demo: '/tmp/x' } })
  assert.equal(root.name, 'demo')
  assert.equal(root.path, '/tmp/x')
  assert.equal(root.url, '')
  assert.equal(root.synced, false)
})

test('normalizeCloudRoot：对象格式（url/path/branch）', () => {
  const root = normalizeCloudRoot({ spec: 'cloud:demo' }, {
    cloudRoots: { demo: { url: 'git@x:y.git', path: '/tmp/x', branch: 'main' } },
  })
  assert.equal(root.url, 'git@x:y.git')
  assert.equal(root.branch, 'main')
  assert.equal(root.synced, true)
})

test('normalizeCloudRoot：缺省 branch 为 main，缺省 url 不可 sync', () => {
  const root = normalizeCloudRoot({ spec: 'cloud:demo' }, { cloudRoots: { demo: { path: '/tmp/x' } } })
  assert.equal(root.branch, 'main')
  assert.equal(root.synced, false)
})
