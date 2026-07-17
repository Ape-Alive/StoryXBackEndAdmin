#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/storyx-admin}"
RELEASE_DIR="${DEPLOY_PATH}/release"
BACKEND_DIR="${DEPLOY_PATH}/backend"
FRONTEND_DIR="${DEPLOY_PATH}/frontend"
PM2_APP_NAME="${PM2_APP_NAME:-storyx-admin-api}"

echo "==> Deploy path: ${DEPLOY_PATH}"

if [[ ! -d "${RELEASE_DIR}/backend" || ! -d "${RELEASE_DIR}/frontend/dist" ]]; then
  echo "Release package incomplete under ${RELEASE_DIR}"
  exit 1
fi

if [[ ! -f "${BACKEND_DIR}/.env" && ! -f "${RELEASE_DIR}/backend/.env" ]]; then
  if [[ -f "${DEPLOY_PATH}/.env" ]]; then
    mkdir -p "${BACKEND_DIR}"
    cp "${DEPLOY_PATH}/.env" "${BACKEND_DIR}/.env"
  else
    echo "Missing backend .env. Create ${BACKEND_DIR}/.env on the server first."
    exit 1
  fi
fi

echo "==> Sync backend code (preserve .env / uploads / logs)"
mkdir -p "${BACKEND_DIR}"
rsync -a \
  --delete \
  --exclude .env \
  --exclude node_modules \
  --exclude uploads \
  --exclude logs \
  "${RELEASE_DIR}/backend/" "${BACKEND_DIR}/"

if [[ ! -f "${BACKEND_DIR}/.env" && -f "${DEPLOY_PATH}/.env" ]]; then
  cp "${DEPLOY_PATH}/.env" "${BACKEND_DIR}/.env"
fi

echo "==> Sync frontend dist"
mkdir -p "${FRONTEND_DIR}"
rsync -a --delete "${RELEASE_DIR}/frontend/dist/" "${FRONTEND_DIR}/dist/"

echo "==> Install backend dependencies"
cd "${BACKEND_DIR}"
npm ci --omit=dev

echo "==> Prisma generate & migrate"
npx prisma generate
npx prisma migrate deploy

echo "==> Reload PM2 process"
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
