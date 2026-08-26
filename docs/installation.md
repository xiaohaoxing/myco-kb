# 安装指导（把 MyCo-KB 装到一台设备上的 DeepSeek Harness）

> 本文是**安装到新设备**的标准手册，也是权威入口。其余文档引用本页。
> 两套路径：**方式 A 产品化安装（推荐，给任何新设备/企业机器）**、**方式 B 开发源码安装（仅开发者自己机器）**。

---

## 0. 前提

| 项 | 要求 |
| --- | --- |
| **DeepSeek Harness（DSH）** | 已安装并至少启动过一次（这样才会生成 `~/.dsh/profiles/web` profile） |
| **Node.js** | **≥ 23（推荐 24）**。更新流用 `node:sqlite`；Node 18/20 会在更新流路径崩溃 |
| **node 在 PATH** | 若没有系统 node，用 DSH 自带：`export PATH="$HOME/Library/Application Support/dsh-desktop/toolchain:$PATH"` |
| **git（可选）** | 使用云端同步时需要，且 SSH key 已加入你的 GitLab / GitHub |
| **python3（可选）** | 自包含安装器用它解 base64；大多 mac/linux 自带 |

Node 校验也可以交给安装器：`install-release.sh` 启动时会检查 Node 版本，不足会明确报错。

---

## 方式 A：产品化安装（推荐）

> 在开发机上跑一次 `build-release.sh`，得到**一个自包含安装文件**，拷到新设备直接装。新设备不需要源码。

### A1. 开发机上构建制品（只需一次）
```bash
cd /path/to/myco-kb
bash scripts/build-release.sh        # 产出：
#   dist/dsh-myco-kb-0.7.0.tgz       制品 tarball（+ .sha256）
#   dist/myco-install-0.7.0.sh       ★ 自包含安装器（内含安装器 + 制品 base64，+ .sha256）
```

### A2. 把自包含安装器拷到新设备
```bash
scp dist/myco-install-0.7.0.sh user@new-device:/tmp/      # 或 U盘 / git 分发（选一种）
```

### A3. 在新设备上运行（一条命令装完）
```bash
cd /tmp
node -v                              # 确认 ≥ 23（安装器也会再校验）
bash myco-install-0.7.0.sh [profile] # 默认 profile ~/.dsh/profiles/web
```
它会自动：① 解出制品 tarball → ② 执行 `install-release.sh install`（版本化安装 + 依赖声明 + `dsh.profile.bundles`）→ ③ 生成可直接用的 `myco` 命令。

**这个文件就是完整的安装工具**（含升级/回滚/查看），无需其它脚本：
```bash
bash myco-install-0.7.0.sh [profile]            # 安装
bash myco-install-0.7.0.sh install [profile]    # 同安装
bash myco-install-0.7.0.sh rollback [profile]   # 回滚到上一个版本
bash myco-install-0.7.0.sh list [profile]       # 列出已装版本（* = 当前活动）
```

### A4. 初始化 + 验证
```bash
myco init              # 创建 ~/.myco-kb 默认知识库并挂载（新用户即用）
myco install-skills    # 装上 agent 技能
myco status && myco index
```
**重启 DSH 桌面端**后：插件管理页显示 MyCo-KB 为 **DSH 插件**；Plugins 设置区出现 **MyCo-KB 控制台 tab**；daemon 静默监听（文件变更 2s 增量重索引 + 定时维护）。

### A5.（可选）接团队共享云端包
```bash
myco cloud add shared git@<gitlab-host>:<group>/team-kb.git --sync
myco mount cloud:shared
myco cloud sync shared
```

---

## 方式 B：制品 tarball + 安装脚本（不想要自包含文件时）

```bash
# 把 dist/dsh-myco-kb-<version>.tgz + scripts/install-release.sh 拷到新设备
bash scripts/install-release.sh install ./dsh-myco-kb-<version>.tgz [profile]
# 升级：bash scripts/install-release.sh install <新制品.tgz>
# 回滚：bash scripts/install-release.sh rollback
# 查看：bash scripts/install-release.sh list
```

---

## 升级 / 回滚 / 查看版本

自包含安装器即完整工具：
```bash
# 升级：拿到新的 myco-install-<new>.sh，直接运行（无需附参数，它会装新版本并记下上一个版本）
bash myco-install-<new>.sh [profile]
bash myco-install-0.7.0.sh rollback               # 回滚到上一个版本
bash myco-install-0.7.0.sh list                   # 列出已装版本（* = 当前活动）
```
- **升级**：拿到新的 `myco-install-<new>.sh` 直接运行（它会装新版本并记下上一个版本）。
- **自动更新**：`myco upgrade` 查询 GitHub Releases 最新版 → 下载 `myco-install-<version>.sh` → 校验 sha256 → 版本化安装 → 提示重启。`--yes` 跳过确认。默认仓库 `xiaohaoxing/myco-kb`（`MYCO_UPGRADE_REPO` 覆盖）。
- **回滚 / 查看**：这些不依赖制品版本，可复用任意一个 `myco-install-*.sh`。
- 脚本分发备选：`bash scripts/install-release.sh install|rollback|list`（若手头没有自包含文件）。

