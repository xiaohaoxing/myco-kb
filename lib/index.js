import { homedir } from 'node:os'
import { join } from 'node:path'
import { Daemon } from './daemon.js'
import { Myco } from './core/myco.js'
import { registerTools } from './tools.js'

export const name = 'myco-kb'
export const inject = ['tools']

// MyCo-KB 服务端入口（Cordis 插件）
// 宿主平面运行：提供 ctx.myco 服务 + agent 工具 + 后台静默维护（watcher + 定时清扫）
export function apply(ctx, config = {}) {
  const dataDir = config.dataDir ?? join(homedir(), '.myco')
  const myco = new Myco({ dataDir })

  ctx.provide('myco', {
    status: () => myco.status(),
    find: (query) => myco.find(query),
    index: () => myco.reindex(),
    sweep: () => myco.sweep(),
    mounts: () => myco.mounts(),
    profiles: () => myco.listProfiles(),
  })

  registerTools(ctx, myco)

  const daemon = new Daemon({
    myco,
    intervalMs: (config.maintenanceIntervalHours ?? 6) * 3600e3,
  })
  ctx.effect(() => {
    daemon.start()
    return () => daemon.stop()
  }, 'myco-kb: daemon')
}
