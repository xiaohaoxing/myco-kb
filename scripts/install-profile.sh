#!/usr/bin/env bash
# 把 MyCo-KB 安装进 DSH 的 Cordis profile（~/.dsh/profiles/web），
# 让 Harness 启动时自动加载并静默运行知识库守护。
#
# 注意：这会修改正在运行的 Harness 的 profile（node_modules 符号链接 +
# package.json 依赖声明），建议 Harness 重启后生效；操作前可先备份
# ~/.dsh/profiles/web/package.json。
#
# 用法：scripts/install-profile.sh [profile 目录]
set -euo pipefail

PROFILE="${1:-$HOME/.dsh/profiles/web}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
NAME="@dsh/myco-kb"

if [ ! -d "$PROFILE" ]; then
  echo "profile 不存在: $PROFILE" >&2
  exit 1
fi

# 1. 符号链接插件本体进 profile 的 node_modules
mkdir -p "$PROFILE/node_modules/@dsh"
ln -sfn "$REPO" "$PROFILE/node_modules/@dsh/myco-kb"

# 2. 在 profile package.json 声明依赖（幂等）
if [ -f "$PROFILE/package.json" ]; then
  node - "$PROFILE/package.json" "$NAME" <<'NODE'
const [pkgPath, name] = process.argv.slice(1)
const fs = require('fs')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const deps = (pkg.dependencies ??= {})
if (deps[name] !== 'file:./node_modules/@dsh/myco-kb') {
  deps[name] = 'file:./node_modules/@dsh/myco-kb'
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  console.log(`已在 ${pkgPath} 声明依赖 ${name}`)
} else {
  console.log(`${name} 已在 package.json 中，跳过`)
}
NODE
else
  echo "警告：profile 没有 package.json，已跳过依赖声明（请手动添加 ${NAME} 依赖）" >&2
fi

echo
echo "已安装符号链接。下一步（二选一）："
echo "  1) 在 ~/.dsh/profiles/web/cordis.yml 的 plugins 列表中加入 ${NAME}（推荐，显式配置）"
echo "  2) 如果 profile 支持自动发现，重启 Harness 后插件会自动加载"
echo "重启 Harness 后，插件管理页的 Plugins 设置区会出现 MyCo-KB 控制台 tab。"