采用**版本化安装**：版本本体放在 `node_modules/@dsh/.myco-kb-versions/<version>/`，`node_modules/@dsh/myco-kb` 是符号链接指向当前版本。每次安装前**备份** `profile/package.json` 到 `package.json.bak-<ts>`，回滚时自动恢复。重启 DSH 后生效（配置在启动时合成，不支持热加载）。

---

## DSH 插件管理在线更新（git 依赖）

> 与「自包含安装器 / `myco upgrade`」并列的另一种更新路径：把插件装成 **git URL 依赖**，DSH 插件管理就能像更新 dsh-remote 那样**在线更新**。

```bash
# 把依赖切换为 git URL（DSH 识别为「可从 git 更新」的插件）
bash scripts/install-release.sh git v0.7.0          # 默认 profile ~/.dsh/profiles/web
# 或指定 profile： bash scripts/install-release.sh git v0.7.0 <profile>
```

这会把 profile `package.json` 里写成：

```json
"@dsh/myco-kb": "github:xiaohaoxing/myco-kb#v0.7.0"
```

- **生效**：重启 DeepSeek Harness，DSH 解析 git 依赖并装载插件。
- **在线更新**：之后仓库打新 tag（如 `v0.7.0`）并发布，**插件管理页会出现「更新」**，点一下即在线更新到新 tag（DSH 自动把依赖 ref 升到新 tag）。
- **前提**：MyCo-KB 仓库须是标准 DSH bundle（已满足：`cordis.patch.yml` + `dsh.bundle.patch`），发布用 `v*` tag（`build-release.sh` + `gh release create v0.x.0` 已形成此流程）。
- 手动退回制品/版本化安装：`bash scripts/install-release.sh install dist/dsh-myco-kb-<version>.tgz`。

> 两者可并存：企业环境可用自包含安装器 + `myco upgrade`（自包含、可回滚）；也可用 git 依赖让 DSH 插件管理在线更新。

## `myco` 命令自动可用

`install-release.sh` 会生成 `~/.local/bin/myco` 启动器（用解析到的 node 指向当前 profile 的插件 CLI，跟随版本符号链接，升级/回滚后仍指向正确版本）。

- 若该目录**已在 PATH**：直接可用。
- 若**不在 PATH**：默认写入带标记的 `export PATH` 块到 shell rc（优先 `~/.zshrc`）——幂等、可逆；新 shell 或 `source` 后生效。
- 环境变量：
  - `MYCO_NO_PATH=1`：只生成启动器、**不改 shell rc**（仅打印提示）。
  - `MYCO_BIN_DIR=<dir>`：自定义启动器目录（默认 `~/.local/bin`）。

shell rc 里被写入的块形如（可直接删除以移除）：
```bash
# >>> myco-kb PATH >>>
export PATH="<bin>:$PATH"   # added by install-release.sh
# <<< myco-kb PATH <<<
```

> 不想要启动器时，CLI 仍可用：`node <profile>/node_modules/@dsh/myco-kb/bin/myco.js <cmd>`。

---

## 产品化交付须知（版本 / Node / 打包）

- **版本**：npm 包版本**自 `0.5.0` 起与功能里程碑对齐**；**当前 `0.7.0`**（聚合遥测 + 自动更新）。见 [CHANGELOG](/CHANGELOG.md)。
- **Node**：`engines` 已对齐为 `>=23.0.0`（更新流依赖 `node:sqlite`）。
- **打包**：`build-release.sh`（= `npm run build:release`）做语法检查 → 单测 → 打包 → 校验产物关键文件 → sha256。产物**必须含 `cordis.patch.yml`**（插件 bundle 入口）。
- **绑定 git 远程**：`myco cloud add` 用系统 git，零依赖；云端库是团队共享知识，**绝不 push 密钥/DSN**。

---

## 方式 C：开发源码安装（仅开发者自己机器）

> 这是**开发/单机**用法，把仓库符号链接进 profile，**不是**可分发制品。企业交付请用方式 A。

```bash
cd /path/to/myco-kb
npm run links        # 建依赖符号链接（scripts/dev-links.sh）
npm run check
scripts/install-profile.sh   # 符号链接进 ~/.dsh/profiles/web + 声明依赖 + 加 bundle
node bin/myco.js init
node bin/myco.js status
# 重启 DSH
```
> 开发者在**多台自己的机器**上迭代时也可用方式 A 的制品，它不依赖源码符号链接。

---

## 排查

- **插件管理页显示「不是 DSH 插件」**：多为 profile 里 bundle 声明或 `cordis.patch.yml` 入口缺失。用 `myco-install-*.sh list`（或 `install-release.sh list`）确认版本存在；确认 `node_modules/@dsh/myco-kb/cordis.patch.yml` 存在。
- **控制台 tab 不出现**：插件 bundle 已装载但 `settings.plugins.tab` slot 的 entry 缺 `label`（见 `docs/architecture.md` 踩坑第 4 条）。
- **`myco` 命令找不到**：`myco` 启动器目录不在 PATH；用 `MYCO_NO_PATH=1` 重新安装后手动加 PATH，或直接跑 `node <profile>/node_modules/@dsh/myco-kb/bin/myco.js`。
- **Node 版本过低报错**：装 Node ≥ 23，或把 DSH 工具链 node 加入 PATH。
