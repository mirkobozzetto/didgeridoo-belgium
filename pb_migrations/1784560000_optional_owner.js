/// <reference path="../pb_data/types.d.ts" />

// L'admin (superuser) propose aussi événements et annonces, mais n'a pas de
// fiche dans users : la relation propriétaire devient facultative. Les règles
// d'accès forcent toujours organizer/author = auth.id pour les comptes users ;
// le superuser les contourne nativement.
migrate((app) => {
  const events = app.findCollectionByNameOrId("events")
  events.fields.getByName("organizer").required = false
  app.save(events)

  const annonces = app.findCollectionByNameOrId("annonces")
  annonces.fields.getByName("author").required = false
  app.save(annonces)
}, (app) => {
  const events = app.findCollectionByNameOrId("events")
  events.fields.getByName("organizer").required = true
  app.save(events)

  const annonces = app.findCollectionByNameOrId("annonces")
  annonces.fields.getByName("author").required = true
  app.save(annonces)
})
