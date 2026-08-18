# MyCo-KB 工程架构（v0.1）

> 设计原理（分层模型、生命周期、组合模式、DSH 扩展点映射）以 Obsidian `项目/MyCo-KB/MyCo-KB 架构设计.md` 为准；本页只讲工程结构。

## 运行时形态

1. **CLI（`myco`）**：纯 Node，零依赖，复用 `lib/core/*`，数据目录 `~/.myco`（`MYCO_DATA` 覆盖）。
2. **DSH 插件（`@dsh/myco-kb`）**：Cordis 插件。
   - 服务端 `apply(ctx)`：`ctx.provide('myco', …)` 暴露服务；`ctx.tools.register(defineTool(…))` 注册 agent 工具；`ctx.effect` 托管 daemon（watcher + 定时维护）。
   - 客户端 `lib/client.js`：v0.2 控制台面板（本地状态 / 远程库 / 组合配置 / 工作区矩阵）。
3. **技能包（`skills/*/SKILL.md`）**：`myco install-skills` 复制到 `~/.agents/skills/`，与知识库双形态同源。

## 数据模型

- 挂载：`config.json` → `{ spec, enabled, scope, mountedAt }`；spec 前缀 `repo:` / `local:` / `cloud:`（cloud 需 `cloudRoots` 映射）。
- 知识包：每个挂载根 = 一个包；`kb.yaml`（id/name/scope/version/state/dependencies/whenToUse），缺省由目录名推导。
- 索引：`index.json` → tag 倒排 + documents（rel/isEvidence/mtime）。
- 状态：`status.json` → 包清单/计数/索引新鲜度/生命周期候选/挂载错误（UI 消费）。

## 检索打分

tag 命中 ×3 + 文件名 ×2 + 全文 ×1；全库命名空间 tag（如 `chaoheti`）为停用词。

## 生命周期扫描（`sweep`，仅报告）

- `archive`：证据页 > 90 天未更新。
- `review`：常青页无出链且无入链（孤页）。

## 诚实边界

- `dsh-schedule` 为 agent-scoped；daemon 定时维护目前用 Cordis `ctx.setInterval` + `timer.unref()`，宿主平面持久化用法待 v0.2 实测。
- 插件管理页 action slot 不存在，控制台挂载需一次 core 贡献或独立工作区页面。

## 路线

v0.1 CLI（当前）→ v0.2 控制台 UI + daemon 宿主化 → v0.3 云端 git 同步 + 远程库管理 → v0.4 按任务动态装配 profile/工具。
