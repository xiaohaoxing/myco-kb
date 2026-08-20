#!/usr/bin/env node
import { homedir } from 'node:os'
import { join } from 'node:path'
import { Myco } from '../lib/core/myco.js'

const dataDir = process.env.MYCO_DATA ?? join(homedir(), '.myco')
const [cmd, ...args] = process.argv.slice(2)

function usage() {
  console.log(`myco — MyCo-KB 知识库管理器

用法:
  myco init [dir]           初始化知识包清单 kb.yaml（默认当前目录）
  myco mount <spec>         挂载知识根（repo:/path | local:name | cloud:name | 直接路径）
  myco mounts               列出已挂载知识根
  myco unmount <spec>       移除挂载
  myco index                重建跨包索引
  myco status               维护状态（写入 data/status.json）
  myco find <关键词...>      检索（tag×3 / 文件名×2 / 全文×1）
  myco profile list         列出组合配置
  myco profile use <name>   激活组合配置
  myco sweep                生命周期候选扫描（仅报告）
  myco cloud add <n> <url>  注册云端知识根（git 仓库）
  myco cloud list           列出云端根
  myco cloud remove <n>     移除云端根
  myco cloud sync [n]       同步云端包（clone/pull/push，默认全部）
  myco daemon               前台运行守护（watcher + 定时维护 + 云同步）
  myco install-skills       安装 skills/ 到 ~/.agents/skills/

环境变量:
  MYCO_DATA                 数据目录（默认 ~/.myco）
`)
}

function renderStatus(s) {
  const lines = []
  lines.push(`MyCo-KB 状态  (生成于 ${s.generatedAt})`)
  lines.push(`知识包: ${s.counts.packages}  文档: ${s.counts.documents}  tag: ${s.counts.tags}  生命周期候选: ${s.lifecycleCandidates}`)
  lines.push(`索引: ${s.index.lastIndexedAt ?? '未索引'}  激活 profile: ${s.activeProfile ?? '（无）'}`)
  if (s.errors.length > 0) {
    lines.push('挂载错误:')
    for (const e of s.errors) lines.push(`  ${e.spec}: ${e.reason}`)
  }
  for (const p of s.packages) lines.push(`- ${p.id}  [${p.scope}] v${p.version} ${p.state}  ${p.path}`)
  return lines.join('\n')
}

async function main() {
  const myco = new Myco({ dataDir })
  switch (cmd) {
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      usage()
      return
    case 'init': {
      const dir = args[0] ?? process.cwd()
      const written = myco.initManifest(dir)
      console.log(written ? `已创建 ${dir}/kb.yaml` : `已存在 ${dir}/kb.yaml，跳过`)
      return
    }
    case 'mount': {
      if (!args[0]) throw new Error('用法: myco mount <spec>')
      const added = myco.addMount(args[0])
      console.log(added ? `已挂载 ${args[0]}` : `已存在 ${args[0]}`)
      return
    }
    case 'mounts': {
      for (const m of myco.mounts()) console.log(`${m.enabled ? '✓' : '✗'} ${m.spec}  (${m.scope})`)
      return
    }
    case 'unmount': {
      if (!args[0]) throw new Error('用法: myco unmount <spec>')
      myco.removeMount(args[0])
      console.log(`已移除 ${args[0]}`)
      return
    }
    case 'index': {
      const r = myco.reindex()
      console.log(`索引完成: ${r.counts.documents} 篇文档 / ${r.counts.tags} 个 tag / ${r.packages.length} 个知识包`)
      for (const e of r.errors) console.error(`警告: ${e.spec}: ${e.reason}`)
      return
    }
    case 'status': {
      console.log(renderStatus(myco.status()))
      return
    }
    case 'find': {
      if (args.length === 0) throw new Error('用法: myco find <关键词...>')
      const hits = myco.find(args.join(' '))
      if (hits.length === 0) { console.log('无命中'); return }
      for (const h of hits) console.log(`${h.score}  ${h.packageId}/${h.rel}${h.isEvidence ? '  [证据]' : ''}`)
      return
    }
    case 'profile': {
      const sub = args[0]
      if (sub === 'list' || sub === undefined) {
        for (const p of myco.listProfiles()) console.log(`${p.name}  include: ${(p.include ?? []).join(', ') || '全部'}`)
        return
      }
      if (sub === 'use') {
        if (!args[1]) throw new Error('用法: myco profile use <name>')
        myco.useProfile(args[1])
        console.log(`已激活 profile: ${args[1]}`)
        return
      }
      throw new Error(`未知子命令: ${sub}`)
    }
    case 'sweep': {
      const r = myco.sweep()
      if (r.candidates.length === 0) { console.log('暂无生命周期候选'); return }
      for (const c of r.candidates) console.log(`[${c.kind}] ${c.packageId}/${c.rel} — ${c.reason}`)
      return
    }
    case 'cloud': {
      const sub = args[0]
      if (sub === 'add') {
        if (!args[1] || !args[2]) throw new Error('用法: myco cloud add <name> <url> [branch]')
        const root = myco.cloudAdd(args[1], args[2], { branch: args[3] ?? 'main' })
        console.log(`已注册云端根 ${args[1]} → ${root.url}（branch: ${root.branch}，clone 到 ${root.path}）`)
        console.log('提示: 之后用 `myco mount cloud:' + args[1] + '` 挂载，`myco cloud sync ' + args[1] + '` 同步')
        return
      }
      if (sub === 'list') {
        for (const c of myco.cloudList()) console.log(`${c.name}  ${c.url || '(无 url)'}  [${c.branch}]  ${c.path}`)
        return
      }
      if (sub === 'remove') {
        if (!args[1]) throw new Error('用法: myco cloud remove <name>')
        myco.cloudRemove(args[1])
        console.log(`已移除云端根 ${args[1]}`)
        return
      }
      if (sub === 'sync') {
        const r = args[1] ? await myco.syncPackage(args[1]) : await myco.syncAll()
        const list = Array.isArray(r?.results) ? r.results : [r]
        for (const item of list) {
          if (item.ok) {
            const detail = item.action === 'cloned' ? 'clone 完成' : `stages: ${item.stages?.join(' → ') ?? ''}`
            console.log(`✓ ${item.name}: ${detail}`)
          } else {
            console.log(`✗ ${item.name}: ${item.error}${item.stage ? `（失败于 ${item.stage}）` : ''}`)
          }
        }
        return
      }
      throw new Error(`未知子命令: ${sub}`)
    }
    case 'daemon': {
      myco.daemon()
      return
    }
    case 'install-skills': {
      const target = join(homedir(), '.agents', 'skills')
      const copied = myco.installSkills(target)
      console.log(copied ? `技能已安装到 ${target}` : '复制失败，请检查 skills/ 目录')
      return
    }
    default:
      throw new Error(`未知命令: ${cmd}`)
  }
}

main().catch((err) => {
  console.error(String(err?.message ?? err))
  process.exitCode = 1
})
