<template>
  <section class="home-hero">
    <div class="hero-inner">
      <div class="hero-left">
        <span class="home-badge"><span class="dot"></span>&nbsp;DeepSeek Harness 插件 · 当前版本 <b>v0.5.3</b></span>
        <h1 class="hero-name">MyCo-KB</h1>
        <p class="hero-tagline">面向 DeepSeek Harness 的知识库管理系统。知识包统一挂载、组合配置按需激活、生命周期自动演进、跨包检索即问即答、云端 git 同步、契约驱动的知识更新流 —— 让知识像菌丝网络一样生长与传播。</p>
        <div class="hero-actions">
          <a class="myco-btn primary" href="/docs/quickstart">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            快速开始
          </a>
          <a class="myco-btn ghost" href="/features">产品特性</a>
          <a class="myco-btn ghost" href="/design/overview">系统设计</a>
        </div>
        <div class="hero-pills">
          <span class="pill">MIT License</span>
          <span class="pill">零运行时依赖核心</span>
          <span class="pill">Cordis 插件形态</span>
        </div>
      </div>

      <div class="hero-right">
        <canvas ref="canvas" class="net-canvas" role="img" aria-label="MyCo-KB 知识网络演示：知识包节点、契约光环、传播脉冲、stale 与 agent 起草循环"></canvas>
        <div class="net-legend">
          <span class="lg"><i class="dot pkg"></i>知识包</span>
          <span class="lg"><i class="dot ctr"></i>契约（光环）</span>
          <span class="lg"><i class="dot pulse"></i>传播脉冲</span>
          <span class="lg"><i class="dot stale"></i>stale</span>
          <span class="lg"><i class="dot agent"></i>agent 起草</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvas = ref(null)

let raf = 0
let resizeObs = null
let themeObs = null
let reduced = false

const PALETTES = {
  light: {
    pkg: '#0f766e',
    contract: '#0d9488',
    service: '#5b7a72',
    cloud: '#0284c7',
    stale: '#d97706',
    agent: '#7c3aed',
    edge: 'rgba(15,118,110,0.28)',
    edgeActive: '#0d9488',
    label: '#3d5c54',
  },
  dark: {
    pkg: '#2dd4bf',
    contract: '#14b8a6',
    service: '#8aa39b',
    cloud: '#38bdf8',
    stale: '#f59e0b',
    agent: '#a78bfa',
    edge: 'rgba(45,212,191,0.30)',
    edgeActive: '#2dd4bf',
    label: '#9dbab2',
  },
}

// 节点：归一化坐标 + 类型 + 标签方位
const NODES = [
  { id: 'profile', label: '组合配置', type: 'service', x: 0.07, y: 0.22, lpos: 'right' },
  { id: 'search', label: '检索 ×3', type: 'service', x: 0.10, y: 0.62, lpos: 'bottom' },
  { id: 'repo', label: 'repo 知识包', type: 'package', x: 0.21, y: 0.40, lpos: 'bottom' },
  { id: 'local', label: 'local 知识包', type: 'package', x: 0.34, y: 0.68, lpos: 'bottom' },
  { id: 'contract', label: '契约 v3', type: 'contract', x: 0.52, y: 0.52, lpos: 'top' },
  { id: 'cloud-pkg', label: 'cloud 知识包', type: 'package', x: 0.56, y: 0.26, lpos: 'bottom' },
  { id: 'index', label: '跨包索引', type: 'service', x: 0.27, y: 0.85, lpos: 'bottom' },
  { id: 'lifecycle', label: '生命周期', type: 'service', x: 0.45, y: 0.90, lpos: 'top' },
  { id: 'cloud', label: '云端 git', type: 'cloud', x: 0.80, y: 0.16, lpos: 'bottom' },
  { id: 'stale', label: 'stale', type: 'stale', x: 0.70, y: 0.62, lpos: 'right' },
  { id: 'draft', label: 'subagent 起草', type: 'agent', x: 0.80, y: 0.84, lpos: 'bottom' },
  { id: 'webhook', label: 'webhook', type: 'agent', x: 0.90, y: 0.40, lpos: 'left' },
]

