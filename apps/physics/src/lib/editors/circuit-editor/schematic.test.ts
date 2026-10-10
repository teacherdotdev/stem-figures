import { describe, expect, it } from 'vitest'
import {
  addWire, cantJoin, cropBox, describe as describeCircuit, emptySchematic, EXPORT_PAD, freeSpot, GRID, groupShift, HEIGHT,
  junctions, LEAD, moveBend, moveParts, partBox, partsIn, rotateParts, snap, terminal, tidySchematic, WIDTH, wirePath,
  withoutParts, type End, type Part, type PartKind, type Rotation, type Schematic,
} from './schematic'

const part = (id: string, kind: PartKind, x: number, y: number, rotation: Rotation = 0): Part => ({
  id, kind, x, y, rotation, name: { mode: 'none', text: '' }, value: { mode: 'none', text: '' }, flip: false, open: false,
})
const end = (part: string, t: 0 | 1): End => ({ part, t })
const drawing = (...parts: Part[]): Schematic => ({ ...emptySchematic(), parts })
const join = (s: Schematic, ...pairs: [End, End][]) => pairs.reduce((acc, [a, b]) => addWire(acc, a, b), s)

/** Is every step of a line horizontal or vertical? */
const square = (path: { x: number; y: number }[]) => path.slice(1).every((q, i) => q.x === path[i].x || q.y === path[i].y)
/** Does a line pass through the inside of a part's box (its leads aside)? */
function through(path: { x: number; y: number }[], p: Part) {
  const box = partBox(p)
  const inner = { left: box.left + LEAD / 2, right: box.right - LEAD / 2, top: box.top, bottom: box.bottom }
  const [l, r, t, b] = p.rotation % 180 ? [box.left, box.right, box.top + LEAD / 2, box.bottom - LEAD / 2] : [inner.left, inner.right, inner.top, inner.bottom]
  return path.slice(1).some((q, i) => {
    const a = path[i]
    for (let k = 0; k <= 20; k++) {
      const x = a.x + ((q.x - a.x) * k) / 20
      const y = a.y + ((q.y - a.y) * k) / 20
      if (x > l && x < r && y > t && y < b) return true
    }
    return false
  })
}

const pair = () => join(drawing(part('a', 'resistor', 200, 200), part('b', 'resistor', 400, 200)), [end('a', 1), end('b', 0)])

describe('the grid', () => {
  it('snaps a part to the nearest grid point, with both terminals on the page', () => {
    expect(snap(314, 336)).toEqual({ x: 320, y: 340 })
    const corner = snap(-50, HEIGHT + 50)
    expect(corner.x - LEAD).toBeGreaterThan(0)
    expect(corner.y + LEAD).toBeLessThan(HEIGHT)
  })

  it('puts terminals two grid steps either side of the middle, along the part', () => {
    const r = part('r', 'resistor', 200, 200, 90)
    expect([terminal(r, 0), terminal(r, 1)]).toEqual([{ x: 200, y: 160 }, { x: 200, y: 240 }])
  })

  it('finds the middle for a tapped part, then free points clear of it', () => {
    const first = freeSpot(emptySchematic())
    expect(first).toEqual(snap(WIDTH / 2, HEIGHT / 2))
    const second = freeSpot(drawing(part('a', 'resistor', first.x, first.y)))
    expect(second).not.toEqual(first)
    expect(Math.abs(second.x - first.x) >= 5 * GRID || Math.abs(second.y - first.y) >= 3 * GRID).toBe(true)
  })

  it('moves a group in whole grid steps and keeps every part on the page', () => {
    const origins = [{ x: 100, y: 300 }, { x: 200, y: 300 }]
    expect(groupShift(origins, 44, 16)).toEqual({ dx: 40, dy: 20 })
    expect(groupShift(origins, -500, 0).dx).toBe(LEAD + GRID - 100)
  })
})

