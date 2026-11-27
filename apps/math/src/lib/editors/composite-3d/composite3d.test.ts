import { describe, expect, it } from 'vitest'
import { drawFigure, measureEdges, repickedEdges, textbookView } from './draw.js'
import { PRESETS } from './presets.js'
import { pieceAt } from './snap.js'
import { fittable, footprintOf, resizeCorner, resizeHeight, slide } from './handles.js'
import {
  emptyFigure, newPiece, placeAll, ROTATIONS, starterFigure, tidyFigure, turned, withAttached, type Attach, type Figure, type Piece,
} from './model.js'

const on = (parent: string, axis: 0 | 1 | 2, sign: 1 | -1, align: Attach['align'] = ['middle', 'middle']): Attach => ({
  parent, face: { axis, sign }, align, offset: [0, 0],
})
const fig = (pieces: Piece[], more: Partial<Figure> = {}): Figure => ({ ...emptyFigure(), pieces, ...more })
const box = (l: number, w: number, h: number, at: Attach | null = null, cut = false): Piece => ({ ...newPiece('box', at, cut), size: { length: l, width: w, height: h } })
const looks = (f: Figure) => {
  const d = drawFigure(f, 'medium')
  const count = (look: string) => d.runs.filter((r) => r.look === look).length
  return { d, line: count('line'), hidden: count('hidden'), seam: count('seam') }
}

describe('placing pieces', () => {
  it('stands the first piece on the ground, centered', () => {
    const b = box(4, 2, 3)
    const p = placeAll([b]).get(b.id)!
    expect(p.min).toEqual([-2, 0, -1])
    expect(p.max).toEqual([2, 3, 1])
  })

  it('puts a piece on a face, lined up as asked', () => {
    const low = box(8, 4, 3)
    const high = box(3, 4, 4, on(low.id, 1, 1, ['start', 'middle']))
    const p = placeAll([low, high]).get(high.id)!
    expect(p.min).toEqual([-4, 3, -2])
    expect(p.max).toEqual([-1, 7, 2])
  })

  it('takes a hole in from the face, through to the far side', () => {
    const b = box(4, 4, 4)
    const hole = { ...newPiece('cylinder', on(b.id, 2, -1), true), size: { radius: 1, height: 1 } }
    const p = placeAll([b, hole]).get(hole.id)!
    expect(p.min[2]).toBeCloseTo(-2)
    expect(p.max[2]).toBeCloseTo(2)
  })

  it('takes a hole to its own depth when it doesn’t go through', () => {
    const b = box(4, 4, 4)
    const hole = { ...newPiece('cylinder', on(b.id, 1, 1), true), size: { radius: 1, height: 1.5 }, through: false }
    const p = placeAll([b, hole]).get(hole.id)!
    expect(p.max[1]).toBeCloseTo(4)
    expect(p.min[1]).toBeCloseTo(2.5)
  })

  it('turns a piece a quarter at a time, through all 24 ways', () => {
    expect(ROTATIONS).toHaveLength(24)
    const c = { ...newPiece('cylinder'), size: { radius: 1, height: 6 } }
    const lying = { ...c, turn: turned(0, 'tip') }
    const p = placeAll([lying]).get(c.id)!
    expect(p.max[1] - p.min[1]).toBeCloseTo(2)
    expect(p.max[2] - p.min[2]).toBeCloseTo(6)
  })

  it('finds everything attached to a piece', () => {
    const a = box(4, 4, 4)
    const b = box(2, 2, 2, on(a.id, 1, 1))
    const c = box(1, 1, 1, on(b.id, 1, 1))
    const d = box(1, 1, 1, on(a.id, 0, 1))
    expect(withAttached([a, b, c, d], b.id)).toEqual([b.id, c.id])
  })
})

