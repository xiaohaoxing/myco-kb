import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseFlatYaml } from './frontmatter.js'

const DEFAULT_MANIFEST = { version: '0.1.0', state: 'evergreen' }

// 读取知识包清单：优先 kb.yaml（扁平 YAML 子集），其次 kb.json
export function readManifest(dir) {
  const kbYaml = join(dir, 'kb.yaml')
  const kbJson = join(dir, 'kb.json')
  if (existsSync(kbYaml)) {
    const parsed = parseFlatYaml(readFileSync(kbYaml, 'utf8'))
    return { ...DEFAULT_MANIFEST, ...parsed, manifestFile: 'kb.yaml' }
  }
  if (existsSync(kbJson)) {
    const parsed = JSON.parse(readFileSync(kbJson, 'utf8'))
    return { ...DEFAULT_MANIFEST, ...parsed, manifestFile: 'kb.json' }
  }
  return null
}
