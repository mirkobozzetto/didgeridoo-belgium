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
