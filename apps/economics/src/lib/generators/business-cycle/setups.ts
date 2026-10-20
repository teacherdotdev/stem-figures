// The setups: the business cycle graphs teachers draw most often, each a
// set of settings to start from. Picking one keeps the teacher's look
// (label size, ink, axis ends).

import { LABEL_KEYS, type BusinessCycleSettings } from './settings'

export type Setup = { id: string; name: string; settings: Partial<BusinessCycleSettings> }

/** Every label in one mode: written, a blank line for students, or left off. */
const ALL = (mode: 'text' | 'blank' | 'none') => Object.fromEntries(LABEL_KEYS.map((k) => [`${k}Mode`, mode])) as Partial<BusinessCycleSettings>

export const SETUPS: Setup[] = [
  { id: 'classic', name: 'Peak, trough, expansion, contraction', settings: {} },
  { id: 'quiz', name: 'Quiz: a letter at each point', settings: { style: 'letters', dots: true, every: true } },
  { id: 'shaded', name: 'Irregular cycles, recessions shaded', settings: { cycles: 3, irregularity: 0.6, seed: 8, shade: true, recessionLabel: 'Recession', recessionLabelMode: 'text', contractionLabelMode: 'none', trendLabelMode: 'text' } },
  { id: 'one-cycle', name: 'One cycle, every term', settings: { cycles: 1, start: 'peak', amplitude: 1.8, ...ALL('text') } },
  { id: 'blank', name: 'Students label it (blank lines)', settings: { dots: true, ...ALL('blank'), recessionLabelMode: 'none', recoveryLabelMode: 'none', trendLabelMode: 'none' } },
  { id: 'none', name: 'No labels', settings: { ...ALL('none') } },
]

/** The settings a setup makes: the defaults, the teacher's look, and the setup's own. */
export function settingsFor(setup: Setup, defaults: BusinessCycleSettings, current: BusinessCycleSettings): BusinessCycleSettings {
  return { ...defaults, labelSize: current.labelSize, ink: current.ink, xEndCap: current.xEndCap, yEndCap: current.yEndCap, ...setup.settings }
}
