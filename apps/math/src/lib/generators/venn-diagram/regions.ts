// The geometry of a Venn diagram: where its circles go, and each region (the
// points inside exactly some of the sets) as an SVG path built from the
// circles' arcs, for shading it and clicking it. Also the room inside a
// region: how far a point is from its edge, and the stretches of a line
// across the figure that lie in it, for writing numbers and elements there.
//
// A region's edges are traced with the region on the same side every time
// (clockwise round its outside, counterclockwise round a hole such as a
// circle inside another), so a path fills right without an evenodd rule.

import type { Arrangement, SetCount } from './settings'

export type Vec = [number, number]
export type Circle = { x: number; y: number; r: number }
export type Box = { x: number; y: number; w: number; h: number }

/** One piece of a region's edge: part of a circle from one angle to another, clockwise or back, or a straight side of the box. */
export type Piece = { kind: 'arc'; c: Circle; from: number; to: number; cw: boolean } | { kind: 'line'; from: Vec; to: Vec }
/** A region: the sets it's inside (A is 1, B 2, C 4), its edges as closed loops, and those as an SVG path. */
export type Region = { mask: number; loops: Piece[][]; d: string }

const TAU = Math.PI * 2
const EPS = 1e-6

/**
 * The circles, centered on (0, 0), each of radius R except a subset's: two
 * overlapping by a little under half, two apart, B inside A and off to its
 * right, or three around a triangle with room in every region.
 */
export function circlesFor(sets: SetCount, arrangement: Arrangement, R: number): Circle[] {
  if (sets === 1) return [{ x: 0, y: 0, r: R }]
  if (sets === 3) {
    const s = 0.6 * R // from the middle to each center
    return [
      { x: -s * Math.cos(Math.PI / 6), y: -s / 2, r: R },
      { x: s * Math.cos(Math.PI / 6), y: -s / 2, r: R },
      { x: 0, y: s, r: R },
    ]
  }
  if (arrangement === 'subset') return [{ x: 0, y: 0, r: R }, { x: 0.32 * R, y: 0, r: 0.56 * R }]
  const half = arrangement === 'separate' ? R * 1.2 : R * 0.55
  return [{ x: -half, y: 0, r: R }, { x: half, y: 0, r: R }]
}

export const inside = (c: Circle, [x, y]: Vec) => Math.hypot(x - c.x, y - c.y) < c.r
/** The sets a point is inside, as a mask. */
export const maskAt = (circles: Circle[], p: Vec) => circles.reduce((m, c, i) => (inside(c, p) ? m | (1 << i) : m), 0)
/** How far a point is from the nearest circle: crossing any circle leaves the point's region. */
export const clearance = (circles: Circle[], [x, y]: Vec) => Math.min(...circles.map((c) => Math.abs(Math.hypot(x - c.x, y - c.y) - c.r)))

const at = (c: Circle, a: number): Vec => [c.x + c.r * Math.cos(a), c.y + c.r * Math.sin(a)]
const same = (p: Vec, q: Vec) => Math.abs(p[0] - q[0]) < 1e-6 * (1 + Math.abs(p[0])) && Math.abs(p[1] - q[1]) < 1e-6 * (1 + Math.abs(p[1]))

/** Where two circles cross, as angles round the first; none if they don't. */
function crossings(c: Circle, o: Circle): number[] {
  const d = Math.hypot(o.x - c.x, o.y - c.y)
  if (d < EPS || d >= c.r + o.r - EPS || d <= Math.abs(c.r - o.r) + EPS) return []
  const toward = Math.atan2(o.y - c.y, o.x - c.x)
  const spread = Math.acos((c.r * c.r + d * d - o.r * o.r) / (2 * c.r * d))
  return [toward - spread, toward + spread]
}

const startOf = (p: Piece): Vec => (p.kind === 'line' ? p.from : at(p.c, p.from))
const endOf = (p: Piece): Vec => (p.kind === 'line' ? p.to : at(p.c, p.to))
const sweepOf = (p: Piece & { kind: 'arc' }) => (p.cw ? p.to - p.from : p.from - p.to)

/** The box's edge, clockwise on the screen: the outside region's outer edge. */
function boxLoop(b: Box): Piece[] {
  const corners: Vec[] = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]]
  return corners.map((p, i) => ({ kind: 'line', from: p, to: corners[(i + 1) % 4] }))
}

/**
 * Every region the circles make inside the box, by mask. Each circle is cut
 * where the others cross it; each arc between two cuts is the edge between
 * the region just inside it and the one just outside, which differ only by
 * that circle. The arcs are then joined end to end into loops.
 */
export function buildRegions(circles: Circle[], box: Box): Map<number, Region> {
  const pieces = new Map<number, Piece[]>()
  const add = (mask: number, p: Piece) => (pieces.get(mask) ?? pieces.set(mask, []).get(mask)!).push(p)

  circles.forEach((c, i) => {
    const cuts = circles.flatMap((o, j) => (j === i ? [] : crossings(c, o))).map((a) => ((a % TAU) + TAU) % TAU).sort((a, b) => a - b)
    const arcs: [number, number][] = cuts.length ? cuts.map((a, k) => [a, k + 1 < cuts.length ? cuts[k + 1] : cuts[0] + TAU]) : [[0, TAU]]
    for (const [a0, a1] of arcs) {
      // The other circles the arc runs inside (it's on circle i itself).
      const mid = at(c, (a0 + a1) / 2)
      const mask = circles.reduce((m, o, j) => (j !== i && inside(o, mid) ? m | (1 << j) : m), 0)
      add(mask | (1 << i), { kind: 'arc', c, from: a0, to: a1, cw: true })
      add(mask, { kind: 'arc', c, from: a1, to: a0, cw: false })
    }
  })
  for (const p of boxLoop(box)) add(0, p)

  const regions = new Map<number, Region>()
  for (const [mask, list] of pieces) {
    const loops = chain(list)
    regions.set(mask, { mask, loops, d: loops.map(pathOf).join(' ') })
  }
  return regions
}