const EDGES = [
  { from: 'repo', to: 'contract', path: 'prop' },
  { from: 'local', to: 'contract', path: 'prop' },
  { from: 'cloud-pkg', to: 'contract', path: 'prop' },
  { from: 'contract', to: 'stale', path: 'prop' },
  { from: 'stale', to: 'draft', path: 'prop' },
  { from: 'draft', to: 'webhook', path: 'prop' },
  { from: 'profile', to: 'repo', path: 'idle' },
  { from: 'profile', to: 'local', path: 'idle' },
  { from: 'cloud-pkg', to: 'cloud', path: 'idle' },
  { from: 'repo', to: 'index', path: 'idle' },
  { from: 'local', to: 'index', path: 'idle' },
  { from: 'index', to: 'search', path: 'idle' },
  { from: 'repo', to: 'lifecycle', path: 'idle' },
]

const RADIUS = { package: 11, contract: 9, service: 7, cloud: 9, stale: 8, agent: 8 }

const CYCLE = 18 // 完整演示周期（秒）
const EV = {
  majorStart: 5,
  pulsePackages: [5.4, 6.9],
  pulseStale: [7.1, 8.3],
  staleOn: 6.9,
  staleOff: 12.5,
  draftPulse: [9.4, 10.6],
  webhookRing: [11.2, 12.8],
  settle: 13.5,
}

function palette() {
  const dark = document.documentElement.classList.contains('dark')
  return PALETTES[dark ? 'dark' : 'light']
}

// 归一化坐标 → 像素
function px(n, w, h) { return [n.x * w, n.y * h] }

// 时间窗脉冲：t 在 [a,b] 内返回 0..1（正弦淡入淡出）
function pulse(t, a, b) {
  if (t < a || t > b) return 0
  return Math.sin(((t - a) / (b - a)) * Math.PI)
}

