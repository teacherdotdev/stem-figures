// What the CaliperScale Caliper and Micrometer share: readings in millimetres on
// the instrument's least count, a zero error (what it reads closed), the
// object held in its jaws, and the answer key.

/** What the jaws hold. */
export const JAW_OBJECTS = ['none', 'block', 'cylinder', 'ball', 'wire'] as const
export type JawObject = (typeof JAW_OBJECTS)[number]

export const JAW_OBJECT_NAMES: Record<JawObject, string> = {
  none: 'Nothing',
  block: 'Block',
  cylinder: 'Cylinder',
  ball: 'Ball',
  wire: 'Wire',
}

/** `n` to `decimals` places, halves away from zero. */
export function roundTo(n: number, decimals: number) {
  const f = 10 ** decimals
  return (Math.sign(n) * Math.round(Math.abs(n) * f + 1e-6)) / f || 0
}

/** `n` on a grid of `step`s (a least count), written to `decimals` places. */
export function toStep(n: number, step: number, decimals: number) {
  return roundTo(Math.sign(n) * Math.round(Math.abs(n) / step + 1e-6) * step, decimals)
}

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** An instrument as far as its readings go: its least count, the places a reading is written to, its range and its largest zero error either way. */
export interface Instrument {
  leastCount: number
  decimals: number
  range: number
  maxZero: number
}

/** A zero error the instrument can have: on its least count, and small. */
export const tidyZero = (i: Instrument, zero: number) => clamp(toStep(zero, i.leastCount, i.decimals), -i.maxZero, i.maxZero)

/** The smallest reading with that zero error: it can't read below zero, or close past its own zero. */
export const minReading = (zero: number) => Math.max(0, zero)

/** A reading the instrument can show, on its least count and within its range. */
export const tidyReading = (i: Instrument, zero: number, reading: number) =>
  clamp(toStep(reading, i.leastCount, i.decimals), minReading(zero), i.range)

/** A reading a teacher might set: somewhere between a tenth and nine tenths of the range. */
export function randomReading(i: Instrument, zero: number, random: () => number = Math.random) {
  return tidyReading(i, zero, i.range * (0.1 + random() * 0.8))
}

const sign = (n: number, signed: boolean) => (n < 0 ? '−' : signed && n > 0 ? '+' : '')

/** "23.45 mm"; a signed one (a zero error) gets its + or −. */
export function mmText(n: number, decimals: number, signed = false) {
  return `${sign(n, signed)}${Math.abs(n).toFixed(decimals)} mm`
}

/** What the object really measures: the reading less the zero error. */
export const corrected = (i: Instrument, reading: number, zero: number) => roundTo(reading - zero, i.decimals)

/** The answer key, e.g. "Reading: 23.45 mm". With a zero error, the reading
 *  and the zero error go first, then the corrected reading. */
export function answerLines(i: Instrument, reading: number, zero: number) {
  const read = `Reading: ${mmText(reading, i.decimals)}`
  if (!zero) return read
  return `${read}, zero error: ${mmText(zero, i.decimals, true)}\nCorrected reading: ${mmText(corrected(i, reading, zero), i.decimals)}`
}

/** An object's outline between two jaw faces `left` and `right` (drawing
 *  units, its size along the measurement) around the line `cy`: a block, an
 *  upright cylinder, a ball, or a wire running across the jaws. `depth` is how
 *  tall a block or cylinder is drawn, `wire` how far a wire runs above and
 *  below `cy`. */
export function objectShape(kind: JawObject, left: number, right: number, cy: number, depth: number, wire: { above: number; below: number }) {
  const width = right - left
  if (kind === 'ball') return { kind, left, width, top: cy - width / 2, bottom: cy + width / 2, cx: left + width / 2, cy, r: width / 2 }
  if (kind === 'wire') return { kind, left, width, top: cy - wire.above, bottom: cy + wire.below }
  if (kind === 'cylinder') {
    const ry = Math.min(width * 0.16, depth * 0.14)
    return { kind, left, width, top: cy - depth / 2 - ry, bottom: cy + depth / 2 + ry, ry }
  }
  if (kind === 'block') return { kind, left, width, top: cy - depth / 2, bottom: cy + depth / 2 }
  return { kind, left, width, top: cy, bottom: cy }
}

export type ObjectShape = ReturnType<typeof objectShape>
