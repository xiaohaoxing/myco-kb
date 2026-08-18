import { watch } from 'node:fs'

// 后台守护：文件监听（增量重索引）+ 定时维护（生命周期清扫 + 状态快照）
// 供 `myco daemon`（CLI）与 DSH 插件（lib/index.js）复用
export class Daemon {
  constructor({ myco, intervalMs = 6 * 3600e3, watchRoots = true }) {
    this.myco = myco
    this.intervalMs = intervalMs
    this.watchRoots = watchRoots
    this.watchers = []
    this.timer = null
    this.debounce = null
  }

  start() {
    this.myco.reindex()
    this.myco.status()
    if (this.watchRoots) this.watchAll()
    this.timer = setInterval(() => this.maintain(), this.intervalMs)
    this.timer.unref?.()
    console.log(`[myco] daemon 启动：${this.myco.mounts().length} 个挂载，每 ${Math.round(this.intervalMs / 3600e3)}h 定时维护`)
  }

  maintain() {
    try {
      this.myco.reindex()
      this.myco.status()
    } catch (err) {
      console.error('[myco] 定时维护失败:', err?.message ?? err)
    }
  }

  watchAll() {
    for (const m of this.myco.mounts()) {
      if (m.enabled === false) continue
      const path = m.spec.replace(/^(repo|local|cloud):/, '')
      try {
        const watcher = watch(path, { recursive: true }, () => this.scheduleReindex())
        watcher.on('error', () => { /* 路径不可监听时静默降级为定时维护 */ })
        this.watchers.push(watcher)
      } catch { /* 非本地路径或不可监听，跳过 */ }
    }
  }

  scheduleReindex() {
    clearTimeout(this.debounce)
    this.debounce = setTimeout(() => this.maintain(), 2000)
  }

  stop() {
    for (const w of this.watchers) { try { w.close() } catch { /* ignore */ } }
    this.watchers = []
    if (this.timer) clearInterval(this.timer)
    if (this.debounce) clearTimeout(this.debounce)
  }
}
