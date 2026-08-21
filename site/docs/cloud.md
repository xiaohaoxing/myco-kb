# 云端 git 同步

把知识包放到 git 仓库，多机、多人同步 —— 零依赖，直接调用系统 git。

## 注册云端根

```bash
myco cloud add mykb https://github.com/me/mykb.git
# 或指定分支
myco cloud add mykb https://github.com/me/mykb.git dev
```

默认 clone 到 `~/.myco/cloud/<name>`。cloudRoots 兼容两种配置格式：字符串路径（旧格式）与 `{ url, path, branch }`。

## 挂载与同步

```bash
myco mount cloud:mykb     # 挂载云端知识根
myco cloud sync mykb      # 同步单个
myco cloud sync           # 同步全部
```

同步流水线：**clone（缺失时）→ pull（ff-only）→ commit 本地改动（message 自动生成）→ push**。

## 冲突策略：本地改动永不丢失

- pull 使用 **ff-only**；
- 分叉 / 冲突时**报告并保留本地改动**，绝不自动覆盖；
- 人工 merge 后再次 `myco cloud sync` 恢复。

```text
✗ mykb: 冲突报告（失败于 pull）—— 本地改动已保留，请人工 merge 后重试
```

## 同步后自动变更检测

`cloud sync` 完成后自动执行 `scanChanges`：pull 拉取的新内容**立即**进入事件流（与 daemon 行为一致），major 事件自动影响分析并标 stale。

## 管理

```bash
myco cloud list        # 列出云端根与分支
myco cloud remove mykb # 移除云端根
```

## 边界

- git 命令非交互、带超时（120s）、防注入；
- daemon 定时维护时云同步防重入（git 超时不会阻塞定时循环）；
- 冲突不自动解决 —— 这是特性，不是缺陷。
