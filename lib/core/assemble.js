// v0.4 按任务动态装配 — 匹配引擎 + 装配（纯 Node，零依赖，CLI/插件共用）
//
// 两层匹配（见 docs/v0.4-dynamic-assembly.md §5）：
//   第一层：profile 精确匹配（taskCtx 用户/环境/目标 与 profile.match 逐维命中）
//   第二层：知识包子集软匹配（在 profile 包内再缩到「刚好够用」）
//           信号：whenToUse 语义 > tag > 文件名 > 全文
//
// 产出：{ taskCtx, profile, mode, packages, documents(scopedIndex), toolMask, lockfile }
// 命中为空时回退默认（profile 全量，不裁剪）。

import { readFileSync } from 'node:fs'
import { normalizeTaskCtx } from './taskctx.js'
import { resolveProfile } from './profile.js'

// 打分权重（分层保留 find 的 tag×3 / 文件名×2 / 全文×1，语义层叠加更高权重）
const W_SEMANTIC = 5   // whenToUse 语义命中
const W_TAG = 3        // 文档 tag 命中
const W_FILENAME = 2   // 文档文件名命中
const W_FULLTEXT = 1   // 文档全文命中

// 装配基础工具恒保留（v0.4.2 工具面据此施加 restrict；被裁掉包的工具会被钳制）
export const BASE_TOOLS = ['myco_status', 'myco_find', 'myco_index', 'myco_sweep', 'myco_assemble']

function containsToken(candidate, token) {
  return String(candidate ?? '').toLowerCase().includes(token)
}

// ---- 第一层：profile 精确匹配 ----

function matchesDim(value, terms) {
  if (!value) return false
  const list = Array.isArray(terms) ? terms : [terms]
  const v = String(value).toLowerCase()
  return list.some((t) => containsToken(v, String(t)))
}

function matchesGoal(taskCtx, terms) {
  const list = Array.isArray(terms) ? terms : [terms]
  const goalLower = taskCtx.goal.toLowerCase()
  return list.some((t) => {
    const term = String(t).toLowerCase()
    if (!term) return false
    // 目标关键词是 goal 子串，或 goal 分词命中该关键词（双向子串）
    return goalLower.includes(term) || taskCtx.tokens.some((tk) => containsToken(term, tk) || containsToken(tk, term))
  })
}

// 返回 { profile, score, mode }；无命中时 mode='fallback-default'
export function matchProfile(taskCtx, profiles) {
  let best = null
  let bestScore = 0
  for (const p of profiles ?? []) {
    const m = p.match ?? {}
    let score = 0
    if (m['目标'] && matchesGoal(taskCtx, m['目标'])) score += 1
    if (m['用户'] && matchesDim(taskCtx.user, m['用户'])) score += 1
    if (m['环境'] && matchesDim(taskCtx.env, m['环境'])) score += 1
    if (score > bestScore) { bestScore = score; best = p }
  }
  return bestScore > 0
    ? { profile: best, score: bestScore, mode: 'matched' }
    : { profile: null, score: 0, mode: 'fallback-default' }
}

// ---- 第二层：知识包子集软匹配 ----

// 对单个包打分：whenToUse 语义（W_SEMANTIC）> 文档 tag > 文件名 > 全文
function scorePackage(pkg, taskCtx, docs) {
  const tokens = taskCtx.tokens
  const fullTokens = taskCtx.fullTokens ?? tokens
  const semantic = tokens.reduce((acc, t) => acc + (containsToken(pkg.whenToUse ?? '', t) ? 1 : 0), 0)
  let docScore = 0
  const docHits = []
  for (const doc of docs ?? []) {
    let s = 0
    const rel = doc.rel.toLowerCase()
    let text = ''
    try { text = readFileSync(doc.path, 'utf8').toLowerCase() } catch { /* 读取失败不计分 */ }
    // 短字段（tag/文件名）用全词组含二元组以保召回；全文用 fullTokens 避免逐字噪音
    for (const t of tokens) {
      if ((doc.tags ?? []).some((tag) => containsToken(tag, t))) s += W_TAG
      if (rel.includes(t)) s += W_FILENAME
    }
    for (const t of fullTokens) {
      if (text.includes(t)) s += W_FULLTEXT
    }
    if (s > 0) {
      docScore += s
      docHits.push({ packageId: doc.packageId, rel: doc.rel, path: doc.path, score: s, isEvidence: Boolean(doc.isEvidence) })
    }
  }
  const score = W_SEMANTIC * semantic + docScore
  return { score, semantic, docScore, docHits }
}

