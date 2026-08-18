// 最小 frontmatter + 扁平 YAML 子集解析（零依赖）
// 支持：--- 块；`key: value`、`key: [a, b]`、`key: "quoted"`、布尔；`#` 注释
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!m) return { frontmatter: {}, body: text }
  return { frontmatter: parseFlatYaml(m[1]), body: text.slice(m[0].length) }
}

export function parseFlatYaml(text) {
  const out = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (value.startsWith('[') && value.endsWith(']')) {
      out[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    } else if (/^["'].*["']$/.test(value)) {
      out[key] = value.slice(1, -1)
    } else if (value === 'true') out[key] = true
    else if (value === 'false') out[key] = false
    else out[key] = value
  }
  return out
}

// 从 frontmatter 提取 tags：数组或逗号/空格分隔字符串
export function extractTags(frontmatter) {
  const raw = frontmatter.tags
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') return raw.split(/[\s,，]+/).filter(Boolean)
  return []
}
