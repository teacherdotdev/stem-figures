// What a particle diagram is drawn from: a short list of particle kinds, each
// a count, a shape and a look (a size, a shade and, for an ion, a charge) for
// the center or lone disc and another for the outer ones, and the tidying
// that turns anything stored or linked into valid ones. See Chemistry's
// CONTEXT.md for atom, ion, molecule, ion cluster and particle.

export const SIZES = ['xs', 's', 'm', 'l', 'xl'] as const
export type Size = (typeof SIZES)[number]

export const RADIUS: Record<Size, number> = { xs: 6, s: 10, m: 15, l: 20, xl: 26 }
export const SIZE_NAMES: Record<Size, string> = { xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL' }
const SIZE_WORDS: Record<Size, string> = { xs: 'tiny', s: 'small', m: 'medium', l: 'large', xl: 'extra large' }

export const SHADES = ['white', 'light', 'gray', 'dark', 'black'] as const
export type Shade = (typeof SHADES)[number]

export const SHADE_NAMES: Record<Shade, string> = {
  white: 'White',
  light: 'Light gray',
  gray: 'Gray',
  dark: 'Dark gray',
  black: 'Black',
}
export const SHADE_FILL: Record<Shade, string> = {
  white: '#fff',
  light: '#dcdcdc',
  gray: '#a3a3a3',
  dark: '#5c5c5c',
  black: '#111',
}
/** Shades a charge is written on in white. */
export const DARK_SHADES: readonly Shade[] = ['dark', 'black']

/** Charges are kept with plain hyphens, so links stay readable, and drawn
 *  with a true minus sign. Empty for an atom. */
export const CHARGES = ['', '+', '-', '2+', '2-', '3+', '3-'] as const
export type Charge = (typeof CHARGES)[number]

export const chargeText = (charge: Charge) => charge.replace('-', '−')

export interface Look {
  size: Size
  shade: Shade
  charge: Charge
}

/** How a particle's discs are joined: alone (an atom or ion), or a center
 *  with one to four outer discs touching it. */
export const SHAPES = ['single', 'pair', 'bent', 'line', 'triangle', 'cross'] as const
export type Shape = (typeof SHAPES)[number]

export const SHAPE_NAMES: Record<Shape, string> = {
  single: 'Alone',
  pair: 'Pair',
  bent: 'Bent',
  line: 'In a line',
  triangle: 'Three around',
  cross: 'Four around',
}
/** Words for telling apart shapes with the same number of outer discs. */
const SHAPE_WORDS: Record<Shape, string> = { single: '', pair: '', bent: 'bent', line: 'linear', triangle: '', cross: '' }

/** Which way each outer disc points from the center, in degrees clockwise
 *  from the right (the figure's y runs down). Bent opens downward, as H₂O is
 *  usually drawn, with the 104.5° angle of water. */
const DIRECTIONS: Record<Shape, number[]> = {
  single: [],
  pair: [0],
  bent: [90 - 52.25, 90 + 52.25],
  line: [0, 180],
  triangle: [-90, 30, 150],
  cross: [0, 90, 180, 270],
}

export interface ParticleKind {
  /** how many are drawn in the box, or the before box */
  count: number
  /** how many are drawn in the after box of a before-and-after figure; kept
   *  only once set, and the same as count until then */
  after?: number
  shape: Shape
  /** the center disc, or the only one when the shape is alone */
  look: Look
  /** every outer disc; not drawn when the shape is alone */
  outer: Look
  /** what the key calls it; kept only when not empty */
  name?: string
}

export const MAX_KINDS = 4
export const MAX_COUNT = 60
export const MAX_NAME = 40

const isJoined = (kind: ParticleKind) => kind.shape !== 'single'

/** How many of a kind the after box has. */
export const afterCount = (kind: ParticleKind) => kind.after ?? kind.count

/** "Atom" or "Ion" for a lone kind, "Molecule" or "Ion cluster" for a joined
 *  one, from whether any of its drawn discs carry a charge. */
export function kindName(kind: ParticleKind) {
  if (!isJoined(kind)) return kind.look.charge ? 'Ion' : 'Atom'
  return kind.look.charge || kind.outer.charge ? 'Ion cluster' : 'Molecule'
}

/** e.g. "large light gray −" */
export const describeLook = (look: Look) =>
  [SIZE_WORDS[look.size], SHADE_NAMES[look.shade].toLowerCase(), chargeText(look.charge)].filter(Boolean).join(' ')

/** One particle of a kind, or `count` of them, in words. */
function describe(kind: ParticleKind, count?: number) {
  const noun = kindName(kind).toLowerCase() + (count === undefined || count === 1 ? '' : 's')
  if (!isJoined(kind)) return [count, describeLook(kind.look), noun].filter((w) => w !== undefined).join(' ')
  const outers = DIRECTIONS[kind.shape].length
  const around = outers === 1 ? `and ${describeLook(kind.outer)}` : `with ${outers} ${describeLook(kind.outer)}`
  return [count, SHAPE_WORDS[kind.shape], noun].filter((w) => w !== undefined && w !== '').join(' ') + ` (${describeLook(kind.look)} ${around})`
}

/** e.g. "4 large light gray − ions" or "3 bent molecules (medium gray with
 *  2 small white)" */
export const describeKind = (kind: ParticleKind) => describe(kind, kind.count)

/** One of a kind, e.g. "large light gray − ion" or "bent molecule (medium
 *  gray with 2 small white)" */
export const describeParticle = (kind: ParticleKind) => describe(kind)

/** The outer discs' look a new or old kind starts with. */
export const DEFAULT_OUTER: Look = { size: 's', shade: 'white', charge: '' }

// Tidying ------------------------------------------------------------------

export const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const oneOf = <T extends string>(options: readonly T[], v: unknown, fallback: T) =>
  options.includes(v as T) ? (v as T) : fallback

const PLAIN: Look = { size: 'm', shade: 'white', charge: '' }

/** A valid look, taking whatever `v` leaves out from `fallback`. */
export function tidyLook(v: unknown, fallback: Look = PLAIN): Look {
  const raw = isObject(v) ? v : {}
  return {
    size: oneOf(SIZES, raw.size, fallback.size),
    shade: oneOf(SHADES, raw.shade, fallback.shade),
    charge: oneOf(CHARGES, raw.charge, fallback.charge),
  }
}

const countOf = (n: number) => Math.min(MAX_COUNT, Math.max(0, Math.round(n)))

export function tidyKind(v: unknown): ParticleKind | undefined {
  if (!isObject(v)) return undefined
  const kind: ParticleKind = {
    count: typeof v.count === 'number' && Number.isFinite(v.count) ? countOf(v.count) : 1,
    // kinds from before the after box have no after count
    ...(typeof v.after === 'number' && Number.isFinite(v.after) ? { after: countOf(v.after) } : {}),
    // kinds from before molecules had no shape or outer look: they stay alone
    shape: oneOf(SHAPES, v.shape, 'single'),
    look: tidyLook(v.look),
    outer: isObject(v.outer) ? tidyLook(v.outer) : { ...DEFAULT_OUTER },
  }
  const name = typeof v.name === 'string' ? v.name.slice(0, MAX_NAME) : ''
  if (name.trim()) kind.name = name
  return kind
}

/** Up to four valid kinds, or undefined when there are none at all. */
export function tidyKinds(v: unknown): ParticleKind[] | undefined {
  if (!Array.isArray(v)) return undefined
  const kinds = v.map(tidyKind).filter((k): k is ParticleKind => !!k)
  return kinds.length ? kinds.slice(0, MAX_KINDS) : undefined
}

// A key of each atom -------------------------------------------------------

/** What a key that lists each atom calls one of them. It goes with the look,
 *  since that is what makes two kinds' atoms the same atom. */
export interface AtomName {
  look: Look
  name: string
}

/** The most different atoms the kinds can have between them: a center and
 *  an outer look each. */
export const MAX_ATOMS = 2 * MAX_KINDS

export const sameLook = (a: Look, b: Look) => a.size === b.size && a.shade === b.shade && a.charge === b.charge

/** Valid atom names, one per look, or undefined when `v` isn't a list. */
export function tidyAtomNames(v: unknown): AtomName[] | undefined {
  if (!Array.isArray(v)) return undefined
  const names: AtomName[] = []
  for (const item of v) {
    if (!isObject(item) || !isObject(item.look) || typeof item.name !== 'string' || !item.name.trim()) continue
    const look = tidyLook(item.look)
    if (!names.some((n) => sameLook(n.look, look))) names.push({ look, name: item.name.slice(0, MAX_NAME) })
  }
  return names.slice(0, MAX_ATOMS)
}

/** Every different atom or ion the kinds are made of, as lone kinds for a key
 *  that lists each atom: in the order they first appear (a kind's center
 *  before its outer discs), each named from `names`. An atom in two kinds is
 *  listed once, and so is a kind with a count of 0. */
export function atomKinds(kinds: ParticleKind[], names: AtomName[]): ParticleKind[] {
  const looks: Look[] = []
  for (const kind of kinds) {
    for (const look of isJoined(kind) ? [kind.look, kind.outer] : [kind.look]) {
      if (!looks.some((l) => sameLook(l, look))) looks.push(look)
    }
  }
  return looks.map((look) => {
    const name = names.find((n) => sameLook(n.look, look))?.name
    return { count: 0, shape: 'single', look: { ...look }, outer: { ...DEFAULT_OUTER }, ...(name ? { name } : {}) }
  })
}

// Drawing ------------------------------------------------------------------

/** One disc as drawn, centered at (x, y). */
export interface Disc extends Look {
  x: number
  y: number
  r: number
}

/** How far the outer discs sit from the center: touching it with a slight
 *  overlap, as in printed diagrams, or further out when big outer discs
 *  around a small center would otherwise pile onto each other. */
function outerDistance(kind: ParticleKind) {
  const rc = RADIUS[kind.look.size]
  const ro = RADIUS[kind.outer.size]
  const touching = rc + ro - 0.2 * Math.min(rc, ro)
  const directions = DIRECTIONS[kind.shape]
  if (directions.length < 2) return touching
  // the closest two outer discs overlap each other by no more than they would the center
  const sorted = [...directions].sort((a, b) => a - b)
  const gaps = sorted.map((a, i) => (i ? a - sorted[i - 1] : a + 360 - sorted[sorted.length - 1]))
  const tightest = (Math.min(...gaps) * Math.PI) / 180
  return Math.max(touching, (0.9 * ro) / Math.sin(tightest / 2))
}

/** A particle's discs around (0, 0), turned by `angle` radians: the outer
 *  discs first and the center last, so it's drawn on top. Only positions
 *  turn; charges are drawn upright wherever their disc ends up. */
export function particleDiscs(kind: ParticleKind, angle = 0): Disc[] {
  const center: Disc = { ...kind.look, x: 0, y: 0, r: RADIUS[kind.look.size] }
  if (!isJoined(kind)) return [center]
  const distance = outerDistance(kind)
  const outer = DIRECTIONS[kind.shape].map((degrees): Disc => {
    const a = (degrees * Math.PI) / 180 + angle
    return { ...kind.outer, x: distance * Math.cos(a), y: distance * Math.sin(a), r: RADIUS[kind.outer.size] }
  })
  return [...outer, center]
}

/** How far a drawing's discs reach in each direction. */
export function discBounds(discs: Disc[]) {
  return {
    left: Math.min(...discs.map((d) => d.x - d.r)),
    right: Math.max(...discs.map((d) => d.x + d.r)),
    top: Math.min(...discs.map((d) => d.y - d.r)),
    bottom: Math.max(...discs.map((d) => d.y + d.r)),
  }
}
