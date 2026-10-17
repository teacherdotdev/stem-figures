// What a Bohr model is drawn from and where each part goes: the nucleus (as
// text, a blank circle, or a cluster of proton and neutron balls mixed from a
// seed), the rings, the electrons on them, the shell labels, and an ion's
// brackets. Nothing here checks the counts; any within the limits draw as
// given (CONTEXT.md "Bohr models").

import { seededRandom } from '$shared/particles/random'

export const MAX_NUCLEONS = 200
export const MAX_SHELLS = 7
export const MAX_ELECTRONS = 32
/** More protons and neutrons than this are drawn as text, not balls. */
export const MAX_BALLS = 40

// The geometry never depends on the counts, only on how many shells there
// are, so answer choices made one at a time line up.
export const BALL_R = 7
/** Balls overlap a little, so the cluster reads as one nucleus. */
const BALL_STEP = 2 * BALL_R * 0.9
/** The space kept for the nucleus, which 40 balls fit inside. */
export const NUCLEUS_R = 52
/** The circle around a text or blank nucleus, pale so it isn't taken for a ring. */
export const TEXT_NUCLEUS_R = 40
export const NUCLEUS_FILL = '#ececec'
const FIRST_RING = 70
const RING_STEP = 26
const ELECTRON_R = 4.5
/** An electron with a symbol is drawn larger so the symbol fits. */
const SYMBOL_ELECTRON_R = 8
/** Space outside the outermost ring, for its electrons. */
const MARGIN = SYMBOL_ELECTRON_R + 4

export const ringRadius = (shell: number) => FIRST_RING + shell * RING_STEP

/** The square the model is drawn in, which depends only on the shell count. */
export const modelSide = (shells: number) => 2 * (ringRadius(shells - 1) + MARGIN)

// ---- Looks ---------------------------------------------------------------

export const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray', 'white', 'black'] as const
export type Color = (typeof COLORS)[number]

export const COLOR_NAMES: Record<Color, string> = {
  red: 'Red',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  purple: 'Purple',
  gray: 'Gray',
  white: 'White',
  black: 'Black',
}
export const COLOR_FILL: Record<Color, string> = {
  red: '#e0473c',
  orange: '#f28c28',
  yellow: '#f6d53e',
  green: '#3a9f57',
  blue: '#3a78d6',
  purple: '#8a58c8',
  gray: '#a3a3a3',
  white: '#fff',
  black: '#111',
}
/** Colors a symbol is written on in white. */
const DARK_COLORS: readonly Color[] = ['red', 'green', 'blue', 'purple', 'black']
export const symbolFill = (color: Color) => (DARK_COLORS.includes(color) ? '#fff' : '#111')

/** Symbols are kept in plain characters, so links stay readable, and drawn
 *  with superscripts and a true minus sign. Empty for none. */
export const PROTON_SYMBOLS = ['+', 'p', 'p+', ''] as const
export const NEUTRON_SYMBOLS = ['0', 'n', 'n0', ''] as const
export const ELECTRON_SYMBOLS = ['-', 'e', 'e-', ''] as const
export type ProtonSymbol = (typeof PROTON_SYMBOLS)[number]
export type NeutronSymbol = (typeof NEUTRON_SYMBOLS)[number]
export type ElectronSymbol = (typeof ELECTRON_SYMBOLS)[number]
export type ComponentSymbol = ProtonSymbol | NeutronSymbol | ElectronSymbol

const DRAWN_SYMBOLS: Record<string, string> = { '': '', '+': '+', p: 'p', 'p+': 'p⁺', '0': '0', n: 'n', n0: 'n⁰', '-': '−', e: 'e', 'e-': 'e⁻' }
export const symbolText = (symbol: ComponentSymbol) => DRAWN_SYMBOLS[symbol]

export interface ComponentLook {
  color: Color
  symbol: ComponentSymbol
}

export type Component = 'proton' | 'neutron' | 'electron'

/** How an electron differs from the neutral atom's (CONTEXT.md "Gained
 *  electron / Lost electron"). A lost one is drawn as an empty spot. */
export type ElectronChange = 'gained' | 'lost'

/** A ball or electron as drawn. */
export interface Dot {
  x: number
  y: number
  r: number
  component: Component
  change?: ElectronChange
}

/** Browsers may differ in the last digit of sin and cos; rounding keeps the
 *  server and every browser drawing the same figure. */
const round = (n: number) => Math.round(n * 1000) / 1000

// ---- The nucleus ---------------------------------------------------------

/** Every hexagonal packing site near the middle, nearest first. */
const SITES = (() => {
  const sites: { x: number; y: number; d: number }[] = []
  for (let j = -6; j <= 6; j++)
    for (let i = -8; i <= 8; i++) {
      const x = BALL_STEP * (i + j / 2)
      const y = BALL_STEP * j * (Math.sqrt(3) / 2)
      sites.push({ x, y, d: round(Math.hypot(x, y)) })
    }
  return sites
})()

