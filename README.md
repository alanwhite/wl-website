# White Label Website

A white-label community website built with Next.js, Prisma, and Auth.js. Each client gets their own instance with custom branding, deployed via Docker.

**Tech stack:** Next.js 15, Prisma, Auth.js, PostgreSQL, Docker, Tailwind CSS, shadcn/ui

## Quick Start (New Client Site)

### Prerequisites

- Docker and Docker Compose installed
- [wl-gateway](https://github.com/alanwhite/wl-gateway) running on the target server (for production)
- A domain name managed via Cloudflare (or use `localhost:3000` for local testing)
- OAuth credentials for at least one provider (GitHub, Google, or Facebook)

### Setup

```bash
git clone <repo-url> my-client-site
cd my-client-site
./setup.sh
```

The interactive script will:

1. Collect your site branding (name, description, hero text)
2. Set a unique project name (`COMPOSE_PROJECT_NAME`) for gateway routing
3. Configure OAuth providers and email settings
4. Generate `.env` and `prisma/seed-config.json`
5. Create the `wl-gateway` Docker network (if it doesn't exist)
6. Build and start Docker containers
7. Seed the database with your branding

### Promote Admin

After the site is running and you've logged in via OAuth:

```bash
./promote-admin.sh your@email.com
```

## Architecture

### Route Groups

| Group | Path | Description |
|-------|------|-------------|
| `(public)` | `/`, `/about`, `/contact`, `/p/[slug]` | Public-facing pages and dynamic content pages |
| `(auth)` | `/login`, `/register`, `/register/pending`, `/register/rejected` | Authentication and registration flow |
| `(member)` | `/dashboard`, `/profile`, `/documents`, `/polls`, `/calendar`, `/financials`, `/members` | Logged-in member area |
| `(admin)` | `/admin/*` | Admin panel: system config, pages, announcements, media, roles, tiers, contacts, audit log, settings |

### Features

All features are configurable per deployment via SiteConfig — sites only see features that are configured.

**Registration & Onboarding:**
- OAuth sign-in (Google, Apple, GitHub, Facebook)
- Configurable registration form with dynamic fields and conditional visibility
- Address field type with postcode lookup and address dropdown (local data or paid API)
- Tier eligibility rules — auto-suggest membership tier based on form data (e.g. postcode)
- Registration guidance text configurable per site
- Admin or role-based registration approval with auto-suggested tier

**Member Management:**
- Role-based member management (configurable — e.g. Secretary manages members, not just admin)
- View/search members, approve/reject registrations, change tiers, assign roles, suspend/delete
- Available from the member area sidebar, not just admin panel

**Document Library:**
- Categories with role/tier-based access control
- Role-based upload permissions per category

**Polls:**
- Create polls targeted to specific roles/tiers
- Role-gated poll management (configurable)

**Calendar:**
- Create/edit/delete events with recurrence (weekly, monthly, yearly)
- Event targeting by role/tier
- iCal subscription feed at `/api/calendar.ics` (webcal compatible — subscribe on iPhone/Google Calendar)
- Role-gated event management

**Financials:**
- Income/expense transaction tracking (amounts stored as pence for precision)
- Dashboard with balance, income/expense totals, recent transactions
- Transaction list with type/category filters and search
- Monthly report with opening balance, transactions, closing balance — print-friendly for management meetings
- Configurable categories
- Dual role config: manager roles (add/edit) and viewer roles (read-only)

**Content & Branding:**
- CMS pages with markdown support (About, Privacy, Terms, custom pages)
- Configurable hero image slideshow with Ken Burns drift effect
- Full-screen landing page with transparent header overlay
- Customisable theme colours, logo, favicon
- Newsletter opt-in integration (EmailOctopus)

**Navigation:**
- Desktop sidebar + mobile bottom tab bar in member area
- Config-driven navigation with icons, role/tier gating
- "More" menu on mobile for overflow items
- Public pages show only public links

**Admin Panel:**
- System configuration only (branding, theme, navigation, registration, tiers, roles, pages, settings)
- Vertical tab layout for settings
- Role configuration for all delegated features (polls, calendar, financials, member management)

### Database Models

- **User** — email, name, status (`PENDING_REVIEW` / `APPROVED` / `REJECTED` / `SUSPENDED`), linked to a membership tier
- **MembershipTier** — name, slug, level (integer hierarchy), system flag
- **Role / UserRole** — named roles with tier-level requirements and prerequisites; many-to-many with users
- **Registration / Document** — registration applications with optional uploaded documents and suggested tier
- **UserProfile** — extended profile fields (bio, phone, address, extra JSON)
- **Page** — CMS pages with slug, title, markdown content, publish status, sort order
- **Announcement** — title, content, published/pinned flags, optional expiry
- **CalendarEvent** — events with recurrence, location, role/tier targeting
- **Transaction** — income/expense records with category, amount (pence), reference
- **LibraryCategory / LibraryDocument** — document library with role-based access and upload permissions
- **Poll / PollOption / PollVote** — polls with role/tier targeting
- **ContactSubmission** — contact form entries with read tracking
- **Media** — uploaded files with metadata and alt text
- **AuditLog** — tracks user actions with target type/id, details JSON, IP address
- **SiteConfig** — key-value site configuration store (theme, navigation, registration fields, tier rules, address data, role configs, etc.)
- **Account / Session / VerificationToken / Authenticator** — Auth.js managed tables

### Auth Flow

1. User signs in via OAuth (Google, Apple, GitHub, or Facebook) or Passkey
2. On first login, a `User` record is auto-created with status `PENDING_REVIEW`
3. User completes a configurable registration form (with optional postcode/address lookup)
4. A member manager (or admin) reviews and approves the registration, with auto-suggested tier
5. Once approved, the user gains access to member-tier routes and features

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | — |
| `AUTH_SECRET` | Yes | Auth.js secret (`openssl rand -base64 32`) | — |
| `AUTH_URL` | Yes | Public URL of the site (e.g. `https://example.com`) | — |
| `AUTH_GITHUB_ID` | No | GitHub OAuth app client ID | — |
| `AUTH_GITHUB_SECRET` | No | GitHub OAuth app client secret | — |
| `AUTH_GOOGLE_ID` | No | Google OAuth client ID | — |
| `AUTH_GOOGLE_SECRET` | No | Google OAuth client secret | — |
| `AUTH_FACEBOOK_ID` | No | Facebook OAuth app ID | — |
| `AUTH_FACEBOOK_SECRET` | No | Facebook OAuth app secret | — |
| `AUTH_APPLE_ID` | No | Apple Services ID (e.g. `org.example.web.signin`) | — |
| `AUTH_APPLE_TEAM_ID` | No | Apple Developer Team ID | — |
| `AUTH_APPLE_KEY_ID` | No | Apple Sign In key ID | — |
| `AUTH_APPLE_KEY_CONTENTS` | No | Apple `.p8` private key (newlines as `\n`) | — |
| `RESEND_API_KEY` | No | Resend API key for sending emails | Logs emails to console |
| `EMAIL_FROM` | No | Sender address for outgoing emails | `noreply@example.com` |
| `UPLOAD_DIR` | No | Directory for file uploads | `./uploads` |
| `COMPOSE_PROJECT_NAME` | Yes (prod) | Unique project name per site (e.g. `client-alpha`). Determines the container name used by the gateway for routing. | `wl-website` |

At least one OAuth provider (ID + secret pair) must be configured for login to work.

## Production Deployment

Production sites run behind [wl-gateway](https://github.com/alanwhite/wl-gateway), a shared nginx gateway on port 8443 that terminates TLS with Cloudflare origin certificates. Cloudflare Origin Rules route each domain to the gateway.

### Prerequisites

- A server with Docker and Docker Compose (e.g. ODROID M1)
- [wl-gateway](https://github.com/alanwhite/wl-gateway) set up and running on the server
- A domain managed via Cloudflare (DNS proxied through Cloudflare)
- Port 8443 open on the router, forwarded to the server
- OAuth app credentials configured with production callback URLs:
  - Google: `https://yourdomain.com/api/auth/callback/google`
  - Apple: `https://yourdomain.com/api/auth/callback/apple`
  - GitHub: `https://yourdomain.com/api/auth/callback/github`
  - Facebook: `https://yourdomain.com/api/auth/callback/facebook`

### Steps

1. Clone the repo and run the setup script:
   ```bash
   git clone <repo-url> ~/my-client-site
   cd ~/my-client-site
   ./setup.sh
   ```
   Enter your production domain and a unique project name (e.g. `client-alpha`) when prompted. The project name determines the container name used for gateway routing.

2. Register the site with the gateway:
   ```bash
   cd ~/wl-gateway
   ./add-site.sh yourdomain.com client-alpha-app
   ```

3. Place a Cloudflare origin certificate in the gateway:
   ```bash
   mkdir -p ~/wl-gateway/nginx/ssl/yourdomain.com
   # Save the certificate and key from Cloudflare dashboard:
   #   ~/wl-gateway/nginx/ssl/yourdomain.com/origin.pem
   #   ~/wl-gateway/nginx/ssl/yourdomain.com/origin.key
   ```
   Generate one at: Cloudflare dashboard → your domain → SSL/TLS → Origin Server → Create Certificate.

4. Create a Cloudflare Origin Rule:
   - Cloudflare dashboard → your domain → Rules → Origin Rules
   - When: Hostname equals `yourdomain.com`
   - Then: Destination Port → Override to `8443`
   - Deploy

5. Verify:
   ```bash
   curl https://yourdomain.com/api/health
   # → {"status":"ok","db":"connected",...}
   ```

Database migrations (`prisma migrate deploy`) run automatically on container startup.

### Backups

Back up the database, uploads, and `.env` in a single archive:

```bash
./backup.sh              # creates backups/backup_YYYY-MM-DD_HHMMSS.tar.gz
./backup.sh --keep 7     # same, but delete all but the 7 most recent backups
```

Restore from a backup archive:

```bash
./restore.sh backups/backup_2026-03-20_030000.tar.gz
```

Each backup archive contains:
- `database.sql` — full database dump (with `--clean --if-exists` so it replaces existing data)
- `uploads/` — all uploaded media and registration documents
- `env.bak` — the `.env` file (secrets, OAuth credentials)

**Scheduled backups** — add a cron job to back up nightly and keep a week of history:

```bash
0 3 * * * cd /path/to/site && ./backup.sh --keep 7
```

> **Tip:** Copy backup archives off-server regularly. A backup only on the same disk isn't a real backup.

## Multiple Client Deployments

Each client gets a fully isolated instance — separate application, database, and uploads. All sites share a single [wl-gateway](https://github.com/alanwhite/wl-gateway) for routing.

1. Clone the repo into a separate directory per client:
   ```bash
   git clone <repo-url> ~/client-alpha
   git clone <repo-url> ~/client-beta
   ```

2. Run `./setup.sh` in each directory with a unique project name:

   | Client | `COMPOSE_PROJECT_NAME` | Domain |
   |--------|------------------------|--------|
   | Alpha  | `client-alpha`         | `alpha.example.com` |
   | Beta   | `client-beta`          | `beta.example.com` |

3. Register each site with the gateway:
   ```bash
   cd ~/wl-gateway
   ./add-site.sh alpha.example.com client-alpha-app
   ./add-site.sh beta.example.com client-beta-app
   ```

4. Place Cloudflare origin certs and create Origin Rules for each domain (all pointing to port 8443).

Each instance has its own Docker Compose stack with isolated database and uploads volumes — no data is shared between clients. No host port management is needed; the gateway routes by domain name.

A single server comfortably supports up to ~10 client instances (matching Cloudflare's free-plan Origin Rule limit).

## SiteConfig Keys

All per-site configuration is stored in the `SiteConfig` table and managed via Admin > Settings.

| Key | Type | Description |
|-----|------|-------------|
| `site.name` | string | Site name |
| `site.description` | string | Site description |
| `site.heroTitle` | string | Landing page hero title |
| `site.heroSubtitle` | string | Landing page hero subtitle |
| `site.theme` | JSON | Theme colours (primary, primaryForeground, radius) |
| `site.logoUrl` | string | Logo image URL |
| `site.faviconUrl` | string | Favicon URL |
| `site.heroImages` | JSON array | Hero slideshow image URLs |
| `site.navigation` | JSON array | Navigation links with label, href, icon, tier/role gating |
| `site.analyticsScript` | string | Analytics tracking script |
| `registration.fields` | JSON array | Dynamic registration form fields with conditional visibility |
| `registration.guidance` | string | Guidance text shown above the registration form |
| `registration.terms` | JSON | Terms & conditions config |
| `registration.tierRules` | JSON | Auto-tier suggestion rules + eligible postcodes |
| `registration.addressData` | JSON | Local address lookup data keyed by postcode |
| `email.adminNotifications` | string | Enable admin email notifications ("true"/"false") |
| `polls.managerRoles` | JSON array | Role slugs that can manage polls |
| `calendar.managerRoles` | JSON array | Role slugs that can manage calendar events |
| `financials.managerRoles` | JSON array | Role slugs that can manage transactions |
| `financials.viewerRoles` | JSON array | Role slugs that can view financials (empty = all members) |
| `financials.categories` | JSON array | Transaction categories with name and type |
| `members.managerRoles` | JSON array | Role slugs that can manage members |

## Address Data

For sites with postcode-based registration (e.g. community associations), address lookup data can be loaded from a JSON file:

```bash
# Load address data into SiteConfig from a JSON file
./load-addresses.sh [path-to-json]   # default: src/data/gartloch-addresses.json
```

Or upload via Admin > Settings > Address Data tab.

The JSON format is keyed by postcode:
```json
{
  "G69 8FD": {
    "street": "Gartloch Way",
    "town": "Glasgow",
    "addresses": ["21 Gartloch Way", "23 Gartloch Way", ...]
  }
}
```

## Custom Code per Site (Forks)

Vanilla sites deploy directly from the template repo. Sites needing custom code (e.g. polls, custom pages, unique integrations) get their own GitHub fork instead.

### Fork Setup

1. Fork the template repo on GitHub
2. Clone your fork and add the upstream remote:
   ```bash
   git clone <your-fork-url> wl-site-clientname
   cd wl-site-clientname
   git remote add upstream <template-repo-url>
   ```
3. Run `./setup.sh` as usual to configure branding and environment

### Deploying a Fork

Use `deploy.sh` to deploy to a remote host over SSH:

```bash
./deploy.sh user@odroid.local ~/wl-site-clientname
```

This pulls the latest code, rebuilds Docker containers, and runs database migrations on the remote host.

### Pulling Template Updates

When the template repo gets new features or fixes, pull them into your fork:

```bash
./merge-upstream.sh
```

This fetches from the `upstream` remote and merges into your current branch. If no upstream remote exists, it will prompt you to add one. Resolve any merge conflicts, then push.

## Manual Setup

If you prefer to set things up manually:

1. Copy `.env.example` to `.env` and fill in values
2. Generate an auth secret: `openssl rand -base64 32`
3. Optionally create `prisma/seed-config.json` with branding:
   ```json
   {
     "siteName": "My Site",
     "siteDescription": "Site description",
     "heroTitle": "Welcome",
     "heroSubtitle": "Join us today"
   }
   ```
4. Start services: `docker compose up -d --build`
5. Seed the database: `docker compose exec app npx prisma db seed`

## Development

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

## Useful Commands

```bash
docker compose logs -f              # view logs
docker compose ps                   # check service status
docker compose down                 # stop services
docker compose up -d                # restart services
./promote-admin.sh user@email       # promote user to admin
./deploy.sh user@host [dir]         # deploy to remote host via SSH
./merge-upstream.sh                 # pull template updates into a fork
./backup.sh                         # back up database, uploads, and .env
./backup.sh --keep 7                # back up and retain only 7 most recent
./restore.sh <archive>              # restore from a backup archive
./load-addresses.sh [json-file]     # load address lookup data into SiteConfig
```
