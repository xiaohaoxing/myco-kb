// MyCo-KB 客户端入口（v0.1 占位）
// 目标（v0.2）：在 DSH Web 提供「知识库控制台」面板 —— 本地维护状态 + 远程库管理 + 组合配置 + 工作区矩阵。
// 挂载点待定：插件卡片 action slot（需一次小的 core 贡献）或独立工作区页面。
window.__ModuleLoader__?.load?.({
  id: '@dsh/myco-kb',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')
    function apply(ctx) {
      ctx.effect(() => {
        console.info('[myco-kb] console UI scaffold loaded (v0.2: 控制台面板)')
      }, 'myco-kb: console scaffold')
    }
    module.exports = { apply, inject: [] }
    return module.exports
  },
})
