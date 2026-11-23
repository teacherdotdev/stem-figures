// The kinetics Rate Law Graphs draws: one reactant, A → products, with
// rate = k[A]ⁿ for n = 0, 1 or 2. Each order's integrated rate law makes one
// graph against time a straight line: [A] for zero order, ln[A] for first,
// 1/[A] for second. Also here: the half-lives, the unit of k, and the data
// points a student would be given, scattered from a seed so a link redraws
// the same figure (Chemistry's ADR 0002).

import { seededRandom } from '$shared/particles/random'
import type { ConcUnit, TimeUnit } from '$lib/shared/concentration'

export type Order = 0 | 1 | 2

/** The three graphs against time: [A], ln[A] and 1/[A]. */
export const PLOTS = ['conc', 'ln', 'inv'] as const
export type Plot = (typeof PLOTS)[number]

/** The graph that is a straight line for each order. */
export const STRAIGHT: Record<Order, Plot> = { 0: 'conc', 1: 'ln', 2: 'inv' }

/** When a zero-order reaction ends ([A] reaches 0); the other orders never do. */
export const endTime = (order: Order, a0: number, k: number) => (order === 0 ? a0 / k : Infinity)

/** [A] at time t, from the integrated rate law: [A]₀ − kt, [A]₀e^(−kt) or 1/(1/[A]₀ + kt). */
export function concentration(order: Order, a0: number, k: number, t: number) {
  if (order === 0) return Math.max(0, a0 - k * t)
  if (order === 1) return a0 * Math.exp(-k * t)
  return a0 / (1 + k * a0 * t)
}

/** What a graph plots for a concentration: [A], ln[A] or 1/[A]. Nothing for ln or 1/ of zero. */
export function plotted(plot: Plot, a: number): number | null {
  if (plot === 'conc') return a
  if (!(a > 0)) return null
  return plot === 'ln' ? Math.log(a) : 1 / a
}

/** When [A] has fallen to `share` of [A]₀. */
export function timeAtShare(order: Order, a0: number, k: number, share: number) {
  if (order === 0) return (a0 * (1 - share)) / k
  if (order === 1) return -Math.log(share) / k
  return (1 / share - 1) / (k * a0)
}

/**
 * When each of the first n half-lives ends: [A] = [A]₀/2, [A]₀/4, [A]₀/8…
 * Zero order's are each half as long as the last, first order's are all
 * ln 2 / k, second order's are each twice the last.
 */
export const halfLifeTimes = (order: Order, a0: number, k: number, n: number) =>
  Array.from({ length: n }, (_, i) => timeAtShare(order, a0, k, 0.5 ** (i + 1)))

/** The first half-life: [A]₀/2k, ln 2/k or 1/(k[A]₀). */
export const firstHalfLife = (order: Order, a0: number, k: number) => timeAtShare(order, a0, k, 0.5)

/** The k that gives an order this first half-life, so changing the order keeps it. */
export function kForHalfLife(order: Order, a0: number, half: number) {
  if (order === 0) return a0 / (2 * half)
  if (order === 1) return Math.LN2 / half
  return 1 / (half * a0)
}

/** The unit of 1/[A] as an axis writes it: M⁻¹, L/mol, dm³ mol⁻¹. */
export const INVERSE_UNITS: Record<ConcUnit, string> = { M: 'M⁻¹', 'mol/L': 'L/mol', 'mol dm⁻³': 'dm³ mol⁻¹' }

/** The unit of k: concentration per time, per time, or per concentration per time. */
export function kUnit(order: Order, conc: ConcUnit, time: TimeUnit) {
  const perTime = `${time}⁻¹`
  if (order === 1) return perTime
  const zero: Record<ConcUnit, string> = { M: 'M', 'mol/L': 'mol L⁻¹', 'mol dm⁻³': 'mol dm⁻³' }
  const second: Record<ConcUnit, string> = { M: 'M⁻¹', 'mol/L': 'L mol⁻¹', 'mol dm⁻³': 'dm³ mol⁻¹' }
  return `${(order === 0 ? zero : second)[conc]} ${perTime}`
}

/** A number rounded to `figures` significant figures. */
export const sig = (v: number, figures = 3) => (v === 0 || !Number.isFinite(v) ? v : Number(v.toPrecision(figures)))

