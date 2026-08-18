import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { extractTags, parseFrontmatter } from './frontmatter.js'

const SKIP_DIRS = new Set(['.git', 'node_modules', '.obsidian', '.trash', 'data', '.myco', '_归档'])

// 递归收集目录下所有 .md（跳过隐藏目录与 SKIP_DIRS）
export function walkMd(root, skip = SKIP_DIRS) {
  const out = []
  const stack = [root]
  while (stack.length > 0) {
    const dir = stack.pop()
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { continue }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || skip.has(entry.name)) continue
      const p = join(dir, entry.name)
      if (entry.isDirectory()) stack.push(p)
      else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') out.push(p)
    }
  }
  return out
}

// 构建跨包倒排索引：tag → [{packageId, rel}]；documents 带 证据 标记与 mtime
export function buildIndex(packages) {
  const tags = new Map()
  const documents = []
  for (const pkg of packages ?? []) {
    for (const file of walkMd(pkg.path)) {
      let text
      let stat
      try { text = readFileSync(file, 'utf8'); stat = statSync(file) } catch { continue }
      const { frontmatter } = parseFrontmatter(text)
      const tagList = extractTags(frontmatter)
      const rel = relative(pkg.path, file)
      const isEvidence = tagList.includes('证据')
      documents.push({ packageId: pkg.id, path: file, rel, tags: tagList, isEvidence, mtime: stat.mtimeMs })
      for (const tag of tagList) {
        if (!tags.has(tag)) tags.set(tag, [])
        tags.get(tag).push({ packageId: pkg.id, rel, path: file })
      }
    }
  }
  return {
    tags: Object.fromEntries(tags),
    documents,
    counts: { documents: documents.length, tags: tags.size },
  }
}
