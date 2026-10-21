// Supply and Demand's settings, as they appear in the page address: each
// curve's shape (or, numbered, a schedule of prices and the quantities
// demanded and supplied at each), shifts, a price ceiling or floor, a
// per-unit tax or subsidy, the regions shaded, and every label's words.

import { bool, choice, defineSettings, number, text } from '$shared/settings'
import { NUMBER_FROMS, labels, lookFields } from '$lib/graph/settings'
import { SHIFT_SIZES } from '$lib/graph/shifts'

/** A curve's slope on a schematic graph, from perfectly inelastic (upright) to perfectly elastic (flat). */
export const SHAPES = ['normal', 'steep', 'flat', 'vertical', 'horizontal'] as const
export type Shape = (typeof SHAPES)[number]
export const SHAPE_NAMES: Record<Shape, string> = {
  normal: 'Normal',
  steep: 'Steep (inelastic)',
  flat: 'Flat (elastic)',
  vertical: 'Vertical (perfectly inelastic)',
  horizontal: 'Horizontal (perfectly elastic)',
}

export const SHIFTS = ['none', 'demand', 'supply', 'both'] as const
export type Shift = (typeof SHIFTS)[number]
export const DIRECTIONS = ['increase', 'decrease'] as const
export type Direction = (typeof DIRECTIONS)[number]

export const CONTROLS = ['none', 'ceiling', 'floor'] as const
export type Control = (typeof CONTROLS)[number]
export const CONTROL_NAMES: Record<Control, string> = { none: 'None', ceiling: 'Price ceiling', floor: 'Price floor' }

export const TAXES = ['none', 'tax', 'subsidy'] as const
export type Tax = (typeof TAXES)[number]
export const TAX_NAMES: Record<Tax, string> = { none: 'None', tax: 'Per-unit tax', subsidy: 'Per-unit subsidy' }

/** How equilibrium values are named: Pₑ and Qₑ, or P* and Q*. */
export const EQ_STYLES = ['e', 'star'] as const
export type EqStyle = (typeof EQ_STYLES)[number]

/** The schedule a numbered graph starts with: price, quantity demanded, quantity supplied. */
export const SCHEDULE = '1,800,400;1.5,700,500;2,600,600;2.5,500,700;3,400,800'

export const supplyDemandSettings = defineSettings({
  demandShape: choice(SHAPES, 'normal'),
  supplyShape: choice(SHAPES, 'normal'),
  /** numbered: rows of price, quantity demanded and quantity supplied */
  schedule: text(SCHEDULE, 400),
  /** numbered: a dot at each row of the schedule */
  dots: bool(true),
  fit: bool(true),

  shift: choice(SHIFTS, 'none'),
  demandDir: choice(DIRECTIONS, 'increase'),
  supplyDir: choice(DIRECTIONS, 'increase'),
  demandSize: choice(SHIFT_SIZES, 'medium'),
  supplySize: choice(SHIFT_SIZES, 'medium'),
  arrows: number({ min: 0, max: 3, fallback: 2 }),

  control: choice(CONTROLS, 'none'),
  /** the controlled price: schematic, as a share of the way up the y-axis; numbered, as typed */
  controlAt: number({ min: 0, max: 1, fallback: 0.3 }),
  controlPrice: number({ min: -1e9, max: 1e9, fallback: 1.5 }),
  brace: bool(true),

  tax: choice(TAXES, 'none'),
  /** the tax or subsidy per unit: schematic, as a share of the y-axis; numbered, as typed */
  taxSize: number({ min: 0.04, max: 0.5, fallback: 0.2 }),
  taxAmount: number({ min: 0, max: 1e9, fallback: 0.5 }),

  cs: bool(false),
  ps: bool(false),
  dwl: bool(false),
  revenue: bool(false),

  guides: bool(true),
  eqStyle: choice(EQ_STYLES, 'e'),
  numberFrom: choice(NUMBER_FROMS, '1'),
  ...labels({
    dLabel: 'D', sLabel: 'S', eLabel: 'E', pLabel: 'P', qLabel: 'Q',
    ceilingLabel: 'Price ceiling', floorLabel: 'Price floor', shortageLabel: 'Shortage', surplusLabel: 'Surplus',
    qdLabel: 'Q_d', qsLabel: 'Q_s',
    taxLabel: 'S + tax', subsidyLabel: 'S − subsidy', buyerLabel: 'P_b', sellerLabel: 'P_s', qtLabel: 'Q_t', qsubLabel: 'Q_{sub}',
    csLabel: 'CS', psLabel: 'PS', dwlLabel: 'DWL', revenueLabel: 'Tax revenue', costLabel: 'Subsidy cost',
  }),
  ...lookFields({
    xTitle: 'Quantity', yTitle: 'Price',
    range: { xFrom: '0', xTo: '1000', xStep: '100', yFrom: '0', yTo: '4', yStep: '0.5' },
  }),
})

export type SupplyDemandSettings = typeof supplyDemandSettings.defaults

/** The label keys, for making every label blank at once. */
export const LABEL_KEYS = [
  'dLabel', 'sLabel', 'eLabel', 'pLabel', 'qLabel', 'ceilingLabel', 'floorLabel', 'shortageLabel', 'surplusLabel', 'qdLabel', 'qsLabel',
  'taxLabel', 'subsidyLabel', 'buyerLabel', 'sellerLabel', 'qtLabel', 'qsubLabel', 'csLabel', 'psLabel', 'dwlLabel', 'revenueLabel', 'costLabel',
] as const

/** A schedule's rows, sorted by price, leaving out any that aren't three numbers. */
export function rowsOf(schedule: string) {
  return schedule
    .split(';')
    .map((row) => row.split(',').map((v) => (v.trim() ? Number(v.trim()) : NaN)))
    .filter((r) => r.length === 3 && r.every((v) => Number.isFinite(v)) && r.every((v, k) => k === 0 || v >= 0))
    .map(([p, qd, qs]) => ({ p, qd, qs }))
    .sort((a, b) => a.p - b.p)
}

/** Rows written back as a schedule. */
export const scheduleOf = (rows: { p: number; qd: number; qs: number }[]) => rows.map((r) => `${r.p},${r.qd},${r.qs}`).join(';')
