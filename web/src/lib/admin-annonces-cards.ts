import { fromPbDate } from './pb'
import { sanitize } from './sanitize'
import { btn } from './button-styles'
import { pillGroup, pillSegment, pillSep } from './pill-styles'
import { detailRow, inlineError } from './admin-cards'
import {
  annonceCategoryLabel,
  annoncePhotoUrl,
  type AnnonceRecord,
} from './annonces'

// Rendu des cartes de modération d'annonces. La logique d'appel API vit dans
// la page (lib/admin-api) ; ici uniquement du DOM.

export interface AnnonceCardActions {
  patch(id: string, body: Record<string, string>): Promise<string | null>
  onChange(): void
}

function categoryBadge(ann: AnnonceRecord): HTMLSpanElement {
  const badge = document.createElement('span')
  badge.className =
    'shrink-0 rounded-full bg-stone-100 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-600 ring-1 ring-inset ring-stone-200'
  badge.textContent = annonceCategoryLabel(ann.category)
  return badge
}

function photosStrip(ann: AnnonceRecord): HTMLDivElement | null {
  if (!ann.photos?.length) return null
  const strip = document.createElement('div')
  strip.className = 'flex gap-2 overflow-x-auto'
  for (const photo of ann.photos) {
    const img = document.createElement('img')
    img.src = annoncePhotoUrl(ann, photo, '200x200')
    img.alt = `Photo : ${ann.title}`
    img.loading = 'lazy'
    img.className = 'h-24 w-24 shrink-0 rounded-lg object-cover'
    strip.appendChild(img)
  }
  return strip
}

