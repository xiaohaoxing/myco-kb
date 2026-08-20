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

# 2. 在 profile package.json 声明依赖（幂等；用 python3 改 JSON，node 26 已不支持 `node -` stdin）
if [ -f "$PROFILE/package.json" ]; then
  python3 - "$PROFILE/package.json" "$NAME" <<'PYJSON'
import json, sys
pkg_path, name = sys.argv[1], sys.argv[2]
with open(pkg_path, encoding='utf8') as f:
    pkg = json.load(f)
deps = pkg.setdefault('dependencies', {})
value = 'file:./node_modules/@dsh/myco-kb'
if deps.get(name) != value:
    deps[name] = value
    with open(pkg_path, 'w', encoding='utf8') as f:
        json.dump(pkg, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'已在 {pkg_path} 声明依赖 {name}')
else:
    print(f'{name} 已在 package.json 中，跳过')
PYJSON
else
  echo "警告：profile 没有 package.json，已跳过依赖声明（请手动添加 ${NAME} 依赖）" >&2
fi

# 3. 在 cordis.patch.yml 写入插件补丁（幂等；id 与 name 都必须有 —— loader 用 name import）
PATCH="$PROFILE/cordis.patch.yml"
PATCH_BLOCK="
# MyCo-KB 插件（由 install-profile.sh 添加）：知识库管理控制台 + 静默后台守护。
- insert:
    - id: '@dsh/myco-kb'
      name: '@dsh/myco-kb'
      config:
        maintenanceIntervalHours: 6"

if [ -f "$PATCH" ] && grep -q "@dsh/myco-kb" "$PATCH"; then
  echo "${NAME} 已在 cordis.patch.yml 中，跳过"
elif [ -f "$PATCH" ] && [ "$(grep -c '^-' "$PATCH")" -gt 0 ]; then
  echo "cordis.patch.yml 已有其他条目，请手动把以下补丁追加到文件末尾：" >&2
  echo "$PATCH_BLOCK" >&2
else
  printf '%s\n' "$PATCH_BLOCK" >> "$PATCH"
  echo "已写入 $PATCH"
fi

echo
echo "✅ 安装完成。重启 Harness 后生效（插件管理页 Plugins 设置区出现 MyCo-KB 控制台 tab）。"
echo "   若启动崩溃报 'undefined.startsWith'：确认 cordis.patch.yml 的条目同时有 id 和 name。"
