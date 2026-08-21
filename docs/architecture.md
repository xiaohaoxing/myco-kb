# MyCo-KB 工程架构（v0.2）

> 设计原理（分层模型、生命周期、组合模式、DSH 扩展点映射）以 Obsidian `项目/MyCo-KB/MyCo-KB 架构设计.md` 为准；本页只讲工程结构。

## 运行时形态

1. **CLI（`myco`）**：纯 Node，零依赖，复用 `lib/core/*`，数据目录 `~/.myco`（`MYCO_DATA` 覆盖）。
2. **DSH 插件（`@dsh/myco-kb`）**：Cordis 插件，宿主平面运行；**标准 bundle 装载**——插件自带 `cordis.patch.yml`（自声明 entry，id+name+config），package.json 声明 `dsh.bundle.patch` 指向它，profile 经 `dsh.profile.bundles` 装载（2026-08-20 从"手动 insert"改为标准形态：手动 insert 会被插件管理页判为"不是 DSH 插件"且 client 端不装载）。
   - 服务端 `lib/index.js`：`new MycoRemoteService(ctx, myco)`（TypertRemoteService 构造器自动注册 `ctx.myco` 并经 Typert Gateway 暴露为 client 的 `remote.myco`）；`registerTools` 注册 agent 工具；`ctx.effect` 托管 daemon。
   - 客户端 `lib/client.js`：控制台面板，挂在插件管理页 `settings.plugins.tab` slot（与 dsh-client-ui-settings-plugin-inventory 同槽），四个区：本地状态 / 远程库 / 组合配置 / 工作区矩阵。
3. **技能包（`skills/*/SKILL.md`）**：`myco install-skills` 复制到 `~/.agents/skills/`，与知识库双形态同源。

## 远程服务（Typert）

- `lib/remote.js`：`MycoRemoteService extends TypertRemoteService`，`super(ctx, 'myco')` 注册服务并绑定 Gateway；12 个导出方法（status/find/index/sweep/profiles/useProfile/mounts/cloudStatus/cloudSync/cloudAdd/cloudRemove/cloudList）。
- **不使用 `@Remote()` 装饰器语法**：node 26 不支持装饰器且已移除 `--experimental-decorators`；在构造器里用导出的 `Remote(name)` 函数手动复刻装饰器标记（收集 addInitializer，实例就绪后以 `this=实例` 调用）。DSH 运行时编译时则自动降级处理。
- client 侧 **不硬依赖 `remote.myco`**（2026-08-20 实测踩坑）：顶层 `inject` 只声明 `['slots', 'remote', 'workspaces', 'locale']`；面板组件里用 `ctx.get('remote.myco', false)` 懒读取 + 监听 `internal/service` 事件，等远程服务挂载后刷新。`test/client.test.js` 回归防复发。

## DSH 插件开发踩坑实录（2026-08-20，真实启动验证）

1. **loader entry 必须同时有 `id` 和 `name`**：Cordis loader 用 `options.name` 去 `import()` 插件；只有 `id` 时 name 为 `undefined` → `undefined.startsWith(...)` 启动崩溃。`cordis.patch.yml` 的 insert 条目两个都要写（`docs/myco-kb.patch.example.yml` 已带注释）。
2. **client 插件不要在顶层 inject 里硬等动态 remote namespace**（`remote.myco`）：会让整个 web boot 卡在插件激活阶段（`pending (waiting for service: remote.myco)`）。remote 面是「面板打开后可用则用，不可用则等待」的懒依赖，不是「web 启动必须已有」的硬依赖。
3. **回归测试模式**：`test/client.test.js` mock `window.__ModuleLoader__` 真加载 bundle，断言顶层 inject 不含 `remote.myco`——防止以后重构把硬依赖加回去。
4. **slot 注册必须带 `label`**：`settings.plugins.tab` 渲染时 `resolveSlotLabel(entry.options.label) ?? ""`——缺 label 的 entry 标题为空，tab 直接不显示（2026-08-20 实测：client bundle 已装载、管理页正常，唯独 tab 不出现）。同时 label 回调里用到的 t 要在 apply 里先 `ctx.locale.bind(NS)`。
5. **设置页/非会话 UI 不要依赖 Typert remote face**：`remote.<name>` 在 client 端受 inject 声明门控，且第三方插件的宿主 face 不随 web boot 同步——设置页这类非会话 UI 永远拿不到（2026-08-20 实测：tab 出现但永远"执行中"）。控制台数据改用 `ctx.webServer.register` 注册同源 JSON 路由（官方 dsh-client-modules 同款机制），client fetch 即可用。Typert remote 保留给 agent 工具面与会话级场景。
6. **React effect 抛错不被错误边界捕获**：effect 内同步抛错会向上传播到根，卸载整棵组件树（实测症状：设置入口整体消失）。防御：错误边界提升到 slot 注册的最外层组件，且所有 useEffect 回调体包 try/catch。另：官方 client 插件不用 fetch，统一走数据通道。

