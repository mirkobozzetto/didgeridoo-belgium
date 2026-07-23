# Contexte projet — pour Claude Code

Landing page (lead magnet) pour la communauté **didgeridoo & culture aborigène en Belgique**.
Capture des e-mails → les envoie dans **Brevo** (liste de contacts) → affiche un **QR code + bouton**
vers le groupe WhatsApp.

## Stack

- **Front** : Astro (statique) + Tailwind CSS v4 (`@tailwindcss/vite`) — dossier `web/`
- **Backend** : Hono sur Bun — endpoint `POST /api/subscribe` — dossier `server/`
- **QR code** : lib `qrcode`, généré côté navigateur à partir du lien WhatsApp
- **Déploiement** : un seul conteneur Docker. Bun/Hono sert le build statique Astro **et** l'API.

## Architecture

Le serveur Hono sert à la fois le site statique (build Astro copié dans `server/public`)
et l'endpoint API. Un seul port (`3000`), un seul conteneur. Idéal derrière un reverse proxy.

Flux : formulaire → `POST /api/subscribe` → `POST https://api.brevo.com/v3/contacts`
(payload : `email`, `attributes.FNAME/COUNTRY`, `listIds`, `updateEnabled:true`).

## Lancer en local (dev)

```bash
# Front (terminal 1)
cd web && bun install && bun run dev          # http://localhost:4321
# ajoute web/.env avec: PUBLIC_API_BASE=http://localhost:3000

# Backend (terminal 2)
cd server && bun install
BREVO_API_KEY=... BREVO_LIST_ID=1 WHATSAPP_INVITE_URL=... bun run dev
```

## Déployer (VPS)

```bash
cp .env.example .env      # remplir BREVO_API_KEY, BREVO_LIST_ID, WHATSAPP_INVITE_URL
docker compose up -d --build
curl http://localhost:3000/api/health   # -> {"ok":true}
```

## Variables d'environnement

| Variable              | Rôle                                                   |
|-----------------------|--------------------------------------------------------|
| `BREVO_API_KEY`       | Clé API v3 Brevo (Paramètres > SMTP & API)             |
| `BREVO_LIST_ID`       | ID de la liste Brevo cible (Contacts > Listes)         |
| `WHATSAPP_INVITE_URL` | Lien d'invitation du groupe WhatsApp                   |
| `PUBLIC_API_BASE`     | (build front) vide = même origine ; sinon URL de l'API |

## À NE PAS committer

`.env` (contient la clé secrète Brevo). Déjà dans `.gitignore`.

## Idées d'évolution (si demandé)

- Double opt-in Brevo (conformité RGPD / meilleure délivrabilité)
- Page de confirmation dédiée + politique de confidentialité
- Redirection auto vers WhatsApp après X secondes
- QR affiché en permanence, pas seulement après inscription

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **didgeridoo-belgium** (313 symbols, 538 relationships, 16 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/didgeridoo-belgium/context` | Codebase overview, check index freshness |
| `gitnexus://repo/didgeridoo-belgium/clusters` | All functional areas |
| `gitnexus://repo/didgeridoo-belgium/processes` | All execution flows |
| `gitnexus://repo/didgeridoo-belgium/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
