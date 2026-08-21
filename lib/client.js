// MyCo-KB 客户端入口（v0.2）：知识库控制台
//
// 挂载点：插件管理设置区的 `settings.plugins.tab` slot —— 与
// dsh-client-ui-settings-plugin-inventory 同槽，实现「在插件管理页
// 访问本地知识库维护状态 + 维护远程知识库」。
//
// 数据通道：ctx.remote.myco（Typert typed face，由服务端
// MycoRemoteService 提供）；工作区数据来自 ctx.workspaces。
window.__ModuleLoader__?.load?.({
  id: '@dsh/myco-kb',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')
    const { useEffect, useState } = React

    const NS = 'myco-kb'
    const inject = ['slots', 'remote', 'workspaces', 'locale']

    // 控制台数据通道：/myco/api/* 同源 JSON 路由（服务端 ctx.webServer 注册）。
    // 不用 Typert remote.myco：其 face 受 inject 门控且第三方宿主 face 不随
    // web boot 同步（设置页非会话 UI 拿不到）。fetch 就绪即轮询探测。
    function mycoFetch(path, options) {
      return fetch(`/myco/api${path}`, options).then(async (r) => {
        const data = await r.json().catch(() => null)
        if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`)
        return data
      })
    }

    function useMycoApi() {
      const [ready, setReady] = useState(false)
      useEffect(() => {
        let cancelled = false
        const poll = async () => {
          try {
            const r = await fetch('/myco/api/status')
            if (r.ok) {
              if (!cancelled) setReady(true)
              return
            }
          } catch { /* 服务端插件可能尚未就绪，继续轮询 */ }
          if (!cancelled) setTimeout(poll, 2000)
        }
        poll()
        return () => { cancelled = true }
      }, [])
      const myco = {
        status: () => mycoFetch('/status'),
        cloudStatus: () => mycoFetch('/cloud'),
        profiles: () => mycoFetch('/profiles'),
        useProfile: (name) => mycoFetch('/profile/use', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name }),
        }),
        index: () => mycoFetch('/index', { method: 'POST' }),
        sweep: () => mycoFetch('/sweep', { method: 'POST' }),
        cloudSync: () => mycoFetch('/cloud/sync', { method: 'POST' }),
        // v0.5 知识更新流
        scan: () => mycoFetch('/scan', { method: 'POST' }),
        events: (n) => mycoFetch(`/events?n=${n ?? 20}`),
        impact: (eventId) => mycoFetch(`/impact?eventId=${eventId}`),
        stale: () => mycoFetch('/stale'),
        staleClear: (node) => mycoFetch('/stale/clear', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ node }),
        }),
        contracts: () => mycoFetch('/contracts'),
        webhook: () => mycoFetch('/webhook'),
        webhookSet: (url) => mycoFetch('/webhook', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url }),
        }),
        webhookTest: () => mycoFetch('/webhook/test', { method: 'POST' }),
        draft: (node) => mycoFetch('/draft', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ node }),
        }),
        drafts: () => mycoFetch('/drafts'),
        draftClear: (node) => mycoFetch('/draft/clear', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ node }),
        }),
      }
      return { ready, myco }
    }

    const dictionaries = {
      zh: {
        'console.title': 'MyCo-KB 知识库控制台',
        'console.refresh': '刷新',
        'console.reindex': '重建索引',
        'console.sweep': '生命周期扫描',
        'status.title': '本地状态',
        'status.packages': '知识包',
        'status.docs': '文档',
        'status.tags': 'tag',
        'status.candidates': '生命周期候选',
        'status.index': '索引',
        'status.never': '未索引',
        'status.profile': '激活组合',
        'status.none': '（无）',
        'status.errors': '挂载错误',
        'status.activating': '执行中…',
        'cloud.title': '远程库',
        'cloud.roots': '已配置云端根',
        'cloud.empty': '未配置云端根（myco cloud add <name> <url>）',
        'cloud.unresolved': '未解析（需在 config.cloudRoots 配置）',
        'cloud.path': '路径',
        'cloud.sync': '同步',
        'profile.title': '组合配置',
        'profile.active': '当前激活',
        'profile.include': '包含',
        'profile.all': '全部',
        'profile.activate': '激活',
        'workspace.title': '工作区 × 知识包矩阵',
        'workspace.empty': '无工作区数据',
        'events.title': '变更事件',
        'events.scan': '扫描变更',
        'events.empty': '暂无变更事件（首次扫描建立基线）',
        'events.impact': '影响分析',
        'events.dye': '染色（同包派生）',
        'events.spread': '传播（跨包引用）',
        'events.pkgSpread': '依赖传播',
        'events.none': '无',
        'stale.title': '传播队列（stale）',
        'stale.empty': '传播队列为空',
        'stale.clear': '确认解除',
        'contracts.title': '契约清单',
        'contracts.empty': '无契约块',
        'webhook.title': 'Webhook 通知',
        'webhook.url': 'Webhook URL（飞书群机器人或任意 HTTP 端点；major 契约变更自动推送）',
        'webhook.save': '保存',
        'webhook.test': '测试',
        'webhook.clear': '清除',
        'webhook.empty': '未配置',
        'webhook.placeholder': 'https://open.feishu.cn/open-apis/bot/v2/hook/...',
        'webhook.saved': '已保存',
        'webhook.sent': '发送成功',
        'webhook.failed': '发送失败',
        'stale.draft': '起草更新',
        'stale.drafted': '已提交起草',
        'drafts.title': '起草草案（subagent）',
        'drafts.empty': '无草案（在传播队列对 stale 项点「起草更新」）',
        'drafts.status': '状态',
        'drafts.clear': '清除',
        'drafts.done': '完成',
        'drafts.running': '起草中…',
        'drafts.pending': '等待中',
        'drafts.error': '错误',
      },
      en: {
        'console.title': 'MyCo-KB Knowledge Base Console',
        'console.refresh': 'Refresh',
        'console.reindex': 'Rebuild index',
        'console.sweep': 'Lifecycle sweep',
        'status.title': 'Local Status',
        'status.packages': 'Packages',
        'status.docs': 'Docs',
        'status.tags': 'Tags',
        'status.candidates': 'Lifecycle candidates',
        'status.index': 'Index',
        'status.never': 'not indexed',
        'status.profile': 'Active profile',
        'status.none': '(none)',
        'status.errors': 'Mount errors',
        'status.activating': 'Working…',
        'cloud.title': 'Remote KBs',
        'cloud.roots': 'Configured cloud roots',
        'cloud.empty': 'No cloud roots configured (myco cloud add <name> <url>)',
        'cloud.unresolved': 'unresolved (configure in config.cloudRoots)',
        'cloud.path': 'Path',
        'cloud.sync': 'Sync',
        'profile.title': 'Profiles',
        'profile.active': 'Active',
        'profile.include': 'Include',
        'profile.all': 'all',
        'profile.activate': 'Activate',
        'workspace.title': 'Workspaces × Packages',
        'workspace.empty': 'No workspace data',
      },
    }

    // ---------- 通用小组件 ----------
    function panelStyle() {
      return {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        fontFamily: 'var(--dsw-alias-font-sans, system-ui)',
        color: 'var(--dsw-alias-label-primary, #111)',
      }
    }

    function sectionStyle() {
      return {
        border: '1px solid var(--dsw-alias-border-l2, #ddd)',
        borderRadius: '8px',
        padding: '12px 14px',
      }
    }

    function sectionTitle(text) {
      return React.createElement('h3', {
        style: { margin: '0 0 8px', fontSize: '13px', fontWeight: 600 },
      }, text)
    }

    function cell(text, style) {
      return React.createElement('td', {
        style: { padding: '4px 10px 4px 0', fontSize: '12px', verticalAlign: 'top', ...style },
      }, text)
    }

    function button(label, onClick, disabled) {
      return React.createElement('button', {
        type: 'button',
        disabled,
        onClick,
        style: {
          marginRight: '8px',
          padding: '4px 10px',
          fontSize: '12px',
          borderRadius: '6px',
          border: '1px solid var(--dsw-alias-border-l2, #ccc)',
          background: 'var(--dsw-alias-interactive-bg, #fff)',
          color: 'var(--dsw-alias-label-primary, #111)',
          cursor: disabled ? 'wait' : 'pointer',
        },
      }, label)
    }

    // ---------- 1. 本地状态 ----------
    function StatusSection({ myco, t }) {
      const [status, setStatus] = useState(null)
      const [busy, setBusy] = useState(false)
      const refresh = () => {
        setBusy(true)
        Promise.resolve(myco.status())
          .then(setStatus)
          .catch((err) => setStatus({ error: String(err?.message ?? err) }))
          .finally(() => setBusy(false))
      }
      useEffect(() => { try { refresh() } catch { /* effect 错误不外泄 */ } }, [])

      const run = (verb) => () => {
        setBusy(true)
        Promise.resolve(verb())
          .then(refresh)
          .catch(() => setBusy(false))
      }

      const children = [sectionTitle(t('status.title'))]
      if (status?.error) {
        children.push(React.createElement('div', { style: { color: '#c0392b', fontSize: '12px' } }, status.error))
      } else if (status) {
        const head = [
          `${t('status.packages')}: ${status.counts.packages}`,
          `${t('status.docs')}: ${status.counts.documents}`,
          `${t('status.tags')}: ${status.counts.tags}`,
          `${t('status.candidates')}: ${status.lifecycleCandidates}`,
          `${t('status.index')}: ${status.index.fresh ? status.index.lastIndexedAt : t('status.never')}`,
          `${t('status.profile')}: ${status.activeProfile ?? t('status.none')}`,
        ].join('  ·  ')
        children.push(React.createElement('div', { style: { fontSize: '12px', marginBottom: '8px' } }, head))

        if (status.errors.length > 0) {
          children.push(React.createElement('div', { style: { fontSize: '12px', color: '#b9770e', marginBottom: '8px' } },
            status.errors.map((e) => React.createElement('div', { key: e.spec }, `${e.spec}: ${e.reason}`))))
        }

        children.push(React.createElement('table', { style: { borderCollapse: 'collapse', width: '100%' } },
          React.createElement('tbody', null,
            status.packages.map((p) => React.createElement('tr', { key: p.id },
              cell(p.id, { fontWeight: 600 }),
              cell(`[${p.scope}]`),
              cell(`v${p.version}`),
              cell(p.state),
              cell(p.path, { color: 'var(--dsw-alias-label-dimmed, #888)', wordBreak: 'break-all' }),
            )),
          ),
        ))
      }

      children.push(React.createElement('div', { style: { marginTop: '8px' } },
        button(t('console.refresh'), refresh, busy),
        button(t('console.reindex'), run(() => myco.index()), busy),
        button(t('console.sweep'), run(() => myco.sweep()), busy),
      ))

      return React.createElement('div', { style: sectionStyle() }, children)
    }

    // ---------- 2. 远程库（v0.3：git 同步） ----------
    function CloudSection({ myco, t }) {
      const [data, setData] = useState(null)
      const [busy, setBusy] = useState(false)
      const refresh = () => Promise.resolve(myco.cloudStatus()).then(setData).catch(() => {})
      useEffect(() => { try { refresh() } catch { /* effect 错误不外泄 */ } }, [])

      const run = (verb) => () => {
        setBusy(true)
        Promise.resolve(verb())
          .then(refresh)
          .catch(() => {})
          .finally(() => setBusy(false))
      }

      const children = [sectionTitle(t('cloud.title'))]
      if (!data) {
        children.push(React.createElement('div', { style: { fontSize: '12px' } }, t('status.activating')))
        return React.createElement('div', { style: sectionStyle() }, children)
      }
      const roots = Object.entries(data.cloudRoots ?? {})
      if (roots.length === 0) {
        children.push(React.createElement('div', { style: { fontSize: '12px', marginBottom: '8px' } }, t('cloud.empty')))
      } else {
        children.push(React.createElement('div', { style: { fontSize: '12px', marginBottom: '8px' } },
          roots.map(([name, r]) => {
            const url = typeof r === 'string' ? '' : r.url ?? ''
            const branch = typeof r === 'string' ? 'main' : r.branch ?? 'main'
            return React.createElement('div', { key: name, style: { marginBottom: '2px' } },
              `${name}  [${branch}]  ${url || '(无 url)'}`)
          }),
        ))
      }
      for (const m of data.mounts ?? []) {
        let note
        if (!m.resolved) {
          note = `${t('cloud.unresolved')} — ${m.reason ?? ''}`
        } else if (m.git) {
          const g = m.git
          note = `${m.path}  ·  ${g.branch}  ahead:${g.ahead}  behind:${g.behind}${g.dirty ? `  dirty:${g.changedFiles}` : ''}`
        } else {
          note = `${m.path}  ·  (未 clone / 非 git)`
        }
        children.push(React.createElement('div', { key: m.spec, style: { fontSize: '12px', marginTop: '4px' } },
          `${m.spec}  ${note}`))
      }
      children.push(React.createElement('div', { style: { marginTop: '8px' } },
        button(t('console.refresh'), refresh, busy),
        button(t('cloud.sync'), run(() => myco.cloudSync()), busy),
      ))
      return React.createElement('div', { style: sectionStyle() }, children)
    }

    // ---------- 3. 组合配置 ----------
    function ProfileSection({ myco, t }) {
      const [profiles, setProfiles] = useState([])
      const [active, setActive] = useState(null)
      const [busy, setBusy] = useState(false)

      const refresh = () => {
        Promise.all([
          Promise.resolve(myco.profiles()),
          Promise.resolve(myco.status()),
        ]).then(([list, st]) => {
          setProfiles(list)
          setActive(st.activeProfile ?? null)
        }).catch(() => {})
      }
      useEffect(() => { try { refresh() } catch { /* effect 错误不外泄 */ } }, [])

      const activate = (name) => () => {
        setBusy(true)
        Promise.resolve(myco.useProfile(name))
          .then(refresh)
          .finally(() => setBusy(false))
      }

      const children = [sectionTitle(t('profile.title'))]
      if (profiles.length === 0) {
        children.push(React.createElement('div', { style: { fontSize: '12px' } },
          `${t('profile.active')}: ${active ?? t('status.none')}`))
      } else {
        for (const p of profiles) {
          const line = `${p.name}${p.name === active ? `  ← ${t('profile.active')}` : ''}  ·  ${t('profile.include')}: ${(p.include ?? []).join(', ') || t('profile.all')}`
          children.push(React.createElement('div', {
            key: p.name,
            style: { fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' },
          },
            React.createElement('span', null, line),
            p.name === active
              ? null
              : button(t('profile.activate'), activate(p.name), busy),
          ))
        }
      }
      return React.createElement('div', { style: sectionStyle() }, children)
    }

    // ---------- 4. 工作区 × 知识包矩阵 ----------
    function WorkspaceSection({ myco, workspaces, t }) {
      const [status, setStatus] = useState(null)
      useEffect(() => {
        try {
          Promise.resolve(myco.status()).then(setStatus).catch(() => {})
        } catch { /* effect 错误不外泄 */ }
      }, [])

      const children = [sectionTitle(t('workspace.title'))]
      const snapshot = workspaces?.list?.getSnapshot?.()
      const items = snapshot?.items ?? []
      if (items.length === 0) {
        children.push(React.createElement('div', { style: { fontSize: '12px' } }, t('workspace.empty')))
      } else if (status) {
        for (const ws of items) {
          const wsPath = ws.path ?? ''
          const matched = status.packages.filter((p) => {
            const pp = p.path ?? ''
            return pp.startsWith(wsPath) || wsPath.startsWith(pp)
          })
          children.push(React.createElement('div', {
            key: ws.workspaceId,
            style: { fontSize: '12px', marginBottom: '6px' },
          },
            React.createElement('div', { style: { fontWeight: 600 } }, wsPath || ws.workspaceId),
            matched.length === 0
              ? React.createElement('div', { style: { color: 'var(--dsw-alias-label-dimmed, #888)' } }, '—')
              : matched.map((p) => React.createElement('div', { key: p.id }, `↳ ${p.id}  [${p.scope}] v${p.version}`)),
          ))
        }
      }
      return React.createElement('div', { style: sectionStyle() }, children)
    }

    // ---------- 错误边界：控制台崩溃时显示错误而非白屏 ----------
    class MycoErrorBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null }
      }
      static getDerivedStateFromError(error) {
        return { error }
      }
      render() {
        if (this.state.error) {
          return React.createElement('div', {
            style: {
              padding: '16px',
              fontSize: '12px',
              color: '#c0392b',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            },
          }, `MyCo-KB 控制台渲染错误：\n${String(this.state.error?.stack ?? this.state.error)}`)
        }
        return this.props.children
      }
    }

    // ---------- 5. 变更事件（v0.5） ----------
    function EventsSection({ myco, t }) {
      const [events, setEvents] = useState([])
      const [impact, setImpact] = useState(null)
      const [busy, setBusy] = useState(false)

      const load = () => Promise.resolve(myco.events(20)).then(setEvents).catch(() => {})
      useEffect(() => { try { load() } catch { /* effect 错误不外泄 */ } }, [])

      const run = (verb, then) => () => {
        setBusy(true)
        Promise.resolve(verb())
          .then(() => {
            if (then) then()
            return load()
          })
          .catch(() => {})
          .finally(() => setBusy(false))
      }
      const analyze = (eventId) => () => {
        setBusy(true)
        Promise.resolve(myco.impact(eventId))
          .then(setImpact)
          .then(load)
          .catch(() => {})
          .finally(() => setBusy(false))
      }

      const children = [sectionTitle(t('events.title'))]
      if (events.length === 0) {
        children.push(React.createElement('div', { style: { fontSize: '12px', marginBottom: '8px' } }, t('events.empty')))
      } else {
        children.push(React.createElement('div', { style: { fontSize: '12px', marginBottom: '8px' } },
          events.map((e) => {
            const line = `#${e.id} [${e.bump}] ${e.packageId}/${e.rel}${e.contractId ? `  契约:${e.contractId}` : ''}`
            return React.createElement('div', {
              key: e.id,
              style: { marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' },
            },
              React.createElement('span', { style: { color: e.bump === 'major' ? '#c0392b' : undefined } }, line),
              e.bump === 'major'
                ? button(t('events.impact'), analyze(e.id), busy)
                : null,
            )
          }),
        ))
      }
      if (impact) {
        const line = (label, list) => `${label}: ${list.length ? list.map((x) => `${x.packageId}/${x.rel}`).join(', ') : t('events.none')}`
        children.push(React.createElement('div', {
          style: { fontSize: '12px', padding: '8px', background: 'var(--dsw-alias-bg-subtle, #f5f5f5)', borderRadius: '6px', marginBottom: '8px' },
        },
          React.createElement('div', { style: { fontWeight: 600, marginBottom: '4px' } }, `事件 #${impact.event.id} 影响分析`),
          React.createElement('div', null, line(t('events.dye'), impact.dye)),
          React.createElement('div', null, line(t('events.spread'), impact.spread)),
          React.createElement('div', null, line(t('events.pkgSpread'), impact.pkgSpread)),
        ))
      }
      children.push(React.createElement('div', { style: { marginTop: '8px' } },
        button(t('console.refresh'), load, busy),
        button(t('events.scan'), run(() => myco.scan()), busy),
      ))
      return React.createElement('div', { style: sectionStyle() }, children)
    }

    // ---------- 6. 传播队列（stale，v0.5） ----------
    function StaleSection({ myco, t }) {
      const [stale, setStale] = useState([])
      const [busy, setBusy] = useState(false)
      const load = () => Promise.resolve(myco.stale()).then(setStale).catch(() => {})
      useEffect(() => { try { load() } catch { /* effect 错误不外泄 */ } }, [])

      const clear = (node) => () => {
        setBusy(true)
        Promise.resolve(myco.staleClear(node))
          .then(load)
          .catch(() => {})
          .finally(() => setBusy(false))
      }

      const draft = (node) => () => {
        setBusy(true)
        Promise.resolve(myco.draft(node))
          .then(() => alert(t('stale.drafted')))
          .catch(() => {})
          .finally(() => setBusy(false))
      }

      const children = [sectionTitle(t('stale.title'))]
      if (stale.length === 0) {
        children.push(React.createElement('div', { style: { fontSize: '12px' } }, t('stale.empty')))
      } else {
        for (const s of stale) {
          children.push(React.createElement('div', {
            key: s.node,
            style: { fontSize: '12px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' },
          },
            React.createElement('span', { style: { color: '#b9770e' } }, `${s.node}  — ${s.reason}`),
            button(t('stale.draft'), draft(s.node), busy),
            button(t('stale.clear'), clear(s.node), busy),
          ))
        }
      }
      children.push(React.createElement('div', { style: { marginTop: '8px' } },
        button(t('console.refresh'), load, busy),
      ))
      return React.createElement('div', { style: sectionStyle() }, children)
    }

    // ---------- 7. Webhook 通知（v0.5.2） ----------
    function WebhookSection({ myco, t }) {
      const [cfg, setCfg] = useState(null)
      const [input, setInput] = useState('')
      const [result, setResult] = useState('')
      const [busy, setBusy] = useState(false)

      const load = () => Promise.resolve(myco.webhook()).then(setCfg).catch(() => {})
      useEffect(() => { try { load() } catch { /* effect 错误不外泄 */ } }, [])

      const save = () => {
        setBusy(true)
        Promise.resolve(myco.webhookSet(input))
          .then(() => { setInput(''); setResult(t('webhook.saved')); return load() })
          .catch(() => {})
          .finally(() => setBusy(false))
      }
      const test = () => {
        setBusy(true)
        Promise.resolve(myco.webhookTest())
          .then((r) => setResult(r?.ok ? t('webhook.sent') : `${t('webhook.failed')}: ${r?.reason ?? r?.status ?? ''}`))
          .catch(() => {})
          .finally(() => setBusy(false))
      }
      const clear = () => {
        setBusy(true)
        Promise.resolve(myco.webhookSet(''))
          .then(() => { setResult(''); return load() })
          .catch(() => {})
          .finally(() => setBusy(false))
      }

      const children = [sectionTitle(t('webhook.title'))]
      if (cfg) {
        children.push(React.createElement('div', { style: { fontSize: '12px', marginBottom: '8px' } },
          cfg.enabled ? `✓ ${cfg.url}` : `— ${t('webhook.empty')}`))
      }
      children.push(React.createElement('div', { style: { fontSize: '12px', marginBottom: '6px' } },
        React.createElement('input', {
          type: 'text',
          value: input,
          onChange: (e) => setInput(e.target.value),
          placeholder: t('webhook.placeholder'),
          style: {
            width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: '12px',
            borderRadius: '6px', border: '1px solid var(--dsw-alias-border-l2, #ccc)',
            background: 'var(--dsw-alias-interactive-bg, #fff)',
            color: 'var(--dsw-alias-label-primary, #111)',
          },
        }),
      ))
      children.push(React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-dimmed, #888)' } },
        t('webhook.url')))
      children.push(React.createElement('div', { style: { marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' } },
        button(t('webhook.save'), save, busy),
        button(t('webhook.test'), test, busy),
        button(t('webhook.clear'), clear, busy),
        result ? React.createElement('span', { style: { fontSize: '12px' } }, result) : null,
      ))
      return React.createElement('div', { style: sectionStyle() }, children)
    }

    // ---------- 8. 起草草案（subagent，v0.5.3） ----------
    function DraftsSection({ myco, t }) {
      const [drafts, setDrafts] = useState([])
      const [busy, setBusy] = useState(false)
      const load = () => Promise.resolve(myco.drafts())
        .then((d) => setDrafts(Array.isArray(d) ? d : []))
        .catch(() => { setDrafts([]) })
      useEffect(() => { try { load() } catch { /* effect 错误不外泄 */ } }, [])

      const clear = (node) => () => {
        setBusy(true)
        Promise.resolve(myco.draftClear(node)).then(load).catch(() => {}).finally(() => setBusy(false))
      }

      const statusText = (st) => ({
        done: t('drafts.done'),
        running: t('drafts.running'),
        pending: t('drafts.pending'),
        error: t('drafts.error'),
      })[st] ?? st

      const children = [sectionTitle(t('drafts.title'))]
      if (drafts.length === 0) {
        children.push(React.createElement('div', { style: { fontSize: '12px' } }, t('drafts.empty')))
      } else {
        for (const d of drafts) {
          const statusColor = d.status === 'error' ? '#c0392b' : d.status === 'done' ? '#1e8449' : '#b9770e'
          children.push(React.createElement('div', {
            key: d.node,
            style: { fontSize: '12px', marginBottom: '10px', padding: '8px', background: 'var(--dsw-alias-bg-subtle, #f7f7f7)', borderRadius: '6px' },
          },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' } },
              React.createElement('span', { style: { fontWeight: 600 } }, d.node),
              React.createElement('span', { style: { color: statusColor } }, statusText(d.status)),
              button(t('drafts.clear'), clear(d.node), busy),
            ),
            d.error
              ? React.createElement('div', { style: { color: '#c0392b', whiteSpace: 'pre-wrap' } }, d.error)
              : React.createElement('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '11px' } },
                (d.draft ?? '').slice(0, 800) + ((d.draft ?? '').length > 800 ? '\n…（草案较长，已截断）' : '')),
          ))
        }
      }
      children.push(React.createElement('div', { style: { marginTop: '8px' } },
        button(t('console.refresh'), load, busy),
      ))
      return React.createElement('div', { style: sectionStyle() }, children)
    }

    // ---------- 控制台面板 ----------
    // 注意：MycoErrorBoundary 在 register 层包裹本组件（见 apply），
    // 覆盖 hooks 阶段 + 渲染阶段 + effect 抛错，防止错误外泄到 slot 系统卸载设置区。
    function MycoConsolePanel({ ctx, workspaces, t }) {
      const { ready, myco } = useMycoApi()
      if (!ready) {
        return React.createElement('div', { style: panelStyle() },
          React.createElement('h2', { style: { margin: '0 0 4px', fontSize: '16px', fontWeight: 700 } },
            t('console.title')),
          React.createElement('div', { style: { fontSize: '12px' } }, t('status.activating')),
        )
      }
      return React.createElement('div', { style: panelStyle() },
        React.createElement('h2', { style: { margin: '0 0 4px', fontSize: '16px', fontWeight: 700 } },
          t('console.title')),
        React.createElement(StatusSection, { myco, t }),
        React.createElement(EventsSection, { myco, t }),
        React.createElement(StaleSection, { myco, t }),
        React.createElement(CloudSection, { myco, t }),
        React.createElement(WebhookSection, { myco, t }),
        React.createElement(DraftsSection, { myco, t }),
        React.createElement(ProfileSection, { myco, t }),
        React.createElement(WorkspaceSection, { myco, workspaces, t }),
      )
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, dictionaries), 'myco-kb: dictionaries')
      const t = ctx.locale.bind(NS)

      ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
        name: 'settings.plugins.tab',
        id: 'myco-kb-console',
        order: 100,
        // ⚠️ label 必填：ui-settings-plugins 渲染 tab 时 resolveSlotLabel(options.label)，
        //    缺 label 的 entry 标题为空 → tab 不显示（2026-08-20 实测踩坑）
        label: () => t('console.title'),
        locale: NS,
        inject: () => ({
          ctx,
          workspaces: ctx.workspaces,
        }),
        // 错误边界提升到最外层：覆盖 MycoConsolePanel 的 hooks 阶段 + 渲染阶段，
        // 防止任何错误外泄到 slot 系统（2026-08-20 实测：设置入口整体消失）
      }, (props) => React.createElement(MycoErrorBoundary, null, React.createElement(MycoConsolePanel, props))))
    }

    module.exports = { apply, inject }
    return module.exports
  },
})
