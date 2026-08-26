# MyCo-KB 企业交付 Cookbook（产品化 · 项目知识/文档/经验沉淀）

> 用途：把 **MyCo-KB** 作为可交付制品，让企业团队自行安装到 DeepSeek Harness，用作**项目知识 / 文档 / 经验沉淀**底座。
> 交付模式：**产品化交付**；运行前提：**企业接受安装 DeepSeek Harness**；需求落点：**项目知识/文档/经验沉淀（不是任务/排期管理）**。
>
> 本文是操作手册。真正的权威设计文档在 Obsidian `项目/MyCo-KB/MyCo-KB 架构设计.md`，工程视图见本仓库 `docs/architecture.md`。

---

## 0. 先讲清楚：它是什么 / 不是什么（决定先谈预期）

> 这一节最重要。把这条给企业看，能省掉后面大量返工。

| 维度 | MyCo-KB 擅长 ✅ | MyCo-KB 不擅长 ❌ |
| --- | --- | --- |
| **项目知识** | 项目文档、设计稿、决策记录（ADR）、复盘、经验、口径、契约的**组织 / 检索 / 演进 / 归档** | 进度排期、任务看板、里程碑、甘特图、资源分配 |
| **知识质量治理** | 四态演进（收件箱→证据→常青→原则）、生命周期扫描、契约驱动的**影响分析**、stale 待确认、webhook 通知、subagent 起草 | 审批流、SLA、权限分级 |
| **协作** | 基于 **git 仓库**的多人多机同步（云端包） | 实时协同编辑、评论线程、@提醒 |
| **形式** | DeepSeek Harness **插件** + 独立 `myco` CLI | 独立 SaaS、移动端、免部署 |
| **权威** | 文件是唯一事实源，一切缓存可重建 | 企业级审计日志 |

**结论给企业的一句话**：MyCo-KB 是**项目知识库与知识治理底座**，不是项目管理器。项目管理的**任务与排期**继续用 Jira / 飞书任务 / 看板；MyCo-KB 承接这些任务的**知识、文档、决策与经验资产**，并靠契约块让「某个口径/接口变了，哪些文档受影响」变得可答、可查、可通知。

---

## 1. 现状快照（交付基线）

```
产物：@dsh/myco-kb（npm 包，版本 0.1.0）+ myco CLI + 3 个 agent 技能 + VitePress 官网
形态：Cordis 插件（宿主平面运行）+ 独立 CLI（零依赖）
运行时已挂载 3 个知识包：repo:超合体数据工厂 / repo:MyCo-KB / cloud:chaoheti-kb
当前索引：40 文档 / 19 tags / 索引新鲜
```

### 1.1 功能里程碑（已交付）

| 版本 | 内容 | 状态 |
| --- | --- | --- |
| v0.1 | CLI 基础：挂载 / 索引 / 状态 / 检索 / profile / sweep；纯 Node 零依赖核心；三类知识根 | ✅ |
| v0.2 | 插件化（Cordis）+ 控制台 tab（远程服务 12 方法）+ 宿主平面 daemon（watcher + 定时维护） | ✅ |
| v0.3 | 云端 git 同步（clone/pull/commit/push，冲突报告不丢本地改动；同步后自动变更检测；opt-in 订阅） | ✅ |
| v0.5 | 知识更新流：契约解析 / 变更检测 / 影响分析 / stale 队列 / 控制台染色/传播视图 / webhook 通知 / subagent 起草调度 | ✅ |
| v0.4 | **按任务动态装配** profile 与工具面 | ⏳ **未做**（目前 NEXT） |

> ⚠️ **版本**：自 `0.5.0` 起 npm 包版本与功能里程碑**对齐**（首个产品化交付版本，包含 v0.1～v0.5 全部功能）；旧版曾长期停在 `0.1.0` 而功能里程碑编号为 v0.2/v0.3/v0.5。见 [CHANGELOG](/CHANGELOG.md)。

### 1.2 已实测的边界（务必写进交付说明）

