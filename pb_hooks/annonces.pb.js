/// <reference path="../pb_data/types.d.ts" />

// Un refus sans motif serait invisible pour l'auteur : on le bloque.
onRecordUpdateRequest((e) => {
  if (e.record.get("status") === "rejected" && !e.record.get("rejection_reason")) {
    throw new BadRequestError("Motif de refus obligatoire")
  }
  e.next()
}, "annonces")

// La publication pose published_at + expiration à J+45, quel que soit le
// client (admin UI ou API) : la date ne dépend jamais du navigateur.
onRecordUpdateRequest((e) => {
  const wasPublished = e.record.original().get("status") === "published"
  if (e.record.get("status") === "published" && !wasPublished) {
    const now = new Date()
    const expires = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)
    e.record.set("published_at", now.toISOString())
    e.record.set("expires_at", expires.toISOString())
  }
  e.next()
}, "annonces")

// Renouvellement par l'auteur : +45 jours sans re-modération. Passe par une
// route dédiée car une règle PocketBase ne peut pas calculer de date.
routerAdd(
  "POST",
  "/api/annonces/{id}/renouveler",
  (e) => {
    const record = e.app.findRecordById("annonces", e.request.pathValue("id"))
    if (record.get("author") !== e.auth.id) {
      throw new ForbiddenError("Cette annonce ne t'appartient pas")
    }
    if (record.get("status") !== "published") {
      throw new BadRequestError("Seule une annonce publiée se renouvelle")
    }
    const expires = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
    record.set("expires_at", expires.toISOString())
    e.app.save(record)
    return e.json(200, { ok: true, expires_at: record.get("expires_at") })
  },
  $apis.requireAuth("users"),
)