describe('drawing', () => {
  it('draws a box with 9 edges showing and 3 hidden', () => {
    const { line, hidden } = looks(fig([box(4, 3, 2)]))
    expect(line).toBe(9)
    expect(hidden).toBe(3)
  })

  it('leaves out hidden edges when they’re turned off', () => {
    const { hidden } = looks(fig([box(4, 3, 2)], { hidden: false }))
    expect(hidden).toBe(0)
  })

  it('draws no seam where an L-shape’s faces are flush, unless seams are on', () => {
    const f = starterFigure()
    expect(looks(f).seam).toBe(0)
    expect(looks({ ...f, seams: true }).seam).toBeGreaterThan(0)
  })

  it('reads an L-shape’s long bottom edge as one edge to label', () => {
    const low = box(8, 4, 3)
    const high = box(3, 4, 4, on(low.id, 1, 1, ['start', 'start']))
    const right = box(2, 4, 3, on(low.id, 0, 1, ['start', 'start']))
    const d = drawFigure(fig([low, high, right]), 'medium')
    const lengths = d.labelables.filter((l) => l.key.startsWith('e:')).map((l) => Math.round(l.measure * 100) / 100)
    expect(lengths).toContain(10)
  })

  it('draws a box with a cylinder through it, with its far circle partly hidden', () => {
    const b = box(4, 4, 4)
    const hole = { ...newPiece('cylinder', on(b.id, 2, -1), true), size: { radius: 1, height: 1 } }
    const { d, line, hidden } = looks(fig([b, hole]))
    expect(line).toBeGreaterThan(9)
    expect(hidden).toBeGreaterThan(3)
    expect(d.runs.length).toBeGreaterThan(12)
  })

  it('draws the seam where a silo’s hemisphere meets its cylinder', () => {
    const c = { ...newPiece('cylinder'), size: { radius: 2, height: 5 } }
    const dome = { ...newPiece('hemisphere', on(c.id, 1, 1)), size: { radius: 2 } }
    const base = looks(fig([c]))
    const silo = looks(fig([c, dome]))
    // The top circle stays drawn, and the dome adds its outline.
    expect(silo.line).toBeGreaterThanOrEqual(base.line)
    expect(silo.seam).toBe(0)
  })

  it('hides a flush seam between two cylinders of the same radius', () => {
    const a = { ...newPiece('cylinder'), size: { radius: 2, height: 3 } }
    const b = { ...newPiece('cylinder', on(a.id, 1, 1)), size: { radius: 2, height: 3 } }
    const join = (f: Figure) => drawFigure(f, 'medium').runs.filter((r) => r.pts.length > 20 && r.pts.every((p) => Math.abs(p[1] - r.pts[0][1]) < 60))
    // Two circles (top and bottom) and no third at the join, unless seams are on.
    expect(looks(fig([a, b])).seam).toBe(0)
    expect(looks(fig([a, b], { seams: true })).seam).toBeGreaterThan(0)
    expect(join(fig([a, b])).length).toBeLessThanOrEqual(join(fig([{ ...a, size: { radius: 2, height: 6 } }])).length)
  })

  it('picks the piece in front at a spot', () => {
    const f = starterFigure()
    const d = drawFigure(f, 'medium')
    const high = f.pieces[1]
    const hullPts = d.hulls.get(high.id)!
    const mid = hullPts.reduce((t, p) => [t[0] + p[0] / hullPts.length, t[1] + p[1] / hullPts.length], [0, 0])
    expect(d.pickAt(mid as [number, number])?.piece).toBe(high.id)
  })

  it('labels the visible edges a new figure starts with, once per length', () => {
    const f = starterFigure()
    const labels = measureEdges(f)
    expect(Object.keys(labels).length).toBeGreaterThanOrEqual(4)
    const d = drawFigure({ ...f, labels }, 'medium')
    expect(d.labels.length).toBe(Object.keys(labels).length)
  })

  it('draws an ice cream cone, a house and a cube with unit cubes', () => {
    const cone = { ...newPiece('cone'), size: { radius: 2, height: 5 }, turn: turned(turned(0, 'tip'), 'tip') }
    const scoop = { ...newPiece('hemisphere', on(cone.id, 1, 1)), size: { radius: 2 } }
    expect(looks(fig([cone, scoop])).line).toBeGreaterThan(2)
    const house = box(4, 3, 3)
    const roof = { ...newPiece('prism', on(house.id, 1, 1)), size: { base: 4, height: 2, length: 3 } }
    expect(looks(fig([house, roof])).line).toBeGreaterThan(10)
    const cube = looks(fig([box(3, 3, 3)], { cubes: true }))
    expect(cube.d.runs.filter((r) => r.look === 'grid').length).toBeGreaterThan(0)
  })
})

