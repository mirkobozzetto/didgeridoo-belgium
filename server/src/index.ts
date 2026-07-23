import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import { newsletter } from './newsletter'
import { startCron } from './cron'
import { rateLimit } from './rate-limit'
import { buildCalendar, buildVEvent, parseDate } from './ics'

// ---------------------------------------------------------------------------
// Configuration (via variables d'environnement)
// ---------------------------------------------------------------------------
const BREVO_API_KEY = process.env.BREVO_API_KEY ?? ''
const BREVO_LIST_ID = Number(process.env.BREVO_LIST_ID ?? '0')
const WHATSAPP_INVITE_URL = process.env.WHATSAPP_INVITE_URL ?? ''
const PORT = Number(process.env.PORT ?? '3000')
// Dossier du build statique Astro (copié dans l'image Docker)
const STATIC_ROOT = process.env.STATIC_ROOT ?? './public'

const BREVO_DOI_URL =
  process.env.BREVO_API_URL ??
  'https://api.brevo.com/v3/contacts/doubleOptinConfirmation'
const BREVO_DOI_TEMPLATE_ID = Number(process.env.BREVO_DOI_TEMPLATE_ID ?? '0')
const POCKETBASE_URL = process.env.POCKETBASE_URL ?? 'http://localhost:8090'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Anti-flood : fenêtres fixes par IP, en mémoire (un seul conteneur).
const SUBSCRIBE_RATE = { limit: 5, windowMs: 10 * 60 * 1000 }
const PB_WRITE_RATE = { limit: 30, windowMs: 5 * 60 * 1000 }

const app = new Hono()

app.use('*', logger())
// CORS utile seulement si le front est servi depuis un autre domaine.
app.use('/api/*', cors())

app.use('/api/subscribe', rateLimit(SUBSCRIBE_RATE))
// Les lectures du proxy Pocketbase restent libres, seules les écritures
// (login, propositions, uploads) sont limitées.
app.use(
  '/pb/*',
  rateLimit({
    ...PB_WRITE_RATE,
    skip: (c) => ['GET', 'HEAD', 'OPTIONS'].includes(c.req.method),
  }),
)

// ---------------------------------------------------------------------------
// Endpoint d'inscription : double opt-in Brevo. Le contact n'entre en liste
// qu'après le clic dans l'e-mail de confirmation (template DOI Brevo).
// ---------------------------------------------------------------------------
app.post('/api/subscribe', async (c) => {
  let body: {
    email?: string
    firstname?: string
    country?: string
    consent?: boolean
    website?: string
  }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400)
  }

  // Honeypot : un humain ne voit pas ce champ, un bot le remplit.
  if ((body.website ?? '').trim() !== '') {
    return c.json({ ok: true })
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

  if (!BREVO_API_KEY || !BREVO_LIST_ID || !BREVO_DOI_TEMPLATE_ID) {
    console.error(
      'Config Brevo manquante (BREVO_API_KEY / BREVO_LIST_ID / BREVO_DOI_TEMPLATE_ID)',
    )
    return c.json({ ok: false, error: 'server_misconfigured' }, 500)
  }

  const attributes: Record<string, string> = {}
  if (firstname) attributes.FNAME = firstname
  if (country) attributes.COUNTRY = country

  const payload = {
    email,
    attributes,
    includeListIds: [BREVO_LIST_ID],
    templateId: BREVO_DOI_TEMPLATE_ID,
    redirectionUrl: `${requestOrigin(c)}/confirmation`,
  }

  try {
    const res = await fetch(BREVO_DOI_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
    })

    // 201 = e-mail DOI envoyé, 204 = contact déjà confirmé. Succès dans les deux cas.
    if (res.ok) {
      return c.json({ ok: true })
    }

    const detail = await res.text()
    console.error('Erreur Brevo:', res.status, detail)
    return c.json({ ok: false, error: 'brevo_error' }, 502)
  } catch (err) {
    console.error('Appel Brevo échoué:', err)
    return c.json({ ok: false, error: 'network_error' }, 502)
  }
})

// Lien WhatsApp pour la page /confirmation (après le clic DOI).
app.get('/api/whatsapp', (c) => c.json({ ok: true, url: WHATSAPP_INVITE_URL }))

// Petit healthcheck pour Docker / reverse proxy
app.get('/api/health', (c) => c.json({ ok: true }))

app.route('/api/newsletter', newsletter)

// ---------------------------------------------------------------------------
// Proxy Pocketbase : même origine pour le navigateur, zéro CORS à gérer.
// ---------------------------------------------------------------------------
app.all('/pb/*', async (c) => {
  const url = new URL(c.req.url)
  // L'UI d'admin Pocketbase (/_/) reste privée : accès via tunnel SSH uniquement.
  if (/^\/pb\/_(\/|$)/.test(url.pathname)) {
    return c.json({ ok: false, error: 'not_found' }, 404)
  }
  const target = POCKETBASE_URL + url.pathname.replace(/^\/pb/, '') + url.search
  const headers = new Headers(c.req.raw.headers)
  headers.delete('host')
  try {
    const init: RequestInit & { duplex?: 'half' } = {
      method: c.req.method,
      headers,
      body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : c.req.raw.body,
      duplex: 'half',
    }
    const res = await fetch(target, init)
    return new Response(res.body, res)
  } catch (err) {
    console.error('Proxy Pocketbase échoué:', err)
    return c.json({ ok: false, error: 'pocketbase_unreachable' }, 502)
  }
})