/** Pieces joined end to end into closed loops. */
function chain(list: Piece[]): Piece[][] {
  const left = [...list]
  const loops: Piece[][] = []
  while (left.length) {
    const loop = [left.shift()!]
    const start = startOf(loop[0])
    while (!same(endOf(loop.at(-1)!), start)) {
      const i = left.findIndex((p) => same(startOf(p), endOf(loop.at(-1)!)))
      if (i < 0) break
      loop.push(left.splice(i, 1)[0])
    }
    loops.push(loop)
  }
  return loops
}

const n = (v: number) => Number(v.toFixed(2))
const pt = ([x, y]: Vec) => `${n(x)} ${n(y)}`

/** A loop as SVG path commands: arcs as A commands (a whole circle as two halves), sides as L. */
function pathOf(loop: Piece[]): string {
  let d = `M${pt(startOf(loop[0]))}`
  for (const p of loop) {
    if (p.kind === 'line') {
      d += ` L${pt(p.to)}`
      continue
    }
    const sweep = sweepOf(p)
    const flag = p.cw ? 1 : 0
    const r = n(p.c.r)
    if (sweep > TAU - EPS) {
      const mid = at(p.c, p.from + (p.cw ? Math.PI : -Math.PI))
      d += ` A${r} ${r} 0 0 ${flag} ${pt(mid)} A${r} ${r} 0 0 ${flag} ${pt(endOf(p))}`
    } else d += ` A${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} ${flag} ${pt(endOf(p))}`
  }
  return `${d} Z`
}

/** A region's loops as polygons, each arc in steps of at most `step` radians. */
export function polygonsOf(region: Region, step = 0.05): Vec[][] {
  return region.loops.map((loop) =>
    loop.flatMap((p) => {
      if (p.kind === 'line') return [p.from]
      const sweep = sweepOf(p)
      const k = Math.max(2, Math.ceil(sweep / step))
      return Array.from({ length: k }, (_, i) => at(p.c, p.from + ((p.cw ? 1 : -1) * sweep * i) / k))
    }),
  )
}

/** Whether a region's path, filled with the nonzero rule as SVG does by default, covers a point. */
export function pathCovers(region: Region, [x, y]: Vec): boolean {
  let winding = 0
  for (const poly of polygonsOf(region)) {
    poly.forEach(([x0, y0], i) => {
      const [x1, y1] = poly[(i + 1) % poly.length]
      const cross = (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0)
      if (y0 <= y && y1 > y && cross > 0) winding++
      else if (y1 <= y && y0 > y && cross < 0) winding--
    })
  }
  return winding !== 0
}

/** The stretches of the line at height y, between x0 and x1, whose points are in the region `mask`. */
function spansAt(circles: Circle[], mask: number, y: number, x0: number, x1: number): [number, number][] {
  const cuts = [x0, x1]
  for (const c of circles) {
    const dy = y - c.y
    if (Math.abs(dy) >= c.r) continue
    const dx = Math.sqrt(c.r * c.r - dy * dy)
    for (const x of [c.x - dx, c.x + dx]) if (x > x0 && x < x1) cuts.push(x)
  }
  cuts.sort((a, b) => a - b)
  const spans: [number, number][] = []
  for (let i = 0; i + 1 < cuts.length; i++) {
    const [a, b] = [cuts[i], cuts[i + 1]]
    if (b - a < EPS || maskAt(circles, [(a + b) / 2, y]) !== mask) continue
    const last = spans.at(-1)
    if (last && Math.abs(last[1] - a) < EPS) last[1] = b
    else spans.push([a, b])
  }
  return spans
}

/** Where two lists of stretches overlap. */
function overlap(a: [number, number][], b: [number, number][]): [number, number][] {
  const out: [number, number][] = []
  for (const [a0, a1] of a) for (const [b0, b1] of b) if (Math.min(a1, b1) > Math.max(a0, b0)) out.push([Math.max(a0, b0), Math.min(a1, b1)])
  return out.sort((p, q) => p[0] - q[0])
}

/**
 * The stretches across the figure where a box from y0 to y1 tall lies wholly
 * in the region `mask` and inside `frame`. A circle's edge is widest from a
 * point at its center's height, so that height is checked too whenever it's
 * between y0 and y1; the box's top and bottom cover the rest.
 */
export function freeSpans(circles: Circle[], mask: number, frame: Box, y0: number, y1: number): [number, number][] {
  if (y0 < frame.y || y1 > frame.y + frame.h) return []
  const heights = [y0, y1, (y0 + y1) / 2, ...circles.map((c) => c.y).filter((y) => y > y0 && y < y1)]
  return heights.reduce(
    (acc, y) => overlap(acc, spansAt(circles, mask, y, frame.x, frame.x + frame.w)),
    [[frame.x, frame.x + frame.w]] as [number, number][],
  )
}
