# 知识包与挂载

## 什么是知识包

知识包是 MyCo-KB 的统一管理单元：**每个挂载根 = 一个知识包**。无论知识来自项目仓库、本地全局目录还是云端 git 仓库，都以同一套模型挂载、索引、检索、同步与演进。

## 三类知识根

| 前缀 | 含义 | 典型场景 |
| --- | --- | --- |
| `repo:` | 仓库级 | 随项目走的文档、设计稿、经验库 |
| `local:` | 本地全局 | Obsidian 库、个人笔记、跨项目共享资料 |
| `cloud:` | 云端全局 | 团队 git 知识仓库，多机同步 |

```bash
myco mount repo:/path/to/your-kb
myco mount local:my-obsidian
myco mount cloud:my-team-kb        # 需先 cloud add 注册
```

也可以直接传路径挂载（自动推导前缀）。

## 包清单 kb.yaml

每个知识包根目录可有一个 `kb.yaml`：

```yaml
id: my-kb            # 包 id（缺省由目录名推导）
name: my-kb          # 显示名
scope: repo          # repo | local | cloud
version: 0.1.0       # 版本
state: evergreen     # 生命周期状态
dependencies: []     # 依赖的其他包
whenToUse: ...       # 何时使用该包（给 agent 的说明）
```

```bash
myco init .          # 生成 kb.yaml
```

## 挂载配置

挂载信息保存在 `config.json`（数据目录下）：

```json
{ "spec": "repo:/path", "enabled": true, "scope": "repo", "mountedAt": "..." }
```

## 管理挂载

```bash
myco mounts          # 列出（✓ 启用 / ✗ 禁用）
myco unmount <spec>  # 移除挂载
```

## 数据目录

默认 `~/.myco`，`MYCO_DATA` 覆盖。核心产物：

| 文件 | 内容 |
| --- | --- |
| `config.json` | 挂载配置 + cloudRoots + webhook |
| `index.json` | 跨包倒排索引（tag 倒排 + documents） |
| `status.json` | 状态快照（控制台消费） |
| `cloud/<name>/` | 云端根 clone 目录 |
| `store.sqlite` | 更新流持久化（events / stale / hashes / drafts） |