/** A number written to three significant figures, its zeros kept, with a true minus sign: "1.00", "0.0513", "−2.30", "1230". */
export function sigText(v: number, figures = 3) {
  if (v === 0) return '0'
  const r = sig(v, figures)
  const decimals = Math.max(0, figures - 1 - Math.floor(Math.log10(Math.abs(r))))
  return r.toFixed(Math.min(decimals, 12)).replace('-', '−')
}

/**
 * A natural log to the decimal places the rule for logarithms gives it: as
 * many as the significant figures of the concentration it's taken of, three.
 */
export const LN_DECIMALS = 3

/** ln[A] rounded to LN_DECIMALS places, never −0. */
export const lnRound = (v: number) => Number(v.toFixed(LN_DECIMALS)) || 0

/** ln[A] written to LN_DECIMALS places with a true minus sign: "0.000", "−0.062", "−2.303". */
export const lnText = (v: number) => lnRound(v).toFixed(LN_DECIMALS).replace('-', '−')

/** One data point: its time, [A] as measured (rounded), and ln[A] and 1/[A] worked out from that. */
export type DataPoint = { t: number; conc: number; ln: number | null; inv: number | null }

/** Steps data are taken at: 1, 1.2, 1.5, 2… times a power of ten. */
const TIDY = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8]

/**
 * The times of `count` data points from 0 towards `until`, evenly spaced: to
 * `until` exactly when that spacing is a plain number (120 s in 6 steps of
 * 20), and otherwise at the plain spacing just under it (7 steps of 15, not
 * of 17.14…), so the table's times are ones a student could have measured at.
 */
export function dataTimes(until: number, count: number) {
  const exact = until / (count - 1)
  let step = sig(exact, 2)
  if (Math.abs(step - exact) > exact * 1e-9) {
    const power = 10 ** Math.floor(Math.log10(exact))
    step = Math.max(...TIDY.map((m) => m * power).filter((v) => v <= exact * (1 + 1e-9)))
  }
  return Array.from({ length: count }, (_, i) => Number((i * step).toPrecision(10)))
}

/** A random number from the standard normal distribution (Box–Muller). */
function normal(random: () => number) {
  const u = Math.max(random(), 1e-12)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}

/**
 * The data a student is given: at each time, the model's [A] scattered by
 * `noise` percent of itself (normally, from the seed) and rounded to three
 * significant figures, with ln[A] and 1/[A] worked out from that rounded
 * [A] as the student would: ln[A] to three decimal places (the rule for
 * logs) and 1/[A] to three significant figures. The first is
 * [A]₀ exactly, and none are made after a zero-order reaction has ended.
 */
export function dataPoints(order: Order, a0: number, k: number, times: number[], noise = 0, seed = 1): DataPoint[] {
  const random = seededRandom(seed)
  const end = endTime(order, a0, k)
  const out: DataPoint[] = []
  times.forEach((t, i) => {
    // Every time takes its random number, so the points kept don't depend on where the reaction ends.
    const z = normal(random)
    if (t > end * (1 + 1e-9)) return
    const model = concentration(order, a0, k, t)
    const conc = sig(i === 0 ? a0 : Math.max(0, model * (1 + (noise / 100) * z)))
    const of = (plot: Plot) => {
      const v = plotted(plot, conc)
      return v === null ? null : plot === 'ln' ? lnRound(v) : sig(v)
    }
    out.push({ t, conc, ln: of('ln'), inv: of('inv') })
  })
  return out
}

/** How straight a set of points is: r² of the best line through them (1 for a perfect line), or null with fewer than 3 points. */
export function rSquared(xs: number[], ys: number[]): number | null {
  const n = xs.length
  if (n < 3) return null
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my)
    sxx += (xs[i] - mx) ** 2
    syy += (ys[i] - my) ** 2
  }
  if (sxx === 0 || syy === 0) return null
  return (sxy * sxy) / (sxx * syy)
}

/** r² of each graph's points against time. */
export function straightness(points: DataPoint[]): Record<Plot, number | null> {
  const of = (plot: Plot) => {
    const kept = points.filter((p) => p[plot] !== null)
    return rSquared(kept.map((p) => p.t), kept.map((p) => p[plot]!))
  }
  return { conc: of('conc'), ln: of('ln'), inv: of('inv') }
}
