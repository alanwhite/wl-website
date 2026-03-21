#!/usr/bin/env bash
set -euo pipefail

# ── Restore site data from backup ───────────────────────────────────────────
# Usage: ./restore.sh <backup-archive>
#
# Restores the database, uploads, and .env file from a backup archive
# created by backup.sh.

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-archive>"
  echo ""
  echo "Example:"
  echo "  $0 backups/backup_2026-03-20_030000.tar.gz"
  exit 1
fi

ARCHIVE="$1"

if [[ ! -f "$ARCHIVE" ]]; then
  echo "ERROR: Archive not found: $ARCHIVE"
  exit 1
fi

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# ── Show what will be restored ──
echo "=== Restore from backup ==="
echo ""
echo "Archive: $ARCHIVE"
echo ""
echo "This will overwrite:"
echo "  - Database (wl_website) — all tables dropped and recreated"
echo "  - Uploads directory (/app/uploads in the app container)"
echo "  - .env file in the project root"
echo ""
read -rp "Proceed? (y/N): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Restore cancelled."
  exit 0
fi
echo ""

# ── Extract archive ──
echo "── Extracting archive ──"
tar -xzf "$ARCHIVE" -C "$TEMP_DIR"
echo "Archive extracted"
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

# ── Restore database ──
echo "── Restoring database ──"
if [[ -f "${TEMP_DIR}/database.sql" ]]; then
  docker compose exec -T db psql -U postgres wl_website < "${TEMP_DIR}/database.sql"
  echo "Database restored"
else
  echo "WARNING: No database.sql found in archive, skipping"
fi
echo ""

# ── Restore uploads ──
echo "── Restoring uploads ──"
if [[ -d "${TEMP_DIR}/uploads" ]]; then
  docker compose cp "${TEMP_DIR}/uploads/." app:/app/uploads/
  echo "Uploads restored"
else
  echo "WARNING: No uploads directory found in archive, skipping"
fi
echo ""

# ── Restore .env ──
echo "── Restoring .env ──"
if [[ -f "${TEMP_DIR}/env.bak" ]]; then
  cp "${TEMP_DIR}/env.bak" .env
  echo ".env restored"
else
  echo "WARNING: No env.bak found in archive, skipping"
fi
echo ""

echo "========================================="
echo "  Restore complete!"
echo ""
echo "  Restart containers to pick up changes:"
echo "    docker compose down && docker compose up -d"
echo "========================================="
