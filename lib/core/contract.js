// 契约块与强引用解析（v0.5 知识更新流）
// 语法（ADR-010 C，Obsidian callout 兼容）：
//   > [!myco-contract] interaction-rate v3
//   > 互动率 = 互动量 / 曝光量（窗口内聚合，不按天累加）
// 强引用：[[数据指标口径#interaction-rate]] —— 引用方对契约的传播边。
// 普通 [[链接]] 与 [[页#普通锚点]] 是弱引用（导航），不构成传播边。

const CONTRACT_CALLOUT = /^>\s*\[!myco-contract\]\s*([^\s]+)(?:\s+v?([0-9]+))?\s*$/i
const WIKI_LINK = /\[\[([^\]|#]+)(#[^\]|]+)?(?:\|[^\]]+)?\]\]/g

/**
 * 从 markdown 文本解析契约块。
 * @returns [{ id, version, content, startLine, endLine }]
 */
export function parseContracts(text) {
  const contracts = []
  const lines = text.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const m = CONTRACT_CALLOUT.exec(lines[i])
    if (m) {
      const id = m[1]
      const version = m[2] ? Number(m[2]) : 1
      const contentLines = []
      let j = i + 1
      while (j < lines.length && /^>\s?/.test(lines[j]) && !/^>\s*\[!/.test(lines[j])) {
        contentLines.push(lines[j].replace(/^>\s?/, ''))
        j += 1
      }
      contracts.push({
        id,
        version,
        content: contentLines.join('\n').trim(),
        startLine: i + 1,
        endLine: j,
      })
      i = j
      continue
    }
    i += 1
  }
  return contracts
}

/**
 * 提取文本里的 wiki 引用（跳过 ``` 代码块内的引用——示例不算依赖）。
 * @returns [{ target, anchor, label }]
 */
export function extractWikiRefs(text) {
  const refs = []
  const lines = text.split(/\r?\n/)
  let inCode = false
  const body = []
  for (const line of lines) {
    // 只跳过 ``` 代码块（::: fenced div 可能嵌套在代码块内，误识别会搞乱状态）
    if (/^\s*(```|~~~)/.test(line)) {
      inCode = !inCode
      continue
    }
    if (!inCode) body.push(line)
  }
  for (const m of body.join('\n').matchAll(WIKI_LINK)) {
    refs.push({ target: m[1].trim(), anchor: m[2] ? m[2].slice(1) : null, label: m[3] ?? null })
  }
  return refs
}

/**
 * 提取契约强引用（[[页#契约id]]，锚点命中已知契约才构成传播边）。
 * @param text 引用方页面文本
 * @param knownContractIds 当前库已知契约 id 集合（用于区分普通锚点）
 * @returns [{ target, contractId }]
 */
export function extractContractRefs(text, knownContractIds) {
  return extractWikiRefs(text)
    .filter((r) => r.anchor && knownContractIds.has(r.anchor))
    .map((r) => ({ target: r.target, contractId: r.anchor }))
}

/**
 * 语义化版本 bump 判定（ADR-009 简化版 v0.5）：
 *  - 契约块内容变化（version 号或内容 diff）→ 'major'（breaking，强引用传播）
 *  - 页面普通内容变化 → 'patch'
 *  - 新增页面 → 'minor'
 */
export function classifyBump({ contractChanged, isNew }) {
  if (isNew) return 'minor'
  if (contractChanged) return 'major'
  return 'patch'
}
