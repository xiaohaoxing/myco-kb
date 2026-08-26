// myco upgrade：查询 GitHub Releases 最新版 + 下载自包含安装器 + 校验 sha256。
// 纯 Node，无第三方依赖（fetch 来自 Node ≥18 全局）。
import { createHash } from 'node:crypto'

// 默认仓库（可在 upgrade 命令行覆盖？暂固定；发布仓库见 setup）
export const DEFAULT_REPO = 'xiaohaoxing/myco-kb'

export function normalizeVersion(v) {
  return String(v ?? '').replace(/^v/, '').trim()
}

// 简单 semver 比较（数字段）；candidate 严格大于 current 才返回 true
export function isNewer(candidate, current) {
  const toArr = (s) => normalizeVersion(s).split('.').map((n) => parseInt(String(n).trim(), 10) || 0)
  const c = toArr(candidate)
  const cur = toArr(current)
  const len = Math.max(c.length, cur.length)
  for (let i = 0; i < len; i++) {
    const a = c[i] ?? 0
    const b = cur[i] ?? 0
    if (a > b) return true
    if (a < b) return false
  }
  return false
}

// 最新 release：{ tag, version, url, assets: [{name,url}] }
export async function latestRelease({ repo = DEFAULT_REPO } = {}) {
  const url = `https://api.github.com/repos/${repo}/releases/latest`
  const res = await fetch(url, { headers: { 'user-agent': 'myco-kb-upgrade' } })
  if (!res.ok) throw new Error(`GitHub API 请求失败（HTTP ${res.status}）：${url}`)
  const data = await res.json()
  return {
    tag: normalizeVersion(data.tag_name),
    version: normalizeVersion(data.tag_name),
    url: data.html_url ?? '',
    assets: (data.assets ?? []).map((a) => ({ name: a.name, url: a.browser_download_url })),
  }
}

export function findInstallerAsset(assets, version) {
  const name = `myco-install-${normalizeVersion(version)}.sh`
  return (assets ?? []).find((a) => a.name === name) ?? null
}

export function findShaAsset(assets, version) {
  const name = `myco-install-${normalizeVersion(version)}.sh.sha256`
  return (assets ?? []).find((a) => a.name === name) ?? null
}

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

// 下载一个 asset 为 Buffer
export async function download(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`下载失败（HTTP ${res.status}）：${url}`)
  return Buffer.from(await res.arrayBuffer())
}

// 校验 sha256：兼容「裸 hex」或「<hex>  文件名」（sha256 文件常见格式），取第一个 token 比对
export function checkSha256(buf, expectedHex) {
  const token = String(expectedHex ?? '').trim().split(/\s+/)[0] || ''
  return sha256(buf) === token
}