describe('keeping the figure', () => {
  it('drops broken pieces and anything on them', () => {
    const a = box(4, 4, 4)
    const b = box(2, 2, 2, on(a.id, 1, 1))
    const raw = JSON.parse(JSON.stringify(fig([a, b])))
    raw.pieces[0].kind = 'teapot'
    expect(tidyFigure(raw).pieces).toEqual([])
    expect(tidyFigure(null).pieces).toEqual([])
  })

  it('keeps a good figure as it was', () => {
    const f = starterFigure()
    expect(tidyFigure(JSON.parse(JSON.stringify(f)))).toEqual(f)
  })
})

describe('dropping a shape onto a face', () => {
  const base = () => {
    const b = box(8, 4, 2)
    return { b, f: fig([b]) }
  }

  it('fits a new box to cover the face, centered on it', () => {
    const { b, f } = base()
    const p = pieceAt(f, 'box', false, b.id, { axis: 1, sign: 1 }, [3, 2, 1])!
    expect(p.on?.align).toEqual(['middle', 'middle'])
    const pl = placeAll([b, p]).get(p.id)!
    expect(pl.max[0] - pl.min[0]).toBeCloseTo(8)
    expect(pl.max[2] - pl.min[2]).toBeCloseTo(4)
  })

  it('fits a cylinder as wide as the face’s narrower side', () => {
    const { b, f } = base()
    const p = pieceAt(f, 'cylinder', false, b.id, { axis: 1, sign: 1 }, [0, 2, 0])!
    expect(p.size.radius).toBeCloseTo(2)
  })

  it('lays a half cylinder along the face’s longer side', () => {
    const { b, f } = base()
    const p = pieceAt(f, 'halfCylinder', false, b.id, { axis: 1, sign: 1 }, [0, 2, 0])!
    const pl = placeAll([b, p]).get(p.id)!
    expect(pl.max[0] - pl.min[0]).toBeCloseTo(8)
    expect(pl.max[2] - pl.min[2]).toBeCloseTo(4)
    expect(pl.max[1] - pl.min[1]).toBeCloseTo(2)
  })

  it('covers a cylinder’s top with a hemisphere of the same radius', () => {
    const c = { ...newPiece('cylinder'), size: { radius: 3, height: 5 } }
    const p = pieceAt(fig([c]), 'hemisphere', false, c.id, { axis: 1, sign: 1 }, [0, 5, 0])!
    expect(p.size.radius).toBeCloseTo(3)
  })

  it('moves a piece where the pointer is: the middle, an edge, or half-unit steps', () => {
    const { b, f } = base()
    const top = box(2, 2, 2, on(b.id, 1, 1))
    const at = (x: number) => pieceAt({ ...f, pieces: [b, top] }, 'box', false, b.id, { axis: 1, sign: 1 }, [x, 2, 0], top)!.on!
    expect(at(0.1).align[0]).toBe('middle')
    expect(at(-2.9).align[0]).toBe('start')
    expect(at(1.7)).toMatchObject({ align: ['middle', 'middle'], offset: [1.5, 0] })
  })

  it('stands a new piece on its bottom against a side face', () => {
    const { b, f } = base()
    const p = pieceAt(f, 'cone', false, b.id, { axis: 0, sign: 1 }, [4, 1, 0])!
    const placed = placeAll([...f.pieces, p]).get(p.id)!
    // The cone's base lies against the right side, as wide as the side is tall, its tip pointing right.
    expect(placed.min[0]).toBeCloseTo(4)
    expect(placed.max[1] - placed.min[1]).toBeCloseTo(2)
    expect(placed.max[0] - placed.min[0]).toBeCloseTo(2)
  })

  it('makes a hole the shape it would build there, flipped into the face', () => {
    const { b, f } = base()
    // A cylinder into the front (8 wide, 2 tall): as wide as the face is tall, going straight back, all the way through.
    const drill = pieceAt(f, 'cylinder', true, b.id, { axis: 2, sign: -1 }, [0, 1, -2])!
    expect(drill.cut).toBe(true)
    expect(drill.size.radius).toBe(1)
    const d = placeAll([b, drill]).get(drill.id)!
    expect([d.min[2], d.max[2]]).toEqual([-2, 2])
    // A half cylinder into the top: a trough along the long side, as deep as its radius.
    const t = pieceAt(f, 'halfCylinder', true, b.id, { axis: 1, sign: 1 }, [0, 2, 0])!
    const tp = placeAll([b, t]).get(t.id)!
    expect(tp.max[1]).toBeCloseTo(2)
    expect(tp.min[1]).toBeCloseTo(0)
    expect(tp.max[0] - tp.min[0]).toBeCloseTo(8)
    // A cone into the top points down: its circle in the top face, its tip inside.
    const c = pieceAt(f, 'cone', true, b.id, { axis: 1, sign: 1 }, [0, 2, 0])!
    const cs = drawFigure(fig([b, c]), 'medium')
    expect(cs.runs.length).toBeGreaterThan(9)
    const cp = placeAll([b, c]).get(c.id)!
    expect(cp.max[1]).toBeCloseTo(2)
  })

  it('allows several holes in one face, each placed by its offset', () => {
    const { b } = base()
    const h1 = { ...newPiece('cylinder', on(b.id, 2, -1), true), size: { radius: 0.5, height: 1 } }
    const h2 = { ...newPiece('cylinder', { ...on(b.id, 2, -1), offset: [2.5, 0] as [number, number] }, true), size: { radius: 0.5, height: 1 } }
    const p = placeAll([b, h1, h2])
    expect(p.get(h2.id)!.center[0] - p.get(h1.id)!.center[0]).toBeCloseTo(2.5)
    expect(drawFigure(fig([b, h1, h2]), 'medium').runs.length).toBeGreaterThan(drawFigure(fig([b, h1]), 'medium').runs.length)
  })

  it('moves a piece to another face, keeping it', () => {
    const { b, f } = base()
    const top = box(2, 2, 2, on(b.id, 1, 1))
    const moved = pieceAt({ ...f, pieces: [b, top] }, 'box', false, b.id, { axis: 0, sign: 1 }, [4, 1, 0], top)!
    expect(moved.id).toBe(top.id)
    expect(moved.on?.face).toEqual({ axis: 0, sign: 1 })
  })
})

