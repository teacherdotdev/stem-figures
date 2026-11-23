// The curve Bond Energy Curve draws: the potential energy of two bonded
// atoms against the distance between their nuclei, as a Morse curve set by
// the two numbers a student reads back from it,
//
//   E(r) = D · [(1 − e^(−a(r − r₀)))² − 1],   a = 3 / r₀
//
// r₀ is the bond length and D the bond energy. Its lowest point is exactly
// at r₀, where E = −D; it rises to 0 from below as the atoms separate, and
// climbs steeply through 0 when they are pushed together. Every curve has
// the same shape, stretched to its own r₀ and D.

/**
 * a · r₀: how wide the well is for its bond length, the same for every curve.
 * Real diatomic bonds run from about 1.4 (H₂) to 4 (Cl₂), most near 3 (HCl
 * 2.4, N₂ 3.0, O₂ 3.2): 3 gives the steep wall and fairly narrow well of a
 * typical bond.
 */
export const SHAPE = 3

/** The potential energy at distance r, for bond length r0 and bond energy D (r and r0 in the same unit). */
export function energyAt(r: number, r0: number, D: number) {
  const gap = 1 - Math.exp((-SHAPE * (r - r0)) / r0)
  return D * (gap * gap - 1)
}

/** The distance, shorter than the bond length, at which the energy is `energy` (never below −D): a point on the wall. */
export function wallAt(energy: number, r0: number, D: number) {
  return r0 * (1 - Math.log(1 + Math.sqrt(Math.max(0, 1 + energy / D))) / SHAPE)
}

/** Where the curve crosses 0 on its way up the wall: about 0.77 of the bond length. */
export const zeroCrossing = (r0: number) => r0 * (1 - Math.LN2 / SHAPE)

/**
 * Points along the curve from `from` to `to`, `count` steps of them. When
 * the bond length is between the two it is one of the points, with half the
 * steps either side of it, so the lowest point drawn is the minimum itself.
 */
export function samples(r0: number, D: number, from: number, to: number, count = 400): { x: number; y: number }[] {
  const at = (r: number) => ({ x: r, y: energyAt(r, r0, D) })
  const run = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, j) => at(j === n ? b : a + ((b - a) * j) / n))
  if (!(to > from)) return []
  if (r0 <= from || r0 >= to) return run(from, to, count)
  const half = Math.floor(count / 2)
  return [...run(from, r0, half), ...run(r0, to, count - half).slice(1)]
}

/** The units a length is typed and shown in; it is kept in picometers. */
export const LENGTH_UNITS = ['pm', 'angstrom', 'nm'] as const
export type LengthUnit = (typeof LENGTH_UNITS)[number]
export const LENGTH_UNIT_TEXT: Record<LengthUnit, string> = { pm: 'pm', angstrom: 'Å', nm: 'nm' }
const PER_PM: Record<LengthUnit, number> = { pm: 1, angstrom: 0.01, nm: 0.001 }

/** Free of the noise a multiplication leaves: 0.074 × 1000 is 74. */
const tidy = (v: number) => Number(v.toPrecision(12))

/** A length in picometers, in another unit: 150 pm is 1.5 Å and 0.15 nm. */
export const fromPm = (pm: number, unit: LengthUnit) => tidy(pm * PER_PM[unit])

/** A length in some unit, in picometers. */
export const toPm = (length: number, unit: LengthUnit) => tidy(length / PER_PM[unit])
