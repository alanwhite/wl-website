#!/usr/bin/env bash
set -euo pipefail

echo "=== White Label Website Setup ==="
echo ""

# ── Helper ──────────────────────────────────────────────────────────────────

prompt() {
  local var_name="$1" prompt_text="$2" default="${3:-}"
  if [[ -n "$default" ]]; then
    read -rp "$prompt_text [$default]: " value
    eval "$var_name=\${value:-\$default}"
  else
    read -rp "$prompt_text: " value
    eval "$var_name=\$value"
  fi
}

prompt_secret() {
  local var_name="$1" prompt_text="$2"
  read -rsp "$prompt_text: " value
  echo ""
  eval "$var_name=\$value"
}

# ── 1. Collect client info ──────────────────────────────────────────────────

echo "── Site Branding ──"
prompt SITE_NAME        "Site name"          "Community Site"
prompt SITE_DESCRIPTION "Site description"   "A white-label community website with member registration and approval"
prompt HERO_TITLE       "Hero title"         "Welcome to Our Community"
prompt HERO_SUBTITLE    "Hero subtitle"      "Join our community today. Register and get approved to access member resources."
echo ""

echo "── Domain & Deployment ──"
prompt DOMAIN              "Domain (e.g. example.com or localhost:3000)" "localhost:3000"
prompt COMPOSE_PROJECT_NAME "Project name (unique per site, e.g. client-alpha)" "wl-website"
prompt ADMIN_EMAIL          "Admin email address"
echo ""

# Determine protocol
if [[ "$DOMAIN" == localhost* || "$DOMAIN" == 127.0.0.* ]]; then
  PROTOCOL="http"
else
  PROTOCOL="https"
fi

echo "── OAuth Providers (leave blank to skip) ──"
prompt AUTH_GITHUB_ID     "GitHub OAuth Client ID"     ""
prompt AUTH_GITHUB_SECRET "GitHub OAuth Client Secret"  ""
prompt AUTH_GOOGLE_ID     "Google OAuth Client ID"      ""
prompt AUTH_GOOGLE_SECRET "Google OAuth Client Secret"  ""
prompt AUTH_FACEBOOK_ID     "Facebook OAuth App ID"     ""
prompt AUTH_FACEBOOK_SECRET "Facebook OAuth App Secret" ""
echo ""

echo "── Email (Resend) ──"
prompt RESEND_API_KEY "Resend API key (leave blank to skip)" ""
prompt EMAIL_FROM     "From email address"                   "noreply@${DOMAIN}"
echo ""

# ── 2. Generate .env ────────────────────────────────────────────────────────

AUTH_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=' | head -c 24)

cat > .env <<EOF
# Database
DB_PASSWORD="${DB_PASSWORD}"
DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@db:5432/wl_website?schema=public"

# Auth.js
AUTH_SECRET="${AUTH_SECRET}"
AUTH_URL="${PROTOCOL}://${DOMAIN}"

# OAuth Providers
AUTH_GITHUB_ID="${AUTH_GITHUB_ID}"
AUTH_GITHUB_SECRET="${AUTH_GITHUB_SECRET}"
AUTH_GOOGLE_ID="${AUTH_GOOGLE_ID}"
AUTH_GOOGLE_SECRET="${AUTH_GOOGLE_SECRET}"
AUTH_FACEBOOK_ID="${AUTH_FACEBOOK_ID}"
AUTH_FACEBOOK_SECRET="${AUTH_FACEBOOK_SECRET}"

# Email (Resend)
RESEND_API_KEY="${RESEND_API_KEY}"
EMAIL_FROM="${EMAIL_FROM}"

# File uploads
UPLOAD_DIR="/app/uploads"

# Docker project name (determines container name: <project>-app)
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME}"
EOF

echo ""
echo "✓ .env written"

# ── 3. Generate seed config ────────────────────────────────────────────────

cat > prisma/seed-config.json <<EOF
{
  "siteName": "${SITE_NAME}",
  "siteDescription": "${SITE_DESCRIPTION}",
  "heroTitle": "${HERO_TITLE}",
  "heroSubtitle": "${HERO_SUBTITLE}",
  "adminEmail": "${ADMIN_EMAIL}"
}
EOF

echo "✓ prisma/seed-config.json written"

# ── 4. Ensure gateway network exists ──────────────────────────────────────

if ! docker network inspect wl-gateway &>/dev/null; then
  docker network create wl-gateway
  echo "✓ Created Docker network 'wl-gateway'"
else
  echo "✓ Docker network 'wl-gateway' already exists"
fi

# ── 5. Build and start ─────────────────────────────────────────────────────

echo ""
echo "── Building and starting Docker containers ──"
docker compose up -d --build

echo ""
echo "Waiting for services to be healthy..."
# Wait up to 120 seconds for the app container to be healthy
SECONDS_WAITED=0
MAX_WAIT=120
until docker compose exec app wget --quiet --spider http://localhost:3000/ 2>/dev/null; do
  if [[ $SECONDS_WAITED -ge $MAX_WAIT ]]; then
    echo "⚠ Timed out waiting for app to become healthy after ${MAX_WAIT}s."
    echo "  Check logs with: docker compose logs app"
    exit 1
  fi
  sleep 3
  SECONDS_WAITED=$((SECONDS_WAITED + 3))
  echo "  …waiting (${SECONDS_WAITED}s)"
done

echo "✓ Services are healthy"

# ── 5. Seed the database ───────────────────────────────────────────────────

echo ""
echo "── Seeding database ──"
docker compose exec app npx prisma db seed

# ── 6. Done ─────────────────────────────────────────────────────────────────

echo ""
echo "========================================="
echo "  Setup complete!"
echo "========================================="
echo ""
echo "  Site URL:    ${PROTOCOL}://${DOMAIN}"
echo "  Admin email: ${ADMIN_EMAIL}"
echo ""
echo "  Next steps:"
if [[ "$DOMAIN" != localhost* && "$DOMAIN" != 127.0.0.* ]]; then
  echo "  1. Register this site with the gateway:"
  echo "     cd ~/wl-gateway && ./add-site.sh ${DOMAIN} ${COMPOSE_PROJECT_NAME}-app"
  echo "  2. Place Cloudflare origin cert:"
  echo "     ~/wl-gateway/nginx/ssl/${DOMAIN}/origin.pem"
  echo "     ~/wl-gateway/nginx/ssl/${DOMAIN}/origin.key"
  echo "  3. Create Cloudflare Origin Rule: ${DOMAIN} → port 8443"
  echo "  4. Promote yourself to admin:"
  echo "     ./promote-admin.sh ${ADMIN_EMAIL}"
  echo "  5. Access the admin dashboard at ${PROTOCOL}://${DOMAIN}/admin"
else
  echo "  1. Log in via OAuth at ${PROTOCOL}://${DOMAIN}"
  echo "  2. Promote yourself to admin:"
  echo "     ./promote-admin.sh ${ADMIN_EMAIL}"
  echo "  3. Access the admin dashboard at ${PROTOCOL}://${DOMAIN}/admin"
fi
echo ""
echo "  Useful commands:"
echo "    docker compose logs -f        # view logs"
echo "    docker compose ps             # check service status"
echo "    docker compose down            # stop services"
echo "    docker compose up -d           # restart services"
echo ""
