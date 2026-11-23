// Rate Law Graphs' settings, as they appear in the page address: the order
// of A → products, [A]₀ and k, which of the three graphs against time are
// drawn ([A], ln[A], 1/[A], or all three side by side), and what's on them:
// the model's curve, data points (scattered from a seed), guide lines at the
// half-lives and a data table. The axes are always fitted to the reaction;
// the titles follow the species and the units unless the teacher types
// their own.

import { TITLE_MODES } from '$shared/graph/axes'
import { LABEL_SIZES, type LabelSize } from '$shared/labelSize'
import { CONC_UNITS, TIME_UNITS, concentrationOf, concentrationTitle, timeTitle } from '$lib/shared/concentration'
import { bool, choice, defineSettings, number, text } from '$lib/shared/settings'
import { INVERSE_UNITS, PLOTS, firstHalfLife, kForHalfLife, sig, type Order, type Plot } from './kinetics'

/** The order of the reaction in A, as the address writes it. */
export const ORDERS = ['0', '1', '2'] as const
export const ORDER_NAMES: Record<(typeof ORDERS)[number], string> = { '0': 'Zero', '1': 'First', '2': 'Second' }

/** The graphs drawn: all three side by side, or one of them. */
export const GRAPHS = ['all', ...PLOTS] as const
export type Graphs = (typeof GRAPHS)[number]

/** The scatter on each [A], in percent. */
export const NOISES = ['0', '1', '2', '5'] as const

/** The data table under the graphs: none, time and [A] only, or ln[A] and 1/[A] too. */
export const TABLES = ['none', 'conc', 'all'] as const

/** What's written by each guide line: its time, how many half-lives, a blank line, or nothing. */
export const GUIDE_LABELS = ['times', 'halves', 'blank', 'none'] as const
export const GUIDE_LABEL_NAMES: Record<(typeof GUIDE_LABELS)[number], string> = {
  times: 'Times',
  halves: '1 half-life, 2 half-lives…',
  blank: 'Blank lines',
  none: 'None',
}

/** The smallest and largest k, in any order's unit. */
export const K_MIN = 1e-6
export const K_MAX = 1e6

export const MAX_SEED = 999999
/** A seed for new scatter. */
export const newSeed = () => 1 + Math.floor(Math.random() * MAX_SEED)

export const rateLawSettings = defineSettings(
  {
    order: choice(ORDERS, '1'),
    /** [A]₀, in concUnit */
    a0: number({ min: 0.001, max: 100, fallback: 1 }),
    /** the rate constant, in the unit its order gives it */
    k: number({ min: K_MIN, max: K_MAX, fallback: 0.02 }),
    graphs: choice(GRAPHS, 'all'),
    /** the model's curve on each graph */
    curve: bool(true),
    /** data points on each graph */
    points: bool(false),
    /** how many data points, 5 to 10 */
    count: number({ min: 5, max: 10, fallback: 8 }),
    /** percent scatter on each [A] */
    noise: choice(NOISES, '0'),
    /** what the scatter is drawn from */
    seed: number({ min: 1, max: MAX_SEED, fallback: 1 }),
    table: choice(TABLES, 'none'),
    /** dashed guide lines at the first 1 to 3 half-lives, on the [A] graph; 0 for none */
    guides: number({ min: 0, max: 3, fallback: 0 }),
    guideLabels: choice(GUIDE_LABELS, 'times'),
    /** the reactant's formula; digits after a letter are lowered */
    species: text('A', 20),
    concUnit: choice(CONC_UNITS, 'M'),
    timeUnit: choice(TIME_UNITS, 's'),
    /** the numbers along the axes; off, the graphs are sketches */
    numbers: bool(true),
    gridlines: bool(true),
    color: bool(true),
    title: text(''),
    titleMode: choice(TITLE_MODES, 'none'),
    // Each axis title: empty for the one this page writes from the species and units.
    timeTitle: text(''),
    timeTitleMode: choice(TITLE_MODES, 'text'),
    concTitle: text(''),
    concTitleMode: choice(TITLE_MODES, 'text'),
    lnTitle: text(''),
    lnTitleMode: choice(TITLE_MODES, 'text'),
    invTitle: text(''),
    invTitleMode: choice(TITLE_MODES, 'text'),
    labelSize: choice(Object.keys(LABEL_SIZES) as LabelSize[], 'medium'),
  },
  (s) => ({ ...s, count: Math.round(s.count), guides: Math.round(s.guides), seed: Math.round(s.seed) }),
)

export type RateLawSettings = typeof rateLawSettings.defaults

export const orderOf = (s: Pick<RateLawSettings, 'order'>) => Number(s.order) as Order

/**
 * The k a new order takes so the first half-life stays the same, to three
 * significant figures, and whether it could: k is kept within K_MIN..K_MAX,
 * so at the far ends of the range the half-life changes.
 */
export function kForOrder(s: Pick<RateLawSettings, 'order' | 'a0' | 'k'>, next: Order) {
  const wanted = sig(kForHalfLife(next, s.a0, firstHalfLife(orderOf(s), s.a0, s.k)))
  const k = Math.min(K_MAX, Math.max(K_MIN, wanted))
  return { k, kept: k === wanted }
}

/** The species as written, "A" when the box is empty. */
export const speciesOf = (s: Pick<RateLawSettings, 'species'>) => s.species.trim() || 'A'

/** The graphs drawn, left to right. */
export const plotsOf = (s: Pick<RateLawSettings, 'graphs'>): Plot[] => (s.graphs === 'all' ? [...PLOTS] : [s.graphs])

/** What each graph plots, as written: "[N₂O₅]", "ln[N₂O₅]", "1/[N₂O₅]". */
export function quantityOf(s: Pick<RateLawSettings, 'species'>, plot: Plot) {
  const conc = concentrationOf(speciesOf(s))
  return plot === 'conc' ? conc : plot === 'ln' ? `ln${conc}` : `1/${conc}`
}

/** The y-axis title this page writes for a graph: "[A] (M)", "ln[A]" (it has no unit), "1/[A] (M⁻¹)". */
export function autoTitle(s: Pick<RateLawSettings, 'species' | 'concUnit'>, plot: Plot) {
  if (plot === 'conc') return concentrationTitle(s.concUnit, speciesOf(s))
  if (plot === 'ln') return quantityOf(s, 'ln')
  return `${quantityOf(s, 'inv')} (${INVERSE_UNITS[s.concUnit]})`
}

/** Each axis's title as drawn in the table's headings and, when its mode is text, on the graph: the teacher's words, or this page's. */
export const axisTitles = (s: RateLawSettings): Record<Plot | 'time', string> => ({
  time: s.timeTitle.trim() || timeTitle(s.timeUnit),
  conc: s.concTitle.trim() || autoTitle(s, 'conc'),
  ln: s.lnTitle.trim() || autoTitle(s, 'ln'),
  inv: s.invTitle.trim() || autoTitle(s, 'inv'),
})
