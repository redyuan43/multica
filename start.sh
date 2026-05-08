#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PNPM_VERSION="10.28.2"
GO_VERSION="1.26.1"
LOCAL_GO_DIR="$ROOT_DIR/.tools/go"
START_ENV_FILE="$ROOT_DIR/.env.start"
DEFAULT_FRONTEND_PORT="4000"
START_BACKEND_PORT=""
START_FRONTEND_PORT=""

fail() {
  echo ""
  echo "✗ $*" >&2
  exit 1
}

info() {
  echo "==> $*"
}

try_load_nvm() {
  if command -v node >/dev/null 2>&1; then
    return
  fi

  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # Load nvm for terminals where shell startup files are not sourced.
    # shellcheck disable=SC1091
    . "$HOME/.nvm/nvm.sh"
  fi
}

ensure_command() {
  local name="$1"
  local hint="$2"

  if ! command -v "$name" >/dev/null 2>&1; then
    fail "缺少依赖：$name
$hint"
  fi
}

ensure_node() {
  try_load_nvm
  ensure_command "node" "请安装 Node.js v20+ 后重试。"

  if ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" >/dev/null 2>&1; then
    fail "Node.js 版本过低：$(node -v)。请升级到 v20+。"
  fi
}

ensure_local_go() {
  if [ -x "$LOCAL_GO_DIR/bin/go" ]; then
    export PATH="$LOCAL_GO_DIR/bin:$PATH"
    return
  fi

  ensure_command "curl" "请安装 curl，或手动安装 Go v1.26+ 后重试。"
  ensure_command "tar" "请安装 tar，或手动安装 Go v1.26+ 后重试。"

  local os
  local arch
  local archive
  local url
  local download_dir

  case "$(uname -s)" in
    Linux) os="linux" ;;
    Darwin) os="darwin" ;;
    *) fail "当前系统暂不支持自动安装 Go：$(uname -s)。请手动安装 Go v1.26+ 后重试。" ;;
  esac

  case "$(uname -m)" in
    x86_64|amd64) arch="amd64" ;;
    arm64|aarch64) arch="arm64" ;;
    *) fail "当前 CPU 架构暂不支持自动安装 Go：$(uname -m)。请手动安装 Go v1.26+ 后重试。" ;;
  esac

  archive="go${GO_VERSION}.${os}-${arch}.tar.gz"
  url="https://go.dev/dl/${archive}"
  download_dir="$ROOT_DIR/.tools/go-download-$$"

  info "未找到 Go，正在下载本地 Go ${GO_VERSION} 到 .tools/..."
  mkdir -p "$download_dir"
  curl -fL "$url" -o "$download_dir/$archive"
  tar -C "$download_dir" -xzf "$download_dir/$archive"
  mkdir -p "$ROOT_DIR/.tools"

  if [ -e "$LOCAL_GO_DIR" ]; then
    fail "$LOCAL_GO_DIR 已存在但不可用。请移走该目录后重新运行 ./start.sh。"
  fi

  mv "$download_dir/go" "$LOCAL_GO_DIR"
  export PATH="$LOCAL_GO_DIR/bin:$PATH"
}

ensure_go() {
  if ! command -v go >/dev/null 2>&1; then
    ensure_local_go
  fi

  if ! go version | awk '{print $3}' | sed 's/^go//' | awk -F. '{ exit !($1 > 1 || ($1 == 1 && $2 >= 26)) }'; then
    fail "Go 版本过低：$(go version)。请升级到 v1.26+ 后重试。"
  fi
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return
  fi

  ensure_command "corepack" "当前 Node.js 没有可用的 corepack。请安装 pnpm ${PNPM_VERSION} 后重试。"

  info "未找到 pnpm，正在通过 corepack 启用 pnpm ${PNPM_VERSION}..."
  corepack enable
  corepack prepare "pnpm@${PNPM_VERSION}" --activate
  hash -r

  ensure_command "pnpm" "corepack 未能启用 pnpm。请手动安装 pnpm ${PNPM_VERSION} 后重试。"
}

ensure_docker() {
  ensure_command "docker" "请安装 Docker，并确保 Docker daemon 已启动。"

  if ! docker info >/dev/null 2>&1; then
    fail "Docker daemon 当前不可用。请启动 Docker，或确认当前用户有权限访问 Docker。"
  fi
}

base_env_file() {
  if [ -f "$ROOT_DIR/.git" ]; then
    echo "$ROOT_DIR/.env.worktree"
  else
    echo "$ROOT_DIR/.env"
  fi
}

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"

  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

port_in_use() {
  local port="$1"
  (echo >"/dev/tcp/127.0.0.1/${port}") >/dev/null 2>&1
}

find_free_port() {
  local port="$1"

  while port_in_use "$port"; do
    port=$((port + 1))
  done

  echo "$port"
}

describe_port_owner() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
    return
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$port" 2>/dev/null || true
  fi
}

