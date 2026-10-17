// Osmosis and Tonicity's settings, as they appear in the page address. The
// scene (a cell in a solution, or two solutions either side of a membrane),
// up to three solutes, each with its concentration on each side and whether
// it can cross the membrane, and what the figure shows and labels. Tonicity
// is never typed: it's worked out from the concentrations (./model.ts).

import { figureTextFields } from '$shared/figureText'
import { CHARGES, SHADES, SIZES, type Charge, type Shade, type Size } from '$shared/particles/particles'
import { bool, choice, defineSettings, number, text, type Field } from '$shared/settings'

/** A red blood cell or a plant cell in a solution, a beaker split by a
 *  membrane, a U-tube with the membrane at the bottom, or a dialysis-tubing
 *  bag in a beaker. */
export const SCENES = ['blood', 'plant', 'beaker', 'utube', 'bag'] as const
export type Scene = (typeof SCENES)[number]
export const SCENE_NAMES: Record<Scene, string> = {
  blood: 'Red blood cell',
  plant: 'Plant cell',
  beaker: 'Split beaker',
  utube: 'U-tube',
  bag: 'Dialysis bag',
}

/** Scenes with an inside and an outside, rather than two sides. */
export const CELLS: readonly Scene[] = ['blood', 'plant']
export const isCell = (scene: Scene) => CELLS.includes(scene)
export const twoSided = (scene: Scene) => scene === 'beaker' || scene === 'utube'

/** The start, the result, both with an arrow between, or (for a cell) the
 *  same cell in a hypotonic, an isotonic and a hypertonic solution. */
export const VIEWS = ['start', 'result', 'both', 'three'] as const
export type View = (typeof VIEWS)[number]

/** What the three cells of a three-up show: each one's result, or the start
 *  for students to predict. */
export const THREE_SHOWS = ['result', 'start'] as const

/** The three-up's cells in order (hypotonic, isotonic, hypertonic), or
 *  shuffled for practice. */
export const ORDERS = ['in-order', 'shuffled'] as const

export const UNITS = ['%', 'M', 'mM'] as const
export type Unit = (typeof UNITS)[number]

/** A label written out, left as a blank line for students, or left off. */
export const LABEL_MODES = ['text', 'blank', 'none'] as const
export type LabelMode = (typeof LABEL_MODES)[number]

/** An arrow drawn, left as a dashed box for students to draw in, or left off. */
export const ARROW_MODES = ['show', 'blank', 'none'] as const
export type ArrowMode = (typeof ARROW_MODES)[number]

export const MAX_SOLUTES = 3
export const SOLUTE_SLOTS = [0, 1, 2] as const
export type SoluteIndex = (typeof SOLUTE_SLOTS)[number]
export const MAX_CONCENTRATION = 1000
export const MAX_NAME = 30
export const MAX_SEED = 999999

interface SoluteStart {
  on: boolean
  name: string
  size: Size
  shade: Shade
  inside: number
  outside: number
  cross: boolean
}

/** One solute's fields, numbered from 1 in the address: name1, in1, out1… */
function solute<N extends 1 | 2 | 3>(n: N, d: SoluteStart) {
  return {
    [`on${n}`]: bool(d.on),
    [`name${n}`]: text(d.name, MAX_NAME),
    [`size${n}`]: choice(SIZES, d.size),
    [`shade${n}`]: choice(SHADES, d.shade),
    [`charge${n}`]: choice(CHARGES, ''),
    /** whether it can cross the membrane */
    [`cross${n}`]: bool(d.cross),
    /** its concentration inside the cell or bag, or on side A */
    [`in${n}`]: number({ min: 0, max: MAX_CONCENTRATION, fallback: d.inside }),
    /** its concentration outside, or on side B */
    [`out${n}`]: number({ min: 0, max: MAX_CONCENTRATION, fallback: d.outside }),
  } as Record<`on${N}` | `cross${N}`, Field<boolean>> &
    Record<`name${N}`, Field<string>> &
    Record<`size${N}`, Field<Size>> &
    Record<`shade${N}`, Field<Shade>> &
    Record<`charge${N}`, Field<Charge>> &
    Record<`in${N}` | `out${N}`, Field<number>>
}

export const osmosisSettings = defineSettings(
  {
    scene: choice(SCENES, 'blood'),
    view: choice(VIEWS, 'three'),
    threeShows: choice(THREE_SHOWS, 'result'),
    order: choice(ORDERS, 'in-order'),
    orderSeed: number({ min: 1, max: MAX_SEED, fallback: 1 }),
    unit: choice(UNITS, '%'),
    // The second and third solutes start as the AP Biology bag's: glucose,
    // which can cross dialysis tubing, and starch, which can't.
    ...solute(1, { on: true, name: 'NaCl', size: 's', shade: 'gray', inside: 0.9, outside: 5, cross: false }),
    ...solute(2, { on: false, name: 'glucose', size: 's', shade: 'white', inside: 0, outside: 0, cross: true }),
    ...solute(3, { on: false, name: 'starch', size: 'l', shade: 'dark', inside: 0, outside: 0, cross: false }),
    seed: number({ min: 1, max: MAX_SEED, fallback: 1 }),
    water: bool(true),
    /** a red blood cell in a hypotonic solution bursts, rather than swells */
    burst: bool(false),
    color: bool(true),
    key: bool(true),
    waterArrows: choice(ARROW_MODES, 'show'),
    soluteArrows: choice(ARROW_MODES, 'show'),
    concMode: choice(LABEL_MODES, 'text'),
    tonicityMode: choice(LABEL_MODES, 'text'),
    membraneMode: choice(LABEL_MODES, 'text'),
    /** the membrane's label; empty for the scene's own */
    membrane: text('', 40),
    partsMode: choice(LABEL_MODES, 'none'),
    stateMode: choice(LABEL_MODES, 'text'),
    ...figureTextFields(),
  },
  (s) => ({
    ...s,
    // only a cell has a three-up
    view: s.view === 'three' && !isCell(s.scene) ? 'both' : s.view,
    seed: Math.round(s.seed),
    orderSeed: Math.round(s.orderSeed),
  }),
)

export type OsmosisSettings = typeof osmosisSettings.defaults

/** A seed for a new random layout or order. */
export const newSeed = () => 1 + Math.floor(Math.random() * MAX_SEED)

/** One solute's settings, by its index (0 to 2). */
export function soluteOf(s: OsmosisSettings, i: SoluteIndex) {
  const n = (i + 1) as 1 | 2 | 3
  return {
    index: i,
    on: s[`on${n}`],
    name: s[`name${n}`],
    look: { size: s[`size${n}`], shade: s[`shade${n}`], charge: s[`charge${n}`] },
    cross: s[`cross${n}`],
    inside: s[`in${n}`],
    outside: s[`out${n}`],
  }
}

export type SoluteSettings = ReturnType<typeof soluteOf>

/** The solutes switched on, in order. */
export const solutesOf = (s: OsmosisSettings) => SOLUTE_SLOTS.map((i) => soluteOf(s, i)).filter((x) => x.on)

/** The membrane's label as the scene names it, unless the teacher typed one. */
export function membraneName(s: OsmosisSettings) {
  if (s.membrane.trim()) return s.membrane.trim()
  if (isCell(s.scene)) return 'Cell membrane'
  return s.scene === 'bag' ? 'Dialysis tubing' : 'Selectively permeable membrane'
}
