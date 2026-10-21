// Cost and Revenue Curves' settings, as they appear in the page address:
// which graph (the cost curves alone, a perfectly competitive firm, a
// monopoly, or a monopolistically competitive firm), the firm's costs as a
// teacher sees them, the price or demand it faces, regulation, the regions
// shaded, and every label's words.

import { bool, choice, defineSettings, number } from '$shared/settings'
import { labels, lookFields } from '$lib/graph/settings'

export const GRAPHS = ['costs', 'perfect', 'monopoly', 'monopolistic'] as const
export type Graph = (typeof GRAPHS)[number]
export const GRAPH_NAMES: Record<Graph, string> = {
  costs: 'Cost curves',
  perfect: 'Perfect competition',
  monopoly: 'Monopoly',
  monopolistic: 'Monopolistic competition',
}

/** Where the market price is for a perfectly competitive firm, against its costs. */
export const PRICES = ['profit', 'breakeven', 'loss', 'shutdownPoint', 'shutdown', 'custom'] as const
export type Price = (typeof PRICES)[number]
export const PRICE_NAMES: Record<Price, string> = {
  profit: 'Above ATC: profit',
  breakeven: 'Lowest ATC: break-even',
  loss: 'Between AVC and ATC: loss',
  shutdownPoint: 'Lowest AVC: shutdown point',
  shutdown: 'Below AVC: shuts down',
  custom: 'Anywhere (slider)',
}

export const REGULATIONS = ['none', 'optimal', 'fair', 'both'] as const
export type Regulation = (typeof REGULATIONS)[number]
export const REGULATION_NAMES: Record<Regulation, string> = {
  none: 'None',
  optimal: 'Socially optimal (P = MC)',
  fair: 'Fair return (P = ATC)',
  both: 'Both, marked',
}

export const RUNS = ['short', 'long'] as const
export type Run = (typeof RUNS)[number]

export const OUTCOMES = ['profit', 'loss'] as const
export type ShortRun = (typeof OUTCOMES)[number]

/** How equilibrium values are named: Pₑ and Qₑ (and the firm's qₑ), or P*, Q* and q*. */
export const EQ_STYLES = ['e', 'star'] as const
export type EqStyle = (typeof EQ_STYLES)[number]

/** Quick names for the perfectly competitive firm's price line. */
export const PRICE_LINE_NAMES = ['D = MR = AR = P', 'MR = P', 'MR'] as const

export const costRevenueSettings = defineSettings({
  graph: choice(GRAPHS, 'costs'),

  /** where ATC is lowest: the quantity and the cost, on the hidden 0-to-10 grid */
  atcQ: number({ min: 4, max: 7.5, fallback: 6 }),
  atcCost: number({ min: 2.5, max: 6.5, fallback: 4.5 }),
  /** MC's slope where it crosses ATC */
  mcSlope: number({ min: 0.6, max: 2.5, fallback: 1.5 }),
  /** fixed cost, as a share of as much as AVC can carry and keep its dip: from a little (0.2) to a lot (0.9) */
  fixed: number({ min: 0.2, max: 0.9, fallback: 0.6 }),
  /** AVC on a monopoly's or monopolistic competitor's graph (it's always on the others) */
  avc: bool(false),
  afc: bool(false),

  price: choice(PRICES, 'profit'),
  /** the price when it's anywhere, on the hidden 0-to-10 grid */
  priceAt: number({ min: 0.5, max: 9.5, fallback: 6 }),
  market: bool(false),

  /** monopoly demand: where it meets the price axis, and where it would meet the quantity axis */
  demandTop: number({ min: 5, max: 9.6, fallback: 9.4 }),
  demandEnd: number({ min: 6, max: 25, fallback: 12 }),
  regulation: choice(REGULATIONS, 'none'),

  run: choice(RUNS, 'short'),
  shortRun: choice(OUTCOMES, 'profit'),

  profit: bool(true),
  cs: bool(false),
  dwl: bool(false),

  minimums: bool(true),
  guides: bool(true),
  eqStyle: choice(EQ_STYLES, 'e'),
  ...labels({
    mcLabel: 'MC', atcLabel: 'ATC', avcLabel: 'AVC', afcLabel: 'AFC',
    priceLineLabel: 'D = MR = AR = P', dLabel: 'D = AR', mrLabel: 'MR',
    pLabel: 'P', qLabel: 'Q', qFirmLabel: 'q', costLabel: 'ATC',
    pmLabel: 'P_M', qmLabel: 'Q_M', psoLabel: 'P_{SO}', qsoLabel: 'Q_{SO}', pfrLabel: 'P_{FR}', qfrLabel: 'Q_{FR}',
    profitLabel: 'Profit', lossLabel: 'Loss', csLabel: 'CS', dwlLabel: 'DWL',
    breakEvenLabel: 'Break-even point', shutdownLabel: 'Shutdown point',
    excessLabel: 'Excess capacity', qMinLabel: 'q_{min ATC}',
    marketDLabel: 'D', marketSLabel: 'S', marketYLabel: 'Price', marketLabel: 'Market', firmLabel: 'Firm',
  }),
  ...lookFields({
    xTitle: 'Quantity', yTitle: 'Price and costs',
    range: { xFrom: '0', xTo: '10', xStep: '1', yFrom: '0', yTo: '10', yStep: '1' },
  }),
})

export type CostRevenueSettings = typeof costRevenueSettings.defaults

/** The label keys, for making every label blank at once: all but the market's price axis, which is an axis title, as the firm's are. */
export const LABEL_KEYS = [
  'mcLabel', 'atcLabel', 'avcLabel', 'afcLabel', 'priceLineLabel', 'dLabel', 'mrLabel', 'pLabel', 'qLabel', 'qFirmLabel', 'costLabel',
  'pmLabel', 'qmLabel', 'psoLabel', 'qsoLabel', 'pfrLabel', 'qfrLabel', 'profitLabel', 'lossLabel', 'csLabel', 'dwlLabel',
  'breakEvenLabel', 'shutdownLabel', 'excessLabel', 'qMinLabel', 'marketDLabel', 'marketSLabel', 'marketLabel', 'firmLabel',
] as const

export type LabelKey = (typeof LABEL_KEYS)[number] | 'marketYLabel'
