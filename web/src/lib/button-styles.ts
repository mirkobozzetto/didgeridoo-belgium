// Source unique du style des boutons (pilule). Consommée par l'atome
// ui/Button.astro, les templates Astro et les boutons générés en JS
// (cartes admin). Littéraux complets : Tailwind scanne ce fichier.

export type BtnVariant =
  'primary' | 'dark' | 'outline' | 'subtle' | 'danger' | 'whatsapp'
export type BtnSize = 'xs' | 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:translate-y-px disabled:opacity-60'

const RAISED =
  'shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_1px_2px_rgb(0_0_0/0.1)]'

const VARIANTS: Record<BtnVariant, string> = {
  primary: `bg-gradient-to-b from-brand-500 to-brand-600 text-white ${RAISED} hover:from-brand-600 hover:to-brand-700`,
  dark: `bg-gradient-to-b from-stone-800 to-stone-900 text-white ${RAISED} hover:from-stone-700 hover:to-stone-800`,
  outline:
    'bg-white text-stone-700 ring-1 ring-inset ring-stone-900/10 hover:text-brand-700 hover:ring-brand-300',
  subtle: 'bg-stone-100 text-stone-700 hover:bg-stone-200',
  danger: `bg-red-600 text-white ${RAISED} hover:bg-red-700`,
  whatsapp: `bg-[#25D366] text-white ${RAISED} hover:brightness-95`,
}

const SIZES: Record<BtnSize, string> = {
  xs: 'px-3.5 py-2 text-[13px]',
  sm: 'px-4 py-2.5 text-[14px]',
  md: 'px-5 py-2.5 text-[14px]',
  lg: 'px-5 py-3.5 text-[15px]',
}

export function btn(variant: BtnVariant, size: BtnSize = 'md'): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}`
}
