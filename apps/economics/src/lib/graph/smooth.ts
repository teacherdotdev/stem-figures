// A smooth curve through typed points, for numbered graphs whose curves bend
// (an aggregate supply curve steepening toward potential GDP). It never
// overshoots: between two points it stays between their values, so a curve
// that only rises keeps rising (a monotone cubic, as PCHIP draws).

import type { Curve, Point } from './curves'

/**
 * A smooth curve through `pts`, with the other coordinate worked out from
 * `by` ('y' when each point is read across from a price, as a schedule's
 * rows are). Points sharing a value of `by` are taken once.
 */
export function smoothThrough(pts: Point[], by: 'x' | 'y' = 'x', perGap = 24): Curve {
  const other = by === 'x' ? 'y' : 'x'
  const sorted = [...pts].sort((a, b) => a[by] - b[by]).filter((p, k, all) => k === 0 || p[by] !== all[k - 1][by])
  const n = sorted.length
  if (n < 3) return sorted
  const t = sorted.map((p) => p[by])
  const v = sorted.map((p) => p[other])
  const h = t.slice(1).map((x, k) => x - t[k])
  const d = h.map((hk, k) => (v[k + 1] - v[k]) / hk)
  // Slopes at each point: a weighted harmonic mean of the slopes either side, 0 at a peak or a dip.
  const m = t.map((_, k) => {
    if (k === 0 || k === n - 1) return 0
    const [d0, d1] = [d[k - 1], d[k]]
    if (d0 * d1 <= 0) return 0
    const [h0, h1] = [h[k - 1], h[k]]
    return (3 * (h0 + h1)) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1)
  })
  // At the ends, from the two nearest gaps, kept the same way as the curve and not too steep.
  const end = (h0: number, h1: number, d0: number, d1: number) => {
    const s = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1)
    if (Math.sign(s) !== Math.sign(d0)) return 0
    if (Math.sign(d0) !== Math.sign(d1) && Math.abs(s) > Math.abs(3 * d0)) return 3 * d0
    return s
  }
  m[0] = end(h[0], h[1], d[0], d[1])
  m[n - 1] = end(h[n - 2], h[n - 3], d[n - 2], d[n - 3])

  const out: Curve = []
  for (let k = 0; k < n - 1; k++) {
    for (let j = 0; j < perGap; j++) {
      const s = j / perGap
      const s2 = s * s
      const s3 = s2 * s
      const value = (2 * s3 - 3 * s2 + 1) * v[k] + (s3 - 2 * s2 + s) * h[k] * m[k] + (-2 * s3 + 3 * s2) * v[k + 1] + (s3 - s2) * h[k] * m[k + 1]
      const at = t[k] + s * h[k]
      out.push(by === 'x' ? { x: at, y: value } : { x: value, y: at })
    }
  }
  out.push(sorted[n - 1])
  return out
}
