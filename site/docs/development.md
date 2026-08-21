# 开发与测试

MyCo-KB 是零依赖优先的插件项目：核心纯 Node，插件层只依赖 Cordis / dsh-tools / dsh-typert-protocol。

## 环境

```bash
npm run links     # 先建本地依赖符号链接（scripts/dev-links.sh，指向 DSH 安装目录）
npm run check     # 语法检查（node --check 全部入口 + 核心模块）
npm test          # 核心模块单测（node:test）
npm run test:host # 宿主平面验证（真实 Cordis：服务/工具/daemon/remote）
```

## 目录结构

```text
lib/
  index.js        Cordis 插件服务端入口（ctx.myco 服务 + 工具 + daemon）
  remote.js       Typert 远程服务（remote.myco，控制台数据通道）
  client.js       客户端：插件管理页控制台 tab
  tools.js        agent 工具面（dsh-tools）
  daemon.js       后台守护：watcher + 定时维护
  propagate.js    subagent 起草调度
  core/           纯 Node 核心（CLI 与插件共用）
    myco.js         编排器（挂载/索引/状态/检索/profile/sweep/cloud*/sync）
    sync.js         云端 git 同步原语
    frontmatter.js  零依赖 frontmatter 解析
    manifest.js     kb.yaml 清单读取
    mount.js        挂载解析
    registry.js     知识包注册表
    indexer.js      跨包倒排索引
    sweeper.js      生命周期候选扫描
    status.js       状态快照
    profile.js      组合配置
    contract.js     契约块解析
    events.js       变更检测
    store.js        node:sqlite 持久化
    impact.js       影响分析
bin/myco.js       CLI
skills/           myco-search / myco-maintain / myco-lifecycle
scripts/
  dev-links.sh       本地开发依赖符号链接
  host-check.mjs     宿主平面加载验证（独立进程）
  install-profile.sh 安装到 ~/.dsh/profiles/web
test/             node:test 单测（核心模块）
```

## 测试注意事项（实测踩坑）

1. **宿主验证必须独立进程**：`test:host` 用 `node scripts/host-check.mjs`，**不能用 `node --test`** —— Cordis 纤维在 node:test 的 async context 下不会 apply（已实测确认的环境不兼容）。
2. **服务可见性**：根 `ctx.get()` 读不到插件纤维提供的服务，需用 inject 探针（兄弟纤维）读取。
3. **回归测试模式**：`test/client.test.js` mock `window.__ModuleLoader__` 真加载 bundle，断言顶层 inject 不含 `remote.myco` —— 防止重构把硬依赖加回去。

## 安装进 Harness

```bash
scripts/install-profile.sh   # 符号链接进 ~/.dsh/profiles/web + 声明依赖（幂等）
```

重启 Harness 后生效：插件管理页出现 MyCo-KB 控制台 tab，daemon 静默监听知识包。

## 发布形态

```bash
npm pack    # 产物：lib/ + bin/ + skills/ + README.md
```

插件声明 `dsh.bundle.patch` 指向自带 `cordis.patch.yml`（标准 bundle 装载，2026-08-20 起）。