function draw(ctx, w, h, t, pal) {
  const cyc = t % CYCLE
  ctx.clearRect(0, 0, w, h)

  const nodePos = {}
  for (const n of NODES) {
    // 慢速漂移：极低频正弦，幅度约 1%
    const dx = Math.sin(t * 0.14 + n.x * 9) * 0.010
    const dy = Math.cos(t * 0.11 + n.y * 7) * 0.009
    nodePos[n.id] = { x: n.x * w + dx * w, y: n.y * h + dy * h, n }
  }

  // —— 连线 ——
  for (const e of EDGES) {
    const a = nodePos[e.from]
    const b = nodePos[e.to]
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    const breathe = 0.72 + 0.28 * Math.sin(t * 0.5 + e.from.length + e.to.length)
    let alpha = 0.9 * breathe
    if (e.path === 'prop') {
      // 传播链路：空闲时微弱，事件期间由脉冲覆盖
      const window = { 'repo': EV.pulsePackages, 'local': EV.pulsePackages, 'cloud-pkg': EV.pulsePackages, 'stale': EV.pulseStale, 'draft': EV.draftPulse }[e.to]
      if (window && cyc > EV.majorStart - 0.3 && cyc < EV.settle) alpha = 0.55
    }
    ctx.strokeStyle = pal.edge
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  // —— 传播脉冲亮点 ——
  const dotEdges = [
    { e: 'repo', win: EV.pulsePackages },
    { e: 'local', win: EV.pulsePackages },
    { e: 'cloud-pkg', win: EV.pulsePackages },
    { e: 'stale', win: EV.pulseStale },
    { e: 'draft', win: EV.draftPulse },
  ]
  for (const d of dotEdges) {
    const p = pulse(cyc, d.win[0], d.win[1])
    if (p <= 0) continue
    const edge = EDGES.find((x) => x.to === d.e && x.path === 'prop')
    if (!edge) continue
    const a = nodePos[edge.from]
    const b = nodePos[edge.to]
    const x = a.x + (b.x - a.x) * p
    const y = a.y + (b.y - a.y) * p
    ctx.beginPath()
    ctx.arc(x, y, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = pal.edgeActive
    ctx.globalAlpha = Math.sin(p * Math.PI)
    ctx.fill()
    // 尾部光晕
    ctx.beginPath()
    ctx.arc(x, y, 10, 0, Math.PI * 2)
    ctx.fillStyle = pal.edgeActive
    ctx.globalAlpha = Math.sin(p * Math.PI) * 0.15
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // —— 节点 ——
  const staleActive = cyc > EV.staleOn && cyc < EV.staleOff
  const contractGlow = cyc > EV.majorStart && cyc < EV.majorStart + 2.2

  for (const n of NODES) {
    const p = nodePos[n.id]
    const r = RADIUS[n.type]
    const isStale = n.type === 'stale' && staleActive
    const isDraft = n.type === 'agent' && n.id === 'draft' && pulse(cyc, EV.draftPulse[0], EV.draftPulse[1]) > 0

    // 光晕（事件期间）
    if (isStale || isDraft || (n.id === 'contract' && contractGlow)) {
      const halo = isStale ? 16 : isDraft ? 14 : 20
      const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, halo)
      g.addColorStop(0, isStale ? 'rgba(217,119,6,0.35)' : isDraft ? 'rgba(124,58,237,0.30)' : 'rgba(13,148,136,0.35)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(p.x, p.y, halo, 0, Math.PI * 2)
      ctx.fillStyle = g
      ctx.fill()
    }

    // 主体
    const color = n.type === 'package' ? pal.pkg
      : n.type === 'contract' ? pal.contract
      : n.type === 'service' ? pal.service
      : n.type === 'cloud' ? pal.cloud
      : n.type === 'stale' ? (isStale ? '#d97706' : pal.stale)
      : pal.agent
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.globalAlpha = n.type === 'service' ? 0.85 : 1
    ctx.fill()
    ctx.globalAlpha = 1

    // 节点描边（浅色）
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1
    ctx.stroke()

    // 类型附加样式
    if (n.type === 'contract') {
      // 契约光环：常驻慢速呼吸 + 事件期间扩张
      const ringR = 16 + Math.sin(t * 0.9) * 3 + (contractGlow ? 10 * pulse(cyc, EV.majorStart, EV.majorStart + 2.2) : 0)
      ctx.beginPath()
      ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2)
      ctx.strokeStyle = pal.contract
      ctx.globalAlpha = contractGlow ? 0.75 : 0.4
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    if (n.type === 'cloud') {
      // 云端：虚线外环（同步感）
      ctx.beginPath()
      ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2)
      ctx.setLineDash([3, 4])
      ctx.strokeStyle = pal.cloud
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }
    if (n.type === 'stale' && staleActive) {
      // 待确认标记
      ctx.beginPath()
      ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2)
      ctx.strokeStyle = pal.stale
      ctx.globalAlpha = 0.8
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  // —— webhook 涟漪 ——
  const wp = pulse(cyc, EV.webhookRing[0], EV.webhookRing[1])
  if (wp > 0) {
    const w = nodePos.webhook
    const rr = 14 + wp * 34
    ctx.beginPath()
    ctx.arc(w.x, w.y, rr, 0, Math.PI * 2)
    ctx.strokeStyle = pal.agent
    ctx.globalAlpha = (1 - wp) * 0.6
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // —— 标签 ——
  ctx.font = '500 12px -apple-system, "PingFang SC", "Hiragino Sans GB", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = pal.label
  for (const n of NODES) {
    const p = nodePos[n.id]
    const r = RADIUS[n.type]
    const dy = n.lpos === 'top' ? -(r + 10) : n.lpos === 'left' ? 0 : r + 14
    const dx = n.lpos === 'right' ? r + 8 : n.lpos === 'left' ? -(r + 8) : 0
    ctx.textAlign = n.lpos === 'right' ? 'left' : n.lpos === 'left' ? 'right' : 'center'
    ctx.fillText(n.label, p.x + dx, p.y + dy + (n.lpos === 'bottom' ? 4 : 0))
  }
}

function start() {
  const cv = canvas.value
  if (!cv) return
  const pal = palette()
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const ctx = cv.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const resize = () => {
    const w = cv.clientWidth
    const h = cv.clientHeight
    cv.width = Math.max(1, Math.floor(w * dpr))
    cv.height = Math.max(1, Math.floor(h * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (reduced) draw(ctx, w, h, 8, pal) // 静态帧（展示事件中段）
  }
  resize()
  resizeObs = new ResizeObserver(resize)
  resizeObs.observe(cv)

  if (reduced) return // 尊重 reduced-motion：只画一帧

  const t0 = performance.now()
  const loop = () => {
    const t = (performance.now() - t0) / 1000
    const w = cv.clientWidth
    const h = cv.clientHeight
    draw(ctx, w, h, t, pal)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  start()
  // 主题切换时重读配色
  themeObs = new MutationObserver(() => {
    const cv = canvas.value
    if (!cv) return
    const pal = palette()
    if (reduced) {
      const ctx = cv.getContext('2d')
      draw(ctx, cv.clientWidth, cv.clientHeight, 8, pal)
    }
  })
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  resizeObs?.disconnect()
  themeObs?.disconnect()
})
</script>
