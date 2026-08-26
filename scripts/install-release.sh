#!/usr/bin/env bash
# MyCo-KB 面向制品的安装 / 升级 / 回滚（替代开发用的符号链接 install-profile.sh）。
#
# 用法：
#   bash scripts/install-release.sh install <tarball> [profile]   # 安装 / 升级到某制品版本
#   bash scripts/install-release.sh rollback [profile]           # 回滚到上一个版本
#   bash scripts/install-release.sh list [profile]               # 列出已安装版本
#
# 默认 profile：~/.dsh/profiles/web（Harness 的 Cordis profile）
#
# 版本化布局（关键：@dsh/myco-kb 目录本身是纯符号链接，版本本体放兄弟目录）：
#   <profile>/node_modules/@dsh/
#     myco-kb                      → .myco-kb-versions/<version>/   (符号链接)
#     .myco-kb-versions/<version>/  (版本本体，含 package.json / cordis.patch.yml …)
#     .myco-kb-versions/.active     (当前活动版本)
#     .myco-kb-versions/.previous   (上一个版本，供回滚)
#
# 变更前：备份 profile/package.json 到 package.json.bak-<ts>，失败可回滚。
set -euo pipefail

DEFAULT_PROFILE="$HOME/.dsh/profiles/web"

usage() {
  echo "用法："
  echo "  bash scripts/install-release.sh install <tarball> [profile]   # 安装 / 升级到某制品版本（file 依赖/版本化）"
  echo "  bash scripts/install-release.sh git <ref> [profile]          # 改为 git 依赖安装（供 DSH 插件管理在线更新）"
  echo "  bash scripts/install-release.sh rollback [profile]           # 回滚到上一个版本"
  echo "  bash scripts/install-release.sh list [profile]               # 列出已安装版本"
  exit 1
}

# 需要 node:sqlite → Node >= 23；推荐 24
node_version_ok() {
  local major
  major="$(node -p "Number(process.versions.node.split('.')[0])")"
  [ "$major" -ge 23 ] && return 0 || return 1
}

read_profile() { echo "${1:-$DEFAULT_PROFILE}"; }

# 从 tarball 里读 package/package.json 的 version
read_tarball_version() {
  tar -xOf "$1" package/package.json 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).version)}catch(e){process.exit(1)}})"
}

backup_pkgjson() {
  if [ ! -f "$PROFILE/package.json" ]; then
    echo "（无 package.json，跳过备份）"
    return 0
  fi
  local ts; ts="$(date +%Y%m%d-%H%M%S)"
  cp "$PROFILE/package.json" "$PROFILE/package.json.bak-$ts"
  echo "✓ 已备份 package.json -> package.json.bak-$ts"
}

# 幂等写入依赖声明 + dsh.profile.bundles
ensure_dep_and_bundle() {
  if [ ! -f "$PROFILE/package.json" ]; then
    echo "✗ profile 没有 package.json：$PROFILE" >&2
    exit 1
  fi
  python3 - "$PROFILE/package.json" <<'PYJSON'
import json, sys
pkg_path = sys.argv[1]
with open(pkg_path, encoding='utf8') as f:
    pkg = json.load(f)
name = '@dsh/myco-kb'
deps = pkg.setdefault('dependencies', {})
val = 'file:./node_modules/@dsh/myco-kb'
if deps.get(name) != val:
    deps[name] = val
bundles = pkg.setdefault('dsh', {}).setdefault('profile', {}).setdefault('bundles', [])
if name not in bundles:
    bundles.append(name)
with open(pkg_path, 'w', encoding='utf8') as f:
    json.dump(pkg, f, ensure_ascii=False, indent=2)
    f.write('\n')
print('✓ 已写入依赖声明 + dsh.profile.bundles')
PYJSON
}

# 当前活动版本（读符号链接目标 basename，回退到 .active）
current_version() {
  local link
  link="$(readlink "$DEST" 2>/dev/null || true)"
  if [ -n "$link" ]; then
    printf '%s' "${link##*/}"
  elif [ -f "$VER_HOME/.active" ]; then
    cat "$VER_HOME/.active"
  else
    printf ''
  fi
}

# 找到可用的 node（优先 PATH，回退到 DSH 工具链 / 常见位置）
resolve_node() {
  local cand
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi
  for cand in \
    "$HOME/Library/Application Support/dsh-desktop/toolchain/node" \
    "/opt/homebrew/bin/node" "/usr/local/bin/node" "/usr/bin/node"; do
    if [ -x "$cand" ]; then
      printf '%s' "$cand"
      return 0
    fi
  done
  return 1
}

detect_shell_rc() {
  local rc
  for rc in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile"; do
    [ -f "$rc" ] && { printf '%s' "$rc"; return 0; }
  done
  printf '%s' "$HOME/.zshrc"
}

