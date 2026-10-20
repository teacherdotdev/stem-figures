// Where each part of a nuclide symbol goes, as it's typeset: the mass number
// at the top left, the atomic number at the bottom left, both right-aligned
// against the symbol, and the charge at the top right (CONTEXT.md "Nuclide
// notation"). Pure, so a row of them can line up on their baselines later,
// for decay equations.
//
// Only the figure's size and the blanks' places depend on how wide text is
// estimated to be. The numbers are drawn with text-anchor="end" at the
// symbol's left edge and the charge as a raised tspan right after the
// symbol, so they sit exactly whatever the font draws.

export type Font = 'sans' | 'serif'

export const FONT_FAMILY: Record<Font, string> = {
  sans: 'Arial, Helvetica, "Liberation Sans", Arimo, sans-serif',
  serif: '"Times New Roman", Times, "Liberation Serif", Tinos, serif',
}

/** Each character's advance width in Arial and in Times New Roman, as a
 *  fraction of the font size (their standard metrics). Anything else counts
 *  as a wide letter. */
const ARIAL: Record<string, number> = {
  A: 0.667, B: 0.667, C: 0.722, D: 0.722, E: 0.667, F: 0.611, G: 0.778, H: 0.722, I: 0.278, J: 0.5, K: 0.667, L: 0.556, M: 0.833,
  N: 0.722, O: 0.778, P: 0.667, Q: 0.778, R: 0.722, S: 0.667, T: 0.611, U: 0.722, V: 0.667, W: 0.944, X: 0.667, Y: 0.667, Z: 0.611,
  a: 0.556, b: 0.556, c: 0.5, d: 0.556, e: 0.556, f: 0.278, g: 0.556, h: 0.556, i: 0.222, j: 0.222, k: 0.5, l: 0.222, m: 0.833,
  n: 0.556, o: 0.556, p: 0.556, q: 0.556, r: 0.333, s: 0.5, t: 0.278, u: 0.556, v: 0.5, w: 0.722, x: 0.5, y: 0.5, z: 0.5,
  '0': 0.556, '1': 0.556, '2': 0.556, '3': 0.556, '4': 0.556, '5': 0.556, '6': 0.556, '7': 0.556, '8': 0.556, '9': 0.556,
  '+': 0.584, '−': 0.584, '-': 0.333, '?': 0.556, ' ': 0.278, '.': 0.278, ',': 0.278, '(': 0.333, ')': 0.333, '*': 0.389, '!': 0.278,
  'α': 0.578, 'β': 0.575, 'γ': 0.5, '⁺': 0.4, '⁻': 0.4, '’': 0.222, ':': 0.278,
  '⁰': 0.4, '¹': 0.4, '²': 0.4, '³': 0.4, '⁴': 0.4, '⁵': 0.4, '⁶': 0.4, '⁷': 0.4, '⁸': 0.4, '⁹': 0.4,
}
const TIMES: Record<string, number> = {
  A: 0.722, B: 0.667, C: 0.667, D: 0.722, E: 0.611, F: 0.556, G: 0.722, H: 0.722, I: 0.333, J: 0.389, K: 0.722, L: 0.611, M: 0.889,
  N: 0.722, O: 0.722, P: 0.556, Q: 0.722, R: 0.667, S: 0.556, T: 0.611, U: 0.722, V: 0.722, W: 0.944, X: 0.722, Y: 0.722, Z: 0.611,
  a: 0.444, b: 0.5, c: 0.444, d: 0.5, e: 0.444, f: 0.333, g: 0.5, h: 0.5, i: 0.278, j: 0.278, k: 0.5, l: 0.278, m: 0.778,
  n: 0.5, o: 0.5, p: 0.5, q: 0.5, r: 0.333, s: 0.389, t: 0.278, u: 0.5, v: 0.5, w: 0.722, x: 0.5, y: 0.5, z: 0.444,
  '0': 0.5, '1': 0.5, '2': 0.5, '3': 0.5, '4': 0.5, '5': 0.5, '6': 0.5, '7': 0.5, '8': 0.5, '9': 0.5,
  '+': 0.564, '−': 0.564, '-': 0.333, '?': 0.444, ' ': 0.25, '.': 0.25, ',': 0.25, '(': 0.333, ')': 0.333, '*': 0.5, '!': 0.333,
  'α': 0.53, 'β': 0.5, 'γ': 0.45, '⁺': 0.35, '⁻': 0.35, '’': 0.333, ':': 0.278,
  '⁰': 0.33, '¹': 0.33, '²': 0.33, '³': 0.33, '⁴': 0.33, '⁵': 0.33, '⁶': 0.33, '⁷': 0.33, '⁸': 0.33, '⁹': 0.33,
}
const WIDTHS: Record<Font, Record<string, number>> = { sans: ARIAL, serif: TIMES }

