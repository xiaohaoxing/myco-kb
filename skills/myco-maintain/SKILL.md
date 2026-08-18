---
name: myco-maintain
description: Maintain a MyCo-KB knowledge base: mount knowledge roots, rebuild index, view maintenance status, activate combination profiles, run lifecycle sweep. Use when the user wants to manage KB packages, update the index, check maintenance health, or switch KB combinations.
whenToUse: |
  - User wants to mount/unmount a knowledge root (repo docs, local vault, cloud).
  - User wants to rebuild the index or check maintenance status.
  - User wants to activate a combination profile (different users/environments).
---

# myco-maintain — 知识库维护

## 挂载与索引

```bash
myco mount repo:/path/to/kb   # 挂载知识根（repo:/local:/cloud: 或直接路径）
myco mounts                   # 查看挂载
myco index                    # 重建跨包索引
myco status                   # 维护状态（写入 data/status.json，UI 消费）
```

## 组合配置

```bash
myco profile list             # 列出组合
myco profile use <name>       # 激活组合
```

## 静默守护

`myco daemon` 前台运行：watcher 监听变化增量重索引 + 定时维护（默认 6h）。DSH 插件形态下由插件宿主平面托管，无需手动启动。
