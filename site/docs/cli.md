# CLI 命令参考

`myco` 是纯 Node、零依赖的命令行工具，与插件共享 `lib/core/*` 核心。

```bash
myco <命令> [参数...]
```

## 知识包管理

| 命令 | 说明 |
| --- | --- |
| `myco init [dir]` | 初始化知识包清单 `kb.yaml`（默认当前目录） |
| `myco mount <spec>` | 挂载知识根（`repo:/path` / `local:name` / `cloud:name` / 直接路径） |
| `myco mounts` | 列出已挂载知识根 |
| `myco unmount <spec>` | 移除挂载 |

## 索引与检索

| 命令 | 说明 |
| --- | --- |
| `myco index` | 重建跨包索引 |
| `myco status` | 维护状态（写入 `data/status.json`） |
| `myco find <关键词...>` | 检索：tag×3 / 文件名×2 / 全文×1，证据页带标记 |

## 组合配置

| 命令 | 说明 |
| --- | --- |
| `myco profile list` | 列出组合配置 |
| `myco profile use <name>` | 激活组合配置 |

## 生命周期

| 命令 | 说明 |
| --- | --- |
| `myco sweep` | 生命周期候选扫描（仅报告，不自动执行） |

## 云端 git 同步

| 命令 | 说明 |
| --- | --- |
| `myco cloud add <name> <url> [branch]` | 注册云端知识根（git 仓库，默认分支 main） |
| `myco cloud list` | 列出云端根 |
| `myco cloud remove <name>` | 移除云端根 |
| `myco cloud sync [name]` | 同步云端包（clone/pull/push，默认全部） |

`cloud sync` 完成后自动执行变更检测，pull 的新内容立即进入事件流。

## 知识更新流

| 命令 | 说明 |
| --- | --- |
| `myco scan` | 变更检测（内容 hash 对比 → 变更事件） |
| `myco events [n]` | 变更事件日志（默认最近 20 条） |
| `myco impact <eventId>` | 影响分析：染色（同包派生）+ 传播（跨包引用 / 依赖），自动标 stale |
| `myco stale` | 列出 stale（待确认受影响节点） |
| `myco stale clear <node>` | 确认解除 stale |
| `myco contracts` | 列出全库契约块 |

## Webhook

| 命令 | 说明 |
| --- | --- |
| `myco webhook set <url>` | 设置 webhook url（留空 = 清除） |
| `myco webhook show` | 显示当前配置 |
| `myco webhook test` | 发送测试消息 |

## 其他

| 命令 | 说明 |
| --- | --- |
| `myco daemon` | 前台运行守护（watcher + 定时维护 + 云同步） |
| `myco install-skills` | 安装 `skills/` 到 `~/.agents/skills/` |
| `myco help` / `-h` | 帮助 |

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `MYCO_DATA` | 数据目录（默认 `~/.myco`） |

## 输出约定

- 挂载列表：`✓` 启用 / `✗` 禁用；
- 检索结果：`<score>  <packageId>/<rel>`，证据页追加 `[证据]`；
- 同步结果：`✓ <name>: stages: ...`，失败返回 `✗ <name>: <error>`（含失败阶段）；
- 影响分析：打印染色集、传播集与依赖传播集，有传播时提示已标 stale。
