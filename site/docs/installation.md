# 安装指导

> 把 MyCo-KB 装到一台设备上的 DeepSeek Harness。运维/部署细节（构建、多设备分发、升级回滚）见仓库 `docs/installation.md`。

## 前提

- **DeepSeek Harness（DSH）** 已安装并至少启动过一次（这样才会生成 `~/.dsh/profiles/web` profile）。
- **Node.js ≥ 23**（推荐 24）——更新流用 `node:sqlite`；Node 18/20 会在更新流路径崩溃。
- 若系统没有 node，用 DSH 自带：`export PATH="$HOME/Library/Application Support/dsh-desktop/toolchain:$PATH"`。

## 安装（一个自包含文件）

开发机先构建一次，得到**一个文件**（内含插件 + 安装器）：

```bash
# 开发机上
bash scripts/build-release.sh        # → dist/myco-install-<version>.sh + dist/dsh-myco-kb-<version>.tgz
```

把 `dist/myco-install-<version>.sh` 拷到目标设备（scp / U盘 / git 分发均可），然后：

```bash
node -v                             # 确认 ≥ 23（安装器也会再校验）
bash myco-install-0.6.0.sh [profile] # 默认 profile ~/.dsh/profiles/web
```

它自动完成：解出制品 → `install-release.sh install`（版本化安装 + 依赖声明 + bundle 条目）→ 生成可直接用的 `myco` 命令。

## 装完验证

```bash
myco init              # 创建 ~/.myco-kb 默认知识库并挂载
myco install-skills    # 装上 agent 技能
myco status && myco index
```

**重启 DSH** 后：插件管理页显示 MyCo-KB 为 **DSH 插件**；Plugins 设置区出现 **MyCo-KB 控制台 tab**；daemon 静默监听（文件变更 2s 增量重索引 + 定时维护）。

## 升级 / 回滚 / 查看版本

自包含安装器就是完整工具（不依赖其它脚本）：

```bash
bash myco-install-0.6.0.sh [profile]            # 安装
bash myco-install-0.6.0.sh rollback [profile]   # 回滚到上一个版本
bash myco-install-0.6.0.sh list [profile]       # 列出已装版本（* = 当前活动）
```

- **升级**：拿到新的 `myco-install-<new>.sh` 直接运行即可（装新版本并记下上一个版本）。
- **回滚 / 查看**：不依赖制品版本，可复用任意一个 `myco-install-*.sh`。
- 采用版本化安装（版本本体放 `node_modules/@dsh/.myco-kb-versions/<version>/`，`@dsh/myco-kb` 为符号链接指向当前版本）；安装前自动备份 `profile/package.json`，回滚时恢复。重启 DSH 后生效。

## `myco` 命令

安装器生成 `~/.local/bin/myco` 启动器（用解析到的 node 指向当前 profile 的插件 CLI）。若该目录不在 PATH，默认把**带标记的 `export PATH` 块**写入 shell rc（优先 `~/.zshrc`）——幂等、可逆；新 shell 或 `source` 后生效。

- 不改 shell rc：`MYCO_NO_PATH=1 bash myco-install-0.6.0.sh`
- 自定义目录：`MYCO_BIN_DIR=<dir>`

## （可选）接团队共享云端包

```bash
myco cloud add shared git@<gitlab-host>:<group>/team-kb.git --sync
myco mount cloud:shared
myco cloud sync shared
```

## （仅开发者）源码安装

`npm run links && npm run check && scripts/install-profile.sh`，再重启 DSH。这是**开发/单机**用法，不是可分发制品；企业交付请用上面的自包含安装。
