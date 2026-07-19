import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'

// ---------------------------------------------------------------------------
// Configuration (via variables d'environnement)
// ---------------------------------------------------------------------------
const BREVO_API_KEY = process.env.BREVO_API_KEY ?? ''
const BREVO_LIST_ID = Number(process.env.BREVO_LIST_ID ?? '0')
const WHATSAPP_INVITE_URL = process.env.WHATSAPP_INVITE_URL ?? ''
const PORT = Number(process.env.PORT ?? '3000')
// Dossier du build statique Astro (copié dans l'image Docker)
const STATIC_ROOT = process.env.STATIC_ROOT ?? './public'

const BREVO_API_URL = process.env.BREVO_API_URL ?? 'https://api.brevo.com/v3/contacts'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const app = new Hono()

app.use('*', logger())
// CORS utile seulement si le front est servi depuis un autre domaine.
app.use('/api/*', cors())

// ---------------------------------------------------------------------------
// Endpoint d'inscription : crée/actualise le contact dans Brevo + ajout liste
// ---------------------------------------------------------------------------
app.post('/api/subscribe', async (c) => {
  let body: { email?: string; firstname?: string; country?: string; consent?: boolean }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400)
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const firstname = (body.firstname ?? '').trim()
  const country = (body.country ?? '').trim()

  if (!EMAIL_RE.test(email)) {
    return c.json({ ok: false, error: 'invalid_email' }, 400)
  }
  // Consentement RGPD explicite requis.
  if (body.consent !== true) {
    return c.json({ ok: false, error: 'consent_required' }, 400)
  }

  if (!BREVO_API_KEY || !BREVO_LIST_ID) {
    console.error('Config Brevo manquante (BREVO_API_KEY / BREVO_LIST_ID)')
    return c.json({ ok: false, error: 'server_misconfigured' }, 500)
  }

  const attributes: Record<string, string> = {}
  if (firstname) attributes.FNAME = firstname
  if (country) attributes.COUNTRY = country

  const payload = {
    email,
    attributes,
    listIds: [BREVO_LIST_ID],
    updateEnabled: true, // évite l'erreur si le contact existe déjà
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
    })

    // 201 = créé, 204 = mis à jour. Les deux sont des succès.
    if (res.ok) {
      return c.json({ ok: true, whatsapp: WHATSAPP_INVITE_URL })
    }

    const detail = await res.text()
    console.error('Erreur Brevo:', res.status, detail)
    return c.json({ ok: false, error: 'brevo_error' }, 502)
  } catch (err) {
    console.error('Appel Brevo échoué:', err)
    return c.json({ ok: false, error: 'network_error' }, 502)
  }
})

// Petit healthcheck pour Docker / reverse proxy
app.get('/api/health', (c) => c.json({ ok: true }))

// ---------------------------------------------------------------------------
// Sert le build statique Astro (index.html + assets)
// ---------------------------------------------------------------------------
app.use('/*', serveStatic({ root: STATIC_ROOT }))
// Fallback SPA-like : renvoie index.html pour les routes inconnues
app.get('*', serveStatic({ path: `${STATIC_ROOT}/index.html` }))

console.log(`Serveur prêt sur http://localhost:${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
}
