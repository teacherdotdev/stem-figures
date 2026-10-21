// The setups: the money market, loanable funds and reserves graphs teachers
// draw most often, each a set of settings to start from. Picking one keeps
// the teacher's look (label size, ink, axis ends).

import { labelKeysOf, type MoneyMarketsSettings } from './settings'

export type Setup = { id: string; name: string; settings: Partial<MoneyMarketsSettings> }

/** Every label on the money market a blank line for students to write on. */
const BLANKS = Object.fromEntries(labelKeysOf('money').map((k) => [`${k}Mode`, 'blank'])) as Partial<MoneyMarketsSettings>

export const SETUPS: Setup[] = [
  { id: 'money', name: 'Money market', settings: {} },
  { id: 'money-purchase', name: 'Money market: open-market purchase', settings: { shift: 'supply', supplyDir: 'increase' } },
  { id: 'money-demand', name: 'Money market: higher money demand', settings: { shift: 'demand', demandDir: 'increase' } },
  { id: 'crowding-out', name: 'Loanable funds: deficit spending (crowding out)', settings: { graph: 'funds', shift: 'demand', demandDir: 'increase' } },
  { id: 'ample-lower', name: 'Ample reserves: lower administered rates (AP 2024)', settings: { graph: 'reserves', regime: 'ample', shift: 'demand', demandDir: 'decrease' } },
  { id: 'ample-purchase', name: "Ample reserves: open-market purchase (rate doesn't move)", settings: { graph: 'reserves', regime: 'ample', shift: 'supply', supplyDir: 'increase' } },
  { id: 'limited-purchase', name: 'Limited reserves: open-market purchase', settings: { graph: 'reserves', regime: 'limited', shift: 'supply', supplyDir: 'increase' } },
  { id: 'blank', name: 'Students label a shift (blank labels)', settings: { shift: 'supply', supplyDir: 'increase', ...BLANKS } },
]

/** The settings a setup makes: the defaults, the teacher's look, and the setup's own. */
export function settingsFor(setup: Setup, defaults: MoneyMarketsSettings, current: MoneyMarketsSettings): MoneyMarketsSettings {
  return { ...defaults, labelSize: current.labelSize, ink: current.ink, xEndCap: current.xEndCap, yEndCap: current.yEndCap, ...setup.settings }
}
