# 版本发布

MyCo-KB 每个对外版本的变更记录。自 `0.5.0` 起，**npm 包版本 = 该发布所包含的功能里程碑**，因此这里只有一条时间线：一个版本 = 一次能力交付。

<div class="tip-card">

**阅读约定**：本页按 **minor 系列**汇总（如 `0.8.x`），系列内的补丁版本合并进所属条目、不单独成节，下载指向该系列的最新补丁版本。早期未单独发版的里程碑仅作**只读存档**展示，没有可下载制品。安装与升级见 [安装指导](/docs/installation)，命令细节见 [CLI 命令参考](/docs/cli)。

</div>

<div class="roadmap">

<div class="rm-item done">
  <h3><span class="rm-tag done">最新</span>0.8.x —— 数据目录解析与部署适配</h3>
  <p>统一 <code>dataDir</code> 解析优先级：显式 <code>dataDir</code> &gt; <code>MYCO_DATA</code> &gt; 默认；默认值在普通环境为 <code>~/.myco</code>（零配置），在 agent 会话环境改用工作区相对的 <code>&lt;workspace&gt;/.myco</code>，使会话内直接运行 <code>myco</code> 不再受工作区外写入限制影响。插件侧同样支持 <code>dataDir</code> / <code>MYCO_DATA</code> 覆盖；同时修正工具调用的呈现契约（补齐卡片类型字段，避免宿主渲染降级）。</p>
  <p class="rm-links"><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.8.1">下载 v0.8.1</a><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.8.0">v0.8.0</a></p>
</div>

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>0.7.x —— 按任务动态装配</h3>
  <p>交付 v0.4 里程碑。数据面：<code>myco assemble &lt;目标&gt;</code> 按任务上下文做两层匹配（profile 精确匹配 → 知识包子集软匹配），产出工具掩码与可复现 lockfile，命中为空时回退全量。工具面：新增 <code>myco_assemble</code> agent 工具与 agent 作用域的 scoped 检索注入。控制台新增「按任务动态装配」视图，可回显上次装配结果。</p>
  <p class="rm-links"><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.7.1">下载 v0.7.1</a><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.7.0">v0.7.0</a></p>
</div>

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>0.6.0 —— 聚合遥测 + 自动更新</h3>
  <p>严格匿名的 <strong>opt-in</strong> 聚合遥测（默认关闭，且需显式配置上报地址才发送，不含任何知识内容与标识信息，详见 <a href="/docs/telemetry">隐私与遥测</a>）；<code>myco upgrade</code> 自动更新（校验安装包指纹、支持回滚）；官网自动发布。</p>
  <p class="rm-links"><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.6.0">下载 v0.6.0</a></p>
</div>

<div class="rm-item done archive">
  <h3><span class="rm-tag archive">存档</span>0.5.0 —— 首个产品化交付版本</h3>
  <p>交付 v0.5 里程碑，并把此前全部能力整体产品化：知识包模型、组合配置 profile、生命周期管理、跨包检索、插件形态与控制台、云端 git 同步、知识更新流（契约解析 / 变更检测 / 影响分析 / stale 队列 / 通知 / subagent 起草），同时补齐发布构建、安装与升级脚本、企业交付手册。</p>
  <p class="rm-links"><span class="rm-readonly">仅存档记录 —— 早于自动发布流程，未提供制品下载；请安装 0.6.0 及以上版本。</span></p>
</div>

<div class="rm-item done archive">
  <h3><span class="rm-tag archive">未单独发版</span>v0.3 —— 云端 git 同步</h3>
  <p>零依赖 git 原语（clone / pull / push）；冲突报告且本地改动不丢；控制台远程库区与同步按钮；同步后自动触发变更检测。本里程碑在 <code>0.1.0</code> 版本号下累积交付，未单独发版。</p>
  <p class="rm-links"><span class="rm-readonly">仅存档记录 —— 无独立版本号与下载，能力已包含在 0.5.0 及以上版本中。</span></p>
</div>

<div class="rm-item done archive">
  <h3><span class="rm-tag archive">未单独发版</span>v0.2 —— 插件化与控制台</h3>
  <p>Cordis 插件形态（服务端 + 客户端控制台 tab）；远程服务方法集；宿主平面 daemon（watcher + 定时维护）。本里程碑同样在 <code>0.1.0</code> 版本号下累积交付，未单独发版。</p>
  <p class="rm-links"><span class="rm-readonly">仅存档记录 —— 无独立版本号与下载，能力已包含在 0.5.0 及以上版本中。</span></p>
</div>

<div class="rm-item done archive">
  <h3><span class="rm-tag archive">存档</span>0.1.0 —— CLI 基础（v0.1）</h3>
  <p>纯 Node 零依赖核心；知识包模型与 repo / local / cloud 三类知识根；挂载、索引、状态、检索、组合配置 profile、生命周期扫描 sweep 全套 CLI。这是项目的首个版本号，此后 v0.2、v0.3 两个里程碑都在它之下滚动交付，直到 <code>0.5.0</code> 才恢复「一个里程碑 = 一个版本」。</p>
  <p class="rm-links"><span class="rm-readonly">仅存档记录 —— 未提供制品下载。</span></p>
</div>

</div>

## 接下来

- 知识更新流深化（更细的契约粒度与传播策略）；
- 多用户协作与共享知识库治理。

## 贯穿版本的设计原则

- **文件是唯一事实源**，一切缓存可重建；
- **零依赖核心**，CLI 与插件共用同一套实现；
- **人永远收口**：机器检测、agent 起草、人确认；
- **淘汰归档不删除**，历史可回溯。
