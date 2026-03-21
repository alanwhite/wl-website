# White Label Website

A white-label community website built with Next.js, Prisma, and Auth.js. Each client gets their own instance with custom branding, deployed via Docker.

**Tech stack:** Next.js 15, Prisma, Auth.js, PostgreSQL, Docker, Tailwind CSS, shadcn/ui

## Quick Start (New Client Site)

### Prerequisites

- Docker and Docker Compose installed
- A domain name (or use `localhost:3000` for local testing)
- OAuth credentials for at least one provider (GitHub, Google, or Facebook)

### Setup

```bash
git clone <repo-url> my-client-site
cd my-client-site
./setup.sh
```

The interactive script will:

1. Collect your site branding (name, description, hero text)
2. Configure OAuth providers and email settings
3. Generate `.env` and `prisma/seed-config.json`
4. Build and start Docker containers
5. Seed the database with your branding

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
| `(member)` | `/dashboard`, `/profile`, `/profile/edit` | Logged-in member area |
| `(admin)` | `/admin/*` | Admin panel: users, registrations, pages, announcements, media, roles, tiers, contacts, audit log, settings |

### Database Models

- **User** — email, name, status (`PENDING_REVIEW` / `APPROVED` / `REJECTED` / `SUSPENDED`), linked to a membership tier
- **MembershipTier** — name, slug, level (integer hierarchy), system flag
- **Role / UserRole** — named roles with tier-level requirements; many-to-many with users
- **Registration / Document** — registration applications with optional uploaded documents
- **UserProfile** — extended profile fields (bio, phone, address, extra JSON)
- **Page** — CMS pages with slug, title, content, publish status, sort order
- **Announcement** — title, content, published/pinned flags, optional expiry
- **ContactSubmission** — contact form entries with read tracking
- **Media** — uploaded files with metadata and alt text
- **AuditLog** — tracks user actions with target type/id, details JSON, IP address
- **SiteConfig** — key-value site configuration store
- **Account / Session / VerificationToken** — Auth.js managed tables

### Auth Flow

1. User signs in via OAuth (GitHub, Google, or Facebook)
2. On first login, a `User` record is auto-created with status `PENDING_REVIEW`
3. An admin reviews and approves the registration in the admin panel
4. Once approved, the user gains access to member-tier routes and features

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
| `RESEND_API_KEY` | No | Resend API key for sending emails | Logs emails to console |
| `EMAIL_FROM` | No | Sender address for outgoing emails | `noreply@example.com` |
| `UPLOAD_DIR` | No | Directory for file uploads | `./uploads` |

At least one OAuth provider (ID + secret pair) must be configured for login to work.

## Production Deployment

### Prerequisites

- A VPS or server with Docker and Docker Compose
- A domain name with DNS A record pointing to the server
- OAuth app credentials configured with production callback URLs:
  - GitHub: `https://yourdomain.com/api/auth/callback/github`
  - Google: `https://yourdomain.com/api/auth/callback/google`
  - Facebook: `https://yourdomain.com/api/auth/callback/facebook`

### Steps

1. Clone the repo and run the setup script:
   ```bash
   git clone <repo-url> my-client-site
   cd my-client-site
   ./setup.sh
   ```
   Enter your production domain when prompted (e.g. `https://yourdomain.com`).

2. Set up a reverse proxy (nginx or Caddy) to handle SSL termination and forward traffic to port 3000:

   **Caddy** (automatic HTTPS):
   ```
   yourdomain.com {
       reverse_proxy localhost:3000
   }
   ```

   **nginx**:
   ```nginx
   server {
       listen 443 ssl;
       server_name yourdomain.com;

       ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. Start the containers:
   ```bash
   docker compose up -d --build
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

Each client gets a fully isolated instance — separate application, database, and uploads.

1. Clone the repo into a separate directory per client:
   ```bash
   git clone <repo-url> client-alpha
   git clone <repo-url> client-beta
   ```

2. Run `./setup.sh` in each directory. When prompted, assign different host ports to avoid conflicts:

   | Client | Host Port | `AUTH_URL` |
   |--------|-----------|------------|
   | Alpha  | 3001      | `https://alpha.example.com` |
   | Beta   | 3002      | `https://beta.example.com` |

3. Each instance has its own Docker Compose stack with isolated database and uploads volumes — no data is shared between clients.

4. Point your reverse proxy to each port per domain.

A single server comfortably supports up to ~10 client instances, depending on available resources.

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
docker compose logs -f          # view logs
docker compose ps               # check service status
docker compose down              # stop services
docker compose up -d             # restart services
./promote-admin.sh user@email    # promote user to admin
./deploy.sh user@host [dir]      # deploy to remote host via SSH
./merge-upstream.sh              # pull template updates into a fork
./backup.sh                      # back up database, uploads, and .env
./backup.sh --keep 7             # back up and retain only 7 most recent
./restore.sh <archive>           # restore from a backup archive
```
