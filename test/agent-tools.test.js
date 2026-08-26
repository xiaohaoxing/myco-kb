import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { applyAgentTools, createScopedFindTool } from '../lib/tools.js'

// 构造一个两包知识库的 Myco 实例（temp data 目录）
async function makeMyco() {
  const { Myco } = await import('../lib/core/myco.js')
  const dataDir = mkdtempSync(join(tmpdir(), 'myco-agent-'))
  const myco = new Myco({ dataDir })
  const p1 = join(tmpdir(), 'myco-p1-' + Date.now())
  const p2 = join(tmpdir(), 'myco-p2-' + Date.now())
  for (const [dir, id, when, file, tag] of [
    [p1, 'api-gateway', '配置与部署 API 网关（生产环境）', 'deploy.md', '网关'],
    [p2, 'data-factory', '指标口径与数据分析', 'analytics.md', '指标'],
  ]) {
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'kb.yaml'), `id: ${id}\nname: ${id}\nscope: repo\nversion: 0.1.0\nstate: evergreen\nwhenToUse: ${when}\n`)
    writeFileSync(join(dir, file), `---\ntags: [${tag}]\n---\n内容 ${when}\n`)
    myco.addMount(`repo:${dir}`)
  }
  myco.reindex()
  return { myco, dataDir, p1, p2 }
}

test('findScoped：限定到指定知识包子集', async () => {
  const { myco } = await makeMyco()
  const all = myco.find('部署')
  assert.ok(all.length >= 1, '全库应命中部署')
  const scoped = myco.findScoped('部署', ['api-gateway'])
  assert.ok(scoped.length >= 1)
  assert.ok(scoped.every((r) => r.packageId === 'api-gateway'), 'scoped 只返回 api-gateway')
  const excl = myco.findScoped('部署', ['data-factory'])
  assert.ok(excl.every((r) => r.packageId === 'data-factory'), '另包 scoped 同理')
})

test('createScopedFindTool：返回限定子集的检索工具', async () => {
  const { myco } = await makeMyco()
  const tool = createScopedFindTool({ myco, packageIds: ['api-gateway'] })
  assert.equal(tool.name, 'myco_scoped_find')
  assert.ok(typeof tool.execute === 'function')
  const res = await tool.execute({ query: '部署' })
  assert.ok(res.length >= 1)
  assert.ok(res.every((r) => r.packageId === 'api-gateway'), '工具内只返回装配子集')
})

test('applyAgentTools：注册 scoped 检索，默认不裁剪，显式 restrict 才施加', async () => {
  const { myco } = await makeMyco()
  const registered = []
  const restrictions = []
  const agentCtx = {
    tools: {
      register: (def) => { registered.push(def); return () => {} },
      restrict: (filter) => { restrictions.push(filter); return () => {} },
    },
  }
  const result = { toolMask: { keep: ['myco_find'], scope: { packages: ['api-gateway'] } }, packages: [{ id: 'api-gateway', score: 10 }] }

  // 默认：注入 scoped 检索，不裁剪
  const r = applyAgentTools(agentCtx, result, { myco })
  assert.equal(r.ok, true)
  assert.ok(r.applied.includes('register:scoped-search'))
  assert.ok(registered.some((d) => d.name === 'myco_scoped_find'))
  assert.equal(restrictions.length, 0, '默认不施加 restrict')

  // 显式 restrict（真实签名 {allow/deny}）
  const r2 = applyAgentTools(agentCtx, result, { myco, restrict: { allow: ['myco_find'] } })
  assert.ok(r2.ok)
  assert.equal(restrictions.length, 1)
  assert.deepEqual(restrictions[0], { allow: ['myco_find'] })
})

test('applyAgentTools：无 agent 作用域工具面时安全返回', async () => {
  const r = applyAgentTools({}, { toolMask: {} })
  assert.equal(r.ok, false)
  assert.ok(r.reason)
})
