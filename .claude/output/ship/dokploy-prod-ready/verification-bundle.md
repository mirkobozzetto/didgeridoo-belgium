---
type: verification-bundle
contract: contract.md
status: partially-verified
---

# Verification bundle - Dokploy prod-ready

## Already verified by Claude (safe, local)

- A1/A2: `docker compose config --quiet` valid; named volumes `pb_data` + `pb_backups`; app publishes no port; pocketbase keeps 127.0.0.1:8090.
- A3: image built, `docker run --rm didge-pocketbase:ship-check ls /pb/pb_migrations /pb/pb_hooks` shows the 3 migrations + events.pb.js baked in.
- Local overlay merges: `docker compose -f docker-compose.yml -f docker-compose.local.yml config` republishes 3000.

## User: local test (A4)

Prerequisite: `.env` filled at repo root.

1. `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build`
2. `curl http://localhost:3000/api/health` -> `{"ok":true}`
3. Open http://localhost:3000, create/propose an event, see it in admin.
4. `docker compose -f docker-compose.yml -f docker-compose.local.yml down` then `up -d` again -> event still there (named volume survives).
5. Optional: `docker compose down` when finished testing.

## User: Dokploy deploy checklist

1. DNS A record -> VPS before first deploy (Let's Encrypt).
2. Dokploy: new Compose service pointing at the repo, branch main, file docker-compose.yml.
3. Environment tab: BREVO_API_KEY, BREVO_LIST_ID, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, WHATSAPP_INVITE_URL.
4. Domains tab: serviceName `app`, port 3000, enable HTTPS.
5. Deploy; `curl https://<domain>/api/health` -> `{"ok":true}`.
6. Data persistence proof: create an event, redeploy, event still there.

## User: offsite S3 backups (A5, PocketBase native, via GCP)

User has a GCP account; GCS speaks S3 through its interoperability mode.

1. GCP console > Cloud Storage > create bucket (e.g. `didge-pb-backups`, region europe-west1, Standard, uniform access, not public).
2. Cloud Storage > Settings > Interoperability > create an access key for your user (gives access key + secret, the S3-style HMAC pair).
3. PocketBase admin (SSH tunnel: `ssh -L 8090:127.0.0.1:8090 <vps>`, open http://localhost:8090/_/).
4. Settings > Backups: enable S3 storage with endpoint `https://storage.googleapis.com`, bucket name, region of the bucket (e.g. `europe-west1`), the HMAC key pair, and enable force path-style addressing if the connection test fails without it. Set a daily cron (e.g. `0 3 * * *`).
5. Trigger a manual backup, confirm the archive appears in the bucket.
6. Restore drill (recommended once): download the archive, run a scratch PocketBase with it, see the collections.

Local safety net stays: pb-backup tars pb_data daily into the `pb_backups` named volume, 14-day retention.
