import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Daemon } from '../daemon.js'
import { buildIndex } from './indexer.js'
import { isGitRepo, gitStatus, normalizeCloudRoot, syncCloudPackage } from './sync.js'
import { resolveMount } from './mount.js'
import { scanPackages } from './registry.js'
import { buildStatus } from './status.js'
import { sweep } from './sweeper.js'
import { listProfiles } from './profile.js'
import { MycoStore } from './store.js'
import { scanPackageForChanges } from './events.js'
import { analyzeImpact } from './impact.js'
import { parseContracts } from './contract.js'

// 全库命名空间 tag 视为停用词，不参与匹配（词条纪律）
const STOPWORDS = new Set(['chaoheti'])

// MyCo-KB 编排器：CLI / daemon / DSH 插件共用同一核心
export class Myco {
  constructor({ dataDir }) {
    this.dataDir = dataDir
    this.profilesDir = join(dataDir, 'profiles')
    this.configPath = join(dataDir, 'config.json')
    this.ensureDirs()
    this.config = this.loadConfig()
    this.index = null
    this.packages = []
    this.errors = []
    this.lastIndexedAt = null
    this.store = null
  }

  // ---- v0.5 知识更新流：store / 变更 / 影响 ----

  getStore() {
    if (!this.store) this.store = new MycoStore(this.dataDir)
    return this.store
  }

  // 变更检测：遍历所有包，hash 对比 → 变更事件（首次扫描建立基线）
  scanChanges() {
    if (!this.index) this.reindex()
    const store = this.getStore()
    const events = []
    for (const pkg of this.packages) {
      events.push(...scanPackageForChanges(pkg, store))
    }
    return events
  }

  // 影响分析：给定变更事件 → 染色/传播集，传播集自动标 stale（待人工确认）
  async impact(eventId) {
    const store = this.getStore()
    const event = store.listEvents(1000).find((e) => e.id === eventId)
    if (!event) throw new Error(`事件不存在: ${eventId}`)
    if (!this.index) this.reindex()
    const result = analyzeImpact(this.index, this.packages, event)
    for (const r of result.spread) {
      store.markStale(`${r.packageId}/${r.rel}`, {
        packageId: r.packageId, rel: r.rel,
        reason: `契约 ${event.contractId} 变更（${event.bump}），需校验`,
        eventId,
      })
    }
    for (const p of result.pkgSpread) {
      store.markStale(`pkg:${p.packageId}`, {
        packageId: p.packageId, rel: '',
        reason: `依赖包 ${event.packageId} 变更，需校验`,
        eventId,
      })
    }
    return { event, dye: result.dye, spread: result.spread, pkgSpread: result.pkgSpread }
  }

  listEvents(n = 20) {
    return this.getStore().listEvents(n)
  }

  listStale() {
    return this.getStore().listStale()
  }

  clearStale(node) {
    this.getStore().clearStale(node)
    return this.getStore().listStale()
  }

  // ---- v0.5.3 subagent 起草（drafts：core 只提供数据面与 prompt，调度在插件层）----

  saveDraft(node, data) {
    this.getStore().saveDraft(node, data)
  }

  listDrafts() {
    return this.getStore().listDrafts()
  }

  clearDraft(node) {
    this.getStore().clearDraft(node)
    return this.getStore().listDrafts()
  }

  // 生成起草 prompt 所需上下文：stale 事件摘要 + 受影响节点当前内容
  draftContext(node) {
    if (!this.index || this.packages.length === 0) this.reindex()
    const store = this.getStore()
    const stale = store.listStale().find((s) => s.node === node)
    if (!stale) throw new Error(`节点不在 stale 队列: ${node}`)
    const event = stale.eventId ? store.listEvents(1000).find((e) => e.id === stale.eventId) : null
    const [pkgId, ...relParts] = node.split('/')
    const rel = relParts.join('/')
    const pkg = this.packages.find((p) => p.id === pkgId)
    let content = ''
    if (pkg) {
      try { content = readFileSync(join(pkg.path, rel), 'utf8') } catch { /* 读取失败则内容为空 */ }
    }
    const summary = event
      ? `变更（${event.bump}）: ${event.packageId}/${event.rel}${event.contractId ? `，契约 ${event.contractId}` : ''}`
      : stale.reason
    const prompt = [
      '你是 MyCo-KB 知识传播代理。知识库发生 major 变更，以下页面引用了被变更的内容，需要同步更新。',
      `变更摘要: ${summary}`,
      `受影响页面: ${node}`,
      '当前内容（节选）:',
      '---',
      content.slice(0, 3000),
      '---',
      '请起草更新草案：1) 指出哪些段落需要更新；2) 给出更新后的推荐文本（保留原有结构，只改受影响部分）；3) 不要直接修改文件，只输出草案。',
    ].join('\n')
    return { node, prompt, eventSummary: summary, staleReason: stale.reason, contentLength: content.length }
  }

