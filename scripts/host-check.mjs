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
  app.provide('tools', { register(entry) { registeredTools.push(entry) } })

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
  assert.deepEqual(names, ['cloudStatus', 'find', 'index', 'mounts', 'profiles', 'status', 'sweep', 'useProfile'])

  // agent 工具注册 4 个
  assert.equal(registeredTools.length, 4)
  assert.deepEqual(registeredTools.map((t) => t.name).sort(), ['myco_find', 'myco_index', 'myco_status', 'myco_sweep'])

  // daemon 启动时已完成索引，status 反映挂载的知识包
  const status = await myco.status()
  assert.equal(status.counts.packages, 1)
  assert.equal(status.counts.documents, 2)
  assert.ok(status.index.fresh)

  // find 可用（核心检索经服务透出）
  const hits = await myco.find('部署')
  assert.ok(hits.length >= 1)
  assert.ok(hits.some((h) => h.rel === 'a.md'))

  // 挂载读取 + cloudStatus
  const mounts = await myco.mounts()
  assert.equal(mounts.length, 1)
  assert.equal(mounts[0].scope, 'repo')
  const cloud = await myco.cloudStatus()
  assert.ok(typeof cloud.cloudRoots === 'object')

  // 清理：卸载插件纤维（关闭 watcher/timer）
  if (typeof pluginFiber?.dispose === 'function') await pluginFiber.dispose()
  app.fiber.dispose?.()

  console.log('✅ 宿主平面验证通过：ctx.myco 服务 / 8 个 Remote 方法 / 4 个工具 / daemon 索引 / 检索 / 挂载')
}

verifyHostPlane().then(
  () => process.exit(0),
  (err) => {
    console.error('❌ 宿主平面验证失败:', err?.message ?? err)
    console.error(err?.stack ?? '')
    process.exit(1)
  },
)
