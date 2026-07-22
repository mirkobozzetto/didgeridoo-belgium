/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users")

    // Bloque la connexion tant que l'e-mail n'est pas vérifié (anti-spam).
    users.authRule = "verified = true"

    users.verificationTemplate.subject = "Confirme ton adresse - {APP_NAME}"
    users.verificationTemplate.body = [
      "<p>Salut,</p>",
      "<p>Clique sur le lien pour activer ton compte organisateur :</p>",
      '<p><a href="{APP_URL}/verifier-email?token={TOKEN}">Activer mon compte</a></p>',
      "<p>Si tu n'es pas à l'origine de cette demande, ignore cet e-mail.</p>",
    ].join("\n")

    users.resetPasswordTemplate.subject =
      "Réinitialise ton mot de passe - {APP_NAME}"
    users.resetPasswordTemplate.body = [
      "<p>Salut,</p>",
      "<p>Clique sur le lien pour choisir un nouveau mot de passe :</p>",
      '<p><a href="{APP_URL}/reinitialiser?token={TOKEN}">Nouveau mot de passe</a></p>',
      "<p>Si tu n'es pas à l'origine de cette demande, ignore cet e-mail.</p>",
    ].join("\n")

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users")
    users.authRule = ""
    app.save(users)
  },
)
