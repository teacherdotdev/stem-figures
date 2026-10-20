// The setups: the production possibilities graphs teachers draw most often,
// each a set of settings to start from. Picking one keeps the teacher's look
// (label size, ink, axis ends) and the goods they've named, unless the
// setup names its own.

import type { PpcSettings } from './settings'

export type Setup = { id: string; name: string; settings: Partial<PpcSettings> }

/** What picking a setup keeps from the graph as it was. */
export const KEPT = ['labelSize', 'ink', 'xEndCap', 'yEndCap', 'xTitle', 'yTitle'] as const

export const SETUPS: Setup[] = [
  { id: 'bowed', name: 'Bowed out with points A to D', settings: {} },
  { id: 'growth', name: 'Economic growth', settings: { shift: 'both', shiftDir: 'out', points: 'A,on,0.55;B,on2,0.55' } },
  {
    id: 'efficiency',
    name: 'Inside, on and outside points',
    settings: { points: 'A,on,0.35,,Efficient;B,inside,0.55,,Inefficient;C,outside,0.7,,Unattainable' },
  },
  {
    id: 'increasing',
    name: 'Increasing opportunity cost (numbered steps)',
    settings: { look: 'numeric', bow: 1.5, steps: true, points: 'A,on,0;B,on,0.25;C,on,0.5;D,on,0.75;E,on,1' },
  },
  { id: 'constant', name: 'Constant opportunity cost', settings: { shape: 'straight', steps: true, points: 'A,on,0;B,on,0.25;C,on,0.5;D,on,0.75;E,on,1' } },
  { id: 'technology', name: 'Technology improves for one good', settings: { shift: 'x', shiftDir: 'out', points: '' } },
  { id: 'disaster', name: 'A disaster shrinks the curve', settings: { shift: 'both', shiftDir: 'in', points: '' } },
  {
    id: 'comparative',
    name: 'Comparative advantage (two countries, side by side)',
    settings: { countries: 'side', xTitle: 'Wheat', yTitle: 'Cloth' },
  },
  {
    id: 'comparative-one',
    name: 'Comparative advantage (two countries, one graph)',
    settings: { countries: 'together', xTitle: 'Wheat', yTitle: 'Cloth' },
  },
  {
    id: 'blank',
    name: 'Students label the points (blank labels)',
    settings: { points: 'A,on,0.35,,Efficient;B,inside,0.55,,Inefficient;C,outside,0.7,,Unattainable', captionMode: 'blank', curveLabelMode: 'blank' },
  },
]

/** The settings a setup makes: the defaults, what it keeps of the graph as it was, and the setup's own. */
export function settingsFor(setup: Setup, defaults: PpcSettings, current: PpcSettings): PpcSettings {
  const kept = Object.fromEntries(KEPT.map((k) => [k, current[k]])) as Partial<PpcSettings>
  return { ...defaults, ...kept, ...setup.settings }
}