- `dsh-schedule` 是 **agent-scoped**，不适合宿主平面守护 → 用 Cordis `setInterval` + 文件 watcher 实现。
- Cordis 纤维在 `node:test` async context 下不 apply → API 宿主验证用独立进程 `scripts/host-check.mjs`。
- 服务可见性：根 `ctx.get()` 读不到插件纤维的服务，用 inject 探针（兄弟纤维）读取。
- **Node 版本（已修正）**：更新流用 `node:sqlite`（`DatabaseSync`），需要 **Node ≥ 23**（推荐 24 与开发机一致）。`package.json` `engines` 原为 `>=18`（不相符，会把 Node 18/20 放进来并在更新流路径崩溃）——**已修正为 `>=23.0.0`**；安装器 `install-release.sh` 也做启动版本检查。
- 客户端 `fetch` 层检查 HTTP 状态、数据层 `Array.isArray` 防御；发版后**服务端需重启**才生效（client 实时读文件、server 启动时 import）。

---

## 2. 交付物清单（你要交付什么）

| 交付物 | 内容 | 成熟度 |
| --- | --- | --- |
| **插件包** | `lib/` `bin/` `skills/` `README.md`（package.json `files` 已列） | ⚠️ 目前装的是**符号链接到开发仓库**，非真实制品 |
| **CLI** | `bin/myco.js`，`myco <命令>`；零依赖，Node ≥ 18 基础命令可用 | ✅ |
| **技能** | `skills/myco-search|maintain|lifecycle/SKILL.md`，`myco install-skills` 复制到 `~/.agents/skills/` | ✅ |
| **官网/文档** | `site/`（VitePress）：特性 + 系统设计 + 用户文档三件套 | ✅（无发布流水线） |
| **数据文件** | `data/*.json`（Cordis 插件启动自动读取挂载）| ✅（开发实例，可脱敏后作为示例） |

> **产品化缺口**：当前 `scripts/install-profile.sh` 是 `ln -sfn $REPO ~/.dsh/profiles/web/node_modules/@dsh/myco-kb` + 声明 `file:./node_modules/@dsh/myco-kb` 依赖 + 写入 `dsh.profile.bundles`。**这在开发者机器上成立，但不是可交付制品**（依赖 dev 仓库路径、没有版本、没有升级/回滚）。产品化改造见 §5。

---

## 3. 前提与依赖矩阵（企业环境 check）

| 依赖 | 要求 | 说明 |
| --- | --- | --- |
| **Node.js** | ≥ 24（推荐，与开发机一致）；**至少 ≥ 23** | 更新流用 `node:sqlite`；Node 18/20 会崩（更新流路径）。基础 CLI 命令在 ≥18 可用，但**完整功能需 ≥23**，强烈建议 24 |
| **DeepSeek Harness** | 企业机器需安装 DSH | MyCo-KB 是 DSH 插件，宿主平面运行 daemon |
| **peerDependencies** | `@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/dsh-tools ^0.1.0-rc.6`、`@deepseek-ai/dsh-typert-protocol ^0.1.0-rc.6` | 由 DSH 运行时提供；企业需匹配的 DSH 版本（rc 版本约束紧） |
| **git** | 系统 git（零依赖调用） | 云端同步 clone/pull/commit/push |
| **git 托管** | GitLab（内网，推荐）/ GitHub | 云端知识包的**共享事实源**；企业权限模型在这里落地 |
| **消息通道（可选）** | webhook（飞书兼容 JSON） | major 契约变更通知 |
| **网络（可选）** | 内网 GitLab SSH / 公网 GitHub SSH | 云端同步需出网；URL 不内嵌 token |
| **Obsidian（建议）** | 知识包是 Obsidian 库（callout、`[[链接]]`） | 生命周期/更新流依赖 Obsidian 约定；企业非 Obsidian 内容需转换 |

---

## 4. 设计一：企业项目知识包结构（最重要的一步）

知识包 = **每个挂载根** = 一个统一管理单元。推荐按「**一个项目一个 repo 包 + 一个团队共享云端包 + 一个本地全局包**」组织。

```
企业/某项目/
  repo:某项目/          # 随项目走的知识包（挂在代码仓库 docs/ 或独立库）
    kb.yaml             # 包清单 + dependencies: [team-shared-kb]

/团队共享/云端 git 仓库/
  cloud:team-shared-kb  # 团队级共享事实源（配额口径、公共契约、评审标准）
    docs/contracts/*.md # 契约块：> [!myco-contract] <id> vN

个人本机/
  local:个人笔记        # Obsidian 跨项目共享笔记、剪藏、会议速记
```

