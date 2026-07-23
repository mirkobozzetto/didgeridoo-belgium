/// <reference path="../pb_data/types.d.ts" />

// Petites annonces : proposées par un compte vérifié (pending), publiées par
// le super admin avec une expiration à J+45. Le public ne voit que les
// publiées non expirées ; l'auteur voit toujours les siennes.
// Les signalements sont publics en création (rate-limités par le proxy),
// lisibles uniquement par l'admin.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")

  const annonces = new Collection({
    name: "annonces",
    type: "base",
    fields: [
      { name: "title", type: "text", required: true, max: 200 },
      { name: "description", type: "editor", required: true },
      {
        name: "category",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["vente_instrument", "cours", "artisanat", "covoiturage", "autre"],
      },
      { name: "price", type: "text", max: 100 },
      {
        name: "photos",
        type: "file",
        maxSelect: 3,
        maxSize: 5242880,
        mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      },
      { name: "contact_email", type: "email", required: true },
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["pending", "published", "rejected"],
      },
      { name: "rejection_reason", type: "text", max: 500 },
      {
        name: "author",
        type: "relation",
        required: true,
        collectionId: users.id,
        maxSelect: 1,
        cascadeDelete: false,
      },
      { name: "published_at", type: "date" },
      { name: "expires_at", type: "date" },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE INDEX idx_annonces_status_expires ON annonces (status, expires_at)",
    ],
    listRule:
      '(status = "published" && expires_at > @now) || author = @request.auth.id',
    viewRule:
      '(status = "published" && expires_at > @now) || author = @request.auth.id',
    createRule:
      '@request.auth.id != "" && author = @request.auth.id && status = "pending"',
    updateRule:
      'author = @request.auth.id && status != "published" && @request.body.status = "pending" && @request.body.author:isset = false',
    deleteRule: 'author = @request.auth.id && status != "published"',
  })

  app.save(annonces)

  const signalements = new Collection({
    name: "signalements",
    type: "base",
    fields: [
      {
        name: "annonce",
        type: "relation",
        required: true,
        collectionId: annonces.id,
        maxSelect: 1,
        cascadeDelete: true,
      },
      { name: "reason", type: "text", max: 300 },
      { name: "created", type: "autodate", onCreate: true },
    ],
    createRule: 'annonce.status = "published"',
    listRule: null,
    viewRule: null,
    updateRule: null,
    deleteRule: null,
  })

  app.save(signalements)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("signalements"))
  app.delete(app.findCollectionByNameOrId("annonces"))
})
