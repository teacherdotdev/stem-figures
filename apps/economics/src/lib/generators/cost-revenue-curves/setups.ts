// The setups: the cost and revenue graphs teachers draw most often, each a
// set of settings to start from. Picking one keeps the teacher's look
// (label size, ink, axis ends).

import { LABEL_KEYS, type CostRevenueSettings } from './settings'

export type Setup = { id: string; name: string; settings: Partial<CostRevenueSettings> }

/** Every label a blank line for students to write on. */
const BLANKS = Object.fromEntries(LABEL_KEYS.map((k) => [`${k}Mode`, 'blank'])) as Partial<CostRevenueSettings>

/** A natural monopoly: ATC still falling where demand meets MC, so P = MC is a loss and the fair-return price is between it and the monopoly's. */
const NATURAL = { atcQ: 7.5, atcCost: 3.5, mcSlope: 1.2, fixed: 0.6, demandEnd: 9 } satisfies Partial<CostRevenueSettings>

export const SETUPS: Setup[] = [
  { id: 'costs', name: 'Cost curves (MC, ATC, AVC)', settings: {} },
  { id: 'costs-afc', name: 'Cost curves with AFC', settings: { afc: true } },
  { id: 'pc-profit', name: 'Perfect competition: profit', settings: { graph: 'perfect', price: 'profit' } },
  { id: 'pc-loss', name: 'Perfect competition: loss, keeps producing', settings: { graph: 'perfect', price: 'loss' } },
  { id: 'pc-shutdown', name: 'Perfect competition: shutdown', settings: { graph: 'perfect', price: 'shutdown' } },
  { id: 'pc-long-run', name: 'Perfect competition: long run, with the market', settings: { graph: 'perfect', price: 'breakeven', market: true } },
  { id: 'monopoly', name: 'Monopoly: profit and deadweight loss', settings: { graph: 'monopoly', cs: true, dwl: true } },
  { id: 'regulated', name: 'Monopoly: regulated (P = MC, P = ATC)', settings: { graph: 'monopoly', regulation: 'both', profit: false, ...NATURAL } },
  { id: 'mc-short-run', name: 'Monopolistic competition: short run', settings: { graph: 'monopolistic', run: 'short', shortRun: 'profit' } },
  { id: 'mc-long-run', name: 'Monopolistic competition: long run', settings: { graph: 'monopolistic', run: 'long' } },
  { id: 'blank', name: 'Students label a firm (blank labels)', settings: { graph: 'perfect', price: 'profit', ...BLANKS } },
]

/** The settings a setup makes: the defaults, the teacher's look, and the setup's own. */
export function settingsFor(setup: Setup, defaults: CostRevenueSettings, current: CostRevenueSettings): CostRevenueSettings {
  return { ...defaults, labelSize: current.labelSize, ink: current.ink, xEndCap: current.xEndCap, yEndCap: current.yEndCap, ...setup.settings }
}
