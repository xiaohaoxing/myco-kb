# 版本发布

按 minor 系列汇总，补丁版本并入所属条目。`0.6.0` 以前的版本仅作存档展示，不提供下载。

## 0.8.x —— 数据目录解析与部署适配

<p class="rel-meta"><span>2026-08-31</span><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.8.1">v0.8.1</a><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.8.0">v0.8.0</a></p>

统一数据目录解析：显式 `dataDir` > `MYCO_DATA` > 默认；默认落在 `~/.myco`，agent 会话内改用工作区相对的 `.myco`。插件侧同样支持覆盖，并修正了工具调用的呈现契约。

## 0.7.x —— 按任务动态装配

<p class="rel-meta"><span>2026-08-26</span><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.7.1">v0.7.1</a><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.7.0">v0.7.0</a></p>

`myco assemble <目标>` 按任务上下文匹配出知识包子集，产出工具掩码与可复现 lockfile；新增 `myco_assemble` agent 工具与作用域内的 scoped 检索；控制台新增装配视图。

## 0.6.0 —— 聚合遥测与自动更新

<p class="rel-meta"><span>2026-08-26</span><a href="https://github.com/xiaohaoxing/myco-kb/releases/tag/v0.6.0">v0.6.0</a></p>

匿名聚合遥测，默认关闭（详见[隐私与遥测](/docs/telemetry)）；`myco upgrade` 自动更新，校验安装包指纹并支持回滚；官网自动发布。

## 0.5.0 —— 首个产品化交付版本

<p class="rel-meta"><span>2026-08-26</span><span class="rel-note">存档</span></p>

交付知识更新流，并把此前全部能力整体产品化：知识包模型、组合配置、生命周期、跨包检索、控制台、云端 git 同步，配套发布构建与安装脚本。

## v0.3 —— 云端 git 同步

<p class="rel-meta"><span class="rel-note">未单独发版，含在 0.5.0 中</span></p>

git 原语 clone / pull / push；分叉时报告冲突；控制台远程库区与同步按钮；同步后触发变更检测。

## v0.2 —— 插件化与控制台

<p class="rel-meta"><span class="rel-note">未单独发版，含在 0.5.0 中</span></p>

Cordis 插件形态（服务端 + 客户端控制台 tab）；远程服务方法集；宿主平面 daemon（watcher + 定时维护）。

## 0.1.0 —— CLI 基础

<p class="rel-meta"><span>2026-08-20</span><span class="rel-note">存档</span></p>

纯 Node 零依赖核心；知识包模型与 repo / local / cloud 三类知识根；挂载、索引、状态、检索、组合配置、生命周期扫描全套 CLI。项目的首个版本号，v0.2、v0.3 两个里程碑都在它之下滚动交付。
