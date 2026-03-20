# White Label Website

A white-label community website built with Next.js, Prisma, and Auth.js. Each client gets their own instance with custom branding, deployed via Docker.

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
```
