#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$REPO_ROOT/web-viewer"
PORT="${PORT:-4317}"
OPEN_BROWSER=0
SKIP_INSTALL=0

usage() {
  cat <<'EOF'
用法：scripts/start-local.sh [选项]

安装锁定依赖、构建 Web 查看端并在前台启动服务。

选项：
  --open          启动后打开浏览器
  --skip-install  跳过 npm ci（适合依赖未变化的重复启动）
  --port PORT     指定监听端口，默认 4317
  -h, --help      显示帮助
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --open) OPEN_BROWSER=1; shift ;;
    --skip-install) SKIP_INSTALL=1; shift ;;
    --port)
      [[ $# -ge 2 ]] || { printf '缺少 --port 的值\n' >&2; exit 2; }
      PORT="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) printf '未知参数：%s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ "$PORT" =~ ^[0-9]+$ ]] && (( PORT >= 1 && PORT <= 65535 )) || {
  printf '端口必须是 1-65535 的整数：%s\n' "$PORT" >&2
  exit 2
}

command -v node >/dev/null 2>&1 || { printf '未找到 Node.js，请先安装 Node.js 20 或更高版本。\n' >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { printf '未找到 npm。\n' >&2; exit 1; }
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
(( NODE_MAJOR >= 20 )) || { printf 'Node.js 版本过低，要求 >=20，当前：%s\n' "$(node --version)" >&2; exit 1; }

cd "$APP_DIR"
if (( SKIP_INSTALL == 0 )); then
  npm ci
elif [[ ! -x node_modules/.bin/tsx ]]; then
  printf 'node_modules 不存在或不完整，不能使用 --skip-install。\n' >&2
  exit 1
fi
npm run build

printf 'my-wiki Web 查看端即将启动：http://127.0.0.1:%s\n' "$PORT"
if (( OPEN_BROWSER == 1 )); then
  exec env PORT="$PORT" npm start
else
  exec env PORT="$PORT" npm run start:server
fi
