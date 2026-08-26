import { defineTool } from '@deepseek-ai/dsh-tools'

function present(title, kind, detail) {
  return { title, kind, detail }
}

// defineTool 要求 output.schema（JSON Schema 子集）+ output.render；
// render 必须返回 ContentBlock[]（[{ type: 'text', text }]），不能返回原始对象/数组，
// 否则 harness 按 content block 迭代时对对象抛 "content is not iterable"、对数组渲染为空。
function textBlocks(value) {
  return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
}

const OBJECT_OUTPUT = {
  schema: { type: 'object', additionalProperties: true },
  render(args, value) {
    return textBlocks(value)
  },
}

const FIND_OUTPUT = {
  schema: {
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  },
  render(args, value) {
    return textBlocks(value)
  },
}

// agent 工具面：把 myco 能力注册为 dsh-tools 工具（全局层）
export function registerTools(ctx, myco) {
  ctx.tools.register(defineTool({
    name: 'myco_status',
    description: '查看 MyCo-KB 知识库维护状态：知识包清单、索引新鲜度、生命周期候选数、挂载错误。',
    parameters: {},
    output: OBJECT_OUTPUT,
    execute: async () => myco.status(),
    presentCall: () => present('MyCo-KB 状态', 'read'),
  }))

  ctx.tools.register(defineTool({
    name: 'myco_find',
    description: '在 MyCo-KB 知识库中检索：tag 命中×3、文件名×2、全文×1，返回最多 20 条，含证据页标记。',
    parameters: {
      query: { type: 'string', required: true, description: '检索关键词，空格分隔' },
    },
    output: FIND_OUTPUT,
    execute: async (args) => myco.find(args.query),
    presentCall: (args) => present('MyCo-KB 检索', 'read', args.query),
  }))

  ctx.tools.register(defineTool({
    name: 'myco_index',
    description: '重建 MyCo-KB 跨包索引，返回文档/tag/知识包计数。',
    parameters: {},
    output: OBJECT_OUTPUT,
    execute: async () => myco.reindex(),
    presentCall: () => present('重建索引', 'other'),
  }))

  ctx.tools.register(defineTool({
    name: 'myco_sweep',
    description: '运行 MyCo-KB 生命周期候选扫描（仅报告，不自动执行）：休眠证据页→归档候选，孤页→补链/归档候选。',
    parameters: {},
    output: OBJECT_OUTPUT,
    execute: async () => myco.sweep(),
    presentCall: () => present('生命周期扫描', 'read'),
  }))

  ctx.tools.register(defineTool({
    name: 'myco_assemble',
    description: '按任务目标动态装配 MyCo-KB 知识包子集与工具掩码，返回「刚好够用」的知识组合、推荐文档与可复现 lockfile。',
    parameters: {
      goal: { type: 'string', required: true, description: '任务目标文本（agent 当前要完成的任务描述）' },
      user: { type: 'string', description: '可选：用户维度（用于 profile 匹配）' },
      env: { type: 'string', description: '可选：环境维度（用于 profile 匹配）' },
    },
    output: OBJECT_OUTPUT,
    execute: async (args) => myco.assemble(args.goal, { user: args.user, env: args.env }),
    presentCall: (args) => present('动态装配', 'read', args.goal),
  }))
}

// ---- v0.4.2 工具面装配器（agent 作用域） ----
//
// DSH 的 `agent.ctx.tools` 是 agent 作用域：仅影响该 agent「看到哪些」，不是权限边界（§7）。
// 真实 API 签名（dsh-tools ToolRuntime）：
//   tools.restrict({ allow?, deny? })  — 必须 agent 作用域 ctx；只允许/拒绝【已知全局工具名】；
//                                       空 allow/deny、未知名字、scope-local 名、保留名（run_code）会 throw。
//   tools.register(definition)          — 全局或随调用 agent 作用域注册；scoped 注册遮蔽同名全局。
//
// ⚠️ 运行时验证点：agent 作用域 `restrict/register` 的真实签名与行为需实机核验（§2/§7）。
// 这里做**特性探测 + 容错**：缺接口时安全跳过（no-op），不报错——宿主平面（无 agent 作用域）也可安全调用。
//
// 注意：MyCo-KB 的工具（status/find/index/sweep/assemble）**不按知识包粒度**，因此不存在
// 「按包裁剪工具」的天然映射；自动 `restrict` 若只保留 myco 工具会误伤 agent 的 bash/fs 等基础能力。
// 所以默认**不自动裁剪**，只在显式传 `opts.restrict`（{allow,deny}）时才施加；默认注入的是
// 「限定到装配子集的 scoped 检索」（scoped 检索注入），这是动态装配在工具面的真正价值。

