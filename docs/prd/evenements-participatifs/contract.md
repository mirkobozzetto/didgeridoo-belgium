---
artifact: "docs/prd/evenements-participatifs"
artifact_kind: "prd"
locked: "2026-07-20"
---

# Definition of Done: Plateforme événements participative didgeridoo Belgique

> Immutable target. Every item below is a concrete, checkable condition the final verification bundle validates against. Requirement changes get a NEW entry; never silently rewrite an existing line.

## Acceptance criteria (the contract)

| # | Criterion (from spec) | Source | Validated by |
|---|------------------------|--------|--------------|
| C1 | Un organisateur crée un compte (email + mot de passe) et se connecte | S1 | test manuel signup/login |
| C2 | Formulaire de proposition : titre, date(s)/heure, lieu, description, affiche, prix, lien inscription, contact ; obligatoires : titre, date, lieu, description | S1 | test manuel formulaire |
| C3 | Une proposition envoyée est « en attente » et invisible publiquement | S1 | curl API events (filtre published) |
| C4 | L'organisateur voit l'état de ses propositions et peut corriger une fiche refusée | S1 | test manuel espace organisateur |
| C5 | Le super admin voit la liste des propositions en attente | S2 | admin Pocketbase |
| C6 | Approuver publie immédiatement ; refuser retire avec motif visible par l'organisateur | S2 | test manuel modération |
| C7 | Seul le super admin peut publier/modifier/supprimer un événement d'autrui | S2 | curl API avec token organisateur |
| C8 | Page calendrier publique des événements à venir, sans compte | S3 | curl /calendrier |
| C9 | Un événement passé disparaît de la vue par défaut | S3 | filtre date dans la requête |
| C10 | Fiche publique à URL stable (slug), design actuel du site | S3 | curl /evenements/<slug> |
| C11 | Landing actuelle (Brevo + QR WhatsApp) intacte | S3 | curl / + /api/subscribe |
| C12 | Bouton partage WhatsApp + lien copiable sur chaque fiche | S4 | inspection fiche |
| C13 | Open Graph par fiche : carte riche image/titre/date | S4 | curl meta og: |
| C14 | Bouton « ajouter à mon agenda » : ICS valide Google/Apple/Outlook | S4 | curl .ics + validation format |
| C15 | Éditeur newsletter admin : texte libre + blocs événements validés | S5 | test manuel admin |
| C16 | Aperçu fidèle avant envoi ; rendu propre clients mail courants | S5 | aperçu + test envoi |
| C17 | Envoi à la liste Brevo depuis l'admin, limite 300/jour respectée | S5 | test envoi réel (user) |
| C18 | Aucun email de membre exposé publiquement | S5 + garde-fou | curl API : champs email absents |
| C19 | Compose prod étendu avec Pocketbase (volume persistant) + backup pb_data | contraintes | lecture compose + cron |

## Out of scope (never build)

- Billetterie, paiement, RSVP (lien externe uniquement)
- Commentaires, likes, messagerie entre membres
- Application mobile native
- Fédération (ActivityPub), import d'agendas externes
- Multi-langue (français uniquement)
- Double opt-in Brevo, refonte RGPD de la landing

## Edit scope

- `pb_migrations/` (nouveau : schéma Pocketbase versionné)
- `web/src/pages/` (nouvelles pages : calendrier, fiche, proposer, connexion, compte, admin newsletter)
- `web/src/` (layout, styles partagés si besoin)
- `server/src/index.ts` (routes ICS / newsletter si nécessaires)
- `docker-compose.yml`, `docker-compose.dev.yml`, `Dockerfile.pocketbase`, `Makefile`
- Interdit de casser : `web/src/pages/index.astro` (flux Brevo/QR), `POST /api/subscribe`