`kb.yaml` 关键字段：
```yaml
id: project-x
name: project-x
scope: repo            # repo | local | cloud
version: 0.1.0
state: evergreen       # 生命周期状态
dependencies: [team-shared-kb]   # 声明对云端共享包的依赖（用于依赖传播）
whenToUse: 什么时候该用这个包（给 agent 的择包说明）
```

### 4.1 契约块（企业知识治理的核心）

用 Obsidian callout 声明「稳定接口」：
```markdown
> [!myco-contract] shared-quota-rule v3
> 配额占用按平台账号条目计……权威定义在此。

本页引用 [[docs/contracts#shared-quota-rule]]  ← 锚点命中已知契约 = 强引用（传播边）
```
- `[!myco-contract] <id> v<N>` + 内容 = 契约块；
- `[[页#contract-id]]` = 强引用，构成传播边；普通 `[[链接]]` = 弱引用，不传播；
- 代码块围栏内的引用示例会被跳过（防误报）。

**给企业的价值**：契约一变，影响分析自动算「染色（同包派生）+ 传播（跨包引用）+ 依赖传播（kb.yaml 反向）」，受影响节点进入 stale 待确认 + webhook 通知。这是把「口头口径」变成「可追踪资产」。

### 4.2 生命周期四态 + 治理节奏

| 状态 | 含义 | 典型内容 | 治理 |
| --- | --- | --- | --- |
| 收件箱 | 未整理原始输入 | 剪藏、速记、随手记 | 定期清空→证据 |
| 证据 | 有来源、可回溯 | 带出处外部资料、实验记录 | `sweep` 判 archive：>90 天未更新 |
| 常青 | 稳定可信、被引用事实源 | 架构决策、产品定义、索引页 | `sweep` 判 review：孤页（无出链无入链） |
| 原则 | 决策依据与价值观 | 评审标准、口径、价值观 | 人工维护 |

演进：收件箱→证据→常青→原则。`myco sweep` **只报告候选，从不自动删改**——人永远收口。

---

## 5. 设计二：产品化改造清单（从「开发机可用」到「可交付制品」）

> 这是「产品化交付」与「内部自用」最大的分水岭。✅ = 已完成，⏳ = 待做。
> 已完成项对应的脚本可直接使用：`scripts/build-release.sh`、`scripts/install-release.sh`（见 §6.2）。

| # | 改造项 | 状态 | 已落地 / 待做 |
| --- | --- | --- | --- |
| 1 | **发布定义** | ✅ |  版本对齐 **0.5.0 = 功能里程碑 v0.5**；新增 `CHANGELOG.md`；将来按 semver 标 breaking/new/fix |
| 2 | **真实制品** | ✅ | `npm/pnpm pack` 产物已含 `lib/ bin/ skills/ cordis.patch.yml README.md`；`build-release.sh` 打包并校验 |
| 3 | **安装方式** | ✅ | `scripts/install-release.sh install <tarball> [profile]`：解包到版本目录 + 声明依赖 + 追加 `dsh.profile.bundles` + 重启指引（替代开发符号链接） |
| 4 | **升级/回滚** | ✅ | `install-release.sh install` 升级；`rollback` 回滚；`list` 查看版本（版本化安装 + package.json 备份） |
| 5 | **Node 前提** | ✅ | `engines` 已修正为 `>=23.0.0`（`node:sqlite` 免 flag）；`install-release.sh` 启动做版本检查；README/官网注明推荐 24 |
| 6 | **版本依赖对齐** | ⏳ | 需建立所支持的 DSH 版本矩阵；发布前在目标 DSH 版本上跑 `test:host` |
| 7 | **部署模型** | ✅ | 已在本文档 + `docs/cloud-production.md` 写明「每机器一个 daemon + git 事实源 + opt-in 云同步 + 冲突/回滚」 |
| 8 | **CI/CD** | ⏳ | `build-release.sh` 本地已做完整校验（check+test+pack+sha256）；发布流水线与官网静态部署尚未接线 |
| 9 | **示例数据** | ⏳ | `data/*.json` 仍是开发实例；可脱敏为「首次配置模板」或让 `myco init` 生成默认包 |

