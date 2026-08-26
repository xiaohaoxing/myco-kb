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

## 版本发布（自 0.5.0 起 npm 版本 = 功能里程碑）

<div class="roadmap">

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>0.5.0 —— 产品化交付基线</h3>
  <p>首个 productized 版本：把 v0.1–v0.5 全部功能统一打包（知识包模型 / 组合 profile / 生命周期 / 插件形态 / 云端同步 / 知识更新流），并补齐产品化交付前提（打包 / 安装脚本 / 发布构建 / 企业 Cookbook）。</p>
</div>

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>0.6.0 —— 聚合遥测 + 自动更新</h3>
  <p>严格匿名 opt-in 聚合遥测（PostHog / generic）+ <code>myco upgrade</code> 自动更新（sha256 校验、可回滚）+ GitHub Pages 官网自动发布。</p>
</div>

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>0.7.0 —— v0.4 按任务动态装配</h3>
  <p>数据面 <code>myco assemble &lt;goal&gt;</code> + 知识包子集软匹配 + 可复现 lockfile；工具面 <code>myco_assemble</code> + agent 作用域 scoped 检索注入；控制台「按任务动态装配」视图。</p>
</div>

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>0.7.1 —— 公开内容脱敏</h3>
  <p>清理公开仓库 / 官网 / 制品中的内部与敏感信息：移除内置 PostHog apiKey、内部命名与内网地址占位化、代码停用词去公司专属词、文案与开发细节中性化。</p>
</div>

</div>

## 后续方向

- 知识更新流深化、多用户协作。

## 设计原则（贯穿所有版本）

- **文件是唯一事实源**，一切缓存可重建；
- **零依赖核心**，CLI 与插件共用同一套实现；
- **人永远收口**：机器检测、agent 起草、人确认；
- **淘汰归档不删除**，历史可回溯。

## 参与

- 源码仓库：本仓库即产品仓库（`lib/` `bin/` `skills/` `test/`）；
- 文档：本站所有页面与仓库 `README.md`、`docs/architecture.md` 同源维护；
- 设计权威文档：Obsidian 知识库 `项目/MyCo-KB/MyCo-KB 架构设计.md`。