describe('wires', () => {
  it('run straight between terminals that line up', () => {
    const s = join(drawing(part('a', 'resistor', 200, 200), part('b', 'resistor', 400, 200)), [end('a', 1), end('b', 0)])
    expect(wirePath(s, s.wires[0])).toEqual([{ x: 240, y: 200 }, { x: 360, y: 200 }])
  })

  it('bend at right angles, leaving a terminal straight out of its part', () => {
    const s = join(drawing(part('a', 'resistor', 200, 200), part('b', 'resistor', 400, 320, 90)), [end('a', 1), end('b', 0)])
    const path = wirePath(s, s.wires[0])
    expect(square(path)).toBe(true)
    expect(path[1].y).toBe(200)
    expect(path[1].x).toBeGreaterThan(240)
    // Into the upright part from above.
    expect(path.at(-2)!.x).toBe(400)
    expect(path.at(-2)!.y).toBeLessThan(280)
  })

  it('go round a part in the way rather than through it', () => {
    const a = part('a', 'cell', 200, 300)
    const b = part('b', 'resistor', 600, 300)
    const middle = part('m', 'bulb', 400, 300, 90)
    const s = join(drawing(a, b, middle), [end('a', 1), end('b', 0)])
    const path = wirePath(s, s.wires[0])
    expect(square(path)).toBe(true)
    expect(through(path, middle)).toBe(false)
  })

  it('go round the other end of their own part, when its terminal faces away', () => {
    // b's terminal 1 faces right, away from a: the wire must loop round b, not through it.
    const s = join(drawing(part('a', 'resistor', 200, 300), part('b', 'resistor', 500, 300)), [end('a', 1), end('b', 1)])
    const path = wirePath(s, s.wires[0])
    expect(square(path)).toBe(true)
    for (const p of s.parts) expect(through(path, p)).toBe(false)
  })

  it('won’t join a terminal to itself, or two terminals twice', () => {
    const s = join(drawing(part('a', 'resistor', 200, 200), part('b', 'resistor', 400, 200)), [end('a', 1), end('b', 0)])
    expect(cantJoin(s, end('a', 1), end('a', 1))).toMatch(/same/)
    expect(cantJoin(s, end('b', 0), end('a', 1))).toMatch(/already/)
    expect(cantJoin(s, end('a', 0), end('b', 1))).toBeNull()
  })

  it('keep a dragged bend, the line on from it moving with it', () => {
    // Two parts lying across at different heights: a Z, across, down, across.
    const s = join(drawing(part('a', 'resistor', 200, 200), part('b', 'resistor', 500, 320)), [end('a', 1), end('b', 0)])
    const [first, second] = wirePath(s, s.wires[0]).slice(1, -1)
    expect(first.x).toBe(second.x)
    const moved = moveBend(s, s.wires[0].id, 0, { x: first.x + 40, y: first.y })
    const path = wirePath(moved, moved.wires[0])
    expect(square(path)).toBe(true)
    expect(path.slice(1, -1)).toEqual([{ x: first.x + 40, y: first.y }, { x: second.x + 40, y: second.y }])
    expect(moved.wires[0].auto).toBe(false)
  })

  it('arrive straight into a terminal, after a bend is dragged off its line', () => {
    const s = join(drawing(part('a', 'resistor', 200, 200), part('b', 'resistor', 400, 320, 90)), [end('a', 1), end('b', 0)])
    const [bend] = wirePath(s, s.wires[0]).slice(1, -1)
    const moved = moveBend(s, s.wires[0].id, 0, { x: bend.x + 60, y: bend.y - 40 })
    const path = wirePath(moved, moved.wires[0])
    expect(square(path)).toBe(true)
    expect(path).toContainEqual({ x: bend.x + 60, y: bend.y - 40 })
    // Down into b, which is upright with terminal 0 on top.
    expect(path.at(-2)!.x).toBe(400)
  })
})

describe('junctions', () => {
  // A cell on the left feeding two resistors one above the other, as in a parallel circuit.
  const ladder = () =>
    join(
      drawing(part('c', 'cell', 160, 300, 270), part('r1', 'resistor', 400, 200, 90), part('r2', 'resistor', 560, 200, 90)),
      [end('c', 1), end('r1', 0)],
      [end('c', 1), end('r2', 0)],
    )

  it('get a dot where a wire branches off another', () => {
    const s = ladder()
    const dots = junctions(s)
    expect(dots).toHaveLength(1)
    // Where the two wires part, on r1's side.
    expect(dots[0].x).toBe(400)
  })

  it('get no dot where wires only cross, or where one wire meets a terminal', () => {
    const s = join(drawing(part('a', 'resistor', 200, 200), part('b', 'resistor', 400, 200)), [end('a', 1), end('b', 0)])
    expect(junctions(s)).toEqual([])
    const crossing: Schematic = {
      ...drawing(part('a', 'resistor', 200, 300), part('b', 'resistor', 600, 300), part('c', 'resistor', 400, 140, 90), part('d', 'resistor', 400, 460, 90)),
      wires: [
        { id: 'h', a: end('a', 1), b: end('b', 0), via: [], auto: false },
        { id: 'v', a: end('c', 1), b: end('d', 0), via: [], auto: false },
      ],
    }
    expect(junctions(crossing)).toEqual([])
  })

  it('get a dot at a terminal two wires leave in different directions', () => {
    const s: Schematic = {
      ...drawing(part('a', 'resistor', 300, 300), part('b', 'resistor', 300, 160, 90), part('c', 'resistor', 300, 440, 90)),
      wires: [
        { id: 'up', a: end('a', 1), b: end('b', 1), via: [{ x: 340, y: 220 }], auto: false },
        { id: 'down', a: end('a', 1), b: end('c', 0), via: [{ x: 340, y: 380 }], auto: false },
      ],
    }
    expect(junctions(s)).toEqual([{ x: 340, y: 300 }])
  })
})

