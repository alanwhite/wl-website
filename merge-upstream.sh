#!/usr/bin/env bash
set -euo pipefail

# ── Merge upstream template into fork ────────────────────────────────────────
# Usage: ./merge-upstream.sh
#
# Fetches the latest changes from the upstream wl-website template repo
# and merges them into the current branch.

UPSTREAM_REMOTE="upstream"

# ── Check if upstream remote exists ──────────────────────────────────────────

if ! git remote get-url "$UPSTREAM_REMOTE" &>/dev/null; then
  echo "No '$UPSTREAM_REMOTE' remote found."
  echo ""
  read -rp "Enter the upstream repo URL (e.g. https://github.com/you/wl-website.git): " UPSTREAM_URL

  if [[ -z "$UPSTREAM_URL" ]]; then
    echo "ERROR: No URL provided. Aborting."
    exit 1
  fi

  git remote add "$UPSTREAM_REMOTE" "$UPSTREAM_URL"
  echo "Added remote '$UPSTREAM_REMOTE' -> $UPSTREAM_URL"
  echo ""
fi

# ── Fetch and merge ─────────────────────────────────────────────────────────

echo "── Fetching from upstream ──"
git fetch "$UPSTREAM_REMOTE"
echo ""

CURRENT_BRANCH=$(git branch --show-current)
echo "── Merging ${UPSTREAM_REMOTE}/main into ${CURRENT_BRANCH} ──"

if git merge "${UPSTREAM_REMOTE}/main" --no-edit; then
  echo ""
  echo "Merge successful. Review changes with: git log --oneline -10"
  echo "Push when ready with: git push origin ${CURRENT_BRANCH}"
else
  echo ""
  echo "========================================="
  echo "  Merge conflicts detected!"
  echo "========================================="
  echo ""
  echo "Resolve conflicts, then:"
  echo "  git add ."
  echo "  git commit"
  echo "  git push origin ${CURRENT_BRANCH}"
  exit 1
fi
