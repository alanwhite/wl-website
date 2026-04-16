#!/bin/bash
# Load address data from a JSON file into the SiteConfig database table.
# Usage: ./load-addresses.sh [path-to-json]
# Default: src/data/gartloch-addresses.json
#
# Run this inside the Docker container or with DATABASE_URL set:
#   docker compose exec app ./load-addresses.sh
#   DATABASE_URL=... ./load-addresses.sh

set -euo pipefail

JSON_FILE="${1:-src/data/gartloch-addresses.json}"

if [ ! -f "$JSON_FILE" ]; then
  echo "Error: File not found: $JSON_FILE"
  echo "Usage: $0 [path-to-json]"
  exit 1
fi

# Validate JSON
if ! node -e "JSON.parse(require('fs').readFileSync('$JSON_FILE','utf8'))" 2>/dev/null; then
  echo "Error: Invalid JSON in $JSON_FILE"
  exit 1
fi

# Read the JSON and escape it for SQL
JSON_CONTENT=$(cat "$JSON_FILE")

echo "Loading address data from $JSON_FILE..."

# Use npx tsx to run a quick Prisma upsert
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const data = fs.readFileSync('$JSON_FILE', 'utf8');
  // Validate it parses
  const parsed = JSON.parse(data);
  const postcodes = Object.keys(parsed);
  const addresses = Object.values(parsed).reduce((sum, entry) => sum + entry.addresses.length, 0);

  await prisma.siteConfig.upsert({
    where: { key: 'registration.addressData' },
    update: { value: data },
    create: { key: 'registration.addressData', value: data },
  });

  console.log('Loaded ' + postcodes.length + ' postcodes with ' + addresses + ' addresses into registration.addressData');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.\$disconnect());
"

echo "Done."
