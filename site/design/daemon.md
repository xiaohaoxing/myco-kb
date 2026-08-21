# 后台守护

daemon 让知识库「静默运转」：索引永远新鲜、生命周期定时扫描、云端定时同步、变更自动检测。

## 组成

| 机制 | 说明 |
| --- | --- |
| 文件 watcher | 变更自动增量重索引（2 秒防抖） |
| 定时维护 | 默认 6h：生命周期扫描 + 云同步 + 变更检测 |
| 事件循环安全 | `timer.unref()` 不阻塞进程退出 |
| 生命周期绑定 | 随插件纤维装载/卸载（`ctx.effect` 返回 disposer 关闭 watcher/timer） |

## 云同步防重入

```text
syncCloudIfIdle()
  ├─ syncing 标志防重入（git 超时可达 120s，不能阻塞定时循环）
  ├─ syncAll()
  │    └─ .then(detectChanges)  ← pull 的新内容立即进事件流，不等下一周期
  └─ finally: syncing = false
```

## 为什么不用 dsh-schedule

`dsh-schedule` 是 **agent-scoped**（只在 live 根 agent 上注册提醒工具），不适合宿主平面守护。实测结论：宿主平面维护用 Cordis 插件自身 `setInterval` + 文件 watcher（已实现）。

## 行为时序

```text
挂载插件 → 启动 watcher + 定时器
  │
  ├─ 文件变更 → 2s 防抖 → 增量重索引
  ├─ 每 6h   → 生命周期扫描（仅报告）
  │          → 云同步（防重入，120s 超时）→ 变更检测
  └─ 卸载插件 → disposer 关闭 watcher/timer
```

## 相关

- 用户操作：`myco daemon`（前台运行）见 [CLI 命令参考](/docs/cli)
- 整体架构：[运行时形态与架构](/design/architecture)
