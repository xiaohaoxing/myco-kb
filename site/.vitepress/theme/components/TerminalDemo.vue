<template>
  <div class="home-section" style="padding-top: 28px;">
    <div class="term" aria-label="myco CLI 终端演示">
      <div class="term-bar">
        <span class="t-dot"></span><span class="t-dot"></span><span class="t-dot"></span>
        <span class="t-title">~ myco — MyCo-KB 知识库管理器</span>
      </div>
      <pre><span class="c"># 挂载知识根（repo / local / cloud 三类统一为知识包）</span>
$ myco mount repo:/path/to/your-kb
<span class="g">✓ 已挂载 repo:/path/to/your-kb</span>

<span class="c"># 重建跨包索引（tag×3 / 文件名×2 / 全文×1 打分）</span>
$ myco index
<span class="g">索引完成: 21 篇文档 / 19 个 tag / 2 个知识包</span>

<span class="c"># 检索：agent 工具与 CLI 同源</span>
$ myco find 架构
<span class="b">12</span>  myco-kb/MyCo-KB 架构设计.md
<span class="b"> 4</span>  company-kb/api-gateway/当前架构与对接现状.md
<span class="b"> 3</span>  company-kb/data-factory/当前架构与对接现状.md

<span class="c"># 生命周期候选扫描（仅报告，淘汰默认归档不删除）</span>
$ myco sweep
<span class="g">暂无生命周期候选</span>

<span class="c"># 云端 git 同步：clone / pull / push，冲突报告不丢改动</span>
$ myco cloud sync
<span class="g">✓ myco-kb: stages: pull → commit → push</span></pre>
    </div>
  </div>
</template>
