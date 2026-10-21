// The setups: the supply and demand graphs teachers draw most often, each a
// set of settings to start from. Picking one keeps the teacher's look
// (label size, ink, axis ends).

import { LABEL_KEYS, type SupplyDemandSettings } from './settings'

export type Setup = { id: string; name: string; settings: Partial<SupplyDemandSettings> }

/** Every label a blank line for students to write on. */
const BLANKS = Object.fromEntries(LABEL_KEYS.map((k) => [`${k}Mode`, 'blank'])) as Partial<SupplyDemandSettings>

export const SETUPS: Setup[] = [
  { id: 'equilibrium', name: 'Market equilibrium', settings: {} },
  { id: 'demand-up', name: 'Increase in demand', settings: { shift: 'demand', demandDir: 'increase' } },
  { id: 'supply-down', name: 'Decrease in supply', settings: { shift: 'supply', supplyDir: 'decrease' } },
  { id: 'both', name: 'Demand up, supply down', settings: { shift: 'both', demandDir: 'increase', supplyDir: 'decrease' } },
  { id: 'ceiling', name: 'Price ceiling (shortage)', settings: { control: 'ceiling', controlAt: 0.3 } },
  { id: 'floor', name: 'Price floor (surplus)', settings: { control: 'floor', controlAt: 0.7 } },
  { id: 'surplus', name: 'Consumer and producer surplus', settings: { cs: true, ps: true } },
  { id: 'tax', name: 'Per-unit tax with deadweight loss', settings: { tax: 'tax', cs: true, ps: true, dwl: true, revenue: true } },
  { id: 'inelastic', name: 'Perfectly inelastic supply', settings: { supplyShape: 'vertical', shift: 'demand', demandDir: 'increase' } },
  {
    id: 'gasoline',
    name: 'Gasoline market (numbered, price ceiling)',
    settings: {
      look: 'numeric', control: 'ceiling', controlPrice: 1.5, title: 'Market for gasoline', titleMode: 'text',
      xTitle: 'Gallons (millions)', yTitle: 'Price ($/gallon)',
    },
  },
  { id: 'blank', name: 'Students label a shift (blank labels)', settings: { shift: 'demand', demandDir: 'increase', ...BLANKS } },
]

/** The settings a setup makes: the defaults, the teacher's look, and the setup's own. */
export function settingsFor(setup: Setup, defaults: SupplyDemandSettings, current: SupplyDemandSettings): SupplyDemandSettings {
  return { ...defaults, labelSize: current.labelSize, ink: current.ink, xEndCap: current.xEndCap, yEndCap: current.yEndCap, ...setup.settings }
}
