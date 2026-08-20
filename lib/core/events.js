// 变更检测（v0.5）：文件内容 hash 对比 → 变更事件
// 文件为唯一事实源；hash 缓存存 store.hashes，对比差异产生事件写入 store.events。
// git 化包未来可用 git diff 生成事件（ADR-010 A），v0.5 先统一用内容 hash。
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseContracts, classifyBump } from './contract.js'
import { walkMd } from './indexer.js'

export function hashContent(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

/**
 * 构造变更事件（v0.5 bump 规则：含契约块 = major，其余内容变更 = patch）。
 * 首次扫描（prevHash 为 undefined）= 建立基线，不产生事件。
 * 返回事件或 null（内容未变或首次基线）；事件不写库，由调用方决定。
 */
export function buildChangeEvent({ packageId, rel, text, prevHash }) {
  const hash = hashContent(text)
  if (prevHash === hash) return null
  if (prevHash === undefined) return null // 首次扫描：建立基线，不产生事件
  const contracts = parseContracts(text)
  const evt = {
    at: new Date().toISOString(),
    packageId,
    rel,
    kind: contracts.length > 0 ? 'contract-change' : 'content-change',
    contractId: contracts.length > 0 ? contracts[0].id : null,
    before: prevHash,
    after: hash,
    bump: classifyBump({ contractChanged: contracts.length > 0, isNew: false }),
  }
  return evt
}

/**
 * 扫描一个知识包：遍历 md 文件，对比 hash 缓存，产出变更事件并更新缓存。
 * @param pkg { id, path }
 * @param store MycoStore
 * @returns 变更事件列表（已写入 store.events，含 id）
 */
export function scanPackageForChanges(pkg, store) {
  const prev = store.getHashes()
  const events = []
  for (const file of walkMd(pkg.path)) {
    const rel = file.slice(pkg.path.length + 1)
    const key = `${pkg.id}/${rel}`
    let text
    try { text = readFileSync(file, 'utf8') } catch { continue }
    const prevHash = prev.get(key)
    const evt = buildChangeEvent({ packageId: pkg.id, rel, text, prevHash })
    store.setHash(key, hashContent(text))
    if (evt) {
      const id = store.appendEvent(evt)
      events.push({ ...evt, id })
    }
  }
  return events
}

/**
 * 对比两个版本文本的契约差异（v0.5 简单版：返回新老契约列表）。
 * 未来用 git diff 精确到行（ADR-010 A）。
 */
export function contractDiff(beforeText, afterText) {
  const before = new Map(parseContracts(beforeText ?? '').map((c) => [c.id, c]))
  const after = new Map(parseContracts(afterText ?? '').map((c) => [c.id, c]))
  return {
    added: [...after.keys()].filter((id) => !before.has(id)).map((id) => after.get(id)),
    removed: [...before.keys()].filter((id) => !after.has(id)).map((id) => before.get(id)),
    changed: [...after.keys()].filter((id) => {
      const b = before.get(id)
      return b && (b.version !== after.get(id).version || b.content !== after.get(id).content)
    }).map((id) => ({ before: before.get(id), after: after.get(id) })),
  }
}

export function pathJoin(dir, rel) {
  return join(dir, rel)
}
