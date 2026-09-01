<template>
  <div class="home-section" style="padding-top: 28px;">
    <div class="term" aria-label="myco CLI 终端演示">
      <div class="term-bar">
        <span class="t-dot"></span><span class="t-dot"></span><span class="t-dot"></span>
        <span class="t-title">~ myco</span>
      </div>
      <pre>$ myco mount repo:/path/to/your-kb
<span class="g">✓ 已挂载 repo:/path/to/your-kb</span>

$ myco index
<span class="g">索引完成: 21 篇文档 / 19 个 tag / 2 个知识包</span>

$ myco find 架构
<span class="b">12</span>  myco-kb/MyCo-KB 架构设计.md
<span class="b"> 4</span>  company-kb/api-gateway/当前架构与对接现状.md
<span class="b"> 3</span>  company-kb/data-factory/当前架构与对接现状.md</pre>
    </div>
  </div>
</template>