/** The protons and neutrons as a tight cluster of balls around (0, 0): the
 *  sites nearest the middle, with ties at the edge of the cluster broken at
 *  random, and which ball is a proton also at random, both from `seed`
 *  (ADR 0002). Outer balls come first, so the middle ones are drawn on top.
 *  Undefined when there are too many to draw as balls. */
export function nucleusBalls(protons: number, neutrons: number, seed: number): Dot[] | undefined {
  const count = protons + neutrons
  if (count > MAX_BALLS) return undefined
  const random = seededRandom(seed)
  const chosen = SITES.map((s) => ({ ...s, tie: random() }))
    .sort((a, b) => a.d - b.d || a.tie - b.tie)
    .slice(0, count)

  // center the cluster, so two balls sit either side of the middle
  const cx = chosen.reduce((sum, s) => sum + s.x, 0) / (count || 1)
  const cy = chosen.reduce((sum, s) => sum + s.y, 0) / (count || 1)

  const components: Component[] = [...Array(protons).fill('proton'), ...Array(neutrons).fill('neutron')]
  for (let i = components.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[components[i], components[j]] = [components[j], components[i]]
  }
  return chosen
    .map((s, i) => ({ x: round(s.x - cx), y: round(s.y - cy), r: BALL_R, component: components[i] }))
    .sort((a, b) => b.x ** 2 + b.y ** 2 - (a.x ** 2 + a.y ** 2))
}

// ---- Electrons -----------------------------------------------------------

/** Evenly spaced around the ring, or paired at the four compass points as in
 *  Lewis structures (up to 8; a shell with more is spaced evenly). */
export const PLACEMENTS = ['even', 'paired'] as const
export type Placement = (typeof PLACEMENTS)[number]

export const MAX_PAIRED = 8

/** The electrons' radius on a ring: larger with a symbol, and smaller on a
 *  crowded ring so they don't overlap. */
export function electronRadius(shell: number, count: number, withSymbol: boolean) {
  const base = withSymbol ? SYMBOL_ELECTRON_R : ELECTRON_R
  if (count < 2) return base
  return round(Math.min(base, (0.42 * 2 * Math.PI * ringRadius(shell)) / count))
}

/** Degrees clockwise from the right (the figure's y runs down). */
const TOP = -90
const COMPASS = [TOP, 0, 90, 180]

/** Where each electron on a ring goes, in degrees, in the order they fill
 *  it: evenly spaced clockwise from the top, or the first four singly at top,
 *  right, bottom and left and the rest paired with them, the two of a pair
 *  `r` apart either side of their point. A full first shell is one pair at
 *  the top, as He's Lewis structure is. */
export function electronAngles(shell: number, count: number, placement: Placement, r: number): number[] {
  if (placement === 'even' || count > MAX_PAIRED)
    return Array.from({ length: count }, (_, k) => TOP + (k * 360) / count)
  const half = ((1.4 * r) / ringRadius(shell)) * (180 / Math.PI)
  if (shell === 0 && count === 2) return [TOP - half, TOP + half]
  return Array.from({ length: count }, (_, k) => {
    const c = k % 4
    if (c + 4 >= count) return COMPASS[c]
    return COMPASS[c] + (k < 4 ? -half : half)
  })
}

/** How many places each shell has for electrons: its electrons, or with
 *  `neutral` given, the neutral atom's electrons where it had more, so a lost
 *  electron keeps its place (and its ring, past the ion's outermost shell). */
export function shellPlaces(electrons: number[], neutral?: number[]): number[] {
  const shells = Math.max(electrons.length, neutral?.length ?? 0)
  return Array.from({ length: shells }, (_, i) => Math.max(electrons[i] ?? 0, neutral?.[i] ?? 0))
}

const toXY = (radius: number, degrees: number) => {
  const a = (degrees * Math.PI) / 180
  return { x: round(radius * Math.cos(a)), y: round(radius * Math.sin(a)) }
}

export interface Ring {
  shell: number
  radius: number
  electrons: Dot[]
  /** where the shell label goes, around (0, 0) */
  label: { x: number; y: number; text: string }
}

export const LABEL_SIZE = 12
/** About how wide text is set in Arial, as for a particle diagram's key. */
export const textWidth = (text: string, fontSize: number) => 0.55 * fontSize * [...text].length
/** Where shell labels go when a ring has room there: the lower left. */
const LABEL_ANGLE = 135

const angleBetween = (a: number, b: number) => {
  const d = (((a - b) % 360) + 360) % 360
  return Math.min(d, 360 - d)
}

/** As near the lower left as the electrons allow: in the gap between them
 *  that lets the label get closest to it with room on both sides (or the
 *  middle of the widest gap nearest it, on a crowded ring), so the labels line up where
 *  they can and never move the electrons. */
