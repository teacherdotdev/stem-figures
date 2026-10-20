// The economics behind Cost and Revenue Curves: one firm's costs from a
// single cubic total cost, TC(q) = F + aq − bq² + cq³, so marginal cost,
// average variable cost, average total cost and average fixed cost all come
// from the same four numbers and every textbook relationship holds exactly:
// MC crosses AVC and ATC at their lowest points, and ATC − AVC = AFC
// shrinks as output grows. Teachers set the costs by what they see (where
// ATC bottoms out, how steeply MC rises, how much fixed cost there is),
// which are solved here for a, b, c and F. Then what a firm does with them:
// a price taker producing where P = MC, or a firm facing a straight demand
// curve producing where MR = MC, and the outcomes regulators or long-run
// entry bring about.

/** A firm's total cost, TC(q) = F + aq − bq² + cq³. */
export type Costs = { a: number; b: number; c: number; F: number }

/** What the teacher chooses: where ATC is lowest (`q`, `cost`), MC's slope there, and how much of the cost is fixed (0.1 to 1, of as much as there can be). */
export type CostControls = { q: number; cost: number; slope: number; fixed: number }

/** The lowest MC is ever allowed to dip, so the curves stay well above the quantity axis. */
const MC_FLOOR = 0.6

export const tc = (k: Costs, q: number) => k.F + k.a * q - k.b * q * q + k.c * q * q * q
export const mc = (k: Costs, q: number) => k.a - 2 * k.b * q + 3 * k.c * q * q
export const avc = (k: Costs, q: number) => k.a - k.b * q + k.c * q * q
export const afc = (k: Costs, q: number) => k.F / q
export const atc = (k: Costs, q: number) => avc(k, q) + afc(k, q)

/** Where MC is lowest, and how low. */
export const minMC = (k: Costs) => ({ q: k.b / (3 * k.c), v: k.a - (k.b * k.b) / (3 * k.c) })
/** Where AVC is lowest (the shutdown point), and how low. */
export const minAVC = (k: Costs) => ({ q: k.b / (2 * k.c), v: k.a - (k.b * k.b) / (4 * k.c) })
/** Where ATC is lowest (the break-even point), and how low: where 2cq³ − bq² − F = 0, which is where MC = ATC. */
export function minATC(k: Costs) {
  const f = (q: number) => 2 * k.c * q ** 3 - k.b * q * q - k.F
  let lo = Math.max(k.b / (2 * k.c), 1e-6)
  let hi = lo + 1
  while (f(hi) < 0) hi *= 2
  for (let n = 0; n < 100; n++) {
    const m = (lo + hi) / 2
    if (f(m) < 0) lo = m
    else hi = m
  }
  const q = (lo + hi) / 2
  return { q, v: atc(k, q) }
}

/**
 * The costs a teacher's controls make, and what had to give to keep them on
 * the graph. With u = q − (where MC is lowest): fixed cost is a share of
 * the most it can be (5/18 · slope · q, past which AVC loses its dip),
 * which sets u = q / (3 − 5·fixed/3); MC's slope at q is 6cu; and F, a and b
 * follow from MC = ATC = cost there.
 */
export function costsOf(want: CostControls): { costs: Costs; slope: number; notes: string[] } {
  const notes: string[] = []
  const q = want.q
  const u = q / (3 - (5 * want.fixed) / 3)
  // MC is lowest at cost − slope·u/2; too steep a rise from too low a cost would dip it below the axis.
  const most = (2 * (want.cost - MC_FLOOR)) / u
  let slope = want.slope
  if (slope > most + 1e-9) {
    slope = Math.max(0.05, most)
    notes.push('MC is drawn less steep than chosen, so it stays above the quantity axis. Raise the lowest cost or lower the fixed cost to make it steeper.')
  }
  const c = slope / (6 * u)
  const qm = q - u
  const b = 3 * c * qm
  const g = (5 / 18) * want.fixed * slope * q
  const F = g * q
  const a = want.cost + 3 * c * q * (2 * qm - q)
  return { costs: { a, b, c, F }, slope, notes }
}

/** The quantity where MC reaches `level` on its rising side, or null if MC never gets that high (or low). */
export function onRisingMC(k: Costs, level: number): number | null {
  // 3cq² − 2bq + (a − level) = 0, the larger root.
  const disc = k.b * k.b - 3 * k.c * (k.a - level)
  if (disc < 0) return null
  const q = (k.b + Math.sqrt(disc)) / (3 * k.c)
  return q > 0 ? q : null
}

/** A straight demand curve, P = top − slope·q, and its marginal revenue, top − 2·slope·q. */
export type Demand = { top: number; slope: number }
export const priceOn = (d: Demand, q: number) => d.top - d.slope * q
export const mrOn = (d: Demand, q: number) => d.top - 2 * d.slope * q