# 生成一个可直接使用的 myco 命令（指向当前 profile 的插件 CLI，跟随版本符号链接）。
# 若 bin 目录不在 PATH，则（默认）以带标记的方式追加到 shell rc，可逆、幂等。
# 设 MYCO_NO_PATH=1 可跳过修改 shell rc（仅生成启动器并打印提示）。
wire_cli() {
  local node_bin bin_dir launcher rc
  node_bin="$(resolve_node 2>/dev/null || true)"
  if [ -z "$node_bin" ]; then
    echo "⚠ 未找到 node，跳过生成 myco 命令（可先用 node bin/myco.js）。" >&2
    return 0
  fi
  bin_dir="${MYCO_BIN_DIR:-$HOME/.local/bin}"
  mkdir -p "$bin_dir"
  launcher="$bin_dir/myco"
  cat > "$launcher" <<EOF
#!/usr/bin/env bash
# MyCo-KB CLI launcher（由 install-release.sh 生成）
exec "$node_bin" "$PROFILE/node_modules/@dsh/myco-kb/bin/myco.js" "\$@"
EOF
  chmod +x "$launcher"

  local on_path=no
  case ":$PATH:" in
    *":$bin_dir:"*) on_path=yes ;;
  esac

  if [ "$on_path" = "yes" ]; then
    echo "✓ myco 命令已可用：$launcher"
    return 0
  fi
  if [ "${MYCO_NO_PATH:-0}" = "1" ]; then
    echo "✓ 已生成 myco 命令：$launcher"
    echo "  请手动加入 PATH 以直接使用：export PATH=\"\$PATH:$bin_dir\""
    return 0
  fi
  rc="$(detect_shell_rc)"
  if [ ! -f "$rc" ]; then touch "$rc"; fi
  local s="# >>> myco-kb PATH >>>"
  local e="# <<< myco-kb PATH <<<"
  if ! grep -q "$s" "$rc" 2>/dev/null; then
    {
      echo ""
      echo "$s"
      echo "export PATH=\"$bin_dir:\$PATH\"   # added by install-release.sh"
      echo "$e"
    } >> "$rc"
    echo "✓ 已生成 myco 命令：$launcher"
    echo "✓ 已把 $bin_dir 加入 PATH（写入 $rc；新 shell 或 source 后生效）"
  else
    echo "✓ 已生成 myco 命令：$launcher"
    echo "  （$rc 已含 MyCo-KB PATH 标记，跳过重复写入）"
  fi
}

do_install() {
  local TARBALL="$1"
  if [ ! -f "$TARBALL" ]; then
    echo "✗ tarball 不存在：$TARBALL" >&2
    exit 1
  fi
  if ! node_version_ok; then
    echo "✗ Node 版本过低（$(node -v)）。MyCo-KB 更新流需要 node:sqlite，要求 Node >= 23（推荐 24）。" >&2
    exit 1
  fi
  local VERSION
  VERSION="$(read_tarball_version "$TARBALL")"
  if [ -z "$VERSION" ]; then
    echo "✗ 无法从 tarball 读取 package/package.json（版本）。" >&2
    exit 1
  fi
  if ! tar -tzf "$TARBALL" | grep -q "^package/cordis.patch.yml$"; then
    echo "✗ tarball 缺 cordis.patch.yml（插件 bundle 入口）。请确认制品来自 build-release.sh。" >&2
    exit 1
  fi

  VER_HOME="$PROFILE/node_modules/@dsh/.myco-kb-versions"
  mkdir -p "$(dirname "$DEST")" "$VER_HOME"

  local PREV
  PREV="$(current_version)"

  backup_pkgjson

  # 解包到临时目录再放入版本目录（避免残留）
  local TMP_INSTALL
  TMP_INSTALL="$(mktemp -d)"
  trap 'rm -rf "$TMP_INSTALL"' EXIT
  tar -xzf "$TARBALL" -C "$TMP_INSTALL"
  rm -rf "$VER_HOME/$VERSION"
  cp -R "$TMP_INSTALL/package/." "$VER_HOME/$VERSION/"
  rm -rf "$TMP_INSTALL"
  trap - EXIT

  # 切换符号链接（$DEST 已是旧版本或刚删掉，rm -f 只清理符号链接/文件）
  rm -f "$DEST"
  ln -s "$VER_HOME/$VERSION" "$DEST"

  # 记录活动 / 上一个版本
  echo "$VERSION" > "$VER_HOME/.active"
  if [ -n "$PREV" ] && [ "$PREV" != "$VERSION" ]; then
    echo "$PREV" > "$VER_HOME/.previous"
  fi

  ensure_dep_and_bundle
  wire_cli

  echo
  echo "✅ 已安装 MyCo-KB $VERSION -> $DEST"
  echo "   上一个版本：${PREV:-（无）}；回滚：bash scripts/install-release.sh rollback"
  echo "   重启 Harness 后生效。首次使用建议："
  echo "     myco init        # 创建 ~/.myco-kb 默认知识库并挂载"
  echo "     myco install-skills"
  echo "     myco cloud add shared <url> --sync   # 订阅团队共享云端包"
}

