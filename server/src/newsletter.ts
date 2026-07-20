import { Hono } from 'hono'

const BREVO_API_KEY = process.env.BREVO_API_KEY ?? ''
const BREVO_LIST_ID = Number(process.env.BREVO_LIST_ID ?? '0')
const BREVO_SENDER_EMAIL =
  process.env.BREVO_SENDER_EMAIL ?? 'contact@didgeridoo-belgium.be'
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME ?? 'Didgeridoo Belgique'
const POCKETBASE_URL = process.env.POCKETBASE_URL ?? 'http://localhost:8090'
const BREVO_CAMPAIGNS_URL = 'https://api.brevo.com/v3/emailCampaigns'

// Palette alignée sur le site (voir web/src/styles/global.css) : fond chaud,
// accent orange, texte anthracite. Aucune couleur hors de ce jeu.
const BG = '#fff7ed'
const CARD = '#ffffff'
const ACCENT = '#ea580c'
const TEXT = '#292524'
const MUTED = '#78716c'
const LINE = '#e7e5e4'

type EventRecord = {
  id: string
  title: string
  slug: string
  start: string
  location?: string
  poster?: string
  status?: string
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

// Pocketbase renvoie "YYYY-MM-DD HH:mm:ss.sssZ" (espace), pas un ISO strict.
function parseDate(raw: string): Date {
  return new Date(raw.replace(' ', 'T'))
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function requestOrigin(c: {
  req: { url: string; header: (n: string) => string | undefined }
}): string {
  const host = c.req.header('x-forwarded-host') ?? c.req.header('host')
  const proto = c.req.header('x-forwarded-proto') ?? 'https'
  if (host) return `${proto}://${host}`
  return new URL(c.req.url).origin
}

function eventBlock(ev: EventRecord, origin: string): string {
  const dateLabel = brusselsDateFmt.format(parseDate(ev.start))
  const pageUrl = `${origin}/evenements/${ev.slug}`
  const poster = ev.poster
    ? `${origin}/pb/api/files/events/${ev.id}/${ev.poster}`
    : ''

  const image = poster
    ? `<tr><td style="padding:0;">` +
      `<img src="${escapeHtml(poster)}" width="600" alt="${escapeHtml(ev.title)}" ` +
      `style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:12px 12px 0 0;" /></td></tr>`
    : ''

  const location = ev.location
    ? `<p style="margin:6px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${MUTED};">${escapeHtml(ev.location)}</p>`
    : ''

  return (
    `<tr><td style="padding:0 0 24px;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ` +
    `style="border-collapse:separate;background:${CARD};border:1px solid ${LINE};border-radius:12px;overflow:hidden;">` +
    image +
    `<tr><td style="padding:20px 24px;">` +
    `<p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${ACCENT};">${escapeHtml(dateLabel)}</p>` +
    `<h2 style="margin:8px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:20px;line-height:1.25;font-weight:700;color:${TEXT};">${escapeHtml(ev.title)}</h2>` +
    location +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;"><tr><td style="border-radius:10px;background:${ACCENT};">` +
    `<a href="${escapeHtml(pageUrl)}" style="display:inline-block;padding:10px 20px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Voir l'événement</a>` +
    `</td></tr></table>` +
    `</td></tr></table></td></tr>`
  )
}

export function buildNewsletterHtml(
  intro: string,
  events: EventRecord[],
  origin: string,
): string {
  const introHtml = escapeHtml(intro).replace(/\r?\n/g, '<br />')
  const introBlock = intro.trim()
    ? `<tr><td style="padding:0 0 28px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:${TEXT};">${introHtml}</td></tr>`
    : ''
  const blocks = events.map((ev) => eventBlock(ev, origin)).join('')

  return (
    `<!doctype html><html lang="fr"><head><meta charset="utf-8" />` +
    `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
    `<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />` +
    `</head><body style="margin:0;padding:0;background:${BG};">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG};">` +
    `<tr><td align="center" style="padding:32px 16px;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">` +
    `<tr><td style="padding:0 0 24px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:800;letter-spacing:0.08em;color:${TEXT};">Didgeridoo &amp; culture aborigène - Belgique</td></tr>` +
    introBlock +
    blocks +
    `<tr><td style="padding:24px 0 0;border-top:1px solid ${LINE};font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">` +
    `Tu reçois cet e-mail car tu es inscrit à la communauté didgeridoo en Belgique.<br />` +
    `<a href="{{ unsubscribe }}" style="color:${MUTED};text-decoration:underline;">Se désinscrire</a>` +
    `</td></tr>` +
    `</table></td></tr></table></body></html>`
  )
}

async function fetchPublishedEvents(ids: string[]): Promise<EventRecord[]> {
  const clean = ids.map((id) => id.replace(/[^a-z0-9]/gi, '')).filter(Boolean)
  if (!clean.length) return []
  const idFilter = clean.map((id) => `id='${id}'`).join(' || ')
  const filter = encodeURIComponent(`(${idFilter}) && status='published'`)
  const url = `${POCKETBASE_URL}/api/collections/events/records?perPage=200&filter=${filter}&sort=start`
  const res = await fetch(url)
  if (!res.ok) return []
  const json = (await res.json()) as { items?: EventRecord[] }
  const items = json.items ?? []
  // Conserve l'ordre demandé par l'admin.
  const byId = new Map(items.map((ev) => [ev.id, ev]))
  return clean
    .map((id) => byId.get(id))
    .filter((ev): ev is EventRecord => Boolean(ev))
}

type Payload = { subject?: string; intro?: string; eventIds?: unknown }

function readPayload(body: Payload): {
  subject: string
  intro: string
  ids: string[]
} {
  const subject = (body.subject ?? '').trim()
  const intro = typeof body.intro === 'string' ? body.intro : ''
  const ids = Array.isArray(body.eventIds)
    ? body.eventIds.filter((v): v is string => typeof v === 'string')
    : []
  return { subject, intro, ids }
}

export const newsletter = new Hono()

// Toute route d'admin exige un token superuser Pocketbase valide.
newsletter.use('*', async (c, next) => {
  const token = c.req.header('authorization')
  if (!token) return c.json({ ok: false, error: 'unauthorized' }, 401)
  try {
    const res = await fetch(
      `${POCKETBASE_URL}/api/collections/_superusers/auth-refresh`,
      { method: 'POST', headers: { authorization: token } },
    )
    if (!res.ok) return c.json({ ok: false, error: 'unauthorized' }, 401)
  } catch (err) {
    console.error('Vérification superuser échouée:', err)
    return c.json({ ok: false, error: 'auth_unreachable' }, 502)
  }
  return next()
})

newsletter.post('/preview', async (c) => {
  let body: Payload
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400)
  }
  const { intro, ids } = readPayload(body)
  const events = await fetchPublishedEvents(ids)
  const html = buildNewsletterHtml(intro, events, requestOrigin(c))
  return c.html(html)
})

