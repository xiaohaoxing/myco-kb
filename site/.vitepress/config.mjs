import { defineConfig } from 'vitepress'

const guides = [
  { text: '快速开始', link: '/docs/quickstart' },
  { text: 'CLI 命令参考', link: '/docs/cli' },
  { text: '知识包与挂载', link: '/docs/packages' },
  { text: '组合配置 Profiles', link: '/docs/profiles' },
  { text: '生命周期管理', link: '/docs/lifecycle' },
  { text: '云端 git 同步', link: '/docs/cloud' },
  { text: '知识更新流', link: '/docs/updates' },
  { text: '技能包', link: '/docs/skills' },
  { text: '开发与测试', link: '/docs/development' },
  { text: '常见问题 FAQ', link: '/docs/faq' },
]

const design = [
  { text: '设计总览', link: '/design/overview' },
  { text: '运行时形态与架构', link: '/design/architecture' },
  { text: '数据模型与检索', link: '/design/datamodel' },
  { text: '知识更新流设计', link: '/design/updateflow' },
  { text: '后台守护', link: '/design/daemon' },
  { text: '路线图', link: '/design/roadmap' },
]

export default defineConfig({
  title: 'MyCo-KB',
  description: '真菌之库 · 我的公司 —— 知识库管理系统（DeepSeek Harness 插件形态）：知识包 / 组合配置 / 生命周期 / 跨包检索 / 云端同步 / 知识更新流',
  lang: 'zh-CN',
  cleanUrls: true,
  ignoreDeadLinks: true,
  head: [
    ['meta', { name: 'theme-color', content: '#0f766e' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { property: 'og:title', content: 'MyCo-KB' }],
    ['meta', { property: 'og:description', content: '真菌之库 · 我的公司 —— 知识库管理系统（DeepSeek Harness 插件形态）' }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'MyCo-KB',
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: { noResultsText: '未找到相关结果', resetButtonTitle: '清除', footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' } },
        },
      },
    },
    nav: [
      { text: '首页', link: '/' },
      { text: '产品特性', link: '/features' },
      { text: '用户文档', link: '/docs/quickstart', activeMatch: '/docs/' },
      { text: '系统设计', link: '/design/overview', activeMatch: '/design/' },
      { text: '路线图', link: '/design/roadmap' },
    ],
    sidebar: {
      '/docs/': [
        { text: '用户文档', items: guides },
      ],
      '/design/': [
        { text: '系统设计', items: design },
      ],
      '/features': [
        { text: '产品特性', items: [{ text: '总览', link: '/features' }] },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/' },
    ],
    footer: {
      message: 'MIT Licensed · 真菌之库 MyCo-KB',
      copyright: 'Copyright © 2026 MyCo-KB Contributors',
    },
    outline: { label: '本页目录', level: [2, 3] },
    lastUpdated: { text: '最后更新', formatOptions: { dateStyle: 'short', timeStyle: 'short' } },
    docFooter: { prev: '上一篇', next: '下一篇' },
    darkModeSwitchLabel: '外观',
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '菜单',
    notFound: {
      title: '页面不存在',
      quote: '菌丝网络没有通向这里的通道。',
      linkText: '回到首页',
      linkLabel: '回到首页',
    },
  },
})
