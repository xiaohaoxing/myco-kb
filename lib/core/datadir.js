import { homedir } from 'node:os'
import { join } from 'node:path'

// MyCo-KB 数据目录解析。
// 优先级：显式 dataDir（config） > 环境变量 MYCO_DATA > 默认。
//
// 默认值语义（v0.8.1 起，向后兼容）：
//   - 普通场景：回退 ~/.myco（与 0.7.x 一致，无 cwd 怪癖）。
//   - DSH agent 环境（检测到 process.env.DSH_SHELL）：改用工作区相对
//     join(process.cwd(), '.myco')——agent 在会话工作区内运行 `myco ...` 时，
//     数据落进工作区，从而绕开 DSH 文件沙箱对工作区外写入的拦截（EPERM）。
//
// 说明：DSH_SHELL 是 DSH agent/会话 shell 环境标记（实测 agent 会话内为 '1'），
// 普通用户/宿主进程无此变量，故默认仍走 ~/.myco，完全不需要任何配置。
export function resolveDataDir(explicit) {
  if (explicit) return explicit
  const env = process.env.MYCO_DATA
  if (env) return env
  if (process.env.DSH_SHELL) return join(process.cwd(), '.myco')
  return join(homedir(), '.myco')
}