describe('the presets and views', () => {
  it('draws every preset in the camera, corner and front views', () => {
    for (const p of PRESETS) {
      const f = p.make()
      for (const style of ['camera', 'corner', 'front'] as const) {
        const d = drawFigure({ ...f, view: { ...f.view, style } }, 'medium')
        expect(d.runs.length, `${p.id} ${style}`).toBeGreaterThan(3)
        expect(d.labels.length, `${p.id} ${style}`).toBeGreaterThan(0)
      }
    }
  })

  it('keeps an edge’s label when its piece is resized', () => {
    const f = PRESETS[0].make()
    const before = Object.keys(f.labels).filter((k) => k.startsWith('e:'))
    const bigger = { ...f, pieces: f.pieces.map((p, i) => (i === 0 ? { ...p, size: { ...p.size, length: 10 } } : p)) }
    const keys = drawFigure(bigger, 'medium').labelables.map((l) => l.key)
    expect(before.filter((k) => keys.includes(k)).length).toBe(before.length)
  })

  it('draws a dimension line with ticks for a length set that way', () => {
    const f = PRESETS[0].make()
    expect(drawFigure({ ...f, labelStyle: 'dimension' }, 'medium').dims.length).toBeGreaterThan(drawFigure(f, 'medium').dims.length)
  })

  it('measures a silo’s overall height from the base to the top of its dome', () => {
    const f = PRESETS.find((p) => p.id === 'silo')!.make()
    const d = drawFigure({ ...f, overall: { height: true }, labels: { ...f.labels, 'all:height': { mode: 'measure', text: '' } } }, 'medium')
    expect(d.labelables.find((l) => l.key === 'all:height')?.measure).toBeCloseTo(11)
  })

  it('draws a half cylinder, added and as a hole', () => {
    const b = box(6, 4, 3)
    const lid = { ...newPiece('halfCylinder', on(b.id, 1, 1)), size: { radius: 2, length: 4 }, turn: turned(0, 'spin') }
    expect(drawFigure(fig([b, lid]), 'medium').runs.length).toBeGreaterThan(9)
    const arch = { ...newPiece('halfCylinder', on(b.id, 2, -1), true), size: { radius: 1, length: 4 } }
    expect(drawFigure(fig([b, arch]), 'medium').runs.length).toBeGreaterThan(9)
  })
})

