import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
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
          const base = {
            spec: m.spec,
            enabled: m.enabled !== false,
            resolved: resolved.resolved,
            path: resolved.path ?? null,
            reason: resolved.reason ?? null,
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

  cloudAdd(name, url, { branch = 'main', path } = {}) {
    if (!name || !url) throw new Error('cloud add 需要 name 和 url')
    const roots = this.config.cloudRoots ?? {}
    roots[name] = { url, branch, path: path ?? join(this.dataDir, 'cloud', name) }
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

  cloudList() {
    return Object.entries(this.config.cloudRoots ?? {}).map(([name, root]) => ({
      name,
      url: typeof root === 'string' ? '' : root.url ?? '',
      branch: typeof root === 'string' ? 'main' : root.branch ?? 'main',
      path: typeof root === 'string' ? root : root.path ?? '',
    }))
  }

  // 同步单个 cloud 挂载（按 name）；未挂载时仍可对已注册的 cloud 根操作
  async syncPackage(name) {
    const mount = this.mounts().find((m) => m.scope === 'cloud' && m.spec === `cloud:${name}`)
    const root = normalizeCloudRoot(mount ?? { spec: `cloud:${name}` }, this.config)
    const result = await syncCloudPackage(mount ?? { spec: `cloud:${name}` }, this.config)
    if (result.ok) this.reindex()
    return result
  }

  async syncAll() {
    const mounts = this.mounts().filter((m) => m.scope === 'cloud' && m.enabled !== false)
    const results = []
    for (const m of mounts) {
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
