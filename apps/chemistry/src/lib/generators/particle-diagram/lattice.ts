// A lattice: a square grid of atoms or ions for a solid (see CONTEXT.md
// "Lattice"). Touching lattices are spaced so the closest pairs just meet,
// whatever the two sizes; which sites get the second kind comes from the
// seed, like a scattered layout.

import { RADIUS, type Disc, type Look } from '$shared/particles/particles'
import { seededRandom } from '$shared/particles/random'

export const LATTICE_PATTERNS = ['pure', 'alternate', 'substitute', 'interstitial'] as const
export type LatticePattern = (typeof LATTICE_PATTERNS)[number]

export const LATTICE_SPACINGS = ['touching', 'spaced'] as const
export type LatticeSpacing = (typeof LATTICE_SPACINGS)[number]

export interface LatticeOptions {
  pattern: LatticePattern
  rows: number
  columns: number
  spacing: LatticeSpacing
  main: Look
  second: Look
  /** second atoms placed, for substitutional and interstitial */
  secondCount: number
  seed: number
}

/** How many second atoms a lattice has room for: any site when swapping,
 *  any gap between four when filling gaps. */
export function latticeRoom(o: Pick<LatticeOptions, 'pattern' | 'rows' | 'columns'>) {
  if (o.pattern === 'substitute') return o.rows * o.columns
  if (o.pattern === 'interstitial') return Math.max(0, o.rows - 1) * Math.max(0, o.columns - 1)
  return 0
}

/** `n` of the places 0 … total − 1, picked at random. */
function pick(total: number, n: number, random: () => number) {
  const order = Array.from({ length: total }, (_, i) => i)
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return new Set(order.slice(0, n))
}

/** The distance between neighboring sites. */
function pitch(o: LatticeOptions) {
  const rm = RADIUS[o.main.size]
  const rs = RADIUS[o.second.size]
  const gap = o.spacing === 'spaced' ? 0.7 * Math.max(rm, rs) : 0
  switch (o.pattern) {
    case 'pure':
      return 2 * rm + gap
    // Unlike neighbors meet along a row, and like ones across the diagonal.
    case 'alternate':
      return Math.max(rm + rs, Math.SQRT2 * Math.max(rm, rs)) + gap
    case 'substitute':
      return 2 * Math.max(rm, rs) + gap
    // A gap's atom is half a diagonal from each of its four neighbors.
    case 'interstitial':
      return Math.max(2 * rm, Math.SQRT2 * (rm + rs)) + gap
  }
}

/** The lattice's discs with its top left corner at (0, 0), its size, and how
 *  many of the second atoms asked for had no room. */
export function lattice(o: LatticeOptions) {
  const step = pitch(o)
  const random = seededRandom(o.seed)
  // only swapped or alternating second atoms reach the lattice's edge
  const edge = o.pattern === 'pure' || o.pattern === 'interstitial' ? RADIUS[o.main.size] : Math.max(RADIUS[o.main.size], RADIUS[o.second.size])
  const disc = (look: Look, col: number, row: number): Disc => ({ ...look, r: RADIUS[look.size], x: edge + col * step, y: edge + row * step })

  const swapped = o.pattern === 'substitute' ? pick(o.rows * o.columns, o.secondCount, random) : new Set<number>()
  const discs: Disc[] = []
  for (let row = 0; row < o.rows; row++) {
    for (let col = 0; col < o.columns; col++) {
      const second = o.pattern === 'alternate' ? (row + col) % 2 === 1 : swapped.has(row * o.columns + col)
      discs.push(disc(second ? o.second : o.main, col, row))
    }
  }
  if (o.pattern === 'interstitial') {
    const across = o.columns - 1
    const gaps = pick(latticeRoom(o), o.secondCount, random)
    for (const g of [...gaps].sort((a, b) => a - b)) discs.push(disc(o.second, (g % across) + 0.5, Math.floor(g / across) + 0.5))
  }

  const size = (n: number) => 2 * edge + (n - 1) * step
  const room = o.pattern === 'substitute' || o.pattern === 'interstitial' ? latticeRoom(o) : Infinity
  return { discs, width: size(o.columns), height: size(o.rows), missing: Math.max(0, o.secondCount - room) }
}
