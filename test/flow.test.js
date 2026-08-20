import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { extractContractRefs, parseContracts, classifyBump } from '../lib/core/contract.js'
import { buildChangeEvent, contractDiff, hashContent } from '../lib/core/events.js'
import { buildContractIndex, analyzeImpact } from '../lib/core/impact.js'
import { MycoStore } from '../lib/core/store.js'
import { buildIndex } from '../lib/core/indexer.js'

test('parseContracts：Obsidian callout 契约块', () => {
  const md = [
    '# 指标口径',
    '',
    '> [!myco-contract] interaction-rate v3',
    '> 互动率 = 互动量 / 曝光量（窗口内聚合，不按天累加）',
    '> 第二行',
    '',
    '普通内容',
  ].join('\n')
  const contracts = parseContracts(md)
  assert.equal(contracts.length, 1)
  assert.equal(contracts[0].id, 'interaction-rate')
  assert.equal(contracts[0].version, 3)
  assert.ok(contracts[0].content.includes('互动率 = 互动量 / 曝光量'))
  assert.ok(contracts[0].content.includes('第二行'))
})

test('parseContracts：无版本号默认 v1', () => {
  const contracts = parseContracts('> [!myco-contract] foo\n> 内容')
  assert.equal(contracts[0].version, 1)
})

test('extractContractRefs：锚点命中已知契约才是强引用', () => {
  const text = '见 [[数据指标口径#interaction-rate]] 和 [[其他页]] 与 [[页#普通锚点]]'
  const refs = extractContractRefs(text, new Set(['interaction-rate']))
  assert.equal(refs.length, 1)
  assert.equal(refs[0].target, '数据指标口径')
  assert.equal(refs[0].contractId, 'interaction-rate')
})

test('classifyBump：新文件 minor / 契约变更 major / 内容变更 patch', () => {
  assert.equal(classifyBump({ contractChanged: false, isNew: true }), 'minor')
  assert.equal(classifyBump({ contractChanged: true, isNew: false }), 'major')
  assert.equal(classifyBump({ contractChanged: false, isNew: false }), 'patch')
})

test('buildChangeEvent：首次扫描建立基线，变更含 bump', () => {
  const text = '> [!myco-contract] c1 v1\n> 内容'
  // 首次扫描 = 基线，不产生事件
  const baseline = buildChangeEvent({ packageId: 'p', rel: 'a.md', text, prevHash: undefined })
  assert.equal(baseline, null)
  // 有旧 hash 且内容变 → 契约变更 = major
  const evt = buildChangeEvent({ packageId: 'p', rel: 'a.md', text, prevHash: 'oldhash' })
  assert.equal(evt.bump, 'major')
  assert.equal(evt.kind, 'contract-change')
  assert.equal(evt.contractId, 'c1')
  // 内容未变 → null
  const same = buildChangeEvent({ packageId: 'p', rel: 'a.md', text, prevHash: evt.after })
  assert.equal(same, null)
})

test('contractDiff：新增/删除/变更契约', () => {
  const before = '> [!myco-contract] a v1\n> x\n\n> [!myco-contract] b v1\n> y'
  const after = '> [!myco-contract] a v2\n> x 新\n\n> [!myco-contract] c v1\n> z'
  const d = contractDiff(before, after)
  assert.equal(d.added.length, 1)
  assert.equal(d.added[0].id, 'c')
  assert.equal(d.removed.length, 1)
  assert.equal(d.removed[0].id, 'b')
  assert.equal(d.changed.length, 1)
  assert.equal(d.changed[0].before.version, 1)
  assert.equal(d.changed[0].after.version, 2)
})

test('analyzeImpact：同包=染色，跨包=传播，依赖=包传播', () => {
  const dir = mkdtempSync(join(tmpdir(), 'myco-flow-'))
  const pkgA = join(dir, 'A')
  const pkgB = join(dir, 'B')
  mkdirSync(pkgA)
  mkdirSync(pkgB)
  // A 拥有契约 interaction-rate，A 的派生页引用它（染色）
  writeFileSync(join(pkgA, 'contract.md'), '> [!myco-contract] interaction-rate v1\n> 互动率定义')
  writeFileSync(join(pkgA, 'derived.md'), '见 [[contract#interaction-rate]]（派生）')
  // B 引用 A 的契约（传播）
  writeFileSync(join(pkgB, 'consumer.md'), '见 [[contract#interaction-rate]]（下游）')

  const index = buildIndex([{ id: 'A', path: pkgA }, { id: 'B', path: pkgB }])
  const packages = [
    { id: 'A', dependencies: [] },
    { id: 'B', dependencies: ['A'] },
  ]
  const event = { packageId: 'A', rel: 'contract.md', contractId: 'interaction-rate', bump: 'major' }
  const result = analyzeImpact(index, packages, event)

  assert.equal(result.dye.length, 1)
  assert.equal(result.dye[0].packageId, 'A')
  assert.equal(result.dye[0].rel, 'derived.md')
  assert.equal(result.spread.length, 1)
  assert.equal(result.spread[0].packageId, 'B')
  assert.equal(result.pkgSpread.length, 1)
  assert.equal(result.pkgSpread[0].packageId, 'B')
})

test('MycoStore：事件日志 append-only + stale 注册表', () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'myco-store-'))
  const store = new MycoStore(dataDir)
  const id = store.appendEvent({
    at: new Date().toISOString(), packageId: 'A', rel: 'a.md',
    kind: 'contract-change', contractId: 'c1', before: 'x', after: 'y', bump: 'major',
  })
  assert.ok(id > 0)
  const events = store.listEvents()
  assert.equal(events.length, 1)
  assert.equal(events[0].contractId, 'c1')

  store.markStale('B/consumer.md', { packageId: 'B', rel: 'consumer.md', reason: '契约变更', eventId: id })
  const stale = store.listStale()
  assert.equal(stale.length, 1)
  assert.equal(stale[0].node, 'B/consumer.md')
  store.clearStale('B/consumer.md')
  assert.equal(store.listStale().length, 0)
  store.close()
})