/** How tall capitals and digits are, as a fraction of the font size. */
export const CAP_HEIGHT: Record<Font, number> = { sans: 0.716, serif: 0.662 }

export const textWidth = (text: string, size: number, font: Font = 'sans') =>
  [...text].reduce((w, ch) => w + (WIDTHS[font][ch] ?? 0.72), 0) * size

/** A position: its text, a blank for students, or nothing (left off). */
export type Part = { text: string } | 'blank' | null

/** What the four positions around the symbol hold. */
export interface NuclideParts {
  mass: Part
  z: Part
  symbol: Part
  charge: Part
}

export type BlankStyle = 'box' | 'line'

export interface Look {
  font: Font
  /** the symbol's font size; the numbers and charge are NUMBER times it */
  size: number
}

/** Text placed at (x, y) on its baseline, anchored at its start, middle or end. */
export interface PlacedText {
  kind: 'text'
  text: string
  x: number
  y: number
  size: number
  anchor: 'start' | 'middle' | 'end'
}

/** A blank's box. Drawn as a line, it's the box's bottom edge. */
export interface PlacedBlank {
  kind: 'blank'
  x: number
  y: number
  width: number
  height: number
}

export type Placed = PlacedText | PlacedBlank

// Every length below is a fraction of the symbol's font size.
/** the numbers' and charge's size */
export const NUMBER = 0.5
/** how far the mass number's top rises above the symbol's */
const RISE = 0.06
/** how far the atomic number's baseline drops below the symbol's */
const DROP = 0.1
/** between the numbers and the symbol */
const GAP = 0.05
/** between the symbol and the charge */
export const CHARGE_GAP = 0.03
/** between a blank's box and the text it stands for */
const BOX_PAD = 0.03
/** room left and right of the ink, for widths estimated a little short */
const MARGIN = 0.03
/** below the symbol's baseline, for the atomic number and for β, γ and lowercase letters */
const BELOW = 0.24
/** a blank's width: wide enough to write in, whatever it stands for */
const BLANK_WIDTH = { number: 0.7, symbol: 1.0, charge: 0.55 }

export interface NuclideLayout {
  width: number
  height: number
  /** the symbol's baseline */
  baseline: number
  /** the symbol's left edge, where the numbers end */
  symbolX: number
  mass?: Placed
  z?: Placed
  symbol?: Placed
  /** the charge's place; drawn as a tspan after a symbol written as text, so its x is used only after a blank */
  charge?: Placed
}

/** Lays out one nuclide symbol, with its top-left corner at (0, 0). Every
 *  nuclide in the same font and size has the same height and baseline,
 *  whatever is left off, so a row of them lines up. */
