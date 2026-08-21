# 数据模型与检索

## 数据模型

### 挂载（config.json）

```json
{ "spec": "repo:/path", "enabled": true, "scope": "repo", "mountedAt": "..." }
```

spec 前缀：`repo:` / `local:` / `cloud:`（cloud 需 `cloudRoots` 映射）。

### 知识包（kb.yaml）

```yaml
id / name / scope / version / state / dependencies / whenToUse
```

缺省由目录名推导（id、版本）。

### 索引（index.json）

- tag 倒排（tag → 文档集合）；
- documents（rel / isEvidence / mtime）。

### 状态（status.json）

包清单 / 计数 / 索引新鲜度 / 生命周期候选 / 挂载错误 —— 控制台消费。

## 检索打分

```
tag 命中 ×3 + 文件名 ×2 + 全文 ×1
```

- 全库命名空间 tag（如 `chaoheti`）为停用词，不参与匹配；
- 结果带 `isEvidence` 标记，供按可信度取舍；
- 返回 top 20。

## 生命周期扫描（sweep，仅报告）

| 候选类型 | 判定 |
| --- | --- |
| `archive` | 证据页 > 90 天未更新 |
| `review` | 常青页无出链且无入链（孤页） |

扫描只报告候选，不自动执行删改。

## 存储分层

```text
文件（Markdown）  ←—— 唯一事实源
   │
   ├─ index.json        倒排索引（可重建）
   ├─ status.json       状态快照（可重建）
   └─ store.sqlite      更新流持久化（node:sqlite，内置零依赖）
        ├─ events    append-only 事件日志
        ├─ stale     注册表（待确认受影响节点）
        ├─ hashes    内容 hash 缓存
        └─ drafts    subagent 起草草案
```

## 相关

- 更新流数据层：[知识更新流设计](/design/updateflow)
- 用户视角：[知识包与挂载](/docs/packages)、[生命周期管理](/docs/lifecycle)
