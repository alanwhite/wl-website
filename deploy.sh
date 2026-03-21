#!/usr/bin/env bash
set -euo pipefail

# ── Deploy to remote host ────────────────────────────────────────────────────
# Usage: ./deploy.sh <user@host> [project-dir]
#
# SSHs to the target, pulls latest code, runs migrations, and rebuilds Docker.
# The project directory defaults to ~/wl-website on the remote host.

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <user@host> [project-dir]"
  echo ""
  echo "Examples:"
  echo "  $0 alan@192.168.1.100"
  echo "  $0 alan@odroid.local /opt/wl-site-clientname"
  exit 1
fi

TARGET="$1"
PROJECT_DIR="${2:-~/wl-website}"

echo "=== Deploying to ${TARGET}:${PROJECT_DIR} ==="
echo ""

# Run the deploy commands over SSH
ssh -t "$TARGET" bash -s -- "$PROJECT_DIR" <<'REMOTE_SCRIPT'
set -euo pipefail
PROJECT_DIR="$1"

cd "$PROJECT_DIR" || { echo "ERROR: Directory $PROJECT_DIR not found on remote"; exit 1; }

echo "── Pulling latest code ──"
git pull --ff-only
echo ""

echo "── Stopping containers ──"
docker compose down
echo ""

echo "── Rebuilding and starting containers ──"
docker compose up -d --build
echo ""

echo "── Waiting for services ──"
SECONDS_WAITED=0
MAX_WAIT=120
until docker compose exec app wget --quiet --spider http://localhost:3000/ 2>/dev/null; do
  if [[ $SECONDS_WAITED -ge $MAX_WAIT ]]; then
    echo "WARNING: Timed out waiting for app after ${MAX_WAIT}s"
    echo "  Check logs with: docker compose logs app"
    exit 1
  fi
  sleep 3
  SECONDS_WAITED=$((SECONDS_WAITED + 3))
  echo "  ...waiting (${SECONDS_WAITED}s)"
done
echo "Services are healthy"
echo ""

echo "── Running database migrations ──"
docker compose exec app npx prisma migrate deploy
echo ""

echo "========================================="
echo "  Deploy complete!"
echo "========================================="
REMOTE_SCRIPT

echo ""
echo "Done. Deployed to ${TARGET}:${PROJECT_DIR}"