---

## 6. 部署 Cookbook（标准落地流程）

> 适用：每位企业成员机器 + 一个共享云端 git 仓库。多机实测通过（机器 A 契约变更 → 机器 B sync → 自动事件/影响/stale/通知）。
> **安装（含自包含一个文件安装 / 升级 / 回滚 / 自动 `myco` 命令）的权威手册见 [安装指导](/docs/installation)。**

### 6.1 一次性：管理员建云端仓库
```bash
# GitLab（内网，推荐）或 GitHub 二选一。内网建议 SSH。
git@<gitlab-host>:<group>/team-shared-kb.git   # SSH 形式；URL 不内嵌 token
```
- 新建空白项目（不带 README，稍后本地 push）。
- 确认每位成员 SSH key 已加进 GitLab/GitHub。
- **安全**：云端库是团队共享知识，绝不 push 密钥/DSN。

### 6.2 每位成员：安装 DeepSeek Harness（见 DSH 官方步骤）+ MyCo-KB 制品
```bash
# 1. 校验 Node（安装器会再次检查，需 ≥23，推荐 24）
node -v
# 2a. 首选：一个文件自包含安装（内含安装器 + 制品，拷这一个文件即可）
bash myco-install-0.5.0.sh [profile]
# 2b. 或：制品 + 安装脚本
bash scripts/install-release.sh install dist/dsh-myco-kb-0.5.0.tgz
#   升级：install <新制品.tgz>；回滚：install-release.sh rollback；查看：install-release.sh list
#   说明：安装器会自动生成可直接用的 myco 命令（~/.local/bin/myco），并默认写入带标记的 shell rc PATH。
#         不想改 shell rc：MYCO_NO_PATH=1 bash ... （仅生成启动器并打印提示）；可用 MYCO_BIN_DIR 自定义 bin 目录。
# 3. 初始化默认知识库
myco init      # 创建 ~/.myco-kb 并挂载；也可 myco mount repo:/path/to/your/vault
# 4. 安装 agent 技能
myco install-skills
```

### 6.3 注册并订阅云端共享包（opt-in）
```bash
myco cloud add shared git@<gitlab-host>:<group>/team-shared-kb.git --sync  # 注册并订阅
# myco cloud add shared <url>            # 仅注册（默认不自动同步）
# myco cloud sync on shared              # 订阅（进自动同步名单）
# myco cloud sync off shared             # 退订
myco mount cloud:shared                 # 挂载云端知识根
myco cloud sync shared                  # 首次 clone；之后自动 commit+push
```

### 6.4 配置 webhook 通知（可选，强烈建议）
```bash
# 设置页「云端同步设置」或 CLI：
myco webhook set https://feishu.example.com/hook   # 飞书兼容 JSON
myco webhook test
```

### 6.5 重启 Harness，验证
- 插件管理页出现 **MyCo-KB** plug-in，**不再显示「不是 DSH 插件」**。
- Plugins 设置区出现 **MyCo-KB 控制台 tab**（本地状态 / 远程库 / 组合配置 / 工作区矩阵 / 变更事件区 / 传播队列区 / Drafts）。
- `myco status` / `myco index` / `myco find <关键词>` 正常。
- daemon 静默监听：文件变更 2s 防抖增量重索引；定时（默认 6h，`maintenanceIntervalHours` 可调）周期：索引重建 → sweep → cloud sync（订阅的包）。

---

## 7. 角色与治理（RACI 建议）

| 角色 | 职责 | MyCo-KB 动作 |
| --- | --- | --- |
| **知识所有者（包主）** | 每包一名，负责内容真实性与演进、契约发布 | 维护 kb.yaml、发契约、确认 stale、推动 收件箱→证据→常青 |
| **知识贡献者** | 写入文档、证据、记录 | 写 markdown、用契约块；通过 git push |
| **知识评审者** | 守口径与标准、审核升级与归档 | `myco impact` / `myco stale` 确认；`myco sweep` 归档候选 |
| **PM / 项目负责人** | 把项目知识资产纳入项目节奏 | 约定契约命名、评审节点、webhook 关注 major 变更 |
| **运维/交付工程师** | 维护安装与同步、升级回滚 | `myco status` / `cloud sync` / 安装器升级 |

