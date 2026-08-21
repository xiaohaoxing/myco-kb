# 知识更新流

知识不是静态文件，而是会过期的资产。更新流让「某个契约变了，谁受影响」这个问题变得可回答、可追踪、可通知。

## 核心概念

### 契约块

Obsidian callout 语法声明的稳定接口：

```markdown
> [!myco-contract] order-api v3
> 订单接口的契约定义……

本页引用 [[订单页#order-api]]  ← 锚点命中已知契约 = 强引用（传播边）
```

- `> [!myco-contract] <id> v<N>` + 内容 = 契约块；
- `[[页#contract-id]]` = **强引用**，构成传播边；
- 普通 `[[链接]]` = 弱引用，不构成传播边；
- 代码块围栏内的引用示例会被跳过（防误报）。

### 变更事件

```bash
myco scan          # 内容 hash 对比 → 变更事件
myco events        # 事件日志
```

| bump | 触发 | 行为 |
| --- | --- | --- |
| `major` | 契约块变更 | 自动影响分析 + webhook 推送 |
| `minor` | 契约版本号变更 | 自动影响分析 |
| `patch` | 普通内容变更 | 记录，不打扰 |

首次扫描建立基线，之后每次对比内容 hash。

## 影响分析

```bash
myco impact <eventId>
```

- **染色**（同包派生）：反向派生链上所有节点；
- **传播**（跨包引用）：引用本契约的其他包页面；
- **依赖传播**（kb.yaml dependencies 反向）：依赖本包的其他包。

有传播时自动将受影响节点标记为 **stale**（待人工确认）。

## stale 队列

```bash
myco stale               # 待确认受影响节点
myco stale clear <node>  # 确认解除
```

常青页 = 事件流物化视图（重投影）；证据层只追加变更事件，不修改历史。

## Webhook 通知

```bash
myco webhook set https://example.com/hook   # 设置（留空清除）
myco webhook show
myco webhook test
```

- 配置存 `config.json.webhook.url`，设置页 / CLI 可配；
- POST **飞书兼容格式** JSON；
- daemon 对 major 事件自动 `impact` + 推送（染色 / 传播摘要）；
- patch / minor 不打扰。

## Subagent 起草

控制台 stale 项可「起草更新」→ 后台调度 subagent：

- prompt 含变更摘要 + 受影响节点内容；
- 草案存 drafts 表（pending → running → done / error）；
- **不自动写文件**，人工确认后手动应用；
- provider 默认 `spawn`，可配置 `subagentProvider`。

## 设计动机

- **双轨变更源**：git 化包用 `git diff`（commit=版本、tag=语义化版本）；本地全局（Obsidian iCloud）用内容 hash 对比；
- **存储分层**：文件为唯一事实源，`node:sqlite` 做增量缓存 / 持久状态（events append-only / stale 注册表 / hashes 缓存）；
- **人永远收口**：所有传播任务人工确认，agent 只起草、不落盘。

## 相关

- 设计细节见 [系统设计 · 知识更新流设计](/design/updateflow)
- 控制台染色 / 传播视图见 [系统设计 · 控制台](/design/architecture)
