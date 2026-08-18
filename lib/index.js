import { homedir } from 'node:os'
import { join } from 'node:path'
import { Daemon } from './daemon.js'
import { Myco } from './core/myco.js'
import { MycoRemoteService } from './remote.js'
import { registerTools } from './tools.js'

export const name = 'myco-kb'
export const inject = ['tools']

/**
 * MyCo-KB 服务端入口（Cordis 插件）
 *
 * 宿主平面运行（不依赖任何会话）：
 *  - new MycoRemoteService(ctx, myco)：自动注册为 ctx.myco 服务，
 *    并经 Typert Gateway 暴露给 client（remote.myco）——控制台数据通道。
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

  const daemon = new Daemon({
    myco,
    intervalMs: (config.maintenanceIntervalHours ?? 6) * 3600e3,
  })
  ctx.effect(() => {
    daemon.start()
    return () => daemon.stop()
  }, 'myco-kb: daemon')
}
