// The biology of the figure, worked out from the concentrations: which side
// is hypertonic, which way water and each solute that can cross move, and
// what happens to the cell, the levels or the bag. Only solutes that can't
// cross count toward tonicity; one that can cross moves until it's the same
// on both sides, and doesn't change the answer. In v1 a solute is one
// particle per unit typed: NaCl isn't split into two ions.

import { seededRandom } from '$shared/particles/random'
import { isCell, solutesOf, twoSided, type OsmosisSettings, type Scene, type SoluteSettings } from './settings'

export type Tonicity = 'hypertonic' | 'hypotonic' | 'isotonic'

/** Which side something moves to: into the cell or bag (or side A), out of
 *  it (or to side B), or neither. */
export type Flow = 'in' | 'out' | 'none'

/** Totals closer than this, relative to the larger, count as equal, so
 *  0.1 + 0.2 and 0.3 are isotonic. */
const SAME = 1e-9

/** The concentration of solutes that can't cross, on one side. */
export const osmotic = (solutes: Pick<SoluteSettings, 'cross' | 'inside' | 'outside'>[], side: 'inside' | 'outside') =>
  solutes.filter((x) => !x.cross).reduce((sum, x) => sum + x[side], 0)

/** How the outside (or side B) compares with the inside (or side A). */
export function tonicityOf(inside: number, outside: number): Tonicity {
  if (Math.abs(outside - inside) <= SAME * Math.max(Math.abs(inside), Math.abs(outside))) return 'isotonic'
  return outside > inside ? 'hypertonic' : 'hypotonic'
}

/** The other side's tonicity: side A is hypotonic to a hypertonic side B. */
export const opposite = (t: Tonicity): Tonicity => (t === 'hypertonic' ? 'hypotonic' : t === 'hypotonic' ? 'hypertonic' : 'isotonic')

/** Net water movement, from the hypotonic side to the hypertonic side:
 *  into the cell when the outside is hypotonic. */
export const waterFlow = (t: Tonicity): Flow => (t === 'hypotonic' ? 'in' : t === 'hypertonic' ? 'out' : 'none')

/** A solute that can cross moves from higher to lower concentration; one
 *  that can't, or that is already even, doesn't. */
export function soluteFlow(x: Pick<SoluteSettings, 'cross' | 'inside' | 'outside'>): Flow {
  if (!x.cross || tonicityOf(x.inside, x.outside) === 'isotonic') return 'none'
  return x.inside > x.outside ? 'out' : 'in'
}

/** What a scene ends as, for the outside's (or side B's) tonicity. */
export type Outcome =
  | 'crenated' | 'normal' | 'swollen' | 'burst'
  | 'plasmolyzed' | 'flaccid' | 'turgid'
  | 'rises-a' | 'level' | 'rises-b'
  | 'swells' | 'same' | 'shrinks'

export function outcomeOf(scene: Scene, t: Tonicity, burst = false): Outcome {
  if (scene === 'blood') return t === 'hypertonic' ? 'crenated' : t === 'isotonic' ? 'normal' : burst ? 'burst' : 'swollen'
  if (scene === 'plant') return t === 'hypertonic' ? 'plasmolyzed' : t === 'isotonic' ? 'flaccid' : 'turgid'
  if (twoSided(scene)) return t === 'hypertonic' ? 'rises-b' : t === 'isotonic' ? 'level' : 'rises-a'
  return t === 'hypertonic' ? 'shrinks' : t === 'isotonic' ? 'same' : 'swells'
}

/** The result as printed under it. */
export const OUTCOME_WORDS: Record<Outcome, string> = {
  crenated: 'Shrinks (crenated)',
  normal: 'Normal',
  swollen: 'Swells',
  burst: 'Bursts (lysed)',
  plasmolyzed: 'Plasmolyzed',
  flaccid: 'Flaccid',
  turgid: 'Turgid',
  'rises-a': 'Level rises on side A',
  level: 'Levels stay the same',
  'rises-b': 'Level rises on side B',
  swells: 'Bag swells',
  same: 'Bag stays the same',
  shrinks: 'Bag shrinks',
}

/** How strongly the two sides differ, from 0 (the same) to 1 (one is pure
 *  water), for how far a level rises or a bag swells. */
export function difference(inside: number, outside: number) {
  const total = inside + outside
  return total > 0 ? Math.abs(outside - inside) / total : 0
}

/** One picture of the scene: each solute's concentration on each side, the
 *  outside's tonicity, and its letter in a three-up. */
export interface Panel {
  solutes: SoluteSettings[]
  tonicity: Tonicity
  outcome: Outcome
  /** how strongly the sides differ (see difference) */
  strength: number
  /** A, B or C in a three-up */
  letter?: string
  /** which of THREE_FACTORS a three-up's cell has, whatever its place */
  slot?: number
}

/** What each of a three-up's cells has outside, as a share of the inside:
 *  half (hypotonic), the same (isotonic) and double (hypertonic). */
export const THREE_FACTORS = [0.5, 1, 2] as const

/** The three-up's order: hypotonic, isotonic, hypertonic, or shuffled from
 *  its own seed, so shuffling the particles never changes the order. Never
 *  the in-order one when shuffled, so a shuffle always shuffles. */
export function threeOrder(s: Pick<OsmosisSettings, 'order' | 'orderSeed'>): number[] {
  if (s.order === 'in-order') return [0, 1, 2]
  const orders = [[0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]
  return orders[Math.floor(seededRandom(s.orderSeed)() * orders.length)]
}

function panelOf(s: OsmosisSettings, solutes: SoluteSettings[], letter?: string, slot?: number): Panel {
  const inside = osmotic(solutes, 'inside')
  const outside = osmotic(solutes, 'outside')
  const tonicity = tonicityOf(inside, outside)
  return { solutes, tonicity, outcome: outcomeOf(s.scene, tonicity, s.burst), strength: difference(inside, outside), letter, slot }
}

/** The scene as typed, or a three-up's three cells, each with every
 *  solute's outside worked out from its inside. */
export function panelsOf(s: OsmosisSettings): Panel[] {
  const solutes = solutesOf(s)
  if (s.view !== 'three' || !isCell(s.scene)) return [panelOf(s, solutes)]
  return threeOrder(s).map((k, i) =>
    panelOf(
      s,
      solutes.map((x) => ({ ...x, outside: round(x.inside * THREE_FACTORS[k]) })),
      'ABC'[i],
      k,
    ),
  )
}

const round = (n: number) => Math.round(n * 1e6) / 1e6

/** A concentration as printed: "0.9%", "0.5 M", "300 mM". */
export function amount(n: number, unit: OsmosisSettings['unit']) {
  const v = String(round(n))
  return unit === '%' ? `${v}%` : `${v} ${unit}`
}
