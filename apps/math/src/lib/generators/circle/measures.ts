// The measures shown beside the figure for the teacher, never in it: the
// circle's circumference and area, and each shaded area's size, in terms of π
// and as a decimal; for an area along one arc (a sector or a segment), that
// arc's angle and length too. Only numbers: the page doesn't explain them.

import { roundTo } from '$lib/shapes/parts.js'
import type { Face } from './faces.js'
import { readRadius, type Settings } from './settings.js'

/** A multiple of π as written: π, 12π, 2.5π. */
const ofPi = (k: number, places: number) => {
  const v = roundTo(k, places)
  return v === '1' ? 'π' : v === '-1' ? '−π' : `${v.replace('-', '−')}π`
}

export type Measure = { name: string; values: string[] }

/**
 * The readout's lines, or none when the radius isn't a number. `name` names
 * a shaded area from the places round it.
 */
export function circleMeasures(s: Settings, faces: Face[], name: (face: Face) => string): Measure[] {
  const r = readRadius(s.radius)
  if (r === null) return []
  const p = s.round
  const unit = s.unit.trim()
  const len = unit ? ` ${unit}` : ''
  const sq = unit ? ` ${unit}²` : ''
  /** kπ plus a number, as written, and ≈ its decimal: "12π − 15.59 cm² ≈ 22.11 cm²", or just the number with no π. */
  const both = (k: number, rest: number, suffix: string) => {
    const total = `${roundTo(k * Math.PI + rest, p)}${suffix}`
    if (Math.abs(k) < 1e-9) return total
    const extra = Math.abs(rest) < 1e-9 ? '' : ` ${rest > 0 ? '+' : '−'} ${roundTo(Math.abs(rest), p)}`
    return `${ofPi(k, p)}${extra}${suffix} ≈ ${total}`
  }
  const out: Measure[] = [
    { name: 'Circumference', values: [both(2 * r, 0, len)] },
    { name: 'Area', values: [both(r * r, 0, sq)] },
  ]
  for (const f of faces) {
    if (!s.faces[f.key]) continue
    const values = [`area ${both(f.pi * r * r, (f.area - f.pi * Math.PI) * r * r, sq)}`]
    if (f.arcs.length === 1 && f.arcs[0] < 360 - 1e-9) values.unshift(`${roundTo(f.arcs[0], p)}°`, `arc ${both((2 * r * f.arcs[0]) / 360, 0, len)}`)
    out.push({ name: `Shaded ${name(f)}`.trim(), values })
  }
  return out
}
