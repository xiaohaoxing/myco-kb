import { homedir } from 'node:os'
import { join } from 'node:path'
import { Daemon } from './daemon.js'
import { Myco } from './core/myco.js'
import { MycoRemoteService } from './remote.js'
import { registerTools } from './tools.js'
import { scheduleDraft } from './propagate.js'

export const name = 'myco-kb'
export const inject = ['tools', 'webServer', 'subagents']

// 读取请求体（JSON）
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try { resolve(Buffer.concat(chunks).toString('utf8')) } catch (err) { reject(err) }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-cache',
  })
  res.end(JSON.stringify(body))
}

// webhook URL 脱敏（保留 scheme+host，路径尾部打码——飞书 hook key 不应回显）
function maskWebhook(url) {
  if (!url) return ''
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/[^/]+$/, '/***')}`
  } catch {
    return url.length > 8 ? `${url.slice(0, 8)}…` : '***'
  }
}

/**
 * 控制台数据通道（/myco/api/*）。
 *
 * 为什么不用 Typert remote（remote.myco）：remote.<name> face 在 client 端受
 * inject 声明门控，且第三方插件的宿主 face 不随 web boot 同步——设置页这类
 * 非会话 UI 拿不到（2026-08-20 实测：tab 出现但永远"执行中"）。改用
 * ctx.webServer 注册同源 JSON 路由（官方 dsh-client-modules 同款机制），
 * client fetch 即可用，与 remote face 同步无关。
 */
function registerMycoApi(ctx, myco, config = {}) {
  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x')
    const cmd = url.pathname.replace(/^\/myco\/api\/?/, '') || 'status'
    try {
      switch (cmd) {
        case 'status': {
          sendJson(res, 200, myco.status())
          return
        }
        case 'find': {
          const q = url.searchParams.get('q') ?? ''
          sendJson(res, 200, myco.find(q))
          return
        }
        case 'index': {
          myco.reindex()
          sendJson(res, 200, { ok: true })
          return
        }
        case 'sweep': {
          sendJson(res, 200, myco.sweep())
          return
        }
        case 'profiles': {
          sendJson(res, 200, myco.listProfiles())
          return
        }
        case 'cloud': {
          sendJson(res, 200, await myco.cloudStatus())
          return
        }
        case 'cloud/sync': {
          sendJson(res, 200, await myco.syncAll())
          return
        }
        case 'cloud/subscribe': {
          const raw = await readBody(req)
          const { name, sync } = raw ? JSON.parse(raw) : {}
          if (!name) {
            sendJson(res, 400, { error: '需要 name 字段' })
            return
          }
          sendJson(res, 200, myco.cloudSubscribe(name, sync === true))
          return
        }
        case 'profile/use': {
          const raw = await readBody(req)
          const { name } = raw ? JSON.parse(raw) : {}
          myco.useProfile(name)
          sendJson(res, 200, myco.status())
          return
        }
        // ---- v0.5 知识更新流 ----
        case 'scan': {
          sendJson(res, 200, myco.scanChanges())
          return
        }
        case 'events': {
          const n = Number(url.searchParams.get('n') ?? 20)
          sendJson(res, 200, myco.listEvents(n))
          return
        }
        case 'impact': {
          const eventId = Number(url.searchParams.get('eventId') ?? 0)
          if (!eventId) {
            sendJson(res, 400, { error: '需要 eventId 查询参数' })
            return
          }
          sendJson(res, 200, await myco.impact(eventId))
          return
        }
        case 'stale': {
          sendJson(res, 200, myco.listStale())
          return
        }
        case 'stale/clear': {
          const raw = await readBody(req)
          const { node } = raw ? JSON.parse(raw) : {}
          if (!node) {
            sendJson(res, 400, { error: '需要 node 字段' })
            return
          }
          sendJson(res, 200, myco.clearStale(node))
          return
        }
        case 'contracts': {
          sendJson(res, 200, myco.contracts())
          return
        }
        case 'webhook': {
          if (req.method === 'GET' || req.method === 'HEAD') {
            const w = myco.getWebhook()
            sendJson(res, 200, { url: maskWebhook(w.url), enabled: w.enabled })
            return
          }
          // POST: 设置 webhook url（空 = 清除）
          const raw = await readBody(req)
          const { url } = raw ? JSON.parse(raw) : {}
          sendJson(res, 200, myco.setWebhook(url ?? ''))
          return
        }
        case 'webhook/test': {
          const r = await myco.sendWebhook('【MyCo-KB】测试消息：webhook 配置正常')
          sendJson(res, r.ok ? 200 : 400, r)
          return
        }
        // ---- v0.5.3 subagent 起草 ----
        case 'draft': {
          const raw = await readBody(req)
          const { node } = raw ? JSON.parse(raw) : {}
          if (!node) {
            sendJson(res, 400, { error: '需要 node 字段' })
            return
          }
          const provider = config?.subagentProvider ?? 'spawn'
          // 后台调度（subagent 可能运行较久，不阻塞 HTTP）
          scheduleDraft(ctx, myco, node, { provider }).catch(() => {})
          sendJson(res, 200, { ok: true, node, status: 'started' })
          return
        }
        case 'drafts': {
          sendJson(res, 200, myco.listDrafts())
          return
        }
        case 'draft/clear': {
          const raw = await readBody(req)
          const { node } = raw ? JSON.parse(raw) : {}
          if (!node) {
            sendJson(res, 400, { error: '需要 node 字段' })
            return
          }
          sendJson(res, 200, myco.clearDraft(node))
          return
        }
        default: {
          sendJson(res, 404, { error: `unknown myco api: ${cmd}` })
        }
      }
    } catch (err) {
      sendJson(res, 500, { error: err?.message ?? String(err) })
    }
  }
  return ctx.webServer.register({ kind: 'prefix', path: '/myco/api', handler })
}

/**
 * MyCo-KB 服务端入口（Cordis 插件）
 *
 * 宿主平面运行（不依赖任何会话）：
 *  - new MycoRemoteService(ctx, myco)：自动注册为 ctx.myco 服务，
 *    并经 Typert Gateway 暴露给 client（remote.myco）——agent/其他插件通道。
 *  - registerMycoApi(ctx, myco)：/myco/api/* JSON 路由——控制台数据通道。
 *  - registerTools(ctx, myco)：agent 工具面（myco_status/find/index/sweep）。
 *  - daemon：文件 watcher + 定时维护（setInterval），随插件纤维装载/卸载。
 *
 * 配置（Cordis config）：
 *  - dataDir                     数据目录（默认 ~/.myco）
 *  - mounts: string[]            启动时挂载的知识根（repo:/local:/cloud:）
 *  - maintenanceIntervalHours    定时维护间隔（默认 6h）
 */
export function apply(ctx, config = {}) {
  const dataDir = config.dataDir ?? join(homedir(), '.myco')
  const myco = new Myco({ dataDir })

  // 插件配置里的挂载在启动时一次性生效（持久挂载仍写在 config.json）
  for (const spec of config.mounts ?? []) myco.addMount(spec)

  // TypertRemoteService 构造器自动 ctx.provide('myco', this) 并绑定 Gateway
  new MycoRemoteService(ctx, myco)

  registerTools(ctx, myco)

  ctx.effect(() => registerMycoApi(ctx, myco, config), 'myco-kb: api routes')

  const daemon = new Daemon({
    myco,
    intervalMs: (config.maintenanceIntervalHours ?? 6) * 3600e3,
  })
  ctx.effect(() => {
    daemon.start()
    return () => daemon.stop()
  }, 'myco-kb: daemon')
}
