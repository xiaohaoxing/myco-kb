#!/usr/bin/env bash
# 本地开发依赖：把 DSH 安装目录的 @deepseek-ai 包符号链接进本仓库 node_modules，
# 使 lib/index.js / lib/remote.js / 测试能以真实 Cordis / dsh-tools / typert 运行。
# 用法：scripts/dev-links.sh [DSH 应用目录]
set -euo pipefail

DSH_APP="${1:-/Applications/DSH Desktop.app/Contents/Resources/app}"
SRC="$DSH_APP/node_modules/@deepseek-ai"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -d "$SRC" ]; then
  echo "找不到 DSH 依赖目录: $SRC" >&2
  echo "用法: scripts/dev-links.sh [DSH 应用目录]" >&2
  exit 1
fi

mkdir -p "$REPO/node_modules"
ln -sfn "$SRC" "$REPO/node_modules/@deepseek-ai"
echo "已链接 $REPO/node_modules/@deepseek-ai → $SRC"
