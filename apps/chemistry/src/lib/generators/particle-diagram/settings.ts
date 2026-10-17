// Particle Diagram's settings, as they appear in the page address.

import { choice, defineSettings, json, number, text } from '$lib/shared/settings'
import { LATTICE_PATTERNS, LATTICE_SPACINGS, lattice, latticeRoom } from './lattice'
import { STATES, arrange, type State } from '$shared/particles/layout'
import {
  DEFAULT_OUTER,
  MAX_NAME,
  afterCount,
  atomKinds,
  isObject,
  tidyAtomNames,
  tidyKinds,
  tidyLook,
  type AtomName,
  type Disc,
  type Look,
  type ParticleKind,
} from '$shared/particles/particles'

/** Particles in the box, as a gas, liquid or solid (see `state`), or packed
 *  in a lattice. Called scattered from before boxes had states. */
export const LAYOUTS = ['scattered', 'lattice'] as const
export type Layout = (typeof LAYOUTS)[number]

export const BORDERS = ['single', 'double', 'none'] as const
export type Border = (typeof BORDERS)[number]

/** The box is always this square around scattered particles, whatever is in
 *  it, so answer choices made one at a time line up (see CONTEXT.md "Box"). */
export const BOX_SIDE = 300

/** One box of particles, or two with an arrow between: the same kinds before
 *  and after a reaction or a change of state, each kind with a count for
 *  each box. */
export const BOXES = ['one', 'two'] as const
export type Boxes = (typeof BOXES)[number]

/** How far a double border's inner line sits inside the outer one. */
export const DOUBLE_INSET = 6

/** Space between a lattice and the border around it. */
export const LATTICE_MARGIN = 10

export const MAX_SEED = 999999
export const MAX_LATTICE = 12

/** What the figure shows: the box, the box and its key, or just the key
 *  (so answer choices made one at a time can share one key). */
export const SHOWS = ['box', 'both', 'key'] as const
export type Show = (typeof SHOWS)[number]

export const MAX_NOTE = 80
export const MAX_ARROW_LABEL = 24

/** What the key of scattered particles lists: each kind whole, or each
 *  different atom in them, for students to write formulas from. */
export const KEY_LISTS = ['particles', 'atoms'] as const
export type KeyList = (typeof KEY_LISTS)[number]

const DEFAULT_KINDS: ParticleKind[] = [
  { count: 4, shape: 'single', look: { size: 'l', shade: 'light', charge: '-' }, outer: { ...DEFAULT_OUTER } },
  { count: 4, shape: 'single', look: { size: 's', shade: 'white', charge: '+' }, outer: { ...DEFAULT_OUTER } },
]

const look = (fallback: Look) => json(fallback, (v) => (isObject(v) ? tidyLook(v, fallback) : undefined))

export const particleSettings = defineSettings(
  {
    layout: choice(LAYOUTS, 'scattered'),
    // boxes from before states were a gas: scattered at random
    state: choice(STATES, 'gas'),
    boxes: choice(BOXES, 'one'),
    afterState: choice(STATES, 'gas'),
    // nothing over the arrow unless the teacher types something
    arrowLabel: text('', MAX_ARROW_LABEL),
    particles: json(DEFAULT_KINDS, tidyKinds),
    seed: number({ min: 1, max: MAX_SEED, fallback: 2 }),
    border: choice(BORDERS, 'single'),
    pattern: choice(LATTICE_PATTERNS, 'alternate'),
    rows: number({ min: 1, max: MAX_LATTICE, fallback: 4 }),
    columns: number({ min: 1, max: MAX_LATTICE, fallback: 5 }),
    spacing: choice(LATTICE_SPACINGS, 'touching'),
    main: look({ size: 'l', shade: 'light', charge: '-' }),
    second: look({ size: 's', shade: 'white', charge: '+' }),
    secondCount: number({ min: 0, max: MAX_LATTICE * MAX_LATTICE, fallback: 4 }),
    mainName: text('', MAX_NAME),
    secondName: text('', MAX_NAME),
    // lattices are usually drawn without a box, so theirs starts off
    latticeBorder: choice(BORDERS, 'none'),
    show: choice(SHOWS, 'box'),
    keyNote: text('', MAX_NOTE),
    keyList: choice(KEY_LISTS, 'particles'),
    atomNames: json<AtomName[]>([], tidyAtomNames),
    titleMode: choice(['none', 'text'] as const, 'none'),
    title: text(''),
  },
  (s) => ({
    ...s,
    seed: Math.round(s.seed),
    rows: Math.round(s.rows),
    columns: Math.round(s.columns),
    secondCount: Math.round(s.secondCount),
  }),
)

