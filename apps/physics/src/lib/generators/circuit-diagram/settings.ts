// Quick setup choices and the advanced editable tree for the Circuit Diagram
// Generator. Both are laid out from the same series/parallel tree.

import { bool, choice, defineSettings, int, label, list, type Field, type SettingsOf } from '$lib/shared/settings'
import { circuitField, DEFAULT_CIRCUIT } from './tree'
import { customSvgField } from './customSymbol'

export const MAX_LOADS = 4

/** A resistor or bulb. A name left empty is numbered automatically (R₁, R₂, L₁…). */
const load = {
  kind: choice('resistor', ['resistor', 'bulb']),
  name: label({ mode: 'text', text: '' }),
  value: label({ mode: 'text', text: '4 Omega' }),
}

export type Load = SettingsOf<typeof load>

/** The values new resistors start with, in order. */
const VALUES = ['2 Omega', '4 Omega', '6 Omega', '12 Omega']

/** A new resistor, valued for its place in the list. */
export const newLoad = (index: number): Load => ({
  kind: 'resistor',
  name: { mode: 'text', text: '' },
  value: { mode: 'text', text: VALUES[index] ?? '4 Omega' },
})

/** A list that always keeps at least one row: an empty one gives back the default. */
function nonEmpty<T>(field: Field<T[]>): Field<T[]> {
  return { ...field, clean: (v) => {
    const rows = field.clean(v)
    return rows.length ? rows : structuredClone(field.default)
  } }
}

/** What a voltmeter can go across: the cell or battery, or a resistor or bulb by its place (1 to 4). */
export const VOLTMETER_PLACES = ['none', 'source', '1', '2', '3', '4'] as const
export type VoltmeterPlace = (typeof VOLTMETER_PLACES)[number]

export const circuitSettings = defineSettings({
  editor: choice('quick', ['quick', 'custom', 'grid']),
  gridParts: list({
    kind: choice('resistor', ['resistor', 'bulb', 'led', 'diode', 'battery', 'cell', 'switch', 'ammeter', 'voltmeter', 'wire']),
    x: int(120, 60, 780),
    y: int(120, 60, 540),
    angle: int(0, 0, 359),
  }, [], 80),
  tileColumns: int(3, 1, 32),
  circuitTiles: list({
    kind: choice('wire', ['wire', 'resistor', 'bulb', 'led', 'diode', 'battery', 'cell', 'switch', 'ammeter', 'voltmeter', 'custom']),
    column: int(0, 0, 31),
    branch: int(0, -32, 32),
  }, [{ kind: 'battery', column: 0, branch: 0 }, { kind: 'resistor', column: 1, branch: 0 }], 1024),
  compactGrid: bool(false),
  sideRows: int(2, 2, 32),
  gridDetails: list({
    region: choice('main', ['main', 'bottom', 'left', 'right']),
    column: int(0, 0, 31),
    branch: int(0, -32, 32),
    name: label({ mode: 'none', text: '' }),
    value: label({ mode: 'none', text: '' }),
    cells: int(2, 1, 3),
    open: bool(false),
    flip: bool(false),
    customSvg: customSvgField(),
  }, [], 2048),
  returnTiles: list({
    kind: choice('wire', ['wire', 'resistor', 'bulb', 'led', 'diode', 'battery', 'cell', 'switch', 'ammeter', 'voltmeter', 'custom']),
    side: choice('bottom', ['bottom', 'left', 'right']),
    branch: int(0, -16, 16),
    index: int(0, 0, 31),
  }, [], 96),
  topology: choice('loop', ['loop', 'open']),
  customCircuit: circuitField(structuredClone(DEFAULT_CIRCUIT)),
  arrangement: choice('series', ['series', 'parallel']),
  loads: nonEmpty(list(load, [newLoad(0), newLoad(1), newLoad(2)], MAX_LOADS)),
  /** One cell, or a battery of two. */
  source: choice('battery', ['cell', 'battery']),
  sourceName: label({ mode: 'none', text: 'epsilon' }),
  sourceValue: label({ mode: 'text', text: '12 V' }),
  /** A switch in the main line, before everything else. */
  switch: choice('none', ['none', 'closed', 'open']),
  /** An ammeter in the main line, and its reading. */
  ammeter: bool(false),
  ammeterLabel: label({ mode: 'none', text: '0.5 A' }),
  voltmeter: choice<VoltmeterPlace>('none', VOLTMETER_PLACES),
  voltmeterLabel: label({ mode: 'none', text: '6 V' }),
  /** US symbols (zigzag resistor, looped bulb filament) or IEC ones, as UK GCSE uses (box resistor, crossed bulb). */
  symbols: choice('us', ['us', 'iec']),
  /** + and − beside the cell or battery. */
  polarity: bool(false),
  title: label({ mode: 'none', text: '' }),
  mirror: bool(false),
  color: bool(false),
})

export type CircuitSettings = typeof circuitSettings.defaults
