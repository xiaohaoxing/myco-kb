import { homedir } from 'node:os'
import { join } from 'node:path'

// MyCo-KB 数据目录解析。
// 优先级：显式 dataDir（config） > 环境变量 MYCO_DATA > 默认。
//
// 默认值语义（v0.8.0）：
//   - CLI（bin/myco.js）：workspaceRelative=true → 以**当前工作目录**为根（join(cwd, '.myco')）。
//     当 agent 在会话工作区内运行 `myco ...` 时，cwd 即工作区，数据落进工作区，
//     从而绕开 DSH 文件沙箱对工作区外写入的拦截（EPERM）。
//   - DSH 插件（lib/index.js）：默认 workspaceRelative=false → 回退 ~/.myco。
//     宿主插件的 process.cwd() 通常是 DSH 应用目录而非工作区，若按 cwd 默认会把
//     数据写进 app bundle（可能只读），故保持 ~/.myco 兜底；要按工作区部署时，
//     通过 cordis.patch.yml 的 config.dataDir 或 MYCO_DATA 显式指定。
export function resolveDataDir(explicit, { workspaceRelative = false } = {}) {
  if (explicit) return explicit
  const env = process.env.MYCO_DATA
  if (env) return env
  return workspaceRelative ? join(process.cwd(), '.myco') : join(homedir(), '.myco')
}
