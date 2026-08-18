import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

// 生命周期候选扫描（v0.1 仅报告，不自动执行）
// 规则：
//   1. archive — 证据页超过 evidenceMaxAgeDays（默认 90）未更新 → 归档候选
//   2. review  — 常青页无出链且无入链（孤页）→ 补链或归档候选
export function sweep(index, options = {}) {
  const now = Date.now()
  const maxAgeDays = options.evidenceMaxAgeDays ?? 90
  const evidenceMaxAge = maxAgeDays * 86400e3
  const candidates = []

  const inbound = new Map()
  const outbound = new Map()

  for (const doc of index?.documents ?? []) {
    let text = ''
    try { text = readFileSync(doc.path, 'utf8') } catch { continue }
    const links = [...text.matchAll(/\[\[([^\]|#\n]+)/g)].map((m) => m[1].trim().split('/').pop())
    outbound.set(doc.path, links)
    for (const link of links) inbound.set(link, (inbound.get(link) ?? 0) + 1)
  }

  for (const doc of index?.documents ?? []) {
    if (doc.isEvidence && now - doc.mtime > evidenceMaxAge) {
      candidates.push({
        kind: 'archive',
        reason: `证据页 ${maxAgeDays} 天未更新，建议归档`,
        packageId: doc.packageId, rel: doc.rel, path: doc.path,
      })
      continue
    }
    if (!doc.isEvidence) {
      const name = basename(doc.rel, '.md')
      const hasOut = (outbound.get(doc.path) ?? []).length > 0
      const hasIn = (inbound.get(name) ?? 0) > 0
      if (!hasOut && !hasIn) {
        candidates.push({
          kind: 'review',
          reason: '孤页：无出链也无入链，建议补链或归档',
          packageId: doc.packageId, rel: doc.rel, path: doc.path,
        })
      }
    }
  }
  return { candidates, generatedAt: new Date().toISOString() }
}
