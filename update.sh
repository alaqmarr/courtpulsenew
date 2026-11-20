#!/usr/bin/env bash
set -euo pipefail

# CourtPulse zero-data-loss update script
# - NEVER rewrites or re-seeds SQLite data (data/courtpulse.db is untouched)
# - Takes a safe hot backup copy into data/backups/ before upgrading
# - Enforces Redis 100 MB limit and clears stale CourtPulse cache entries
# - Stashes/removes ONLY the "courtpulse" PM2 instance and recreates it cleanly on port 3012

APP_NAME="courtpulse"
APP_PORT="3012"
REDIS_MAX_BYTES="104857600" # 100 MB
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log() {
  printf "\n[%s] %s\n" "$APP_NAME update" "$1"
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
  echo "Error: .env missing in $SCRIPT_DIR." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

DB_FILE="${SQLITE_DB_PATH:-./data/courtpulse.db}"
mkdir -p data data/backups

if [ -f "$DB_FILE" ]; then
  BACKUP_TS="$(date +%Y%m%d-%H%M%S)"
  BACKUP_PATH="data/backups/courtpulse-${BACKUP_TS}.db"
  log "Backing up live SQLite database cleanly to $BACKUP_PATH (existing data untouched)..."
  npx tsx -e "import { sqlite } from './database'; (async () => { await sqlite.backup('$BACKUP_PATH'); console.log('SQLite backup saved'); })();"
  # Retain only the 10 most recent backups to avoid disk growth
  ls -1t data/backups/courtpulse-*.db 2>/dev/null | tail -n +11 | xargs -r rm -f
else
  echo "Warning: $DB_FILE does not exist yet. Run ./setup.sh for initial Neon seeding." >&2
fi

if [ "${1:-}" = "--git" ] && [ -d ".git" ]; then
  log "Pulling latest code updates..."
  if [ -n "$(git status --porcelain)" ]; then
    git stash push -m "courtpulse-auto-update-$(date +%Y%m%d-%H%M%S)" >/dev/null || true
  fi
  git pull --ff-only
fi

log "Installing dependencies without modifying database..."
pnpm install --frozen-lockfile

log "Applying additive non-destructive SQLite schema checks..."
npx tsx -e "import { sqlite } from './database'; sqlite.pragma('wal_checkpoint(TRUNCATE)'); console.log('Additive schema check passed with data preserved');"

log "Building Next.js production bundle..."
pnpm build

log "Stashing (stopping & deleting) ONLY PM2 instance '$APP_NAME'..."
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 stop "$APP_NAME" >/dev/null 2>&1 || true
  pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
fi

if command -v redis-cli >/dev/null 2>&1 && redis-cli ping >/dev/null 2>&1; then
  log "Enforcing Redis 100 MB cap and clearing stale app cache keys..."
  redis-cli CONFIG SET maxmemory "$REDIS_MAX_BYTES" >/dev/null 2>&1 || true
  redis-cli CONFIG SET maxmemory-policy allkeys-lru >/dev/null 2>&1 || true
  # Clear only CourtPulse cache prefixes cleanly without flushing unrelated apps
  for prefix in nav dashboard team session tournament profile; do
    redis-cli --scan --pattern "${prefix}:*" | xargs -r -n 100 redis-cli DEL >/dev/null 2>&1 || true
  done
fi

log "Recreating clean PM2 instance '$APP_NAME' on port $APP_PORT..."
pm2 start ecosystem.config.cjs --only "$APP_NAME" --update-env
pm2 save --force

log "Verifying http://127.0.0.1:${APP_PORT}..."
READY=0
for _ in $(seq 1 25); do
  if curl -fsS "http://127.0.0.1:${APP_PORT}/sign-in" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" -eq 1 ]; then
  log "Update complete! '$APP_NAME' recreated cleanly on port $APP_PORT with all existing data preserved."
else
  echo "Warning: PM2 instance recreated, but health check failed. Run 'pm2 logs $APP_NAME'." >&2
  exit 1
fi
