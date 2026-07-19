# Didgeridoo & Culture Aborigène — Belgique

Landing page (lead magnet) qui capture des e-mails, les envoie dans **Brevo**
(liste + double opt-in possible), puis affiche le **lien du groupe WhatsApp**.

- **Front** : Astro (site statique)
- **Backend** : Hono sur Bun — endpoint `POST /api/subscribe`
- **Déploiement** : un seul conteneur Docker (Bun sert le statique **et** l'API)

## Architecture

```
Navigateur ──▶ Astro (statique)  ┐
                                 ├─ servis par le MÊME serveur Hono/Bun
POST /api/subscribe ─────────────┘        (port 3000)
        │
        └──▶ Brevo  POST https://api.brevo.com/v3/contacts
                    (crée/actualise le contact + ajout à la liste)
```

Un seul port à exposer, un seul conteneur : idéal derrière ton reverse proxy.

## Prérequis Brevo

1. Crée un compte Brevo puis une **liste** de contacts (Contacts > Listes).
   Note son **ID** (colonne ID) → `BREVO_LIST_ID`.
2. Génère une **clé API v3** (Paramètres > SMTP & API > Clés API) → `BREVO_API_KEY`.
3. Récupère le **lien d'invitation** de ton groupe WhatsApp → `WHATSAPP_INVITE_URL`.

## Configuration

```bash
cp .env.example .env
# puis édite .env avec tes vraies valeurs
```

## Lancer en local (dev, sans Docker)

Deux terminaux :

```bash
# Terminal 1 — front
cd web && bun install && bun run dev        # http://localhost:4321

# Terminal 2 — backend
cd server && bun install && \
  BREVO_API_KEY=... BREVO_LIST_ID=1 WHATSAPP_INVITE_URL=... bun run dev
```

En dev, configure le front pour taper l'API du backend en ajoutant
`PUBLIC_API_BASE=http://localhost:3000` dans `web/.env`.

## Déploiement sur le VPS (Docker)

```bash
# 1. Copier le dossier sur le VPS (git clone, scp, rsync…)
# 2. Créer le .env (voir ci-dessus)
# 3. Builder et lancer
docker compose up -d --build

# Vérifier
curl http://localhost:3000/api/health      # -> {"ok":true}
```

Le service écoute sur `:3000`. Branche ton reverse proxy dessus, par ex. **Caddy** :

```
didge.tondomaine.be {
    reverse_proxy 127.0.0.1:3000
}
```

ou **Nginx** :

```nginx
server {
    server_name didge.tondomaine.be;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Pour ne pas exposer le port publiquement, remplace dans `docker-compose.yml`
`"3000:3000"` par `"127.0.0.1:3000:3000"`.

## Mettre à jour

```bash
git pull            # ou re-copier les fichiers
docker compose up -d --build
```

## RGPD (important en Belgique / UE)

- La case de **consentement** est obligatoire dans le formulaire (déjà en place).
- Recommandé : activer le **double opt-in** dans Brevo (le contact confirme via
  un e-mail) — meilleure délivrabilité et conformité. Voir Brevo > Contacts >
  Formulaires, ou l'endpoint DOI de l'API.
- Prévois une page **politique de confidentialité** et un lien de désinscription
  (Brevo l'ajoute automatiquement aux campagnes).

## Ce que fait `/api/subscribe`

Valide l'e-mail + le consentement, puis envoie à Brevo :

```json
{
  "email": "prenom@exemple.be",
  "attributes": { "FNAME": "Prénom", "COUNTRY": "Belgique" },
  "listIds": [<BREVO_LIST_ID>],
  "updateEnabled": true
}
```

`updateEnabled: true` évite l'erreur si le contact existe déjà (il est mis à jour).
Réponses : `200 {ok:true, whatsapp}` en cas de succès, `400`/`502` sinon.
