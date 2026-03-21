#!/usr/bin/env bash
set -euo pipefail

# ── Backup site data ────────────────────────────────────────────────────────
# Usage: ./backup.sh [--keep N]
#
# Creates a timestamped backup archive containing the database, uploads,
# and .env file. Use --keep N to retain only the N most recent backups.

KEEP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep)
      KEEP="$2"
      shift 2
      ;;
    *)
      echo "Usage: $0 [--keep N]"
      exit 1
      ;;
  esac
done

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="backups"
BACKUP_NAME="backup_${TIMESTAMP}"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "=== Backing up site data ==="
echo ""

# ── Verify containers are running ──
echo "── Checking containers ──"
if ! docker compose ps --status running | grep -q "db"; then
  echo "ERROR: Database container is not running"
  echo "  Start services with: docker compose up -d"
  exit 1
fi
if ! docker compose ps --status running | grep -q "app"; then
  echo "ERROR: App container is not running"
  echo "  Start services with: docker compose up -d"
  exit 1
fi
echo "Containers are running"
echo ""

# ── Dump database ──
echo "── Dumping database ──"
docker compose exec -T db pg_dump -U postgres --clean --if-exists wl_website > "${TEMP_DIR}/database.sql"
echo "Database dumped"
echo ""

# ── Copy uploads ──
echo "── Copying uploads ──"
mkdir -p "${TEMP_DIR}/uploads"
docker compose cp app:/app/uploads/. "${TEMP_DIR}/uploads/" 2>/dev/null || echo "No uploads found (empty directory)"
echo "Uploads copied"
echo ""

# ── Copy .env ──
echo "── Copying .env ──"
if [[ -f .env ]]; then
  cp .env "${TEMP_DIR}/env.bak"
  echo ".env copied"
else
  echo "WARNING: No .env file found, skipping"
fi
echo ""

# ── Create archive ──
echo "── Creating archive ──"
mkdir -p "$BACKUP_DIR"
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" -C "$TEMP_DIR" .
echo "Archive created: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo ""

# ── Apply retention ──
if [[ -n "$KEEP" ]]; then
  echo "── Applying retention (keeping ${KEEP} most recent) ──"
  # List backups oldest-first, delete all but the newest N
  BACKUPS=($(ls -1t "${BACKUP_DIR}"/backup_*.tar.gz 2>/dev/null))
  if [[ ${#BACKUPS[@]} -gt $KEEP ]]; then
    for OLD in "${BACKUPS[@]:$KEEP}"; do
      echo "Removing old backup: $OLD"
      rm -f "$OLD"
    done
  fi
  echo ""
fi

echo "========================================="
echo "  Backup complete!"
echo "  Archive: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "========================================="
