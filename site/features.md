# 产品特性

> MyCo-KB（真菌之库）是面向 **DeepSeek Harness** 的知识库管理系统插件。它把「知识库」从一堆文件升级为可挂载、可检索、可演进、可传播的系统：知识包统一管理、组合配置按需激活、生命周期自动演进、跨包检索即问即答、云端 git 同步、契约驱动的知识更新流。

本页是每个特性的设计与用法速览，详细操作见[用户文档](/docs/quickstart)，工程实现见[系统设计](/design/overview)。

## 1. 知识包模型 —— 三类知识根，统一包模型

仓库、本地全局、云端全局的知识不再各自为政：

- **repo: 仓库级** —— 随项目仓库走，`kb.yaml` 清单 + 版本 + 依赖声明；
- **local: 本地全局** —— 如 Obsidian iCloud 库，跨项目共享；
- **cloud: 云端全局** —— git 仓库注册后挂载，多机同步。

每个挂载根 = 一个**知识包**，统一了挂载、索引、检索、同步、生命周期所有操作面。

```bash
myco mount repo:/path/to/your-kb   # 挂载仓库级知识根
myco mount local:my-obsidian       # 本地全局
myco mount cloud:my-team-kb        # 云端全局
```

## 2. 组合配置 —— 不同人 × 环境 × 目标

同一个库，不同场景激活不同 profile：

- 用户维度（研究 / 开发 / 管理视角）；
- 环境维度（本地 / CI / 云端）；
- 目标维度（当前任务需要哪组知识包与工具）。

```bash
myco profile list          # 查看所有组合
myco profile use research  # 激活「研究」组合
```

lockfile 可复现：换一台机器、换一个 agent，同一 profile 得到同一套装配。

## 3. 生命周期管理 —— 知识四态，自动演进

- **收件箱** → 未整理的原始输入；
- **证据** → 有来源、可回溯的事实页；
- **常青** → 稳定可信、被引用的事实源；
- **原则** → 决策依据与价值观。

淘汰（休眠 / 孤页）**默认归档不删除**：

```bash
myco sweep   # 生命周期候选扫描（仅报告，不自动执行）
```

| 候选类型 | 判定 |
| --- | --- |
| `archive` | 证据页 > 90 天未更新 |
| `review` | 常青页无出链且无入链（孤页） |

## 4. 跨包检索 —— tag ×3 / 文件名 ×2 / 全文 ×1

检索打分简单透明，CLI 与 agent 工具同源：

```bash
myco find 部署方案
```

- tag 命中 ×3（全库命名空间 tag 如 `acme` 为停用词）；
- 文件名命中 ×2；
- 全文命中 ×1；
- 证据页带 `[证据]` 标记，方便按可信度取舍。

## 5. 云端 git 同步 —— clone / pull / push，冲突不丢

零依赖 git 原语（child_process 调系统 git，非交互 / 超时 / 防注入）：

```bash
myco cloud add mykb https://github.com/me/mykb.git
myco cloud sync mykb
```

- pull 用 **ff-only**：分叉即报告冲突，本地改动**永不丢失**；
- 人工 merge 后再次 sync 恢复；
- 同步完成后自动变更检测，pull 的新内容立即进入事件流。

## 6. 知识更新流 —— 契约驱动，变更不扩散

知识不是静态文件，而是会过期的资产：

- **契约块**：Obsidian callout 语法 `> [!myco-contract] id vN`，是跨页传播边的锚点；
- **变更检测**：内容 hash 对比 → 变更事件（契约变更 = `major`，内容 = `patch`）；
- **影响分析**：同包派生 = 染色，跨包引用 / kb.yaml 依赖 = 传播；
- **stale 队列**：受影响的节点自动标记，等待人工确认；
- **webhook 通知**：major 契约变更自动推送（飞书兼容格式），patch / minor 不打扰；
- **subagent 起草**：stale 项可由 agent 后台起草更新草案，人工确认后应用，不自动写文件。

```bash
myco scan                 # 变更检测
myco events               # 变更事件日志
myco impact <eventId>     # 影响分析（染色 / 传播）
myco stale                # 待确认受影响节点
myco contracts            # 全库契约块清单
```

## 7. 后台守护 —— 静默常驻，零打扰

宿主平面（Harness）内常驻：

- **文件 watcher**：变更自动增量重索引（2 秒防抖）；
- **定时维护**：生命周期扫描 + 云同步 + 变更检测（默认 6h）；
- `timer.unref()` 不阻塞进程退出；
- 随插件纤维装载 / 卸载（`ctx.effect` 返回 disposer 关闭 watcher / timer）。

## 8. Agent 原生 —— 插件形态，三面一体

- **服务端**（`lib/index.js`）：Cordis 插件，注册 `ctx.myco` 远程服务 + agent 工具面；
- **客户端**（`lib/client.js`）：插件管理页控制台 tab —— 本地状态 / 远程库 / 组合配置 / 工作区矩阵（含染色 / 传播视图）；
- **技能包**（`skills/*`）：`myco install-skills` 安装到 `~/.agents/skills/`，知识库与技能双形态同源。

## 特性一览表

| 能力 | CLI | 控制台 | Agent 工具 | daemon |
| --- | :-: | :-: | :-: | :-: |
| 挂载 / 索引 / 状态 | ✅ | ✅ | ✅ | 自动 |
| 检索 | ✅ | — | ✅ | — |
| 生命周期扫描 | ✅ | ✅ | ✅ | 定时 |
| 组合配置 | ✅ | ✅ | — | — |
| 云端同步 | ✅ | ✅ | ✅ | 定时 |
| 变更检测 / 影响分析 | ✅ | ✅ | — | 定时 |
| webhook 通知 | ✅ | ✅ | — | major 自动 |
| subagent 起草 | — | ✅ | — | — |

下一步：[快速开始](/docs/quickstart) 或查看[系统设计](/design/overview)。
