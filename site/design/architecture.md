# 运行时形态与架构

MyCo-KB 同时以三种形态运行，全部复用同一套核心。

## 三种运行形态

### 1. CLI（`myco`）

- 纯 Node，**零依赖**；
- 复用 `lib/core/*`；
- 数据目录 `~/.myco`（`MYCO_DATA` 覆盖）。

### 2. DSH 插件（`@dsh/myco-kb`）

Cordis 插件，宿主平面运行，**标准 bundle 装载**：

- 插件自带 `cordis.patch.yml`（自声明 entry：id + name + config）；
- package.json 声明 `dsh.bundle.patch` 指向它；
- profile 经 `dsh.profile.bundles` 装载；
- （2026-08-20 起从「手动 insert」改为标准形态 —— 手动 insert 会被插件管理页判为「不是 DSH 插件」且 client 端不装载。）

```text
┌─────────────── 宿主平面（Harness）───────────────┐
│  lib/index.js  MycoRemoteService(ctx, myco)      │
│    ├─ ctx.myco 远程服务（经 Typert Gateway）      │
│    ├─ registerTools → agent 工具面               │
│    └─ ctx.effect → daemon（watcher + timer）     │
├──────────────────────────────────────────────────┤
│  lib/client.js  控制台面板                        │
│    挂 settings.plugins.tab slot                  │
│    四区：本地状态 / 远程库 / 组合配置 / 工作区矩阵  │
└──────────────────────────────────────────────────┘
```

### 3. 技能包（`skills/*/SKILL.md`）

- `myco install-skills` 复制到 `~/.agents/skills/`；
- 与知识库双形态同源：技能描述、知识库记录保持一致。

## 远程服务（Typert）

- `lib/remote.js`：`MycoRemoteService extends TypertRemoteService`，`super(ctx, 'myco')` 注册服务并绑定 Gateway；
- **12 个导出方法**：status / find / index / sweep / profiles / useProfile / mounts / cloudStatus / cloudSync / cloudAdd / cloudRemove / cloudList；
- **不使用 `@Remote()` 装饰器语法**（node 26 不支持装饰器且已移除 `--experimental-decorators`）：在构造器里用导出的 `Remote(name)` 函数手动复刻装饰器标记（收集 addInitializer，实例就绪后以 `this=实例` 调用）；
- client 侧**不硬依赖 `remote.myco`**：顶层 inject 只声明 `['slots', 'remote', 'workspaces', 'locale']`；面板组件用 `ctx.get('remote.myco', false)` 懒读取 + 监听 `internal/service` 事件，等远程服务挂载后刷新。

## 控制台数据通道

设置页/非会话 UI 依赖 Typert remote face 会永远「执行中」（remote 受 inject 声明门控，第三方插件的宿主 face 不随 web boot 同步）：

- 控制台数据改用 `ctx.webServer.register` 注册**同源 JSON 路由**（官方 dsh-client-modules 同款机制），client fetch 即可用；
- Typert remote 保留给 **agent 工具面与会话级场景**。

## 插件开发踩坑实录（真实启动验证）

1. **loader entry 必须同时有 `id` 和 `name`**：Cordis loader 用 `options.name` 去 `import()` 插件；只有 `id` 时 name 为 `undefined` → 启动崩溃。`cordis.patch.yml` 的 insert 条目两个都要写。
2. **client 插件不要在顶层 inject 里硬等动态 remote namespace**：会让整个 web boot 卡在插件激活阶段（`pending (waiting for service: remote.myco)`）。remote 面是懒依赖，不是硬依赖。
3. **回归测试模式**：`test/client.test.js` mock `window.__ModuleLoader__` 真加载 bundle，断言顶层 inject 不含 `remote.myco` —— 防止重构把硬依赖加回去。
4. **slot 注册必须带 `label`**：`settings.plugins.tab` 渲染时 `resolveSlotLabel(entry.options.label) ?? ""` —— 缺 label 的 entry 标题为空，tab 直接不显示。同时 label 回调里用到的 t 要在 apply 里先 `ctx.locale.bind(NS)`。
5. **设置页/非会话 UI 不要依赖 Typert remote face**：见上文「控制台数据通道」。
6. **React effect 抛错不被错误边界捕获**：effect 内同步抛错会向上传播到根，卸载整棵组件树。防御：错误边界提升到 slot 注册的最外层组件，且所有 useEffect 回调体包 try/catch。

## 相关

- [数据模型与检索](/design/datamodel)
- [后台守护](/design/daemon)
- 开发与测试：[用户文档 · 开发与测试](/docs/development)
