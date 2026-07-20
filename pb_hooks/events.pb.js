/// <reference path="../pb_data/types.d.ts" />

// Un refus sans motif serait invisible pour l'organisateur : on le bloque,
// y compris depuis l'admin UI.
onRecordUpdateRequest((e) => {
  if (e.record.get("status") === "rejected" && !e.record.get("rejection_reason")) {
    throw new BadRequestError("Motif de refus obligatoire")
  }
  e.next()
}, "events")
