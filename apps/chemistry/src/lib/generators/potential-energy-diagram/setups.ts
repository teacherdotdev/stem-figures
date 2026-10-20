// The setups: the potential energy diagrams teachers draw most often, each a
// set of settings to start from. Picking one keeps the teacher's look (label
// size, colors, unit and gridlines) and fits the y-axis to it.

import { fittedAxes } from './figure'
import { yTitleFor, type EnergySettings } from './settings'

export type Setup = { id: string; name: string; settings: Partial<EnergySettings> }

export const SETUPS: Setup[] = [
  { id: 'exothermic', name: 'Exothermic', settings: { levels: [50, 150, 20] } },
  { id: 'endothermic', name: 'Endothermic', settings: { levels: [20, 150, 80] } },
  { id: 'catalyst', name: 'Exothermic, with and without a catalyst', settings: { levels: [50, 150, 20], catalyst: true, catTs: 100 } },
  { id: 'two-step', name: 'Two steps, with an intermediate', settings: { levels: [40, 120, 70, 100, 10] } },
  {
    id: 'enzyme',
    name: 'With and without an enzyme (biology)',
    settings: {
      levels: [50, 150, 20], catalyst: true, catTs: 90, uncatName: 'Without enzyme', catName: 'With enzyme',
      axes: 'shape', dhArrow: false, xEndCap: 'triangle', yEndCap: 'triangle',
    },
  },
]

/** The settings a setup makes: the defaults, the teacher's look, the setup's own, and a y-axis fitted to them. */
export function settingsFor(setup: Setup, defaults: EnergySettings, current: EnergySettings): EnergySettings {
  const { labelSize, color, catColor, unit, gridlines } = current
  const next = { ...defaults, labelSize, color, catColor, unit, gridlines, ...setup.settings }
  return { ...next, ...fittedAxes(next), yTitle: yTitleFor(next.unit, next.axes === 'numbered') }
}
