// 维护状态快照（机器可读，供 console UI / 插件页消费）
export function buildStatus({
  packages = [], errors = [], index = null, lastIndexedAt = null,
  mounts = [], activeProfile = null, sweepResults = null,
}) {
  return {
    generatedAt: new Date().toISOString(),
    packages: packages.map((p) => ({
      id: p.id, scope: p.scope, version: p.version, state: p.state,
      spec: p.spec, path: p.path, manifestFile: p.manifestFile ?? null,
    })),
    counts: {
      packages: packages.length,
      documents: index?.counts?.documents ?? 0,
      tags: index?.counts?.tags ?? 0,
    },
    index: { lastIndexedAt: lastIndexedAt ?? null, fresh: lastIndexedAt !== null },
    mounts: mounts.map((m) => ({ spec: m.spec, enabled: m.enabled !== false, scope: m.scope })),
    activeProfile: activeProfile ?? null,
    lifecycleCandidates: sweepResults?.candidates?.length ?? 0,
    errors,
  }
}
