// How fast a plant photosynthesizes, from the light intensity I, the CO₂
// concentration C (in %) and the temperature T (in °C), in arbitrary units
// of rate. The graphs show the textbook shapes; the numbers are drawn to
// look like a school practical, not fitted to a real plant.
//
// The light-limited rate is αI: a straight line from the origin, its slope
// the same whatever the CO₂ or temperature. The capacity, the fastest the
// plant's enzymes can fix CO₂, is Amax·f(T)·C / (Kc + C), where f(T) is
// Enzyme Activity's temperature curve (rateAtTemperature), so a rubisco
// working best at 30 °C rises and denatures just as the enzymes there do.
// The rate is the lower of the two, joined by a non-rectangular hyperbola,
//   θP² − (J + A)P + JA = 0,
// whose curvature θ close to 1 gives the textbook straight rise and sharp
// bend while staying smooth: P is the smaller root.
//
// Respiration R(T) doubles every 10 °C. The net rate, P − R, is what the
// bubbles from pondweed and a gas analyser measure: below 0 in the dark,
// and 0 at the compensation point.
//
// In a closed chamber the CO₂ changes as dC/dt = k(R − P(I, C, T)): in the
// dark it rises in a straight line, at the light compensation point it stays
// level, and in bright light it falls until photosynthesis has used so much
// that it only keeps up with respiration, the CO₂ compensation point. The O₂
// changes by the same amount the other way (about one O₂ for each CO₂).

import { denaturedAbove, rateAtTemperature } from '../enzyme-activity/model'

/** The light-limited rate per unit of light intensity. */
export const ALPHA = 0.25
/** The capacity at saturating CO₂ and the best temperature. */
export const AMAX = 25
/** The CO₂ concentration (%) at which the capacity is half its most. */
export const KC = 0.1
/** How sharp the bend from light-limited to the plateau is: 1 is a corner. */
export const THETA = 0.995
/** Rubisco's optimum temperature (°C), and how many degrees its rate takes to double as it warms. */
export const T_OPT = 30
export const T_WIDTH = 10
/** Respiration at 25 °C, and the temperature it doubles every. */
export const R25 = 1.5
const R_Q10_STEP = 10
/** The light intensity 10 cm from the lamp; it falls as 1/d². */
export const LAMP = 100 * 10 ** 2
/** How fast the CO₂ in the chamber changes, in % a minute per unit of rate. */
export const CHAMBER_K = 0.0006
/** The share of its plateau a curve has reached where it counts as levelled off. */
export const SATURATED = 0.95
/** Air: about 0.04 % CO₂ and 21 % O₂. */
export const AIR = { co2: 0.04, o2: 21 }

/** The temperature factor, 0 to 1: 1 at the optimum, 0 once rubisco has denatured. */
export const warmth = (t: number) => rateAtTemperature(t, T_OPT, T_WIDTH)
/** Where, warming, rubisco has denatured and photosynthesis stops. */
export const DENATURED_AT = denaturedAbove(T_OPT, T_WIDTH)

/** The fastest the plant can fix CO₂ at concentration c (%) and temperature t (°C). */
export const capacity = (c: number, t: number) => (AMAX * warmth(t) * Math.max(0, c)) / (KC + Math.max(0, c))

/** The smaller root of θP² − (J + A)P + JA = 0: the two limits joined smoothly. */
export function colimit(j: number, a: number) {
  if (j <= 0 || a <= 0) return 0
  if (!Number.isFinite(j)) return a
  const b = j + a
  return (b - Math.sqrt(Math.max(0, b * b - 4 * THETA * j * a))) / (2 * THETA)
}

/** The gross rate of photosynthesis at light i, CO₂ c (%) and temperature t (°C). */
export const grossRate = (i: number, c: number, t: number) => colimit(ALPHA * Math.max(0, i), capacity(c, t))

/** The rate of respiration at temperature t (°C). */
export const respiration = (t: number) => R25 * 2 ** ((t - 25) / R_Q10_STEP)

/** Photosynthesis less respiration: what's given off as O₂ or taken in as CO₂. */
export const netRate = (i: number, c: number, t: number) => grossRate(i, c, t) - respiration(t)

