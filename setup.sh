#!/usr/bin/env bash
set -euo pipefail

# CourtPulse initial server setup script
# - Configures Redis to 100 MB (allkeys-lru)
# - Installs dependencies and initializes SQLite schema
# - Seeds ALL data from Neon Postgres (SOURCE_DATABASE_URL & SOURCE_ANALYTICS_DATABASE_URL)
# - Builds Next.js for production
# - Creates fresh PM2 instance "courtpulse" bound to 127.0.0.1:3012 (behind Nginx)

APP_NAME="courtpulse"
APP_PORT="3012"
REDIS_MAX_BYTES="104857600" # 100 MB
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log() {
  printf "\n[%s] %s\n" "$APP_NAME setup" "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' is not installed or not on PATH." >&2
    exit 1
  fi
}

require_cmd node
require_cmd pnpm
require_cmd pm2

if [ ! -f ".env" ]; then
  echo "Error: .env file not found in $SCRIPT_DIR. Create .env with SOURCE_DATABASE_URL, AUTH_SECRET, and SMTP settings first." >&2
  exit 1
fi

# Ensure production env defaults exist without overwriting user values
ensure_env_var() {
  local key="$1"
  local val="$2"
  if ! grep -qE "^${key}=" .env; then
    printf "%s=\"%s\"\n" "$key" "$val" >> .env
  fi
}

ensure_env_var "NODE_ENV" "production"
ensure_env_var "PORT" "$APP_PORT"
ensure_env_var "SQLITE_DB_PATH" "./data/courtpulse.db"
ensure_env_var "REDIS_URL" "redis://127.0.0.1:6379"
ensure_env_var "AUTH_TRUST_HOST" "true"

set -a
# shellcheck disable=SC1091
source .env
set +a

if [ -z "${SOURCE_DATABASE_URL:-}" ]; then
  echo "Error: SOURCE_DATABASE_URL is missing in .env; cannot seed from Neon." >&2
  exit 1
fi

log "Configuring Redis memory cap (100 MB / allkeys-lru)..."
for conf in /etc/redis/redis.conf /etc/redis.conf; do
  if [ -f "$conf" ] && [ -w "$conf" ]; then
    sed -i -E '/^#?\s*maxmemory\s+/d; /^#?\s*maxmemory-policy\s+/d' "$conf"
    printf "\nmaxmemory 100mb\nmaxmemory-policy allkeys-lru\n" >> "$conf"
    log "Updated $conf with maxmemory 100mb and allkeys-lru."
  fi
done
if command -v redis-cli >/dev/null 2>&1; then
  if redis-cli ping >/dev/null 2>&1; then
    redis-cli CONFIG SET maxmemory "$REDIS_MAX_BYTES" >/dev/null
    redis-cli CONFIG SET maxmemory-policy allkeys-lru >/dev/null
    redis-cli CONFIG REWRITE >/dev/null 2>&1 || true
    log "Redis live memory limit applied: $(redis-cli CONFIG GET maxmemory | tr '\n' ' ')"
  else
    echo "Warning: redis-cli is installed, but Redis server is not responding on 127.0.0.1:6379. App will fall back to 100 MB in-memory LRU cache until Redis starts." >&2
  fi
else
  echo "Warning: redis-cli not found; in-app 100 MB LRU cache fallback remains active." >&2
fi

log "Installing Node packages with pnpm..."
pnpm install --frozen-lockfile

mkdir -p data data/backups

log "Initializing SQLite schema..."
pnpm drizzle-kit push --force || npx drizzle-kit push --force
npx tsx -e "import { sqlite } from './database'; sqlite.pragma('wal_checkpoint(TRUNCATE)'); console.log('SQLite schema ready');"

log "Seeding entire dataset from Neon Postgres databases..."
pnpm db:import

# Run idempotent schema upgrades again after import so new tournament tokens/columns are populated
npx tsx -e "import { sqlite } from './database'; sqlite.pragma('wal_checkpoint(TRUNCATE)'); console.log('Post-seed upgrades verified');"

log "Building Next.js production bundle..."
pnpm build

log "Recreating PM2 process '$APP_NAME' on port $APP_PORT..."
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 stop "$APP_NAME" >/dev/null 2>&1 || true
  pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
fi

pm2 start ecosystem.config.cjs --only "$APP_NAME" --update-env
pm2 save --force

log "Waiting for http://127.0.0.1:${APP_PORT} health check..."
READY=0
for _ in $(seq 1 25); do
  if curl -fsS "http://127.0.0.1:${APP_PORT}/sign-in" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" -eq 1 ]; then
  log "Setup complete! '$APP_NAME' is live on http://127.0.0.1:${APP_PORT} (Nginx upstream)."
else
  echo "Warning: '$APP_NAME' started in PM2, but HTTP check on port $APP_PORT did not respond within 25s. Run 'pm2 logs $APP_NAME'." >&2
  exit 1
fi
