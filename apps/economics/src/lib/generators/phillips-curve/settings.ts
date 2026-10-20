// Phillips Curve's settings, as they appear in the page address: the short-
// and long-run Phillips curves (or, numbered, the natural rate, expected
// inflation and a second point the short-run curve passes through), the
// movement (along the short-run curve, or either curve shifting) and the
// long run after it, the points named and their dashed guides, and every
// label's words.

import { bool, choice, defineSettings, number } from '$shared/settings'
import { labels, lookFields } from '$lib/graph/settings'
import { SHIFT_SIZES } from '$lib/graph/shifts'

/** How sharply the short-run curve bends. */
export const CURVATURES = ['gentle', 'normal', 'strong'] as const
export type Curvature = (typeof CURVATURES)[number]
export const CURVATURE_NAMES: Record<Curvature, string> = { gentle: 'Gentle', normal: 'Normal', strong: 'Strong' }

/** What happens: nothing, a movement along the short-run curve, or one of the curves shifting. */
export const MOVEMENTS = ['none', 'along', 'srpc', 'lrpc'] as const
export type Movement = (typeof MOVEMENTS)[number]
export const MOVEMENT_NAMES: Record<Movement, string> = { none: 'None', along: 'Along SRPC', srpc: 'SRPC shifts', lrpc: 'LRPC shifts' }

/** Up the short-run curve (unemployment falls, inflation rises), or down it. */
export const ALONG = ['up', 'down'] as const
export type Along = (typeof ALONG)[number]
export const SIDES = ['right', 'left'] as const
export type Side = (typeof SIDES)[number]

/** Why the short-run curve shifts: a supply shock moves the economy off the LRPC; a change in expected inflation moves it along. */
export const CAUSES = ['shock', 'expectations'] as const
export type Cause = (typeof CAUSES)[number]
export const CAUSE_NAMES: Record<Cause, string> = { shock: 'Supply shock', expectations: 'Expected inflation' }

/** Where the percent signs go on a numbered graph. */
export const PERCENTS = ['numbers', 'titles', 'none'] as const
export type Percent = (typeof PERCENTS)[number]
export const PERCENT_NAMES: Record<Percent, string> = { numbers: 'On the numbers', titles: 'In the axis titles', none: 'None' }

const look = lookFields({
  xTitle: 'Unemployment rate', yTitle: 'Inflation rate',
  range: { xFrom: '0', xTo: '10', xStep: '1', yFrom: '-1', yTo: '9', yStep: '1' },
})

export const phillipsSettings = defineSettings({
  srpc: bool(true),
  lrpc: bool(true),
  curvature: choice(CURVATURES, 'normal'),
  /** schematic: the natural rate, as a share of the way along the x-axis */
  nruAt: number({ min: 0.3, max: 0.7, fallback: 0.5 }),
  /** numbered: the natural rate of unemployment and expected inflation (where the curves cross), in % */
  nru: number({ min: 0, max: 1e6, fallback: 5 }),
  expected: number({ min: -1e6, max: 1e6, fallback: 2 }),
  /** numbered: a second point the short-run curve passes through, and the point a movement along it goes to */
  u2: number({ min: 0, max: 1e6, fallback: 3 }),
  pi2: number({ min: -1e6, max: 1e6, fallback: 6 }),
  fit: bool(true),
  percent: choice(PERCENTS, 'numbers'),

  movement: choice(MOVEMENTS, 'none'),
  along: choice(ALONG, 'up'),
  srpcSide: choice(SIDES, 'right'),
  cause: choice(CAUSES, 'shock'),
  lrpcSide: choice(SIDES, 'left'),
  /** schematic: how far it moves or shifts */
  size: choice(SHIFT_SIZES, 'medium'),
  /** numbered: expected inflation after the short-run curve shifts */
  expected2: number({ min: -1e6, max: 1e6, fallback: 5 }),
  /** numbered: the unemployment rate after a supply shock */
  uShock: number({ min: 0, max: 1e6, fallback: 6 }),
  /** numbered: the natural rate after the long-run curve shifts */
  nru2: number({ min: 0, max: 1e6, fallback: 4 }),
  /** the short-run curve moves with the long-run one */
  withSrpc: bool(true),
  /** after a movement along the short-run curve, expectations catch up and the economy returns to the LRPC */
  longRun: bool(false),
  arrows: number({ min: 0, max: 3, fallback: 2 }),
  /** an arrow from each point to the next */
  pathArrows: bool(true),

  pointA: bool(true),
  pointB: bool(true),
  pointC: bool(true),
  guides: bool(true),
  /** the inflation and unemployment rates written where the guides meet the axes */
  values: bool(true),
  ...labels({ srpcLabel: 'SRPC', lrpcLabel: 'LRPC', nruLabel: 'u_n', aLabel: 'A', bLabel: 'B', cLabel: 'C', piLabel: 'π', uLabel: 'u' }),
  ...look,
  // Numbered every other line across, where the numbers with % signs would crowd.
  xEvery: { ...look.xEvery, fallback: 2 },
})

export type PhillipsSettings = typeof phillipsSettings.defaults

/** The label keys, for making every label blank at once. */
export const LABEL_KEYS = ['srpcLabel', 'lrpcLabel', 'nruLabel', 'aLabel', 'bLabel', 'cLabel', 'piLabel', 'uLabel'] as const
