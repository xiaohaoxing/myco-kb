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

> 从零把 MyCo-KB 装到一台设备的 DSH 上，走**产品化安装**（一个自包含文件）：见 [安装指导](/docs/installation.md)。
> 以下命令假设 `myco` 已安装且知识库已初始化。

```bash
myco mount repo:/path/to/your-kb   # 挂载知识根
myco index                         # 重建跨包索引
myco status                        # 维护状态
myco find 部署                      # 检索（tag×3 / 文件名×2 / 全文×1）
myco sweep                         # 生命周期候选扫描（仅报告）
myco profile list                  # 组合配置
myco cloud add <name> <url>        # 注册云端知识根（git 仓库）
myco cloud sync [name]             # 同步云端包（clone/pull/push）
```

数据目录默认 `~/.myco`，可用 `MYCO_DATA` 覆盖。**默认知识库路径 `~/.myco-kb`**（`myco init` 创建并挂载，可用 Obsidian 打开；也可手动改挂载到已有 Obsidian 知识库路径）。

## 目录结构

```
lib/
  index.js        Cordis 插件服务端入口（ctx.myco 服务 + 工具 + daemon）
  remote.js       Typert 远程服务（remote.myco，控制台数据通道）
  client.js       客户端：插件管理页控制台 tab（本地状态/远程库/组合/工作区）
  tools.js        agent 工具面（dsh-tools）
  daemon.js       后台守护：watcher + 定时维护
  core/           纯 Node 核心（CLI 与插件共用）
    myco.js         编排器（挂载/索引/状态/检索/profile/sweep/cloud*/sync）
    sync.js        云端 git 同步原语（clone/pull/push/status，零依赖调系统 git）
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
  install-profile.sh 开发用：符号链接仓库进 ~/.dsh/profiles/web
  build-release.sh   产品化发布构建（check + test + pack + 校验 + sha256）
  install-release.sh 产品化安装/升级/回滚（版本化，自动生成 myco 命令）
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

> 这是**开发者本机的开发安装说明**（符号链接到源码仓库）。**给新设备请走产品化安装**，见[安装指导](/docs/installation)。

```bash
scripts/install-profile.sh   # 符号链接进 ~/.dsh/profiles/web + 声明依赖（幂等）
```

已完成的三步（备份在 `~/.dsh/profiles/web/*.bak-20260819-*`）：
1. `install-profile.sh`：`node_modules/@dsh/myco-kb` → 本仓库符号链接 + package.json 声明依赖
2. `myco mount` 两个试点知识包（超合体数据工厂 + MyCo-KB）写入 `~/.myco/config.json`（插件启动自动读取）
3. `cordis.patch.yml` 追加 insert 补丁启用 `@dsh/myco-kb`（config: maintenanceIntervalHours 6）

**重启 Harness 后生效**：插件管理页 Plugins 设置区出现 MyCo-KB 控制台 tab；
daemon 静默监听两个知识包，变更自动增量索引。

## 官方网站

`site/` 目录是产品官网（VitePress）：产品特性 + 系统设计 + 用户文档三件套。

```bash
cd site
npm install
npm run dev      # 本地开发 http://localhost:4173
npm run build    # 静态产物 .vitepress/dist/，可部署到任意静态托管
```

## 产品化交付

> 面向企业交付项目知识/文档/经验沉淀底座的手册见 [企业交付 Cookbook](/docs/enterprise-delivery-cookbook.md)。

- **版本**：npm 包版本**自 `0.5.0` 起与功能里程碑对齐**；**当前 `0.6.0`**（聚合遥测 + 自动更新）。变更见 [CHANGELOG](/CHANGELOG.md)。
- **Node 前提**：更新流用到 `node:sqlite`（`DatabaseSync`），需要 **Node ≥ 23，推荐 24**（`package.json` `engines` 已对齐；Node 18/20 会在更新流路径崩溃）。基础 CLI 命令在更新流之外可在更低版本工作，但完整功能需上述版本。
- **发布构建**：`npm run build:release`（= `bash scripts/build-release.sh`）——语法检查 → 单元测试 → 打包 → 校验产物关键文件 → sha256，产物 `dist/dsh-myco-kb-<version>.tgz`。
- **自包含安装器**：`build-release.sh` 额外产出 `dist/myco-install-<version>.sh`（**一个文件**内含安装器 + 制品 base64）。新设备只需拷这一个文件即可**安装 / 升级 / 回滚 / 查看**：
  ```bash
  bash myco-install-0.6.0.sh [profile]            # 安装（默认 profile ~/.dsh/profiles/web）
  bash myco-install-0.6.0.sh rollback [profile]   # 回滚
  bash myco-install-0.6.0.sh list [profile]       # 查看已装版本
  ```
  它：① 解出制品 tarball ② 执行 `install-release.sh install` ③ 生成可直接用的 `myco` 命令。
- **制品安装/升级/回滚**：`bash scripts/install-release.sh install dist/dsh-myco-kb-<version>.tgz [profile]`（替代开发用符号链接 `install-profile.sh`）；支持 `rollback` / `list`。默认 profile `~/.dsh/profiles/web`。
- **`myco` 命令自动可用**：`install-release.sh` 会生成 `~/.local/bin/myco` 启动器（用 DSH 工具链 node 指向当前 profile 的插件 CLI，跟随版本符号链接）。若该目录不在 PATH，默认在 shell rc（`~/.zshrc` 优先）写入带标记的 `export PATH` 块（幂等、可逆）；设 `MYCO_NO_PATH=1` 可跳过（仅生成启动器并打印提示）。
- **制品需包含 `cordis.patch.yml`**（插件 bundle 入口）——`files` 字段已包含并打包校验。
- **DSH 插件管理在线更新（git 依赖）**：`scripts/install-release.sh git <ref>` 把插件装成 `github:xiaohaoxing/myco-kb#<ref>` 依赖，DSH 插件管理即可像更新 git 插件那样**在线更新**（仓库打新 tag 后插件管理页出现「更新」）。详见 [docs/installation.md](/docs/installation.md)。
- **聚合遥测（可选、默认需配置 url 才发送）**：daemon 定时上报严格匿名的聚合统计（版本/平台/包数/文档数/tag 数/运行状态），**不含任何知识内容、包 id/名、文件名、IP**；`myco telemetry set <url>` 才发送，`myco telemetry off` 或 `MYCO_TELEMETRY=0` 一键停用。详见 [docs/telemetry.md](/docs/telemetry.md)。

## 已知边界（实测结论）

- `dsh-schedule` 是 **agent-scoped**（只在 live 根 agent 上装提醒工具），不适合宿主平面守护；
  宿主平面维护用 Cordis 插件自身 `setInterval` + 文件 watcher（已实现）。
- 控制台挂在插件管理页 `settings.plugins.tab` slot（与 plugin-inventory 同槽）。

进度：v0.1 CLI ✅；v0.2 控制台 tab + 远程服务 + daemon 宿主化 ✅；**v0.3 云端 git 同步 ✅**（clone/pull/push/冲突报告，全流程实测）；v0.4 动态装配（规划中）；v0.5 知识更新流 ✅；**产品化交付（0.6.0）：发布/安装/回滚/自动更新 + 企业 Cookbook ✅**。
