// Rings around an element symbol and where the electrons go on them, for
// every dot-and-cross diagram (CONTEXT.md "Dot-and-cross diagrams"). The
// placement and the brackets are copied from Bohr Model's model.ts and
// adapted: Bohr's rings sit around a 70-unit nucleus, these around a symbol,
// and a molecule's outer circles overlap, so its inner rings must stay
// clear of every overlap.

/** Every mark's half-size: a dot's radius, half a cross's width. */
export const MARK = 3.6
export const SYMBOL_FONT = 24
export const CHARGE_FONT = 20
/** The outer circle of every atom and ion when only outer shells are drawn,
 *  hydrogen's included, as Cambridge mark schemes draw it. */
export const OUTER_R = 52
/** Bonded atoms' centers are this many outer radii apart: the overlap is
 *  then about 1.32 radii tall and half a radius wide, room for a triple
 *  bond's three pairs, and atoms at right angles to each other are 2.12
 *  radii apart, so their circles clearly don't touch. */
export const BOND_SPACING = 1.5
/** An atom's or ion's first ring when every shell is drawn, and the step
 *  between an ion's rings. */
export const FIRST_RING = 28
export const ION_STEP = 17
/** The step between a molecule's inner rings, which have to fit inside the
 *  overlaps. */
export const INNER_STEP = 14
/** Room kept between a molecule's last inner ring and the nearest overlap. */
const INNER_CLEAR = 4
/** The two electrons of a pair, center to center. */
export const PAIR_GAP = 11
/** A shared pair's rows in an overlap, center to center. */
export const ROW_GAP = 12
/** More electrons than this on a ring are spaced evenly instead of paired. */
export const MAX_PAIRED = 8

/** Browsers may differ in the last digit of sin and cos; rounding keeps the
 *  server and every browser drawing the same figure. */
export const round = (n: number) => Math.round(n * 1000) / 1000

/** A ring of a molecule's atom with every shell drawn, from the symbol out
 *  (`shell` 0 is the first). */
export const innerRadius = (shell: number) => FIRST_RING + shell * INNER_STEP

/** A molecule's outer radius: wide enough, with every shell drawn, that
 *  `inner` inner rings stay inside where the next atom's circle begins
 *  (BOND_SPACING − 1 radii from the center). */
export function moleculeRadius(inner: number) {
  if (!inner) return OUTER_R
  return Math.max(OUTER_R, Math.ceil((innerRadius(inner - 1) + MARK + INNER_CLEAR) / (BOND_SPACING - 1)))
}

/** The radii of an atom's or ion's rings on its own: one at OUTER_R for its
 *  outer shell only, or every shell evenly spaced. */
export const ionRadii = (shells: number, all: boolean) =>
  all ? Array.from({ length: shells }, (_, k) => FIRST_RING + k * ION_STEP) : [OUTER_R]

/** An electron as drawn: which atom or ion's mark it is (see marks.ts). */
export interface Mark {
  x: number
  y: number
  owner: number
}

/** Degrees clockwise from the right (the figure's y runs down). */
const TOP = -90
const COMPASS = [TOP, 0, 90, 180]

/** Where each electron on a ring goes, in degrees, in the order they fill
 *  it: the first four singly at top, right, bottom and left and the rest
 *  paired with them, as teachers draw them, PAIR_GAP apart. A full first
 *  shell is one pair at the top. Past eight they're spaced evenly from the
 *  top. (Bohr Model's electronAngles, with paired placement.) */
export function electronAngles(shell: number, count: number, radius: number): number[] {
  if (count > MAX_PAIRED) return Array.from({ length: count }, (_, k) => TOP + (k * 360) / count)
  const half = (PAIR_GAP / 2 / radius) * (180 / Math.PI)
  if (shell === 0 && count === 2) return [TOP - half, TOP + half]
  return Array.from({ length: count }, (_, k) => {
    const c = k % 4
    if (c + 4 >= count) return COMPASS[c]
    return COMPASS[c] + (k < 4 ? -half : half)
  })
}

export const toXY = (cx: number, cy: number, radius: number, degrees: number) => {
  const a = (degrees * Math.PI) / 180
  return { x: round(cx + radius * Math.cos(a)), y: round(cy + radius * Math.sin(a)) }
}

/** The marks on one ring around (cx, cy), `owners` giving each electron's
 *  mark in the order they fill the ring: an anion's own electrons first, so
 *  a gained one takes the next place (Cl⁻'s completes the last pair). */
export function ringMarks(cx: number, cy: number, radius: number, shell: number, owners: number[]): Mark[] {
  return electronAngles(shell, owners.length, radius).map((a, k) => ({ ...toXY(cx, cy, radius, a), owner: owners[k] }))
}

// ---- Brackets -------------------------------------------------------------

/** Brackets sit just outside the outer ring's marks, their arms reaching in. */
const BRACKET_GAP = 7
export const BRACKET_ARM = 9
const CHARGE_GAP = 4
/** Room above the brackets for the charge, which is set on their top. */
const CHARGE_RISE = 12
/** About how wide text is set in Arial. */
export const textWidth = (text: string, fontSize: number) => 0.6 * fontSize * [...text].length
/** The charge's room is kept at least this wide, so ions line up whatever
 *  their charge. */
const CHARGE_ROOM = textWidth('3+', CHARGE_FONT)

export interface Brackets {
  /** half the square the brackets are drawn on, around the ion's middle */
  half: number
  /** where the charge is written, from the ion's middle */
  charge: { x: number; y: number }
  /** how far the brackets and charge reach from the ion's middle */
  left: number
  right: number
  top: number
  bottom: number
}

/** An ion's brackets around an outer ring of `radius`, with its charge at
 *  the top right. (Bohr Model's brackets, around a ring rather than a
 *  model's square.) */
export function brackets(radius: number): Brackets {
  const half = round(radius + MARK + BRACKET_GAP)
  return {
    half,
    charge: { x: half + CHARGE_GAP, y: round(-half + CHARGE_FONT * 0.35) },
    left: half + 1,
    right: half + CHARGE_GAP + CHARGE_ROOM,
    top: half + CHARGE_RISE,
    bottom: half + 1,
  }
}
