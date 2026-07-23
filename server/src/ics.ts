// Génération ICS partagée entre l'export par événement et le flux global.

export type IcsEvent = {
  id: string
  title: string
  slug: string
  start: string
  end?: string
  location?: string
  description?: string
}

// Pocketbase renvoie "YYYY-MM-DD HH:mm:ss.sssZ" (espace), pas un ISO strict.
export function parseDate(raw: string): Date {
  return new Date(raw.replace(' ', 'T'))
}

export function toIcsDate(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

function icsEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// Pliage RFC 5545 : 75 octets max par ligne, sans couper un caractère UTF-8.
function foldLine(line: string): string {
  const enc = new TextEncoder()
  const bytes = enc.encode(line)
  if (bytes.length <= 75) return line
  const dec = new TextDecoder()
  const out: string[] = []
  let pos = 0
  let limit = 75
  while (pos < bytes.length) {
    let cut = Math.min(pos + limit, bytes.length)
    while (cut < bytes.length && (bytes[cut]! & 0xc0) === 0x80) cut--
    out.push(dec.decode(bytes.slice(pos, cut)))
    pos = cut
    limit = 74
  }
  return out.join('\r\n ')
}

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000

export function buildVEvent(
  ev: IcsEvent,
  origin: string,
  stripDescription: (html: string) => string,
): string[] {
  const start = toIcsDate(parseDate(ev.start))
  const end = ev.end
    ? toIcsDate(parseDate(ev.end))
    : toIcsDate(new Date(parseDate(ev.start).getTime() + DEFAULT_DURATION_MS))
  const descSource = ev.description ? stripDescription(ev.description) : ''

  const lines = [
    'BEGIN:VEVENT',
    `UID:${ev.id}@didgeridoo-belgium`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(ev.title)}`,
  ]
  if (ev.location) lines.push(`LOCATION:${icsEscape(ev.location)}`)
  if (descSource) lines.push(`DESCRIPTION:${icsEscape(descSource)}`)
  lines.push(`URL:${origin}/evenements/${ev.slug}`, 'END:VEVENT')
  return lines
}

export function buildCalendar(eventLines: string[][], name?: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//didgeridoo-belgium//evenements//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  if (name) {
    lines.push(`X-WR-CALNAME:${icsEscape(name)}`, `NAME:${icsEscape(name)}`)
  }
  lines.push(...eventLines.flat(), 'END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}
