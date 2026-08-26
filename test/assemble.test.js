import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { tokenize, normalizeTaskCtx } from '../lib/core/taskctx.js'
import { assemble, matchProfile } from '../lib/core/assemble.js'
import { buildIndex } from '../lib/core/indexer.js'

// 构造一个可直接喂给装配引擎的 index + packages 夹具（引擎无关文件系统）
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'myco-asmb-'))
  const apiDir = join(root, 'api-gateway')
  const dataDir = join(root, 'data-factory')
  const otherDir = join(root, 'other-kb')
  for (const d of [apiDir, dataDir, otherDir]) mkdirSync(d, { recursive: true })

  writeFileSync(join(apiDir, 'api-gateway.md'), '---\ntags: [网关, 部署]\n---\nAPI 网关生产环境部署与联调步骤。')
  writeFileSync(join(apiDir, 'webhook.md'), '---\ntags: [网关]\n---\n网关 webhook 配置。')
  writeFileSync(join(dataDir, 'analytics.md'), '---\ntags: [指标]\n---\n互动率与曝光量指标口径。')
  writeFileSync(join(otherDir, 'unrelated.md'), '---\ntags: [随笔]\n---\n无关内容。')

  const packages = [
    { id: 'api-gateway', name: 'API 网关', scope: 'repo', path: apiDir, version: '0.1.0', state: 'evergreen', dependencies: [], whenToUse: '配置与部署 API 网关（生产环境）' },
    { id: 'data-factory', name: '数据工厂', scope: 'repo', path: dataDir, version: '0.1.0', state: 'evergreen', dependencies: [], whenToUse: '指标口径与数据分析' },
    { id: 'other-kb', name: '其他', scope: 'repo', path: otherDir, version: '0.1.0', state: 'evergreen', dependencies: [], whenToUse: '随笔记录' },
  ]
  const index = buildIndex(packages.map((p) => ({ id: p.id, path: p.path })))
  return { root, packages, index }
}

test('tokenize：ASCII 词 + CJK 串与二元组，去停用词', () => {
  const tokens = tokenize('配置 API 网关生产步骤')
  assert.ok(tokens.includes('api'), '应含 ASCII 词 api')
  assert.ok(tokens.includes('网关'), '应含 CJK 整段/二元组 网关')
  assert.ok(tokens.includes('生产'), '应含 CJK 二元组 生产')
  assert.ok(tokens.includes('步骤'), '应含 CJK 二元组 步骤')
})

test('matchProfile：目标维度命中 profile', () => {
  const profiles = [
    { name: 'dev', include: ['api-gateway'], match: { 目标: ['开发', '调试'] } },
  ]
  const ctx = normalizeTaskCtx({ goal: '开发 api 网关联调' })
  const r = matchProfile(ctx, profiles)
  assert.equal(r.mode, 'matched')
  assert.equal(r.profile.name, 'dev')
})

test('matchProfile：无命中回退默认', () => {
  const profiles = [{ name: 'dev', include: ['api-gateway'], match: { 目标: ['开发'] } }]
  const r = matchProfile(normalizeTaskCtx({ goal: '写散文' }), profiles)
  assert.equal(r.mode, 'fallback-default')
  assert.equal(r.profile, null)
})

test('assemble：按任务软匹配命中 api-gateway 子集，含打分与范围', () => {
  const { packages, index } = fixture()
  const r = assemble({ index, packages, profiles: [] }, { goal: '配置 API 网关生产步骤' })
  assert.notEqual(r.mode, 'fallback-default')
  assert.equal(r.packages[0].id, 'api-gateway', '应优先命中 api-gateway')
  assert.ok(r.packages[0].score > 0)
  // 推荐文档应落在 api-gateway 包
  assert.ok(r.documents.some((d) => d.packageId === 'api-gateway'))
  // 工具掩码：基础工具保留、被裁包列出
  assert.ok(r.toolMask.keep.includes('myco_find'))
  assert.ok(!r.toolMask.pruned.includes('api-gateway'), '命中包不应被裁')
  // lockfile 可复现
  assert.equal(r.lockfile.mode, r.mode)
  assert.ok(r.lockfile.packages.length > 0)
})

test('assemble：命中为空回退默认（全量包、不裁剪）', () => {
  const { packages, index } = fixture()
  const r = assemble({ index, packages, profiles: [] }, { goal: '与知识库无关的英文散文' })
  assert.equal(r.mode, 'fallback-default')
  assert.equal(r.packages.length, packages.length, '回退应含全部包')
  assert.equal(r.toolMask.pruned.length, 0, '回退不裁剪')
})

test('assemble：命中 profile 后在其 include 子集内软匹配', () => {
  const { packages, index } = fixture()
  const profiles = [{ name: 'dev', include: ['api-gateway'], match: { 目标: ['开发'] } }]
  const r = assemble({ index, packages, profiles }, { goal: '开发 api 网关' })
  assert.equal(r.profile.name, 'dev')
  // include 只留 api-gateway，软匹配都落在该包
  assert.ok(r.packages.every((p) => p.id === 'api-gateway'))
})

// ---- Myco.assemble 集成：写 lockfile ----
async function makeMyco() {
  const { Myco } = await import('../lib/core/myco.js')
  const dataDir = mkdtempSync(join(tmpdir(), 'myco-asmb2-'))
  const kb = join(tmpdir(), 'myco-asmb-kb-' + Date.now())
  const myco = new Myco({ dataDir })
  mkdirSync(kb, { recursive: true })
  writeFileSync(join(kb, 'kb.yaml'), '# kb\nid: demo-kb\nname: 演示\nscope: repo\nversion: 0.1.0\nstate: evergreen\nwhenToUse: 部署与演示 api 网关\n')
  writeFileSync(join(kb, 'deploy.md'), '---\ntags: [网关]\n---\nAPI 网关部署。')
  myco.addMount(`repo:${kb}`)
  myco.reindex()
  return { myco, dataDir }
}

test('Myco.assemble：集成 + 写可复现 lockfile', async () => {
  const { myco, dataDir } = await makeMyco()
  const r = myco.assemble('配置 api 网关部署')
  assert.ok(r.packages.some((p) => p.id === 'demo-kb'))
  const written = myco.lastAssemble()
  assert.ok(written, '应写入并读回 lockfile')
  assert.equal(written.goal, '配置 api 网关部署')
  assert.ok(written.packages.some((p) => p.id === 'demo-kb'))
})