  // ---- v0.5.2 webhook 通知（配置存 config.json 的 webhook.url；通用 HTTP 端点，飞书格式兼容）----

  getWebhook() {
    const w = this.config.webhook ?? {}
    return { url: w.url ?? '', enabled: Boolean(w.url) }
  }

  setWebhook(url) {
    const w = this.config.webhook ?? {}
    w.url = String(url ?? '').trim()
    this.config.webhook = w
    this.saveConfig()
    return this.getWebhook()
  }

  // 发送通知（POST 飞书群机器人兼容格式 JSON；任何 HTTP 端点可用）
  async sendWebhook(text) {
    const { url } = this.getWebhook()
    if (!url) return { ok: false, reason: '未配置 webhook url' }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ msg_type: 'text', content: { text } }),
      })
      return { ok: res.ok, status: res.status }
    } catch (err) {
      return { ok: false, reason: String(err?.message ?? err) }
    }
  }

  // major 变更通知文案（daemon 调用；patch/minor 不打扰）
  notifyMajor(event, impactResult) {
    const lines = [
      '【MyCo-KB】契约变更（major）',
      `包: ${event.packageId}`,
      `文件: ${event.rel}`,
      event.contractId ? `契约: ${event.contractId}` : null,
      `染色: ${impactResult?.dye?.length ?? 0} 页  传播: ${impactResult?.spread?.length ?? 0} 页`,
      impactResult?.spread?.length ? `受影响: ${impactResult.spread.map((s) => s.packageId).join(', ')}` : null,
    ].filter(Boolean)
    return this.sendWebhook(lines.join('\n'))
  }

  // 全库契约块清单（contract-scan）
  contracts() {
    if (!this.index) this.reindex()
    const out = []
    for (const doc of this.index.documents) {
      let text
      try { text = readFileSync(doc.path, 'utf8') } catch { continue }
      for (const c of parseContracts(text)) {
        out.push({ packageId: doc.packageId, rel: doc.rel, id: c.id, version: c.version, content: c.content })
      }
    }
    return out
  }

  ensureDirs() {
    mkdirSync(this.dataDir, { recursive: true })
    mkdirSync(this.profilesDir, { recursive: true })
  }

  loadConfig() {
    try { return JSON.parse(readFileSync(this.configPath, 'utf8')) }
    catch { return { mounts: [], cloudRoots: {} } }
  }

  saveConfig() {
    writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
  }

  mounts() {
    return (this.config.mounts ?? []).map((m) => ({ ...m, scope: scopeOf(m.spec) }))
  }

  addMount(spec, { enabled = true } = {}) {
    const mounts = this.config.mounts ?? []
    if (mounts.some((m) => m.spec === spec)) return false
    this.config.mounts = [...mounts, { spec, enabled, scope: scopeOf(spec), mountedAt: new Date().toISOString() }]
    this.saveConfig()
    return true
  }

  removeMount(spec) {
    this.config.mounts = (this.config.mounts ?? []).filter((m) => m.spec !== spec)
    this.saveConfig()
  }

  initManifest(dir) {
    const file = join(dir, 'kb.yaml')
    if (existsSync(file)) return false
    const id = basename(dir)
    writeFileSync(file, [
      '# MyCo-KB 知识包清单（v0.1 最小字段）',
      `id: ${id}`,
      `name: ${id}`,
      'scope: repo',
      'version: 0.1.0',
      'state: evergreen',
      '# whenToUse: 这个知识包解决什么问题、什么时候启用',
      '',
    ].join('\n'))
    return true
  }

  // 默认知识库目录：~/.myco-kb（新用户安装即用；本机可手动改挂载到自己的 Obsidian 路径）
  defaultKbDir() {
    return join(homedir(), '.myco-kb')
  }

  // 初始化默认知识库：创建目录 + README + kb.yaml + Obsidian .gitignore + 挂载（幂等）
  ensureDefaultKb(dir = this.defaultKbDir()) {
    mkdirSync(dir, { recursive: true })
    if (!existsSync(join(dir, 'kb.yaml'))) {
      writeFileSync(join(dir, 'kb.yaml'), [
        '# MyCo-KB 默认知识库清单',
        'id: myco-kb-local',
        'name: MyCo-KB 默认知识库',
        'scope: local',
        'version: 0.1.0',
        'state: evergreen',
        'dependencies: []',
        '# 本目录是 myco 的默认知识根（~/.myco-kb）。可手动改挂载到自己的 Obsidian 路径：',
        '#   myco mount repo:/path/to/your/vault',
        '',
      ].join('\n'))
      writeFileSync(join(dir, 'README.md'), [
        '# MyCo-KB 默认知识库',
        '',
        '这是 `myco init` 创建的默认知识库（`~/.myco-kb`），可作为 Obsidian vault 打开。',
        '工作区（项目）的知识统一挂载到这里；也可手动改挂载到已有的 Obsidian 知识库路径。',
        '',
        '相关：`myco mount repo:<知识根>` 挂载知识包；`myco status` 查看；`myco cloud sync on <name>` 订阅云端同步。',
        '',
      ].join('\n'))
      writeFileSync(join(dir, '.gitignore'), [
        '.DS_Store',
        '.obsidian/workspace*',
        '.obsidian/cache',
        '',
      ].join('\n'))
    }
    this.addMount(`repo:${dir}`)
    return dir
  }

  reindex() {
    const { packages, errors } = scanPackages(this.mounts(), this.config)
    this.packages = packages
    this.errors = errors
    this.index = buildIndex(packages.map((p) => ({ id: p.id, path: p.path })))
    this.lastIndexedAt = new Date().toISOString()
    writeFileSync(join(this.dataDir, 'index.json'), JSON.stringify({
      tags: this.index.tags,
      counts: this.index.counts,
      lastIndexedAt: this.lastIndexedAt,
    }, null, 2))
    return { packages, errors, counts: this.index.counts }
  }

  status() {
    if (!this.index) this.reindex()
    const sweepResults = this.index ? sweep(this.index, {}) : null
    const s = buildStatus({
      packages: this.packages, errors: this.errors, index: this.index,
      lastIndexedAt: this.lastIndexedAt, mounts: this.mounts(),
      activeProfile: this.activeProfile()?.name ?? null, sweepResults,
    })
    writeFileSync(join(this.dataDir, 'status.json'), JSON.stringify(s, null, 2))
    return s
  }

  find(query) {
    if (!this.index) this.reindex()
    const tokens = query.split(/[\s,，、]+/).filter(Boolean)
    const scored = []
    for (const doc of this.index.documents) {
      let score = 0
      const relLower = doc.rel.toLowerCase()
      for (const token of tokens) {
        const t = token.toLowerCase()
        if (STOPWORDS.has(t)) continue
        if (doc.tags.includes(token) || doc.tags.some((tag) => tag.toLowerCase().includes(t))) score += 3
        if (relLower.includes(t)) score += 2
        try {
          if (readFileSync(doc.path, 'utf8').toLowerCase().includes(t)) score += 1
        } catch { /* 读取失败不计分 */ }
      }
      if (score > 0) scored.push({ score, packageId: doc.packageId, rel: doc.rel, isEvidence: doc.isEvidence })
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 20)
  }

  listProfiles() { return listProfiles(this.dataDir) }

  activeProfile() {
    try { return JSON.parse(readFileSync(join(this.dataDir, 'active.json'), 'utf8')) }
    catch { return null }
  }

  useProfile(name) {
    const profile = this.listProfiles().find((p) => p.name === name)
    if (!profile) throw new Error(`profile 不存在: ${name}`)
    writeFileSync(join(this.dataDir, 'active.json'), JSON.stringify({
      name, at: new Date().toISOString(),
      include: profile.include ?? [], exclude: profile.exclude ?? [],
    }, null, 2))
  }

  sweep() {
    if (!this.index) this.reindex()
    return this.index ? sweep(this.index, {}) : { candidates: [], generatedAt: new Date().toISOString() }
  }

  // 云端全局状态：cloudRoots 配置 + 所有 cloud: 挂载的解析结果 + git 状态（async）
  async cloudStatus() {
    const roots = this.config.cloudRoots ?? {}
    const cloudMounts = await Promise.all(
      this.mounts()
        .filter((m) => m.scope === 'cloud')
        .map(async (m) => {
          const resolved = resolveMount(m, this.config)
          const root = normalizeCloudRoot(m, this.config)
          const base = {
            spec: m.spec,
            enabled: m.enabled !== false,
            resolved: resolved.resolved,
            path: resolved.path ?? null,
            reason: resolved.reason ?? null,
            subscribed: root.subscribed,
          }
          if (!resolved.resolved || !resolved.path || !isGitRepo(resolved.path)) return base
          try {
            const st = await gitStatus(resolved.path)
            return { ...base, git: { branch: st.branch, ahead: st.ahead, behind: st.behind, dirty: st.dirty, changedFiles: st.changedFiles } }
          } catch {
            return base
          }
        }),
    )
    return { cloudRoots: roots, mounts: cloudMounts }
  }

  // ---- 云端 git 同步（v0.3） ----

  cloudAdd(name, url, { branch = 'main', path, sync = false } = {}) {
    if (!name || !url) throw new Error('cloud add 需要 name 和 url')
    const roots = this.config.cloudRoots ?? {}
    roots[name] = { url, branch, path: path ?? join(this.dataDir, 'cloud', name), sync }
    this.config.cloudRoots = roots
    this.saveConfig()
    return roots[name]
  }

  cloudRemove(name) {
    const roots = this.config.cloudRoots ?? {}
    delete roots[name]
    this.config.cloudRoots = roots
    this.saveConfig()
  }

  // 订阅/退订云端同步（opt-in：sync: true 才进自动同步）
  cloudSubscribe(name, subscribed) {
    const roots = this.config.cloudRoots ?? {}
    const root = roots[name]
    if (!root) throw new Error(`云端根不存在: ${name}`)
    if (typeof root === 'string') {
      roots[name] = { url: '', path: root, branch: 'main', sync: Boolean(subscribed) }
    } else {
      roots[name] = { ...root, sync: Boolean(subscribed) }
    }
    this.config.cloudRoots = roots
    this.saveConfig()
    return roots[name]
  }

  cloudList() {
    return Object.entries(this.config.cloudRoots ?? {}).map(([name, root]) => ({
      name,
      url: typeof root === 'string' ? '' : root.url ?? '',
      branch: typeof root === 'string' ? 'main' : root.branch ?? 'main',
      path: typeof root === 'string' ? root : root.path ?? '',
      sync: typeof root === 'string' ? false : root.sync === true,
    }))
  }

  // 同步单个 cloud 挂载（按 name；显式指定 = 手动强制，未订阅也可同步）
  async syncPackage(name) {
    const mount = this.mounts().find((m) => m.scope === 'cloud' && m.spec === `cloud:${name}`)
    const root = normalizeCloudRoot(mount ?? { spec: `cloud:${name}` }, this.config)
    const result = await syncCloudPackage(mount ?? { spec: `cloud:${name}` }, this.config)
    if (result.ok) this.reindex()
    return { ...result, subscribed: root.subscribed }
  }

  // 自动同步（daemon/CLI 默认）：只同步已订阅（opt-in）的云端包
  async syncAll() {
    const mounts = this.mounts().filter((m) => m.scope === 'cloud' && m.enabled !== false)
    const results = []
    for (const m of mounts) {
      const root = normalizeCloudRoot(m, this.config)
      if (!root.subscribed) continue
      results.push(await syncCloudPackage(m, this.config))
    }
    this.reindex()
    return { results }
  }

  installSkills(targetDir) {
    const src = join(fileURLToPath(new URL('../../skills/', import.meta.url)))
    if (!existsSync(src)) return false
    mkdirSync(targetDir, { recursive: true })
    let copied = 0
    for (const entry of readdirSync(src)) {
      const from = join(src, entry)
      if (!statSync(from).isDirectory()) continue
      const to = join(targetDir, entry)
      mkdirSync(to, { recursive: true })
      for (const f of readdirSync(from)) {
        copyFileSync(join(from, f), join(to, f))
        copied += 1
      }
    }
    return copied > 0
  }

  daemon() {
    const d = new Daemon({ myco: this })
    d.start()
  }
}

function scopeOf(spec) {
  const m = /^(repo|local|cloud):/.exec(spec)
  return m ? m[1] : 'repo'
}
