// The chemistry of an equilibrium graph, with no drawing in it: a reversible
// reaction settling to equilibrium from its starting concentrations, then
// answering each stress. The graph is solved from K, never drawn from typed
// levels, so its lines always move in the ratio of the coefficients and
// every level stretch gives the K it should.
//
// Between stresses one number moves, the extent ξ: each concentration is its
// start plus coefficient × ξ (reactants minus). Where it settles is the ξ
// with Q = K, found by bisection. How it gets there is the textbook teaching
// model, the reaction taken as elementary:
//   dξ/dt = k_f · Π[reactant]^coef − k_r · Π[product]^coef,  k_f / k_r = K
// stepped with RK4. k_f is set once, so the first approach is within 1% of
// equilibrium at the time the teacher gives.

/** How close to equilibrium counts as settled: within this share of the stretch's whole change. */
export const SETTLED = 0.01

/** A reaction as the model sees it: each species' coefficient, minus for a reactant. */
export type Coefs = readonly number[]

export type Stress =
  /** a species (by its place in the equation) added or removed, in mol/L */
  | { kind: 'add' | 'remove'; at: number; species: number; amount: number }
  /** the volume multiplied by `factor`: every concentration is divided by it */
  | { kind: 'volume'; at: number; factor: number }
  /** the temperature raised or lowered: K is multiplied by `kFactor`, and the approach runs `speed` times as fast */
  | { kind: 'temperature'; at: number; kFactor: number; speed: number }

export type Shift = 'forward' | 'reverse' | 'none'

/** One stretch of the graph: from the start or a stress to the next stress or the end. */
export interface Stretch {
  from: number
  to: number
  k: number
  /** the concentrations the stretch starts from, just after its stress */
  start: number[]
  /** the equilibrium concentrations it heads for */
  equilibrium: number[]
  /** which way the reaction runs to get there */
  shift: Shift
  /** when it first comes within 1% of equilibrium; null if the stretch ends first */
  settledAt: number | null
  /** the concentrations where the stretch ends: its equilibrium ones, if it settled before the next stress */
  end: number[]
  /** sampled points: the time and every concentration, the first at `from` and the last at `to` */
  samples: { t: number; c: number[] }[]
  /** how much of a removal was more than was there (0 when it all came out) */
  short: number
}

export interface Run {
  stretches: Stretch[]
  /** false when nothing can react: a reactant and a product both at zero */
  reacts: boolean
}

const at = (start: readonly number[], coefs: Coefs, xi: number) => start.map((c, i) => Math.max(0, c + coefs[i] * xi))

/** The reaction quotient Q at these concentrations. */
export function quotient(c: readonly number[], coefs: Coefs) {
  return c.reduce((q, ci, i) => q * ci ** coefs[i], 1)
}

/** The extents that would use up a product (the low end, 0 or less) and a reactant (the high end, 0 or more). */
function limits(start: readonly number[], coefs: Coefs): [number, number] {
  let lo = -Infinity
  let hi = Infinity
  coefs.forEach((v, i) => {
    if (v > 0) lo = Math.max(lo, -start[i] / v)
    else if (v < 0) hi = Math.min(hi, start[i] / -v)
  })
  return [Math.min(0, lo), Math.max(0, hi)]
}

/**
 * Where the reaction settles from `start`: the extent at which Q = K. ln Q
 * rises steadily with the extent, from −∞ where a product runs out to +∞
 * where a reactant does, so there is exactly one, found by bisection. 0 when
 * nothing can react.
 */
export function settle(start: readonly number[], coefs: Coefs, k: number): { xi: number; equilibrium: number[] } {
  const [lo, hi] = limits(start, coefs)
  if (!(hi > lo) || !(k > 0)) return { xi: 0, equilibrium: [...start] }
  const lnK = Math.log(k)
  const lnQ = (xi: number) => coefs.reduce((sum, v, i) => sum + v * Math.log(Math.max(start[i] + v * xi, 1e-300)), 0)
  let a = lo
  let b = hi
  for (let n = 0; n < 200 && b - a > 1e-16 * Math.max(1, Math.abs(a), Math.abs(b)); n++) {
    const mid = (a + b) / 2
    if (lnQ(mid) < lnK) a = mid
    else b = mid
  }
  const xi = (a + b) / 2
  return { xi, equilibrium: at(start, coefs, xi) }
}

/** The forward rate less the reverse rate at these concentrations. */
export function netRate(c: readonly number[], coefs: Coefs, kf: number, k: number) {
  let forward = kf
  let reverse = kf / k
  coefs.forEach((v, i) => {
    if (v < 0) forward *= c[i] ** -v
    else if (v > 0) reverse *= c[i] ** v
  })
  return forward - reverse
}

/**
 * The extent as time passes, from 0 toward `target`, never past it (one
 * number moving under a rate that depends only on it can't overshoot). Each
 * step is short enough for RK4 to follow the approach however fast or slow
 * it is: a fiftieth of the time the gap would take to close at the present
 * rate. `visit` is called at each of `times` (rising, from 0) with the extent
 * then; it returns the time the extent first came within `SETTLED` of the
 * target, or null.
 */
