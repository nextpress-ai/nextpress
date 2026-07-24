#!/usr/bin/env bash
# Resets local PGlite dev database by moving data/pglite to backup/.
# Safe to re-run — next `pnpm dev` applies migrations on a fresh data dir.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGLITE_DIR="$ROOT/data/pglite"
BACKUP_DIR="$ROOT/backup"

if [[ "${NODE_ENV:-}" == "production" ]]; then
	echo "Error: db:reset is for local development only (PGlite)." >&2
	exit 1
fi

stop_dev_server() {
	if command -v fuser >/dev/null 2>&1; then
		fuser -k 5000/tcp 2>/dev/null || true
	elif command -v lsof >/dev/null 2>&1; then
		lsof -ti:5000 | xargs -r kill -9 2>/dev/null || true
	fi
}

echo "Stopping anything on port 5000 so PGlite files are not locked..."
stop_dev_server
sleep 1

mkdir -p "$BACKUP_DIR" "$ROOT/data"

if [[ -d "$PGLITE_DIR" ]]; then
	ts="$(date +%Y%m%d-%H%M%S)"
	dest="$BACKUP_DIR/pglite-reset-$ts"
	mv "$PGLITE_DIR" "$dest"
	echo "Backed up PGlite to backup/pglite-reset-$ts"
else
	echo "No data/pglite found — database is already fresh."
fi

cat <<EOF

Dev database reset complete.

Next steps:
  1. pnpm dev
  2. Finish setup at http://localhost:5000/setup
  3. Re-create API keys if you use SDK/MCP integration tests
EOF
