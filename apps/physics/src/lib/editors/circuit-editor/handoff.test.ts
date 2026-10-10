import { describe, expect, it } from 'vitest'
import { circuitOf } from '$lib/generators/circuit-diagram/circuit'
import { buildCircuit, labelBox, symbolSize } from '$lib/generators/circuit-diagram/layout'
import { circuitSettings, MAX_LOADS, newLoad, type CircuitSettings, type VoltmeterPlace } from '$lib/generators/circuit-diagram/settings'
import { fromGenerator } from './handoff'
import { commit, startHistory, undo } from './history'
import {
  emptySchematic, HEIGHT, junctions, LEAD, partBox, partMarks, simplify, snap, symbolOf, terminal, tidySchematic, WIDTH,
  wirePath, type Schematic,
} from './schematic'

const settings = (over: Partial<CircuitSettings>) => circuitSettings.clean({ ...circuitSettings.defaults, ...over })

/** Every setup the generator offers, with its labels on so they're placed too. */
function* setups() {
  const shown = { mode: 'text' as const, text: '6 V' }
  for (const arrangement of ['series', 'parallel'] as const)
    for (let n = 1; n <= MAX_LOADS; n++)
      for (const sw of ['none', 'closed', 'open'] as const)
        for (const ammeter of [false, true])
          for (const voltmeter of ['none', 'source', '1', String(n)] as VoltmeterPlace[])
            for (const mirror of [false, true]) {
              const loads = Array.from({ length: n }, (_, i) => ({ ...newLoad(i), kind: i === 1 ? ('bulb' as const) : ('resistor' as const) }))
              yield settings({ arrangement, loads, switch: sw, ammeter, ammeterLabel: shown, voltmeter, voltmeterLabel: shown, polarity: n % 2 === 0, mirror })
            }
}

/** Which terminals each run of wire joins, as sorted lists of "kind name terminal". */
function nets(s: Schematic) {
  const parent = new Map<string, string>()
  const find = (k: string): string => (parent.get(k) ?? k) === k ? k : find(parent.get(k)!)
  const name = (id: string, t: number) => {
    const p = s.parts.find((q) => q.id === id)!
    return `${p.kind} ${p.name.text} ${t}`
  }
  for (const w of s.wires) parent.set(find(name(w.a.part, w.a.t)), find(name(w.b.part, w.b.t)))
  const groups = new Map<string, string[]>()
  for (const k of new Set(s.wires.flatMap((w) => [name(w.a.part, w.a.t), name(w.b.part, w.b.t)]))) groups.set(find(k), [...(groups.get(find(k)) ?? []), k])
  return [...groups.values()].map((g) => g.sort().join(' | ')).sort()
}

