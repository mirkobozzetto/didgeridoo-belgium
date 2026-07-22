import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import { newsletter } from './newsletter'

// ---------------------------------------------------------------------------
// Configuration (via variables d'environnement)
// ---------------------------------------------------------------------------
const BREVO_API_KEY = process.env.BREVO_API_KEY ?? ''
const BREVO_LIST_ID = Number(process.env.BREVO_LIST_ID ?? '0')
const WHATSAPP_INVITE_URL = process.env.WHATSAPP_INVITE_URL ?? ''
const PORT = Number(process.env.PORT ?? '3000')
// Dossier du build statique Astro (copié dans l'image Docker)
const STATIC_ROOT = process.env.STATIC_ROOT ?? './public'

const BREVO_API_URL =
  process.env.BREVO_API_URL ?? 'https://api.brevo.com/v3/contacts'
const POCKETBASE_URL = process.env.POCKETBASE_URL ?? 'http://localhost:8090'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const app = new Hono()

app.use('*', logger())
// CORS utile seulement si le front est servi depuis un autre domaine.
app.use('/api/*', cors())

// ---------------------------------------------------------------------------
// Endpoint d'inscription : crée/actualise le contact dans Brevo + ajout liste
// ---------------------------------------------------------------------------
app.post('/api/subscribe', async (c) => {
  let body: {
    email?: string
    firstname?: string
    country?: string
    consent?: boolean
  }
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

// Pocketbase renvoie "YYYY-MM-DD HH:mm:ss.sssZ" (espace), pas un ISO strict.
function parseDate(raw: string): Date {
  return new Date(raw.replace(' ', 'T'))
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

  const toIcsDate = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
  const start = toIcsDate(parseDate(ev.start))
  const end = ev.end
    ? toIcsDate(parseDate(ev.end))
    : toIcsDate(new Date(parseDate(ev.start).getTime() + 2 * 60 * 60 * 1000))

  const icsEscape = (s: string) =>
    s
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n')

  const foldLine = (line: string): string => {
    const enc = new TextEncoder()
    const bytes = enc.encode(line)
    if (bytes.length <= 75) return line
    const dec = new TextDecoder()
    const out: string[] = []
    let pos = 0
    let limit = 75
    while (pos < bytes.length) {
      let cut = Math.min(pos + limit, bytes.length)
      while (cut < bytes.length && (bytes[cut] & 0xc0) === 0x80) cut--
      out.push(dec.decode(bytes.slice(pos, cut)))
      pos = cut
      limit = 74
    }
    return out.join('\r\n ')
  }

  const origin = requestOrigin(c)
  const pageUrl = `${origin}/evenements/${ev.slug}`
  const descSource = ev.description ? stripHtml(ev.description) : ''

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//didgeridoo-belgium//evenements//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.id}@didgeridoo-belgium`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(ev.title)}`,
  ]
  if (ev.location) lines.push(`LOCATION:${icsEscape(ev.location)}`)
  if (descSource) lines.push(`DESCRIPTION:${icsEscape(descSource)}`)
  lines.push(`URL:${pageUrl}`, 'END:VEVENT', 'END:VCALENDAR')

  const body = lines.map(foldLine).join('\r\n') + '\r\n'
  return new Response(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="${ev.slug}.ics"`,
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

console.log(`Serveur prêt sur http://localhost:${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
}
