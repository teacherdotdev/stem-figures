// How fast an enzyme works, as a share of its fastest (0 to 1), against
// temperature, pH or substrate concentration. The graphs show shape only,
// so these are the textbook shapes rather than fits to measured data.
//
// Temperature: the rate doubles every `width` degrees as it warms (Q10 = 2
// when the width is 10 °C), while more and more of the enzyme denatures,
// which takes over just past the optimum and stops it soon after. The
// denaturing is a logistic curve 1/6 of the width wide, centered where the
// two balance at the optimum, so every enzyme's curve is the same shape,
// stretched by its width.
// pH: a bell around the optimum, (1 − d²)², that reaches 0 `width` pH units
// either side, where the enzyme has denatured.
// Substrate concentration: Michaelis–Menten, v = Vmax·S / (Km + S). A
// competitive inhibitor raises Km and a non-competitive one lowers Vmax,
// each by the inhibitor's strength, 1 + [I]/Ki.

/** How much of the rate is left where an enzyme counts as denatured; the temperature curve meets the axis there. */
export const DENATURED = 0.01
/** How steeply the enzyme denatures past the optimum, in widths. */
const STEEP = 6
// Where the denaturing is centered, so the rate's slope is 0 at the optimum.
const SHIFT = Math.log(Math.LN2 / STEEP / (1 - Math.LN2 / STEEP))

/** The rate before it's cut at DENATURED, with x the distance from the optimum in widths: 1 at x = 0. */
const warmth = (x: number) => (2 ** x * (1 + Math.exp(SHIFT))) / (1 + Math.exp(STEEP * x + SHIFT))

/** The rate at temperature t, for an enzyme working best at `opt` whose rate halves `width` degrees below it. */
export function rateAtTemperature(t: number, opt: number, width: number) {
  const r = warmth((t - opt) / width)
  return Math.max(0, (r - DENATURED) / (1 - DENATURED))
}

/** Where, warming past its optimum, the enzyme has denatured and the rate is 0. */
export function denaturedAbove(opt: number, width: number) {
  // The rate only falls past the optimum, so halve the gap to the point.
  let lo = 0
  let hi = 5
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2
    if (warmth(mid) > DENATURED) lo = mid
    else hi = mid
  }
  return opt + hi * width
}

/** The rate at pH p, for an enzyme working best at `opt` that stops `width` pH units either side. */
export function rateAtPH(p: number, opt: number, width: number) {
  const d = (p - opt) / width
  return Math.abs(d) >= 1 ? 0 : (1 - d * d) ** 2
}

/** Where the enzyme has denatured, below and above its optimum pH. */
export const denaturedPH = (opt: number, width: number) => ({ low: opt - width, high: opt + width })

export const INHIBITORS = ['none', 'competitive', 'noncompetitive'] as const
export type Inhibitor = (typeof INHIBITORS)[number]

/** Vmax and Km with an inhibitor of this strength (1 + [I]/Ki), from the enzyme's own. */
export function kinetics(inhibitor: Inhibitor, km: number, strength: number, vmax = 1) {
  if (inhibitor === 'competitive') return { vmax, km: km * strength }
  if (inhibitor === 'noncompetitive') return { vmax: vmax / strength, km }
  return { vmax, km }
}

/** Michaelis–Menten: the rate at substrate concentration s. */
export const rateAtSubstrate = (s: number, k: { vmax: number; km: number }) => (k.vmax * s) / (k.km + s)
