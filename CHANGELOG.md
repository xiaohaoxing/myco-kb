# Changelog

MyCo-KB 的版本遵循语义化版本（semver）。本文记录每个 npm 发布版本的功能变更。

> **版本与里程碑的对应**：项目内的 v0.x 功能里程碑（roadmap）与 npm 包版本（semver）历史上不同步——功能里程碑在 `0.1.0` 下持续累积交付。**自 `0.5.0` 起对齐**：npm 包版本 = 该发布所包含的最终功能里程碑。首个产品化交付版本即把包含到 v0.5 的全部功能，统一标为 `0.5.0`。

## [0.6.0] - 聚合遥测（未发布）

> 作为首个产品化交付基线的追加能力，代码已就绪，尚未单独发版（当前 `package.json` 仍为 `0.5.0`）。

### 新增
- **聚合遥测**：daemon 定时上报**严格匿名聚合统计**（版本/平台/包数/文档数/tag 数/挂载与订阅数/运行状态），**不含任何知识内容、包 id/名称、文件名、tag 名称、IP**。
  - **opt-in（默认关）**：控制台底部「统计共享」勾选 / `myco telemetry on` 才上报；未启用不上报任何数据。
  - **护栏**：需配置上报 `url`（`cordis.patch.yml` 的 `telemetry.url`）才真正发送；未配置则勾选也不上报。
  - **控制**：CLI `myco telemetry status|set <url>|on|off|now`；API `/myco/api/telemetry`；`MYCO_TELEMETRY=0` 整机禁用；`intervalHours` 默认 24h。
  - **设置页**：控制台底部「统计共享」勾选 + 「相关链接」（开源源码 / 站点文档 / 个人站点，`cordis.patch.yml` 的 `links` 配置）。
  - **文档**：`docs/telemetry.md`（范围/护栏/合规）、官网 `site/docs/telemetry.md`（公开隐私与遥测说明）。
  - 单测：`test/telemetry.test.js`（匿名性/上报/间隔门控/默认关与 kill switch）。

> 合规提示：本机制为**默认关 opt-in**（勾选才上报）+ 需配置 `url` 才发送；若面向要求「零回传」的企业客户，保持默认不勾选即可，或 `myco telemetry off` / `MYCO_TELEMETRY=0` 彻底关闭。

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
