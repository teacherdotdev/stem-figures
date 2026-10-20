// The setups: the AD–AS graphs teachers draw most often, each a set of
// settings to start from. Picking one keeps the teacher's look (label size,
// ink, axis ends).

import { LABEL_KEYS, type AdAsSettings } from './settings'

export type Setup = { id: string; name: string; settings: Partial<AdAsSettings> }

/** Every label a blank line for students to write on. */
const BLANKS = Object.fromEntries(LABEL_KEYS.map((k) => [`${k}Mode`, 'blank'])) as Partial<AdAsSettings>

export const SETUPS: Setup[] = [
  { id: 'long-run', name: 'Long-run equilibrium', settings: {} },
  { id: 'recession', name: 'Recessionary gap', settings: { start: 'recession' } },
  { id: 'inflation', name: 'Inflationary gap', settings: { start: 'inflation' } },
  { id: 'ad-up', name: 'Increase in aggregate demand', settings: { adShift: 'right' } },
  { id: 'stagflation', name: 'Negative supply shock (stagflation)', settings: { srasShift: 'left' } },
  { id: 'fiscal', name: 'Expansionary fiscal policy closes a recessionary gap', settings: { start: 'recession', adShift: 'full' } },
  { id: 'contractionary', name: 'Contractionary policy closes an inflationary gap', settings: { start: 'inflation', adShift: 'full' } },
  { id: 'self-adjust', name: 'Long-run self-adjustment from a recessionary gap', settings: { start: 'recession', srasShift: 'full' } },
  { id: 'growth', name: 'Economic growth (LRAS shifts right)', settings: { lrasShift: 'right', srasShift: 'full' } },
  { id: 'keynesian', name: 'Three-range aggregate supply (Keynesian)', settings: { asShape: 'three', start: 'recession', asLabel: 'AS', lrasLabel: 'Potential GDP' } },
  {
    id: 'numbered',
    name: 'Numbered: price level 90, real GDP 8,800',
    settings: { look: 'numeric', callout: true, guides: false, lrasLabel: 'Potential GDP', asLabel: 'AS', eLabelMode: 'none' },
  },
  { id: 'blank', name: 'Students label a recessionary gap (blank labels)', settings: { start: 'recession', ...BLANKS } },
]

/** The settings a setup makes: the defaults, the teacher's look, and the setup's own. */
export function settingsFor(setup: Setup, defaults: AdAsSettings, current: AdAsSettings): AdAsSettings {
  return { ...defaults, labelSize: current.labelSize, ink: current.ink, xEndCap: current.xEndCap, yEndCap: current.yEndCap, ...setup.settings }
}
