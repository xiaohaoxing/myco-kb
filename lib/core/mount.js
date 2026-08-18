// 挂载解析：repo:/local:/cloud: spec → 具体根路径
export function parseSpec(spec) {
  const m = /^(repo|local|cloud):(.+)$/.exec(spec)
  if (m) return { scope: m[1], value: m[2], raw: spec }
  return { scope: 'repo', value: spec, raw: spec }
}

// 解析单个挂载；cloud: 需在 config.cloudRoots 中有映射，否则标记未解析
export function resolveMount(mount, config = {}) {
  const { scope, value } = parseSpec(mount.spec)
  if (scope === 'cloud') {
    const root = config.cloudRoots?.[value]
    if (!root) {
      return { ...mount, scope, resolved: false, reason: `cloud root '${value}' 未配置（config.cloudRoots）` }
    }
    return { ...mount, scope, path: root, resolved: true }
  }
  return { ...mount, scope, path: value, resolved: true }
}
