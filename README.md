# MyCo-KB

真菌之库 · 我的公司 —— 知识库管理系统（DeepSeek Harness 插件形态）

> 权威设计文档：Obsidian 知识库 `项目/MyCo-KB/MyCo-KB 架构设计.md`（本仓库 `docs/architecture.md` 为工程视图）

## 是什么

- **知识包**：repo 级 / 本地全局 / 云端全局 三类知识根，统一包模型（`kb.yaml` 清单 + 版本 + 依赖）
- **组合配置**：不同用户 × 环境 × 目标激活不同 profile（lockfile 可复现）
- **生命周期**：收件箱 → 证据 → 常青 → 原则；淘汰默认归档不删除
- **插件形态**：Cordis 插件（服务端守护 + 客户端控制台 + agent 工具/技能）

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
  client.js       客户端入口占位（v0.2 控制台）
  tools.js        agent 工具面（dsh-tools）
  daemon.js       后台守护：watcher + 定时维护
  core/           纯 Node 核心（CLI 与插件共用）
    myco.js         编排器（挂载/索引/状态/检索/profile/sweep）
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
test/             node:test 单测
```

## 开发

```bash
npm run check     # 语法检查
npm test          # 单测
```

进度：v0.1 CLI 可用；v0.2 控制台 UI + daemon 宿主化；v0.3 云端同步；v0.4 动态装配。
