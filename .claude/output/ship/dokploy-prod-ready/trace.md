---
type: trace
source: inline (GitHub issues #1 + #2)
final_status: shipped
stepsCompleted: [0, 1, 2, 3, 4, 5, 6]
engine_tier: solo
---

# Trace - Dokploy prod-ready compose + offsite backups

| Task | Status | Files | Notes |
|------|--------|-------|-------|
| T1 compose named volumes, no app port | done | docker-compose.yml | pb_data + pb_backups named volumes; bind mounts removed; 127.0.0.1:8090 kept |
| T2 COPY migrations/hooks into image | done | Dockerfile.pocketbase | verified via docker run ls |
| T3 local overlay | done | docker-compose.local.yml (new) | republishes 3000 for local testing; Dokploy ignores it |
| T4 S3 backup procedure | done | verification-bundle.md | PocketBase native S3, user step (needs bucket creds) |

Extra: pb_data + backups added to .dockerignore (build context hygiene).
Extra: fixed pre-existing pb-backup crash loop (YAML folded block kept newlines, sh saw "&& find" at line start); command now single-line, tar verified in pb_backups volume.
Extra: seeded named volume from local ./pb_data (1 pending event + superuser).
Persistence proven live: full down (containers + network removed) then up, event survived in named volume; /api/health ok.

Verified by Claude: docker compose config (prod + local overlay), image build, baked-in files listed.
Remaining user steps: local A4 test, Dokploy deploy checklist, S3 config (see verification-bundle.md).
Issues to close after user validation: #1, #2 (gh issue comment + close).
