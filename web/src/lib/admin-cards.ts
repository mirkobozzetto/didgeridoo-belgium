import { API_BASE, fromPbDate } from './pb'
import { sanitize } from './sanitize'
import { btn } from './button-styles'

export interface Organizer {
  name?: string
  email?: string
}

export interface Session {
  date: string
  start: string
  end: string | null
}

export interface EventRecord {
  id: string
  title: string
  category?: string
  start: string
  end?: string
  location?: string
  description?: string
  price?: string
  contact?: string
  registration_url?: string
  poster?: string
  status: string
  rejection_reason?: string
  sessions?: Session[]
  expand?: { organizer?: Organizer }
}

export const CATEGORIES: Record<string, string> = {
  stage: 'Stage',
  concert: 'Concert',
  festival: 'Festival',
  rencontre: 'Rencontre',
  autre: 'Autre',
}

export function posterUrl(ev: EventRecord): string | null {
  if (!ev.poster) return null
  return `${API_BASE}/pb/api/files/events/${ev.id}/${ev.poster}`
}

const sessionDayFmt = new Intl.DateTimeFormat('fr-BE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Brussels',
})

export function formatSession(s: Session): string {
  const d = new Date(`${s.date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return s.date
  const day = sessionDayFmt.format(d)
  const cap = day.charAt(0).toUpperCase() + day.slice(1)
  const time = s.end ? `${s.start} - ${s.end}` : `dès ${s.start}`
  return `${cap} · ${time}`
}

function sessionsRow(sessions: Session[]): HTMLDivElement {
  const row = document.createElement('div')
  row.className = 'flex flex-col sm:col-span-2'
  const l = document.createElement('span')
  l.className =
    'text-[10.5px] font-semibold uppercase tracking-[0.14em] text-stone-400'
  l.textContent = sessions.length > 1 ? 'Dates' : 'Date'
  row.appendChild(l)
  for (const s of sessions) {
    const v = document.createElement('span')
    v.className = 'mt-0.5 text-[13.5px] text-stone-700'
    v.textContent = formatSession(s)
    row.appendChild(v)
  }
  return row
}

export function detailRow(label: string, value: string): HTMLDivElement {
  const row = document.createElement('div')
  row.className = 'flex flex-col'
  const l = document.createElement('span')
  l.className =
    'text-[10.5px] font-semibold uppercase tracking-[0.14em] text-stone-400'
  l.textContent = label
  const v = document.createElement('span')
  v.className = 'mt-0.5 text-[13.5px] text-stone-700'
  v.textContent = value
  row.append(l, v)
  return row
}

export function inlineError(container: HTMLElement, msg: string) {
  let el = container.querySelector('[data-err]') as HTMLParagraphElement | null
  if (!el) {
    el = document.createElement('p')
    el.dataset.err = 'true'
    el.className = 'mt-2 text-[13px] text-red-600'
    container.appendChild(el)
  }
  el.textContent = msg
}

export interface PendingCardActions {
  patchStatus(id: string, body: Record<string, string>): Promise<string | null>
  onChange(): void
}

export function pendingCard(
  ev: EventRecord,
  actions: PendingCardActions,
): HTMLElement {
  const card = document.createElement('article')
  card.className =
    'overflow-hidden rounded-2xl bg-white shadow-[0_2px_4px_rgb(0_0_0/0.04),0_16px_40px_-24px_rgb(28_25_23/0.35)] ring-1 ring-stone-900/5'

  const src = posterUrl(ev)
  if (src) {
    const img = document.createElement('img')
    img.src = src
    img.alt = `Affiche : ${ev.title}`
    img.loading = 'lazy'
    img.className = 'max-h-72 w-full object-cover'
    card.appendChild(img)
  }

  const body = document.createElement('div')
  body.className = 'flex flex-col gap-4 p-5'

  const head = document.createElement('div')
  head.className = 'flex items-start justify-between gap-3'
  const titleWrap = document.createElement('div')
  titleWrap.className = 'min-w-0'
  const title = document.createElement('h3')
  title.className =
    'balance text-[17px] font-bold leading-snug tracking-tight text-stone-900'
  title.textContent = ev.title
  titleWrap.appendChild(title)
  const org = ev.expand?.organizer
  if (org?.name || org?.email) {
    const orgLine = document.createElement('p')
    orgLine.className = 'mt-0.5 text-[12.5px] text-stone-500'
    orgLine.textContent = [org?.name, org?.email].filter(Boolean).join(' · ')
    titleWrap.appendChild(orgLine)
  }
  head.appendChild(titleWrap)
  if (ev.category) {
    const badge = document.createElement('span')
    badge.className =
      'shrink-0 rounded-full bg-stone-100 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-600 ring-1 ring-inset ring-stone-200'
    badge.textContent = CATEGORIES[ev.category] ?? ev.category
    head.appendChild(badge)
  }
  body.appendChild(head)

  const grid = document.createElement('div')
  grid.className = 'grid grid-cols-1 gap-3 sm:grid-cols-2'
  if (Array.isArray(ev.sessions) && ev.sessions.length) {
    grid.appendChild(sessionsRow(ev.sessions))
  } else {
    grid.appendChild(detailRow('Début', fromPbDate(ev.start)))
    if (ev.end) grid.appendChild(detailRow('Fin', fromPbDate(ev.end)))
  }
  if (ev.location) grid.appendChild(detailRow('Lieu', ev.location))
  if (ev.price) grid.appendChild(detailRow('Prix', ev.price))
  if (ev.contact) grid.appendChild(detailRow('Contact', ev.contact))
  body.appendChild(grid)

  if (ev.description) {
    const desc = document.createElement('div')
    desc.className =
      'rte-desc pretty text-[13.5px] leading-relaxed text-stone-600'
    desc.innerHTML = sanitize(ev.description)
    body.appendChild(desc)
  }

  if (ev.registration_url) {
    const link = document.createElement('a')
    link.href = ev.registration_url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.className =
      'text-[13px] font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700'
    link.textContent = "Lien d'inscription"
    body.appendChild(link)
  }

  const actionsRow = document.createElement('div')
  actionsRow.className =
    'flex flex-wrap items-center gap-3 border-t border-stone-900/[0.06] pt-4'

  const approve = document.createElement('button')
  approve.type = 'button'
  approve.className = btn('primary', 'xs')
  approve.textContent = 'Approuver'

  const rejectToggle = document.createElement('button')
  rejectToggle.type = 'button'
  rejectToggle.className = btn('subtle', 'xs')
  rejectToggle.textContent = 'Refuser'

  actionsRow.append(approve, rejectToggle)
  body.appendChild(actionsRow)

  const rejectBox = document.createElement('div')
  rejectBox.hidden = true
  rejectBox.className = 'flex flex-col gap-2'
  const reasonInput = document.createElement('textarea')
  reasonInput.rows = 3
  reasonInput.placeholder = "Motif du refus (communiqué à l'organisateur)"
  reasonInput.className =
    'rounded-xl border border-stone-200 bg-stone-50 p-3 text-[14px] leading-relaxed text-stone-900 outline-none focus:border-brand-400'
  const confirmReject = document.createElement('button')
  confirmReject.type = 'button'
  confirmReject.className = `${btn('danger', 'xs')} self-start`
  confirmReject.textContent = 'Confirmer le refus'
  rejectBox.append(reasonInput, confirmReject)
  body.appendChild(rejectBox)

  approve.addEventListener('click', async () => {
    approve.disabled = true
    const err = await actions.patchStatus(ev.id, { status: 'published' })
    if (err) {
      approve.disabled = false
      inlineError(body, err)
      return
    }
    actions.onChange()
  })

  rejectToggle.addEventListener('click', () => {
    rejectBox.hidden = !rejectBox.hidden
    if (!rejectBox.hidden) reasonInput.focus()
  })

  confirmReject.addEventListener('click', async () => {
    confirmReject.disabled = true
    const err = await actions.patchStatus(ev.id, {
      status: 'rejected',
      rejection_reason: reasonInput.value.trim(),
    })
    if (err) {
      confirmReject.disabled = false
      inlineError(body, err)
      return
    }
    actions.onChange()
  })

  card.appendChild(body)
  return card
}

export function compactRow(
  ev: EventRecord,
  action?: { label: string; run: () => Promise<void> },
): HTMLElement {
  const row = document.createElement('div')
  row.className =
    'flex items-start justify-between gap-3 rounded-xl border border-stone-200 p-3'

  const info = document.createElement('div')
  info.className = 'min-w-0'
  const title = document.createElement('p')
  title.className = 'truncate text-[14px] font-semibold text-stone-900'
  title.textContent = ev.title
  const meta = document.createElement('p')
  meta.className = 'mt-0.5 text-[12px] text-stone-500'
  meta.textContent = [fromPbDate(ev.start), ev.location]
    .filter(Boolean)
    .join(' · ')
  info.append(title, meta)
  row.appendChild(info)

  if (ev.status === 'rejected' && ev.rejection_reason) {
    const reason = document.createElement('p')
    reason.className = 'mt-1 text-[12px] text-red-600'
    reason.textContent = `Motif : ${ev.rejection_reason}`
    info.appendChild(reason)
  }

  if (action) {
    const actionBtn = document.createElement('button')
    actionBtn.type = 'button'
    actionBtn.className = `${btn('subtle', 'xs')} shrink-0`
    actionBtn.textContent = action.label
    actionBtn.addEventListener('click', async () => {
      actionBtn.disabled = true
      await action.run()
    })
    row.appendChild(actionBtn)
  }

  return row
}
