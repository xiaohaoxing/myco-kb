# Changelog

MyCo-KB 的版本遵循语义化版本（semver）。本文记录每个 npm 发布版本的功能变更。

> **版本与里程碑的对应**：项目内的 v0.x 功能里程碑（roadmap）与 npm 包版本（semver）历史上不同步——功能里程碑在 `0.1.0` 下持续累积交付。**自 `0.5.0` 起对齐**：npm 包版本 = 该发布所包含的最终功能里程碑。首个产品化交付版本即把包含到 v0.5 的全部功能，统一标为 `0.5.0`。

## [0.8.0] - 数据目录工作区化 + 呈现契约修正

> 版本：0.8.0（minor：数据目录默认改工作区相对、插件支持 `MYCO_DATA`/`dataDir` 覆盖、`presentCall` 呈现契约修正；含若干应对 DSH 文件沙箱的部署适配）。

### 变更
- **数据目录默认改为工作区相对**（`bin/myco.js`）：`dataDir` 解析走新 `lib/core/datadir.js`；CLI 默认 `join(process.cwd(), '.myco')`——在会话工作区内运行 `myco ...` 时，数据落进工作区，从而绕开 DSH 文件沙箱对工作区外写入的拦截（此前 `~/.myco` 位于工作区外，沙箱内 `myco status/sweep/index/...` 报 `EPERM`）。
- **插件支持 `dataDir`/`MYCO_DATA` 覆盖**（`lib/index.js`）：`apply()` 改为 `resolveDataDir(config.dataDir)`（优先级：显式 `dataDir` > `MYCO_DATA` > 回退 `~/.myco`）。宿主插件默认仍回退 `~/.myco`（宿主 `cwd` 非工作区，避免把数据写进 app bundle），需工作区部署时用 `dataDir` 或 `MYCO_DATA` 显式指定。
- **`presentCall` 呈现契约修正**（`lib/tools.js`）：`present()` 返回的调用视图补上 `card: 'generic'` 字段（dsh-tools render-intent 契约要求），`kind`/`detail` 仅在存在时输出；修复缺 `card` 被宿主 `viewFor` 当未知卡型回退的降级。
- **`.gitignore`**：新增 `.myco/`（工作区内的数据目录，防止把 `config.json`（含 webhook/遥测）与嵌套 `cloud/*` git 仓库提交进仓库）。

### 部署提示（本机工作区化）
- 迁移：`cp -R ~/.myco/. <workspace>/.myco/`，并把 `.myco/config.json` 的 `cloudRoots[*].path` 改到新位置。
- CLI（agent 在会话内运行）默认即取 `<workspace>/.myco`（cwd 相对）。
- 要让 DSH 宿主插件也用同一数据目录：启动 DSH 前 `export MYCO_DATA=<workspace>/.myco`，或在 profile 的 `cordis.patch.yml` 以 `@dsh/myco-kb` 的 `config.dataDir` 指定（注意同名 id 叠加，勿与 bundle patch 重复）。

> 已知（待实机核验）：同名 id 在 profile `cordis.patch.yml` 覆盖 bundle patch 是否触发 loader 「duplicate loader entry id」需在真实 DSH 启动时确认；建议优先用 `MYCO_DATA` 环境变量。

---

## [0.7.1] - 公开内容脱敏

> 版本：0.7.1（patch：清理公开仓库/官网/制品中的内部与敏感信息；功能与 0.7.0 一致）。

### 变更
- **移除内置 PostHog apiKey**：`cordis.patch.yml` 不再提交默认 `apiKey`（改用环境变量 `POSTHOG_API_KEY` 注入，或本地 profile 覆盖）；遥测仍默认关（opt-in）+ 需配置 `url` 才发送。
- **脱敏内部命名/内网信息**：`超合体数据工厂` / `chaoheti` 等公司内部命名与真实文档路径改为占位（`company-kb` / `acme`）；`docs/cloud-production.md` 的内网 GitLab IP / SSH 地址改为 `gitlab.example.com` 占位。
- **代码停用词去除公司专属词**：`lib/core/myco.js` / `lib/core/taskctx.js` 不再内置 `chaoheti` 停用词。
- **文案与品牌措辞**:「真菌之库 · 我的公司」改中性；个人站点链接改产品仓库；`README.md` 开发机安装节去掉本机日期/备份等内部细节。
- 官网/README/文档的版本号同步到 0.7.1。

