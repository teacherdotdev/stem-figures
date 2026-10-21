// AD–AS Model's settings, as they appear in the page address: the shape of
// aggregate supply (or, numbered, a schedule of price levels and the real
// GDP demanded and supplied at each, and potential GDP), where the economy
// starts, shifts of AD, SRAS and LRAS, the output gap's brace, a callout,
// and every label's words.

import { bool, choice, defineSettings, number, text } from '$shared/settings'
import { NUMBER_FROMS, labels, lookFields } from '$lib/graph/settings'
import { SHIFT_SIZES } from '$lib/graph/shifts'

/** Aggregate supply as a straight upward line (the AP short-run curve), or flat, then curving up, then nearly vertical. */
export const AS_SHAPES = ['straight', 'three'] as const
export type AsShape = (typeof AS_SHAPES)[number]
export const AS_SHAPE_NAMES: Record<AsShape, string> = { straight: 'Straight (SRAS)', three: 'Three ranges (Keynesian)' }

/** Where the economy starts: at full employment, or short of it or past it. */
export const STARTS = ['full', 'recession', 'inflation'] as const
export type Start = (typeof STARTS)[number]
export const START_NAMES: Record<Start, string> = { full: 'Long-run equilibrium', recession: 'Recessionary gap', inflation: 'Inflationary gap' }

/** A shift: none, left or right by a size, or (AD and SRAS) as far as it takes to bring output to full employment. */
export const SHIFTS = ['none', 'left', 'right', 'full'] as const
export type Shift = (typeof SHIFTS)[number]
export const LRAS_SHIFTS = ['none', 'left', 'right'] as const
export type LrasShift = (typeof LRAS_SHIFTS)[number]

/** How equilibrium values are named: PLₑ and Yₑ, or PL* and Y*. */
export const EQ_STYLES = ['e', 'star'] as const
export type EqStyle = (typeof EQ_STYLES)[number]

/** The names LRAS is commonly given, for the quick picks. */
export const LRAS_NAMES = ['LRAS', 'Potential GDP', 'Potential GDP/LRAS'] as const

/** The schedule a numbered graph starts with: price level, real GDP demanded (AD) and supplied (AS). */
export const SCHEDULE = '70,10000,6500;80,9400,8000;90,8800,8800;100,8200,9300;110,7600,9600;120,7000,9800;130,6400,9900'

const LOOK = lookFields({
  xTitle: 'Real GDP', yTitle: 'Price Level',
  range: { xFrom: '6000', xTo: '10500', xStep: '500', yFrom: '60', yTo: '140', yStep: '10' },
})

export const adAsSettings = defineSettings({
  asShape: choice(AS_SHAPES, 'straight'),
  lras: bool(true),
  /** numbered: rows of price level, real GDP demanded and real GDP supplied */
  schedule: text(SCHEDULE, 400),
  /** numbered: potential (full-employment) real GDP, where LRAS stands */
  potential: number({ min: -1e12, max: 1e12, fallback: 9500 }),
  /** numbered: a dot at each row of the schedule */
  dots: bool(true),
  /** numbered: curves bent smoothly through the rows, rather than straight from row to row */
  smooth: bool(true),
  fit: bool(true),

  start: choice(STARTS, 'full'),
  gapSize: choice(SHIFT_SIZES, 'medium'),

  adShift: choice(SHIFTS, 'none'),
  adSize: choice(SHIFT_SIZES, 'medium'),
  srasShift: choice(SHIFTS, 'none'),
  srasSize: choice(SHIFT_SIZES, 'medium'),
  lrasShift: choice(LRAS_SHIFTS, 'none'),
  lrasSize: choice(SHIFT_SIZES, 'medium'),
  arrows: number({ min: 0, max: 3, fallback: 2 }),

  brace: bool(true),
  callout: bool(false),

  guides: bool(true),
  eqStyle: choice(EQ_STYLES, 'e'),
  numberFrom: choice(NUMBER_FROMS, '1'),
  ...labels({
    adLabel: 'AD', asLabel: 'SRAS', lrasLabel: 'LRAS', eLabel: 'E', plLabel: 'PL', gdpLabel: 'Y', yfLabel: 'Y_f',
    recessionLabel: 'Recessionary gap', inflationLabel: 'Inflationary gap', calloutLabel: '',
  }),
  ...LOOK,
  // Real GDP's numbers run to five figures, too wide to number every line.
  xEvery: { ...LOOK.xEvery, fallback: 2 },
})

export type AdAsSettings = typeof adAsSettings.defaults

/** The label keys, for making every label blank at once. */
export const LABEL_KEYS = ['adLabel', 'asLabel', 'lrasLabel', 'eLabel', 'plLabel', 'gdpLabel', 'yfLabel', 'recessionLabel', 'inflationLabel', 'calloutLabel'] as const

/** A schedule's rows, sorted by price level, leaving out any that aren't three numbers. */
export function rowsOf(schedule: string) {
  return schedule
    .split(';')
    .map((row) => row.split(',').map((v) => (v.trim() ? Number(v.trim()) : NaN)))
    .filter((r) => r.length === 3 && r.every((v) => Number.isFinite(v)))
    .map(([pl, ad, as]) => ({ pl, ad, as }))
    .sort((a, b) => a.pl - b.pl)
}
