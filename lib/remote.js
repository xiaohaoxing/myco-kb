import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

// 导出到 Typert Gateway 的方法名（client 侧注入 remote.myco 后可调用）
const REMOTE_METHODS = [
  'status',
  'find',
  'index',
  'sweep',
  'profiles',
  'useProfile',
  'mounts',
  'cloudStatus',
]

/**
 * MyCo-KB 远程服务：以 Cordis Service 形态注册为 ctx.myco，
 * 经 Typert Gateway 暴露给 client（remote.myco）。
 *
 * 说明：本仓库源码不用 @Remote 装饰器语法（node 26 不支持装饰器且
 * 已移除 --experimental-decorators；DSH 运行时编译时自动降级处理），
 * 这里在构造器里用导出的 Remote() 函数手动复刻装饰器标记：
 * Remote(name) 返回的标准方法装饰器只做 addInitializer，我们把
 * initializer 收集起来，在实例就绪后以 this=实例 调用，
 * 效果等价于 class 声明期的 @Remote(name)。
 */
export class MycoRemoteService extends TypertRemoteService {
  constructor(ctx, core) {
    super(ctx, 'myco')
    this.core = core

    const initializers = []
    for (const name of REMOTE_METHODS) {
      Remote(name)(null, {
        kind: 'method',
        name,
        private: false,
        static: false,
        addInitializer(fn) {
          initializers.push(fn)
        },
      })
    }
    for (const fn of initializers) fn.call(this)
  }

  status() {
    return this.core.status()
  }

  find(query) {
    return this.core.find(query)
  }

  index() {
    return this.core.reindex()
  }

  sweep() {
    return this.core.sweep()
  }

  profiles() {
    return this.core.listProfiles()
  }

  useProfile(name) {
    this.core.useProfile(name)
    return this.core.status()
  }

  mounts() {
    return this.core.mounts()
  }

  cloudStatus() {
    return this.core.cloudStatus()
  }
}
