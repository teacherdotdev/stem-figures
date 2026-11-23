// Electrochemical Cells' settings, as they appear in the page address.

import { figureTextFields } from '$lib/shared/figureText'
import { bool, choice, defineSettings, number } from '$lib/shared/settings'
import { METALS, cellOf, reactionsOf, voltageText, type Metal } from './cell'

/** The most a typed E°cell can be, in volts. */
export const MAX_VOLTAGE = 9.99

/** A typed E°cell as kept: from 0 to MAX_VOLTAGE, to 0.01 V. */
export const tidyVoltage = (v: number) => (Number.isFinite(v) ? Math.min(MAX_VOLTAGE, Math.max(0, Math.round(v * 100) / 100)) : 0)

/** What joins the two electrodes at the top. */
export const METERS = ['digital', 'dial', 'coil'] as const
export type Meter = (typeof METERS)[number]

/** Where E°cell comes from: the two metals' standard reduction potentials, or a number the teacher types. */
export const READINGS = ['table', 'typed'] as const
export type Reading = (typeof READINGS)[number]

export const cellSettings = defineSettings(
  {
    left: choice(METALS, 'Zn'),
    right: choice(METALS, 'Cu'),
    meter: choice(METERS, 'digital'),
    reading: choice(READINGS, 'table'),
    /** the teacher's own E°cell, in volts, when reading is typed */
    voltage: number({ min: 0, max: MAX_VOLTAGE, fallback: 1.1 }),
    labels: bool(true),
    electrodes: bool(false),
    electronFlow: bool(false),
    ...figureTextFields(),
  },
  // Two of the same metal make no cell.
  (s) => (s.left === s.right ? { ...s, right: (s.left === 'Cu' ? 'Zn' : 'Cu') as Metal } : s),
)

export type CellSettings = typeof cellSettings.defaults

/** E°cell as the figure shows it, in volts to 0.01: the table's, or the teacher's own. */
export function cellVoltage(s: CellSettings) {
  return s.reading === 'typed' ? tidyVoltage(s.voltage) : cellOf(s.left, s.right).voltage
}

/** The answer key's first line, e.g. "Anode: Zn (−) · Cathode: Cu (+) · E°cell = 1.10 V". */
export function answerLine(s: CellSettings) {
  const cell = cellOf(s.left, s.right)
  return `Anode: ${s[cell.anode]} (−) · Cathode: ${s[cell.cathode]} (+) · E°cell = ${voltageText(cellVoltage(s))} V`
}

/**
 * The answer key as printed under the figure: the anode, cathode and
 * E°cell, then the half-reaction at each electrode and the overall
 * reaction, balanced.
 */
export function answerLines(s: CellSettings): string[] {
  const r = reactionsOf(s.left, s.right)
  return [answerLine(s), `Anode (oxidation): ${r.oxidation}`, `Cathode (reduction): ${r.reduction}`, `Overall: ${r.overall}`]
}