export function layoutNuclide(parts: NuclideParts, { font, size }: Look): NuclideLayout {
  const cap = CAP_HEIGHT[font]
  const n = NUMBER * size
  const pad = BOX_PAD * size
  // Measured from the symbol's baseline, up negative.
  const massBase = -cap * size - RISE * size + cap * n
  const zBase = DROP * size
  const top = -cap * size - RISE * size - pad - MARGIN * size
  const baseline = -top

  const widthOf = (part: Part, textSize: number, blank: number) =>
    part === null ? 0 : part === 'blank' ? blank * size : textWidth(part.text, textSize, font)
  const numberColumn = Math.max(widthOf(parts.mass, n, BLANK_WIDTH.number), widthOf(parts.z, n, BLANK_WIDTH.number))
  const symbolX = MARGIN * size + numberColumn + (numberColumn ? GAP * size : 0)
  const symbolW = widthOf(parts.symbol, size, BLANK_WIDTH.symbol)
  const chargeW = widthOf(parts.charge, n, BLANK_WIDTH.charge)
  const chargeX = symbolX + symbolW + (symbolW && chargeW ? CHARGE_GAP * size : 0)

  /** A part on its baseline `y`: its text anchored at `x`, or a blank's box
   *  as tall as its digits, ending at `x` (anchor end) or starting there. */
  const place = (part: Part, x: number, y: number, textSize: number, blank: number, anchor: 'start' | 'end'): Placed | undefined => {
    if (part === null) return undefined
    if (part !== 'blank') return { kind: 'text', text: part.text, x, y: baseline + y, size: textSize, anchor }
    const width = blank * size
    return { kind: 'blank', x: anchor === 'end' ? x - width : x, y: baseline + y - cap * textSize - pad, width, height: cap * textSize + 2 * pad }
  }

  return {
    width: chargeX + chargeW + MARGIN * size,
    height: baseline + BELOW * size,
    baseline,
    symbolX,
    mass: place(parts.mass, symbolX - GAP * size, massBase, n, BLANK_WIDTH.number, 'end'),
    z: place(parts.z, symbolX - GAP * size, zBase, n, BLANK_WIDTH.number, 'end'),
    symbol: place(parts.symbol, symbolX, 0, size, BLANK_WIDTH.symbol, 'start'),
    charge: place(parts.charge, chargeX, massBase, n, BLANK_WIDTH.charge, 'start'),
  }
}

/** A line of hyphen notation, "carbon-14" or "C-14", any part of it blank. */
export interface HyphenLayout {
  width: number
  height: number
  baseline: number
  pieces: Placed[]
}

/** Lays out hyphen notation at font size `size`, top-left corner at (0, 0).
 *  `wideName` makes the name's blank wide enough for a written-out name. A
 *  text between blanks is anchored to them, so the two never overlap. */
export function layoutHyphen(name: Part, mass: Part, size: number, font: Font, wideName: boolean): HyphenLayout {
  const cap = CAP_HEIGHT[font]
  const pad = 0.08 * size
  const gap = 0.06 * size
  const baseline = cap * size + pad + MARGIN * size
  type Token = { text: string } | { blank: number }
  const tokens: Token[] = []
  const push = (part: Part, blank: number) => {
    if (part === 'blank') tokens.push({ blank })
    else if (part) tokens.push({ text: part.text })
  }
  push(name, wideName ? 3.4 * size : 1.4 * size)
  if (name && mass) tokens.push({ text: '-' })
  push(mass, 1.6 * size)
  // Next-door texts become one: "carbon" "-" "14" is "carbon-14".
  const merged: Token[] = []
  for (const t of tokens) {
    const last = merged.at(-1)
    if ('text' in t && last && 'text' in last) merged[merged.length - 1] = { text: last.text + t.text }
    else merged.push(t)
  }

  const pieces: Placed[] = []
  let x = MARGIN * size
  merged.forEach((t, i) => {
    if ('blank' in t) {
      pieces.push({ kind: 'blank', x, y: baseline - cap * size - pad, width: t.blank, height: cap * size + 2 * pad })
      x += t.blank
      return
    }
    const w = textWidth(t.text, size, font)
    const before = i > 0
    const after = i < merged.length - 1
    // Anchored to the blank before it, the blank after it, or both.
    const anchor = before && after ? 'middle' : after ? 'end' : 'start'
    const start = x + (before ? gap : 0)
    const end = start + w
    const at = anchor === 'middle' ? (start + end) / 2 : anchor === 'end' ? end : start
    pieces.push({ kind: 'text', text: t.text, x: at, y: baseline, size, anchor })
    x = end + (after ? gap : 0)
  })
  return { width: x + MARGIN * size, height: baseline + BELOW * size, baseline, pieces }
}