/** What a firm does at a price and its costs: how much, and the profit or loss. */
export type Outcome = { q: number; p: number; atc: number; profit: number }

/**
 * A price taker at price `p`: it produces where P = MC on MC's rising side,
 * unless the price is below the lowest AVC, when it shuts down (q = 0) and
 * loses its fixed cost.
 */
export function priceTaker(k: Costs, p: number): Outcome & { shutdown: boolean } {
  const lowest = minAVC(k)
  if (p < lowest.v - 1e-9) return { q: 0, p, atc: NaN, profit: -k.F, shutdown: true }
  // At the lowest AVC itself the firm is indifferent; it's drawn producing there.
  const q = Math.max(onRisingMC(k, p) ?? lowest.q, lowest.q)
  return { q, p, atc: atc(k, q), profit: (p - atc(k, q)) * q, shutdown: false }
}

/** Where MR = MC for a firm facing demand `d`, on MC's rising side, or null if MR never reaches MC. */
export function mrEqualsMC(k: Costs, d: Demand): number | null {
  // a − 2bq + 3cq² = top − 2·slope·q  →  3cq² + 2(slope − b)q + (a − top) = 0, the larger root.
  const B = 2 * (d.slope - k.b)
  const disc = B * B - 12 * k.c * (k.a - d.top)
  if (disc < 0) return null
  const q = (-B + Math.sqrt(disc)) / (6 * k.c)
  return q > 0 ? q : null
}

/** A firm with market power facing demand `d`: Q where MR = MC, P read off demand. It shuts down if that price is below AVC there. */
export function priceMaker(k: Costs, d: Demand): (Outcome & { shutdown: boolean }) | null {
  const q = mrEqualsMC(k, d)
  if (q === null) return null
  const p = priceOn(d, q)
  return { q, p, atc: atc(k, q), profit: (p - atc(k, q)) * q, shutdown: p < avc(k, q) - 1e-9 }
}

/** Where demand meets MC (the allocatively efficient, socially optimal point), or null. */
export function demandMeetsMC(k: Costs, d: Demand): number | null {
  // a − 2bq + 3cq² = top − slope·q  →  3cq² + (slope − 2b)q + (a − top) = 0, the larger root.
  const B = d.slope - 2 * k.b
  const disc = B * B - 12 * k.c * (k.a - d.top)
  if (disc < 0) return null
  const q = (-B + Math.sqrt(disc)) / (6 * k.c)
  return q > 0 ? q : null
}

/**
 * Where demand meets ATC (the fair-return point), or null if demand is below
 * ATC everywhere. Of two crossings, the one at the larger quantity and lower
 * price, as a regulator would choose.
 */
export function demandMeetsATC(k: Costs, d: Demand, far = 60): number | null {
  const gap = (q: number) => priceOn(d, q) - atc(k, q)
  const n = 3000
  let found: number | null = null
  let q0 = 1e-3
  let g0 = gap(q0)
  for (let i = 1; i <= n; i++) {
    const q1 = 1e-3 + (far * i) / n
    const g1 = gap(q1)
    if (g0 >= 0 !== g1 >= 0) {
      let lo = q0
      let hi = q1
      for (let m = 0; m < 60; m++) {
        const mid = (lo + hi) / 2
        if (gap(mid) >= 0 === g0 >= 0) lo = mid
        else hi = mid
      }
      found = (lo + hi) / 2
    }
    q0 = q1
    g0 = g1
  }
  return found
}

/** The straight demand curve tangent to ATC at `q`: same height and slope there, so the firm's best is zero profit. */
export function tangentAt(k: Costs, q: number): Demand {
  const slope = -(-k.b + 2 * k.c * q - k.F / (q * q))
  return { top: atc(k, q) + slope * q, slope }
}

/**
 * The long-run demand curve for a monopolistically competitive firm:
 * tangent to ATC left of its lowest point, where it meets the price axis
 * near `top` (so it stays on the graph), and no closer to ATC's lowest
 * point than `most` of the way there.
 */
export function longRunDemand(k: Costs, top: number, most = 0.85): { q: number; d: Demand } {
  const bottom = minATC(k).q
  // The tangent's intercept falls from very high (near q = 0, where AFC is huge) to ATC's lowest cost at its lowest point.
  let lo = bottom * 0.05
  let hi = bottom * most
  if (tangentAt(k, hi).top >= top) return { q: hi, d: tangentAt(k, hi) }
  for (let n = 0; n < 80; n++) {
    const m = (lo + hi) / 2
    if (tangentAt(k, m).top > top) lo = m
    else hi = m
  }
  const q = (lo + hi) / 2
  return { q, d: tangentAt(k, q) }
}
