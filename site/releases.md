# 版本发布

按 minor 系列汇总，补丁版本并入所属条目。`0.6.0` 以前的版本仅作存档展示，不提供下载。

<div class="roadmap">

<div class="rm-item done">
  <h3><span class="rm-tag done">最新</span>0.8.x —— 数据目录解析与部署适配</h3>
  <p>统一数据目录解析：显式 <code>dataDir</code> &gt; <code>MYCO_DATA</code> &gt; 默认；默认落在 <code>~/.myco</code>，agent 会话内改用工作区相对的 <code>.myco</code>。插件侧同样支持覆盖，并修正了工具调用的呈现契约。</p>
  <p class="rm-links"><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.8.1">下载 v0.8.1</a><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.8.0">v0.8.0</a></p>
</div>

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>0.7.x —— 按任务动态装配</h3>
  <p>交付 v0.4 里程碑：<code>myco assemble &lt;目标&gt;</code> 按任务上下文匹配出知识包子集，产出工具掩码与可复现 lockfile；新增 <code>myco_assemble</code> agent 工具与作用域内的 scoped 检索；控制台新增装配视图。</p>
  <p class="rm-links"><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.7.1">下载 v0.7.1</a><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.7.0">v0.7.0</a></p>
</div>

<div class="rm-item done">
  <h3><span class="rm-tag done">DONE</span>0.6.0 —— 聚合遥测 + 自动更新</h3>
  <p>匿名聚合遥测，默认关闭（详见 <a href="/docs/telemetry">隐私与遥测</a>）；<code>myco upgrade</code> 自动更新，校验安装包指纹并支持回滚；官网自动发布。</p>
  <p class="rm-links"><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.6.0">下载 v0.6.0</a></p>
</div>

<div class="rm-item done archive">
  <h3><span class="rm-tag archive">存档</span>0.5.0 —— 首个产品化交付版本</h3>
  <p>交付 v0.5 知识更新流，并把此前全部能力整体产品化：知识包模型、组合配置、生命周期、跨包检索、控制台、云端 git 同步，配套发布构建与安装脚本。</p>
</div>

<div class="rm-item done archive">
  <h3><span class="rm-tag archive">未单独发版</span>v0.3 —— 云端 git 同步</h3>
  <p>git 原语 clone / pull / push；分叉时报告冲突；控制台远程库区与同步按钮；同步后触发变更检测。在 <code>0.1.0</code> 版本号下累积交付。</p>
</div>

<div class="rm-item done archive">
  <h3><span class="rm-tag archive">未单独发版</span>v0.2 —— 插件化与控制台</h3>
  <p>Cordis 插件形态（服务端 + 客户端控制台 tab）；远程服务方法集；宿主平面 daemon（watcher + 定时维护）。在 <code>0.1.0</code> 版本号下累积交付。</p>
</div>

<div class="rm-item done archive">
  <h3><span class="rm-tag archive">存档</span>0.1.0 —— CLI 基础（v0.1）</h3>
  <p>纯 Node 零依赖核心；知识包模型与 repo / local / cloud 三类知识根；挂载、索引、状态、检索、组合配置 profile、生命周期扫描 sweep 全套 CLI。项目的首个版本号，v0.2、v0.3 两个里程碑都在它之下滚动交付。</p>
</div>

</div>

## 接下来

- 知识更新流深化（更细的契约粒度与传播策略）；
- 多用户协作与共享知识库治理。

## 设计原则

- **文件是唯一事实源**，一切缓存可重建；
- **零依赖核心**，CLI 与插件共用同一套实现；
- **人永远收口**：机器检测、agent 起草、人确认；
- **淘汰归档不删除**，历史可回溯。