describe('Edit by hand', () => {
  it('turns every generator setup into a drawing of the same circuit', () => {
    for (const s of setups()) {
      const where = circuitSettings.toQuery(s)
      const fig = buildCircuit(circuitOf(s), { title: false, polarity: s.polarity })
      const drawn = fromGenerator(s)
      try {
        // The same parts, with the same labels.
        const kinds = (list: string[]) => [...list].sort().join()
        expect(kinds(drawn.parts.map((p) => `${p.kind}:${p.name.mode}:${p.value.text}`))).toBe(
          kinds([
            ...fig.parts.map((p) => `${p.part.kind === 'battery' ? (p.part.cells === 2 ? 'battery' : 'cell') : p.part.kind}:${p.part.name.mode}:${p.part.value.text}`),
            ...fig.meters.map(() => `voltmeter:none:${s.voltmeterLabel.text}`),
          ]),
        )
        // Every terminal joined, and the editor finds the generator's junction dots.
        for (const p of drawn.parts) for (const t of [0, 1] as const) expect(drawn.wires.some((w) => [w.a, w.b].some((e) => e.part === p.id && e.t === t))).toBe(true)
        expect(junctions(drawn)).toHaveLength(fig.dots.length)
        // The wires keep the generator's lines: the editor needs no corners of its own to square them up.
        for (const w of drawn.wires) {
          const ends = [drawn.parts.find((p) => p.id === w.a.part)!, drawn.parts.find((p) => p.id === w.b.part)!]
          expect(wirePath(drawn, w)).toEqual(simplify([terminal(ends[0], w.a.t), ...w.via, terminal(ends[1], w.b.t)]))
        }
        // It fits on the page and keeps as it is when the editor reads it back.
        for (const p of drawn.parts) expect(snap(p.x, p.y)).toEqual({ x: p.x, y: p.y })
        expect(tidySchematic(JSON.parse(JSON.stringify(drawn)))).toEqual(drawn)
        // Parts and labels don't overlap.
        const boxes = drawn.parts.flatMap((p) => [partBox(p), ...partMarks(p, drawn.polarity).labels.map(labelBox)])
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) {
            const [a, b] = [boxes[i], boxes[j]]
            expect(a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1, `boxes ${i} and ${j} overlap`).toBe(false)
          }
        // No wire runs through a part.
        for (const w of drawn.wires) {
          const path = wirePath(drawn, w)
          for (const p of drawn.parts) {
            const half = symbolSize(symbolOf(p)).half
            const across = p.rotation % 180 === 0
            for (let k = 1; k < path.length; k++) {
              const [a, b] = [path[k - 1], path[k]]
              const along = across ? a.y === b.y && a.y === p.y : a.x === b.x && a.x === p.x
              if (!along) continue
              const [lo, hi] = across ? [Math.min(a.x, b.x), Math.max(a.x, b.x)] : [Math.min(a.y, b.y), Math.max(a.y, b.y)]
              const mid = across ? p.x : p.y
              expect(lo < mid + half && hi > mid - half, 'a wire runs through a part').toBe(false)
            }
          }
        }
      } catch (e) {
        throw new Error(`${where}: ${e}`)
      }
    }
  }, 60_000)

  it('joins the same terminals the generator does', () => {
    const s = settings({ arrangement: 'parallel', loads: [newLoad(0), newLoad(1), newLoad(2)], ammeter: true, voltmeter: '2' })
    expect(nets(fromGenerator(s))).toEqual([
      'ammeter A 0 | battery epsilon 1',
      'ammeter A 1 | resistor R_1 0 | resistor R_2 0 | resistor R_3 0 | voltmeter V 0',
      'battery epsilon 0 | resistor R_1 1 | resistor R_2 1 | resistor R_3 1 | voltmeter V 1',
    ])
  })

  it('lays a series circuit out round a loop and a parallel one as a ladder, as the generator does', () => {
    const series = fromGenerator(settings({}))
    const [cell, ...rs] = series.parts
    expect(cell.rotation).toBe(270)
    expect(rs.map((r) => r.rotation)).toEqual([0, 0, 0])
    expect(new Set(rs.map((r) => r.y)).size).toBe(1)
    expect(rs.every((r) => r.y < cell.y)).toBe(true)
    const ladder = fromGenerator(settings({ arrangement: 'parallel' }))
    expect(ladder.parts.slice(1).map((r) => r.rotation)).toEqual([90, 90, 90])
    expect(new Set(ladder.parts.slice(1).map((r) => r.y)).size).toBe(1)
  })

  it('keeps names outside the loop and values inside, as the generator does', () => {
    const series = fromGenerator(settings({}))
    const r1 = series.parts[1]
    const [name, value] = partMarks(r1, false).labels
    expect(name.label.text).toBe('R_1')
    expect(name.y).toBeLessThan(r1.y)
    expect(value.y).toBeGreaterThan(r1.y)
  })

  it('replaces the drawing, and one Undo brings the old one back', () => {
    const old = { ...emptySchematic(), parts: [{ id: 'x', kind: 'bulb' as const, x: 200, y: 200, rotation: 0 as const, name: { mode: 'none' as const, text: '' }, value: { mode: 'none' as const, text: '' }, flip: false, open: false }] }
    const h = commit(startHistory(old), fromGenerator(settings({})))
    expect(h.present.parts).toHaveLength(4)
    expect(undo(h).present).toEqual(old)
  })

  it('fits the widest circuits on the page', () => {
    for (const s of setups()) {
      const d = fromGenerator(s)
      for (const p of d.parts) {
        expect(p.x - LEAD).toBeGreaterThan(0)
        expect(p.x + LEAD).toBeLessThan(WIDTH)
        expect(p.y + LEAD).toBeLessThan(HEIGHT)
      }
    }
  }, 60_000)
})
