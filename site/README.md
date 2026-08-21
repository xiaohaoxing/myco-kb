# MyCo-KB 官方网站

产品主页：产品特性 + 系统设计 + 用户文档。基于 [VitePress](https://vitepress.dev/)。

## 本地开发

```bash
npm install
npm run dev        # http://localhost:4173（热更新）
```

## 构建与部署

```bash
npm run build      # 产物在 .vitepress/dist/
npm run preview    # 本地预览构建产物（http://localhost:4173）
```

静态产物 `site/.vitepress/dist/` 可直接部署到任意静态托管（GitHub Pages / Nginx / CDN）。

## 目录

```text
index.md            主页（Hero + 特性 + 三步工作流 + 统计 + 文档入口）
features.md         产品特性
docs/               用户文档（快速开始/CLI/知识包/组合/生命周期/云同步/更新流/技能/开发/FAQ）
design/             系统设计（总览/架构/数据模型/更新流/守护/路线图）
public/logo.svg     菌丝网络 Logo
```

## 内容维护约定

- 与仓库 `README.md`、`docs/architecture.md` 同源维护：产品行为变更时三处同步；
- 主页「正在被 MyCo-KB 管理的试点知识库」统计来自 `myco status` 真实输出。
