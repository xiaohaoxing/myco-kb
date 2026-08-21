# 常见问题 FAQ

## 安装与运行

**Q: 为什么 `node` 命令找不到？**
A: MyCo-KB 需要 Node ≥ 18。请确保 node 在 PATH 中（如 `export PATH="/opt/homebrew/bin:$PATH"`），再运行 `npm run links` / `npm test`。

**Q: 安装进 Harness 后控制台 tab 不出现？**
A: 检查三点：① 插件被插件管理页判为「不是 DSH 插件」→ 确认走标准 bundle 装载（`dsh.bundle.patch` 指向 cordis.patch.yml，不要手动 insert）；② slot 注册缺 `label` → tab 不显示；③ 重启 Harness 后生效。

**Q: 数据存在哪里？**
A: 默认 `~/.myco`，`MYCO_DATA` 覆盖。含 config.json（挂载/云端/webhook）、index.json、status.json、cloud/ 与 store.sqlite。

## 检索

**Q: 为什么搜不到？**
A: 依次排查：`myco status` 看索引新鲜度与挂载错误 → `myco index` 重建索引 → 确认关键词不是全库命名空间停用词（如 `chaoheti`）。

**Q: 证据页和常青页有什么区别？**
A: 证据页（带 `证据` tag）记录历史流水与来源，不做状态依据；常青页是当前状态、边界、口径的事实源。检索结果会标注 `[证据]`。

## 生命周期

**Q: sweep 会删除我的内容吗？**
A: 不会。`myco sweep` **只报告候选**（休眠证据页 → 归档候选；孤页 → 补链/归档候选），一切删改都需要显式人工确认，淘汰默认归档不删除。

**Q: 什么是 stale？**
A: 契约变更影响分析后，受影响节点自动标记为 stale（待人工确认）。用 `myco stale` 查看、`myco stale clear <node>` 解除。

## 云端同步

**Q: 同步冲突了怎么办？**
A: 这是设计行为：pull 用 ff-only，分叉即报告冲突且**本地改动永不丢失**。人工 merge 后再次 `myco cloud sync` 恢复。

**Q: 云端仓库密码/密钥怎么处理？**
A: 直接调用系统 git，复用你的 git 凭据配置（ssh key / credential helper），非交互、带超时。

## 知识更新流

**Q: major 变更会打扰我吗？**
A: major 契约变更才推送 webhook（含染色/传播摘要）；patch / minor 只记录事件，不推送。

**Q: subagent 起草会直接改我的文件吗？**
A: 不会。草案存 drafts 表，控制台展示，**人工确认后手动应用**。

**Q: 契约块写在哪？**
A: 任意 Markdown 页内的 Obsidian callout：`> [!myco-contract] id vN` + 内容。引用方用 `[[页#contract-id]]` 构成传播边。

## 已知边界（实测结论）

- `dsh-schedule` 是 **agent-scoped**（只在 live 根 agent 上装提醒工具），不适合宿主平面守护；宿主平面维护用 Cordis 插件自身 `setInterval` + 文件 watcher（已实现）。
- 控制台挂在插件管理页 `settings.plugins.tab` slot（与 plugin-inventory 同槽）。
- 设置页/非会话 UI 不依赖 Typert remote face（受 inject 声明门控）；控制台数据走 `ctx.webServer.register` 同源 JSON 路由。
- React effect 内同步抛错会卸载整棵组件树 —— 错误边界提升到 slot 最外层 + 所有 effect 回调 try/catch（已防御）。

## 更多

- 完整命令：[CLI 命令参考](/docs/cli)
- 工程实现：[系统设计](/design/overview)
- 路线规划：[路线图](/design/roadmap)
