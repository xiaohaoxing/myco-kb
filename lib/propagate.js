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
      // DSH subagent 请求契约要求 AbortSignal：spawn 后端在启动时会读
      // request.signal.aborted，缺 signal 会让 request.signal 为 undefined，
      // 直接抛 "Cannot read properties of undefined (reading 'aborted')"。
      // 后台起草不对外取消，持有一个永不 abort 的 controller.signal 即可。
      const controller = new AbortController()
      const run = await ctx.subagents.start(provider, {
        label: `myco-draft:${node}`,
        // prompt 与 result.output 均为内容块数组（[{type:'text',text}|…]），非字符串。
        prompt: [{ type: 'text', text: context.prompt }],
        signal: controller.signal,
      })
      const result = await run.result
      if (typeof run.dispose === 'function') await run.dispose()
      // 抽取正文：块数组 → 纯文本；异常为非块数组时兜底转字符串。
      const draft = Array.isArray(result.output)
        ? result.output.filter((b) => b?.type === 'text').map((b) => b.text).join('')
        : String(result.output ?? '')
      // 未正常完成且无正文（子代理被杀/出错）不应落为 done。
      if (result.stopReason !== 'completed' && !draft) {
        const reason = `subagent 未正常完成（${result.stopReason ?? 'unknown'}）`
        myco.saveDraft(node, {
          packageId: stale.packageId, rel: stale.rel, eventId: stale.eventId ?? null,
          prompt: context.prompt, draft: null, status: 'error', error: reason,
        })
        return { ok: false, node, error: reason }
      }
      myco.saveDraft(node, {
        packageId: stale.packageId, rel: stale.rel, eventId: stale.eventId ?? null,
        prompt: context.prompt, draft, status: 'done',
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
