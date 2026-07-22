---
type: contract
source: inline (GitHub issues #1 + #2)
status: locked
created: 2026-07-22
---

# Contract: Dokploy prod-ready compose + offsite backups

## Acceptance criteria

| # | Criterion | Verify |
|---|-----------|--------|
| A1 | Prod compose has no relative bind mounts for pb_data / pb_migrations / pb_hooks; pb_data and backups live in named volumes | `docker compose config` shows named volumes only |
| A2 | App service publishes no port in prod compose (Traefik routes via Dokploy Domains); pocketbase keeps 127.0.0.1:8090 | inspect docker-compose.yml |
| A3 | PocketBase image contains /pb/pb_migrations and /pb/pb_hooks baked in (COPY) | build image, `docker run --rm <img> ls /pb/pb_migrations` |
| A4 | Local testing still works: overlay compose republishes 3000, site + API respond, data survives down/up | `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build`, curl /api/health, create event, down + up, event still there |
| A5 | Offsite S3 backup path documented as a user step (PocketBase Settings > Backups); local pb-backup keeps writing tars to a named volume | verification-bundle.md section + tar visible in pb_backups volume |

## Tasks (DAG)

- T1 docker-compose.yml: named volumes, drop bind mounts, drop app ports (files: docker-compose.yml)
- T2 Dockerfile.pocketbase: COPY pb_migrations + pb_hooks (files: Dockerfile.pocketbase)
- T3 docker-compose.local.yml: local overlay re-adding port 3000 (new file)
- T4 S3 backup user procedure in verification bundle (doc only)

No dependencies between T1/T2/T3 (disjoint files). T4 last (documents the result).

## Out of scope

- Dokploy UI configuration itself (domains, env vars) - user steps, documented only
- WhatsApp/newsletter/security issues (#5-#10)
- docker-compose.dev.yml and the make dev local dev flow (untouched)

## Edit scope

docker-compose.yml, Dockerfile.pocketbase, docker-compose.local.yml (new).
