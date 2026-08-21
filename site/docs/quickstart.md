# 快速开始

MyCo-KB 以 **DeepSeek Harness 插件**形态运行，同时提供独立的 `myco` CLI。五步走完核心链路。

## 1. 安装

```bash
# 从源码仓库安装（本地开发）
npm run links      # 先建本地依赖符号链接（scripts/dev-links.sh）
npm run check      # 语法检查

# 安装进 Harness（静默常驻，重启 Harness 生效）
scripts/install-profile.sh
```

数据目录默认 `~/.myco`，可用环境变量覆盖：

```bash
export MYCO_DATA=/path/to/data
```

## 2. 初始化一个知识包

```bash
myco init /path/to/your-kb
```

会在目录下生成 `kb.yaml` 清单：

```yaml
id: your-kb
name: your-kb
scope: repo
version: 0.1.0
state: evergreen
dependencies: []
```

缺省情况下，包 id / 版本由目录名与 `kb.yaml` 推导。

## 3. 挂载知识根

```bash
myco mount repo:/path/to/your-kb   # 仓库级
myco mount local:my-obsidian       # 本地全局（Obsidian 等）
myco mount cloud:my-team-kb        # 云端全局（先 cloud add 注册）

myco mounts                       # 查看已挂载
```

## 4. 建立索引并检索

```bash
myco index                        # 重建跨包索引
myco find 部署                     # tag×3 / 文件名×2 / 全文×1 打分
myco status                       # 维护状态快照
```

## 5. 静默运转

安装进 Harness 后，daemon 自动：

- 监听文件变更，**2 秒防抖增量重索引**；
- 定时生命周期扫描 + 云同步（默认 6h）；
- major 契约变更自动影响分析并推送 webhook。

也可以前台手动跑守护：

```bash
myco daemon
```

## 安装技能包

```bash
myco install-skills    # 复制 skills/ 到 ~/.agents/skills/
```

安装后 agent 可获得 `myco-search` / `myco-maintain` / `myco-lifecycle` 三个技能。

## 下一步

- 完整命令见 [CLI 命令参考](/docs/cli)
- 深入理解概念见 [知识包与挂载](/docs/packages)、[组合配置](/docs/profiles)、[生命周期管理](/docs/lifecycle)
- 云端多机同步见 [云端 git 同步](/docs/cloud)
- 知识更新流见 [知识更新流](/docs/updates)
