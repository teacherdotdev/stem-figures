// Potential Energy Diagram's settings, as they appear in the page address.
// Only the energies are stored: the levels, in order, and the catalysed
// transition state. Ea and ΔH are worked out from them, and typing one moves
// a level (see PotentialEnergyDiagram.svelte). The y-axis is a $shared/graph
// grid, numbered or shape only; the x-axis, the reaction coordinate, is
// never numbered, so its range isn't a setting.

import { GRIDLINES, type Gridlines } from '$shared/graph/grid'
import { gridFields } from '$shared/graph/axes'
import { COLORS, type Color } from '$shared/graph/colors'
import { bool, choice, defineSettings, number, text, type Field } from '$lib/shared/settings'
import { isLevelCount } from './profile'

/** A curve through the levels, or a level diagram: the reactants and products as lines, with ΔH between them. */
export const STYLES = ['curve', 'levels'] as const
export type Style = (typeof STYLES)[number]
export const STYLE_NAMES: Record<Style, string> = { curve: 'Energy profile', levels: 'Level diagram' }

/** How an arrow is labeled: Ea or ΔH, its value, a letter or number for a question, a blank line, or nothing. */
export const ARROW_LABELS = ['symbol', 'value', 'mark', 'blank', 'none'] as const
export type ArrowLabel = (typeof ARROW_LABELS)[number]
export const ARROW_LABEL_NAMES: Record<ArrowLabel, string> = {
  symbol: 'Symbol (Eₐ, ΔH)',
  value: 'Value (ΔH = −30 kJ/mol)',
  mark: 'Letter or number',
  blank: 'Blank line',
  none: 'None',
}

/** Arrows marked for a question are lettered A, B, C… or numbered 1, 2, 3… */
export const MARKS = ['letters', 'numbers'] as const

/** The energy unit, for the y-axis title and the values written on the arrows. */
export const UNITS = ['kj-per-mol', 'kj-mol-1', 'kj'] as const
export type Unit = (typeof UNITS)[number]
export const UNIT_TEXT: Record<Unit, string> = { 'kj-per-mol': 'kJ/mol', 'kj-mol-1': 'kJ mol⁻¹', kj: 'kJ' }

/** The y-axis numbered (with gridlines if wanted), or shape only: no numbers or gridlines. */
export const AXES = ['numbered', 'shape'] as const

/** The y-axis title this page writes for a unit; shape only has no unit. */
export const yTitleFor = (unit: Unit, numbered = true) => (numbered ? `Potential energy (${UNIT_TEXT[unit]})` : 'Potential energy')
export const PAGE_Y_TITLES = [...UNITS.map((u) => yTitleFor(u)), yTitleFor('kj', false)]

export const MAX_ENERGY = 100_000

/**
 * The levels' energies, in order along the reaction, written in the address
 * joined by underscores so negative energies survive: "50_150_20" is
 * reactants at 50, a transition state at 150 and products at 20. There are
 * always 3, 5 or 7 (one, two or three steps).
 */
function levels(fallback: number[]): Field<number[]> {
  const accept = (v: unknown) =>
    Array.isArray(v) && isLevelCount(v.length) && v.every((e) => typeof e === 'number' && Number.isFinite(e) && Math.abs(e) <= MAX_ENERGY)
      ? v.map(Number)
      : undefined
  return {
    fallback,
    accept,
    parse: (text) => {
      const parts = text.split('_')
      if (!parts.every((p) => /^-?\d+(\.\d+)?$/.test(p.trim()))) return undefined
      return accept(parts.map(Number))
    },
    format: (v) => v.join('_'),
  }
}

/** A label on a level: its text (empty for the word this page gives it) and whether it's written, a blank line or left off. */
const levelLabel = () => ({ text: text('', 40), mode: choice(['text', 'blank', 'none'] as const, 'text') })
const reactantsLabel = levelLabel()
const productsLabel = levelLabel()
const tsLabel = levelLabel()
const intLabel = levelLabel()
const COLOR_KEYS = Object.keys(COLORS) as Color[]

function omit<T extends object, K extends keyof T>(o: T, keys: readonly K[]): Omit<T, K> {
  const out: Partial<T> = { ...o }
  for (const k of keys) delete out[k]
  return out as Omit<T, K>
}

export const energySettings = defineSettings({
  style: choice(STYLES, 'curve'),
  levels: levels([50, 150, 20]),
  catalyst: bool(false),
  catTs: number({ min: -MAX_ENERGY, max: MAX_ENERGY, fallback: 100 }),
  uncatName: text('Uncatalysed', 40),
  catName: text('Catalysed', 40),
  unit: choice(UNITS, 'kj-per-mol'),

  eaArrow: bool(true),
  eaLabel: choice(ARROW_LABELS, 'symbol'),
  catEaArrow: bool(true),
  catEaLabel: choice(ARROW_LABELS, 'symbol'),
  dhArrow: bool(true),
  dhLabel: choice(ARROW_LABELS, 'symbol'),
  revEaArrow: bool(false),
  revEaLabel: choice(ARROW_LABELS, 'symbol'),
  bothHeads: bool(false),
  marks: choice(MARKS, 'letters'),
  guides: bool(true),

  reactantsLabel: reactantsLabel.text,
  reactantsLabelMode: reactantsLabel.mode,
  productsLabel: productsLabel.text,
  productsLabelMode: productsLabel.mode,
  tsLabel: tsLabel.text,
  tsLabelMode: tsLabel.mode,
  intLabel: intLabel.text,
  intLabelMode: intLabel.mode,

  color: choice(COLOR_KEYS, 'blue'),
  catColor: choice(COLOR_KEYS, 'red'),
  axes: choice(AXES, 'numbered'),
  gridlines: choice(Object.keys(GRIDLINES) as Gridlines[], 'light'),
  ...omit(
    gridFields({
      xFrom: '0', xTo: '15', xStep: '1', xEvery: 0,
      yFrom: '0', yTo: '180', yStep: '20', yEvery: 1,
      title: '', titleMode: 'none',
      xTitle: 'Reaction coordinate', xTitleMode: 'text',
      yTitle: yTitleFor('kj-per-mol'), yTitleMode: 'text',
      xLabel: '', xLabelMode: 'none', yLabel: '', yLabelMode: 'none',
      xStartCap: 'none', xEndCap: 'none', yStartCap: 'none', yEndCap: 'none',
      minor: 0,
    }),
    // The reaction coordinate is never numbered, so its range is fixed (see
    // ./profile.ts), and neither axis has a letter at its end or a cap at its start.
    ['xFrom', 'xTo', 'xStep', 'xEvery', 'xLabel', 'xLabelMode', 'yLabel', 'yLabelMode', 'xStartCap', 'yStartCap'],
  ),
})

export type EnergySettings = typeof energySettings.defaults

/** The level labels' settings keys, by the kind of level. */
export const LABEL_KEYS = {
  reactants: ['reactantsLabel', 'reactantsLabelMode'],
  products: ['productsLabel', 'productsLabelMode'],
  ts: ['tsLabel', 'tsLabelMode'],
  intermediate: ['intLabel', 'intLabelMode'],
} as const

/** The word each kind of level is labeled with unless the teacher types their own. */
export const LEVEL_WORDS = { reactants: 'Reactants', products: 'Products', ts: 'Transition state', intermediate: 'Intermediate' } as const

/** The unit as written on the figure. */
export const unitText = (s: Pick<EnergySettings, 'unit'>) => UNIT_TEXT[s.unit]
