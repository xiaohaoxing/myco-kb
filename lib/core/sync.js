// 云端 git 同步原语（v0.3）
// 零依赖：child_process 调用系统 git（git 就是版本源决策的一部分，机器必有）。
// 安全：远程 URL 不写 token；凭据走系统 credential helper 或环境变量（GIT_* 或 ssh-agent）。
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export class GitError extends Error {
  constructor(message, { code, stderr } = {}) {
    super(message)
    this.code = code
    this.stderr = stderr
  }
}

// 在 repoPath 下执行 git 命令（非交互、超时、防注入：参数数组直传，不经 shell）
export async function runGit(repoPath, args, options = {}) {
  const { timeoutMs = 120e3, env } = options
  // cwd 必须已存在，否则 spawn 报误导性的 ENOENT；不存在时回退当前目录
  const cwd = existsSync(repoPath) ? repoPath : process.cwd()
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd,
      timeout: timeoutMs,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...env },
      maxBuffer: 16 * 1024 * 1024,
    })
    return { stdout: stdout.trim(), stderr: stderr.trim() }
  } catch (err) {
    throw new GitError(`git ${args[0]} 失败: ${err?.message ?? err}`, {
      code: err?.code,
      stderr: err?.stderr,
    })
  }
}

// 规范化 cloud 根配置：兼容字符串 path（旧格式）与 { url, path, branch }
export function normalizeCloudRoot(mount, config = {}) {
  const value = mount.spec.replace(/^cloud:/, '')
  const root = config.cloudRoots?.[value]
  if (typeof root === 'string') {
    return { name: value, url: '', path: root, branch: 'main', synced: false }
  }
  if (root && typeof root === 'object') {
    return {
      name: value,
      url: root.url ?? '',
      path: root.path ?? '',
      branch: root.branch ?? 'main',
      synced: Boolean(root.url && root.path),
    }
  }
  return { name: value, url: '', path: '', branch: 'main', synced: false }
}

export function isGitRepo(path) {
  return existsSync(join(path, '.git'))
}

// 本地无 HEAD（空 clone）时初始化分支
export async function ensureBranch(repoPath, branch) {
  if (!isGitRepo(repoPath)) return
  const hasHead = await runGit(repoPath, ['rev-parse', '--verify', 'HEAD'])
    .then(() => true)
    .catch(() => false)
  if (!hasHead) await runGit(repoPath, ['checkout', '-b', branch])
}

// 远端分支是否存在（空远端 = 无可拉取）
export async function remoteBranchExists(repoPath, branch) {
  return runGit(repoPath, ['rev-parse', '--verify', `origin/${branch}`])
    .then(() => true)
    .catch(() => false)
}

// 状态探测：分支 / ahead / behind / dirty
export async function gitStatus(repoPath) {
  if (!isGitRepo(repoPath)) return { isRepo: false }
  let branch = 'main'
  try { branch = (await runGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])).stdout || branch } catch { /* detached */ }
  // rev-list --left-right --count 输出: "<HEAD独有> <upstream独有>"
  const { stdout: aheadBehind } = await runGit(repoPath, [
    'rev-list', '--left-right', '--count', `HEAD...@{upstream}`, '--',
  ]).catch(() => ({ stdout: '0 0' }))
  const [ahead, behind] = aheadBehind.split(/\s+/).map((n) => Number(n) || 0)
  const { stdout: porcelain } = await runGit(repoPath, ['status', '--porcelain'])
  return { isRepo: true, branch, ahead, behind, dirty: porcelain.length > 0, changedFiles: porcelain ? porcelain.split('\n').filter(Boolean).length : 0 }
}

export async function gitClone(url, dir) {
  // 先确保父目录存在（clone 目标目录与父级都可能尚未创建）
  mkdirSync(dirname(dir), { recursive: true })
  await runGit(dirname(dir), ['clone', '--', url, dir])
}

export async function gitFetch(repoPath, branch) {
  await runGit(repoPath, ['fetch', 'origin', branch])
}

// 拉取：fetch + ff-only merge（失败 = 分叉/冲突，报告，不自动解决）
export async function gitPull(repoPath, branch) {
  await gitFetch(repoPath, branch)
  await runGit(repoPath, ['merge', '--ff-only', `origin/${branch}`])
}

// 提交全部未提交改动（message 自动生成）
export async function gitCommitAll(repoPath, message) {
  await runGit(repoPath, ['add', '-A'])
  await runGit(repoPath, ['commit', '-m', message])
}

export async function gitPush(repoPath, branch) {
  await runGit(repoPath, ['push', 'origin', `HEAD:${branch}`])
}

// 变更摘要（commit message 用）：前 N 个变更文件路径
export async function gitChangedSummary(repoPath, n = 8) {
  const { stdout } = await runGit(repoPath, ['status', '--porcelain'])
  const lines = stdout.split('\n').filter(Boolean).slice(0, n)
  return lines.map((l) => l.trim().replace(/^[MADRCU?!]+\s+/, '')).join(', ')
}

/**
 * 同步一个 cloud 知识包：clone（缺失时）→ pull（ff-only）→ commit 本地改动 → push。
 * 任何一步失败都抛 GitError 并携带已执行到的阶段；冲突/分叉不自动解决。
 */
export async function syncCloudPackage(mount, config = {}, options = {}) {
  const root = normalizeCloudRoot(mount, config)
  if (!root.synced) return { ...root, ok: false, error: '未配置 url/path（config.cloudRoots）' }

  if (!existsSync(root.path)) {
    await gitClone(root.url, root.path)
    // 空仓库 clone：初始化本地分支（远端无 commit，pull/push 需要 HEAD）
    await ensureBranch(root.path, root.branch)
    return { ...root, ok: true, action: 'cloned', pulled: 0, pushed: 0, commits: [] }
  }

  const stage = []
  const results = []
  try {
    if (!isGitRepo(root.path)) throw new GitError(`${root.path} 不是 git 仓库`)

    // 空仓库兜底：本地无 HEAD 时初始化分支
    await ensureBranch(root.path, root.branch)

    // 1. 拉取（远端分支存在才拉；空远端跳过）
    const before = await gitStatus(root.path)
    if (await remoteBranchExists(root.path, root.branch)) {
      stage.push('pull')
      await gitPull(root.path, root.branch)
    }
    const afterPull = await gitStatus(root.path)
    results.push({ stage: stage.includes('pull') ? 'pull' : 'skip-pull', behind: before.behind, pulled: Math.max(afterPull.ahead - before.ahead, 0) })

    // 2. 本地改动 → commit
    if (afterPull.dirty) {
      const summary = (await gitChangedSummary(root.path)) || 'unknown'
      await gitCommitAll(root.path, `myco: sync ${new Date().toISOString().slice(0, 19).replace('T', ' ')} — ${summary}`)
      results.push({ stage: 'commit', files: afterPull.changedFiles })
      stage.push('commit')
    }

    // 3. 推送
    const beforePush = await gitStatus(root.path)
    if (beforePush.ahead > 0 || stage.includes('commit')) {
      await gitPush(root.path, root.branch)
      results.push({ stage: 'push', commits: beforePush.ahead })
      stage.push('push')
    }

    const final = await gitStatus(root.path)
    return {
      ...root,
      ok: true,
      action: 'synced',
      stages: stage,
      details: results,
      final: { branch: final.branch, ahead: final.ahead, behind: final.behind, dirty: final.dirty },
    }
  } catch (err) {
    return {
      ...root,
      ok: false,
      stage: stage.join('>') || 'init',
      error: err?.message ?? String(err),
    }
  }
}
