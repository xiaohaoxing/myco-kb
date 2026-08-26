// v0.4 任务上下文归一化（纯 Node，零依赖）
//
// 目标：把 agent 收到的任务描述规约成一个可匹配的 taskCtx
//   { goal/target, user, env, tokens }
// 供装配引擎做「任务 → 知识包子集 → 工具面裁剪」的匹配打分。
//
// 与 find 一样遵循「词条纪律」：全库命名空间 tag 视为停用词不参与匹配。

const STOP = new Set([
  // 通用英文停用词
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'at', 'is', 'are', 'it',
  // 通用中文停用词（弱语义，避免打分噪音）
  '的', '了', '和', '与', '或', '在', '是', '为', '把', '让', '我', '你', '它', '这', '那', '一', '上', '下', '中', '要', '能', '会',
])

// ASCII 词：字母数字 + 内部连字符/点/下划线（覆盖 api-gateway、dsh-tools 这类连字词）
const ASCII_RE = /[a-z0-9][a-z0-9._-]*/g
// CJK 连续串（含扩展 A/B 区，覆盖生僻字）
const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff]+/g

// 任务文本 → 词表（去停用词；CJK 串补二元组以支持中文子串命中）
//
// 为什么给 CJK 跑二元组：中文没有空格分词，若只按整段切，`网关生产步骤` 会成为一个
// 无法与 `生产` / `网关` 这类 tag 对上的词；二元组让子串命中成为可能。ASCII 词
// 本身对连字词（api-gateway）保留整词，命中靠子串判断。
//
// opts.ngrams=false 时不加 CJK 二元组（只保留整段）——用于全文检索，避免二元组在
// 长文本里造成逐字噪音（一个偶然子串命中就把无关包剪进子集）。
export function tokenize(text, opts = {}) {
  const ngrams = opts.ngrams !== false
  const s = String(text ?? '').toLowerCase()
  const tokens = new Set()
  for (const m of s.matchAll(ASCII_RE)) {
    const w = m[0]
    if (w.length >= 2 && !STOP.has(w)) tokens.add(w)
  }
  for (const m of s.matchAll(CJK_RE)) {
    const run = m[0]
    tokens.add(run)
    if (ngrams && run.length >= 2) {
      for (let i = 0; i + 2 <= run.length; i++) tokens.add(run.slice(i, i + 2))
    }
  }
  return [...tokens]
}

// 规约任务上下文：合并 goal/target 别名，产出统一 taskCtx
// tokens          含 CJK 二元组（短字段召回：whenToUse/tag/文件名）
// fullTokens      不含 CJK 二元组（全文信号，避免逐字噪音）
export function normalizeTaskCtx({ goal, target, user, env } = {}) {
  const g = String(goal ?? target ?? '').trim()
  return {
    goal: g,
    target: g,
    user: String(user ?? '').trim(),
    env: String(env ?? '').trim(),
    tokens: tokenize(g),
    fullTokens: tokenize(g, { ngrams: false }),
  }
}
