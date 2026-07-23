// Ouverture/fermeture d'un popover : clic sur le déclencheur, clic
// extérieur et Escape pour fermer. Partagé par le menu compte et le
// menu de navigation mobile.

export function initMenuToggle(trigger: HTMLElement, menu: HTMLElement): void {
  const close = () => {
    menu.hidden = true
    trigger.setAttribute('aria-expanded', 'false')
  }
  trigger.addEventListener('click', (e) => {
    e.stopPropagation()
    menu.hidden = !menu.hidden
    trigger.setAttribute('aria-expanded', String(!menu.hidden))
  })
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !menu.contains(e.target as Node)) close()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close()
  })
}
