# MyCo-KB 发布方式（Release Runbook）

> 本文是 MyCo-KB **发版 / 分发 / 更新** 的权威操作手册。每次发版照此执行，即可产出可分发的制品，并支持两种更新路径。
> 相关：`docs/installation.md`（安装/升级/回滚）、`docs/enterprise-delivery-cookbook.md`（企业交付）。

## 0. 两条更新路径（并存）

| 路径 | 方式 | 适用 |
| --- | --- | --- |
| **A. 制品 / `myco upgrade`** | 自包含安装器（`myco-install-<v>.sh`）+ 版本化安装 + CLI 自动更新 | 企业用安装器、自包含、可回滚；不依赖 DSH 管理 |
| **B. DSH 插件管理在线更新** | git 依赖（`github:xiaohaoxing/myco-kb#<tag>`）→ DSH 插件管理页「更新」 | 用户在 DSH 里点一下即更新（同 dsh-remote） |

两者都要求：**标准 DSH bundle**（已满足：`cordis.patch.yml` + `dsh.bundle.patch`）+ **`v*` tag**。

---

## 1. 发版前（新版本准备）

```bash
cd /path/to/myco-kb
# 1) 升版本（当前 0.6.0；加特性 → minor，如 0.7.0）
node -p "require('./package.json').version"      # 看当前
#    编辑 package.json 的 "version"（或 npm version minor）
# 2) 更新 CHANGELOG（新增一节 [0.7.0]，标题对齐 package.json）
# 3) 提交 + 推送（含全部代码/文档改动）
git add -A && git commit -m "release: v0.7.0 — …" && git push -u origin main
```

> 版本纪律：`0.5.0` 起 npm 版本与功能里程碑对齐。加特性 → minor；修 bug → patch。

---

## 2. 构建制品

```bash
bash scripts/build-release.sh
#   产出：dist/dsh-myco-kb-<v>.tgz（+ .tgz.sha256）
#        dist/myco-install-<v>.sh        自包含安装器（内含安装器 + 制品 base64）
#        dist/myco-install-<v>.sh.sha256
```

`build-release.sh` 自动：语法检查 → 全量单测（`node --test --test-timeout`）→ 打包 → 校验产物关键文件（含 `cordis.patch.yml`）→ sha256 指纹。**失败则不出制品**。

---

## 3. 发布到 GitHub Releases（供 `myco upgrade` / 手动下载）

```bash
GH="$HOME/.local/bin/gh"   # 需已安装并认证（gh auth login）
"$GH" release create v0.7.0 \
  --title "MyCo-KB v0.7.0" \
  --notes "…变更摘要…" --target main

"$GH" release upload v0.7.0 \
  dist/myco-install-0.7.0.sh \
  dist/myco-install-0.7.0.sh.sha256 \
  dist/dsh-myco-kb-0.7.0.tgz \
  dist/dsh-myco-kb-0.7.0.tgz.sha256
```

> **资产名必须** `myco-install-0.7.0.sh`（不带 `v`）——`myco upgrade` 按此名字找。强烈建议一并上传 `.sha256`（`myco upgrade` 用它校验，防篡改）。
> `myco upgrade` 默认查 `xiaohaoxing/myco-kb` 的 `releases/latest`（`MYCO_UPGRADE_REPO` 可覆盖）。

---

## 4. 分发与更新

### 路径 A：自包含安装器 / `myco upgrade`
```bash
# 用户机器
bash myco-install-0.7.0.sh          # 版本化安装（保留旧版本可回滚）
myco upgrade                        # 或自动更新（下载+sha256 校验+安装）；--yes 跳过确认
# 重启 DeepSeek Harness 后生效（服务端代码启动时加载；控制台刷新见新 UI）
```

### 路径 B：DSH 插件管理在线更新（git 依赖）
```bash
# 一次性把插件切为 git 依赖
bash scripts/install-release.sh git v0.7.0
# 重启 DSH → DSH 识别为「可从 git 更新」插件
```
- 之后打新 tag + 发布，**DSH 插件管理页出现「更新」按钮** → 点一下即在线更新。
- 手动退回制品/版本化安装：`bash scripts/install-release.sh install dist/dsh-myco-kb-<v>.tgz`。

---

## 5. 回滚

```bash
bash myco-install-0.7.0.sh rollback        # 或 install-release.sh rollback
# 采用版本化安装：旧版本保留在 .myco-kb-versions/<ver>/，升级前备份 profile/package.json
```

---

## 6. 发版检查清单

- [ ] `package.json` version + `CHANGELOG` 一致（`v*` tag = 版本）
- [ ] `bash scripts/build-release.sh` 通过（含全量测试 + 产物校验）
- [ ] GitHub Release `v0.7.0` 创建，资产 `myco-install-0.7.0.sh`(+`.sha256`) + `.tgz`(+`.sha256`) 已上传
- [ ] `myco install --version` / `myco upgrade` 能识别最新版（可先 `myco upgrade` 测）
- [ ] （路径 B）`scripts/install-release.sh git v0.7.0` 已切换，DSH 插件管理可更新
- [ ] 发布后：重启 DSH 在插件管理页确认新版本，控制台显示正常

---

## 附：常见命令速查

```bash
bash scripts/build-release.sh                        # 构建 + 校验 + sha256
bash scripts/install-release.sh install <tgz> [p]    # 制品安装/升级
bash scripts/install-release.sh git <ref> [p]        # git 依赖（DSH 在线更新）
bash scripts/install-release.sh rollback [p]         # 回滚
bash scripts/install-release.sh list [p]             # 列出已装版本
myco upgrade                                          # 自动更新（查 GitHub Releases）
gh release create v<x> --title … --notes …           # 建 Release
gh release upload v<x> <assets…>                     # 上传资产
gh repo clone xiaohaoxing/myco-kb                    # 拉源码
```
