# didgeridoo.top - Didgeridoo & Culture Aborigène en Belgique

Site communautaire : landing d'inscription (Brevo + groupe WhatsApp) et
agenda participatif des événements didgeridoo (stages, concerts,
festivals, rencontres) proposés par les organisateurs et modérés par le
super admin.

- **Front** : Astro (statique) + Tailwind CSS v4 - dossier `web/`
- **Backend** : Hono sur Bun - dossier `server/`
- **Données** : Pocketbase (comptes organisateurs, événements, uploads)
- **Emails** : Brevo (liste de contacts + campagnes newsletter)
- **Déploiement** : Docker Compose (app + Pocketbase + backup)

## Architecture

```
Navigateur ──▶ Astro (statique)          ┐
POST /api/subscribe (Brevo)              ├─ Hono/Bun (port 3000)
/api/newsletter/* (aperçu + envoi)       │
/evenements/<slug> (OG) + <slug>.ics     │
/pb/* ── proxy ──▶ Pocketbase (8090)     ┘
```

Un seul port public (3000). Pocketbase n'est jamais exposé directement :
le navigateur passe par le proxy `/pb/*` (même origine, zéro CORS).

## Fonctionnalités

- **Landing** : inscription e-mail -> Brevo + QR/lien WhatsApp,
  section « Prochains événements ».
- **Calendrier public** `/calendrier` : événements publiés à venir,
  filtres par catégorie, fiches à URL stable avec Open Graph
  (cartes riches WhatsApp), partage et export ICS.
- **Espace organisateur** : compte (`/connexion`), proposition
  d'événement (`/proposer`, dates multiples au quart d'heure via
  calendrier Cally, éditeur riche, affiche), suivi et corrections
  (`/mes-propositions`).
- **Admin** (superuser Pocketbase) : modération (`/admin`, approuver /
  refuser avec motif obligatoire), newsletter (`/admin/newsletter`,
  blocs événements + aperçu + envoi campagne Brevo).
- Une seule connexion : un compte présent dans `users` ET `_superusers`
  porte les deux casquettes (pastille Admin).

## Lancer en local

```bash
cp .env.example .env      # remplir les valeurs
make dev                  # site : http://localhost:3000
                          # admin Pocketbase : http://localhost:8090/_/
make logs                 # suivre les logs
make stop                 # tout arrêter
```

Premier lancement : créer le superadmin Pocketbase :

```bash
docker exec didgeridoo-belgium-pocketbase-1 \
  /pb/pocketbase superuser upsert admin@exemple.be <motdepasse> \
  --dir /pb/pb_data
```

Le schéma (collections `events`, règles d'accès, hooks) est versionné
dans `pb_migrations/` et `pb_hooks/`, appliqué automatiquement au
démarrage de Pocketbase.

### Dev front seul (hot reload)

```bash
cd web && bun install && bun run dev     # http://localhost:4321
# web/.env : PUBLIC_API_BASE=http://localhost:3000
```

## Qualité

```bash
make format    # Prettier (80 colonnes, plugin Astro) sur web + server
make check     # astro check (web) + tsc --noEmit (server)
```

Un hook git `pre-commit` (voir `.githooks/`) formate automatiquement les
fichiers stagés. Il est activé par :

```bash
git config core.hooksPath .githooks
```

## Variables d'environnement

| Variable              | Rôle                                            |
| --------------------- | ----------------------------------------------- |
| `BREVO_API_KEY`       | Clé API v3 Brevo                                |
| `BREVO_LIST_ID`       | ID de la liste Brevo cible                      |
| `BREVO_SENDER_EMAIL`  | Expéditeur des campagnes newsletter             |
| `BREVO_SENDER_NAME`   | Nom d'expéditeur des campagnes                  |
| `WHATSAPP_INVITE_URL` | Lien d'invitation du groupe WhatsApp            |
| `POCKETBASE_URL`      | URL interne de Pocketbase (compose : service)   |
| `PUBLIC_API_BASE`     | (front) vide = même origine ; sinon URL de l'API |

## Déploiement VPS

```bash
cp .env.example .env      # remplir
docker compose up -d --build
curl http://localhost:3000/api/health    # -> {"ok":true}
```

- L'app écoute sur `:3000` (reverse proxy Caddy/Nginx devant).
- Pocketbase est bindé sur `127.0.0.1:8090` : admin UI accessible via
  tunnel SSH uniquement.
- `pb-backup` archive `pb_data` chaque jour dans `backups/`
  (rétention 14 jours).
- Créer le superadmin en prod avec la même commande `superuser upsert`.

## RGPD

- Consentement obligatoire dans le formulaire (en place).
- Emails des membres jamais exposés par l'API (règles Pocketbase).
- Désinscription gérée par Brevo dans les campagnes.
- Recommandé : double opt-in Brevo + page politique de confidentialité.
