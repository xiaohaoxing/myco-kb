# 版本发布

MyCo-KB 每个对外版本的变更记录。自 `0.5.0` 起，**npm 包版本 = 该发布所包含的功能里程碑**，因此这里只有一条时间线：一个版本 = 一次能力交付。

<div class="tip-card">

**阅读约定**：本页按 **minor 系列**汇总（如 `0.8.x`），系列内的补丁版本合并进所属条目、不单独成节。安装与升级见 [安装指导](/docs/installation)，命令细节见 [CLI 命令参考](/docs/cli)。

</div>

<div class="roadmap">

<div class="rm-item done">
  <h3><span class="rm-tag done">最新</span>0.8.x —— 数据目录解析与部署适配</h3>
  <p>统一 <code>dataDir</code> 解析优先级：显式 <code>dataDir</code> &gt; <code>MYCO_DATA</code> &gt; 默认；默认值在普通环境为 <code>~/.myco</code>（零配置），在 agent 会话环境改用工作区相对的 <code>&lt;workspace&gt;/.myco</code>，使会话内直接运行 <code>myco</code> 不再受工作区外写入限制影响。插件侧同样支持 <code>dataDir</code> / <code>MYCO_DATA</code> 覆盖；同时修正工具调用的呈现契约（补齐卡片类型字段，避免宿主渲染降级）。</p>
</div>

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>0.7.x —— 按任务动态装配</h3>
  <p>数据面：<code>myco assemble &lt;目标&gt;</code> 按任务上下文做两层匹配（profile 精确匹配 → 知识包子集软匹配），产出工具掩码与可复现 lockfile，命中为空时回退全量。工具面：新增 <code>myco_assemble</code> agent 工具与 agent 作用域的 scoped 检索注入。控制台新增「按任务动态装配」视图，可回显上次装配结果。</p>
</div>

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>0.6.0 —— 聚合遥测 + 自动更新</h3>
  <p>严格匿名的 <strong>opt-in</strong> 聚合遥测（默认关闭，且需显式配置上报地址才发送，不含任何知识内容与标识信息，详见 <a href="/docs/telemetry">隐私与遥测</a>）；<code>myco upgrade</code> 自动更新（校验安装包指纹、支持回滚）；官网自动发布。</p>
</div>

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>0.5.0 —— 首个产品化交付版本</h3>
  <p>把知识包模型、组合配置 profile、生命周期管理、跨包检索、插件形态与控制台、云端 git 同步、知识更新流（契约解析 / 变更检测 / 影响分析 / stale 队列 / 通知 / subagent 起草）整体打包为可交付产品，并补齐发布构建、安装与升级脚本、企业交付手册。</p>
</div>

</div>

## 早期基线

`0.5.0` 之前，v0.1～v0.4 的功能里程碑（CLI 基础、插件化与控制台、云端 git 同步、动态装配的早期设计）在 `0.1.0` 下持续累积交付，未单独发版；这些能力已全部包含在 `0.5.0` 及之后的版本中。

## 接下来

- 知识更新流深化（更细的契约粒度与传播策略）；
- 多用户协作与共享知识库治理。

## 贯穿版本的设计原则

- **文件是唯一事实源**，一切缓存可重建；
- **零依赖核心**，CLI 与插件共用同一套实现；
- **人永远收口**：机器检测、agent 起草、人确认；
- **淘汰归档不删除**，历史可回溯。