describe('editing a piece on its plane', () => {
  const setup = () => {
    const b = box(8, 4, 2)
    const top = box(2, 2, 2, on(b.id, 1, 1))
    return { b, top, f: fig([b, top]) }
  }

  it('finds where a piece sits: its footprint on the face, and its height out of it', () => {
    const { top, f } = setup()
    const fp = footprintOf(f, top.id)!
    expect(fp).toMatchObject({ axis: 1, level: 2, out: 1, lo: [-1, -1], hi: [1, 1], height: 2 })
  })

  it('slides on its plane in half units, keeping at least a corner on the face', () => {
    const { top, f } = setup()
    expect(slide(f, top.id, [1.3, 0])!.offset).toEqual([1.5, 0])
    // Far off the end: stops with just its edge on the face's end (face to x = 4, half width 1).
    expect(slide(f, top.id, [20, 0])!.offset).toEqual([5, 0])
  })

  it('resizes from a corner, the opposite corner staying put', () => {
    const { top, f } = setup()
    const r = resizeCorner(f, top.id, [-1, -1], [3, 1.6])!
    expect(r.size).toMatchObject({ length: 4, width: 2.5, height: 2 })
    const placed = placeAll(f.pieces.map((p) => (p.id === top.id ? { ...p, ...r } : p))).get(top.id)!
    expect(placed.min[0]).toBeCloseTo(-1)
    expect(placed.min[2]).toBeCloseTo(-1)
  })

  it('keeps a cylinder round as it’s resized from a corner', () => {
    const { b } = setup()
    const c = { ...newPiece('cylinder', on(b.id, 1, 1)), size: { radius: 1, height: 2 } }
    const r = resizeCorner(fig([b, c]), c.id, [-1, -1], [2, 0])!
    expect(r.size.radius).toBe(1.5)
  })

  it('changes the height with the top handle, and a hole’s depth the same way', () => {
    const { top, f, b } = setup()
    expect(resizeHeight(f, top.id, 3.2)).toMatchObject({ height: 3 })
    const hole = pieceAt(fig([b]), 'cone', true, b.id, { axis: 1, sign: 1 }, [0, 2, 0])!
    expect(footprintOf(fig([b, hole]), hole.id)!.out).toBe(-1)
    expect(resizeHeight(fig([b, hole]), hole.id, 1)).toMatchObject({ height: 1 })
  })
})

describe('measures that fill their base', () => {
  it('keeps a filled measure the size of the face it sits on, as the face changes', () => {
    const b = box(8, 4, 2)
    const c = { ...newPiece('cylinder', { ...on(b.id, 1, 1), offset: [1.5, 0] as [number, number] }), size: { radius: 1, height: 3 }, fill: { radius: true } }
    const at = (bb: Piece) => placeAll([bb, c]).get(c.id)!
    expect(at(b).piece.size.radius).toBe(2)
    // Centered on the face that way, whatever offset it had.
    expect(at(b).center[0]).toBeCloseTo(0)
    expect(at({ ...b, size: { length: 8, width: 6, height: 2 } }).piece.size.radius).toBe(3)
    expect(fittable(fig([b, c]), c.id)).toEqual({ radius: 2 })
  })
})

describe('measures after the figure turns', () => {
  it('move off hidden edges onto a seen edge of the same length, spread apart', () => {
    for (let orient = 0; orient < 24; orient++) {
      const f = fig([box(8, 6, 2)])
      f.view = { ...f.view, orient }
      const d = drawFigure({ ...f, view: textbookView(f) }, 'medium')
      const all = d.labelables.filter((l) => /^e:[^+~]+#\d+$/.test(l.key)).map((l) => l.key)
      const moves = repickedEdges(d, all)
      const after = all.map((k) => moves.get(k) ?? k)
      for (const k of after) {
        const l = d.labelables.find((x) => x.key === k)!
        const length = l.measure
        // A hidden edge stays only when no seen edge of that length is free.
        if (l.hidden) expect(d.labelables.filter((x) => !x.hidden && Math.abs(x.measure - length) < 1e-6 && !after.includes(x.key))).toEqual([])
      }
      expect(new Set(after).size).toBe(after.length)
    }
  })
})
