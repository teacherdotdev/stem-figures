// What a paper chromatogram is made of: samples (inks) spotted on the
// origin line, each separating into colored spots that travel some distance
// up the paper, and the colors those spots can be.

export const INK_COLORS = ['black', 'blue', 'red', 'yellow', 'green', 'purple', 'orange', 'pink', 'brown'] as const
export type InkColor = (typeof INK_COLORS)[number]

/** Each ink color's fill, saturated enough to tell apart on a printout. */
export const INK_HEX: Record<InkColor, string> = {
  black: '#2b2b2b',
  blue: '#2f6fd6',
  red: '#e0393e',
  yellow: '#f2c224',
  green: '#2fa84f',
  purple: '#8a4fc4',
  orange: '#f08a24',
  pink: '#ec6fae',
  brown: '#8b5a2b',
}

/** One dye in a sample: its color and how far its middle traveled from the origin line, in cm. */
export interface Spot {
  color: InkColor
  distance: number
}

/** One ink spotted on the origin line, named in pencil under it. */
export interface Sample {
  name: string
  spots: Spot[]
}

export const MAX_SAMPLES = 6
export const MAX_SPOTS = 5
export const MAX_NAME = 12
export const MIN_FRONT = 4
export const MAX_FRONT = 15

/** A distance rounded to the 0.1 cm a student reads with a ruler. */
export const roundCm = (cm: number) => Math.round(cm * 10) / 10

/** A distance as written on the figure, e.g. "5.6 cm". */
export const cmText = (cm: number) => `${roundCm(cm).toFixed(1)} cm`

/** A spot's Rf: how far it traveled over how far the solvent traveled, to 2 places. */
export const rf = (distance: number, front: number) => (front > 0 ? distance / front : 0)
export const rfText = (distance: number, front: number) => rf(distance, front).toFixed(2)

/** The solvent front a teacher has typed: while typing (`done` false) only
 *  a front in range, so the 1 of 12 isn't clamped to 4 before the 2 comes;
 *  once they leave the box, clamped into range. Undefined keeps the front. */
export function typedFront(value: number, done: boolean): number | undefined {
  if (!Number.isFinite(value)) return undefined
  if (done) return Math.min(MAX_FRONT, Math.max(MIN_FRONT, roundCm(value)))
  return value >= MIN_FRONT && value <= MAX_FRONT ? roundCm(value) : undefined
}

/** A new ink's name: the first capital letter no ink has yet. */
export function nextSampleName(names: string[]): string {
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i)
    if (!names.includes(letter)) return letter
  }
  return ''
}

/** Names can't hold the address format's separators (see settings). */
export const cleanName = (name: string) => name.replace(/[:_,]/g, '').slice(0, MAX_NAME)

/** The color of an ink before it separates: its dyes mixed, as paints mix
 *  (each channel multiplied), so blue and yellow make a dark green and
 *  blue, red and yellow make nearly black. */
export function mixedHex(spots: Spot[]): string {
  if (!spots.length) return INK_HEX.black
  const rgb = [1, 1, 1]
  for (const spot of new Set(spots.map((s) => s.color))) {
    const hex = INK_HEX[spot]
    for (let i = 0; i < 3; i++) rgb[i] *= parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255
  }
  return '#' + rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
}

/** A darker edge for a spot of `hex`, so it keeps its outline in grayscale. */
export function edgeHex(hex: string): string {
  return '#' + [0, 1, 2].map((i) => Math.round(parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) * 0.62).toString(16).padStart(2, '0')).join('')
}
