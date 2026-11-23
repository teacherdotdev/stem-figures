// Phase Diagram's settings, as they appear in the page address. A real
// substance's values are ./phase.ts's; Your own substance's six are typed,
// in the units chosen. The grid and axes are $shared/graph's, numbered only
// for Your own substance on a grid.

import { gridFields } from '$shared/graph/axes'
import { COLORS, type Color } from '$shared/graph/colors'
import { bool, choice, defineSettings, number, text } from '$lib/shared/settings'
import { P_UNITS, P_UNIT_TEXT, SUBSTANCES, T_UNITS, T_UNIT_TEXT, findSubstance, type PUnit, type SubstanceId, type TUnit } from './phase'

/** Which substance: a real one, or the teacher's own (custom), from the six values typed. */
export const SUBSTANCE_CHOICES = [...SUBSTANCES.map((x) => x.id), 'custom'] as (SubstanceId | 'custom')[]

/**
 * Not to scale (shape): the textbook figure, no numbers along the axes, the
 * values written at them. On a grid (numbered): numbered axes and gridlines,
 * to scale, for Your own substance only. Named as Potential Energy Diagram's are.
 */
export const AXES = ['shape', 'numbered'] as const
export type Axes = (typeof AXES)[number]
export const AXES_NAMES: Record<Axes, string> = { shape: 'Not to scale', numbered: 'On a grid' }

/** How the regions, the two points and the boundaries are labeled. */
export const LABELS = ['names', 'letters', 'blank', 'none'] as const
export type LabelMode = (typeof LABELS)[number]
export const CURVE_LABELS = ['none', 'names', 'letters', 'blank'] as const
export const LABEL_NAMES: Record<LabelMode, string> = { names: 'Names', letters: 'Letters', blank: 'Blank lines', none: 'None' }

/** What's written at the axes where the dashed lines land, not to scale. */
export const AXIS_VALUES = ['values', 'blank', 'none'] as const
export const AXIS_VALUE_NAMES: Record<(typeof AXIS_VALUES)[number], string> = { values: 'Values', blank: 'Blank lines', none: 'None' }

/** What marks each place the 1 atm line crosses a boundary. */
export const NORMAL_POINTS = ['values', 'names', 'letters', 'blank', 'none'] as const
export type NormalPoints = (typeof NORMAL_POINTS)[number]
export const NORMAL_POINT_NAMES: Record<NormalPoints, string> = {
  values: 'Temperatures',
  names: 'Names (Normal b.p.)',
  letters: 'Letters',
  blank: 'Blank lines',
  none: 'None',
}

/** The axis titles this page writes for each unit. */
export const xTitleFor = (unit: TUnit) => `Temperature (${T_UNIT_TEXT[unit]})`
export const yTitleFor = (unit: PUnit) => `Pressure (${P_UNIT_TEXT[unit]})`
export const PAGE_X_TITLES = T_UNITS.map(xTitleFor)
export const PAGE_Y_TITLES = P_UNITS.map(yTitleFor)

export const MAX_SEED = 999_999
export const newSeed = () => 1 + Math.floor(Math.random() * MAX_SEED)

const temperature = (fallback: number) => number({ min: -273.15, max: 10000, fallback })
const pressure = (fallback: number) => number({ min: 0, max: 10_000_000, fallback })

export const phaseSettings = defineSettings(
  {
    substance: choice(SUBSTANCE_CHOICES, 'water'),
    axes: choice(AXES, 'shape'),
    tUnit: choice(T_UNITS, 'C'),
    pUnit: choice(P_UNITS, 'atm'),
    // Your own substance: its name, and its six values in the units chosen.
    name: text('Substance X', 40),
    tripleT: temperature(20),
    tripleP: pressure(0.4),
    critT: temperature(140),
    critP: pressure(3),
    nmp: temperature(22),
    nbp: temperature(75),

    regions: choice(LABELS, 'names'),
    points: choice(LABELS, 'names'),
    curves: choice(CURVE_LABELS, 'none'),
    guides: bool(true),
    axisValues: choice(AXIS_VALUES, 'values'),
    isobar: bool(false),
    normalPoints: choice(NORMAL_POINTS, 'values'),
    supercritical: bool(false),
    shuffle: number({ min: 0, max: MAX_SEED, fallback: 0 }),

    color: choice(Object.keys(COLORS) as Color[], 'blue'),
    ...gridFields({
      xFrom: '0', xTo: '160', xStep: '10', xEvery: 2,
      yFrom: '0', yTo: '3.5', yStep: '0.25', yEvery: 2,
      title: '', titleMode: 'none',
      xTitle: xTitleFor('C'), xTitleMode: 'text',
      yTitle: yTitleFor('atm'), yTitleMode: 'text',
      xLabel: 'T', xLabelMode: 'none', yLabel: 'P', yLabelMode: 'none',
      xStartCap: 'none', xEndCap: 'triangle', yStartCap: 'none', yEndCap: 'triangle',
      minor: 0,
    }),
  },
  // Only Your own substance goes on a grid: a real one's triple and critical
  // pressures are too far apart for any plain axis to show both. An axis
  // title this page writes follows the unit chosen.
  (s) => ({
    ...s,
    axes: s.substance !== 'custom' ? ('shape' as const) : s.axes,
    xTitle: PAGE_X_TITLES.includes(s.xTitle) ? xTitleFor(s.tUnit) : s.xTitle,
    yTitle: PAGE_Y_TITLES.includes(s.yTitle) ? yTitleFor(s.pUnit) : s.yTitle,
  }),
)

export type PhaseSettings = typeof phaseSettings.defaults

/** The real substance the settings pick, or undefined for Your own. */
export const substanceOf = (s: Pick<PhaseSettings, 'substance'>) => findSubstance(s.substance)

/** The substance's name: a real one's, or the one typed for Your own. */
export const substanceName = (s: Pick<PhaseSettings, 'substance' | 'name'>) => substanceOf(s)?.name ?? (s.name.trim() || 'Substance X')

/** Whether the diagram is on numbered axes, to scale. */
export const onGrid = (s: Pick<PhaseSettings, 'substance' | 'axes'>) => s.substance === 'custom' && s.axes === 'numbered'
