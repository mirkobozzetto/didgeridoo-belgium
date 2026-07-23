// Source unique du style des groupes d'actions segmentés (pilule « matière »,
// même langage que le CTA : dégradé, relief haut, contour fin). Consommée par
// les atomes ui/Pill*.astro et par les cartes générées en JS (admin).
// Littéraux complets : Tailwind scanne ce fichier.
// Règle : pilule segmentée = actions de même poids ; un CTA hiérarchisé
// reste un bouton solo (lib/button-styles).

export type PillSegmentKind = 'default' | 'danger'

// Segments pleine hauteur : l'extrême gauche/droite reprend l'arrondi du
// groupe (first:/last:), les centraux restent rectangulaires ; le fill et
// le contour du hover épousent donc la forme de base, jamais une pilule
// dans la pilule. Séparateurs pleine hauteur.
export function pillGroup(): string {
  return (
    'inline-flex items-stretch overflow-hidden rounded-full text-[13.5px] font-semibold text-stone-700 ' +
    'bg-gradient-to-b from-white to-stone-50 ' +
    'shadow-[inset_0_1px_0_rgb(255_255_255/0.9),inset_0_0_0_1px_rgb(28_25_23/0.10),0_1px_2px_rgb(28_25_23/0.06)]'
  )
}

const SEGMENT_BASE =
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap px-5 py-2.5 ' +
  'first:rounded-l-full last:rounded-r-full ' +
  'transition-[background,color,box-shadow] duration-200 disabled:opacity-60'

const SEGMENT_HOVER: Record<PillSegmentKind, string> = {
  default:
    'hover:bg-gradient-to-b hover:from-brand-50 hover:to-brand-100 hover:text-brand-700 ' +
    'hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.6),inset_0_0_0_1px_rgb(194_65_12/0.40)]',
  danger:
    'text-red-600 hover:bg-gradient-to-b hover:from-red-50 hover:to-red-100 ' +
    'hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.6),inset_0_0_0_1px_rgb(220_38_38/0.45)]',
}

export function pillSegment(kind: PillSegmentKind = 'default'): string {
  return `${SEGMENT_BASE} ${SEGMENT_HOVER[kind]}`
}

// État sélectionné (filtres, onglets) : le style du hover, en permanent.
export function pillSegmentActive(): string {
  return (
    `${SEGMENT_BASE} bg-gradient-to-b from-brand-50 to-brand-100 text-brand-700 ` +
    'shadow-[inset_0_1px_0_rgb(255_255_255/0.6),inset_0_0_0_1px_rgb(194_65_12/0.40)]'
  )
}

export function pillSep(): string {
  return 'my-1.5 w-px flex-none self-stretch bg-stone-900/10'
}