**治理节奏建议**：
- 每日：daemon 自动增量索引 + 定时维护（无需人工）。
- 每周：PM 过一遍 `myco events` 与 `myco stale`，确认影响。
- 每月：`myco sweep` 处理归档/孤页候选；评审契约版本 bump。

---

## 8. 日常运维 Runbook

```bash
myco status                       # 维护状态快照（包清单/计数/索引新鲜度/生命周期候选/挂载错误）
myco index                        # 重建跨包索引
myco find 部署                    # 检索：tag×3 / 文件名×2 / 全文×1，证据页带标记
myco profile list / use research  # 组合配置（不同角色/任务装配）
myco sweep                        # 生命周期候选扫描（仅报告）
myco cloud sync [name]            # 同步（clone/pull/commit/push + 自动变更检测）
myco scan / events / impact <id>  # 变更检测 / 事件日志 / 影响分析
myco stale / stale clear <node>   # 待确认受影响节点 / 解除
myco contracts                    # 全库契约块
myco daemon                       # 前台跑守护（排障）
```

- **云端同步订阅**：包默认不自动同步，需按 §6.3 订阅才进 daemon 定时名单；手动 `cloud sync <name>` 不受限。
- **冲突**：pull 用 ff-only；分叉/冲突**报告且不自动解决，本地改动不丢**。人工 `git merge` 后再 sync 恢复。
- **回滚**：git 即版本源，`git log` / `git revert`（revert 后 `myco cloud sync` push）。
- **备份**：`~/.myco`（config.json / index.json / status.json / state.db / cloud/<name>/）+ 知识包源（git 已覆盖）。配置与 sqlite 为增量缓存，文件是事实源，可重建。

---

## 9. 安全与合规（诚实边界）

| 项 | 现状 | 建议 |
| --- | --- | --- |
| **机密** | git URL 不内嵌 token；SSH 走 agent/keychain，HTTPS 走系统 credential helper | 沿用；云端库不 push 密钥/DSN |
| **权限模型** | **没有 RBAC** —— 权限由 git 托管（GitLab/GitHub）掌握；本地 daemon 是用户级进程 | 用 GitLab 分组/成员权限做读写分级；MyCo-KB 自身无账号体系 |
| **审计** | 无企业级审计日志 | 依赖 git 提交历史 + `myco events`（append-only 事件日志）作为变更审计 |
| **静态加密** | 无 at-rest 加密 | 企业内部若要求静态加密，由磁盘/存储层承担（如加密盘） |
| **SSO** | 无 | 若企业要求 SSO，需 git 托管侧承担，MyCo-KB 不介入 |
| **数据主权** | 文件在本地 + git 远程 | 默认本地优先；企业可自建内网 GitLab 闭环数据 |

---

## 10. 风险与缺口清单（交付前必须让企业知情）

| # | 缺口 | 影响 | 缓解 |
| --- | --- | --- | --- |
| 1 | **不是项目管理器**（无任务/排期/看板/里程碑） | 企业若指望用它管项目进度会失望 | 明确定位为**知识底座**；任务排期用 Jira/飞书任务 |
| 2 | **依赖 DeepSeek Harness 运行时** | 企业机器需装 DSH；不是独立 SaaS | 接受 DSH 前提；企业无 DSH 则需先引入 |
| 3 | **无 RBAC / SSO / 审计** | 权限、合规需靠 git 托管 | 用 GitLab 权限矩阵；审计靠 git 历史 + 事件日志 |
| 4 | **Node 版本前提**：`node:sqlite` 需 Node ≥ 23 | Node 18/20 机器装完整功能会崩 | **已修正**：`engines >=23.0.0` + 安装器 `install-release.sh` 启动版本检查（§5 第 5 项）；企业机器仍需满足 |
| 5 | **每机器一个 daemon，无中央服务器** | 写入排他靠 git first-wins；并发写冲突需人工 | 单写者实践（PM 收口发布）；冲突报告不丢本地改动 |
| 6 | **npm 版本与里程碑不同步** | 无 semver 变更叙事 | **已对齐 0.5.0 = v0.5** + `CHANGELOG.md`（§5 第 1 项） |
| 7 | **安装是符号链接，非真实制品** | 无法分发/升级/回滚 | **已改制品安装**：`install-release.sh install/rollback/list`；**自带 `dist/myco-install-<v>.sh` 自包含一个文件安装**，且自动生成可直接用的 `myco` 命令（§5 第 2/3/4 项；自包含安装器见 §6.2） |
| 8 | **peerDependencies 锁 rc 版本** | 需匹配的 DSH 版本 | ⏳ 建立 DSH 版本支持矩阵（§5 第 6 项） |
| 9 | **无 CI/CD 发布流水线** | 交付一致性低 | ⏳ `build-release.sh` 本地校验已完备；发布流水线与官网部署未接线（§5 第 8 项） |
| 10 | **面向 Obsidian 约定**（callout、`[[链接]]`） | 企业非 Obsidian 内容需转换 | 知识包以 Obsidian 库为形；或提供转换脚本 |
| 11 | **检索为 tag×3/文件名×2/全文×1 打分** | 无高级语义重排 | 对足够规模可后续扩展；当前满足知识精确定位 |