> 说明：0.7.0 曾把上述信息随制品/仓库公开。若你高度在意该 PostHog `apiKey`，建议同时在 PostHog 侧轮换项目 key（摄入 key 非机密、但可轮换）；代码层面已从 0.7.1 起不再内置默认值。

---

## [0.7.0] - 按任务动态装配（v0.4）

> 版本：npm 0.7.0（对齐功能里程碑 v0.4「按任务动态装配」；在 0.6.0 productized 基线上新增）。
> 更新：路径 A `bash myco-install-0.7.0.sh` / `myco upgrade`；路径 B DSH 插件管理在线更新（git 依赖）。

### 新增
- **数据面**（`lib/core/assemble.js` + `lib/core/taskctx.js`，纯 Node 零依赖，CLI/插件共用）：
  - 任务上下文归一化：目标文本 / 用户 / 环境 + 分词（ASCII 词 + CJK 串二元组；CJK 二元组仅用于短字段召回，全文用整段避免逐字噪音）。
  - 两层匹配：**profile 精确匹配**（用户/环境/目标逐维命中）→ **知识包子集软匹配**（whenToUse 语义×5 > tag×3 > 文件名×2 > 全文×1）；命中为空回退默认（全量包不裁剪）。
  - 产出 `toolMask`（保留检索/装配基础工具、列出被裁包）与可复现 `lockfile`（写入 `dataDir/assemble.lock.json`）。
  - CLI：`myco assemble <目标>`、`myco assemble-status`；HTTP API：`/myco/api/assemble?goal=`、`/myco/api/assemble/last`。
- **工具面**（`lib/tools.js`）：新增 `myco_assemble` agent 工具（收 goal 返回装配子集 + 推荐文档 + 工具掩码）；`applyAgentTools` 提供 agent 作用域装配器（注入 scoped 检索 + 可选 `restrict`），`createScopedFindTool` 生成限定到装配子集的检索工具；`registerAgentAssembly` 可把装配接进 `agent/created` 生命周期（**opt-in**：`config.assemble.auto`）。
- **scoped 检索**（`lib/core/myco.js`）：`find(query, {packageIds})` 支持限定知识包子集；新增 `findScoped(query, packageIds)` 供 agent 作用域注入。
- **控制台**（`lib/client.js`）：设置页新增「按任务动态装配」区（输入目标 → 展示命中包子集/推荐文档/工具掩码，可回显上次装配 lockfile）。
- 单测：`test/assemble.test.js`（分词 / profile 匹配 / 软匹配 / 回退 / lockfile）、`test/agent-tools.test.js`（findScoped / scoped 检索工具 / applyAgentTools）；宿主平面验证扩展到 5 工具 + assemble API（`scripts/host-check.mjs`）。

> 已知（待实机核验）：DSH agent 作用域 `ctx.tools.restrict/register/presentAs/guard` 的真实签名与行为需在真实 DSH agent 运行时确认（设计文档 §2/§7）；`agent/created` 时目标往往尚未就绪，自动「目标→装配→掩码」需真实 agent 循环核验。

---

## [0.6.0] - 聚合遥测 + 自动更新

> 版本对齐：0.6.0（productized 基线在 0.5.0 基础上追加 telemetry + 自动更新）。

### 新增
- **聚合遥测**：daemon 定时上报**严格匿名聚合统计**（版本/平台/包数/文档数/tag 数/挂载与订阅数/运行状态），**不含任何知识内容、包 id/名称、文件名、tag 名称、IP**。
  - **opt-in（默认关）**：控制台底部「统计共享」勾选 / `myco telemetry on` 才上报；未启用不上报任何数据。
  - **provider**：`generic`（原始聚合 JSON）或 `posthog`（PostHog 单事件 `/i/v0/e/`，`api_key`/`distinct_id`(匿名 uuid)/`properties`）。
  - **护栏**：需配置上报 `url`（`cordis.patch.yml` 的 `telemetry.url`）才真正发送；未配置则勾选也不上报。apiKey 支持 `telemetry.apiKey` 或环境变量 `POSTHOG_API_KEY`。
  - **控制**：CLI `myco telemetry status|set <url>|on|off|now`；API `/myco/api/telemetry`；`MYCO_TELEMETRY=0` 整机禁用；`intervalHours` 默认 24h。
  - **设置页**：控制台底部「统计共享」勾选 +「立即上报」+「相关链接」（开源源码/站点文档/个人站点，`cordis.patch.yml` 的 `links`）。
