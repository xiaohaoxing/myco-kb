import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// 组合配置（v0.1：data/profiles/*.json）
// 结构：{ include: [包id], exclude: [包id], match: { 用户, 环境, 目标 } }
export function listProfiles(dataDir) {
  const dir = join(dataDir, 'profiles')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const name = f.replace(/\.json$/, '')
      try { return { name, ...JSON.parse(readFileSync(join(dir, f), 'utf8')) } }
      catch { return { name } }
    })
}

// 解析 profile：include 为空 = 全部；exclude 优先
export function resolveProfile(profile, packages) {
  const include = profile?.include?.length ? new Set(profile.include) : null
  const exclude = new Set(profile?.exclude ?? [])
  return (packages ?? []).filter((p) => (include === null || include.has(p.id)) && !exclude.has(p.id))
}