## 数据模型

- 挂载：`config.json` → `{ spec, enabled, scope, mountedAt }`；spec 前缀 `repo:` / `local:` / `cloud:`（cloud 需 `cloudRoots` 映射）。
- 知识包：每个挂载根 = 一个包；`kb.yaml`（id/name/scope/version/state/dependencies/whenToUse），缺省由目录名推导。
- 索引：`index.json` → tag 倒排 + documents（rel/isEvidence/mtime）。
- 状态：`status.json` → 包清单/计数/索引新鲜度/生命周期候选/挂载错误（控制台消费）。

## 检索打分

tag 命中 ×3 + 文件名 ×2 + 全文 ×1；全库命名空间 tag（如 `chaoheti`）为停用词。

## 生命周期扫描（`sweep`，仅报告）

- `archive`：证据页 > 90 天未更新。
- `review`：常青页无出链且无入链（孤页）。

## 后台守护（宿主平面）

- `lib/daemon.js`：文件 watcher（增量重索引，2s 防抖）+ `setInterval` 定时维护（默认 6h，`timer.unref()` 不阻塞进程退出）。
- 随插件纤维装载/卸载（`ctx.effect` 返回 disposer 关闭 watcher/timer）。

## 实测结论与边界

- **`dsh-schedule` 是 agent-scoped**：只在 live 根 agent 上注册提醒工具（README 明示），不适合宿主平面守护 → 用 Cordis `setInterval` + watcher 实现（已实测）。
- **Cordis 纤维在 `node:test` 下不 apply**（async context 不兼容，实测确认）→ 宿主验证用独立进程 `scripts/host-check.mjs`。
- **服务可见性**：根 `ctx.get()` 读不到插件纤维提供的服务；用 inject 探针（兄弟纤维）读取（`test:host` 已按此实现）。
- `defineTool` 要求 `output: { schema, render }`；value schema DSL 的 array 节点不支持 `additionalProperties`（只允许 object 节点显式 true/false）。

## 开发

```bash
npm run links     # 依赖符号链接（scripts/dev-links.sh，指向 DSH 安装目录）
npm run check     # 语法检查
npm test          # 核心模块单测
npm run test:host # 宿主平面验证（独立进程）
scripts/install-profile.sh   # 安装进 ~/.dsh/profiles/web（重启 Harness 生效）
```

## 路线

v0.1 CLI ✅ → v0.2 控制台 tab + 远程服务 + daemon 宿主化 ✅ → **v0.3 云端 git 同步 ✅** → v0.4 按任务动态装配 profile/工具 → **v0.5 知识更新流（染色/传播）数据层 ✅**（契约解析 / 变更检测 / 影响分析 / stale 队列，全链路实测）→ v0.5.1 控制台染色/传播视图 ✅（变更事件区 + 传播队列区 + 影响分析动作 + 契约清单 API）→ webhook 通知 ✅（设置页可配 URL，major 契约变更自动推送）→ **subagent 起草调度 ✅**（v0.5 全部完成）。

## v0.3 云端 git 同步（已完成）

