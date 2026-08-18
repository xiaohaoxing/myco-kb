import { statSync } from 'node:fs'
import { basename } from 'node:path'
import { readManifest } from './manifest.js'
import { resolveMount } from './mount.js'

// 扫描全部挂载 → 知识包注册表
export function scanPackages(mounts, config = {}) {
  const packages = []
  const errors = []
  for (const mount of mounts ?? []) {
    if (mount.enabled === false) continue
    const resolved = resolveMount(mount, config)
    if (!resolved.resolved) {
      errors.push({ spec: mount.spec, reason: resolved.reason })
      continue
    }
    try {
      const stat = statSync(resolved.path)
      if (!stat.isDirectory()) throw new Error('不是目录')
      const manifest = readManifest(resolved.path) ?? {}
      const id = manifest.id ?? basename(resolved.path)
      packages.push({
        id,
        name: manifest.name ?? id,
        scope: resolved.scope,
        spec: mount.spec,
        path: resolved.path,
        version: manifest.version ?? '0.1.0',
        state: manifest.state ?? 'evergreen',
        dependencies: Array.isArray(manifest.dependencies) ? manifest.dependencies : [],
        whenToUse: manifest.whenToUse ?? '',
        manifestFile: manifest.manifestFile ?? null,
        mountedAt: mount.mountedAt ?? null,
      })
    } catch (err) {
      errors.push({ spec: mount.spec, reason: String(err?.message ?? err) })
    }
  }
  return { packages, errors }
}
