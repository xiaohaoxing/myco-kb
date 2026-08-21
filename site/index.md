---
layout: home

hero:
  name: MyCo-KB
  text: 真菌之库 · 我的公司
  tagline: 面向 DeepSeek Harness 的知识库管理系统。知识包统一挂载、组合配置按需激活、生命周期自动演进、跨包检索即问即答、云端 git 同步、契约驱动的知识更新流 —— 让知识像菌丝网络一样生长与传播。
  actions:
    - theme: brand
      text: 快速开始
      link: /docs/quickstart
    - theme: alt
      text: 产品特性
      link: /features
    - theme: alt
      text: 系统设计
      link: /design/overview
---

<div class="home-section" style="padding-top: 4px;">
  <div class="badge-row">
    <span class="home-badge"><span class="dot"></span>&nbsp;DeepSeek Harness 插件 · 当前版本 <b>v0.5.3</b></span>
    <span class="pill">MIT License</span>
    <span class="pill">零运行时依赖核心</span>
  </div>
</div>

<TerminalDemo />

<!-- ============ 产品特性 ============ -->
<div class="home-section" id="features">
  <h2>产品特性</h2>
  <p class="sec-sub">一个知识库管理系统，覆盖知识的挂载、检索、演进与传播全链路。点击进入 <a href="/features">产品特性总览</a> 查看更多。</p>

  <div class="feature-grid">
    <div class="fcard">
      <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
      <h3>知识包模型</h3>
      <p>repo / 本地全局 / 云端全局三类知识根，统一包模型：<code>kb.yaml</code> 清单 + 版本 + 依赖声明。</p>
      <span class="f-tag">统一挂载</span>
    </div>
    <div class="fcard">
      <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg></div>
      <h3>组合配置</h3>
      <p>不同用户 × 环境 × 目标激活不同 profile，lockfile 可复现，按任务动态装配。</p>
      <span class="f-tag">按需激活</span>
    </div>
    <div class="fcard">
      <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></div>
      <h3>生命周期管理</h3>
      <p>收件箱 → 证据 → 常青 → 原则四态演进；淘汰默认归档不删除，候选扫描仅报告。</p>
      <span class="f-tag">自动演进</span>
    </div>
    <div class="fcard">
      <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
      <h3>跨包检索</h3>
      <p>tag 命中 ×3 + 文件名 ×2 + 全文 ×1 打分，agent 工具面与 CLI 同源，即问即答。</p>
      <span class="f-tag">打分排序</span>
    </div>
    <div class="fcard">
      <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><line x1="12" y1="12" x2="12" y2="2"/><polyline points="8 6 12 2 16 6"/></svg></div>
      <h3>云端 git 同步</h3>
      <p>零依赖 git 原语：clone / pull / push，冲突报告且本地改动不丢，人工 merge 后恢复。</p>
      <span class="f-tag">可复现</span>
    </div>
    <div class="fcard">
      <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg></div>
      <h3>知识更新流</h3>
      <p>契约块解析、变更检测、影响分析（染色/传播）、stale 队列与 webhook 通知。</p>
      <span class="f-tag">契约驱动</span>
    </div>
    <div class="fcard">
      <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg></div>
      <h3>静默后台守护</h3>
      <p>文件 watcher 增量重索引 + 定时维护，宿主平面常驻，不阻塞进程退出。</p>
      <span class="f-tag">零打扰</span>
    </div>
    <div class="fcard">
      <div class="f-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg></div>
      <h3>Agent 原生</h3>
      <p>Cordis 插件形态：服务端守护 + 控制台面板 + agent 工具面 + 技能包 + subagent 起草。</p>
      <span class="f-tag">DSH 插件</span>
    </div>
  </div>
</div>

<!-- ============ 它如何工作 ============ -->
<div class="home-section" id="how-it-works">
  <h2>三步接入，静默运转</h2>
  <p class="sec-sub">从挂载到检索维护，全部通过一个 CLI 与宿主平面守护完成。</p>
  <div class="steps">
    <div class="step">
      <h3>挂载知识根</h3>
      <p><code>myco mount repo:/path</code> —— 仓库、本地全局、云端全局三类知识根统一为知识包，声明式清单 <code>kb.yaml</code>。</p>
    </div>
    <div class="step">
      <h3>建立跨包索引</h3>
      <p><code>myco index</code> —— 一次全库倒排索引；此后 daemon 监听文件变更，<b>2 秒防抖增量重索引</b>，索引始终新鲜。</p>
    </div>
    <div class="step">
      <h3>检索与维护</h3>
      <p><code>myco find</code> 即问即答，<code>myco sweep</code> 生命周期扫描仅报告、不自动删改 —— 人永远在回路里。</p>
    </div>
  </div>
</div>

<!-- ============ 数字 ============ -->
<div class="home-section">
  <h2>正在被 MyCo-KB 管理的试点知识库</h2>
  <p class="sec-sub">本仓库自身就是第一个用户：下方数据来自 <code>myco status</code> 的真实输出。</p>
  <div class="stats-band">
    <div class="stat"><div class="n">2</div><div class="l">知识包</div></div>
    <div class="stat"><div class="n">21</div><div class="l">篇文档</div></div>
    <div class="stat"><div class="n">19</div><div class="l">个 tag</div></div>
    <div class="stat"><div class="n">v0.5.3</div><div class="l">当前版本</div></div>
  </div>
</div>

<!-- ============ 文档入口 ============ -->
<div class="home-section">
  <h2>文档</h2>
  <p class="sec-sub">成熟产品三件套：产品特性、系统设计、用户文档。</p>
  <div class="doc-cards">
    <a class="doc-card" href="/features">
      <div class="dc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg></div>
      <h3>产品特性</h3>
      <p>知识包、组合配置、生命周期、跨包检索、云端同步、知识更新流 —— 每个特性的设计动机与用法。</p>
      <div class="dc-more">查看特性 →</div>
    </a>
    <a class="doc-card" href="/design/overview">
      <div class="dc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div>
      <h3>系统设计</h3>
      <p>运行时形态、数据模型、检索打分、生命周期扫描、知识更新流设计、后台守护与已知边界。</p>
      <div class="dc-more">阅读设计 →</div>
    </a>
    <a class="doc-card" href="/docs/quickstart">
      <div class="dc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
      <h3>用户文档</h3>
      <p>快速开始、CLI 命令参考、知识包与挂载、组合配置、生命周期、云端同步、知识更新流、技能包、FAQ。</p>
      <div class="dc-more">开始阅读 →</div>
    </a>
  </div>
</div>

<!-- ============ CTA ============ -->
<div class="cta-band">
  <div class="cta-box">
    <h2>让知识像菌丝网络一样生长</h2>
    <p>挂载你的知识库，五分钟后即可通过 CLI 与 agent 检索、演进与传播知识。</p>
    <a class="myco-btn primary" href="/docs/quickstart">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
      快速开始
    </a>
    <a class="myco-btn ghost" href="/design/roadmap" style="margin-left: 10px;">查看路线图</a>
  </div>
</div>