export type ParticleSettings = typeof particleSettings.defaults

/** A seed for a new random layout. */
export const newSeed = () => 1 + Math.floor(Math.random() * MAX_SEED)

/** Particles arranged in a box for its state, inside the inner line of a
 *  double border, and how many didn't fit. */
function particlesIn(kinds: ParticleKind[], state: State, border: Border, seed: number) {
  const inset = border === 'double' ? DOUBLE_INSET : 0
  const { discs, missing } = arrange(state, kinds, BOX_SIDE - 2 * inset, BOX_SIDE - 2 * inset, seed)
  return { discs: discs.map((d) => ({ ...d, x: d.x + inset, y: d.y + inset })), missing }
}

/** The particles in the box, or the before box, for these settings. */
export const boxParticles = (s: ParticleSettings) => particlesIn(s.particles, s.state, s.border, s.seed)

/** The after box's kinds, each with its after count. */
export const afterKinds = (s: ParticleSettings) => s.particles.map((k) => ({ ...k, count: afterCount(k) }))

/** The particles in the after box. Its arrangement is its own, from a seed
 *  past any the before box can have. */
export const afterParticles = (s: ParticleSettings) => particlesIn(afterKinds(s), s.afterState, s.border, s.seed + MAX_SEED)

/** A lattice's atoms or ions as particle kinds, for its key: the main one,
 *  and the second one when any of it is drawn. */
function latticeKinds(s: ParticleSettings, discs: Disc[]): ParticleKind[] {
  const kind = (look: Look, name: string, count: number): ParticleKind => ({
    count,
    shape: 'single',
    look,
    outer: { ...DEFAULT_OUTER },
    ...(name.trim() ? { name } : {}),
  })
  const seconds = s.pattern === 'pure' ? 0 : s.pattern === 'alternate' ? Math.floor((s.rows * s.columns) / 2) : Math.min(s.secondCount, latticeRoom(s))
  const main = kind(s.main, s.mainName, discs.length - seconds)
  return seconds ? [main, kind(s.second, s.secondName, seconds)] : [main]
}

export interface BoxContents {
  width: number
  height: number
  border: Border
  discs: Disc[]
  /** particles, or a lattice's second atoms, that had no room */
  missing: number
  /** what the key lists */
  kinds: ParticleKind[]
  /** the after box of a before-and-after figure, the same size as this one
   *  and to its right, with its kinds at their after counts */
  after?: { discs: Disc[]; missing: number; kinds: ParticleKind[] }
}

/** Everything in the box for these settings: the fixed square of particles,
 *  or a lattice with a box just fitting it. */
export function boxContents(s: ParticleSettings): BoxContents {
  if (s.layout === 'scattered') {
    const box: BoxContents = { width: BOX_SIDE, height: BOX_SIDE, border: s.border, ...boxParticles(s), kinds: s.particles }
    return s.boxes === 'two' ? { ...box, after: { ...afterParticles(s), kinds: afterKinds(s) } } : box
  }
  const grid = lattice(s)
  const border = s.latticeBorder
  const pad = border === 'none' ? 0 : LATTICE_MARGIN + (border === 'double' ? DOUBLE_INSET : 0)
  return {
    width: grid.width + 2 * pad,
    height: grid.height + 2 * pad,
    border,
    discs: grid.discs.map((d) => ({ ...d, x: d.x + pad, y: d.y + pad })),
    missing: grid.missing,
    kinds: latticeKinds(s, grid.discs),
  }
}

/** What the key lists: the box's kinds, or each different atom in them when
 *  the teacher lists each atom (a lattice's kinds are atoms already). */
export const keyKinds = (s: ParticleSettings, box: BoxContents) =>
  s.layout === 'scattered' && s.keyList === 'atoms' ? atomKinds(box.kinds, s.atomNames) : box.kinds
