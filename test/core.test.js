import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { extractTags, parseFrontmatter } from '../lib/core/frontmatter.js'
import { buildIndex } from '../lib/core/indexer.js'
import { sweep } from '../lib/core/sweeper.js'

test('parseFrontmatter 解析 tags 列表与字符串字段', () => {
  const { frontmatter, body } = parseFrontmatter('---\ntags: [a, b]\ntitle: "x"\n---\n# 正文')
  assert.deepEqual(extractTags(frontmatter), ['a', 'b'])
  assert.equal(frontmatter.title, 'x')
  assert.ok(body.includes('# 正文'))
})

test('buildIndex 构建倒排索引并标记证据页', () => {
  const dir = mkdtempSync(join(tmpdir(), 'myco-test-'))
  mkdirSync(join(dir, 'sub'))
  writeFileSync(join(dir, 'a.md'), '---\ntags: [部署, 常青]\n---\n内容')
  writeFileSync(join(dir, 'sub', 'b.md'), '---\ntags: [证据]\n---\n内容')
  const index = buildIndex([{ id: 't', path: dir }])
  assert.equal(index.counts.documents, 2)
  assert.equal(index.tags['部署'].length, 1)
  assert.ok(index.documents.some((d) => d.isEvidence))
})

test('sweep 报告孤页候选', () => {
  const dir = mkdtempSync(join(tmpdir(), 'myco-test-'))
  writeFileSync(join(dir, 'orphan.md'), '---\ntags: [a]\n---\n无链接')
  const index = buildIndex([{ id: 't', path: dir }])
  const { candidates } = sweep(index, {})
  assert.ok(candidates.some((c) => c.kind === 'review'))
})
