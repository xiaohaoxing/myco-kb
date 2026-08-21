// 宿主平面加载验证：用真实 Cordis Context 装载 MyCo-KB 服务端插件。
// 必须以独立进程运行（node scripts/host-check.mjs），不要用 node --test：
// Cordis 纤维在 node:test 的 async context 下不会 apply（环境不兼容）。
// 依赖 scripts/dev-links.sh 建立的符号链接。
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'

const plugin = await import('../lib/index.js')

function makeTempKb() {
  const dir = mkdtempSync(join(tmpdir(), 'myco-host-'))
  writeFileSync(join(dir, 'a.md'), '---\ntags: [部署, 常青]\n---\n内容')
  writeFileSync(join(dir, 'b.md'), '---\ntags: [证据]\n---\n内容')
  return dir
}

// 用 inject 探针读取 myco 服务（根 ctx.get() 只读根纤维 store，读不到插件纤维提供的服务）
function probeService(app, name) {
  let service
  app.plugin({ name: `probe:${name}`, inject: [name], apply(ctx) { service = ctx[name] } })
  return () => service
}

async function verifyHostPlane() {
  const kbDir = makeTempKb()
  const dataDir = mkdtempSync(join(tmpdir(), 'myco-host-data-'))
  const app = new Context()

  const registeredTools = []
  const webServerRoutes = []
  app.provide('tools', { register(entry) { registeredTools.push(entry) } })
  app.provide('webServer', {
    register(route) {
      webServerRoutes.push(route)
      return () => {}
    },
  })
  app.provide('subagents', {
    start: async (_provider, request) => ({
      result: Promise.resolve({ output: `[mock subagent] 草案 for ${request.label ?? '?'}`, stopReason: 'complete' }),
      dispose: async () => {},
    }),
    list: () => ['spawn'],
  })

  const pluginFiber = app.plugin(plugin, {
    dataDir,
    mounts: [`repo:${kbDir}`],
    maintenanceIntervalHours: 24,
  })
  const getMyco = probeService(app, 'myco')

  // 等待插件与探针纤维 apply（轮询等待，双保险）
  const start = Date.now()
  while (!getMyco() && Date.now() - start < 5000) await new Promise((r) => setTimeout(r, 20))
  const myco = getMyco()
  assert.ok(myco, 'ctx.myco 应经 inject 可见')
  assert.equal(typeof myco.status, 'function')

  // Remote 方法标记完整（Typert Gateway 可发现）
  const names = remoteMethods(myco).map((m) => m.method).sort()
  assert.deepEqual(names, ['cloudAdd', 'cloudList', 'cloudRemove', 'cloudStatus', 'cloudSync', 'find', 'index', 'mounts', 'profiles', 'status', 'sweep', 'useProfile'])

  // agent 工具注册 4 个
  assert.equal(registeredTools.length, 4)
  assert.deepEqual(registeredTools.map((t) => t.name).sort(), ['myco_find', 'myco_index', 'myco_status', 'myco_sweep'])

  // 控制台 JSON API 路由已注册（/myco/api，client fetch 通道）
  assert.ok(webServerRoutes.some((r) => r.kind === 'prefix' && r.path === '/myco/api'), '应注册 /myco/api 路由')

  // HTTP 层实测：调用 handler 验证 JSON 响应（status / events / stale / contracts）
  const route = webServerRoutes.find((r) => r.path === '/myco/api')
  const call = async (url, method = 'GET', body = null) => {
    let status = 0
    let payload = ''
    let remaining = body ?? ''
    const req = {
      method,
      url,
      on(event, cb) {
        if (event === 'data' && remaining) {
          cb(Buffer.from(remaining))
          remaining = ''
        } else if (event === 'end') {
          cb()
        }
      },
    }
    const res = {
      writeHead(code) { status = code },
      end(b) { payload = b },
    }
    await route.handler(req, res)
    return { status, payload: payload ? JSON.parse(payload) : null }
  }
  const st = await call('/myco/api/status')
  assert.equal(st.status, 200)
  assert.ok(st.payload.counts.packages >= 1)
  const evs = await call('/myco/api/events?n=5')
  assert.equal(evs.status, 200)
  assert.ok(Array.isArray(evs.payload))
  const stl = await call('/myco/api/stale')
  assert.equal(stl.status, 200)
  assert.ok(Array.isArray(stl.payload))
  const cts = await call('/myco/api/contracts')
  assert.equal(cts.status, 200)
  assert.ok(Array.isArray(cts.payload))
  const wh = await call('/myco/api/webhook')
  assert.equal(wh.status, 200)
  assert.ok('enabled' in wh.payload)
  assert.ok('url' in wh.payload)

  // drafts API 链路：造 stale → POST /draft → mock subagent 起草 → GET /drafts 有记录
  const pkgId = (await myco.status()).packages[0].id
  myco.core.getStore().markStale(`${pkgId}/consumer.md`, {
    packageId: pkgId, rel: 'consumer.md', reason: 'host-check 测试 stale', eventId: null,
  })
  const draftRes = await call('/myco/api/draft', 'POST', JSON.stringify({ node: `${pkgId}/consumer.md` }))
  assert.equal(draftRes.status, 200)
  assert.equal(draftRes.payload.status, 'started')
  // 等待后台起草完成（mock subagents 立即 resolve）
  let drafts = []
  for (let i = 0; i < 20; i++) {
    const r = await call('/myco/api/drafts')
    drafts = r.payload
    if (drafts.some((d) => d.status === 'done')) break
    await new Promise((r) => setTimeout(r, 50))
  }
  const done = drafts.find((d) => d.node === `${pkgId}/consumer.md`)
  assert.ok(done, '应有起草记录')
  assert.equal(done.status, 'done')
  assert.ok(done.draft.includes('mock subagent'), done.draft)
  // 清理：解除 stale + 清除 draft + 关闭 sqlite handle（否则进程不退出）
  await call('/myco/api/stale/clear', 'POST', JSON.stringify({ node: `${pkgId}/consumer.md` }))
  await call('/myco/api/draft/clear', 'POST', JSON.stringify({ node: `${pkgId}/consumer.md` }))
  myco.core.getStore().close()
  const nf = await call('/myco/api/nothing')
  assert.equal(nf.status, 404)

  // daemon 启动时已完成索引，status 反映挂载的知识包
  const status = await myco.status()
  assert.equal(status.counts.packages, 1)
  assert.equal(status.counts.documents, 2)
  assert.ok(status.index.fresh)

  // find 可用（核心检索经服务透出）
  const hits = await myco.find('部署')
  assert.ok(hits.length >= 1)
  assert.ok(hits.some((h) => h.rel === 'a.md'))

  // 挂载读取 + cloudStatus + cloud 注册/移除（无需真 git）
  const mounts = await myco.mounts()
  assert.equal(mounts.length, 1)
  assert.equal(mounts[0].scope, 'repo')
  const cloud = await myco.cloudStatus()
  assert.ok(typeof cloud.cloudRoots === 'object')
  const afterAdd = await myco.cloudAdd('demo', 'https://example.invalid/kb.git', {})
  assert.ok(afterAdd.some((c) => c.name === 'demo'))
  const afterRemove = await myco.cloudRemove('demo')
  assert.ok(!afterRemove.some((c) => c.name === 'demo'))

  // 清理：卸载插件纤维（关闭 watcher/timer）
  if (typeof pluginFiber?.dispose === 'function') await pluginFiber.dispose()
  app.fiber.dispose?.()

  console.log('✅ 宿主平面验证通过：ctx.myco / 12 Remote 方法 / 4 工具 / daemon / 检索 / 挂载 / cloud / myco API 路由')
}

verifyHostPlane().then(
  () => process.exit(0),
  (err) => {
    console.error('❌ 宿主平面验证失败:', err?.message ?? err)
    console.error(err?.stack ?? '')
    process.exit(1)
  },
)
