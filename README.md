# didgeridoo.top - Didgeridoo & Aboriginal Culture in Belgium

Community website: a signup landing page (Brevo + WhatsApp group) and a
participative agenda of didgeridoo events (workshops, concerts,
festivals, meetups) proposed by organizers and moderated by the admin.

Live at **https://didgeridoo.top**, deployed with Dokploy.

- **Frontend**: Astro (static) + Tailwind CSS v4 - `web/`
- **Backend**: Hono on Bun - `server/`
- **Data**: PocketBase (organizer accounts, events, uploads)
- **Emails**: Brevo (contact list + newsletter campaigns) and PocketBase
  SMTP (account verification + password reset)
- **Deployment**: Docker Compose (app + PocketBase + backup) on Dokploy

## Architecture

```
Browser ──▶ Astro (static)                ┐
POST /api/subscribe (Brevo)               ├─ Hono/Bun (port 3000)
/api/newsletter/* (preview + send)        │
/evenements/<slug> (OG) + <slug>.ics      │
/pb/* ── proxy ──▶ PocketBase (8090)      ┘
```

One public port (3000). PocketBase is never exposed directly: the
browser goes through the same-origin `/pb/*` proxy (zero CORS). The
PocketBase admin UI (`/_/`) is blocked by the proxy and reachable only
through an SSH tunnel.

## Features

- **Landing**: email signup -> Brevo + WhatsApp QR/link, "upcoming
  events" section.
- **Public calendar** `/calendrier`: upcoming published events, category
  filters, stable event URLs with Open Graph (rich WhatsApp cards),
  sharing and ICS export.
- **Organizer area**: account (`/connexion`) with mandatory email
  verification, event proposal (`/proposer`, multiple dates with a
  15-minute Cally picker, rich text editor, poster upload), tracking and
  fixes (`/mes-propositions`), password reset (`/reinitialiser`).
- **Admin** (PocketBase superuser): moderation (`/admin`,
  approve/reject with a required reason), newsletter
  (`/admin/newsletter`, event blocks + preview + Brevo campaign send).
- Single login: an identity present in both `users` and `_superusers`
  wears both hats (Admin badge).

## Account security

- Signup requires **email verification**: PocketBase only authenticates
  users with `verified = true` (`pb_migrations/1784530000_*.js`). The
  verification email links to `/verifier-email?token=...`.
- **Password reset** is self-service: "Mot de passe oublié ?" on
  `/connexion` emails a link to `/reinitialiser?token=...`.
- Emails are sent by PocketBase through SMTP (Brevo relay), configured
  at boot from environment variables (`pb_hooks/smtp.pb.js`). Without
  `SMTP_PASSWORD`, PocketBase email sending stays disabled.
- The signup form has a honeypot; events go through manual moderation
  before being published.

## Run locally

```bash
cp .env.example .env      # fill in the values
make dev                  # site: http://localhost:3000
                          # PocketBase admin: http://localhost:8090/_/
make logs                 # follow logs
make stop                 # stop everything
```

First run: create the PocketBase superuser (this is the site admin):

```bash
docker exec didgeridoo-belgium-pocketbase-1 \
  /pb/pocketbase superuser upsert admin@example.be <password> \
  --dir /pb/pb_data
```

The schema (collections, access rules, hooks) is versioned in
`pb_migrations/` and `pb_hooks/` and applied automatically when
PocketBase starts.

### Frontend-only dev (hot reload)

```bash
cd web && bun install && bun run dev     # http://localhost:4321
# web/.env: PUBLIC_API_BASE=http://localhost:3000
```

### Test the production compose locally

The production compose publishes no port (Traefik routes on the
server). To try it on your machine, add the local overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
curl http://localhost:3000/api/health    # -> {"ok":true}
```

## Quality

```bash
make format    # Prettier (80 cols, Astro plugin) on web + server
make check     # astro check (web) + tsc --noEmit (server)
```

A `pre-commit` git hook (see `.githooks/`) formats staged files.
Enable it with:

```bash
git config core.hooksPath .githooks
```

## Environment variables

| Variable              | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `BREVO_API_KEY`       | Brevo API v3 key (newsletter + contact list)       |
| `BREVO_LIST_ID`       | Target Brevo contact list ID                       |
| `BREVO_SENDER_EMAIL`  | Newsletter campaign sender (verified in Brevo)     |
| `BREVO_SENDER_NAME`   | Campaign sender name                               |
| `WHATSAPP_INVITE_URL` | WhatsApp group invite link                         |
| `POCKETBASE_URL`      | Internal PocketBase URL (compose service)          |
| `PUBLIC_API_BASE`     | (frontend build) empty = same origin, else API URL |
| `APP_URL`             | Public site URL used in PocketBase emails          |
| `SMTP_HOST`           | SMTP relay host (default `smtp-relay.brevo.com`)   |
| `SMTP_PORT`           | SMTP port (default 587)                            |
| `SMTP_USERNAME`       | Brevo SMTP login                                   |
| `SMTP_PASSWORD`       | Brevo SMTP key - empty = PocketBase emails off     |
| `SMTP_SENDER`         | Sender of verification/reset emails                |

## Deployment

Pushing to the `development` branch auto-deploys to production through
Dokploy (Traefik + Let's Encrypt). Data lives in named Docker volumes
(`pb_data`, `pb_backups`) and survives every redeploy.

Backups run on two layers: a daily local tar of `pb_data` (14-day
retention) and a nightly PocketBase backup pushed to an S3-compatible
offsite bucket (configured in the PocketBase admin, Settings > Backups).

The detailed operations guide (server access, DNS, incident recovery)
is kept outside this public repository.

## GDPR

- Explicit consent checkbox in the signup form.
- Member emails are never exposed by the API (PocketBase rules).
- Unsubscribe is handled by Brevo inside campaigns.
- Account creation requires email verification (no spam accounts).
- Recommended next: Brevo double opt-in for the newsletter list +
  privacy policy page (tracked in issues #6 and #7).
