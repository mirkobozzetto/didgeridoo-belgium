// Indicateur de scroll horizontal pour les barres qui débordent (pilules
// de filtres) : fondu sur le bord où il reste du contenu + fin trait de
// progression brand sous la barre (même langage que le trait de nav).
// Ne s'affiche que si le contenu déborde réellement.

const FADE = 28

export function initScrollHint(scroller: HTMLElement): void {
  if (scroller.dataset.scrollHintInit) return
  scroller.dataset.scrollHintInit = '1'

  const track = document.createElement('div')
  track.className =
    'mt-4 hidden h-[2px] overflow-hidden rounded-full bg-stone-900/[0.06]'
  track.setAttribute('aria-hidden', 'true')
  const thumb = document.createElement('div')
  thumb.className =
    'h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600'
  track.appendChild(thumb)
  scroller.insertAdjacentElement('afterend', track)

  const update = () => {
    const max = scroller.scrollWidth - scroller.clientWidth
    if (max <= 1) {
      track.classList.add('hidden')
      scroller.style.maskImage = ''
      scroller.style.webkitMaskImage = ''
      return
    }
    track.classList.remove('hidden')

    const x = scroller.scrollLeft
    const ratio = scroller.clientWidth / scroller.scrollWidth
    thumb.style.width = `${Math.max(ratio * 100, 12)}%`
    thumb.style.marginLeft = `${(x / max) * (100 - Math.max(ratio * 100, 12))}%`

    // Fondu uniquement du côté où il reste du contenu.
    const left = x > 4 ? `transparent 0, black ${FADE}px` : 'black 0'
    const right =
      x < max - 4
        ? `black calc(100% - ${FADE}px), transparent 100%`
        : 'black 100%'
    const mask = `linear-gradient(to right, ${left}, ${right})`
    scroller.style.maskImage = mask
    scroller.style.webkitMaskImage = mask
  }

  scroller.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
  update()
}
