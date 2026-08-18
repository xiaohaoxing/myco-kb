---
name: myco-lifecycle
description: Decide knowledge promotion and archival in a MyCo-KB knowledge base: inbox → evidence → evergreen → principle, and obsolete/duplicate handling. Use when the user asks what to do with old records, whether a note should be promoted, or how to archive/remove knowledge.
whenToUse: |
  - User asks "should this record be promoted to evergreen?" or "is this note still valid?".
  - User wants to archive obsolete knowledge or clean up duplicates.
  - User runs `myco sweep` and needs to interpret candidates.
---

# myco-lifecycle — 知识生命周期

## 晋升（事件驱动，不是时间驱动）

| 晋升步 | 触发 | 判定标准 |
| --- | --- | --- |
| 收件箱 → 证据 | 信息被结构化 | 有日期、单一断言、有出处 |
| 证据 → 常青 | 第二次被复用 / 正式验收 | 通过「去掉日期还成立吗」测试 |
| 常青 → 原则 | 两个以上实例可抽象 | 提炼后能指导未来决策 |
| 项目 → 公共 | 第二个项目用到 | 已与项目特定事实解耦 |

心法：用到第二次就提炼。

## 淘汰（默认归档，不删除）

- 失效 → 标 `obsolete` + `superseded_by`，移出活跃面
- 被覆盖 → 旧内容降为证据
- 冗余 → 仅此情况删除副本
- 证据层只增不改；归档必须可检索；删除只允许收件箱垃圾与冗余副本

## 扫描候选

```bash
myco sweep    # 报告：休眠证据页（>90 天未更新）→ 归档候选；孤页（无出链无入链）→ 补链/归档候选
```

候选仅报告，由人确认后执行。
