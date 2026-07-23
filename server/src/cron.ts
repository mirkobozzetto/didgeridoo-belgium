import { buildNewsletterHtml, sendCampaign } from './newsletter'

const POCKETBASE_URL = process.env.POCKETBASE_URL ?? 'http://localhost:8090'
// Origine publique du site pour les liens dans les e-mails (pas de requête HTTP
// entrante dans un cron, donc pas de requestOrigin).
const SITE_ORIGIN = (process.env.APP_URL ?? 'https://didgeridoo.top').replace(
  /\/$/,
  '',
)

const TZ = 'Europe/Brussels'
const CRON_HOUR = 9
const REMINDER_DAYS_AHEAD = 2

type EventRecord = {
  id: string
  title: string
  slug: string
  start: string
  location?: string
  poster?: string
}

const monthFmt = new Intl.DateTimeFormat('fr-BE', {
  month: 'long',
  year: 'numeric',
  timeZone: TZ,
})

function tzOffsetMs(at: Date): number {
  const local = new Date(at.toLocaleString('en-US', { timeZone: TZ }))
  return local.getTime() - at.getTime()
}

function brusselsToday(): { y: number; m: number; d: number } {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: TZ })
    .format(new Date())
    .split('-')
    .map(Number)
  return { y, m, d }
}

// Minuit à Bruxelles du jour (aujourd'hui + daysAhead), en instant UTC.
function brusselsMidnightUtc(daysAhead: number, firstOfMonth = false): Date {
  const { y, m, d } = brusselsToday()
  const utcGuess = firstOfMonth
    ? Date.UTC(y, m - 1 + daysAhead, 1)
    : Date.UTC(y, m - 1, d + daysAhead)
  return new Date(utcGuess - tzOffsetMs(new Date(utcGuess)))
}

function pbDate(d: Date): string {
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

async function fetchEventsBetween(
  from: Date,
  to: Date,
): Promise<EventRecord[]> {
  const filter = encodeURIComponent(
    `status='published' && start >= '${pbDate(from)}' && start < '${pbDate(to)}'`,
  )
  const url = `${POCKETBASE_URL}/api/collections/events/records?filter=${filter}&sort=start&perPage=200`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`pocketbase ${res.status}`)
  const json = (await res.json()) as { items?: EventRecord[] }
  return json.items ?? []
}

// Rappel J-2 : une campagne par événement publié démarrant dans 2 jours.
export async function runReminders(): Promise<void> {
  const from = brusselsMidnightUtc(REMINDER_DAYS_AHEAD)
  const to = brusselsMidnightUtc(REMINDER_DAYS_AHEAD + 1)
  const events = await fetchEventsBetween(from, to)

  for (const ev of events) {
    const html = buildNewsletterHtml(
      "C'est dans 2 jours ! Petit rappel pour ne pas le manquer.",
      [ev],
      SITE_ORIGIN,
    )
    const result = await sendCampaign(`Rappel : ${ev.title}`, html)
    if (result.ok) {
      console.log(
        `Cron rappel envoyé (${ev.slug}, campagne ${result.campaignId})`,
      )
    } else {
      console.error(`Cron rappel échoué (${ev.slug}):`, result.error)
    }
  }
}

// Digest mensuel : le 1er du mois, tous les événements publiés du mois.
export async function runDigest(): Promise<void> {
  const from = brusselsMidnightUtc(0, true)
  const to = brusselsMidnightUtc(1, true)
  const events = await fetchEventsBetween(from, to)
  if (!events.length) return

  const label = monthFmt.format(from)
  const html = buildNewsletterHtml(
    `Voici les événements didgeridoo de ${label} en Belgique.`,
    events,
    SITE_ORIGIN,
  )
  const result = await sendCampaign(
    `Les événements didgeridoo de ${label}`,
    html,
  )
  if (result.ok) {
    console.log(`Cron digest envoyé (${label}, campagne ${result.campaignId})`)
  } else {
    console.error(`Cron digest échoué (${label}):`, result.error)
  }
}

// ponytail: garde anti-doublon en mémoire, un redéploiement après l'heure
// d'envoi peut renvoyer le même jour; persister lastRunDay si ça arrive.
let lastRunDay = ''

async function tick(): Promise<void> {
  const now = new Date()
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now)
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now),
  )
  if (hour < CRON_HOUR || day === lastRunDay) return
  lastRunDay = day

  try {
    await runReminders()
    if (day.endsWith('-01')) await runDigest()
  } catch (err) {
    console.error('Cron échoué:', err)
  }
}

export function startCron(): void {
  setInterval(tick, 60_000)
  console.log(`Cron e-mails actif (${CRON_HOUR}h ${TZ})`)
}

// Déclenchement manuel : bun run src/cron.ts reminders|digest
if (import.meta.main) {
  const job = process.argv[2]
  if (job === 'reminders') await runReminders()
  else if (job === 'digest') await runDigest()
  else console.error('Usage: bun run src/cron.ts reminders|digest')
}