/** The light intensity d cm from the lamp. */
export const intensityAt = (d: number) => (d <= 0 ? Infinity : LAMP / (d * d))
/** How far from the lamp the light is this intense. */
export const distanceFor = (i: number) => Math.sqrt(LAMP / i)

/** The rate as light rises without end: the plateau, set by CO₂ and temperature. */
export const lightPlateau = (c: number, t: number) => capacity(c, t)
/** The rate as CO₂ rises without end: the plateau, set by light and temperature. */
export const co2Plateau = (i: number, t: number) => colimit(ALPHA * i, AMAX * warmth(t))

/** The light (J = αI) at which the hyperbola reaches the share `p` of A. */
const lightFor = (p: number, a: number) => (p * a * (a - THETA * p * a)) / (a - p * a)

/** The light intensity at which the rate has levelled off: SATURATED of its plateau. */
export function lightSaturation(c: number, t: number) {
  const a = capacity(c, t)
  return a > 0 ? lightFor(SATURATED, a) / ALPHA : 0
}

/** Where along x an increasing f first reaches `target`, by halving [lo, hi]. */
function solve(f: (x: number) => number, target: number, lo: number, hi: number) {
  if (f(hi) < target) return Infinity
  if (f(lo) >= target) return lo
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2
    if (f(mid) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** The CO₂ concentration (%) at which the rate has levelled off: SATURATED of its plateau, or Infinity. */
export const co2Saturation = (i: number, t: number) => solve((c) => grossRate(i, c, t), SATURATED * co2Plateau(i, t), 0, 100)

/** The light intensity at which photosynthesis just keeps up with respiration: the net rate is 0. */
export function lightCompensation(c: number, t: number) {
  const a = capacity(c, t)
  const r = respiration(t)
  return a > r ? lightFor(r / a, a) / ALPHA : Infinity
}

/** The CO₂ concentration (%) at which photosynthesis just keeps up with respiration, at light i. */
export const co2Compensation = (i: number, t: number) => solve((c) => grossRate(i, c, t), respiration(t), 0, 100)

/** The temperature (°C), to a hundredth, at which a rate is fastest. */
export function fastestAt(rate: (t: number) => number, from = 0, to = 60) {
  let best = from
  for (let t = from; t <= to + 1e-9; t += 0.01) if (rate(t) > rate(best) + 1e-12) best = t
  return Math.round(best * 100) / 100
}

/** One plant in a closed chamber: the light, and the time (minutes) it goes off, if it does. */
export type Chamber = { light: number; temp: number; start: number; minutes: number; offAt?: number }
export type Sample = { t: number; co2: number; o2: number }

/** CO₂ and O₂ (%) in a closed chamber every `step` minutes, worked out in small steps (Runge–Kutta). */
export function chamber({ light, temp, start, minutes, offAt }: Chamber, step = minutes / 300): Sample[] {
  const dcdt = (t: number, c: number) => CHAMBER_K * (respiration(temp) - grossRate(offAt !== undefined && t >= offAt ? 0 : light, c, temp))
  const h = Math.min(0.05, step / 4)
  const out: Sample[] = [{ t: 0, co2: start, o2: AIR.o2 }]
  let c = start
  let t = 0
  let next = step
  // A step ends exactly at the light going off, so the corner is sharp.
  const stops = offAt !== undefined && offAt > 0 && offAt < minutes ? [offAt] : []
  while (t < minutes - 1e-9) {
    const to = Math.min(next, minutes, ...stops.filter((s) => s > t + 1e-9))
    while (t < to - 1e-9) {
      const dt = Math.min(h, to - t)
      const k1 = dcdt(t, c)
      const k2 = dcdt(t + dt / 2, c + (dt / 2) * k1)
      const k3 = dcdt(t + dt / 2, c + (dt / 2) * k2)
      const k4 = dcdt(t + dt, c + dt * k3)
      c = Math.max(0, c + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4))
      t += dt
    }
    out.push({ t, co2: c, o2: AIR.o2 + start - c })
    if (t >= next - 1e-9) next += step
  }
  return out
}
