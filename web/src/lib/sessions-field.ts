// Logique du champ multi-dates (lignes de session + popover calendrier Cally).
// Contrat DOM : #sessions, #session-template, #add-session, #date-popover,
// #date-calendar (voir SessionsField.astro et DatePopover.astro).

export interface Session {
  date: string
  start: string
  end: string | null
}

export interface SessionsField {
  addSessionRow(session?: Session): void
  rows(): { date: string; start: string; end: string }[]
}

const QUARTER_SLOTS: string[] = []
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '15', '30', '45']) {
    QUARTER_SLOTS.push(`${String(h).padStart(2, '0')}:${m}`)
  }
}

const dateFmt = new Intl.DateTimeFormat('fr-BE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function formatSessionDate(iso: string): string {
  if (!iso) return 'Choisir une date'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return 'Choisir une date'
  return dateFmt.format(d)
}

export function initSessionsField(): SessionsField {
  const sessionsList = document.getElementById('sessions') as HTMLDivElement
  const sessionTemplate = document.getElementById(
    'session-template',
  ) as HTMLTemplateElement
  const addSessionBtn = document.getElementById(
    'add-session',
  ) as HTMLButtonElement
  const popover = document.getElementById('date-popover') as HTMLDivElement
  const calendar = document.getElementById('date-calendar') as HTMLElement & {
    value: string
  }

  function setDate(dateBtn: HTMLButtonElement, iso: string) {
    dateBtn.dataset.date = iso
    dateBtn.textContent = formatSessionDate(iso)
    dateBtn.classList.toggle('text-stone-400', !iso)
    dateBtn.classList.toggle('text-stone-900', !!iso)
  }

  function updateRemoveVisibility() {
    const rows = sessionsList.querySelectorAll('[data-session]')
    for (const row of Array.from(rows)) {
      const btn = row.querySelector('[data-remove]') as HTMLElement
      btn.hidden = rows.length <= 1
    }
  }

  function fillTimeOptions(select: HTMLSelectElement, optional: boolean) {
    const first = document.createElement('option')
    first.value = ''
    first.textContent = optional ? '-' : 'Début'
    if (!optional) {
      first.disabled = true
      first.selected = true
    }
    select.appendChild(first)
    for (const slot of QUARTER_SLOTS) {
      const opt = document.createElement('option')
      opt.value = slot
      opt.textContent = slot
      select.appendChild(opt)
    }
  }

  function setTimeValue(select: HTMLSelectElement, value: string) {
    if (!value) return
    // valeur héritée hors quart d'heure : on la garde telle quelle
    if (!QUARTER_SLOTS.includes(value)) {
      const opt = document.createElement('option')
      opt.value = value
      opt.textContent = value
      select.appendChild(opt)
    }
    select.value = value
  }

  function addSessionRow(session?: Session) {
    const frag = sessionTemplate.content.cloneNode(true) as DocumentFragment
    const row = frag.querySelector('[data-session]') as HTMLDivElement
    const dateBtn = row.querySelector('[data-date-btn]') as HTMLButtonElement
    const startEl = row.querySelector('[data-start]') as HTMLSelectElement
    const endEl = row.querySelector('[data-end]') as HTMLSelectElement
    const removeBtn = row.querySelector('[data-remove]') as HTMLButtonElement

    fillTimeOptions(startEl, false)
    fillTimeOptions(endEl, true)
    setDate(dateBtn, session?.date ?? '')
    setTimeValue(startEl, session?.start ?? '')
    setTimeValue(endEl, session?.end ?? '')

    dateBtn.addEventListener('click', () => openPopover(dateBtn))
    removeBtn.addEventListener('click', () => {
      row.remove()
      updateRemoveVisibility()
    })

    sessionsList.appendChild(row)
    updateRemoveVisibility()
  }

  addSessionBtn.addEventListener('click', () => addSessionRow())

  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
    today.getDate(),
  )}`
  calendar.setAttribute('min', todayIso)
  calendar.setAttribute('today', todayIso)

  let activeBtn: HTMLButtonElement | null = null

  function positionPopover(btn: HTMLButtonElement) {
    const r = btn.getBoundingClientRect()
    const maxLeft = window.innerWidth - popover.offsetWidth - 8
    const left = Math.max(8, Math.min(r.left, maxLeft))
    popover.style.left = `${left}px`
    popover.style.top = `${r.bottom + 6}px`
  }

  function openPopover(btn: HTMLButtonElement) {
    activeBtn = btn
    const current = btn.dataset.date ?? ''
    calendar.value = current
    if (current) calendar.setAttribute('focused-date', current)
    else calendar.removeAttribute('focused-date')
    popover.hidden = false
    positionPopover(btn)
  }

  function closePopover() {
    popover.hidden = true
    activeBtn = null
  }

  calendar.addEventListener('change', () => {
    if (!activeBtn) return
    setDate(activeBtn, calendar.value)
    closePopover()
  })

  document.addEventListener('click', (e) => {
    if (popover.hidden) return
    const t = e.target as Node
    if (popover.contains(t) || (activeBtn && activeBtn.contains(t))) return
    closePopover()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popover.hidden) closePopover()
  })
  window.addEventListener(
    'scroll',
    () => {
      if (!popover.hidden) closePopover()
    },
    true,
  )
  window.addEventListener('resize', () => {
    if (!popover.hidden) closePopover()
  })

  function rows(): { date: string; start: string; end: string }[] {
    return Array.from(sessionsList.querySelectorAll('[data-session]')).map(
      (row) => ({
        date:
          (row.querySelector('[data-date-btn]') as HTMLElement).dataset.date ??
          '',
        start: (row.querySelector('[data-start]') as HTMLSelectElement).value,
        end: (row.querySelector('[data-end]') as HTMLSelectElement).value,
      }),
    )
  }

  return { addSessionRow, rows }
}
