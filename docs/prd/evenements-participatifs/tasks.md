---
feature: Plateforme événements participative didgeridoo Belgique
slug: evenements-participatifs
type: tasks
source_prd: docs/prd/evenements-participatifs/prd.md
stepsCompleted: [0, 1, 2, 3]
---

> ⚠️ Do NOT implement. This is the derived task list. Run `ship` (or the implementer) to execute.

## Relevant Files

- `docker-compose.dev.yml` - stack locale app + Pocketbase (déjà en place, make dev)
- `Dockerfile.pocketbase` - image Pocketbase (déjà en place)
- `docker-compose.yml` - compose prod VPS, à étendre avec Pocketbase
- `web/src/pages/index.astro` - landing actuelle (ne pas casser)
- `web/src/pages/` - nouvelles pages calendrier, fiche événement, proposition, admin
- `server/src/index.ts` - serveur Hono : routes API existantes (subscribe) + nouvelles
- `pb_data/` - données Pocketbase (gitignoré)

## Tasks

- [x] 1.0 Socle Pocketbase : collections et règles d'accès _(PRD: S1, S2, garde-fou fuite d'emails)_
  - [x] 1.1 Collection `events` : titre, dates, lieu, description, affiche, prix, lien inscription, contact, statut (pending/published/rejected), motif de refus, organisateur
  - [x] 1.2 Rôles : collection users organisateurs ; le superuser Pocketbase = super admin
  - [x] 1.3 Règles d'accès : lecture publique des seuls événements published ; création par organisateur connecté ; modification/statut réservés au super admin ; emails jamais exposés par l'API
  - [x] 1.4 Schéma exporté en migrations versionnées dans le repo (reconstruction reproductible)

- [x] 2.0 Comptes organisateurs et proposition d'événement _(PRD: S1)_
  - [x] 2.1 Pages inscription et connexion organisateur dans le design du site
  - [x] 2.2 Formulaire de proposition avec upload d'affiche ; champs obligatoires titre, date, lieu, description
  - [x] 2.3 Espace « mes propositions » : statuts en attente / publiée / refusée avec motif, correction et re-soumission d'une fiche refusée
  - [x] 2.4 Anti-spam de base sur l'inscription et la soumission (honeypot ou équivalent)

- [x] 3.0 Modération super admin _(PRD: S2, garde-fou spam)_
  - [x] 3.1 Vue admin des propositions en attente (via admin Pocketbase ou page dédiée, au plus simple)
  - [x] 3.2 Approuver = publication immédiate ; refuser = motif obligatoire visible par l'organisateur

- [x] 4.0 Calendrier public et fiche événement _(PRD: S3, garde-fous périmés + landing intacte)_
  - [x] 4.1 Page calendrier listant les événements published à venir, sans compte, dans le design actuel
  - [x] 4.2 Les événements passés sortent automatiquement de la vue par défaut
  - [x] 4.3 Fiche événement publique à URL stable (slug) avec affiche, détails, contact
  - [x] 4.4 Lien calendrier depuis la landing sans toucher au flux Brevo/QR existant ; vérifier la landing de bout en bout

- [x] 5.0 Partage et ajout à l'agenda _(PRD: S4)_
  - [x] 5.1 Balises Open Graph par fiche (image, titre, date) pour cartes riches WhatsApp/réseaux
  - [x] 5.2 Bouton partage WhatsApp + copie du lien
  - [x] 5.3 Bouton « ajouter à mon agenda » : ICS valide Google/Apple/Outlook

- [x] 6.0 Newsletter depuis l'admin _(PRD: S5)_
  - [x] 6.1 Éditeur : texte libre + insertion de blocs événements validés (image, titre, date, lien)
  - [x] 6.2 Rendu email propre (template type React Email) + aperçu fidèle avant envoi
  - [x] 6.3 Envoi à la liste Brevo depuis l'admin, dans la limite 300/jour
  - [ ] 6.4 Test de rendu sur clients mail courants (Gmail, Apple Mail, Outlook)

- [x] 7.0 Déploiement et garde-fous _(PRD: contraintes + garde-fous)_
  - [x] 7.1 Étendre le compose prod avec Pocketbase (volume persistant, reverse proxy)
  - [x] 7.2 Sauvegarde automatique de pb_data (cron tar ou équivalent)
  - [x] 7.3 Vérification finale : landing Brevo/QR intacte, aucun email exposé, événement passé absent du calendrier
