// Trait de navigation glissant : suit le lien survolé, revient sur l'actif
// (aria-current="page") au mouseleave, posé sans animation au chargement.
// Le style du trait vit dans le markup ([data-nav-slider]) ; ici uniquement
// le comportement.

export function initNavSlider(nav: HTMLElement): void {
  // Plusieurs composants peuvent balayer [data-nav-links] : une seule init.
  if (nav.dataset.navSliderInit) return
  nav.dataset.navSliderInit = '1'
  const slider = nav.querySelector<HTMLElement>('[data-nav-slider]')
  if (!slider) return
  const links = Array.from(nav.querySelectorAll<HTMLElement>('a'))
  if (!links.length) return

  const activeLink = () =>
    nav.querySelector<HTMLElement>('a[aria-current="page"]')

  const moveTo = (el: HTMLElement) => {
    slider.style.left = `${el.offsetLeft}px`
    slider.style.width = `${el.offsetWidth}px`
    slider.style.opacity = '1'
  }

  const rest = () => {
    const active = activeLink()
    if (active) moveTo(active)
    else slider.style.opacity = '0'
  }

  for (const link of links) {
    link.addEventListener('mouseenter', () => moveTo(link))
  }
  nav.addEventListener('mouseleave', rest)
  window.addEventListener('resize', rest)

  // Pose initiale sans glissement visible.
  slider.style.transition = 'none'
  rest()
  requestAnimationFrame(() => {
    slider.style.transition = ''
  })
}
