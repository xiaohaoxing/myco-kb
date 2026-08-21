// v0.5.3 传播起草：subagent 调度（ADR-010 D：用户侧按 subagent 方式调度）
// 插件层（需要 ctx.subagents）；core 提供 draftContext（prompt）与 drafts 存储。
// 流程：stale 节点 → 生成 prompt（变更摘要 + 受影响节点内容）→ ctx.subagents.start
//      → agent 起草 → 结果存 drafts（status: pending → running → done / error）
// 草案不自动写文件：人工确认后手动应用（设计：草案经人工确认）。

export function scheduleDraft(ctx, myco, node, options = {}) {
  const provider = options.provider ?? 'spawn'
  // 后台执行，不阻塞 HTTP 响应
  return (async () => {
    const stale = myco.listStale().find((s) => s.node === node)
    if (!stale) throw new Error(`节点不在 stale 队列: ${node}`)
    let context
    try {
      context = myco.draftContext(node)
    } catch (err) {
      myco.saveDraft(node, {
        packageId: stale.packageId, rel: stale.rel, eventId: stale.eventId ?? null,
        prompt: null, draft: null, status: 'error', error: String(err?.message ?? err),
      })
      return { ok: false, node, error: String(err?.message ?? err) }
    }
    myco.saveDraft(node, {
      packageId: stale.packageId, rel: stale.rel, eventId: stale.eventId ?? null,
      prompt: context.prompt, draft: null, status: 'running',
    })
    try {
      const run = await ctx.subagents.start(provider, {
        label: `myco-draft:${node}`,
        prompt: context.prompt,
      })
      const result = await run.result
      if (typeof run.dispose === 'function') await run.dispose()
      myco.saveDraft(node, {
        packageId: stale.packageId, rel: stale.rel, eventId: stale.eventId ?? null,
        prompt: context.prompt, draft: result.output ?? '', status: 'done',
      })
      return { ok: true, node }
    } catch (err) {
      myco.saveDraft(node, {
        packageId: stale.packageId, rel: stale.rel, eventId: stale.eventId ?? null,
        prompt: context.prompt, draft: null, status: 'error', error: String(err?.message ?? err),
      })
      return { ok: false, node, error: String(err?.message ?? err) }
    }
  })()
}