// ---------------------------------------------------------------------------
// Fiches événement : coquille statique + Open Graph, et export ICS.
// ---------------------------------------------------------------------------
type EventRecord = {
  id: string
  title: string
  slug: string
  start: string
  end?: string
  location?: string
  description?: string
  poster?: string
  registration_url?: string
}

const brusselsDateFmt = new Intl.DateTimeFormat('fr-BE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Brussels',
})

function safeSlug(raw: string): string {
  return raw.replace(/[^a-z0-9-]/gi, '')
}

function requestOrigin(c: {
  req: { url: string; header: (n: string) => string | undefined }
}): string {
  const host = c.req.header('x-forwarded-host') ?? c.req.header('host')
  const proto = c.req.header('x-forwarded-proto') ?? 'https'
  if (host) return `${proto}://${host}`
  return new URL(c.req.url).origin
}

async function fetchPublishedEvent(slug: string): Promise<EventRecord | null> {
  const filter = encodeURIComponent(`(slug='${slug}' && status='published')`)
  const url = `${POCKETBASE_URL}/api/collections/events/records?filter=${filter}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const json = (await res.json()) as { items?: EventRecord[] }
    return json.items?.[0] ?? null
  } catch (err) {
    console.error('Lecture Pocketbase échouée:', err)
    return null
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
}

app.get('/evenements/:file{.+\\.ics}', async (c) => {
  const slug = safeSlug(c.req.param('file').replace(/\.ics$/, ''))
  const ev = await fetchPublishedEvent(slug)
  if (!ev) return c.json({ ok: false, error: 'not_found' }, 404)

  const body = buildCalendar([buildVEvent(ev, requestOrigin(c), stripHtml)])
  return new Response(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="${ev.slug}.ics"`,
    },
  })
})

// Flux global : abonnable dans Google/Apple Calendar, tous les événements
// publiés à venir.
app.get('/calendrier.ics', async (c) => {
  const nowPb = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const filter = encodeURIComponent(
    `(status='published' && start >= '${nowPb}')`,
  )
  const url =
    `${POCKETBASE_URL}/api/collections/events/records` +
    `?filter=${filter}&sort=start&perPage=200`
  let items: EventRecord[]
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`pocketbase ${res.status}`)
    const json = (await res.json()) as { items?: EventRecord[] }
    items = json.items ?? []
  } catch (err) {
    console.error('Flux ICS : lecture Pocketbase échouée:', err)
    return c.json({ ok: false, error: 'pocketbase_unreachable' }, 502)
  }

  const origin = requestOrigin(c)
  const body = buildCalendar(
    items.map((ev) => buildVEvent(ev, origin, stripHtml)),
    'Didgeridoo Belgique',
  )
  return new Response(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="calendrier.ics"',
    },
  })
})

app.get('/evenements/:slug', async (c) => {
  const slug = safeSlug(c.req.param('slug'))
  let shell: string
  try {
    shell = await Bun.file(`${STATIC_ROOT}/evenement/index.html`).text()
  } catch (err) {
    console.error('Coquille fiche introuvable:', err)
    return c.json({ ok: false, error: 'shell_missing' }, 500)
  }

  const ev = await fetchPublishedEvent(slug)
  if (!ev) return c.html(shell)

  const origin = requestOrigin(c)
  const pageUrl = `${origin}/evenements/${ev.slug}`
  const dateLabel = brusselsDateFmt.format(parseDate(ev.start))
  const descParts = [ev.location, dateLabel].filter(Boolean) as string[]
  if (ev.description) descParts.push(truncate(stripHtml(ev.description), 150))
  const description = descParts.join(' · ')
  const image = ev.poster
    ? `${origin}/pb/api/files/events/${ev.id}/${ev.poster}`
    : `${origin}/hero.jpeg`

  const tags = [
    `<meta property="og:title" content="${escapeHtml(ev.title)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(ev.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  ].join('\n    ')

  return c.html(shell.replace('</head>', `    ${tags}\n  </head>`))
})

// ---------------------------------------------------------------------------
// Sert le build statique Astro (index.html + assets)
// ---------------------------------------------------------------------------
app.use('/*', serveStatic({ root: STATIC_ROOT }))
// Fallback SPA-like : renvoie index.html pour les routes inconnues
app.get('*', serveStatic({ path: `${STATIC_ROOT}/index.html` }))

startCron()

console.log(`Serveur prêt sur http://localhost:${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
}
