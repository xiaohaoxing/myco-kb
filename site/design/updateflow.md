# 知识更新流设计

知识更新流是 v0.5 的核心：把「知识过期」从人的记忆问题变成系统的可追踪问题。

## 组件

| 模块 | 职责 |
| --- | --- |
| `lib/core/contract.js` | Obsidian callout 契约块解析 + `[[页#契约]]` 强引用提取 |
| `lib/core/events.js` | 内容 hash 对比 → 变更事件；`contractDiff` 对比前后契约 |
| `lib/core/store.js` | node:sqlite（events append-only / stale 注册表 / hashes 缓存 / drafts） |
| `lib/core/impact.js` | `buildContractIndex`（两遍扫描）→ `analyzeImpact` |
| `lib/propagate.js` | subagent 起草调度 |

## 变更源双轨

```text
git 化包      → git diff（commit = 版本，tag = 语义化版本）
本地全局      → 内容 hash 对比（Obsidian iCloud 等非 git 库）
        ↘ 统一变更事件 { nodeId, kind, before, after, bump }
```

## 契约块与传播边

- 契约块：`> [!myco-contract] <id> v<N>` + 内容（Obsidian callout 语法）；
- `[[页#contract-id]]` 锚点命中已知契约 = **强引用**，构成传播边；
- 普通 `[[链接]]` = 弱引用，不构成传播边；
- 代码块围栏内的引用示例跳过（防误报，有单测回归）。

## 事件与 bump

| bump | 触发 | 处理 |
| --- | --- | --- |
| `major` | 契约块内容变更 | 自动影响分析 + webhook 推送 |
| `minor` | 契约版本号变更 | 自动影响分析 |
| `patch` | 普通内容变更 | 记录，不打扰 |

首次扫描建立基线；之后每次对比内容 hash。

## 影响分析

```text
analyzeImpact(eventId)
  ├─ 同包派生链      → 染色（dye）
  ├─ 跨包引用        → 传播（spread）
  └─ kb.yaml 依赖反向 → 依赖传播（pkgSpread）
```

- 内存 BFS；大数据量回退 SQLite 递归 CTE；
- 有传播 → 自动标 stale（待人工确认）。

## 传播执行分层

```text
自动重派生      → dsh-jobs 后台任务
下游语义更新    → subagent 起草（agent 起草，人确认，不自动写文件）
通知            → webhook（飞书兼容格式 JSON）
收口            → 所有传播任务控制台人工确认
```

## 状态机

- 新增 `stale` 状态：常青页 = 事件流物化视图（重投影）；
- 证据层**只追加变更事件**，不修改历史。

## Subagent 起草

- 控制台 stale 项「起草更新」→ POST /draft → `ctx.subagents.start`（provider 默认 `spawn`，可配置 `subagentProvider`）后台调度；
- prompt 含变更摘要 + 受影响节点内容；
- 草案存 drafts 表（pending → running → done / error）；
- 控制台 DraftsSection 展示，人工确认后手动应用。

## API

```text
/myco/api/webhook   GET（URL 脱敏）/ POST（设置）/ test
/draft              POST（起草）
/drafts             GET（列表）
/draft/clear        POST（清空）
```

## 相关

- 用户操作：[知识更新流](/docs/updates)
- 数据层：[数据模型与检索](/design/datamodel)