describe('moving, turning and deleting', () => {
  it('selects the parts whose middles are inside a box dragged either way', () => {
    expect(partsIn(pair(), { x1: 420, y1: 220, x2: 180, y2: 180 }).sort()).toEqual(['a', 'b'])
  })

  it('a wire follows a part that moves, still square', () => {
    const s = moveParts(pair(), ['b'], 0, 120)
    const path = wirePath(s, s.wires[0])
    expect(path[0]).toEqual({ x: 240, y: 200 })
    expect(path.at(-1)).toEqual({ x: 360, y: 320 })
    expect(square(path)).toBe(true)
  })

  it('a wire between two parts moved together moves with them, bends and all', () => {
    const bent = join(drawing(part('a', 'resistor', 200, 200), part('b', 'resistor', 500, 320)), [end('a', 1), end('b', 0)])
    const s = moveBend(bent, bent.wires[0].id, 0, { x: 300, y: 200 })
    const bends = s.wires[0].via
    const moved = moveParts(s, ['a', 'b'], 40, 40)
    expect(moved.wires[0].via).toEqual(bends.map((q) => ({ x: q.x + 40, y: q.y + 40 })))
  })

  it('turns a part a quarter turn, its wire routed again', () => {
    const s = rotateParts(pair(), ['b'])
    expect(s.parts[1].rotation).toBe(90)
    expect(square(wirePath(s, s.wires[0]))).toBe(true)
    expect(wirePath(s, s.wires[0]).at(-1)).toEqual({ x: 400, y: 160 })
  })

  it('deleting a part takes its wires with it', () => {
    const s = withoutParts(pair(), ['a'])
    expect(s.parts.map((p) => p.id)).toEqual(['b'])
    expect(s.wires).toEqual([])
  })
})

describe('exporting', () => {
  it('crops to the parts, their labels and the wires, plus a margin', () => {
    const s = pair()
    s.parts[0].name = { mode: 'text', text: 'R_1' }
    const crop = cropBox(s)!
    expect(crop.x).toBe(200 - LEAD - EXPORT_PAD)
    expect(crop.x + crop.width).toBe(400 + LEAD + EXPORT_PAD)
    // The name above R₁ reaches higher than its symbol.
    expect(crop.y).toBeLessThan(200 - 9 - EXPORT_PAD - 10)
  })

  it('has nothing to export with nothing drawn', () => {
    expect(cropBox(emptySchematic())).toBeNull()
  })

  it('describes what is drawn without its labels', () => {
    expect(describeCircuit(pair())).toBe('A circuit diagram of 2 resistors, joined by 1 wire')
  })
})

describe('a drawing saved in the browser', () => {
  const saved = () => join(drawing(part('a', 'resistor', 200, 200), part('b', 'switch', 400, 200, 180)), [end('a', 1), end('b', 0)])

  it('comes back as it was', () => {
    const s = { ...saved(), symbols: 'iec' as const, polarity: true }
    expect(tidySchematic(JSON.parse(JSON.stringify(s)))).toEqual(s)
  })

  it('drops anything malformed, and wires to parts that are gone', () => {
    const stored = {
      parts: [part('a', 'resistor', 203, 197), { id: 'x', kind: 'flux capacitor', x: 0, y: 0 }, { id: 'y', kind: 'bulb', x: 'no', y: 1 }, part('a', 'bulb', 0, 0)],
      wires: [
        { id: 'w1', a: end('a', 1), b: end('gone', 0), via: [] },
        { id: 'w2', a: end('a', 1), b: end('a', 1), via: [] },
        { id: 'w3', a: end('a', 0), b: end('a', 1), via: [{ x: 'no' }, { x: 211, y: 251 }] },
      ],
      symbols: 'dutch',
    }
    expect(tidySchematic(stored)).toEqual({
      parts: [part('a', 'resistor', 200, 200)],
      wires: [{ id: 'w3', a: end('a', 0), b: end('a', 1), via: [{ x: 220, y: 260 }], auto: true }],
      symbols: 'us',
      polarity: false,
    })
    expect(tidySchematic(null)).toEqual(emptySchematic())
    expect(tidySchematic('nonsense')).toEqual(emptySchematic())
  })
})
