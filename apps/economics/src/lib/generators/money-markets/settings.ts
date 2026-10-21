// Money Markets' settings, as they appear in the page address: which graph
// (the money market, loanable funds or the market for reserves, with ample
// or limited reserves), which curve shifts and how far, and every label's
// words, each graph with its own curve names and axis words.

import { bool, choice, defineSettings, number } from '$shared/settings'
import { NUMBER_FROMS, labels, lookFields } from '$lib/graph/settings'
import { SHIFT_SIZES } from '$lib/graph/shifts'

export const GRAPHS = ['money', 'funds', 'reserves'] as const
export type Graph = (typeof GRAPHS)[number]
export const GRAPH_NAMES: Record<Graph, string> = { money: 'Money market', funds: 'Loanable funds', reserves: 'Market for reserves' }

/** Ample reserves (S_R crosses demand's flat bottom) or limited (it crosses the slope). */
export const REGIMES = ['ample', 'limited'] as const
export type Regime = (typeof REGIMES)[number]
export const REGIME_NAMES: Record<Regime, string> = { ample: 'Ample reserves', limited: 'Limited reserves' }

export const SHIFTS = ['none', 'supply', 'demand', 'both'] as const
export type Shift = (typeof SHIFTS)[number]
export const DIRECTIONS = ['increase', 'decrease'] as const
export type Direction = (typeof DIRECTIONS)[number]

/** How equilibrium values are named: iₑ and Qₑ, or i* and Q*. */
export const EQ_STYLES = ['e', 'star'] as const
export type EqStyle = (typeof EQ_STYLES)[number]

// The look, less the axis words, which each graph has its own of.
const { xTitle: _x, xTitleMode: _xm, yTitle: _y, yTitleMode: _ym, ...look } = lookFields({
  xTitle: '', yTitle: '',
  range: { xFrom: '0', xTo: '10', xStep: '1', yFrom: '0', yTo: '10', yStep: '1' },
})

export const moneyMarketsSettings = defineSettings({
  graph: choice(GRAPHS, 'money'),
  regime: choice(REGIMES, 'ample'),

  shift: choice(SHIFTS, 'none'),
  supplyDir: choice(DIRECTIONS, 'increase'),
  demandDir: choice(DIRECTIONS, 'increase'),
  supplySize: choice(SHIFT_SIZES, 'medium'),
  demandSize: choice(SHIFT_SIZES, 'medium'),
  arrows: number({ min: 0, max: 3, fallback: 2 }),

  guides: bool(true),
  points: bool(false),
  eqStyle: choice(EQ_STYLES, 'e'),
  numberFrom: choice(NUMBER_FROMS, '1'),
  ...labels({
    msLabel: 'MS', mdLabel: 'MD', iLabel: 'i',
    slfLabel: 'S_{LF}', dlfLabel: 'D_{LF}', rLabel: 'r',
    srLabel: 'S_R', drLabel: 'D_R', prLabel: 'PR',
    qLabel: 'Q', eLabel: 'E',
    moneyX: 'Quantity of money', moneyY: 'Nominal interest rate',
    fundsX: 'Quantity of loanable funds', fundsY: 'Real interest rate',
    reservesX: 'Quantity of reserves', reservesY: 'Policy rate',
  }),
  ...look,
})

export type MoneyMarketsSettings = typeof moneyMarketsSettings.defaults

/** Each graph's labels: its supply and demand curves' names, its rate's, and its axis words. */
export const KEYS = {
  money: { supply: 'msLabel', demand: 'mdLabel', rate: 'iLabel', x: 'moneyX', y: 'moneyY' },
  funds: { supply: 'slfLabel', demand: 'dlfLabel', rate: 'rLabel', x: 'fundsX', y: 'fundsY' },
  reserves: { supply: 'srLabel', demand: 'drLabel', rate: 'prLabel', x: 'reservesX', y: 'reservesY' },
} as const satisfies Record<Graph, Record<string, keyof MoneyMarketsSettings>>

/** The label keys on a graph, for making every label blank at once. */
export const labelKeysOf = (g: Graph) => [KEYS[g].supply, KEYS[g].demand, KEYS[g].rate, 'qLabel', 'eLabel'] as const

/** Every curve and value label, on any graph. */
export const LABEL_KEYS = ['msLabel', 'mdLabel', 'iLabel', 'slfLabel', 'dlfLabel', 'rLabel', 'srLabel', 'drLabel', 'prLabel', 'qLabel', 'eLabel'] as const

/** A graph's axis words, as the look settings name them. */
export function axisWordsOf(s: MoneyMarketsSettings) {
  const k = KEYS[s.graph]
  return { xTitle: s[k.x], xTitleMode: s[`${k.x}Mode`], yTitle: s[k.y], yTitleMode: s[`${k.y}Mode`] }
}
