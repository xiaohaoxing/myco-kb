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

    function useRemoteMyco(ctx) {
      const [myco, setMyco] = useState(() => ctx.get('remote.myco', false) ?? null)
      useEffect(() => {
        const sync = () => setMyco(ctx.get('remote.myco', false) ?? null)
        sync()
        return ctx.on('internal/service', (name) => {
          if (name === 'remote.myco') sync()
        })
      }, [ctx])
      return myco
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
      }, text)
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
      useEffect(refresh, [])

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
      useEffect(refresh, [])

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
      useEffect(refresh, [])

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
        Promise.resolve(myco.status()).then(setStatus).catch(() => {})
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

    // ---------- 控制台面板 ----------
    function MycoConsolePanel({ ctx, workspaces, t }) {
      const myco = useRemoteMyco(ctx)
      if (!myco) {
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
        React.createElement(CloudSection, { myco, t }),
        React.createElement(ProfileSection, { myco, t }),
        React.createElement(WorkspaceSection, { myco, workspaces, t }),
      )
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, dictionaries), 'myco-kb: dictionaries')

      ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
        name: 'settings.plugins.tab',
        id: 'myco-kb-console',
        order: 100,
        locale: NS,
        inject: () => ({
          ctx,
          workspaces: ctx.workspaces,
        }),
      }, MycoConsolePanel))
    }

    module.exports = { apply, inject }
    return module.exports
  },
})
