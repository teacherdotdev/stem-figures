import { describe, expect, it } from 'vitest'
import {
  acrossEdge, anchorPoints, arcTarget, exitAlong, heightFoot, baseOf, change, cornerPieces, linedUpSides, mergePieces, moveLinedUp, pieceAcross, crossesInside, emptyComposite, firstPiece, footAlong, lineTargets, linesOnShape, ontoTipPath, outline, pieceOn, placeAll, pointAt, problem, retypeTriangle,
  setBase, setSide, starter, tidyComposite, tipPath, triangleParts, turnedPieces, withoutPiece,
  type Edge, type ExtraLine, type Piece, type Point, type Vec,
} from './composite'

const rect = (width: number, depth: number, at: Vec = [5, 10]): Piece => ({ ...firstPiece('rectangle', width), id: 'r', at, width, depth })
const on = (parent: string, side: number, from: number, to: number, kind: Piece['kind'] = 'rectangle', depth = 2, id = 'c'): Piece => ({
  ...firstPiece(kind, to - from), id, mount: { parent, side, from, to }, depth,
})
const lengths = (loop: Edge[]) => loop.map((e) => (e.kind === 'line' ? Math.hypot(e.q[0] - e.p[0], e.q[1] - e.p[1]) : 'arc'))
const angles = (pieces: Piece[]) => outline(pieces).corners.map((c) => (c.angle === null ? null : Math.round(c.angle)))

