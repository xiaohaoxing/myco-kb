# 组合配置 Profiles

同一套知识库，不同的人、环境、目标需要不同的装配 —— 组合配置（profile）解决这个问题。

## 为什么需要组合

- **用户维度**：研究视角、开发视角、管理视角，关心的知识包不同；
- **环境维度**：本地开发、CI、云端，可用的数据源不同；
- **目标维度**：当前任务只需要其中一组知识包与工具。

## 使用

```bash
myco profile list          # 列出所有组合
myco profile use research  # 激活「研究」组合
```

profile 定义 include 列表，未列出的包按「全部」处理：

```text
research  include: my-kb, notes
```

## 可复现性

profile 通过 lockfile 可复现：同一 profile 在另一台机器、另一个 agent 上得到同一套装配。这是组合模式的根基 —— 知识装配不再是隐式的、靠记忆的，而是显式的、可回放的。

## 与知识包的关系

- 知识包是**事实的容器**（挂载什么）；
- profile 是**装配的规则**（激活哪些 + 怎么组合）；
- 二者分离，组合可以在不移动任何文件的前提下完成。

## 查看状态

```bash
myco status     # 输出中显示「激活 profile」
```

控制台「组合配置」区可查看与切换。

## 按任务动态装配（v0.4）

静态 profile 是「人声明的装配规则」，而**按任务动态装配**（`myco assemble`）是「根据当前任务目标自动挑出刚好够用的知识包子集 + 工具掩码」：

```bash
myco assemble "配置 API 网关生产步骤"   # 匹配 profile + 知识包子集 + 工具掩码
myco assemble-status                    # 查看最近一次装配（lockfile，可复现）
```

装配分两层：

1. **profile 精确匹配**：任务者的用户 / 环境 / 目标与各 profile 的 `match.{用户,环境,目标}` 逐维命中，命中即锁定该 profile 的 include/exclude。
2. **知识包子集软匹配**：在 profile 包内再按 `whenToUse` 语义 ×5 > tag ×3 > 文件名 ×2 > 全文 ×1 打分排序，取「刚好够用」的子集；命中为空时回退默认（全量包不裁剪）。

装配结果含 `toolMask`（保留检索/装配基础工具、列出被裁包）与可复现 `lockfile`（写入 `data/assemble.lock.json`）。控制台「按任务动态装配」区可视化展示。

> 边界：装配只影响 agent「看到哪些」，不是权限边界；它不改变「文件是唯一事实源」的底层约定。
