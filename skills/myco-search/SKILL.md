---
name: myco-search
description: Search a MyCo-KB knowledge base by frontmatter tags (inverted index) with filename and full-text fallback. Use when the user asks to find where something is recorded in a knowledge base, wants a tag-based index, or needs to locate a concept across knowledge packages.
whenToUse: |
  - User asks "where is X recorded" / "find X in the KB" / "which page covers X".
  - User wants to search knowledge packages by concept, not exact wording.
  - User asks about the reading protocol (evergreen vs evidence pages).
---

# myco-search — 知识包检索

## 命令

```bash
myco find <关键词...>        # tag 命中×3 / 文件名×2 / 全文×1，返回 top20
myco status                 # 先看挂载与索引新鲜度
```

## 解读

- 命中常青页（无 `证据` tag）→ 直接读当前状态、边界、口径。
- 命中证据页（有 `证据` tag）→ 读历史流水，不做状态依据。
- 全库命名空间 tag（如 `acme`）是停用词，不参与匹配。

## 无结果时

1. `myco index` 重建索引；`myco status` 看挂载是否正常。
2. 确认关键词不是停用词。
