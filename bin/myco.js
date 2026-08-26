#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createInterface } from 'node:readline'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { Myco } from '../lib/core/myco.js'
import { latestRelease, isNewer, findInstallerAsset, findShaAsset, download, checkSha256 } from '../lib/upgrade.js'

const dataDir = process.env.MYCO_DATA ?? join(homedir(), '.myco')
const [cmd, ...args] = process.argv.slice(2)

// 当前已安装版本：优先取 DSH profile 版本化安装的 .active，否则回退到本包版本
function installedVersion() {
  const profile = process.env.DSH_PROFILE ?? join(homedir(), '.dsh', 'profiles', 'web')
  const active = join(profile, 'node_modules', '@dsh', '.myco-kb-versions', '.active')
  try {
    const v = readFileSync(active, 'utf8').trim()
    if (v) return v
  } catch { /* 非版本化安装（dev 符号链接）则回退 */ }
  try {
    return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
  } catch {
    return '0.0.0'
  }
}

function askYN(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(`${question} [y/N] `, (ans) => {
      rl.close()
      resolve(/^y(es)?$/i.test(ans.trim()))
    })
  })
}

function usage() {
  console.log(`myco — MyCo-KB 知识库管理器

用法:
  myco init                 初始化默认知识库 ~/.myco-kb（新用户安装即用）
  myco init <dir>            在指定目录写 kb.yaml
  myco mount <spec>         挂载知识根（repo:/path | local:name | cloud:name | 直接路径）
  myco mounts               列出已挂载知识根
  myco unmount <spec>       移除挂载
  myco index                重建跨包索引
  myco status               维护状态（写入 data/status.json）
  myco find <关键词...>      检索（tag×3 / 文件名×2 / 全文×1）
  myco profile list         列出组合配置
  myco profile use <name>   激活组合配置
  myco sweep                生命周期候选扫描（仅报告）
  myco cloud add <n> <url>  注册云端知识根（git 仓库；默认不自动同步，--sync 订阅）
  myco cloud sync on <n>    订阅云端包（进自动同步名单，opt-in）
  myco cloud sync off <n>   退订云端包（不再自动同步）
  myco cloud list           列出云端根（🔔=已订阅）
  myco cloud remove <n>     移除云端根
  myco cloud sync [n]       同步云端包（默认只同步已订阅；指定 n 手动强制同步）
  myco remote set <spec> <url>  绑定本地包远程（git 目录会警告）；repo 包即可同步
  myco remote list / clear      列出/解除远程绑定
  myco sync on/off <spec>       订阅/退订包的自动同步（repo 需先 remote set）
  myco sync [spec]              同步（默认只同步已订阅；指定 spec 手动强制）
  myco scan                 变更检测（内容 hash 对比 → 变更事件）
  myco events [n]           变更事件日志
  myco impact <eventId>     影响分析（染色/传播集，传播集自动标 stale）
  myco stale                列出 stale（待确认受影响节点）
  myco stale clear <node>   确认解除 stale
  myco contracts            列出全库契约块
  myco webhook set <url>    设置 webhook url（留空 = 清除）
  myco webhook show         显示当前配置
  myco webhook test         发送测试消息
  myco telemetry status     显示遥测配置与本次将上报的聚合指标（匿名，不含任何知识内容）
  myco telemetry set <url>  设置上报 url（未配置 url 不发送；设置后才定时上报）
  myco telemetry on/off     启用/关闭聚合遥测（MYCO_TELEMETRY=0 整机禁用）
  myco telemetry now        立即上报一次（配置校验）
  myco upgrade              检查 GitHub Releases 最新版并自动升级（--yes 跳过确认）
  myco daemon               前台运行守护（watcher + 定时维护 + 云同步 + 定时遥测）
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
      // 无参数：初始化默认知识库 ~/.myco-kb（新用户安装即用）；有参数：在指定目录写 kb.yaml
      if (!args[0]) {
        const dir = myco.ensureDefaultKb()
        console.log(`✓ 默认知识库就绪: ${dir}`)
        console.log('  - 可用 Obsidian 打开该目录作为 vault')
        console.log('  - 已自动挂载（`myco mounts` 查看）')
        console.log('  - 想用已有知识库路径：`myco mount repo:/path/to/your/vault`')
        return
      }
      const dir = args[0]
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
    case 'remote': {
      const sub = args[0]
      if (sub === 'set') {
        if (!args[1] || !args[2]) throw new Error('用法: myco remote set <spec> <url>')
        const r = myco.setRemote(args[1], args[2])
        if (r.warning) console.log(r.warning)
        console.log(`✓ 已绑定 ${args[1]} → ${args[2]}`)
        console.log('  订阅自动同步：`myco sync on ' + args[1] + '`；手动同步：`myco sync ' + args[1] + '`')
        return
      }
      if (sub === 'list' || sub === undefined) {
        const remotes = myco.listRemotes()
        if (remotes.length === 0) { console.log('无绑定远程的包'); return }
        for (const r of remotes) console.log(`${r.sync ? '🔔' : '○'} ${r.spec}  →  ${r.remote}`)
        return
      }
      if (sub === 'clear') {
        if (!args[1]) throw new Error('用法: myco remote clear <spec>')
        myco.clearRemote(args[1])
        console.log(`已解除 ${args[1]} 的远程绑定`)
        return
      }
      throw new Error(`未知子命令: ${sub}`)
    }
    case 'sync': {
      const sub = args[0]
      if (sub === 'on' || sub === 'off') {
        if (!args[1]) throw new Error(`用法: myco sync ${sub} <spec>`)
        myco.setSync(args[1], sub === 'on')
        console.log(`${sub === 'on' ? '✓ 已订阅' : '✓ 已退订'}: ${args[1]}（repo 包需先 remote set 绑定远程）`)
        return
      }
      if (args[0]) {
        const r = await myco.syncPackage(args[0])
        if (r.ok) {
          console.log(`✓ ${r.name}: ${r.action === 'cloned' ? 'clone 完成' : `stages: ${r.stages?.join(' → ') ?? ''}`}`)
        } else {
          console.log(`✗ ${r.name}: ${r.error}${r.stage ? `（失败于 ${r.stage}）` : ''}`)
        }
        return
      }
      const r = await myco.syncAll()
      const list = r.results
      if (list.length === 0) { console.log('无已订阅的同步包（cloud sync on / sync on 订阅）'); return }
      for (const item of list) {
        if (item.ok) console.log(`✓ ${item.name}: ${item.action === 'cloned' ? 'clone 完成' : `stages: ${item.stages?.join(' → ') ?? ''}`}`)
        else console.log(`✗ ${item.name}: ${item.error}${item.stage ? `（失败于 ${item.stage}）` : ''}`)
      }
      return
    }
    case 'cloud': {
      const sub = args[0]
      if (sub === 'add') {
        if (!args[1] || !args[2]) throw new Error('用法: myco cloud add <name> <url> [branch] [--sync]')
        const sync = args.includes('--sync')
        const root = myco.cloudAdd(args[1], args[2], { branch: args[3] ?? 'main', sync })
        console.log(`已注册云端根 ${args[1]} → ${root.url}（branch: ${root.branch}，clone 到 ${root.path}）`)
        console.log(sync
          ? '✓ 已订阅同步（进自动同步名单）'
          : 'ℹ 默认不自动同步（opt-in）：`myco cloud sync on ' + args[1] + '` 订阅后才进自动同步；手动 `myco cloud sync ' + args[1] + '` 随时可同步')
        return
      }
      if (sub === 'sync' && (args[1] === 'on' || args[1] === 'off')) {
        if (!args[2]) throw new Error(`用法: myco cloud sync ${args[1]} <name>`)
        myco.cloudSubscribe(args[2], args[1] === 'on')
        console.log(`${args[1] === 'on' ? '✓ 已订阅' : '✓ 已退订'}: ${args[2]}（${args[1] === 'on' ? '进自动同步名单' : '不再自动同步，手动 sync 仍可用'}）`)
        return
      }
      if (sub === 'list') {
        for (const c of myco.cloudList()) console.log(`${c.sync ? '🔔' : '○'} ${c.name}  ${c.url || '(无 url)'}  [${c.branch}]  ${c.path}`)
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
        // sync 后自动变更检测（pull 的新内容立即进事件流，与 daemon 行为一致）
        const events = myco.scanChanges()
        if (events.length > 0) {
          console.log('--- 变更检测（pull 新内容）---')
          for (const e of events) console.log(`#${e.id} [${e.bump}] ${e.packageId}/${e.rel}${e.contractId ? `  契约:${e.contractId}` : ''}`)
          for (const e of events) {
            if (e.bump === 'major') {
              const r2 = await myco.impact(e.id)
              if (r2.spread.length > 0 || r2.pkgSpread.length > 0) console.log(`→ 事件 #${e.id} 已标 stale（待确认），\`myco stale\` 查看`)
              // CLI 手动同步路径也发通知（与 daemon 行为一致）
              myco.notifyMajor(e, r2).catch(() => {})
            }
          }
        }
        return
      }
      throw new Error(`未知子命令: ${sub}`)
    }
    case 'scan': {
      const events = myco.scanChanges()
      if (events.length === 0) { console.log('无变更'); return }
      for (const e of events) console.log(`#${e.id} [${e.bump}] ${e.packageId}/${e.rel}${e.contractId ? `  契约:${e.contractId}` : ''}`)
      return
    }
    case 'events': {
      const events = myco.listEvents(args[0] ? Number(args[0]) : 20)
      if (events.length === 0) { console.log('暂无事件'); return }
      for (const e of events) console.log(`#${e.id} [${e.bump}] ${e.packageId}/${e.rel}  ${e.kind}${e.contractId ? `  ${e.contractId}` : ''}  ${e.at}`)
      return
    }
    case 'impact': {
      if (!args[0]) throw new Error('用法: myco impact <eventId>')
      const r = await myco.impact(Number(args[0]))
      console.log(`事件 #${r.event.id} [${r.event.bump}] ${r.event.packageId}/${r.event.rel}${r.event.contractId ? `  契约:${r.event.contractId}` : ''}`)
      console.log(`染色（同包派生）: ${r.dye.length ? r.dye.map((d) => `${d.packageId}/${d.rel}`).join(', ') : '无'}`)
      console.log(`传播（跨包引用）: ${r.spread.length ? r.spread.map((s) => `${s.packageId}/${s.rel}`).join(', ') : '无'}`)
      console.log(`依赖传播: ${r.pkgSpread.length ? r.pkgSpread.map((p) => p.packageId).join(', ') : '无'}`)
      if (r.spread.length > 0 || r.pkgSpread.length > 0) console.log('→ 已标 stale（待确认），`myco stale` 查看')
      return
    }
    case 'stale': {
      if (args[0] === 'clear') {
        if (!args[1]) throw new Error('用法: myco stale clear <node>')
        myco.clearStale(args[1])
        console.log(`已解除 stale: ${args[1]}`)
        return
      }
      const stale = myco.listStale()
      if (stale.length === 0) { console.log('无 stale（传播队列为空）'); return }
      for (const s of stale) console.log(`${s.node}  — ${s.reason}（${s.at}）`)
      return
    }
    case 'contracts': {
      const cs = myco.contracts()
      if (cs.length === 0) { console.log('无契约块'); return }
      for (const c of cs) console.log(`${c.packageId}/${c.rel}  ${c.id} v${c.version}  ${c.content.slice(0, 40)}`)
      return
    }
    case 'webhook': {
      const sub = args[0]
      if (sub === 'set') {
        myco.setWebhook(args[1] ?? '')
        console.log(args[1] ? '✓ 已设置 webhook url' : '✓ 已清除 webhook url')
        return
      }
      if (sub === 'show' || sub === undefined) {
        const w = myco.getWebhook()
        console.log(w.enabled ? `enabled: ${w.url}` : '未配置 webhook（major 契约变更将不推送）')
        return
      }
      if (sub === 'test') {
        const r = await myco.sendWebhook('【MyCo-KB】测试消息：webhook 配置正常')
        console.log(r.ok ? `✓ 发送成功（HTTP ${r.status}）` : `✗ 发送失败：${r.reason ?? r.status}`)
        return
      }
      throw new Error(`未知子命令: ${sub}`)
    }
    case 'telemetry': {
      const sub = args[0]
      if (sub === 'on') {
        myco.setTelemetry({ enabled: true })
        console.log('✓ telemetry 已启用（需配置 url 才发送：`myco telemetry set <url>`）')
        return
      }
      if (sub === 'off') {
        myco.setTelemetry({ enabled: false })
        console.log('✓ telemetry 已关闭（不再上报；`MYCO_TELEMETRY=0` 可整机禁用）')
        return
      }
      if (sub === 'set') {
        myco.setTelemetry({ url: args[1] ?? '' })
        console.log(args[1] ? '✓ 已设置 telemetry url（到达间隔后自动定时上报）' : '✓ 已清除 telemetry url（暂停上报）')
        return
      }
      if (sub === 'now') {
        const r = await myco.sendTelemetry()
        console.log(r.ok ? `✓ 已上报（HTTP ${r.status}）` : `✗ ${r.reason ?? r.status}`)
        return
      }
      if (sub === 'status' || sub === undefined) {
        const t = myco.getTelemetry()
        const c = myco.collectTelemetry()
        console.log(`telemetry enabled: ${t.enabled}  url: ${t.url || '(未配置，不发送)'}  间隔: ${t.intervalHours}h  上次发送: ${t.lastSentAt ?? '未发送'}`)
        console.log(`本次将上报（匿名聚合，不含任何知识内容）: 包${c.counts.packages} 文档${c.counts.documents} tag${c.counts.tags} 挂载${c.counts.mounts} 事件${c.counts.events} stale${c.counts.stale} 平台${c.platform}/${c.arch} node${c.nodeVersion}`)
        return
      }
      throw new Error(`未知子命令: ${sub}`)
    }
    case 'upgrade': {
      const repo = process.env.MYCO_UPGRADE_REPO || 'xiaohaoxing/myco-kb'
      let release
      try {
        release = await latestRelease({ repo })
      } catch (err) {
        throw new Error(`无法检查更新：${err?.message ?? err}（确保仓库可公开访问：${repo}）`)
      }
      const current = installedVersion()
      if (!isNewer(release.version, current)) {
        console.log(`已是最新：v${current}（最新发布 v${release.version}）`)
        return
      }
      console.log(`发现新版本 v${release.version}（当前 v${current}）`)
      const asset = findInstallerAsset(release.assets, release.version)
      if (!asset) {
        throw new Error(`发布版缺少自包含安装器资产：myco-install-${release.version}.sh（请在 GitHub Releases 上传它）`)
      }
      const noConfirm = args.includes('--yes') || process.env.MYCO_UPGRADE_YES === '1'
      if (!noConfirm) {
        const ok = await askYN(`下载并升级到 v${release.version}？`)
        if (!ok) { console.log('已取消'); return }
      }
      console.log('正在下载自包含安装器…')
      const installer = await download(asset.url)
      const sha = findShaAsset(release.assets, release.version)
      if (sha) {
        const expected = (await download(sha.url)).toString('utf8')
        if (!checkSha256(installer, expected)) {
          throw new Error('sha256 校验失败，已中止（请勿运行被篡改的安装器；可从发布页手动下载核对）')
        }
        console.log('✓ sha256 校验通过')
      } else {
        console.log('（发布版未附带 .sha256，跳过校验；建议上传以防篡改）')
      }
      const tmp = join(tmpdir(), `myco-install-${release.version}.sh`)
      writeFileSync(tmp, installer)
      console.log('正在执行安装器（版本化安装，保留旧版本可回滚）…')
      execFileSync('bash', [tmp], { stdio: 'inherit' })
      console.log(`✅ 已升级到 v${release.version}`)
      console.log('  重启 DeepSeek Harness 后生效（服务端插件代码在启动时加载；控制台刷新即可见新 UI）。')
      return
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
