---
artifact: "docs/prd/evenements-participatifs"
stack: "js/ts (Astro + Hono) / bun"
generated: "2026-07-20"
ran_by: "user"
---

# Verification Bundle: Plateforme événements participative

> Chaque ligne dit ce qu'elle prouve et le signal de réussite attendu.

## Safe checks

| Command | Validates | Expected pass signal |
|---------|-----------|----------------------|
| `cd web && bun install && bun run build` | le front compile (nouvelles pages incluses) | exit 0, dist/ contient calendrier/ et evenement/ |
| `cd server && bun install && bun build src/index.ts --target bun --outdir /tmp/didge-check` | le serveur (proxy, OG, ICS, newsletter) compile | exit 0 |
| `make dev` puis `curl -s localhost:3000/api/health` | stack complète up | `{"ok":true}` |
| `curl -s "localhost:3000/pb/api/collections/events/records"` | proxy /pb + lecture publique filtrée | 200, items published uniquement |
| `curl -s -X POST localhost:8090/api/collections/events/records -H 'Content-Type: application/json' -d '{"title":"x"}'` | création anonyme refusée (C3/C7) | 400 |
| `curl -s localhost:3000/evenements/<slug>` (après 1 event publié) | OG injecté (C13) | balises og:title/og:image dans le HTML |
| `curl -s localhost:3000/evenements/<slug>.ics` | ICS valide (C14) | BEGIN:VCALENDAR, DTSTART, CRLF |
| `curl -s "localhost:3000/pb/api/collections/users/records"` | aucun email public (C18) | 401/403 ou liste vide, jamais d'email |

## Destructive / stateful (USER ONLY)

| Command | Validates | Warning |
|---------|-----------|---------|
| `docker compose up -d --build` (VPS) | déploiement prod + Pocketbase + backup | outward-facing |
| Envoi newsletter depuis /admin/newsletter | C17 campagne Brevo réelle | envoie un vrai email à la liste |

## Contract coverage

- C1, C2, C4 -> protocole manuel (connexion, proposer, mes-propositions)
- C3, C7, C18 -> curls ci-dessus + règles migration (vérifié en session : création anonyme 400)
- C5, C6 -> admin Pocketbase (approve/refus ; motif obligatoire imposé par pb_hooks)
- C8, C9, C10 -> /calendrier + fiche (filtre published + start >= now)
- C11 -> landing : formulaire Brevo + QR inchangés (seul un lien ajouté)
- C12, C13, C14 -> boutons fiche + curls OG/ICS
- C15, C16 -> /admin/newsletter (éditeur + aperçu iframe)
- C17 -> envoi réel (destructive, ton choix)
- C19 -> docker-compose.yml (service pocketbase + pb-backup)
- Uncovered criteria (manual check needed): C16 rendu clients mail réels (Gmail/Apple/Outlook)
