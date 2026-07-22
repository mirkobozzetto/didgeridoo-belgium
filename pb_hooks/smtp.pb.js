/// <reference path="../pb_data/types.d.ts" />
// À chaque démarrage (pas en migration) : les réglages suivent les variables
// d'environnement sans dépendre de l'ordre d'application des migrations.
onBootstrap((e) => {
  e.next()

  const settings = e.app.settings()
  settings.meta.appName = "Didgeridoo Belgique"
  settings.meta.appURL = $os.getenv("APP_URL") || "https://didgeridoo.top"
  settings.meta.senderName = "Didgeridoo Belgique"
  settings.meta.senderAddress =
    $os.getenv("SMTP_SENDER") || "didgeridoo@mirko.re"

  const smtpPassword = $os.getenv("SMTP_PASSWORD")
  if (smtpPassword) {
    settings.smtp.enabled = true
    settings.smtp.host = $os.getenv("SMTP_HOST") || "smtp-relay.brevo.com"
    settings.smtp.port = parseInt($os.getenv("SMTP_PORT") || "587", 10)
    settings.smtp.username = $os.getenv("SMTP_USERNAME") || ""
    settings.smtp.password = smtpPassword
  }

  e.app.save(settings)
})