/** 生成一个限定到某知识包子集的检索工具（agent 作用域注入用）。 */
export function createScopedFindTool({ myco, packageIds, description } = {}) {
  const ids = Array.isArray(packageIds) ? packageIds : []
  return defineTool({
    name: 'myco_scoped_find',
    description: description || `在 MyCo-KB 已装配的 ${ids.length} 个知识包子集内检索（限定范围）：tag×3/文件名×2/全文×1。`,
    parameters: {
      query: { type: 'string', required: true, description: '检索关键词，空格分隔（仅返回装配子集内命中）' },
    },
    output: FIND_OUTPUT,
    execute: async (args) => myco.find(args.query, { packageIds: ids }),
    presentCall: (args) => present('装配内检索', 'read', args.query),
  })
}

/**
 * 对 agent 作用域 ctx 施加工具面装配：注入 scoped 检索（默认）+ 可选 restrict。
 * @param toolCtx  agent 作用域 ctx（agent.ctx）
 * @param result   myco.assemble() 返回（含 toolMask / packages）
 * @param opts     { myco, scopedSearch?, scopedDescription?, restrict? }
 *                  restrict: 传入 { allow?, deny? } 才施加；默认不裁剪。
 * @returns { ok: boolean, applied: string[], packageIds: string[], reason?: string }
 */
export function applyAgentTools(toolCtx, result, opts = {}) {
  if (!toolCtx?.tools) return { ok: false, applied: [], reason: '无 agent 作用域工具面' }
  if (!result?.toolMask) return { ok: false, applied: [], reason: '无装配结果/工具掩码' }
  const tools = toolCtx.tools
  const applied = []
  const packageIds = (result.packages ?? []).map((p) => p.id)

  // 1) 注入限定到装配子集的 scoped 检索（默认开启；scopedSearch=false 关闭）
  if (opts.scopedSearch !== false && typeof tools.register === 'function') {
    const tool = opts.scopedSearch || createScopedFindTool({ myco: opts.myco, packageIds, description: opts.scopedDescription })
    if (tool) {
      try {
        tools.register(tool)
        applied.push('register:scoped-search')
      } catch (err) {
        return { ok: false, applied: [], reason: `register 失败: ${err?.message ?? err}` }
      }
    }
  }

  // 2) 可选 restrict：只在显式给出 {allow,deny} 时施加（避免误裁 agent 基础工具）
  if (opts.restrict && typeof tools.restrict === 'function') {
    try {
      tools.restrict(opts.restrict)
      applied.push('restrict')
    } catch (err) {
      return { ok: false, applied: [], reason: `restrict 失败: ${err?.message ?? err}` }
    }
  }

  return { ok: applied.length > 0, applied, packageIds }
}

/**
 * 把按任务动态装配接进 agent 生命周期：订阅 `agent/created`，在 agent 作用域内
 * 用「最近一次装配」注入 scoped 检索。**opt-in**（config.assemble.auto === true 才生效）。
 *
 * 边界（§7）：agent 创建时通常还没有任务目标，故这里不做「目标→装配」的自动选择，
 * 而是复用最近一次 `myco assemble` 的 lockfile（若有且非回退）。真正的
 * 「agent start 时读目标自动装配」需在真实 DSH agent 循环核验（tool-goal/agent 上下文来源）。
 *
 * @returns { ok: boolean, reason?: string, off?: () => void }
 */
export function registerAgentAssembly(ctx, myco, config = {}) {
  if (config.assemble?.auto !== true) return { ok: false, reason: 'assemble.auto 未开启（opt-in）' }
  if (!ctx?.agents || typeof ctx.on !== 'function') return { ok: false, reason: '上下文无 agent 事件面（host plane 需注入 agents 服务）' }
  const off = ctx.on('agent/created', (payload) => {
    try {
      const agent = payload?.agent
      if (!agent?.ctx?.tools) return
      const last = myco.lastAssemble()
      const ids = last?.toolMask?.scope?.packages ?? []
      if (!ids.length) return
      const result = { toolMask: last.toolMask, packages: (last.packages ?? []).map((p) => ({ id: p.id, score: p.score })) }
      applyAgentTools(agent.ctx, result, { myco })
    } catch (err) {
      ctx.logger?.warn?.(`myco-kb: agent assembly hook failed: ${String(err?.message ?? err)}`)
    }
  })
  return { ok: true, off }
}
