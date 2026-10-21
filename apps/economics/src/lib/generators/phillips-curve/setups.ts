// The setups: the Phillips curve graphs teachers draw most often, each a
// set of settings to start from. Picking one keeps the teacher's look
// (label size, ink, axis ends).

import { LABEL_KEYS, type PhillipsSettings } from './settings'

export type Setup = { id: string; name: string; settings: Partial<PhillipsSettings> }

/** Every label a blank line for students to write on. */
const BLANKS = Object.fromEntries(LABEL_KEYS.map((k) => [`${k}Mode`, 'blank'])) as Partial<PhillipsSettings>

export const SETUPS: Setup[] = [
  { id: 'curves', name: 'SRPC and LRPC', settings: {} },
  { id: 'demand-pull', name: 'Demand-pull inflation (A to B along SRPC)', settings: { movement: 'along', along: 'up' } },
  { id: 'recession', name: 'Falling demand (A to B down SRPC)', settings: { movement: 'along', along: 'down' } },
  { id: 'supply-shock', name: 'Supply shock (SRPC shifts right)', settings: { movement: 'srpc', srpcSide: 'right', cause: 'shock' } },
  { id: 'expectations', name: 'Higher expected inflation (SRPC shifts right)', settings: { movement: 'srpc', srpcSide: 'right', cause: 'expectations' } },
  { id: 'long-run', name: 'Long-run adjustment back to LRPC', settings: { movement: 'along', along: 'up', longRun: true } },
  { id: 'lower-nru', name: 'Lower natural rate (LRPC shifts left)', settings: { movement: 'lrpc', lrpcSide: 'left' } },
  {
    id: 'numbered',
    name: 'Numbered, A to B to C',
    settings: { look: 'numeric', movement: 'along', longRun: true, nru: 5, expected: 2, u2: 3, pi2: 6 },
  },
  { id: 'blank', name: 'Students label a movement (blank labels)', settings: { movement: 'along', along: 'up', longRun: true, ...BLANKS } },
]

/** The settings a setup makes: the defaults, the teacher's look, and the setup's own. */
export function settingsFor(setup: Setup, defaults: PhillipsSettings, current: PhillipsSettings): PhillipsSettings {
  return { ...defaults, labelSize: current.labelSize, ink: current.ink, xEndCap: current.xEndCap, yEndCap: current.yEndCap, ...setup.settings }
}
