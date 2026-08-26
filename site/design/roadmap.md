# 路线图

<div class="roadmap">

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>v0.1 —— CLI 基础</h3>
  <p>挂载 / 索引 / 状态 / 检索 / profile / sweep 全套 CLI；纯 Node 零依赖核心；知识包模型与三类知识根。</p>
</div>

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>v0.2 —— 插件化与控制台</h3>
  <p>Cordis 插件形态（服务端 + 客户端控制台 tab）；Typert 远程服务（12 方法）；宿主平面 daemon（watcher + 定时维护）。</p>
</div>

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>v0.3 —— 云端 git 同步</h3>
  <p>零依赖 git 原语（clone / pull / push）；冲突报告且本地改动不丢；控制台远程库区 + 同步按钮；同步后自动变更检测。</p>
</div>

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>v0.4 —— 按任务动态装配</h3>
  <p>数据面（matchEngine + assemble API + <code>myco assemble &lt;goal&gt;</code> + 可复现 lockfile）+ 工具面（<code>myco_assemble</code> 工具 + agent 作用域 scoped 检索注入）+ 控制台装配视图；命中为空回退默认。</p>
</div>

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>v0.5 —— 知识更新流（全量交付）</h3>
  <p>契约解析 / 变更检测 / 影响分析 / stale 队列数据层；控制台染色/传播视图；webhook 通知（major 契约变更自动推送）；subagent 起草调度（v0.5 最后一块拼图）。</p>
</div>

</div>

> 说明：里程碑**编号顺序**为 v0.1 → v0.5，但**交付顺序**中 v0.5 先于 v0.4 —— v0.4（动态装配）被定位为 P3 可选能力、且建立在 v0.5 知识更新流之上，故在首个产品化版本（v0.5）之后才推进。现已全部交付（0.7.0 对齐功能里程碑 v0.4）。

## 交付节奏

```text
v0.1 CLI ✅ → v0.2 控制台+远程+daemon ✅ → v0.3 云端同步 ✅
→ v0.5 知识更新流（数据层+控制台+webhook+subagent 起草）✅ → v0.4 动态装配 ✅（0.7.0 已发布）
→ 后续：更新流深化、多用户协作
```

## 设计原则（贯穿所有版本）

- **文件是唯一事实源**，一切缓存可重建；
- **零依赖核心**，CLI 与插件共用同一套实现；
- **人永远收口**：机器检测、agent 起草、人确认；
- **淘汰归档不删除**，历史可回溯。

## 参与

- 源码仓库：本仓库即产品仓库（`lib/` `bin/` `skills/` `test/`）；
- 文档：本站所有页面与仓库 `README.md`、`docs/architecture.md` 同源维护；
- 设计权威文档：Obsidian 知识库 `项目/MyCo-KB/MyCo-KB 架构设计.md`。