describe('the outline', () => {
  it('goes round a lone rectangle in four sides with right angles', () => {
    const o = outline([rect(6, 4)])
    expect(o.loops).toHaveLength(1)
    expect(lengths(o.loops[0]).sort()).toEqual([4, 4, 6, 6])
    expect(angles([rect(6, 4)])).toEqual([90, 90, 90, 90])
  })

  it('hides the seam of an L-shape, leaving six sides and one reflex corner', () => {
    const pieces = starter('l-shape')
    const o = outline(pieces)
    expect(o.loops).toHaveLength(1)
    expect(o.loops[0]).toHaveLength(6)
    expect(angles(pieces).filter((a) => a === 270)).toHaveLength(1)
    expect(angles(pieces).filter((a) => a === 90)).toHaveLength(5)
    expect(o.seams).toHaveLength(1)
  })

  it('finds a seam where a piece only touches another, not just where it sits on it', () => {
    const l = starter('l-shape')
    const up = l[1].id
    // The upright's side facing right, into the L's corner.
    const right = outline(l).stretches.find((st) => st.piece === up && Math.abs(st.p[0] - st.q[0]) < 1e-9 && st.p[0] > 2)!
    const added = pieceOn(l, right, 'rectangle')
    if (!('piece' in added)) throw new Error(added.problem)
    // Its base is the upright's side; its bottom also runs along the lower arm's top.
    const o = outline([...l, { ...added.piece, depth: 2 }])
    expect(o.seams).toHaveLength(3)
  })

  it('joins sides that run straight on when a piece sits flush on the whole side', () => {
    const pieces = [rect(6, 4), on('r', 2, 0, 6, 'rectangle', 2)]
    const o = outline(pieces)
    expect(lengths(o.loops[0]).sort()).toEqual([6, 6, 6, 6])
    expect(angles(pieces)).toEqual([90, 90, 90, 90])
  })

  it('draws a semicircle on top as one curve between two curved corners', () => {
    const o = outline(starter('arch'))
    expect(o.loops[0].filter((e) => e.kind === 'arc')).toHaveLength(1)
    expect(o.loops[0]).toHaveLength(4)
    expect(angles(starter('arch')).filter((a) => a === null)).toHaveLength(2)
  })

  it('makes a circle from two semicircles, its diameter a hidden seam', () => {
    const o = outline(starter('circle'))
    expect(o.loops).toHaveLength(1)
    expect(o.loops[0].map((e) => e.kind)).toEqual(['arc', 'arc'])
    expect(o.seams).toHaveLength(1)
    expect(problem(starter('circle'))).toBeNull()
  })

  it('gives a house five sides', () => {
    expect(outline(starter('house')).loops[0]).toHaveLength(5)
  })

  it('keeps side keys apart when a piece splits a side in two', () => {
    const pieces = [rect(8, 3), on('r', 2, 3, 5)]
    const keys = outline(pieces).loops[0].map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('splits a side into two where an extra line ends partway along', () => {
    const o = outline([rect(6, 4)], [[8, 10]])
    expect(o.loops[0]).toHaveLength(5)
    expect(o.corners.filter((c) => c.angle === 180)).toHaveLength(1)
  })
})

describe('pieces', () => {
  it('refuses two pieces that overlap', () => {
    const pieces = starter('l-shape')
    expect(problem(pieces)).toBeNull()
    // A rectangle on the L's lower arm, reaching up into its upright.
    const o = outline(pieces)
    const top = o.stretches.find((s) => s.piece === pieces[0].id && s.side === 2)!
    const tall = { ...on(pieces[0].id, 2, top.from, top.to), depth: 3, mount: { parent: pieces[0].id, side: 2, from: 0, to: 6 } }
    expect(problem([...pieces, tall])).toMatch(/overlap/)
  })

  it('covers the whole side it goes on, reaching out 3, or less when that would overlap', () => {
    const pieces = [rect(6, 4)]
    const top = outline(pieces).stretches.find((s) => s.side === 2)!
    const added = pieceOn(pieces, top, 'rectangle')
    expect('piece' in added && [added.piece.depth, baseOf(added.piece)]).toEqual([3, 6])
    // Inside the L's corner, a piece on the lower arm's top runs into the upright 5 along.
    const l = starter('l-shape')
    const arm = outline(l).stretches.find((s) => s.piece === l[0].id && s.side === 2)!
    const tight = pieceOn(l, arm, 'triangle')
    expect('piece' in tight).toBe(true)
  })

  it('goes on a slanted side, tilted to match', () => {
    const house = starter('house')
    const roof = house[1]
    const r = pieceOn(house, outline(house).stretches.find((s) => s.piece === roof.id && s.side === 1)!, 'rectangle')
    expect('piece' in r).toBe(true)
    if (!('piece' in r)) return
    const pl = placeAll([...house, r.piece]).get(r.piece.id)!
    expect(Math.abs(pl.u[0]) > 0.1 && Math.abs(pl.u[1]) > 0.1).toBe(true)
    expect(baseOf(r.piece)).toBeCloseTo(Math.hypot(3, 3))
  })

  it('deletes the piece, and any it would leave floating, but nothing still touching the rest', () => {
    const c = { ...emptyComposite(), pieces: [rect(8, 3), on('r', 2, 0, 3, 'rectangle', 2, 'a'), on('a', 2, 0, 3, 'triangle', 2, 'b')] }
    c.lines = [{ id: 'l', a: { at: 'corner', piece: 'a', corner: 2 }, b: { at: 'corner', piece: 'r', corner: 0 }, style: 'dashed', label: 'none', text: '', ticks: 0, right: true }]
    // The roof sat only on the upright: deleting the upright would leave it floating, so it goes too.
    const left = withoutPiece(c, 'a')
    expect(left.pieces.map((p) => p.id)).toEqual(['r'])
    expect(left.lines).toEqual([])
    // Deleting the base leaves the upright and its roof, together, standing where they were.
    const top = withoutPiece(c, 'r')
    expect(top.pieces.map((p) => p.id)).toEqual(['a', 'b'])
    expect(top.pieces[0].mount).toBeNull()
    expect(placeAll(top.pieces).get('b')!.corners).toEqual(placeAll(c.pieces).get('b')!.corners)
  })
})

describe('pieces in an inside corner', () => {
  const l = starter('l-shape')
  // The lower arm's top, which meets the upright at the L's inside corner, (3, -3).
  const arm = outline(l).stretches.find((st) => st.piece === l[0].id && st.side === 2)!
  const options = cornerPieces(l, outline(l), arm)

  it('offers a right triangle and a quarter circle, both fitting', () => {
    expect(options.map((o) => o.kind)).toEqual(['triangle', 'quarter'])
    expect(options.every((o) => 'piece' in o.result)).toBe(true)
  })

  it('puts the triangle’s square corner and the quarter circle’s center in the corner', () => {
    for (const opt of options) {
      if (!('piece' in opt.result)) continue
      const pl = placeAll([...l, opt.result.piece]).get(opt.result.piece.id)!
      const square = opt.kind === 'quarter' ? pl.arc!.c : pl.corners[2]
      const foot = opt.kind === 'quarter' ? square : (pl.piece.tip === 0 ? pl.a : pl.b)
      expect(foot.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([3, -3])
    }
  })

  it('keeps a piece in the corner beside the upright when the lower arm grows', () => {
    const opt = options.find((o) => o.kind === 'quarter')!
    if (!('piece' in opt.result)) throw new Error('no quarter circle')
    const q = opt.result.piece
    // The lower arm grows at the end the upright is flush against.
    const r = change([...l, q], (d, pinned) => setBase(d, l[0].id, 10, pinned))
    if (!('pieces' in r)) throw new Error(r.problem)
    const placed = placeAll(r.pieces)
    const upright = placed.get(l[1].id)!
    const center = placed.get(q.id)!.arc!.c
    expect(upright.corners.some((c) => Math.hypot(c[0] - center[0], c[1] - center[1]) < 1e-6)).toBe(true)
  })

  it('makes a quarter circle as big as the shorter side of the corner, and keeps it in the corner as it grows', () => {
    const opt = options.find((o) => o.kind === 'quarter')!
    if (!('piece' in opt.result)) throw new Error('no quarter circle')
    const q = opt.result.piece
    expect(baseOf(q)).toBe(4)
    const r = change([...l, q], (d, pinned) => setBase(d, q.id, 3, pinned))
    if (!('pieces' in r)) throw new Error(r.problem)
    const pl = placeAll(r.pieces).get(q.id)!
    expect(pl.arc!.c.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([3, -3])
  })
})

describe('changes spreading through seams', () => {
  const width = (pieces: Piece[], id: string) => baseOf(pieces.find((p) => p.id === id)!)

  it("a triangle covering a rectangle's top resizes the rectangle with its base", () => {
    const [house, roof] = starter('house')
    const r = change([house, roof], (d, pinned) => setBase(d, roof.id, 8, pinned))
    expect('pieces' in r && [width(r.pieces, house.id), width(r.pieces, roof.id)]).toEqual([8, 8])
  })

  it('and the rectangle resizes the triangle the same way', () => {
    const [house, roof] = starter('house')
    const r = change([house, roof], (d, pinned) => setBase(d, house.id, 9, pinned))
    expect('pieces' in r && width(r.pieces, roof.id)).toBe(9)
  })

  it('a piece on part of a side keeps its length, grows about its middle without moving its parent, and stays put on the page as the parent grows', () => {
    const pieces = [rect(8, 3), on('r', 2, 2, 4)]
    const grown = change(pieces, (d, pinned) => setBase(d, 'c', 4, pinned))
    expect('pieces' in grown && grown.pieces.find((p) => p.id === 'c')!.mount).toMatchObject({ from: 1, to: 5 })
    expect('pieces' in grown && width(grown.pieces, 'r')).toBe(8)
    const wider = change(pieces, (d, pinned) => setBase(d, 'r', 16, pinned))
    // The base grows to the right, so its top side (which runs right to left) starts 8 further along: the piece stays where it was.
    expect('pieces' in wider && wider.pieces.find((p) => p.id === 'c')!.mount).toMatchObject({ from: 10, to: 12 })
  })

  it('lets a piece run past the ends of its side, leaving the parent as it is', () => {
    const pieces = [rect(4, 3), on('r', 2, 1, 3)]
    const r = change(pieces, (d, pinned) => setBase(d, 'c', 6, pinned))
    if (!('pieces' in r)) throw new Error(r.problem)
    expect(width(r.pieces, 'r')).toBe(4)
    expect(r.pieces[1].mount).toMatchObject({ from: -1, to: 5 })
  })

  it('never moves a rectangle because the side under it changed', () => {
    // A rectangle on the right side of a rectangle, running past its top end.
    const pieces = [rect(4, 3), { ...on('r', 1, 2, 6), id: 'c' }]
    const before = placeAll(pieces).get('c')!.corners
    const r = change(pieces, (d) => (d[0].depth = 5))
    if (!('pieces' in r)) throw new Error(r.problem)
    expect(r.pieces[1].mount).toMatchObject({ from: 2, to: 6 })
    expect(placeAll(r.pieces).get('c')!.corners).toEqual(before)
    // Nor one covering the whole top: it keeps its width.
    const top = [rect(6, 3), { ...on('r', 2, 0, 6), id: 't' }]
    const wider = change(top, (d, pinned) => setBase(d, 'r', 8, pinned))
    if (!('pieces' in wider)) throw new Error(wider.problem)
    expect(baseOf(wider.pieces[1])).toBe(6)
  })

  it('stops a side shrinking once a piece on it would come apart, letting them meet at a corner', () => {
    const pieces = [rect(8, 3, [0, 0]), on('r', 2, 0, 3)]
    // The top runs right to left, so the piece sits on its right end (x 5 to 8); the base can shrink to x = 5, not past it.
    const corner = change(pieces, (d, pinned) => setBase(d, 'r', 5, pinned))
    expect('pieces' in corner).toBe(true)
    expect(change(pieces, (d, pinned) => setBase(d, 'r', 4, pinned))).toHaveProperty('problem')
  })

  it("a rectangle's height moves what sits on its other sides", () => {
    const pieces = [rect(6, 4), on('r', 1, 0, 4, 'triangle')]
    const r = change(pieces, (d, pinned) => setSide(d, 'r', 1, 6, pinned))
    expect('pieces' in r && width(r.pieces, 'c')).toBe(6)
  })

  it('refuses a change that makes pieces overlap', () => {
    const pieces = [rect(8, 3), on('r', 2, 0, 2, 'rectangle', 3, 'a'), on('r', 2, 3, 5, 'rectangle', 3, 'b')]
    const r = change(pieces, (d, pinned) => {
      const a = d.find((p) => p.id === 'a')!
      a.mount = { ...a.mount!, to: 4 }
      a.width = 4
      pinned.add('a')
    })
    expect('problem' in r && r.problem).toMatch(/overlap/)
  })
})

describe("a triangle's popup", () => {
  const tri = (width: number, tip: number, depth: number, locks: Piece['locks'] = []): Piece => ({ ...firstPiece('triangle', width), tip, depth, locks })
  const parts = (p: Piece, r: ReturnType<typeof retypeTriangle>) => ('problem' in r ? r.problem : triangleParts({ ...p, ...r }))

  it('keeps the base and the other base angle when a base angle is typed', () => {
    const p = tri(6, 3, 3) // 45°, 45°
    const t = parts(p, retypeTriangle(p, 'A', 60))
    expect(typeof t !== 'string' && [t.A, t.B, t.c].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([60, 45, 6])
  })

  it('keeps a locked angle instead', () => {
    const p = tri(6, 3, 3, ['C'])
    const t = parts(p, retypeTriangle(p, 'A', 30))
    expect(typeof t !== 'string' && [t.A, t.B, t.C].map((v) => Math.round(v))).toEqual([30, 60, 90])
  })

  it('keeps the two other sides when a side is typed', () => {
    const p = tri(6, 0, 8) // a right triangle, 6, 8, 10
    const t = parts(p, retypeTriangle(p, 'a', 9))
    expect(typeof t !== 'string' && [t.a, t.b, t.c].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([9, 8, 6])
  })

  it('keeps a locked angle or side as the tip is dragged, and holds the tip with two locks', () => {
    const lockedA = tri(6, 2, 3, ['A'])
    const A = triangleParts(lockedA).A
    const path = tipPath(lockedA)
    if (!path || path === 'held') throw new Error('expected a path')
    const at = ontoTipPath(path, [5, 6])
    expect(triangleParts({ ...lockedA, tip: at[0], depth: at[1] }).A).toBeCloseTo(A)
    const lockedC = tri(6, 2, 3, ['C'])
    const circle = tipPath(lockedC)
    if (!circle || circle === 'held') throw new Error('expected a path')
    const on = ontoTipPath(circle, [4, 1])
    expect(triangleParts({ ...lockedC, tip: on[0], depth: on[1] }).C).toBeCloseTo(triangleParts(lockedC).C)
    expect(tipPath(tri(6, 2, 3, ['c']))).toBeNull()
    expect(tipPath(tri(6, 2, 3, ['A', 'b']))).toBe('held')
  })

  it('keeps its locks when the side it covers is resized', () => {
    const base = { ...rect(6, 4, [0, 0]) }
    const roof = { ...on('r', 2, 0, 6, 'triangle', 3, 't'), tip: 1, locks: ['A'] as Piece['locks'] }
    const A = triangleParts(roof).A
    const r = change([base, roof], (d, pinned) => setBase(d, 'r', 9, pinned))
    if (!('pieces' in r)) throw new Error(r.problem)
    expect(triangleParts(r.pieces[1]).A).toBeCloseTo(A)
    const lockedBase = change([base, { ...roof, locks: ['c'] }], (d, pinned) => setBase(d, 'r', 9, pinned))
    expect(lockedBase).toHaveProperty('problem')
  })

  it('says so when the parts can’t make a triangle', () => {
    const p = tri(6, 3, 3)
    expect(retypeTriangle(p, 'a', 1)).toHaveProperty('problem')
    expect(retypeTriangle(tri(6, 3, 3, ['B', 'C']), 'A', 30)).toHaveProperty('problem')
  })
})

describe('extra lines', () => {
  it('cross the inside of the shape, not along or outside it', () => {
    const o = outline([rect(6, 4)])
    expect(crossesInside(o, [5, 10], [11, 6])).toBe(true)
    expect(crossesInside(o, [5, 10], [11, 10])).toBe(false)
    const l = outline(starter('l-shape'))
    // From the L's bottom right corner to the top of its upright crosses outside.
    expect(crossesInside(l, [8, 0], [3, -7])).toBe(false)
  })

  const corner = (piece: string, i: number): Point => ({ at: 'corner', piece, corner: i })
  const near = (p: Vec | null, q: Vec) => expect(p && [p[0], p[1]].map((v) => Number(v.toFixed(6)))).toEqual(q)

  it('end at corners and midpoints that follow the shape when it changes', () => {
    const [base, roof] = starter('house')
    const mid: Point = { at: 'mid', p: corner(base.id, 0), q: corner(base.id, 1) }
    near(pointAt(placeAll([base, roof]), corner(roof.id, 2)), [3, -7])
    const wider = change([base, roof], (d, pinned) => setBase(d, base.id, 10, pinned))
    if (!('pieces' in wider)) throw new Error(wider.problem)
    near(pointAt(placeAll(wider.pieces), mid), [5, 0])
  })

  it('keep a height square to its side as the triangle leans, and say when its foot leaves the side', () => {
    const t = { ...firstPiece('triangle', 6), id: 't', depth: 3, tip: 2 }
    const foot: Extract<Point, { at: 'foot' }> = { at: 'foot', from: corner('t', 2), p: corner('t', 0), q: corner('t', 1) }
    near(pointAt(placeAll([t]), foot), [2, 0])
    const leaning = placeAll([{ ...t, tip: 8 }])
    near(pointAt(leaning, foot), [8, 0])
    expect(footAlong(leaning, foot)).toBeGreaterThan(1)
  })

  it('offer a height’s foot from a corner, over the middle of the side it lands on', () => {
    const pieces = [{ ...firstPiece('triangle', 6), id: 't', depth: 3 }]
    const targets = lineTargets(outline(pieces), outline(pieces), [], corner('t', 2))
    const there = targets.filter((tg) => tg.at[0] === 3 && tg.at[1] === 0)
    expect(there.map((tg) => tg.kind)).toEqual(['foot'])
  })

  it('are dropped once an end is inside the shape, as when a piece goes on the side it ended at', () => {
    const line: ExtraLine = { id: 'l', a: corner('r', 0), b: { at: 'mid', p: corner('r', 2), q: corner('r', 3) }, style: 'dashed', label: 'none', text: '', ticks: 0, right: true }
    const onTop = { id: 'm', a: corner('r', 1), b: { at: 'cross', a: [line.a, line.b], b: [corner('r', 1), corner('r', 3)] }, style: 'dashed', label: 'none', text: '', ticks: 0, right: true } as ExtraLine
    expect(linesOnShape([rect(6, 4)], [line])).toHaveLength(1)
    // A line ending on the dropped line goes too.
    expect(linesOnShape([rect(6, 4), on('r', 2, 0, 6)], [line, onTop])).toEqual([])
  })

  it('can run from a semicircle’s center, inside the shape, to its curve, as its radius', () => {
    const arch = starter('arch')
    const semi = arch[1].id
    const o = outline(arch)
    const center = anchorPoints(o, o, []).find((a) => a.kind === 'center')!
    near(center.at, [3, -4])
    const tip = arcTarget(o, center.at, [3 + 3 * Math.cos(Math.PI / 4) + 0.05, -4 - 3 * Math.sin(Math.PI / 4)], 0.3, false)!
    expect(tip.point).toEqual({ at: 'arc', piece: semi, deg: 45 })
    const radius: ExtraLine = { id: 'r', a: center.point, b: tip.point, style: 'solid', label: 'none', text: '', ticks: 0, right: true }
    expect(linesOnShape(arch, [radius])).toHaveLength(1)
  })

  it('offer where two lines cross', () => {
    const pieces = [rect(6, 4, [0, 0])]
    const diag = (id: string, a: number, b: number): ExtraLine => ({ id, a: corner('r', a), b: corner('r', b), style: 'dashed', label: 'none', text: '', ticks: 0, right: true })
    const targets = lineTargets(outline(pieces), outline(pieces), [diag('d1', 0, 2), diag('d2', 1, 3)], corner('r', 0))
    // From a corner the crossing lies on the diagonal it's on, and still counts.
    expect(targets.some((tg) => tg.kind === 'cross')).toBe(true)
  })

  it('end anywhere on a curve, pulled onto a quarter of the way round when dropped near one', () => {
    const arch = starter('arch')
    const o = outline(arch)
    const center = anchorPoints(o, o, []).find((a) => a.kind === 'center')!
    const at = (deg: number): Vec => [3 - 3 * Math.cos((deg * Math.PI) / 180), -4 - 3 * Math.sin((deg * Math.PI) / 180)]
    const placed = placeAll(arch)
    const dropped = (g: Vec, free = false) => pointAt(placed, arcTarget(o, center.at, g, 0.3, free)!.point)
    near(dropped(at(31)), at(31).map((v) => Number(v.toFixed(6))) as Vec)
    near(dropped(at(44)), at(45).map((v) => Number(v.toFixed(6))) as Vec)
    near(dropped(at(44), true), at(44).map((v) => Number(v.toFixed(6))) as Vec)
  })

  it('count as a height only when one end is a foot dropped from the other, not when one just ends at another height’s foot', () => {
    const foot: Point = { at: 'foot', from: corner('r', 2), p: corner('r', 0), q: corner('r', 1) }
    const height: ExtraLine = { id: 'h', a: corner('r', 2), b: foot, style: 'dashed', label: 'none', text: '', ticks: 0, right: true }
    const toItsFoot: ExtraLine = { ...height, id: 'd', a: corner('r', 3) }
    expect(heightFoot(height)).toEqual([foot, corner('r', 2)])
    expect(heightFoot(toItsFoot)).toBeNull()
  })

  it('offer a height’s foot on another extra line, square to it', () => {
    const pieces = [rect(6, 4, [0, 0])]
    const diagonal: ExtraLine = { id: 'm', a: corner('r', 0), b: corner('r', 2), style: 'dashed', label: 'none', text: '', ticks: 0, right: true }
    const o = outline(pieces)
    const [p, q, from] = [pointAt(o.placed, diagonal.a)!, pointAt(o.placed, diagonal.b)!, pointAt(o.placed, corner('r', 1))!]
    const feet = lineTargets(o, o, [diagonal], corner('r', 1)).filter((tg) => tg.kind === 'foot' && tg.name.includes('line'))
    expect(feet).toHaveLength(1)
    const d = [q[0] - p[0], q[1] - p[1]]
    const t = ((from[0] - p[0]) * d[0] + (from[1] - p[1]) * d[1]) / (d[0] ** 2 + d[1] ** 2)
    near(feet[0].at, [p[0] + d[0] * t, p[1] + d[1] * t].map((v) => Number(v.toFixed(6))) as Vec)
  })

  it('run on past the shape as rays, leaving where they last cross its outline', () => {
    const o = outline(starter('l-shape'))
    // From the L's inside corner straight down, through the base, out the bottom.
    expect(exitAlong(o, [3, -2], [0, 1])).toBeCloseTo(2, 5)
    // Straight out of a corner: it leaves at once.
    expect(exitAlong(o, [8, 0], [1, 0])).toBe(0)
  })

  it('keep which ends run on, and their end caps, when read back', () => {
    const pieces = [rect(6, 4, [0, 0])]
    const line = { id: 'l', a: corner('r', 0), b: corner('r', 2), style: 'dashed', label: 'none', text: '', ticks: 0, right: true, ray: { a: 'line', b: 'bogus' } }
    const back = tidyComposite({ pieces, lines: [line] })
    expect(back.lines[0].ray).toEqual({ a: 'line', b: null })
  })

  it('can be hidden or drawn thin or thick, and keep it when read back', () => {
    const pieces = [rect(6, 4, [0, 0])]
    const line = { id: 'l', a: corner('r', 0), b: corner('r', 2), style: 'hidden', weight: 'thick', label: 'none', text: '', ticks: 0, right: true }
    const back = tidyComposite({ pieces, lines: [line, { ...line, id: 'm', style: 'wavy', weight: 'huge' }] })
    expect(back.lines.map((l) => [l.style, l.weight])).toEqual([['hidden', 'thick'], ['dashed', 'regular']])
  })

  it('as can the shape’s own sides and curves', () => {
    const back = tidyComposite({ pieces: [rect(6, 4)], sides: { 'r:0#0': { style: 'dotted', weight: 'thin' }, 'r:1#0': {} } })
    expect([back.sides['r:0#0'].style, back.sides['r:0#0'].weight, back.sides['r:1#0'].style]).toEqual(['dotted', 'thin', 'solid'])
  })
})

describe('reading back', () => {
  it('drops trapezoids, which there no longer are, and what sat on them', () => {
    const [house] = starter('house')
    const old = { pieces: [house, { id: 't', kind: 'trapezoid', mount: { parent: house.id, side: 1, from: 0, to: 4 }, depth: 2 }, { ...on('t', 2, 0, 1), id: 'u' }] }
    expect(tidyComposite(old).pieces.map((p) => p.id)).toEqual([house.id])
  })

  it('keeps a good drawing and drops a broken one', () => {
    const c = { ...emptyComposite(), pieces: starter('house') }
    expect(tidyComposite(JSON.parse(JSON.stringify(c))).pieces).toHaveLength(2)
    expect(tidyComposite({ pieces: [{ id: 'x', kind: 'blob' }] }).pieces).toEqual([])
    expect(tidyComposite('nonsense')).toEqual(emptyComposite())
  })

  it('turns old lines’ ends fixed on a piece into its corners where they sit on one', () => {
    const [base, roof] = starter('house')
    const old = { pieces: [base, roof], lines: [{ id: 'l', a: { piece: roof.id, s: 0, t: 0 }, b: { piece: roof.id, s: 6, t: 0 }, style: 'dashed' }, { id: 'm', a: { piece: base.id, s: 2, t: 0 }, b: { piece: roof.id, s: 3, t: 3 } }] }
    const lines = tidyComposite(old).lines
    expect(lines[0].a).toEqual({ at: 'corner', piece: roof.id, corner: 0 })
    expect(lines[0].b).toEqual({ at: 'corner', piece: roof.id, corner: 1 })
    expect(lines[1].a).toEqual({ at: 'spot', piece: base.id, s: 2, t: 0 })
  })
})

describe('several pieces at once', () => {
  // A base with two blocks side by side on it, their tops level: the blocks sit on the base's top, which runs right to left.
  const twoBlocks = () => [rect(8, 3, [0, 0]), on('r', 2, 0, 4, 'rectangle', 2, 'right'), on('r', 2, 4, 8, 'rectangle', 2, 'left')]

  it('merges rectangles that make one rectangle, keeping what sat on them where it was', () => {
    const pieces = [...twoBlocks(), { ...on('left', 2, 0, 4, 'triangle', 2, 'roof') }]
    const c = { ...emptyComposite(), pieces }
    const roofBefore = placeAll(pieces).get('roof')!.corners
    const r = mergePieces(c, ['left', 'right'])
    if ('problem' in r) throw new Error(r.problem)
    const merged = r.comp.pieces.find((p) => p.id === r.id)!
    expect([baseOf(merged), merged.depth]).toEqual([8, 2])
    expect(placeAll(r.comp.pieces).get('roof')!.corners).toEqual(roofBefore)
    expect(r.comp.pieces.find((p) => p.id === 'roof')!.mount?.parent).toBe(r.id)
  })

  it('won’t merge rectangles that don’t make one rectangle', () => {
    const pieces = [rect(8, 3, [0, 0]), on('r', 2, 0, 4, 'rectangle', 2, 'right'), on('r', 2, 4, 8, 'rectangle', 3, 'left')]
    expect(mergePieces({ ...emptyComposite(), pieces }, ['left', 'right'])).toHaveProperty('problem')
  })

  it('moves lined-up sides together, and the side of any piece along the same line', () => {
    const pieces = twoBlocks()
    const o = outline(pieces)
    // The blocks' tops line up at y = -5; their bottoms at y = -3, along the base's top.
    const tops = linedUpSides(o, ['left', 'right']).find((l) => Math.abs(l.p[1] + 5) < 1e-9)!
    const bottoms = linedUpSides(o, ['left', 'right']).find((l) => Math.abs(l.p[1] + 3) < 1e-9)!
    expect(bottoms.sides.map((x) => x.piece).sort()).toEqual(['left', 'r', 'right'])
    const up = change(pieces, (d, pinned) => moveLinedUp(d, tops, [0, -6], pinned))
    if (!('pieces' in up)) throw new Error(up.problem)
    expect(up.pieces.filter((p) => p.id !== 'r').map((p) => p.depth)).toEqual([3, 3])
    // Moving the bottoms up: the base gets taller, the blocks shorter, their tops staying put.
    const down = change(pieces, (d, pinned) => moveLinedUp(d, bottoms, [0, -4], pinned))
    if (!('pieces' in down)) throw new Error(down.problem)
    expect(down.pieces.map((p) => p.depth)).toEqual([4, 1, 1])
  })

  it('adds a piece across lined-up sides, sitting on all of them, and stretches it with them', () => {
    const pieces = twoBlocks()
    const edge = acrossEdge(outline(pieces), ['left', 'right'])!
    expect(edge.to - edge.from).toBe(8)
    const roof = pieceAcross(pieces, edge, 'triangle')
    if (!('piece' in roof)) throw new Error(roof.problem)
    const all = [...pieces, roof.piece]
    // Widening the right block (its right side is side 3, at its base's start): the roof stretches across both.
    const wider = change(all, (d, pinned) => {
      const b = d.find((p) => p.id === 'right')!
      b.mount = { ...b.mount!, from: -1 }
      b.width = 5
      pinned.add('right')
    })
    if (!('pieces' in wider)) throw new Error(wider.problem)
    expect(baseOf(wider.pieces.find((p) => p.id === roof.piece.id)!)).toBe(9)
  })
})

describe('turning the figure', () => {
  it('turns every piece together about the middle, keeping their sides and corners', () => {
    const house = starter('house')
    const turned = turnedPieces(house, 90)
    const [o, t] = [outline(house), outline(turned)]
    expect(lengths(t.loops[0])).toEqual(lengths(o.loops[0]).map((v) => (typeof v === 'number' ? expect.closeTo(v, 9) : v)))
    expect(t.corners.map((c) => c.key)).toEqual(o.corners.map((c) => c.key))
    // The roof's peak, up from the house, now points left (counterclockwise).
    const peak = (pieces: typeof house) => pointAt(placeAll(pieces), { at: 'corner', piece: house[1].id, corner: 2 })!
    const mid = (pieces: typeof house) => placeAll(pieces).get(house[0].id)!.corners.reduce((a, c) => [a[0] + c[0] / 4, a[1] + c[1] / 4], [0, 0])
    expect(peak(turned)[0]).toBeLessThan(mid(turned)[0] - 1)
  })

  it('is read back within a half turn either way', () => {
    expect(tidyComposite({ pieces: [rect(6, 4)], turn: 400 }).turn).toBe(180)
    expect(tidyComposite({ pieces: [rect(6, 4)], turn: -30.4 }).turn).toBe(-30)
  })
})
