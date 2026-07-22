# didgeridoo.top - Didgeridoo & culture aborigène en Belgique

Site communautaire : landing d'inscription (Brevo + groupe WhatsApp) et
agenda participatif des événements didgeridoo (stages, concerts,
festivals, rencontres) proposés par les organisateurs et modérés par
l'admin.

En ligne sur **https://didgeridoo.top**, déployé avec Dokploy.

- **Front** : Astro (statique) + Tailwind CSS v4 - `web/`
- **Backend** : Hono sur Bun - `server/`
- **Données** : PocketBase (comptes organisateurs, événements, uploads)
- **Emails** : Brevo (liste de contacts + campagnes newsletter) et SMTP
  PocketBase (vérification de compte + mot de passe oublié)
- **Déploiement** : Docker Compose (app + PocketBase + backup) sur Dokploy

## Architecture

```
Navigateur ──▶ Astro (statique)           ┐
POST /api/subscribe (Brevo)               ├─ Hono/Bun (port 3000)
/api/newsletter/* (aperçu + envoi)        │
/evenements/<slug> (OG) + <slug>.ics      │
/pb/* ── proxy ──▶ PocketBase (8090)      ┘
```

Un seul port public (3000). PocketBase n'est jamais exposé directement :
le navigateur passe par le proxy même-origine `/pb/*` (zéro CORS). L'UI
d'admin PocketBase (`/_/`) est bloquée par le proxy, accessible
uniquement via tunnel SSH.

## Fonctionnalités

- **Landing** : inscription e-mail -> Brevo + QR/lien WhatsApp, section
  « Prochains événements ».
- **Calendrier public** `/calendrier` : événements publiés à venir,
  filtres par catégorie, fiches à URL stable avec Open Graph (cartes
  riches WhatsApp), partage et export ICS.
- **Espace organisateur** : compte (`/connexion`) avec vérification
  d'e-mail obligatoire, proposition d'événement (`/proposer`, dates
  multiples au quart d'heure via calendrier Cally, éditeur riche,
  affiche), suivi et corrections (`/mes-propositions`), mot de passe
  oublié (`/reinitialiser`).
- **Admin** (superuser PocketBase) : modération (`/admin`, approuver /
  refuser avec motif obligatoire), newsletter (`/admin/newsletter`,
  blocs événements + aperçu + envoi campagne Brevo).
- Une seule connexion : un compte présent dans `users` ET `_superusers`
  porte les deux casquettes (pastille Admin).

## Sécurité des comptes

- L'inscription exige une **vérification d'e-mail** : PocketBase
  n'authentifie que les comptes `verified = true`
  (`pb_migrations/1784530000_*.js`). L'e-mail de vérification pointe
  vers `/verifier-email?token=...`.
- **Mot de passe oublié** en self-service : « Mot de passe oublié ? »
  sur `/connexion` envoie un lien vers `/reinitialiser?token=...`.
- Les e-mails partent via SMTP (relais Brevo), configuré au démarrage
  depuis les variables d'environnement (`pb_hooks/smtp.pb.js`). Sans
  `SMTP_PASSWORD`, l'envoi d'e-mails PocketBase reste désactivé.
- Honeypot sur le formulaire d'inscription ; les événements passent par
  une modération manuelle avant publication.

## Lancer en local

```bash
cp .env.example .env      # remplir les valeurs
make dev                  # site : http://localhost:3000
                          # admin PocketBase : http://localhost:8090/_/
make logs                 # suivre les logs
make stop                 # tout arrêter
```

Premier lancement : créer le superuser PocketBase (= l'admin du site) :

```bash
docker exec didgeridoo-belgium-pocketbase-1 \
  /pb/pocketbase superuser upsert admin@exemple.be <motdepasse> \
  --dir /pb/pb_data
```

Le schéma (collections, règles d'accès, hooks) est versionné dans
`pb_migrations/` et `pb_hooks/`, appliqué automatiquement au démarrage
de PocketBase.

### Dev front seul (hot reload)

```bash
cd web && bun install && bun run dev     # http://localhost:4321
# web/.env : PUBLIC_API_BASE=http://localhost:3000
```

### Tester le compose de production en local

Le compose de production ne publie aucun port (Traefik route sur le
serveur). Pour l'essayer sur ta machine, ajoute l'overlay local :

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
curl http://localhost:3000/api/health    # -> {"ok":true}
```

## Qualité

```bash
make format    # Prettier (80 colonnes, plugin Astro) sur web + server
make check     # astro check (web) + tsc --noEmit (server)
```

Un hook git `pre-commit` (voir `.githooks/`) formate les fichiers
stagés. Il s'active avec :

```bash
git config core.hooksPath .githooks
```

## Variables d'environnement

| Variable              | Rôle                                                |
| --------------------- | --------------------------------------------------- |
| `BREVO_API_KEY`       | Clé API v3 Brevo (newsletter + liste de contacts)   |
| `BREVO_LIST_ID`       | ID de la liste de contacts Brevo cible              |
| `BREVO_SENDER_EMAIL`  | Expéditeur des campagnes (vérifié dans Brevo)       |
| `BREVO_SENDER_NAME`   | Nom d'expéditeur des campagnes                      |
| `WHATSAPP_INVITE_URL` | Lien d'invitation du groupe WhatsApp                |
| `POCKETBASE_URL`      | URL interne de PocketBase (service compose)         |
| `PUBLIC_API_BASE`     | (build front) vide = même origine, sinon URL de l'API |
| `APP_URL`             | URL publique du site (liens des e-mails PocketBase) |
| `SMTP_HOST`           | Relais SMTP (défaut `smtp-relay.brevo.com`)         |
| `SMTP_PORT`           | Port SMTP (défaut 587)                              |
| `SMTP_USERNAME`       | Login SMTP Brevo                                    |
| `SMTP_PASSWORD`       | Clé SMTP Brevo - vide = e-mails PocketBase coupés   |
| `SMTP_SENDER`         | Expéditeur des e-mails de vérification/réinit       |

## Déploiement

Tout l'opérationnel (Dokploy, DNS, backups, création de l'admin,
incidents) est dans [`docs/operations.md`](docs/operations.md).

Version courte : un push sur la branche `development` déploie
automatiquement en production via Dokploy. Les données vivent dans des
volumes Docker nommés (`pb_data`, `pb_backups`) et survivent à chaque
redéploiement.

## RGPD

- Case de consentement explicite dans le formulaire d'inscription.
- Les e-mails des membres ne sont jamais exposés par l'API (règles
  PocketBase).
- Désinscription gérée par Brevo dans les campagnes.
- Création de compte soumise à vérification d'e-mail (pas de comptes
  spam).
- Recommandé ensuite : double opt-in Brevo pour la newsletter + page de
  politique de confidentialité (issues #6 et #7).
