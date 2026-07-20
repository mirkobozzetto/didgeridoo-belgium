---
artifact: "docs/prd/evenements-participatifs"
artifact_kind: "prd"
engine_tier: "subagents"
stepsCompleted: [0, 1, 2, 3, 4, 5, 6]
final_status: "shipped"
updated: "2026-07-20"
---

# Trace Ledger: Plateforme événements participative didgeridoo Belgique

> Single source of truth for progress. A fresh session reads ONLY this file to resume. One row per task/T-id.

## Tasks

| Unit | Contract item | Status | Files touched | Engine | Notes |
|------|---------------|--------|---------------|--------|-------|
| 1.0 Socle Pocketbase | C3, C7, C18 | done | `pb_migrations/1784500000_create_events.js`, `pb_hooks/events.pb.js`, `server/src/index.ts`, `docker-compose.dev.yml` | solo (lead) | collection events + règles (published-only public, création forcée pending, resoumission rejected->pending), hook motif obligatoire, proxy Hono /pb/*, volumes migrations/hooks ; migration appliquée au PB dev, création anonyme rejetée (vérifié curl) |
| 2.0 Comptes + proposition | C1, C2, C4 | done | `web/src/lib/pb.ts`, `web/src/pages/connexion.astro`, `web/src/pages/proposer.astro`, `web/src/pages/mes-propositions.astro` | subagent G2 | helper PB (auth localStorage, slugify, dates UTC/fr-BE) ; connexion+inscription honeypot ; formulaire proposition FormData pending + mode correction ?id= (fiches rejected) ; espace statuts avec motif + re-soumission |
| 3.0 Modération admin | C5, C6 | done | (aucun code) | design | admin Pocketbase = vue pending (filtre status) ; approve = status published (rules publient immédiatement) ; reject = motif obligatoire via pb_hooks |
| 4.0 Calendrier + fiche | C8, C9, C10, C11 | done | `web/src/pages/calendrier.astro`, `web/src/pages/evenement.astro`, `web/src/pages/index.astro` | subagent G3 | calendrier public (published + à venir, groupé par mois) ; coquille fiche rendue client ; index.astro : tagline -> lien /calendrier, Brevo/QR intacts |
| 5.0 Partage + ICS | C12, C13, C14 | done | `server/src/index.ts`, `web/src/pages/evenement.astro` | subagent G3 | routes GET /evenements/:slug (OG injecté dans la coquille) + :slug.ics (VEVENT valide, fold 75 octets, CRLF) ; boutons WhatsApp/copier/agenda ; slug sanitizé contre l'injection de filtre |
| 6.0 Newsletter admin | C15, C16, C17 | done | `web/src/pages/admin/newsletter.astro`, `server/src/newsletter.ts`, `server/src/index.ts` (mount), `.env.example` | subagent G4 | login superuser PB, éditeur sujet+intro+événements cochés, aperçu iframe via POST /api/newsletter/preview, envoi campagne Brevo sendNow via /send (auth-refresh _superusers) ; env sender ajoutées |
| 7.0 Déploiement + garde-fous | C19 | done | `docker-compose.yml`, `.gitignore` | solo (lead) | Pocketbase prod (admin bindé 127.0.0.1, volumes data/migrations/hooks), app POCKETBASE_URL + env sender, sidecar pb-backup (tar quotidien, rétention 14 j) ; backups/ gitignoré ; 7.3 vérifié en step-05 |

## Itération UX (post-ship, plan approuvé 2026-07-20)

| Unit | Status | Files touched | Notes |
|------|--------|---------------|-------|
| Migration catégorie + édition pending | done | `pb_migrations/1784510000_add_category_and_pending_edit.js` | select category requis (stage/concert/festival/rencontre/autre) ; updateRule élargie (non-published, statut forcé pending) ; appliquée + prouvée par PATCH test |
| Page /admin modération | done | `web/src/pages/admin/index.astro`, `admin/newsletter.astro` | login superuser partagé, cartes pending complètes, Approuver/Refuser motif inline, sections publiées/refusées, liens croisés |
| Catégories + navigation | done | `proposer/calendrier/evenement/mes-propositions/index.astro` | select catégorie, chips filtres, badges, bouton Proposer partout, Modifier sur pending |
| Section événements landing | done | `web/src/pages/index.astro` | 6 prochains événements sous le hero, états vide/erreur, bouton calendrier |
| Éditeur riche description | done | `proposer/evenement/admin/index.astro` | contenteditable + toolbar (gras/italique/liste/lien inline), sanitizer allowlist partagé, rendu HTML propre fiche + admin |
| Wordmark didgeridoo.top | done | 8 pages | remplacement tricolore didgeridoo.top (lead) |
| Superadmin dev | done | (aucun fichier) | hello@mirko.re créé via `pocketbase superuser upsert` (CLI, à refaire en prod) + compte organisateur users même email |
| Compte unifié + AccountNav | done | `web/src/lib/pb.ts`, `web/src/components/AccountNav.astro`, `connexion/proposer/mes-propositions/admin/index/admin/newsletter.astro` | loginBoth (users + _superusers), barre de compte commune, pastille Admin, liens Modération/Newsletter si admin, /admin sans double login, déconnexion unique |
| AccountNav v2 (lead) | done | `web/src/components/AccountNav.astro`, `admin/index.astro`, `admin/newsletter.astro` | barre 1 ligne : wordmark + Calendrier, bouton Proposer, menu utilisateur déroulant (initiale, nom, badge Admin, groupe Administration, déconnexion, Escape/clic ext.) ; onglets locaux Modération / Newsletter |
| Dates multiples + Cally | done | `pb_migrations/1784520000_add_sessions.js`, `web/src/pages/proposer.astro`, `calendrier/index/evenement/admin/index.astro` | champ json sessions (start/end dérivés) ; formulaire : popover calendrier Cally fr-BE + heures début/fin optionnelle + « Ajouter une date » ; affichage « +N autres dates » (cartes), liste complète (fiche, admin) ; FormData JSON validé par curl ; placeholder titre « Stage de didgeridoo à Bruxelles » |
| Outillage format/check | done | `.prettierrc`, `web/.prettierrc` implicite racine, `server/.prettierrc`, `package.json` x2, `Makefile`, `web/tsconfig.json` | Prettier 80 col + plugin Astro, astro check (TS 6.0.3 pinné) + tsc, make format/check ; bug réel corrigé : shadow `location` dans proposer (redirect post-submit) |
| Heures quart d'heure + cursor | done | `web/src/styles/global.css`, `web/src/pages/proposer.astro` | selects Début/Fin par pas de 15 min (valeur héritée hors grille préservée), règle cursor pointer globale (boutons, selects, summary, file, liens), contenteditable = text |
| Retouches lead | done | `web/src/pages/index.astro`, `connexion.astro` | lien Se connecter dans le header landing ; placeholder mot de passe adapté login vs signup ; wordmark didge/ridoo/.top |

## Vérification (step-05)

- creator-verifier (fork, lecture seule) : contrat 19/19 PASS, 0 BLOCKER.
- Checks exécutés en session : build Astro OK (7 pages), bundle serveur OK,
  `tsc --noEmit` 0 erreur (dep dev `bun-types` ajoutée, loggée), serveur local
  3100 : health OK, proxy /pb OK, création anonyme 400, liste users vide
  (aucun email), landing servie intacte + lien /calendrier présent.
- Non couvert (manuel, dans le bundle) : flux UI complet organisateur/admin,
  OG/ICS sur un événement réellement publié (exige le superadmin), rendu
  clients mail (6.4), envoi Brevo réel (C17).
- Note : port 3000 occupé par un autre process node local (non touché) ;
  vérification faite hors Docker sur 3100. Conteneur app dev non relancé.

## Checkpoints

| Step | Kind | Decision | Why |
|------|------|----------|-----|
| step-04 | risk-boundary DB+security | proceeded | migrations pb_migrations/ + règles d'accès, base DEV locale uniquement, approuvé par Mirko |

## HALT events

- none

## Architecture (décisions lead)

- Pocketbase accessible au navigateur via proxy Hono `/pb/*` (même origine, zéro CORS).
- Fiche événement : URL stable `/evenements/<slug>` servie par Hono qui injecte
  les balises Open Graph dans le HTML statique Astro ; rendu client via JS.
- ICS : route Hono `/evenements/<slug>.ics`.
- Sérialisation : G2 ∥ G3, puis G4 (server/src/index.ts partagé), puis 7.0.
