/// <reference path="../pb_data/types.d.ts" />

// Un événement peut couvrir plusieurs dates (stage multi-jours, cercle).
// start/end restent dérivés (première/dernière session) pour le tri,
// les filtres et l'ICS.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("events")

  collection.fields.add(
    new Field({
      name: "sessions",
      type: "json",
      maxSize: 20000,
    })
  )

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("events")
  collection.fields.removeByName("sessions")
  app.save(collection)
})