function labelAngle(angles: number[], radius: number, text: string) {
  if (!angles.length) return LABEL_ANGLE
  const sorted = [...angles].sort((a, b) => a - b)
  const room = ((textWidth(text, LABEL_SIZE) / 2 + SYMBOL_ELECTRON_R + 2) / radius) * (180 / Math.PI)
  let best: { angle: number; off: number } | undefined
  let widest = { middle: 0, width: -1 }
  sorted.forEach((a, i) => {
    const next = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + 360
    const middle = (a + next) / 2
    const wider = next - a - widest.width
    if (wider > 1e-6 || (wider > -1e-6 && angleBetween(middle, LABEL_ANGLE) < angleBetween(widest.middle, LABEL_ANGLE)))
      widest = { middle, width: next - a }
    const lo = a + room
    const hi = next - room
    if (lo > hi) return
    for (const turn of [-360, 0, 360]) {
      const target = LABEL_ANGLE + turn
      const angle = Math.min(hi, Math.max(lo, target))
      if (!best || Math.abs(angle - target) < best.off) best = { angle, off: Math.abs(angle - target) }
    }
  })
  return best ? best.angle : widest.middle
}

/** Every ring around (0, 0) with its electrons and label. With the neutral
 *  atom's shells given, each shell's electrons past the neutral atom's are
 *  gained, and those it is short of are drawn as lost, in the places they
 *  had: the last to fill, since that is where an ion's electrons come and go. */
export function rings(electrons: number[], placement: Placement, electronSymbol: boolean, neutral?: number[]): Ring[] {
  return shellPlaces(electrons, neutral).map((places, shell) => {
    const radius = ringRadius(shell)
    const r = electronRadius(shell, places, electronSymbol)
    const angles = electronAngles(shell, places, placement, r)
    const count = electrons[shell] ?? 0
    const kept = neutral ? Math.min(count, neutral[shell] ?? 0) : count
    const change = (k: number): ElectronChange | undefined => (k >= count ? 'lost' : k >= kept ? 'gained' : undefined)
    const text = `n = ${shell + 1}`
    return {
      shell,
      radius,
      electrons: angles.map((a, k) => {
        const dot: Dot = { ...toXY(radius, a), r, component: 'electron' }
        const c = change(k)
        return c ? { ...dot, change: c } : dot
      }),
      label: { ...toXY(radius, labelAngle(angles, radius, text)), text },
    }
  })
}

// ---- Brackets -------------------------------------------------------------

export const CHARGE_FONT = 18
/** Brackets sit just outside the model's square, their arms reaching in. */
const BRACKET_GAP = 3
export const BRACKET_ARM = 8
const CHARGE_GAP = 4
/** Room above the brackets for the charge, which is set on their top. */
const CHARGE_RISE = 12
/** The charge's room is kept at least this wide, so ions with the same
 *  number of shells line up whatever their charge. */
const CHARGE_ROOM = textWidth('3+', CHARGE_FONT)

export interface Brackets {
  /** the box the brackets are drawn on, around (0, 0) */
  x1: number
  y1: number
  x2: number
  y2: number
  charge: { x: number; y: number; text: string }
  /** how far the brackets and charge reach past the model's square */
  pad: { left: number; right: number; top: number; bottom: number }
}

/** An ion's brackets around a model of `shells` shells, with `charge`
 *  written at the top right, as for a Lewis structure. */
export function brackets(shells: number, charge: string): Brackets {
  const half = modelSide(shells) / 2 + BRACKET_GAP
  const room = Math.max(CHARGE_ROOM, textWidth(charge, CHARGE_FONT))
  return {
    x1: -half,
    y1: -half,
    x2: half,
    y2: half,
    charge: { x: half + CHARGE_GAP, y: -half + CHARGE_FONT * 0.35, text: charge },
    pad: { left: BRACKET_GAP + 1, right: BRACKET_GAP + CHARGE_GAP + room, top: BRACKET_GAP + CHARGE_RISE, bottom: BRACKET_GAP + 1 },
  }
}

// ---- Words ----------------------------------------------------------------

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** The model as read by a screen reader. */
export function describeModel(protons: number, neutrons: number, electrons: number[], nucleus: 'balls' | 'text' | 'blank', emptyRings: boolean) {
  const inside = nucleus === 'blank' ? 'a blank nucleus' : `a nucleus of ${plural(protons, 'proton')} and ${plural(neutrons, 'neutron')}`
  const shells = emptyRings
    ? `${plural(electrons.length, 'empty ring')}`
    : `${plural(electrons.length, 'shell')} holding ${electrons.join(', ')} electrons`
  return `A Bohr model: ${inside}, with ${shells}`
}

/** The gained and lost electrons drawn on these rings, as read by a screen
 *  reader, e.g. "1 lost electron on shell 3". Empty when there are none. */
export function describeChanges(drawn: Ring[]) {
  const parts: string[] = []
  for (const change of ['gained', 'lost'] as const)
    for (const ring of drawn) {
      const n = ring.electrons.filter((e) => e.change === change).length
      if (n) parts.push(`${plural(n, `${change} electron`)} on shell ${ring.shell + 1}`)
    }
  return parts.join(', ')
}