---

## 11. 落地路线图（分阶段，降低风险）

| 阶段 | 目标 | 关键动作 | 成功标志 |
| --- | --- | --- | --- |
| **P0 试点**（1 个团队 / 1 个项目） | 跑通并证明价值 | 产品化改造（§5 关键项）→ 建 1 个 repo 包 + 1 个云端共享包 → 2 台机器同步 + 影响分析 | `cloud sync` 跨机传播实测通过；PM 认可影响分析价值 |
| **P1 扩展**（若干项目团队） | 推广知识治理 | 定结构规范、契约命名约定、评审节奏；每 team 一名知识所有者 | 周度 stale/事件有节奏；webhook 通知上轨道 |
| **P2 治理**（企业级） | 沉淀为资产 | 生命周期治理、归档节奏、组合 profile 按角色装配、官网文档引流 | `myco sweep` 候选处理闭环；知识沉淀可追溯 |
| **P3 可选**（动态装配 / 多用户协作） | 能力跃迁 | v0.4 动态装配、更新流深化、更高权限模型 | 任务级「刚好够用」知识装配 |

> v0.4（按任务动态装配）是当前 roadmap 的唯一 NEXT，交付早期可先不做，作为 P3 选项。

---

## 12. Go-Live 检查清单

- [ ] `node -v` ≥ 24（或 ≥ 23），与开发机一致
- [ ] 安装器已从「符号链接」改为「真实制品」并可复现（§5）
- [ ] `engines` 修正 + 安装器做 Node 版本检查（§5）
- [ ] 云端 git 仓库就绪；URL 无内嵌 token；成员 SSH key 到位
- [ ] 每位成员完成：安装 → `myco init` → 注册并订阅云端包 → `cloud sync` → `install-skills`
- [ ] webhook 设置并 `test` 通过
- [ ] `myco status / index / find` 正常；控制台 tab 显示；daemon 静默运行
- [ ] 至少跑通一次「契约变更 → 影响分析 → stale → 通知」跨机链路
- [ ] 冲突/回滚演练过（人工 merge → sync 恢复）
- [ ] 企业知情：这不是任务/排期管理器；权限/SSO 靠 git 托管；Node 前提（§10）

---

## 附：命令速查

```bash
myco init [dir]                         # 初始化 kb.yaml
myco mount repo:/path | local:name | cloud:name
myco mounts / unmount <spec>
myco index / status / find <关键词...>
myco profile list / use <name>
myco sweep                              # 生命周期候选（仅报告）
myco cloud add|list|remove|sync [name]  # 云端 git 同步（opt-in 订阅）
myco scan / events / impact <id> / stale [clear] / contracts
myco webhook set|show|test
myco daemon                             # 前台守护（排障）
myco install-skills                     # 安装 agent 技能
```

数据目录：默认 `~/.myco`（`MYCO_DATA` 覆盖）。核心产物：`config.json`（挂载+cloudRoots+webhook）、`index.json`（跨包索引）、`status.json`（状态）、`cloud/<name>/`（云端 clone）、`state.db`（更新流 sqlite）。