- **自动更新 `myco upgrade`**：查询 GitHub Releases 最新版 → 下载 `myco-install-<version>.sh` → 校验 sha256（若有 `.sha256` 资产）→ 版本化安装 → 提示重启生效。命令行 `myco upgrade [--yes]`。
- **官网**：新增公开「隐私与遥测」页；首页 raw HTML 内部链接补 `base`（修复快速开始 404）。
- **文档**：`docs/telemetry.md`（范围/护栏/合规/PostHog）、官网 `site/docs/telemetry.md`。
- 单测：`test/telemetry.test.js`（匿名性/上报/间隔/默认关/PostHog payload）、`test/upgrade.test.js`（版本比较/资产解析/校验）。

> 合规：遥测为**默认关 opt-in** + 需配置 `url` 才发送；面向要求「零回传」的企业客户，保持不勾选或 `myco telemetry off` / `MYCO_TELEMETRY=0` 即可。

## [0.5.0] - 首个产品化交付版本

> 对齐功能里程碑 v0.5（知识更新流全量）。包含此前 v0.1～v0.5 的全部功能。本版本同时补齐产品化交付前提（元数据、打包、安装脚本、发布构建）。

### 新增
- **知识包模型**：repo / local / cloud 三类知识根，统一包模型（`kb.yaml` 清单 + 版本 + 依赖）。
- **组合配置 profile**：不同用户 × 环境 × 目标装配，lockfile 可复现。
- **生命周期**：收件箱 → 证据 → 常青 → 原则；`sweep` 扫描候选（仅报告）；归档默认不删除。
- **插件形态**：Cordis 插件（宿主平面守护 + 控制台 tab + agent 工具/技能）+ Typert 远程服务（12 方法）。
- **云端 git 同步**：clone / pull(ff-only) / commit / push；冲突报告且本地改动不丢；同步后自动变更检测；opt-in 订阅。
- **知识更新流**：契约块解析 / 变更检测 / 影响分析（染色/传播/依赖传播）/ stale 队列 / 控制台染色与传播视图 / webhook 通知（飞书兼容）/ subagent 起草调度。
- **CLI**：全套命令（init/mount/index/status/find/profile/sweep/cloud*/scan/events/impact/stale/contracts/webhook/daemon/install-skills）。

### 产品化交付（本版本起）
- `engines` 对齐真实 Node 前提：`node:sqlite`（`DatabaseSync`）需要 Node >= 23，推荐 24（原 `>=18` 不匹配，Node 18/20 在更新流路径会崩溃）。
- 打包 `files` 补入 `cordis.patch.yml`（插件 bundle 入口，之前未被打进制品，装到企业机器会缺入口文件）。
- 新增 `scripts/build-release.sh`：语法检查 + 测试 + 打包 + 校验产物关键文件 + sha256。
- 新增 `scripts/install-release.sh`：面向制品的安装 / 升级 / 回滚（版本化安装，替代开发用符号链接）。
- 测试脚本加 `--test-timeout`，避免 `node --test` 因遗留句柄导致 CI 进程挂起。
- 新增企业交付 Cookbook：`docs/enterprise-delivery-cookbook.md`。

### 修复 / 注意
- 产品边界：MyCo-KB 是**知识库管理系统**，不是项目管理器（无任务/排期/看板/里程碑）。企业若用于项目管理，是承载其**知识 / 文档 / 经验资产**，任务排期请搭配 Jira / 飞书任务等。

---

## [0.1.0] - CLI 基础（功能里程碑 v0.1）

- 挂载 / 索引 / 状态 / 检索 / profile / sweep 全套 CLI；纯 Node 零依赖核心；知识包模型与三类知识根。

> 说明：v0.2（插件化 + 控制台 + 远程服务 + 宿主平面 daemon）、v0.3（云端 git 同步）、v0.5（知识更新流）的功能，原本在 `0.1.0` 下持续累积交付，未单独发版。自 `0.5.0` 起统一为与功能里程碑对齐的版本。
