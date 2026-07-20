---
feature: Plateforme événements participative didgeridoo Belgique
slug: evenements-participatifs
type: prd
status: shipped
shipped_at: 2026-07-20T10:05:00Z
stepsCompleted: [0, 1, 2, 3, 4]
next_action: "Agenda participatif en ligne : organisateurs proposent, Mirko valide, communauté consulte et partage"
resume_cmd: "/ship docs/prd/evenements-participatifs"
---

# PRD - Plateforme événements participative

## En bref

Pour la communauté didgeridoo belge : aujourd'hui les stages et concerts
se perdent entre Facebook et le bouche-à-oreille WhatsApp.
On livre un agenda central sur le site, alimenté par les organisateurs
eux-mêmes, modéré par Mirko, partageable, et repris dans la newsletter.

## Problem statement

La scène didgeridoo belge (profs, animateurs de stages, artistes) n'a
aucun endroit central pour annoncer ses événements. L'information
circule sur Facebook et dans des conversations WhatsApp, se périme vite
et n'atteint pas les nouveaux venus captés par la landing. Le site
actuel capture des emails mais n'offre aucune raison de revenir.

## Goals

- Le calendrier devient le réflexe de la communauté pour savoir
  « qu'est-ce qui se passe » (visites récurrentes hebdomadaires).
- Les organisateurs publient eux-mêmes leurs événements sans passer
  par Mirko pour la saisie, uniquement pour la validation.
- Chaque événement validé est diffusable en un geste : WhatsApp,
  réseaux sociaux, agenda personnel, newsletter.
- Le site passe de « landing jetable » à « destination récurrente ».

## Out-of-scope

- Billetterie, paiement, RSVP : l'inscription à un stage reste chez
  l'organisateur (lien externe).
- Commentaires, likes, messagerie entre membres.
- Application mobile native.
- Fédération (ActivityPub) et import automatique d'autres agendas.
- Multi-langue (français uniquement au lancement).
- Double opt-in Brevo et refonte RGPD de la landing (inchangés).

## User stories

### S1 - Organisateur : proposer un événement
As un organisateur (prof, artiste), I want créer un compte et proposer
un événement avec affiche, so that mon stage soit visible par toute la
communauté sans dépendre de Facebook.

### S2 - Super admin : modérer
As Mirko (super admin), I want voir chaque proposition en attente et
l'approuver ou la refuser, so that rien de hors-sujet ou de spam ne
paraisse publiquement.

### S3 - Visiteur : consulter le calendrier
As un visiteur (membre ou curieux), I want consulter un calendrier des
événements à venir sans créer de compte, so that je sache où pratiquer
et écouter du didgeridoo en Belgique.

### S4 - Visiteur : partager et retenir
As un visiteur, I want partager une fiche événement sur WhatsApp ou un
réseau et l'ajouter à mon agenda, so that mes amis et moi n'oubliions
pas l'événement.

### S5 - Super admin : composer la newsletter
As Mirko, I want écrire une newsletter dans l'admin en y insérant les
événements validés de mon choix, so that la liste Brevo reçoive un
email soigné sans montage manuel.

## Acceptance criteria

### S1 - Proposer
- [ ] Un organisateur crée un compte (email + mot de passe) et se
      connecte.
- [ ] Formulaire de proposition : titre, date(s) et heure, lieu,
      description, affiche (image), prix, lien d'inscription externe,
      contact. Champs obligatoires : titre, date, lieu, description.
- [ ] Une proposition envoyée a le statut « en attente » et n'est
      visible ni dans le calendrier ni ailleurs publiquement.
- [ ] L'organisateur voit l'état de ses propositions (en attente,
      publiée, refusée) et peut corriger une fiche refusée.

### S2 - Modérer
- [ ] Le super admin voit la liste des propositions en attente.
- [ ] Approuver publie immédiatement ; refuser retire la proposition
      avec un motif visible par l'organisateur.
- [ ] Personne d'autre que le super admin ne peut publier, modifier ou
      supprimer un événement d'autrui.

### S3 - Consulter
- [ ] Page calendrier publique listant les événements à venir, sans
      compte requis.
- [ ] Un événement passé disparaît automatiquement de la vue par défaut
      (jamais d'événement périmé affiché en tête).
- [ ] Chaque événement a une fiche publique à URL stable, dans le
      design actuel du site.
- [ ] La landing actuelle (inscription Brevo + QR WhatsApp) reste
      fonctionnelle à l'identique.

### S4 - Partager
- [ ] Bouton de partage WhatsApp et lien copiable sur chaque fiche.
- [ ] Le lien partagé affiche une carte riche (image, titre, date) sur
      WhatsApp et les réseaux (Open Graph).
- [ ] Bouton « ajouter à mon agenda » produisant un fichier ICS valide
      (Google, Apple, Outlook).

### S5 - Newsletter
- [ ] Éditeur dans l'admin : texte libre + insertion d'événements
      validés choisis (blocs avec image, titre, date, lien).
- [ ] Aperçu fidèle de l'email avant envoi ; rendu propre dans les
      clients mail courants.
- [ ] Envoi à la liste Brevo existante depuis l'admin ; l'envoi reste
      dans la limite gratuite (300/jour) ou est planifié en conséquence.
- [ ] Aucun email de membre n'est exposé publiquement, nulle part.

## Success metrics

- Primaire : visites récurrentes de la page calendrier -
  baseline 0 -> 100 visites/semaine, mesuré à 3 mois après lancement.
- Secondaire : événements publiés - 0 -> 4/mois par au moins
  3 organisateurs distincts, à 3 mois.
- Garde-fous : inscriptions Brevo de la landing ne baissent pas ;
  0 événement spam publié ; 0 fuite d'email.

## Constraints & assumptions

- Pas de deadline dure ; qualité avant vitesse.
- Budget infra : le VPS actuel, un seul déploiement Docker.
- La modération reste supportable pour une seule personne (volume
  attendu : quelques propositions/mois).
- Backend retenu en amont : Pocketbase (décision déjà actée en
  session) ; le front reste le site actuel.
- Newsletter : l'éditeur vaut la peine seulement si le rendu est
  « nickel » ; sinon repli assumé sur l'interface Brevo.

## Open questions

- Événements récurrents (cercle mensuel) : simple duplication ou
  gestion dédiée ? V1 : duplication manuelle.
- Faut-il notifier l'organisateur par email au changement de statut ?
  V1 : visible dans son espace, email plus tard.
- Analytics pour mesurer les visites : outil à choisir (rien en place
  aujourd'hui).
