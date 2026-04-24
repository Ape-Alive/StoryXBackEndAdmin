#!/usr/bin/env bash
set -euo pipefail

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-rootpassword}"
MYSQL_DB="${MYSQL_DB:-storyx_admin}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_FILE="$(ls -t "$SCRIPT_DIR"/*.sql | head -n 1)"

if [[ -z "${SQL_FILE:-}" ]]; then
  echo "No .sql file found in $SCRIPT_DIR"
  exit 1
fi

echo "Using SQL file: $SQL_FILE"
echo "Target DB: $MYSQL_USER@$MYSQL_HOST:$MYSQL_PORT/$MYSQL_DB"

mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" \
  -e "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DB" < "$SQL_FILE"

echo "Import done."