newsletter.post('/send', async (c) => {
  let body: Payload
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'invalid_json' }, 400)
  }
  const { subject, intro, ids } = readPayload(body)
  if (!subject) return c.json({ ok: false, error: 'subject_required' }, 400)

  if (!BREVO_API_KEY || !BREVO_LIST_ID) {
    console.error('Config Brevo manquante (BREVO_API_KEY / BREVO_LIST_ID)')
    return c.json({ ok: false, error: 'server_misconfigured' }, 500)
  }

  const events = await fetchPublishedEvents(ids)
  const htmlContent = buildNewsletterHtml(intro, events, requestOrigin(c))
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')

  try {
    const createRes = await fetch(BREVO_CAMPAIGNS_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        name: `${subject} - ${stamp}`,
        subject,
        sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
        type: 'classic',
        htmlContent,
        recipients: { listIds: [BREVO_LIST_ID] },
      }),
    })

    if (!createRes.ok) {
      const detail = await createRes.text()
      console.error(
        'Création campagne Brevo échouée:',
        createRes.status,
        detail,
      )
      return c.json({ ok: false, error: detail }, 502)
    }

    const created = (await createRes.json()) as { id?: number }
    const campaignId = created.id
    if (!campaignId) {
      return c.json({ ok: false, error: 'campaign_id_missing' }, 502)
    }

    const sendRes = await fetch(
      `${BREVO_CAMPAIGNS_URL}/${campaignId}/sendNow`,
      {
        method: 'POST',
        headers: { accept: 'application/json', 'api-key': BREVO_API_KEY },
      },
    )

    if (!sendRes.ok) {
      const detail = await sendRes.text()
      console.error('Envoi campagne Brevo échoué:', sendRes.status, detail)
      return c.json({ ok: false, error: detail }, 502)
    }

    return c.json({ ok: true, campaignId })
  } catch (err) {
    console.error('Appel Brevo échoué:', err)
    return c.json({ ok: false, error: 'network_error' }, 502)
  }
})
