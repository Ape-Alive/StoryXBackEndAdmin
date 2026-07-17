#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/storyx-admin}"
RELEASE_DIR="${DEPLOY_PATH}/release"
BACKEND_DIR="${DEPLOY_PATH}/backend"
FRONTEND_DIR="${DEPLOY_PATH}/frontend"
PM2_APP_NAME="${PM2_APP_NAME:-storyx-admin-api}"

# 非交互 SSH 不会加载交互式 shell 的 PATH；补上宝塔 / nvm / 常见路径
setup_node_path() {
  # 交互登录时用户自己配过的环境
  if [[ -f "${HOME}/.bashrc" ]]; then
    # shellcheck disable=SC1090
    source "${HOME}/.bashrc" >/dev/null 2>&1 || true
  fi
  if [[ -f "${HOME}/.profile" ]]; then
    # shellcheck disable=SC1090
    source "${HOME}/.profile" >/dev/null 2>&1 || true
  fi

  # nvm
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
    # shellcheck disable=SC1090
    source "${NVM_DIR}/nvm.sh"
  fi

  # 宝塔 Node 版本管理器：/www/server/nodejs/vxx.x.x/bin
  if [[ -d /www/server/nodejs ]]; then
    local latest_bin
    latest_bin="$(ls -d /www/server/nodejs/v*/bin 2>/dev/null | sort -V | tail -n1 || true)"
    if [[ -n "${latest_bin}" ]]; then
      export PATH="${latest_bin}:${PATH}"
    fi
  fi

  # 常见全局路径
  export PATH="/usr/local/bin:/usr/bin:${PATH}"
}

setup_node_path

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm not found in PATH for non-interactive SSH."
  echo "Current PATH=${PATH}"
  echo "Fix: on server as root, symlink or add to /home/deploy/.bashrc, e.g."
  echo "  echo 'export PATH=/www/server/nodejs/v22.23.1/bin:\$PATH' >> /home/deploy/.bashrc"
  exit 127
fi

echo "==> Using node=$(command -v node) ($(node -v)), npm=$(command -v npm)"
echo "==> Deploy path: ${DEPLOY_PATH}"

if [[ ! -d "${RELEASE_DIR}/backend" || ! -d "${RELEASE_DIR}/frontend/dist" ]]; then
  echo "Release package incomplete under ${RELEASE_DIR}"
  exit 1
fi

mkdir -p "${BACKEND_DIR}" "${FRONTEND_DIR}/dist"

if [[ ! -w "${BACKEND_DIR}" ]]; then
  echo "ERROR: ${BACKEND_DIR} is not writable by $(whoami)."
  echo "On server as root run:"
  echo "  chown -R deploy:deploy ${DEPLOY_PATH}"
  exit 1
fi

if [[ ! -f "${BACKEND_DIR}/.env" && ! -f "${RELEASE_DIR}/backend/.env" ]]; then
  if [[ -f "${DEPLOY_PATH}/.env" ]]; then
    cp "${DEPLOY_PATH}/.env" "${BACKEND_DIR}/.env"
  else
    echo "Missing backend .env. Create ${BACKEND_DIR}/.env on the server first."
    exit 1
  fi
fi

# -a 会尝试改 owner/group；deploy 用户通常无权限，改为不保留属主
RSYNC_OPTS=(-a --no-owner --no-group --delete)

echo "==> Sync backend code (preserve .env / uploads / logs)"
rsync "${RSYNC_OPTS[@]}" \
  --exclude .env \
  --exclude node_modules \
  --exclude uploads \
  --exclude logs \
  --exclude 'storyx-admin_start.sh' \
  "${RELEASE_DIR}/backend/" "${BACKEND_DIR}/"

if [[ ! -f "${BACKEND_DIR}/.env" && -f "${DEPLOY_PATH}/.env" ]]; then
  cp "${DEPLOY_PATH}/.env" "${BACKEND_DIR}/.env"
fi

echo "==> Sync frontend dist"
rsync "${RSYNC_OPTS[@]}" "${RELEASE_DIR}/frontend/dist/" "${FRONTEND_DIR}/dist/"

echo "==> Install backend dependencies"
cd "${BACKEND_DIR}"
npm ci --omit=dev

echo "==> Prisma generate & migrate"
npx prisma generate
npx prisma migrate deploy

echo "==> Reload PM2 process"
if ! command -v pm2 >/dev/null 2>&1; then
  echo "ERROR: pm2 not found. Install with: npm install -g pm2"
  exit 127
fi

if pm2 describe "${PM2_APP_NAME}" >/dev/null 2>&1; then
  pm2 reload "${PM2_APP_NAME}" --update-env
else
  pm2 start server.js --name "${PM2_APP_NAME}" --cwd "${BACKEND_DIR}"
fi
pm2 save

echo "==> Health check"
APP_PORT=5800
if [[ -f "${BACKEND_DIR}/.env" ]]; then
  APP_PORT="$(grep -E '^PORT=' "${BACKEND_DIR}/.env" | tail -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
  APP_PORT="${APP_PORT:-5800}"
fi
sleep 2
if curl -fsS "http://127.0.0.1:${APP_PORT}/health" >/dev/null; then
  echo "Health check passed"
else
  echo "Warning: health check failed (service may still be starting)"
fi

echo "==> Deploy finished"
