import { describe, expect, test } from 'vitest'
import {
  circuitField,
  cleanCircuit,
  decodeCircuit,
  DEFAULT_CIRCUIT,
  encodeCircuit,
  MAX_PARTS,
  newGroup,
  newPart,
  partsOf,
  renumber,
  settle,
  type Circuit,
  type Group,
  type Item,
  type PartKind,
} from './tree'

const p = (kind: PartKind = 'resistor', over: Partial<ReturnType<typeof newPart>> = {}) => ({ ...newPart(kind), ...over })
const series = (...items: Item[]) => newGroup('series', items)
const parallel = (...items: Item[]) => newGroup('parallel', items)
const loop = (...items: Item[]): Circuit => ({ items, current: null })
const names = (c: Circuit) => [...partsOf(c.items)].map((part) => part.name.text)
/** The circuit's shape in the address's notation, without extras. */
const shape = (c: Circuit) => encodeCircuit(c).replace(/[nvmij@]'(\\.|[^'])*'/g, '')
const field = circuitField(DEFAULT_CIRCUIT)
const roundTrip = (c: Circuit) => field.clean(field.decode(field.encode(field.clean(c))))

describe('the default circuit', () => {
  test('is a battery, R₁, then R₂ in parallel with R₃', () => {
    expect(shape(DEFAULT_CIRCUIT)).toBe('b.r.[r.r]')
    expect(names(DEFAULT_CIRCUIT)).toEqual(['epsilon', 'R_1', 'R_2', 'R_3'])
  })

})

describe('tidying', () => {
  test('a series run inside the loop joins it, and a parallel group inside a parallel group joins it', () => {
    expect(shape(cleanCircuit(loop(p('battery'), series(p(), p()), parallel(p(), parallel(p(), p())))))).toBe('b.r.r.[r.r.r]')
  })

  test('a one-item group gives way to its item, and empty groups go', () => {
    expect(shape(cleanCircuit(loop(p('battery'), series(p()), parallel(), parallel(series(p())))))).toBe('b.r.r')
  })

  test('a one-branch group left inside a parallel group still joins it', () => {
    expect(shape(cleanCircuit(loop(p('battery'), parallel(p(), series(parallel(p(), p()))))))).toBe('b.[r.r.r]')
  })

  test('a series run with a voltmeter across just it stays a group', () => {
    const c = cleanCircuit(loop(p('battery'), { ...series(p(), p()), voltmeter: { mode: 'none', text: 'V' } }, p()))
    expect(shape(c)).toBe('b.(r.r).r')
  })

  test(`keeps at most ${MAX_PARTS} parts`, () => {
    const c = cleanCircuit(loop(...Array.from({ length: 12 }, () => p())))
    expect([...partsOf(c.items)]).toHaveLength(MAX_PARTS)
  })

  test('groups more than 3 deep are cut back to a part', () => {
    const deep = parallel(p(), series(p(), parallel(p(), series(p(), parallel(p(), p())))))
    const c = cleanCircuit(loop(p('battery'), deep))
    expect(shape(c)).toBe('b.[r.(r.[r.r])]')
  })

  test('points stay only in series gaps, and current arrows only on branches', () => {
    const point = { mode: 'text' as const, text: 'A' }
    const arrow = { dir: 'forward' as const, label: { mode: 'text' as const, text: 'I' } }
    const c = cleanCircuit(
      loop(p('battery', { point, current: arrow }), parallel(p('resistor', { point, current: arrow }), series(p('resistor', { point }), p('resistor', { point })))),
    )
    const [battery, group] = c.items as [Item, Group]
    expect(battery.point).toEqual(point)
    expect(battery.current).toBeNull()
    const [branch, run] = group.items as [Item, Group]
    expect(branch.point).toBeNull()
    expect(branch.current).toEqual(arrow)
    // Only the gap inside the series run keeps its point; the one after it is the group's.
    expect(run.items.map((i) => i.point)).toEqual([point, null])
  })

  test('a broken or empty circuit falls back to the default', () => {
    expect(cleanCircuit(null)).toEqual(DEFAULT_CIRCUIT)
    expect(cleanCircuit({ items: [{ type: 'nope' }] })).toEqual(DEFAULT_CIRCUIT)
  })
})

describe('automatic names', () => {
  test('number each kind in reading order, with no number when a kind appears once', () => {
    const c = cleanCircuit(loop(p('battery'), p('bulb'), parallel(p('resistor'), p('bulb')), p('switch')))
    expect(names(c)).toEqual(['epsilon', 'L_1', 'R', 'L_2', 'S'])
  })

  test("renumber as the circuit changes, but leave a name the teacher typed", () => {
    const c = cleanCircuit(loop(p('battery'), p(), p(), p(), p()))
    ;[...partsOf(c.items)][2].name.text = 'R_x'
    // Whatever edits the tree (the planned Circuit Editor) settles who was renamed before changing it, and renumbers after.
    settle(c)
    const again = cleanCircuit(renumber({ ...c, items: [c.items[0], c.items[2], c.items[3], c.items[4]] }))
    // The teacher's name is left out of the numbering.
    expect(names(again)).toEqual(['epsilon', 'R_x', 'R_1', 'R_2'])
  })
})

describe('the address', () => {
  test('round-trips a circuit with every extra', () => {
    const c = cleanCircuit(
      loop(
        p('battery', { cells: 2, flip: true, value: { mode: 'text', text: '9 V' } }),
        p('switch', { open: true, point: { mode: 'text', text: "B'" } }),
        parallel(
          p('resistor', { voltmeter: { mode: 'text', text: 'V_1' }, current: { dir: 'backward', label: { mode: 'blank', text: 'I' } } }),
          series(p('ammeter', { name: { mode: 'text', text: 'A_1' } }), p('bulb', { name: { mode: 'none', text: 'L' } })),
        ),
      ),
    )
    c.current = { dir: 'forward', label: { mode: 'text', text: 'I' } }
    ;[...partsOf(c.items)][2].name.text = 'R_{load}'
    expect(roundTrip(c)).toEqual(cleanCircuit(c))
  })

  test('is short: automatic names and default labels are left out', () => {
    expect(encodeCircuit(cleanCircuit(loop(p('battery'), p(), p())))).toBe('b.r.r')
  })

  test("can't be broken by a quote or backslash in a label", () => {
    const c = cleanCircuit(loop(p('battery'), p('resistor', { value: { mode: 'text', text: "it's \\ ok" } })))
    expect(roundTrip(c)).toEqual(c)
  })

  test('a broken value falls back to the default circuit', () => {
    for (const bad of ['', 'x', 'b.', 'b.[r.r', "b.rn'oops", 'b.r)']) {
      expect(decodeCircuit(bad)).toBeUndefined()
      expect(field.clean(field.decode(bad))).toEqual(DEFAULT_CIRCUIT)
    }
  })
})

test('diodes survive tree serialization without changing LED encoding', () => {
  const circuit = loop(p('diode'), p('led'))
  expect(shape(circuit)).toBe('e.d')
  expect([...partsOf(roundTrip(circuit).items)].map(part => part.kind)).toEqual(['diode', 'led'])
})
