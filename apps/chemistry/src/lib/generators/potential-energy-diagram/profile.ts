// The chemistry behind a potential energy diagram (a reaction energy
// profile): the potential energy of the reacting particles as a reaction
// goes from reactants to products, against the reaction coordinate.
//
// A diagram is built from a list of levels, in order along the reaction:
// the reactants, a transition state, then for each further step an
// intermediate and its transition state, and the products. One step is
// [reactants, transition state, products]; two steps add an intermediate
// and a second transition state.
//
//   ΔH = E(products) − E(reactants): negative for an exothermic reaction.
//   Ea (forward) = E(transition state) − E(the level before it).
//   Ea (reverse) = E(transition state) − E(the level after it) = Ea − ΔH for one step.
//
// A catalyst gives the reaction a lower transition state. The reactants and
// products stay where they are, so ΔH doesn't change, and both activation
// energies drop by the same amount.
//
// The curve between each pair of neighboring levels is a smoothstep,
// a + (b − a)(3u² − 2u³). Its slope is zero at both ends, so each peak is
// exactly its transition state's energy, each dip exactly its intermediate's,
// the runs at the ends are flat, and nothing overshoots. The reaction
// coordinate has no numbers and isn't to scale: each step takes the same
// width, with flat runs at both ends.

/** What a level is: where the reaction starts and ends, a peak, or a dip between steps. */
export type LevelKind = 'reactants' | 'ts' | 'intermediate' | 'products'

/** The most steps a mechanism has. */
export const MAX_STEPS = 3
export const STEP_COUNTS = [1, 2, 3] as const

/** How many steps a list of levels makes: 3 levels are one step, 5 two, 7 three. */
export const stepsOf = (levels: readonly number[]) => (levels.length - 1) / 2

/** Whether a list of levels makes a reaction: 3, 5 or 7 of them. */
export const isLevelCount = (n: number) => n >= 3 && n <= 2 * MAX_STEPS + 1 && n % 2 === 1

/** What the level at `i` of `count` is. */
export function kindOf(i: number, count: number): LevelKind {
  if (i === 0) return 'reactants'
  if (i === count - 1) return 'products'
  return i % 2 === 1 ? 'ts' : 'intermediate'
}

/** One step: its transition state's index in the levels, and the levels either side. */
export type Step = {
  /** the transition state's index in the levels */
  index: number
  /** the energy before the step (reactants or an intermediate), its peak, and after it */
  before: number
  ts: number
  after: number
  /** Ea forward, from the level before; Ea reverse, from the level after */
  ea: number
  eaReverse: number
}

/** Each step of a reaction, in order. */
export function stepsIn(levels: readonly number[]): Step[] {
  const out: Step[] = []
  for (let i = 1; i < levels.length - 1; i += 2) {
    const [before, ts, after] = [levels[i - 1], levels[i], levels[i + 1]]
    out.push({ index: i, before, ts, after, ea: ts - before, eaReverse: ts - after })
  }
  return out
}

/** ΔH: the products' energy less the reactants'. */
export const enthalpyChange = (levels: readonly number[]) => levels[levels.length - 1] - levels[0]

/**
 * The rate-determining step (0 for the first), or null when it isn't clear
 * cut. AP and IB teach it as the step with the highest activation energy;
 * strictly it's the step whose transition state is highest above the lowest
 * point before it. It's named only when the two agree, each picking one
 * step; a one-step reaction has none to name.
 */
export function rateDeterminingStep(levels: readonly number[]): number | null {
  const steps = stepsIn(levels)
  if (steps.length < 2) return null
  const best = (values: number[]) => {
    const top = Math.max(...values)
    const at = values.flatMap((v, k) => (Math.abs(v - top) < 1e-9 ? [k] : []))
    return at.length === 1 ? at[0] : null
  }
  const byEa = best(steps.map((st) => st.ea))
  const bySpan = best(steps.map((st) => st.ts - Math.min(...levels.slice(0, st.index).filter((_, k) => k % 2 === 0))))
  return byEa !== null && byEa === bySpan ? byEa : null
}

/** A catalysed path: the same reactants and products, over one lower transition state. */
export const catalysedLevels = (levels: readonly number[], ts: number) => [levels[0], ts, levels[levels.length - 1]]

/** Where along the reaction coordinate each part of the curve goes, in blocks. */
export type Placement = {
  /** where the flat run at the reactants ends, and where the one at the products starts */
  start: number
  end: number
  /** how wide half a step is: the rise to a transition state, or the fall from it */
  half: number
  /** the length of the reaction coordinate */
  width: number
}

const START = 3 // the flat run at the reactants, in blocks
const END = 4 // the flat run at the products, longer for the ΔH arrow
const HALVES = [4, 3, 2.5] // half a step's width, by the number of steps

/**
 * How a reaction of this many steps is laid along the reaction coordinate;
 * `endRun` makes the flat run at the products longer, for a long ΔH label.
 */
export function placementOf(steps: number, endRun = END): Placement {
  const n = Math.min(MAX_STEPS, Math.max(1, Math.round(steps)))
  const half = HALVES[n - 1]
  const end = START + 2 * n * half
  return { start: START, end, half, width: Math.ceil(end + Math.max(END, endRun) - 1e-9) }
}

/** Where along the reaction coordinate each level is: a plateau's middle, a peak or a dip. */
export function levelXs(levels: readonly number[], p: Placement): number[] {
  const half = (p.end - p.start) / (levels.length - 1)
  return levels.map((_, i) => (i === 0 ? p.start / 2 : i === levels.length - 1 ? (p.end + p.width) / 2 : p.start + i * half))
}

/** The smoothstep from 0 to 1: flat at both ends. */
export const smoothstep = (u: number) => {
  const t = Math.min(1, Math.max(0, u))
  return t * t * (3 - 2 * t)
}

export type Point = { x: number; y: number }

const SAMPLES = 24 // points along each half step

/**
 * The curve through the levels, as points of the graph (x in blocks along
 * the reaction coordinate, y the energy): flat from 0 to `start`, a
 * smoothstep between each pair of neighboring levels, each `half` wide
 * (here the whole run from `start` to `end` shared out equally), then flat
 * to `width`.
 */
export function profilePoints(levels: readonly number[], p: Placement): Point[] {
  if (levels.length < 2) return []
  const half = (p.end - p.start) / (levels.length - 1)
  const pts: Point[] = [{ x: 0, y: levels[0] }]
  for (let i = 1; i < levels.length; i++) {
    const [a, b] = [levels[i - 1], levels[i]]
    const x0 = p.start + (i - 1) * half
    for (let k = 0; k <= SAMPLES; k++) {
      if (k === 0 && i > 1) continue
      const u = k / SAMPLES
      pts.push({ x: x0 + u * half, y: a + (b - a) * smoothstep(u) })
    }
  }
  pts.push({ x: p.width, y: levels[levels.length - 1] })
  return pts
}

/** The curve's energy at x along the reaction coordinate. */
export function energyAt(levels: readonly number[], p: Placement, x: number): number {
  const half = (p.end - p.start) / (levels.length - 1)
  if (x <= p.start) return levels[0]
  if (x >= p.end) return levels[levels.length - 1]
  const i = Math.min(levels.length - 2, Math.floor((x - p.start) / half))
  const u = (x - p.start - i * half) / half
  return levels[i] + (levels[i + 1] - levels[i]) * smoothstep(u)
}
