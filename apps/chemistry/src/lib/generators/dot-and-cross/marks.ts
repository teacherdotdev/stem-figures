// The marks that tell whose electron is whose: dots, crosses, then open
// circles and open squares for a third and fourth kind of atom. Each atom or
// ion is given one by its index here (its owner); Swap trades dots and
// crosses. Black unless the teacher turns on color, so copies print well.

export const MARK_KINDS = ['dot', 'cross', 'circle', 'square'] as const
export type MarkKind = (typeof MARK_KINDS)[number]

export const MARK_NAMES: Record<MarkKind, [string, string]> = {
  dot: ['dot', 'dots'],
  cross: ['cross', 'crosses'],
  circle: ['open circle', 'open circles'],
  square: ['open square', 'open squares'],
}

export const MARK_COLORS: Record<MarkKind, string> = {
  dot: '#1f5fbf',
  cross: '#c62f28',
  circle: '#2f8a4c',
  square: '#7a4bbd',
}

export const INK = '#111'

/** An owner's mark, with dots and crosses traded when swapped. */
export const markOf = (owner: number, swap: boolean): MarkKind => MARK_KINDS[swap && owner < 2 ? 1 - owner : owner]

/** "a dot", "3 crosses". */
export function markCount(kind: MarkKind, n: number) {
  const [one, many] = MARK_NAMES[kind]
  return n === 1 ? `1 ${one}` : `${n} ${many}`
}
