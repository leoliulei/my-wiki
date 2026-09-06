#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$REPO_ROOT/web-viewer"
LABEL="io.github.leoliulei.my-wiki"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs/my-wiki"
DOMAIN="gui/$(id -u)"
SERVICE="$DOMAIN/$LABEL"
PORT="${PORT:-4317}"
ACTION="${1:-status}"

[[ "$(uname -s)" == "Darwin" ]] || { printf '该脚本仅支持 macOS。\n' >&2; exit 1; }

usage() {
  cat <<'EOF'
用法：scripts/macos-service.sh <命令> [--port PORT]

使用 macOS launchd 管理 my-wiki 本地 Web 查看端。

命令：
  install    安装依赖、构建并注册登录自启服务
  start      启动已安装的服务
  stop       停止服务（保留安装和登录自启配置）
  restart    重启服务
  status     显示安装、进程和健康状态
  logs       持续查看服务日志（Ctrl-C 退出）
  uninstall  停止服务并删除 LaunchAgent 配置

选项：
  --port PORT  install 时设置端口，默认 4317
EOF
}

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
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

find_node() {
  local candidate
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null || true)"; do
    [[ -n "$candidate" && -x "$candidate" ]] || continue
    local major
    major="$($candidate -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || printf 0)"
    if (( major >= 20 )); then printf '%s\n' "$candidate"; return 0; fi
  done
  return 1
}

find_npm() {
  local node_path="$1" dir candidate
  dir="$(dirname "$node_path")"
  for candidate in "$dir/npm" "$(command -v npm 2>/dev/null || true)" /opt/homebrew/bin/npm /usr/local/bin/npm; do
    [[ -n "$candidate" && -x "$candidate" ]] && { printf '%s\n' "$candidate"; return 0; }
  done
  return 1
}

is_loaded() { launchctl print "$SERVICE" >/dev/null 2>&1; }
wait_for_unload() {
  local attempts=0
  while is_loaded && (( attempts < 20 )); do sleep 0.1; attempts=$((attempts + 1)); done
}
health_url() {
  if [[ -r "$PLIST" ]]; then
    /usr/libexec/PlistBuddy -c 'Print :EnvironmentVariables:PORT' "$PLIST" 2>/dev/null || printf '%s' "$PORT"
  else
    printf '%s' "$PORT"
  fi
}

install_service() {
  local node_path npm_path node_dir path_value escaped_repo escaped_app escaped_node escaped_log_out escaped_log_err
  node_path="$(find_node)" || { printf '未找到 Node.js 20 或更高版本。\n' >&2; exit 1; }
  npm_path="$(find_npm "$node_path")" || { printf '未找到 npm。\n' >&2; exit 1; }
  node_dir="$(dirname "$node_path")"

  printf '使用 Node.js：%s (%s)\n' "$node_path" "$($node_path --version)"
  cd "$APP_DIR"
  "$npm_path" ci
  "$npm_path" run build
  mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

  escaped_repo="$(printf '%s' "$REPO_ROOT" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')"
  escaped_app="$(printf '%s' "$APP_DIR" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')"
  escaped_node="$(printf '%s' "$node_path" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')"
  escaped_log_out="$(printf '%s' "$LOG_DIR/service.log" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')"
  escaped_log_err="$(printf '%s' "$LOG_DIR/service.error.log" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g')"
  path_value="$node_dir:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$escaped_node</string>
    <string>$escaped_app/node_modules/tsx/dist/cli.mjs</string>
    <string>$escaped_app/server/src/index.ts</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$escaped_app</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key><string>production</string>
    <key>PORT</key><string>$PORT</string>
    <key>PATH</key><string>$path_value</string>
    <key>MY_WIKI_ROOT</key><string>$escaped_repo</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict><key>SuccessfulExit</key><false/></dict>
  <key>ThrottleInterval</key>
  <integer>5</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>$escaped_log_out</string>
  <key>StandardErrorPath</key>
  <string>$escaped_log_err</string>
</dict>
</plist>
EOF
  plutil -lint "$PLIST" >/dev/null

  if is_loaded; then launchctl bootout "$SERVICE" >/dev/null; wait_for_unload; fi
  launchctl bootstrap "$DOMAIN" "$PLIST"
  launchctl enable "$SERVICE"
  launchctl kickstart -k "$SERVICE"
  local attempts=0
  until curl --silent --show-error --fail --max-time 1 "http://127.0.0.1:$PORT/api/bootstrap" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if (( attempts >= 150 )); then
      printf '服务已注册，但健康检查未在 30 秒内通过。请运行 scripts/macos-service.sh status 和 logs 排查。\n' >&2
      return 1
    fi
    sleep 0.2
  done
  printf '已安装并启动：%s\n' "$SERVICE"
  printf '访问地址：http://127.0.0.1:%s\n' "$PORT"
  printf '日志目录：%s\n' "$LOG_DIR"
}

start_service() {
  [[ -f "$PLIST" ]] || { printf '服务尚未安装，请先运行：scripts/macos-service.sh install\n' >&2; exit 1; }
  if ! is_loaded; then launchctl bootstrap "$DOMAIN" "$PLIST"; fi
  launchctl enable "$SERVICE"
  launchctl kickstart -k "$SERVICE"
  printf '服务已启动。\n'
}

stop_service() {
  if is_loaded; then
    launchctl bootout "$SERVICE"
    wait_for_unload
    printf '服务已停止。\n'
  else
    printf '服务当前未运行。\n'
  fi
}

status_service() {
  local current_port
  current_port="$(health_url)"
  if [[ -f "$PLIST" ]]; then printf '安装状态：已安装（%s）\n' "$PLIST"; else printf '安装状态：未安装\n'; fi
  if is_loaded; then
    printf 'launchd 状态：已加载\n'
    launchctl print "$SERVICE" | awk '/state =|pid =|last exit code =/{sub(/^[[:space:]]+/, ""); print "  " $0}'
  else
    printf 'launchd 状态：未加载\n'
  fi
  if curl --silent --show-error --fail --max-time 2 "http://127.0.0.1:$current_port/api/bootstrap" >/dev/null 2>&1; then
    printf '健康检查：正常（http://127.0.0.1:%s）\n' "$current_port"
  else
    printf '健康检查：不可用（http://127.0.0.1:%s）\n' "$current_port"
  fi
  printf '日志目录：%s\n' "$LOG_DIR"
}

case "$ACTION" in
  install) install_service ;;
  start) start_service ;;
  stop) stop_service ;;
  restart)
    if is_loaded; then launchctl kickstart -k "$SERVICE"; else start_service; fi
    printf '服务已重启。\n'
    ;;
  status) status_service ;;
  logs)
    mkdir -p "$LOG_DIR"; touch "$LOG_DIR/service.log" "$LOG_DIR/service.error.log"
    exec tail -n 100 -F "$LOG_DIR/service.log" "$LOG_DIR/service.error.log"
    ;;
  uninstall)
    stop_service
    rm -f "$PLIST"
    printf 'LaunchAgent 配置已删除；日志保留在 %s。\n' "$LOG_DIR"
    ;;
  -h|--help|help) usage ;;
  *) printf '未知命令：%s\n' "$ACTION" >&2; usage >&2; exit 2 ;;
esac
