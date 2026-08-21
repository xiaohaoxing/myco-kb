# MyCo-KB 云端知识包生产接入指南

> v0.3 云端 git 同步 + v0.5 传播链路的生产接入步骤。多机场景实测通过：
> 机器 A 云端包契约变更 → 机器 B `myco cloud sync` → 自动事件/影响分析/stale/通知。

## 一、准备云端仓库（GitLab / GitHub 二选一）

### GitLab（内网，推荐——与 chaoheti 共用）

1. 在 GitLab（`100.71.123.6:8929`）新建空白项目，如 `shared-kb`（不带 README，稍后本地 push）
2. 确认本机 SSH key 已加入 GitLab（`~/.ssh/id_ed25519.pub` → GitLab 设置 → SSH Keys）
3. 仓库 URL 用 SSH 形式：`git@100.71.123.6:2424/<group>/shared-kb.git`（SSH 端口 2424）

### GitHub（公网）

1. 新建空白仓库 `shared-kb`
2. URL：`git@github.com:<you>/shared-kb.git`（ssh）或 `https://...`（凭据走 credential helper / gh auth）

> **安全**：URL 不内嵌 token。SSH 走 agent/keychain，HTTPS 走系统 credential helper。
> 云端库是团队共享知识，**不要 push 任何密钥/DSN**（与知识库安全规则一致）。

## 二、首次接入（本机）

```bash
# 1. 注册云端根（clone 到 ~/.myco/cloud/shared-kb）
myco cloud add shared git@100.71.123.6:2424/<group>/shared-kb.git

# 2. 挂载 + 首次同步（clone 到本地）
myco mount cloud:shared
myco cloud sync shared

# 3. 初始化云端库内容（kb.yaml 声明依赖），本地编辑后 push
#    在 ~/.myco/cloud/shared-kb/ 添加知识，然后：
myco cloud sync shared      # 自动 commit 本地改动 + push
```

## 三、多机工作流

| 机器 | 动作 |
| --- | --- |
| 任意机器 | `myco cloud sync shared`（或等 daemon 定时同步，默认 6h） |
| 修改云端包 | 编辑 `~/.myco/cloud/shared-kb/` 下文件 → `myco cloud sync`（commit+push） |
| 收到远端变更 | `myco cloud sync` → **自动变更检测**：pull 的新内容产生事件 → major 契约变更自动影响分析 → 传播集标 stale |

daemon 形态（装进 Harness 后）：定时维护周期内自动执行 `syncAll → detectChanges`，pull 的新内容**当周期**就进事件流（不等下一周期），major 变更自动标 stale + 飞书通知。

## 四、跨机传播（v0.5 联动）

云端包的契约变更会自动传播到**所有机器**上引用它的包：

```
机器 A: 云端包 docs/contract.md 契约 shared-rule v1→v2 → push
机器 B: myco cloud sync
  → 事件 #1 [major] shared-kb/docs/contract.md 契约:shared-rule
  → 影响分析:
      染色（同包）: shared-kb/docs/consumer.md
      传播（跨机跨包）: local-kb/consumer2.md   ← 机器 B 本地包
      依赖传播: local-kb（kb.yaml dependencies: [shared-kb]）
  → stale: local-kb/consumer2.md + pkg:local-kb（待人工确认）
  → 控制台「传播队列」+ 飞书通知
```

## 五、冲突与回滚

- **pull 冲突**：`myco cloud sync` 用 ff-only，分叉/冲突时**报告且不自动解决**，本地改动不丢。人工 `git merge` 后再次 sync 恢复（v0.3 全流程实测）。
- **回滚云端**：git 本身就是版本源，`git log` / `git revert` 即可（`git revert` 后 `myco cloud sync` push）。

## 六、配置速查

```bash
myco cloud add <name> <url> [branch]   # 注册云端根（默认 branch main）
myco cloud list                        # 列出
myco cloud remove <name>               # 移除
myco cloud sync [name]                 # 同步（clone/pull/commit/push + 自动变更检测）
```

config.json 存储：

```json
{ "cloudRoots": { "shared": { "url": "git@...", "path": "/Users/you/.myco/cloud/shared", "branch": "main" } } }
```
