#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./promote-admin.sh <email>"
  echo "  Promotes a user to Admin tier with APPROVED status."
  exit 1
fi

EMAIL="$1"

# Validate email format (basic check)
if [[ ! "$EMAIL" =~ ^[^@]+@[^@]+\.[^@]+$ ]]; then
  echo "Error: '$EMAIL' does not look like a valid email address."
  exit 1
fi

echo "Promoting ${EMAIL} to Admin tier..."

docker compose exec -T db psql -U postgres -d wl_website \
  -v email="$EMAIL" \
  -c "UPDATE \"User\" SET \"tierId\" = 'tier_admin', \"tierLevel\" = 999, \"tierName\" = 'Admin', status = 'APPROVED' WHERE email = :'email';"

echo "Done. User ${EMAIL} promoted to Admin tier."
