/// <reference path="../pb_data/types.d.ts" />

// Catégorie filtrable + édition par l'organisateur tant que la fiche
// n'est pas publiée (le statut reste forcé à pending).
migrate((app) => {
  const collection = app.findCollectionByNameOrId("events")

  collection.fields.add(
    new Field({
      name: "category",
      type: "select",
      required: true,
      maxSelect: 1,
      values: ["stage", "concert", "festival", "rencontre", "autre"],
    })
  )

  collection.updateRule =
    'organizer = @request.auth.id && status != "published" && @request.body.status = "pending" && @request.body.organizer:isset = false'

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("events")
  collection.fields.removeByName("category")
  collection.updateRule =
    'organizer = @request.auth.id && status = "rejected" && @request.body.status = "pending" && @request.body.organizer:isset = false'
  app.save(collection)
})
