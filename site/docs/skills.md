# 技能包

MyCo-KB 将能力打包为 agent 技能，安装后 agent 可直接调用 —— 知识库与技能**双形态同源**。

## 安装

```bash
myco install-skills    # 复制 skills/ 到 ~/.agents/skills/
```

## 技能清单

### myco-search —— 知识包检索

- 何时用：用户问「X 记录在哪里」/「哪个页面覆盖了 Y」/ 想按概念（而非精确措辞）检索。
- 核心命令：`myco find <关键词...>`、`myco status`。
- 解读协议：命中常青页直接读当前状态 / 边界 / 口径；命中证据页读历史流水，不做状态依据。
- 无结果时：`myco index` 重建索引，确认关键词不是命名空间停用词。

### myco-maintain —— 知识库维护

- 何时用：挂载 / 卸载知识根、重建索引、查看维护状态、激活组合配置。
- 核心命令：`myco mount` / `myco unmount` / `myco index` / `myco status` / `myco profile use`。
- 覆盖 repo / local / cloud 三类知识根与组合配置切换。

### myco-lifecycle —— 知识生命周期

- 何时用：判断某记录是否该晋升、旧记录如何处理、`myco sweep` 候选如何解读。
- 晋升是**事件驱动**而非时间驱动：收件箱 → 证据 → 常青 → 原则，每步有明确判定标准。
- 与 `myco sweep`（休眠归档 / 孤页补链）配套使用。

## 设计要点

- 技能与知识库描述同源，避免「技能说的」和「库里记的」不一致；
- 技能面向 agent 使用场景编写（whenToUse 明确触发条件），不面向人肉阅读；
- 全部技能只读报告，破坏性动作仍需人工确认。

## 相关

- 安装与使用见 [快速开始](/docs/quickstart)
- 生命周期判定标准见 [生命周期管理](/docs/lifecycle)