export function annoncePendingCard(
  ann: AnnonceRecord,
  actions: AnnonceCardActions,
): HTMLElement {
  const card = document.createElement('article')
  card.className =
    'overflow-hidden rounded-2xl bg-white shadow-[0_2px_4px_rgb(0_0_0/0.04),0_16px_40px_-24px_rgb(28_25_23/0.35)] ring-1 ring-stone-900/5'

  const body = document.createElement('div')
  body.className = 'flex flex-col gap-4 p-5'

  const head = document.createElement('div')
  head.className = 'flex items-start justify-between gap-3'
  const titleWrap = document.createElement('div')
  titleWrap.className = 'min-w-0'
  const title = document.createElement('h3')
  title.className =
    'balance text-[17px] font-bold leading-snug tracking-tight text-stone-900'
  title.textContent = ann.title
  titleWrap.appendChild(title)
  const author = ann.expand?.author
  if (author?.name || author?.email) {
    const line = document.createElement('p')
    line.className = 'mt-0.5 text-[12.5px] text-stone-500'
    line.textContent = [author?.name, author?.email].filter(Boolean).join(' · ')
    titleWrap.appendChild(line)
  }
  head.append(titleWrap, categoryBadge(ann))
  body.appendChild(head)

  const strip = photosStrip(ann)
  if (strip) body.appendChild(strip)

  const grid = document.createElement('div')
  grid.className = 'grid grid-cols-1 gap-3 sm:grid-cols-2'
  if (ann.price) grid.appendChild(detailRow('Prix', ann.price))
  if (ann.contact_email)
    grid.appendChild(detailRow('Contact', ann.contact_email))
  body.appendChild(grid)

  if (ann.description) {
    const desc = document.createElement('div')
    desc.className =
      'rte-desc pretty text-[13.5px] leading-relaxed text-stone-600'
    desc.innerHTML = sanitize(ann.description)
    body.appendChild(desc)
  }

  const actionsRow = document.createElement('div')
  actionsRow.className = 'border-t border-stone-900/[0.06] pt-4'

  const group = document.createElement('div')
  group.className = pillGroup()

  const approve = document.createElement('button')
  approve.type = 'button'
  approve.className = pillSegment()
  approve.textContent = 'Publier 45 jours'

  const sep = document.createElement('span')
  sep.className = pillSep()
  sep.setAttribute('aria-hidden', 'true')

  const rejectToggle = document.createElement('button')
  rejectToggle.type = 'button'
  rejectToggle.className = pillSegment()
  rejectToggle.textContent = 'Refuser'

  group.append(approve, sep, rejectToggle)
  actionsRow.append(group)
  body.appendChild(actionsRow)

  const rejectBox = document.createElement('div')
  rejectBox.hidden = true
  rejectBox.className = 'flex flex-col gap-2'
  const reasonInput = document.createElement('textarea')
  reasonInput.rows = 3
  reasonInput.placeholder = "Motif du refus (communiqué à l'auteur)"
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
    const err = await actions.patch(ann.id, { status: 'published' })
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
    const err = await actions.patch(ann.id, {
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

export interface ReportedGroup {
  annonce: AnnonceRecord
  count: number
  reasons: string[]
  signalementIds: string[]
}

export interface ReportedRowActions {
  unpublish(group: ReportedGroup): Promise<string | null>
  ignore(group: ReportedGroup): Promise<string | null>
  onChange(): void
}

export function reportedRow(
  group: ReportedGroup,
  actions: ReportedRowActions,
): HTMLElement {
  const row = document.createElement('div')
  row.className =
    'flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4'

  const head = document.createElement('div')
  head.className = 'flex items-start justify-between gap-3'

  const info = document.createElement('div')
  info.className = 'min-w-0'
  const title = document.createElement('p')
  title.className = 'truncate text-[14px] font-semibold text-stone-900'
  title.textContent = group.annonce.title
  const meta = document.createElement('p')
  meta.className = 'mt-0.5 text-[12px] text-stone-500'
  meta.textContent = [
    annonceCategoryLabel(group.annonce.category),
    group.annonce.published_at
      ? `publiée le ${fromPbDate(group.annonce.published_at)}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ')
  info.append(title, meta)

  const count = document.createElement('span')
  count.className =
    'shrink-0 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800 ring-1 ring-inset ring-amber-300'
  count.textContent = `${group.count} signalement${group.count > 1 ? 's' : ''}`

  head.append(info, count)
  row.appendChild(head)

  const reasons = group.reasons.filter(Boolean)
  if (reasons.length) {
    const list = document.createElement('ul')
    list.className =
      'list-disc pl-5 text-[12.5px] leading-relaxed text-stone-600'
    for (const reason of reasons) {
      const li = document.createElement('li')
      li.textContent = reason
      list.appendChild(li)
    }
    row.appendChild(list)
  }

  const actionsRow = document.createElement('div')
  actionsRow.className =
    'no-scrollbar max-w-full overflow-x-auto overscroll-x-contain pt-1'

  const pill = document.createElement('div')
  pill.className = pillGroup()

  const view = document.createElement('a')
  view.href = `/annonce?id=${group.annonce.id}`
  view.target = '_blank'
  view.rel = 'noopener'
  view.className = pillSegment()
  view.textContent = "Voir l'annonce"

  const unpublish = document.createElement('button')
  unpublish.type = 'button'
  unpublish.className = pillSegment('danger')
  unpublish.textContent = 'Dépublier'

  const ignore = document.createElement('button')
  ignore.type = 'button'
  ignore.className = pillSegment()
  ignore.textContent = 'Ignorer les signalements'

  unpublish.addEventListener('click', async () => {
    unpublish.disabled = true
    const err = await actions.unpublish(group)
    if (err) {
      unpublish.disabled = false
      inlineError(row, err)
      return
    }
    actions.onChange()
  })

  ignore.addEventListener('click', async () => {
    ignore.disabled = true
    const err = await actions.ignore(group)
    if (err) {
      ignore.disabled = false
      inlineError(row, err)
      return
    }
    actions.onChange()
  })

  const mkSep = () => {
    const sep = document.createElement('span')
    sep.className = pillSep()
    sep.setAttribute('aria-hidden', 'true')
    return sep
  }
  pill.append(view, mkSep(), unpublish, mkSep(), ignore)
  actionsRow.append(pill)
  row.appendChild(actionsRow)
  return row
}
