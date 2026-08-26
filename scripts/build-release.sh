#!/usr/bin/env bash
# MyCo-KB 产品化发布构建。
#
# 用法：
#   bash scripts/build-release.sh
#
# 流程：语法检查 → 单元测试 → 打包 → 校验产物关键文件 → sha256 指纹。
# 版本：始终读取 package.json 的 version（发布前先改 package.json，或用 pnpm version <x>）。
# 产物：dist/dsh-myco-kb-<version>.tgz + .tgz.sha256。
#
# 可选：MYCO_HOST_CHECK=1 bash scripts/build-release.sh 追加宿主平面验证
#   （需要本机装有 DeepSeek Harness，且依赖符号链接已就位）。
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

VERSION="$(node -p "require('./package.json').version")"
NAME="dsh-myco-kb-$VERSION.tgz"
echo "构建版本：$VERSION"
echo

# ---- 1. 语法检查 ----
echo "== 语法检查 =="
node --check bin/myco.js
node --check lib/index.js
node --check lib/remote.js
node --check lib/tools.js
node --check lib/daemon.js
node --check lib/client.js
for f in lib/core/*.js; do node --check "$f"; done
echo "✓ 语法检查通过"
echo

# ---- 2. 单元测试（带 per-test timeout，避免进程挂起） ----
echo "== 单元测试 =="
node --test --test-timeout=30000
echo

# ---- 2b. 宿主平面验证（可选） ----
if [ "${MYCO_HOST_CHECK:-0}" = "1" ]; then
  echo "== 宿主平面验证 =="
  node scripts/host-check.mjs
  echo
fi

# ---- 3. 打包 ----
echo "== 打包 =="
mkdir -p dist
PKG_CMD="npm pack"
if command -v pnpm >/dev/null 2>&1; then PKG_CMD="pnpm pack"; fi
TMP_PACK="$(mktemp -d)"
trap 'rm -rf "$TMP_PACK"' EXIT
(cd "$REPO" && $PKG_CMD --pack-destination "$TMP_PACK" >/dev/null)
TARBALL="$(ls "$TMP_PACK"/*.tgz | head -1)"
cp "$TARBALL" "dist/$NAME"
echo "✓ 产物：dist/$NAME"

# ---- 4. 校验产物关键文件在包内 ----
echo "== 校验产物 =="
fail=0
for need in "package/cordis.patch.yml" "package/bin/myco.js" "package/lib/index.js" "package/package.json"; do
  if tar -tzf "dist/$NAME" | grep -q "^$need$"; then
    echo "✓ $need"
  else
    echo "✗ 包内缺失 $need" >&2
    fail=1
  fi
done
# 确认包文件字段确实包含 cordis.patch.yml（防止未来 files 回退丢失插件入口）
if tar -tzf "dist/$NAME" | grep -q "^package/cordis.patch.yml$"; then
  echo "✓ 插件 bundle 入口（cordis.patch.yml）存在"
fi
if [ "$fail" -ne 0 ]; then
  echo "✗ 产物校验失败" >&2
  exit 1
fi

# ---- 5. 生成自包含安装器（一个文件拷过去即可装） ----
SELF_INSTALLER="dist/myco-install-$VERSION.sh"
echo "== 生成自包含安装器：$SELF_INSTALLER =="
SELF_TMP="$(mktemp)"
{
  cat <<'EOF'
#!/usr/bin/env bash
# MyCo-KB 自包含安装器（一个文件拷过去即可装）
# 用法：
#   bash myco-install-__MYCO_VER__.sh [profile]             安装（默认 profile ~/.dsh/profiles/web）
#   bash myco-install-__MYCO_VER__.sh install [profile]     同安装
#   bash myco-install-__MYCO_VER__.sh rollback [profile]    回滚到上一个版本
#   bash myco-install-__MYCO_VER__.sh list [profile]        列出已装版本
# 安装会：解出制品 tarball → install-release.sh install → 生成可直接用的 myco 命令
set -euo pipefail
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
awk '$0=="#__MYCO_INSTALLER_BELOW__"{f=1;next} $0=="#__MYCO_INSTALLER_END__"{f=0} f' "$0" > "$TMP/install-release.sh"
chmod +x "$TMP/install-release.sh"
CMD="${1:-install}"
if [ "$CMD" = "rollback" ]; then
  exec bash "$TMP/install-release.sh" rollback "${2:-}"
elif [ "$CMD" = "list" ]; then
  exec bash "$TMP/install-release.sh" list "${2:-}"
else
  awk '$0=="#__MYCO_TARBALL_BELOW__"{f=1;next} $0=="#__MYCO_END__"{f=0} f' "$0" | python3 -c "import base64,sys; sys.stdout.buffer.write(base64.b64decode(sys.stdin.read()))" > "$TMP/dsh-myco-kb-__MYCO_VER__.tgz"
  PROFILE=""
  if [ $# -ge 1 ] && [ "${1:-}" != "install" ]; then PROFILE="$1"; fi
  if [ "${1:-}" = "install" ]; then PROFILE="${2:-}"; fi
  exec bash "$TMP/install-release.sh" install "$TMP/dsh-myco-kb-__MYCO_VER__.tgz" "$PROFILE"
fi
EOF
  echo '#__MYCO_INSTALLER_BELOW__'
  cat scripts/install-release.sh
  echo '#__MYCO_INSTALLER_END__'
  echo
  echo '#__MYCO_TARBALL_BELOW__'
  base64 < "dist/$NAME"
  echo '#__MYCO_END__'
} > "$SELF_TMP"
sed "s/__MYCO_VER__/$VERSION/g" "$SELF_TMP" > "$SELF_INSTALLER"
chmod +x "$SELF_INSTALLER"
rm -f "$SELF_TMP"

# ---- 6. sha256 指纹 ----
shasum -a 256 "dist/$NAME" > "dist/$NAME.sha256"
shasum -a 256 "$SELF_INSTALLER" > "$SELF_INSTALLER.sha256"
echo
echo "✅ 发布产物就绪："
echo "  dist/$NAME"
cat "dist/$NAME.sha256"
echo
echo "  $SELF_INSTALLER"
cat "$SELF_INSTALLER.sha256"
echo
echo "安装到企业机器："
echo "  bash scripts/install-release.sh install dist/$NAME           # 用制品 + 安装脚本"
echo "  bash dist/myco-install-$VERSION.sh                           # 用一个文件（自包含）"
