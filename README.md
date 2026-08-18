# MyCo-KB

真菌之库 · 我的公司 —— 知识库管理系统（DeepSeek Harness 插件形态）

> 权威设计文档：Obsidian 知识库 `项目/MyCo-KB/MyCo-KB 架构设计.md`（本仓库 `docs/architecture.md` 为工程视图）

## 是什么

- **知识包**：repo 级 / 本地全局 / 云端全局 三类知识根，统一包模型（`kb.yaml` 清单 + 版本 + 依赖）
- **组合配置**：不同用户 × 环境 × 目标激活不同 profile（lockfile 可复现）
- **生命周期**：收件箱 → 证据 → 常青 → 原则；淘汰默认归档不删除
- **插件形态**：Cordis 插件（服务端守护 + 客户端控制台 + agent 工具/技能）
- **v0.2 新增**：Typert 远程服务（`remote.myco` 数据通道）+ 插件管理页控制台 tab + 宿主平面 daemon

## 快速开始

```bash
myco mount repo:/path/to/your-kb   # 挂载知识根
myco index                         # 重建跨包索引
myco status                        # 维护状态
myco find 部署                      # 检索（tag×3 / 文件名×2 / 全文×1）
myco sweep                         # 生命周期候选扫描（仅报告）
myco profile list                  # 组合配置
```

数据目录默认 `~/.myco`，可用 `MYCO_DATA` 覆盖。

## 目录结构

```
lib/
  index.js        Cordis 插件服务端入口（ctx.myco 服务 + 工具 + daemon）
  remote.js       Typert 远程服务（remote.myco，控制台数据通道）
  client.js       客户端：插件管理页控制台 tab（本地状态/远程库/组合/工作区）
  tools.js        agent 工具面（dsh-tools）
  daemon.js       后台守护：watcher + 定时维护
  core/           纯 Node 核心（CLI 与插件共用）
    myco.js         编排器（挂载/索引/状态/检索/profile/sweep/cloudStatus）
    frontmatter.js  零依赖 frontmatter 解析
    manifest.js     kb.yaml 清单读取
    mount.js        挂载解析（repo:/local:/cloud:）
    registry.js     知识包注册表
    indexer.js      跨包倒排索引
    sweeper.js      生命周期候选扫描
    status.js       状态快照
    profile.js      组合配置
bin/myco.js       CLI
skills/           myco-search / myco-maintain / myco-lifecycle
scripts/
  dev-links.sh       本地开发依赖符号链接（指向 DSH 安装目录）
  host-check.mjs     宿主平面加载验证（独立进程）
  install-profile.sh 安装到 ~/.dsh/profiles/web
test/             node:test 单测（核心模块）
```

## 开发

```bash
npm run links     # 先建本地依赖符号链接（scripts/dev-links.sh）
npm run check     # 语法检查
npm test          # 核心模块单测
npm run test:host # 宿主平面验证（真实 Cordis：服务/工具/daemon/remote）
```

### 宿主平面验证说明

`test:host` 必须用独立进程跑（`node scripts/host-check.mjs`），**不能用 `node --test`**：
Cordis 纤维在 node:test 的 async context 下不会 apply（已实测确认的环境不兼容）。

### 安装进 Harness（静默常驻）—— 已执行（2026-08-19）

```bash
scripts/install-profile.sh   # 符号链接进 ~/.dsh/profiles/web + 声明依赖（幂等）
```

已完成的三步（备份在 `~/.dsh/profiles/web/*.bak-20260819-*`）：
1. `install-profile.sh`：`node_modules/@dsh/myco-kb` → 本仓库符号链接 + package.json 声明依赖
2. `myco mount` 两个试点知识包（超合体数据工厂 + MyCo-KB）写入 `~/.myco/config.json`（插件启动自动读取）
3. `cordis.patch.yml` 追加 insert 补丁启用 `@dsh/myco-kb`（config: maintenanceIntervalHours 6）

**重启 Harness 后生效**：插件管理页 Plugins 设置区出现 MyCo-KB 控制台 tab；
daemon 静默监听两个知识包，变更自动增量索引。

## 已知边界（实测结论）

- `dsh-schedule` 是 **agent-scoped**（只在 live 根 agent 上装提醒工具），不适合宿主平面守护；
  宿主平面维护用 Cordis 插件自身 `setInterval` + 文件 watcher（已实现）。
- 控制台挂在插件管理页 `settings.plugins.tab` slot（与 plugin-inventory 同槽）。

进度：v0.1 CLI ✅；v0.2 控制台 tab + 远程服务 + daemon 宿主化 ✅；v0.3 云端同步；v0.4 动态装配。