function describeReason({ semantic, docScore }) {
  const parts = []
  if (semantic) parts.push(`whenToUse×${W_SEMANTIC}=${semantic * W_SEMANTIC}`)
  if (docScore) parts.push(`docs=${docScore}`)
  return parts.length ? parts.join(' + ') : 'no-hit'
}

// 在 basePackages 内对每个包打分排序；返回带 score 的有序子集
export function matchPackages(taskCtx, basePackages, documents) {
  const docByPkg = new Map()
  for (const d of documents ?? []) {
    if (!docByPkg.has(d.packageId)) docByPkg.set(d.packageId, [])
    docByPkg.get(d.packageId).push(d)
  }
  const scored = []
  for (const pkg of basePackages ?? []) {
    const { score, semantic, docScore, docHits } = scorePackage(pkg, taskCtx, docByPkg.get(pkg.id))
    if (score > 0) {
      scored.push({ ...pkg, score, semanticCount: semantic, docScore, reason: describeReason({ semantic, docScore }), docs: docHits })
    }
  }
  return scored.sort((a, b) => b.score - a.score)
}

// ---- 工具掩码 & lockfile ----

function buildToolMask(matched, selectedPackages, basePackages, fallback) {
  const selectedIds = new Set(selectedPackages.map((p) => p.id))
  const pruned = fallback
    ? []
    : basePackages.filter((p) => !selectedIds.has(p.id)).map((p) => p.id)
  return {
    keep: BASE_TOOLS,
    scope: { profile: matched.profile?.name ?? null, packages: selectedPackages.map((p) => p.id) },
    pruned,
    note: fallback
      ? '命中为空，回退默认（profile 全量、不裁剪）'
      : `按任务裁剪到 ${selectedPackages.length} 个包，保留检索/装配基础工具`,
  }
}

function buildLockfile({ taskCtx, matched, selectedPackages, toolMask, fallback }) {
  return {
    schema: 1,
    generatedAt: new Date().toISOString(),
    goal: taskCtx.goal,
    tokens: taskCtx.tokens,
    profile: matched.profile?.name ?? null,
    mode: fallback ? 'fallback-default' : (matched.profile ? 'profile+soft' : 'soft'),
    packages: selectedPackages
      .map((p) => ({ id: p.id, score: p.score ?? null }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    toolMask: { keep: toolMask.keep, scope: toolMask.scope },
  }
}

// ---- 装配主入口 ----
//
// deps: { index, packages, profiles }
//   index.documents 提供 tag/rel/path/isEvidence；packages 提供 id/whenToUse 等；
//   profiles 来自 listProfiles()（含 match 字段）。
// rawTaskCtx: { goal|target, user, env }
// opts: { topN } 软匹配保留的包数上限（默认 0 = 不截断，只按分数降序）
export function assemble(deps, rawTaskCtx = {}, opts = {}) {
  const { index, packages = [], profiles = [] } = deps
  const taskCtx = normalizeTaskCtx(rawTaskCtx)
  const matched = matchProfile(taskCtx, profiles)
  const basePackages = matched.profile ? resolveProfile(matched.profile, packages) : packages
  const ranked = matchPackages(taskCtx, basePackages, index?.documents ?? [])
  const topN = Number.isFinite(Number(opts.topN)) && Number(opts.topN) > 0 ? Number(opts.topN) : 0
  const selected = topN ? ranked.slice(0, topN) : ranked
  const fallback = selected.length === 0
  const selectedPackages = fallback ? basePackages : selected
  const selectedIds = new Set(selectedPackages.map((p) => p.id))
  const scopedIndex = (index?.documents ?? []).filter((d) => selectedIds.has(d.packageId))
  const toolMask = buildToolMask(matched, selectedPackages, basePackages, fallback)
  const lockfile = buildLockfile({ taskCtx, matched, selectedPackages, toolMask, fallback })

  return {
    taskCtx,
    profile: matched.profile ?? null,
    mode: fallback ? 'fallback-default' : (matched.profile ? 'profile+soft' : 'soft'),
    matchScore: matched.score,
    packages: selectedPackages,
    documents: scopedIndex,
    toolMask,
    lockfile,
  }
}
