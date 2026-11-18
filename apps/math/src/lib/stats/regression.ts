// The least-squares line through paired data, and how closely the data
// follows it (Pearson's r), as a TI-84's LinReg(ax+b) works them out.

export type Pair = { x: number; y: number }

/** The least-squares line y = slope·x + intercept, or null when the data can't have one (fewer than two different x values). */
export function leastSquares(points: Pair[]): { slope: number; intercept: number } | null {
  const n = points.length
  if (n < 2) return null
  const mx = points.reduce((t, p) => t + p.x, 0) / n
  const my = points.reduce((t, p) => t + p.y, 0) / n
  let sxx = 0
  let sxy = 0
  for (const p of points) {
    sxx += (p.x - mx) ** 2
    sxy += (p.x - mx) * (p.y - my)
  }
  if (sxx < 1e-12 * Math.max(1, mx * mx)) return null
  const slope = sxy / sxx
  return { slope, intercept: my - slope * mx }
}

/** Pearson's correlation coefficient r, or null when either variable doesn't vary. */
export function correlation(points: Pair[]): number | null {
  const n = points.length
  if (n < 2) return null
  const mx = points.reduce((t, p) => t + p.x, 0) / n
  const my = points.reduce((t, p) => t + p.y, 0) / n
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (const p of points) {
    sxx += (p.x - mx) ** 2
    syy += (p.y - my) ** 2
    sxy += (p.x - mx) * (p.y - my)
  }
  if (sxx < 1e-12 * Math.max(1, mx * mx) || syy < 1e-12 * Math.max(1, my * my)) return null
  return Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)))
}

/** How a correlation is described in class: strong, moderate, weak or no, positive or negative. */
export function describeCorrelation(r: number): string {
  const size = Math.abs(r)
  if (size < 0.3) return 'little or no correlation'
  const strength = size >= 0.7 ? 'strong' : size >= 0.5 ? 'moderate' : 'weak'
  return `${strength} ${r > 0 ? 'positive' : 'negative'} correlation`
}
