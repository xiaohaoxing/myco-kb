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

# 3. 标准 bundle 装载：把本包加进 profile 的 dsh.profile.bundles
#   （插件自带 cordis.patch.yml + package.json 的 dsh.bundle.patch 声明 entry；
#    loader 用 entry.name import，id 与 name 必须一致 —— 缺 name 会启动崩溃）
python3 - "$PROFILE/package.json" "$NAME" <<'PYBUNDLES'
import json, sys
pkg_path, name = sys.argv[1], sys.argv[2]
with open(pkg_path, encoding='utf8') as f:
    pkg = json.load(f)
bundles = pkg.setdefault('dsh', {}).setdefault('profile', {}).setdefault('bundles', [])
if name not in bundles:
    bundles.append(name)
    with open(pkg_path, 'w', encoding='utf8') as f:
        json.dump(pkg, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'✓ {name} 已加入 dsh.profile.bundles')
else:
    print(f'✓ {name} 已在 dsh.profile.bundles')
PYBUNDLES

echo
echo "✅ 安装完成（标准 bundle 装载）。重启 Harness 前建议先初始化默认知识库："
echo "   myco init    # 创建 ~/.myco-kb 默认知识库并挂载（新用户即用）"
echo "   也可手动挂载自己的 Obsidian 路径：myco mount repo:/path/to/your/vault"
echo
echo "重启 Harness 后："
echo "   - 插件管理页显示为 DSH 插件（不再显示「不是 DSH 插件」）"
echo "   - Plugins 设置区出现 MyCo-KB 控制台 tab"
echo "   - 若要覆盖插件默认配置：在 profile/cordis.patch.yml 用同名 id 写 config 覆盖（patch 叠加语义）"