- `lib/core/sync.js`：零依赖 git 原语（child_process 调系统 git，非交互/超时/防注入）。
  - `normalizeCloudRoot`：cloudRoots 兼容字符串 path（旧格式）与 `{url, path, branch}`。
  - `gitStatus`：branch/ahead/behind/dirty（注意 `rev-list --left-right --count` 输出为 `HEAD独有 upstream独有`，ahead/behind 顺序已修正）。
  - `syncCloudPackage`：clone（缺失时）→ pull（ff-only）→ commit 本地改动（message 自动生成）→ push；失败返回 `{ok:false, stage, error}`，冲突不自动解决、本地改动不丢。
- `cloudRoots` 配置：`{ name: { url, path, branch } }`；默认 clone 到 `~/.myco/cloud/<name>`。
- CLI：`myco cloud add/list/remove/sync [name]`。
- daemon：定时维护时防重入云同步（git 超时 120s，不阻塞定时循环）。
- remote 服务：`cloudSync/cloudAdd/cloudRemove/cloudList`（共 12 个 Remote 方法）。
- 控制台远程库区：云端根列表 + 挂载 git 状态（branch/ahead/behind/dirty）+ 同步按钮。
- 冲突策略：pull 用 ff-only——分叉/冲突报告并保留本地改动，人工 merge 后 sync 恢复（全流程实测：clone → push → pull → 冲突报告 → 人工解决 → 恢复）。

## v0.5 知识更新流（数据层已完成：契约/变更/影响/stale）

- `lib/core/contract.js`：Obsidian callout 契约块解析（`> [!myco-contract] id vN`）+ `[[页#契约]]` 强引用提取（锚点命中已知契约才构成传播边）
- `lib/core/events.js`：内容 hash 对比 → 变更事件（首次扫描建立基线；契约变更=major/内容=patch）；`contractDiff` 对比前后契约
- `lib/core/store.js`：node:sqlite（events append-only / stale 注册表 / hashes 缓存）
- `lib/core/impact.js`：`buildContractIndex`（两遍扫描）→ `analyzeImpact`（同包=染色，跨包=传播，kb.yaml dependencies 反向=依赖传播）
- daemon：维护周期自动变更检测，major 事件自动影响分析标 stale（待人工确认）
- CLI：`scan / events / impact <id> / stale [clear] / contracts / webhook set|show|test`
- **webhook 通知**：配置存 `config.json.webhook.url`（设置页/CLI 可配）；`sendWebhook` POST 飞书兼容格式 JSON；daemon 对 major 事件自动 `impact` + `notifyMajor` 推送（染色/传播摘要），patch/minor 不打扰；API `/myco/api/webhook` GET（URL 脱敏）/POST（设置）/test
- **subagent 起草**（v0.5.3）：控制台 stale 项「起草更新」→ POST /draft → `ctx.subagents.start`（provider 默认 `spawn`，可配置 `subagentProvider`）后台调度 → prompt 含变更摘要+受影响节点内容 → 草案存 drafts 表（pending→running→done/error）→ 控制台 DraftsSection 展示（不自动写文件，人工确认后手动应用）；API `/draft` `/drafts` `/draft/clear`；lib/propagate.js

（原有设计说明保留）

- **变更源双轨**：git 化包用 `git diff`（commit=版本、tag=语义化版本）；本地全局（Obsidian iCloud）用内容 hash 对比 → 统一变更事件 `{ nodeId, kind, before, after, bump }`
- **存储分层**：文件为唯一事实源；`node:sqlite`（内置，零依赖）做增量缓存/持久状态——`events`（append-only 事件日志）/ `graph`（nodes/edges 缓存，可重建）/ `state`（stale/版本）/ `queue`（传播队列）
- **契约块**：Obsidian callout 语法 `> [!myco-contract] id vN` + 内容；引用方 `[[页#contract-id]]` 为强引用（传播边），普通 `[[链接]]` 为弱引用
- **影响分析**：`impact` 组件——反向派生链（染色）+ 跨包引用与 kb.yaml 依赖（传播）；内存 BFS，大数据量回退 SQLite 递归 CTE
- **传播执行分层**：自动重派生 → dsh-jobs 后台任务；下游语义更新 → **subagent 方式调度**（agent 起草，人确认）；飞书通知由插件配置 `feishu.webhook` 启用；所有传播任务控制台人工确认收口
- **状态机**：新增 `stale`；常青页 = 事件流物化视图（重投影），证据层只追加变更事件
