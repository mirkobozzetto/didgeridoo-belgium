# Operations guide - didgeridoo.top

Everything needed to run, deploy and repair the site. Written to be
followed cold, without prior context.

## The moving parts

| Piece | Where | Role |
| ----- | ----- | ---- |
| VPS | `root@185.172.57.158` | Runs Dokploy + all containers |
| Dokploy | https://dok.mirko.re | Deploys the compose stack, TLS via Traefik |
| Service | project `Content` > `didgeridoo-belgium` | The compose service (app + pocketbase + pb-backup) |
| Domain | `didgeridoo.top` (Hostinger DNS) | A record -> 185.172.57.158, TLS Let's Encrypt |
| Emails (newsletter) | Brevo, list 76 | Subscribe endpoint + campaigns, sender `didgeridoo@mirko.re` |
| Emails (accounts) | PocketBase SMTP via Brevo relay | Verification + password reset |
| Sender identity | Google Workspace alias `didgeridoo@mirko.re` | Alias of `mirko@mirko.re`, mail arrives in the main inbox |

## Deploy

Dokploy watches the **`development`** branch (autodeploy on push):

```bash
git push origin development     # = production deploy
```

Manual deploy: Dokploy > Content > didgeridoo-belgium > General > Deploy.

Environment variables live in Dokploy > Environment tab. After changing
them, redeploy (they are read at container start).

Data safety: `pb_data` and `pb_backups` are **named Docker volumes**.
Dokploy re-clones the repo on each deploy, so nothing under the repo
directory persists - never switch these back to relative bind mounts.
`pb_migrations/` and `pb_hooks/` are baked into the PocketBase image
(`Dockerfile.pocketbase`), not mounted.

## Site admin (superuser)

The site admin = the PocketBase superuser. Public signup can only ever
create organizer accounts; nobody can self-promote to admin.

Create/update the admin (choose the password yourself):

```bash
ssh root@185.172.57.158 'docker exec content-didgeridoobelgium-batmzz-pocketbase-1 \
  /pb/pocketbase superuser upsert didgeridoo@mirko.re YOUR_PASSWORD'
```

Then log in at https://didgeridoo.top/connexion with that email and
password: you land on `/admin` (moderation + newsletter).

Note: the container name changes if the service is recreated. Find it
with `docker ps --format '{{.Names}}' | grep pocketbase`.

## PocketBase admin UI (rarely needed)

Blocked from the public internet (`/pb/_/` returns 404). Access through
an SSH tunnel only:

```bash
ssh -L 8090:127.0.0.1:8090 root@185.172.57.158
# then open http://localhost:8090/_/
```

Used for: S3 backup settings, inspecting collections, SMTP test button.

## Account emails (verification + password reset)

Flow: signup on `/connexion` -> PocketBase sends a verification email ->
the user clicks the link to `/verifier-email?token=...` -> account
active. "Mot de passe oublié ?" sends a link to
`/reinitialiser?token=...`.

Configuration is automatic at boot (`pb_hooks/smtp.pb.js`) from these
Dokploy environment variables:

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USERNAME=<Brevo SMTP login>
SMTP_PASSWORD=<Brevo SMTP key>
SMTP_SENDER=didgeridoo@mirko.re
APP_URL=https://didgeridoo.top
```

Get the SMTP credentials in Brevo > Settings > SMTP & API > **SMTP**
tab (the SMTP key is NOT the API key). Paste them in Dokploy >
Environment, then redeploy. Without `SMTP_PASSWORD`, signup emails are
not sent and new accounts cannot be verified.

Deliverability: the `mirko.re` domain is authenticated in Brevo
(brevo-code TXT + DKIM CNAMEs `brevo1._domainkey`/`brevo2._domainkey` +
DMARC `rua` tag, all in Hostinger DNS for mirko.re).

## Backups

Two layers:

1. **Local**: the `pb-backup` container tars `pb_data` daily into the
   `pb_backups` named volume, 14-day retention. Restore drill:

   ```bash
   ssh root@185.172.57.158
   docker run --rm -v content-didgeridoobelgium-batmzz_pb_backups:/b alpine ls /b
   ```

2. **Offsite (S3, to configure once)**: PocketBase admin UI (SSH
   tunnel) > Settings > Backups > S3. Bucket on GCP Cloud Storage:
   create bucket + HMAC interoperability keys (Cloud Storage > Settings
   > Interoperability), endpoint `https://storage.googleapis.com`,
   enable "force path-style" if the connection test fails. Daily cron
   `0 3 * * *`. Tracked in issue #2.

Restore: download the backup archive, then PocketBase admin UI >
Settings > Backups > upload/restore, or replace the contents of the
`pb_data` volume with the extracted archive while the stack is stopped.

## DNS reference

| Record | Where | Value |
| ------ | ----- | ----- |
| `didgeridoo.top` A `@` | Hostinger didgeridoo.top | `185.172.57.158` |
| `www` CNAME | Hostinger didgeridoo.top | `didgeridoo.top` |
| `@` TXT | Hostinger mirko.re | `brevo-code:62b6...` (Brevo domain proof) |
| `brevo1._domainkey` CNAME | Hostinger mirko.re | `b1.mirko-re.dkim.brevo.com` |
| `brevo2._domainkey` CNAME | Hostinger mirko.re | `b2.mirko-re.dkim.brevo.com` |
| `_dmarc` TXT | Hostinger mirko.re | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

## Incidents

- **Site down**: Dokploy > didgeridoo-belgium > Deployments (logs) and
  Containers (status). `curl https://didgeridoo.top/api/health` should
  return `{"ok":true}`.
- **Subscribe fails**: check `BREVO_API_KEY`/`BREVO_LIST_ID` in Dokploy
  Environment; the endpoint returns `{"ok":false,...}` with a reason.
- **No verification emails**: `SMTP_PASSWORD` missing/wrong. Test from
  PocketBase admin UI (tunnel) > Settings > Mail settings > "Send test
  email".
- **Certificate errors**: DNS must point to the VPS; redeploy after any
  domain change in Dokploy (Traefik labels apply at deploy time).
- **Rollback**: `git revert` the bad commit and push `development` -
  Dokploy redeploys the previous state. Data is untouched (volumes).