do_rollback() {
  VER_HOME="$PROFILE/node_modules/@dsh/.myco-kb-versions"
  if [ ! -f "$VER_HOME/.previous" ]; then
    echo "✗ 无上一个版本可回滚。首次安装或回滚记录中无可用上一版本。" >&2
    exit 1
  fi
  local PREV
  PREV="$(cat "$VER_HOME/.previous")"
  if [ ! -d "$VER_HOME/$PREV" ]; then
    echo "✗ 回滚版本目录丢失：$VER_HOME/$PREV" >&2
    exit 1
  fi
  # 恢复 package.json 备份（若安装时做过）
  local LATEST_BAK
  LATEST_BAK="$(ls -t "$PROFILE"/package.json.bak-* 2>/dev/null | head -1 || true)"
  if [ -n "$LATEST_BAK" ]; then
    cp "$LATEST_BAK" "$PROFILE/package.json"
    echo "✓ 已恢复 package.json（来自 $LATEST_BAK）"
  fi
  rm -f "$DEST"
  ln -s "$VER_HOME/$PREV" "$DEST"
  echo "$PREV" > "$VER_HOME/.active"
  wire_cli
  echo "✅ 已回滚到 MyCo-KB $PREV -> $DEST"
  echo "   重启 Harness 后生效。"
}

do_list() {
  VER_HOME="$PROFILE/node_modules/@dsh/.myco-kb-versions"
  if [ ! -d "$VER_HOME" ]; then
    echo "（尚未安装任何版本）$DEST"
    return 0
  fi
  local ACTIVE
  ACTIVE="$(cat "$VER_HOME/.active" 2>/dev/null || echo '-')"
  echo "安装在：$DEST（当前活动版本：$ACTIVE）"
  shopt -s nullglob
  for d in "$VER_HOME"/*/; do
    local v; v="$(basename "$d")"
    local mark=" "
    [ "$v" = "$ACTIVE" ] && mark="*"
    echo "  $mark $v"
  done
}

# git 依赖安装（供 DSH 插件管理在线更新）：
# 把依赖写成 github:xiaohaoxing/myco-kb#<ref>，DSH 会将其识别为「可从 git 更新的插件」，
# 仓库打新 tag（如 v0.7.0）后，插件管理页会出现「更新」按钮，点一下即在线更新到新 tag。
do_git_install() {
  local ref="$1"
  if [ -z "$ref" ]; then
    echo "✗ 用法: install-release.sh git <ref>（如 v0.6.0 / main / <commit>）" >&2
    exit 1
  fi
  if [ ! -f "$PROFILE/package.json" ]; then
    echo "✗ profile 没有 package.json：$PROFILE" >&2
    exit 1
  fi
  local dep="github:xiaohaoxing/myco-kb#${ref}"
  python3 - "$PROFILE/package.json" "$dep" <<'PYJSON'
import json, sys
pkg_path, dep = sys.argv[1], sys.argv[2]
with open(pkg_path, encoding='utf8') as f:
    pkg = json.load(f)
deps = pkg.setdefault('dependencies', {})
deps['@dsh/myco-kb'] = dep
bundles = pkg.setdefault('dsh', {}).setdefault('profile', {}).setdefault('bundles', [])
if '@dsh/myco-kb' not in bundles:
    bundles.append('@dsh/myco-kb')
with open(pkg_path, 'w', encoding='utf8') as f:
    json.dump(pkg, f, ensure_ascii=False, indent=2)
    f.write('\n')
print('✓ 已写入依赖 @dsh/myco-kb -> ' + dep)
PYJSON
  echo
  echo "✅ 已切换为 git 依赖（DSH 插件管理可在线更新）：@dsh/myco-kb -> github:xiaohaoxing/myco-kb#${ref}"
  echo "   说明：DSH 会把该插件识别为「可从 git 更新的插件」。"
  echo "   下一步："
  echo "     1) 重启 DeepSeek Harness（DSH 解析 git 依赖并装载插件）；"
  echo "     2) 之后仓库打新 tag（如 v0.7.0）并发布，插件管理页会出现「更新」，点一下即在线更新。"
  echo "   （可选）不重启立即解析：进入 ${PROFILE} 执行 pnpm install"
}

CMD="${1:-help}"

case "$CMD" in
  install)
    if [ $# -lt 2 ]; then usage; fi
    PROFILE="$(read_profile "${3:-$DEFAULT_PROFILE}")"
    DEST="$PROFILE/node_modules/@dsh/myco-kb"
    do_install "$2"
    ;;
  git)
    PROFILE="$(read_profile "${3:-$DEFAULT_PROFILE}")"
    DEST="$PROFILE/node_modules/@dsh/myco-kb"
    do_git_install "$2"
    ;;
  rollback)
    PROFILE="$(read_profile "${2:-$DEFAULT_PROFILE}")"
    DEST="$PROFILE/node_modules/@dsh/myco-kb"
    do_rollback
    ;;
  list)
    PROFILE="$(read_profile "${2:-$DEFAULT_PROFILE}")"
    DEST="$PROFILE/node_modules/@dsh/myco-kb"
    do_list
    ;;
  *)
    usage
    ;;
esac