function approach(
  start: readonly number[], coefs: Coefs, kf: number, k: number, target: number,
  times: readonly number[], visit: (t: number, xi: number) => void,
): number | null {
  const f = (xi: number) => netRate(at(start, coefs, xi), coefs, kf, k)
  const whole = Math.abs(target)
  const close = whole * SETTLED
  let xi = 0
  let t = 0
  let settledAt: number | null = whole === 0 ? 0 : null
  for (const next of times) {
    let steps = 0
    while (t < next) {
      const gap = target - xi
      const rate = f(xi)
      // Arrived (as near as numbers go), or the rate no longer points at the target.
      if (Math.abs(gap) <= whole * 1e-13 || rate * gap <= 0 || ++steps > 200000) {
        xi = target
        t = next
        break
      }
      const h = Math.min(next - t, (0.02 * Math.abs(gap)) / Math.abs(rate))
      const k1 = rate
      const k2 = f(xi + (h / 2) * k1)
      const k3 = f(xi + (h / 2) * k2)
      const k4 = f(xi + h * k3)
      let stepped = xi + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4)
      if ((target - stepped) * gap < 0) stepped = target
      // The moment it came within 1%, between this step's ends.
      if (settledAt === null && Math.abs(target - stepped) <= close) {
        const before = Math.abs(gap)
        const after = Math.abs(target - stepped)
        settledAt = t + h * (before === after ? 1 : (before - close) / (before - after))
      }
      xi = stepped
      t += h
    }
    visit(next, xi)
  }
  return settledAt
}

/**
 * The forward rate constant that brings the first approach within 1% of
 * equilibrium at `established`: time runs as 1/k_f, so it's found from one
 * run at k_f = 1. When the mixture starts at equilibrium there's no approach
 * to time, and it's set from how fast a small push away would die out.
 */
export function rateConstant(start: readonly number[], coefs: Coefs, k: number, established: number): number {
  const { xi } = settle(start, coefs, k)
  const [lo, hi] = limits(start, coefs)
  if (!(hi > lo)) return 1
  if (Math.abs(xi) > 1e-9 * (hi - lo)) {
    const took = approach(start, coefs, 1, k, xi, [Number.MAX_VALUE], () => {})
    if (took && Number.isFinite(took)) return took / established
  }
  const eq = at(start, coefs, xi)
  const d = 1e-6 * (hi - lo)
  const pushed = Math.abs(netRate(at(eq, coefs, d), coefs, 1, k) - netRate(at(eq, coefs, -d), coefs, 1, k)) / (2 * d)
  return pushed > 0 ? Math.log(1 / SETTLED) / (pushed * established) : 1
}

/** The concentrations just after a stress, and how much of a removal wasn't there to take. */
function stressed(c: readonly number[], stress: Stress): { c: number[]; short: number } {
  if (stress.kind === 'volume') return { c: c.map((v) => v / stress.factor), short: 0 }
  if (stress.kind === 'temperature') return { c: [...c], short: 0 }
  const out = [...c]
  const change = stress.kind === 'add' ? stress.amount : -stress.amount
  const short = Math.max(0, -(out[stress.species] + change))
  out[stress.species] = Math.max(0, out[stress.species] + change)
  return { c: out, short }
}

/** How many points a graph's whole width is sampled at. */
const SAMPLES = 720

/**
 * The whole graph: the mixture settling from `start`, then each stress (in
 * order of time; one at or before 0, or after `until`, is left out) and the
 * shift that answers it, sampled from time 0 to `until`.
 */
export function run(
  { coefs, start, k, established, stresses }: { coefs: Coefs; start: readonly number[]; k: number; established: number; stresses: readonly Stress[] },
  until: number,
): Run {
  const [lo, hi] = limits(start, coefs)
  const reacts = hi > lo
  let kf = rateConstant(start, coefs, k, established)
  let kNow = k
  let c = [...start]
  let short = 0
  const ordered = stresses.filter((s) => s.at > 0 && s.at <= until).sort((a, b) => a.at - b.at)
  const stretches: Stretch[] = []
  const dt = until / SAMPLES
  for (let n = 0; n <= ordered.length; n++) {
    const from = n ? ordered[n - 1].at : 0
    const to = n < ordered.length ? ordered[n].at : Math.max(until, from)
    const { xi, equilibrium } = settle(c, coefs, kNow)
    const [a, b] = limits(c, coefs)
    const shift: Shift = Math.abs(xi) <= 1e-9 * Math.max(b - a, 1e-300) ? 'none' : xi > 0 ? 'forward' : 'reverse'
    const target = shift === 'none' ? 0 : xi
    // Sample times within the stretch, on the whole graph's even spacing, ending exactly at its end.
    const times: number[] = []
    for (let j = Math.floor(from / dt + 1e-9) + 1; j * dt < to - 1e-9 * dt; j++) times.push(j * dt - from)
    if (to > from) times.push(to - from)
    const origin = c
    const samples = [{ t: from, c: [...origin] }]
    const settledAt = approach(origin, coefs, kf, kNow, target, times, (t, x) => samples.push({ t: from + t, c: at(origin, coefs, x) }))
    // A stretch that has settled is taken as at equilibrium when the next
    // stress comes: the last 1% of its approach is less than a line's width,
    // and each shift is then worked out from a true equilibrium.
    if (n < ordered.length && settledAt !== null && shift !== 'none') samples.at(-1)!.c = [...equilibrium]
    const end = samples.at(-1)!.c
    stretches.push({
      from, to, k: kNow, start: [...origin], equilibrium: shift === 'none' ? [...origin] : equilibrium, shift,
      settledAt: settledAt === null ? null : from + settledAt, end, samples, short,
    })
    if (n < ordered.length) {
      const stress = ordered[n]
      const next = stressed(end, stress)
      c = next.c
      short = next.short
      if (stress.kind === 'temperature') {
        // Both rate constants rise with heating and fall with cooling, their ratio moving to the new K.
        const ratio = Math.sqrt(stress.kFactor)
        kf *= stress.speed * ratio
        kNow *= stress.kFactor
      }
    }
  }
  return { stretches, reacts }
}
