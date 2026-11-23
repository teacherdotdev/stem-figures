// Fitting a graph's axis to what's drawn on it, counting in tidy steps: what
// a graph's Fit button and its fitted axes use. Started as Heating and
// Cooling Curve's.

/** Free of the noise a multiplication leaves, at any size: 3 × 0.1 is 0.3, 3 × 0.025 is 0.075, 3 × 0.0005 is 0.0015. */
const tidy = (v: number) => Number(v.toPrecision(12))

/** A tidy axis range covering from..to: [start, end, step], in 8 to 20 blocks. Steps run from 0.000001 to 1,000,000. */
export function niceRange(from: number, to: number, zero = false): [number, number, number] {
  const span = Math.max(to - from, 1e-6)
  for (let k = -6; k <= 6; k++) {
    for (const m of [1, 2, 2.5, 5]) {
      const step = tidy(m * 10 ** k)
      const start = zero ? 0 : Math.floor(from / step + 1e-9) * step
      const end = Math.ceil(to / step - 1e-9) * step
      const blocks = Math.round((end - start) / step)
      if (blocks <= 20 && (blocks >= 8 || span / step < 8)) return [tidy(start), tidy(end), step]
    }
  }
  return [from, to, span / 10]
}
