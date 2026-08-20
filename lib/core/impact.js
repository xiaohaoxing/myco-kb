// 影响分析（v0.5）：反向引用 + 依赖遍历 → 染色集/传播集（ADR-008）
// 染色集 = 同包内引用同一契约的页面（派生联动，可自动刷新）
// 传播集 = 跨包引用该契约的页面 + 依赖该包的包（需人工确认）
import { readFileSync } from 'node:fs'
import { extractContractRefs, parseContracts } from './contract.js'

/**
 * 构建契约引用索引：contractId → 引用它的页面列表。
 * 两遍扫描：先收集全库已知契约 id（区分普通锚点），再提取引用。
 */
export function buildContractIndex(index) {
  const allContractIds = new Set()
  const docOwn = new Map() // path → [契约 id]
  for (const doc of index?.documents ?? []) {
    let text
    try { text = readFileSync(doc.path, 'utf8') } catch { continue }
    const ids = parseContracts(text).map((c) => c.id)
    docOwn.set(doc.path, ids)
    for (const id of ids) allContractIds.add(id)
  }

  const byContract = new Map() // contractId → [{ packageId, rel, path, ownsContract }]
  for (const doc of index?.documents ?? []) {
    let text
    try { text = readFileSync(doc.path, 'utf8') } catch { continue }
    for (const ref of extractContractRefs(text, allContractIds)) {
      if (!byContract.has(ref.contractId)) byContract.set(ref.contractId, [])
      byContract.get(ref.contractId).push({
        packageId: doc.packageId,
        rel: doc.rel,
        path: doc.path,
        ownsContract: (docOwn.get(doc.path) ?? []).includes(ref.contractId),
      })
    }
  }
  return byContract
}

/**
 * 影响分析：给定变更事件，返回染色集/传播集。
 * @param index 跨包索引（buildIndex 产物）
 * @param packages 知识包列表（含 dependencies）
 * @param event 变更事件 { packageId, rel, contractId, bump }
 * @returns { dye: [], spread: [], pkgSpread: [], contractChanged }
 */
export function analyzeImpact(index, packages, event) {
  const byContract = buildContractIndex(index)
  const dye = []   // 染色：同包引用者（派生联动）
  const spread = [] // 传播：跨包引用者（契约强引用）
  const pkgSpread = [] // 传播：依赖变更包的包（kb.yaml dependencies 反向）

  if (event.contractId) {
    for (const r of byContract.get(event.contractId) ?? []) {
      // 契约所有者自身的变更不算受影响
      if (r.ownsContract && r.rel === event.rel) continue
      if (r.packageId === event.packageId) dye.push(r)
      else spread.push(r)
    }
  }

  // 依赖反向：谁的 dependencies 指向变更包
  const depsMatch = (deps, targetId) => (deps ?? []).some((d) => d === targetId || d.endsWith(`:${targetId}`) || d.endsWith(`/${targetId}`))
  for (const pkg of packages ?? []) {
    if (pkg.id === event.packageId) continue
    if (depsMatch(pkg.dependencies, event.packageId)) pkgSpread.push({ packageId: pkg.id, name: pkg.name })
  }

  return { dye, spread, pkgSpread, contractChanged: event.contractId !== null }
}