prepare_start_env() {
  local source_env
  local frontend_port
  local backend_port
  local requested_backend_port

  source_env="$(base_env_file)"

  if [ ! -f "$source_env" ]; then
    info "未找到 $(basename "$source_env")，从 .env.example 创建..."
    cp "$ROOT_DIR/.env.example" "$source_env"
  fi

  cp "$source_env" "$START_ENV_FILE"

  # shellcheck disable=SC1090
  . "$START_ENV_FILE"

  frontend_port="${FRONTEND_PORT_OVERRIDE:-$DEFAULT_FRONTEND_PORT}"
  requested_backend_port="${PORT:-8080}"
  backend_port="$(find_free_port "$requested_backend_port")"

  if port_in_use "$frontend_port"; then
    echo ""
    echo "端口 ${frontend_port} 已被占用："
    describe_port_owner "$frontend_port"
    fail "前端已指定使用 ${frontend_port}，请先释放该端口后重新运行 ./start.sh。"
  fi

  if [ "$backend_port" != "$requested_backend_port" ]; then
    info "后端端口 ${requested_backend_port} 已被占用，改用 ${backend_port}。"
  fi

  set_env_value "$START_ENV_FILE" "PORT" "$backend_port"
  set_env_value "$START_ENV_FILE" "FRONTEND_PORT" "$frontend_port"
  set_env_value "$START_ENV_FILE" "FRONTEND_ORIGIN" "http://localhost:${frontend_port}"
  set_env_value "$START_ENV_FILE" "CORS_ALLOWED_ORIGINS" "http://localhost:${frontend_port}"
  set_env_value "$START_ENV_FILE" "ALLOWED_ORIGINS" "http://localhost:${frontend_port}"
  set_env_value "$START_ENV_FILE" "MULTICA_APP_URL" "http://localhost:${frontend_port}"
  set_env_value "$START_ENV_FILE" "GOOGLE_REDIRECT_URI" "http://localhost:${frontend_port}/auth/callback"
  set_env_value "$START_ENV_FILE" "NEXT_PUBLIC_API_URL" "http://localhost:${backend_port}"
  set_env_value "$START_ENV_FILE" "NEXT_PUBLIC_WS_URL" "ws://localhost:${backend_port}/ws"
  set_env_value "$START_ENV_FILE" "MULTICA_SERVER_URL" "http://localhost:${backend_port}"

  START_BACKEND_PORT="$backend_port"
  START_FRONTEND_PORT="$frontend_port"

  info "启动配置：前端 http://localhost:${frontend_port}，后端 http://localhost:${backend_port}"
}

wait_for_backend() {
  local url="http://localhost:${START_BACKEND_PORT}/health"
  local attempt

  info "等待后端就绪..."
  for attempt in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  return 1
}

configure_local_daemon_profile() {
  local token_file="$HOME/.multica/local-daemons.pat"
  local profile_dir="$HOME/.multica/profiles/local"
  local workspace_id
  local token

  if [ ! -f "$token_file" ]; then
    info "未找到本地 daemon token，跳过 daemon 自动启动。登录后可运行：make daemon"
    return 0
  fi

  ensure_command "jq" "请安装 jq，或登录后手动运行 make daemon。"

  workspace_id="$(
    docker compose exec -T postgres psql -U "${POSTGRES_USER:-multica}" -d "${POSTGRES_DB:-multica}" -At \
      -c "SELECT id FROM workspace ORDER BY created_at LIMIT 1;" 2>/dev/null | head -n 1
  )"

  if [ -z "$workspace_id" ]; then
    info "当前数据库还没有 workspace，跳过 daemon 自动启动。登录并创建 workspace 后可运行：make daemon"
    return 0
  fi

  token="$(tr -d '\n' < "$token_file")"
  mkdir -p "$profile_dir"
  umask 077
  jq -n \
    --arg server "http://localhost:${START_BACKEND_PORT}" \
    --arg app "http://localhost:${START_FRONTEND_PORT}" \
    --arg ws "$workspace_id" \
    --arg token "$token" \
    '{server_url:$server, app_url:$app, workspace_id:$ws, token:$token}' \
    > "$profile_dir/config.json"
}

start_local_daemon() {
  configure_local_daemon_profile

  if [ ! -f "$HOME/.multica/profiles/local/config.json" ]; then
    return 0
  fi

  info "启动本地 agent daemon..."
  (cd "$ROOT_DIR/server" && go run ./cmd/multica daemon restart --profile local)
}

main() {
  info "检查本地开发依赖..."
  ensure_node
  ensure_pnpm
  ensure_go
  ensure_docker
  ensure_command "make" "请安装 make 后重试。"
  ensure_command "curl" "请安装 curl 后重试。"

  prepare_start_env

  info "依赖检查通过，开始启动 Multica..."
  make setup ENV_FILE="$START_ENV_FILE"
  make start ENV_FILE="$START_ENV_FILE" &
  start_pid="$!"

  trap 'kill "$start_pid" 2>/dev/null || true' EXIT INT TERM

  wait_for_backend || fail "后端未能在 60 秒内就绪，请查看上方日志。"
  start_local_daemon

  wait "$start_pid"
}

main "$@"
