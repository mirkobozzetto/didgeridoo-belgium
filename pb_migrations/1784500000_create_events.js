/// <reference path="../pb_data/types.d.ts" />

// Collection events : proposée par un organisateur (pending), publiée par le
// super admin. Les règles garantissent qu'aucun event non publié ne fuit et
// qu'un organisateur ne peut ni publier ni toucher les fiches d'autrui.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")

  const collection = new Collection({
    name: "events",
    type: "base",
    fields: [
      { name: "title", type: "text", required: true, max: 200 },
      { name: "slug", type: "text", required: true, pattern: "^[a-z0-9-]+$", max: 220 },
      { name: "start", type: "date", required: true },
      { name: "end", type: "date" },
      { name: "location", type: "text", required: true, max: 200 },
      { name: "description", type: "editor", required: true },
      {
        name: "poster",
        type: "file",
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      },
      { name: "price", type: "text", max: 100 },
      { name: "registration_url", type: "url" },
      { name: "contact", type: "text", max: 200 },
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["pending", "published", "rejected"],
      },
      { name: "rejection_reason", type: "text", max: 500 },
      {
        name: "organizer",
        type: "relation",
        required: true,
        collectionId: users.id,
        maxSelect: 1,
        cascadeDelete: false,
      },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_events_slug ON events (slug)",
      "CREATE INDEX idx_events_status_start ON events (status, start)",
    ],
    listRule: 'status = "published" || organizer = @request.auth.id',
    viewRule: 'status = "published" || organizer = @request.auth.id',
    createRule:
      '@request.auth.id != "" && organizer = @request.auth.id && status = "pending"',
    updateRule:
      'organizer = @request.auth.id && status = "rejected" && @request.body.status = "pending" && @request.body.organizer:isset = false',
    deleteRule: 'organizer = @request.auth.id && status != "published"',
  })

  app.save(collection)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("events"))
})
