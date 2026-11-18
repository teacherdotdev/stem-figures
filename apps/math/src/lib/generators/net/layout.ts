// Lays out a 3D shape's net for Net.svelte to draw: its faces, the fold lines
// between them (dashed, unless the teacher wants them solid) and the cut
// edges round the outside, glue tabs for cutting it out, lines its measures
// sit on (a triangle's height, an apothem, a slant height, a radius), and
// its labels.
//
// A net is built in two steps. unfold() lays the faces out flat in the
// shape's own units, y down: a prism's sides in a row with its two bases on
// one of them, a pyramid's base with a triangle on each edge, a cylinder's
// rectangle with a circle on each long side, a cone's sector with its base
// circle at the middle of its arc, a cube's six squares in one of its 11
// nets. Each corner of a flat face is named after the corner of the 3D shape
// it folds up to, so an edge two faces share on the net is a fold, and two
// cut edges with the same corners are glued together when it's folded.
// buildNet() then scales the net to fit, adds the tabs and places the labels.

import { LABEL_SCALE } from '$shared/labelSize'
import { layoutMath, type MathBox } from '$lib/shared/mathSvg.js'
import { labelPlacer } from '$lib/shapes/placeLabels.js'
import { add, cross, dot, len, mul, perp, r1, reach, sub, unit, type Vec } from '$lib/shapes/vec.js'
import { buildShape, type ShapeLayout } from '../3d-shape/layout.js'
import { PARTS as SHAPE_PARTS, settingsFor } from '../3d-shape/settings.js'
import { radiusOf, readShape } from '../3d-shape/solve.js'
import { CUBE_NETS, cornersOf, foldCube } from './cubes.js'
import type { Part, Settings } from './settings.js'
import type { NetRead } from './solve.js'

export type { Vec } from '$lib/shapes/vec.js'

const BASE_FS = 20 // label font size, at medium labels
const FIT_W = 480
const FIT_H = 360
const PAD = 12
const SQUARE = 11 // right-angle square
const SOLID_GAP = 40 // between the net and the 3D shape beside it
const EPS = 1e-6

/** A flat face of the net, in the shape's units. */
export type Face =
  | { kind: 'poly'; pts: Vec[]; ids: string[] }
  | { kind: 'circle'; c: Vec; r: number }
  | { kind: 'sector'; apex: Vec; r: number; from: number; to: number }

/** A straight edge of a face: a fold when another face shares it on the net, a cut otherwise. */
export type NetEdge = { a: Vec; b: Vec; key: string; face: number; fold: boolean; tab: boolean }

/** A line a measure sits on, inside a face. */
type Inner = { part: Part; a: Vec; b: Vec; face: number; square: boolean; dot: boolean; dashed: boolean }

/** A net laid flat in the shape's own units: its faces, their straight edges, and the 3D edge each measure is. */
export type Unfolded = {
  faces: Face[]
  edges: NetEdge[]
  /** The measure along each 3D edge, by its key (two corner names, sorted). */
  edgeParts: Map<string, Part>
  inner: Inner[]
  /** A right triangle base's right angle, on each base: [corner, along one leg, along the other]. */
  rightAngles: [Vec, Vec, Vec][]
}

const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
const near = (p: Vec, q: Vec) => Math.abs(p[0] - q[0]) < EPS && Math.abs(p[1] - q[1]) < EPS
const mid = (p: Vec, q: Vec) => mul(add(p, q), 0.5)
const centroid = (pts: Vec[]): Vec => mul(pts.reduce((t, p) => add(t, p), [0, 0] as Vec), 1 / pts.length)

/** A face's area, in square units. */
export function areaOf(f: Face): number {
  if (f.kind === 'circle') return Math.PI * f.r * f.r
  if (f.kind === 'sector') return (f.r * f.r * (f.to - f.from)) / 2
  return Math.abs(f.pts.reduce((t, p, i) => t + cross(p, f.pts[(i + 1) % f.pts.length]), 0)) / 2
}

/** Where a face's name or area is written. */
export function middleOf(f: Face): Vec {
  if (f.kind === 'circle') return f.c
  if (f.kind === 'sector') {
    const m = (f.from + f.to) / 2
    return add(f.apex, mul([Math.cos(m), Math.sin(m)], f.r * 0.62))
  }
  return centroid(f.pts)
}

/** A base as a flat polygon, counterclockwise from its front left corner with y up, its front edge first. */
function basePolygon(read: NetRead, v: Record<Part, number>): Vec[] {
  const { base, sides } = read.form
  if (base === 'rectangle') return [[0, 0], [v.length, 0], [v.length, v.width], [0, v.width]]
  if (base === 'right') return [[0, 0], [v.triBase, 0], [0, v.triHeight]]
  if (base === 'isosceles') return [[0, 0], [v.triBase, 0], [v.triBase / 2, v.triHeight]]
  const R = v.side / (2 * Math.sin(Math.PI / sides))
  return Array.from({ length: sides }, (_, i) => {
    const a = -Math.PI / 2 - Math.PI / sides + (i * 2 * Math.PI) / sides
    return [R * Math.cos(a), R * Math.sin(a)] as Vec
  })
}

/** Which measure each side of a base is, in order from its front edge. */
function baseParts(read: NetRead): Part[] {
  const { base, sides } = read.form
  if (base === 'rectangle') return ['length', 'width', 'length', 'width']
  if (base === 'right') return ['triBase', 'hyp', 'triHeight']
  if (base === 'isosceles') return ['triBase', 'hyp', 'hyp']
  return Array.from({ length: sides }, () => 'side' as Part)
}

/**
 * A polygon moved so its corners j and j + 1 land on a and b, with the rest
 * of it on the side of the line through them that `side` points to.
 */
function placeOn(poly: Vec[], j: number, a: Vec, b: Vec, side: Vec): Vec[] {
  const p = poly[j]
  const q = poly[(j + 1) % poly.length]
  const turn = Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.atan2(q[1] - p[1], q[0] - p[0])
  const [c, s] = [Math.cos(turn), Math.sin(turn)]
  let out = poly.map((x): Vec => {
    const d = sub(x, p)
    return add(a, [d[0] * c - d[1] * s, d[0] * s + d[1] * c])
  })
  const t = unit(sub(b, a))
  if (dot(sub(centroid(out), a), side) - dot(sub(centroid(out), a), t) * dot(t, side) < 0) {
    // Flip it over the line.
    const n = perp(t)
    out = out.map((x) => sub(x, mul(n, 2 * dot(sub(x, a), n))))
  }
  return out
}

/** Lay the shape's net out flat, in its own units. */
export function unfold(s: Settings, read: NetRead & { values: Record<Part, number> }): Unfolded {
  const { form, values: v } = read
  const faces: Face[] = []
  const edgeParts = new Map<string, Part>()
  const inner: Inner[] = []
  const rightAngles: [Vec, Vec, Vec][] = []
  const straight: { a: Vec; b: Vec; key: string; face: number }[] = [] // straight edges of round faces

  if (form.shape === 'cube') {
    const e = v.side
    const cells = CUBE_NETS[s.cubeNet - 1]
    const named = foldCube(cells)!
    cells.forEach((cell, i) => faces.push({ kind: 'poly', pts: cornersOf(cell).map(([x, y]) => [x * e, y * e] as Vec), ids: named[i] }))
    for (const f of named) f.forEach((a, k) => edgeParts.set(edgeKey(a, f[(k + 1) % 4]), 'side'))
  } else if (form.shape === 'prism') {
    const base = basePolygon(read, v)
    const n = base.length
    const parts = baseParts(read)
    const h = v.height
    const L = (j: number) => len(sub(base[(j + 1) % n], base[j]))
    // The sides in a row, the bases on the one at `m`, which is the base's front edge.
    const m = Math.floor((n - 1) / 2)
    const order = Array.from({ length: n }, (_, i) => (((i - m) % n) + n) % n)
    let x = 0
    let capAt: [Vec, Vec] = [[0, 0], [0, 0]]
    order.forEach((j, i) => {
      const k = (j + 1) % n
      faces.push({ kind: 'poly', pts: [[x, 0], [x + L(j), 0], [x + L(j), h], [x, h]], ids: [`t${j}`, `t${k}`, `b${k}`, `b${j}`] })
      if (i === m) capAt = [[x, 0], [x + L(j), 0]]
      x += L(j)
    })
    const [a, b] = capAt
    const top = placeOn(base, 0, a, b, [0, -1])
    const bottom = placeOn(base, 0, add(a, [0, h]), add(b, [0, h]), [0, 1])
    faces.push({ kind: 'poly', pts: top, ids: base.map((_, i) => `t${i}`) })
    faces.push({ kind: 'poly', pts: bottom, ids: base.map((_, i) => `b${i}`) })
    parts.forEach((p, j) => {
      const k = (j + 1) % n
      edgeParts.set(edgeKey(`t${j}`, `t${k}`), p)
      edgeParts.set(edgeKey(`b${j}`, `b${k}`), p)
      edgeParts.set(edgeKey(`t${j}`, `b${j}`), 'height')
    })
    const topFace = faces.length - 2
    if (form.base === 'isosceles') {
      // The triangle's height, up from the middle of its base on the top base.
      inner.push({ part: 'triHeight', a: mid(top[0], top[1]), b: top[2], face: topFace, square: true, dot: false, dashed: true })
    }
    if (form.base === 'right') {
      rightAngles.push([top[0], top[1], top[2]], [bottom[0], bottom[1], bottom[2]])
    }
    if (form.base === 'regular') {
      // The apothem, from the middle of the top base to its side furthest from the row.
      const c = centroid(top)
      let far = 0
      top.forEach((_, i) => {
        if (mid(top[i], top[(i + 1) % n])[1] < mid(top[far], top[(far + 1) % n])[1] - EPS) far = i
      })
      inner.push({ part: 'apothem', a: c, b: mid(top[far], top[(far + 1) % n]), face: topFace, square: true, dot: true, dashed: false })
    }
  } else if (form.shape === 'pyramid') {
    // The base with its front edge at the bottom, and a triangle out from each edge.
    const base = basePolygon(read, v).map(([x, y]): Vec => [x, -y])
    const n = base.length
    const parts = baseParts(read)
    const c = centroid(base)
    faces.push({ kind: 'poly', pts: base, ids: base.map((_, i) => `b${i}`) })
    base.forEach((p, j) => {
      const q = base[(j + 1) % n]
      const m = mid(p, q)
      let out = perp(unit(sub(q, p)))
      if (dot(out, sub(m, c)) < 0) out = mul(out, -1)
      const d = dot(sub(m, c), out) // from the middle of the base out to this edge
      const slant = Math.hypot(v.height, d)
      const tip = add(m, mul(out, slant))
      faces.push({ kind: 'poly', pts: [p, q, tip], ids: [`b${j}`, `b${(j + 1) % n}`, 'apex'] })
      edgeParts.set(edgeKey(`b${j}`, `b${(j + 1) % n}`), parts[j])
      if (j === 0 || (j === 1 && form.base === 'rectangle')) {
        inner.push({ part: j === 0 ? 'slant' : 'slantW', a: m, b: tip, face: faces.length - 1, square: true, dot: false, dashed: true })
      }
    })
  } else if (form.shape === 'cylinder') {
    const r = radiusOf(s, v.radius)
    const C = v.circ
    const h = v.height
    faces.push({ kind: 'poly', pts: [[0, 0], [C, 0], [C, h], [0, h]], ids: ['top', 'top', 'bottom', 'bottom'] })
    faces.push({ kind: 'circle', c: [C / 2, -r], r }, { kind: 'circle', c: [C / 2, h + r], r })
    edgeParts.set(edgeKey('top', 'bottom'), 'height')
    edgeParts.set(edgeKey('top', 'top'), 'circ')
    edgeParts.set(edgeKey('bottom', 'bottom'), 'circ')
    const o: Vec = [C / 2, -r]
    inner.push({ part: 'radius', a: s.diameter ? [o[0] - r, o[1]] : o, b: [o[0] + r, o[1]], face: 1, square: false, dot: !s.diameter, dashed: false })
  } else {
    const r = radiusOf(s, v.radius)
    const sl = v.slant
    const theta = (2 * Math.PI * r) / sl
    const [from, to] = [Math.PI / 2 - theta / 2, Math.PI / 2 + theta / 2]
    const apex: Vec = [0, 0]
    faces.push({ kind: 'sector', apex, r: sl, from, to })
    faces.push({ kind: 'circle', c: [0, sl + r], r })
    for (const t of [to, from]) straight.push({ a: apex, b: mul([Math.cos(t), Math.sin(t)], sl), key: edgeKey('apex', 'rim'), face: 0 })
    edgeParts.set(edgeKey('apex', 'rim'), 'slant')
    const o: Vec = [0, sl + r]
    inner.push({ part: 'radius', a: s.diameter ? [o[0] - r, o[1]] : o, b: [o[0] + r, o[1]], face: 1, square: false, dot: !s.diameter, dashed: false })
  }

  // Each straight edge, and whether it's a fold: shared, the same way round, by two faces on the net.
  const all = [...straight]
  faces.forEach((f, fi) => {
    if (f.kind !== 'poly') return
    f.pts.forEach((p, k) => all.push({ a: p, b: f.pts[(k + 1) % f.pts.length], key: edgeKey(f.ids[k], f.ids[(k + 1) % f.ids.length]), face: fi }))
  })
  const edges: NetEdge[] = all.map((e) => {
    const fold = all.some((o) => o !== e && o.key === e.key && o.face !== e.face && ((near(o.a, e.a) && near(o.b, e.b)) || (near(o.a, e.b) && near(o.b, e.a))))
    return { ...e, fold, tab: false }
  })
  return { faces, edges, edgeParts, inner, rightAngles }
}

// ---- Glue tabs ----

/** A convex polygon, for telling whether a tab would lie over a face. */
type Convex = Vec[]

/** A face as convex pieces: itself, a circle as a many-sided polygon, a sector as a fan. */
function piecesOf(f: Face): Convex[] {
  if (f.kind === 'poly') return [f.pts]
  if (f.kind === 'circle') return [Array.from({ length: 32 }, (_, i) => add(f.c, mul([Math.cos((i * Math.PI) / 16), Math.sin((i * Math.PI) / 16)], f.r)))]
  const steps = Math.max(2, Math.ceil(((f.to - f.from) / Math.PI) * 12))
  const rim = Array.from({ length: steps + 1 }, (_, i) => add(f.apex, mul([Math.cos(f.from + ((f.to - f.from) * i) / steps), Math.sin(f.from + ((f.to - f.from) * i) / steps)], f.r)))
  return rim.slice(1).map((p, i) => [f.apex, rim[i], p])
}

/** Whether two convex polygons overlap by more than a sliver (touching doesn't count). */
function overlaps(A: Convex, B: Convex, slack: number): boolean {
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const axis = unit(perp(sub(poly[(i + 1) % poly.length], poly[i])))
      const pa = A.map((p) => dot(p, axis))
      const pb = B.map((p) => dot(p, axis))
      if (Math.max(...pa) <= Math.min(...pb) + slack || Math.max(...pb) <= Math.min(...pa) + slack) return false
    }
  }
  return true
}

/**
 * Tabs for gluing: one on one edge of each pair of cut edges that meet when
 * the net is folded, on whichever edge has room, and teeth round each circle.
 * Each tab is a trapezoid out from its edge, `depth` deep.
 */
export function tabsFor(net: Unfolded, depth: number): Vec[][] {
  const tabs: Vec[][] = []
  const blocks = net.faces.flatMap(piecesOf)
  const slack = depth * 0.02
  const clear = (tab: Vec[]) => !blocks.some((b) => overlaps(tab, b, slack)) && !tabs.some((t) => overlaps(tab, t, slack))
  const faceMiddle = (fi: number) => middleOf(net.faces[fi])
  const tabOn = (e: NetEdge): Vec[] => {
    const t = sub(e.b, e.a)
    const l = len(t)
    let n = unit(perp(t))
    if (dot(n, sub(mid(e.a, e.b), faceMiddle(e.face))) < 0) n = mul(n, -1)
    const d = Math.min(depth, 0.4 * l)
    const inset = Math.min(d, 0.3 * l)
    const u = unit(t)
    return [e.a, add(add(e.a, mul(n, d)), mul(u, inset)), add(sub(e.b, mul(u, inset)), mul(n, d)), e.b]
  }
  const done = new Set<string>()
  for (const e of net.edges) {
    if (e.fold || done.has(e.key)) continue
    const pair = net.edges.filter((o) => !o.fold && o.key === e.key)
    if (pair.length !== 2) continue
    done.add(e.key)
    for (const choice of pair) {
      const tab = tabOn(choice)
      if (clear(tab)) {
        choice.tab = true
        tabs.push(tab)
        break
      }
    }
  }
  // Teeth round each circle, glued to the edge it folds onto.
  for (const f of net.faces) {
    if (f.kind !== 'circle') continue
    const count = 12
    const step = (2 * Math.PI) / count
    for (let i = 0; i < count; i++) {
      const [a0, a1] = [i * step + step * 0.12, (i + 1) * step - step * 0.12]
      const at = (a: number, r: number) => add(f.c, mul([Math.cos(a), Math.sin(a)], r))
      const d = Math.min(depth, f.r * 0.45)
      const tooth = [at(a0, f.r), at(a0 + step * 0.15, f.r + d), at(a1 - step * 0.15, f.r + d), at(a1, f.r)]
      // Its chord dips into its own circle, so only the part outside is checked against the faces.
      const outside = [at(a0, f.r * 1.02), tooth[1], tooth[2], at(a1, f.r * 1.02)]
      if (!blocks.some((b) => overlaps(outside, b, slack)) && !tabs.some((t) => overlaps(outside, t, slack))) tabs.push(tooth)
    }
  }
  return tabs
}

// ---- The figure ----

/** Tints for faces that match, light enough to write on and print. */
export const TINTS = ['#dbeafe', '#fef3c7', '#dcfce7', '#fce7f3', '#ede9fe', '#ffedd5']

/** A net laid out for Net.svelte to draw. */
export type NetLayout = ReturnType<typeof buildNet>

/** A face's name when it's written: A, B, C …, in reading order. */
const letter = (i: number) => String.fromCharCode(65 + (i % 26))

/**
 * @param s    clean settings
 * @param read what the settings mean, with measures that make a shape
 */
export function buildNet(s: Settings, read: NetRead & { values: Record<Part, number> }) {
  const FS = BASE_FS * LABEL_SCALE[s.labelSize]
  const { form, values: v, given } = read
  const net = unfold(s, read)

  // Faces that match (the same shape and size) are tinted alike.
  const signature = (f: Face) =>
    f.kind === 'circle' ? `c${f.r.toFixed(4)}`
    : f.kind === 'sector' ? 's'
    : f.pts.map((p, i) => len(sub(f.pts[(i + 1) % f.pts.length], p)).toFixed(4)).sort().join(',') + `:${areaOf(f).toFixed(4)}`
  const groups = [...new Set(net.faces.map(signature))]

  // Tabs reach out about a quarter of a typical face's width.
  const typical = Math.sqrt(net.faces.reduce((t, f) => t + areaOf(f), 0) / net.faces.length)
  const tabs = s.tabs ? tabsFor(net, typical * 0.22) : []

  // ---- Scaled to fit ----
  const raw: Vec[] = []
  for (const f of net.faces) {
    if (f.kind === 'poly') raw.push(...f.pts)
    else if (f.kind === 'circle') raw.push(sub(f.c, [f.r, f.r]), add(f.c, [f.r, f.r]))
    else raw.push(...piecesOf(f).flat())
  }
  raw.push(...tabs.flat())
  const xs = raw.map((p) => p[0])
  const ys = raw.map((p) => p[1])
  const scale = Math.min(FIT_W / (Math.max(...xs) - Math.min(...xs) || 1), FIT_H / (Math.max(...ys) - Math.min(...ys) || 1))
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)]
  const at = (p: Vec): Vec => [(p[0] - x0) * scale, (p[1] - y0) * scale]

  // ---- Faces and lines, in figure units ----
  const order = net.faces.map((f, i) => i).sort((i, j) => {
    const [a, b] = [middleOf(net.faces[i]), middleOf(net.faces[j])]
    return Math.abs(a[1] - b[1]) > EPS ? a[1] - b[1] : a[0] - b[0]
  })
  const nameOf = new Map(order.map((fi, k) => [fi, letter(k)]))
  const faces = net.faces.map((f, i) => {
    const fill = s.shade ? TINTS[groups.indexOf(signature(f)) % TINTS.length] : '#fff'
    if (f.kind === 'poly') return { kind: 'poly' as const, d: `M${f.pts.map((p) => at(p).map(r1).join(',')).join(' L')} Z`, fill, name: nameOf.get(i)! }
    if (f.kind === 'circle') {
      const c = at(f.c)
      return { kind: 'circle' as const, d: `M${r1(c[0] - f.r * scale)},${r1(c[1])} a${r1(f.r * scale)},${r1(f.r * scale)} 0 1 0 ${r1(2 * f.r * scale)},0 a${r1(f.r * scale)},${r1(f.r * scale)} 0 1 0 ${r1(-2 * f.r * scale)},0 Z`, fill, name: nameOf.get(i)! }
    }
    const a = at(f.apex)
    const [p, q] = [at(add(f.apex, mul([Math.cos(f.from), Math.sin(f.from)], f.r))), at(add(f.apex, mul([Math.cos(f.to), Math.sin(f.to)], f.r)))]
    const R = r1(f.r * scale)
    return { kind: 'sector' as const, d: `M${r1(a[0])},${r1(a[1])} L${r1(p[0])},${r1(p[1])} A${R},${R} 0 ${f.to - f.from > Math.PI ? 1 : 0} 1 ${r1(q[0])},${r1(q[1])} Z`, fill, name: nameOf.get(i)! }
  })
  // Each fold drawn once; cut edges are the faces' outlines.
  const folds: { a: Vec; b: Vec }[] = []
  const seen = new Set<string>()
  for (const e of net.edges) {
    if (!(e.fold || e.tab)) continue
    const id = [at(e.a), at(e.b)].map((p) => p.map(r1).join(',')).sort().join(' ')
    if (seen.has(id)) continue
    seen.add(id)
    folds.push({ a: at(e.a), b: at(e.b) })
  }
  const cuts = net.edges.filter((e) => !e.fold && !e.tab).map((e) => ({ a: at(e.a), b: at(e.b) }))
  // Curved outlines: whole circles and a sector's arc.
  const curves = net.faces.flatMap((f) => {
    if (f.kind === 'circle') return [faces[net.faces.indexOf(f)].d]
    if (f.kind !== 'sector') return []
    const [p, q] = [at(add(f.apex, mul([Math.cos(f.from), Math.sin(f.from)], f.r))), at(add(f.apex, mul([Math.cos(f.to), Math.sin(f.to)], f.r)))]
    const R = r1(f.r * scale)
    return [`M${r1(p[0])},${r1(p[1])} A${R},${R} 0 ${f.to - f.from > Math.PI ? 1 : 0} 1 ${r1(q[0])},${r1(q[1])}`]
  })
  const tabShapes = tabs.map((t) => t.map(at))

  const extras: { a: Vec; b: Vec; dashed: boolean }[] = []
  const squares: Vec[][] = []
  const dots: Vec[] = []
  const arcs: string[] = []
  const square = (foot: Vec, toward1: Vec, toward2: Vec) => {
    if (!s.square) return
    const [u1, u2] = [unit(sub(toward1, foot)), unit(sub(toward2, foot))]
    const q = Math.min(SQUARE, 0.35 * len(sub(toward1, foot)), 0.35 * len(sub(toward2, foot)))
    squares.push([add(foot, mul(u1, q)), add(foot, add(mul(u1, q), mul(u2, q))), add(foot, mul(u2, q))])
  }
  for (const [c, p, q] of net.rightAngles) square(at(c), at(p), at(q))

  // ---- Labels ----
  const { labels, place } = labelPlacer(s.moved)
  const rounded = (x: number) => String(Number(x.toFixed(s.round)))
  const unitText = s.unit.trim() ? ` ${s.unit.trim()}` : ''
  /** What's written at a part, as math, or null for nothing. */
  function content(k: Part): MathBox | null {
    if (!form.parts.includes(k)) return null
    let mode = s[`${k}Label`]
    if (mode === 'auto') mode = given[k] != null ? 'measure' : 'none'
    if (mode === 'text') return layoutMath(s[`${k}Text`], FS)
    if (mode !== 'measure') return null
    if (k === 'angle') return layoutMath(rounded(v.angle), FS, { suffix: '°' })
    const text = given[k] != null ? (s[k as keyof Settings] as string) : rounded(v[k])
    return layoutMath(text, FS, { suffix: unitText })
  }
  const faceMid = (fi: number) => at(middleOf(net.faces[fi]))
  /** Which side of its line an inner measure's label goes: right of an upright line, above any other. */
  const innerSide = (line: Inner): Vec => (line.part !== 'radius' && Math.abs(unit(sub(line.b, line.a))[1]) > 0.5 ? [1, 0] : [0, -1])
  /** A label beside the line from a to b, on the side `toward` points to. */
  function labelBeside(k: string, box: MathBox | null, a: Vec, b: Vec, toward: Vec, along = 0.5) {
    if (!box) return
    const t = unit(sub(b, a))
    const m = add(a, mul(sub(b, a), along))
    let n = perp(t)
    if (dot(n, toward) < 0) n = mul(n, -1)
    place(k, box, add(m, mul(n, 6 + reach(box, n))), t, n, 0.4 * len(sub(b, a)))
  }

  // Names and areas in the faces.
  if (s.faceText !== 'none') {
    const areaUnit = s.unit.trim() === 'units' ? ' square units' : s.unit.trim() ? ` ${s.unit.trim()}²` : ''
    order.forEach((fi) => {
      const f = net.faces[fi]
      const name = nameOf.get(fi)!
      const parts: MathBox[] = []
      const nameBox = s.faceText === 'names' || s.faceText === 'both' ? layoutMath(name, FS, { upright: true }) : null
      const areaBox = s.faceText === 'areas' || s.faceText === 'both' ? layoutMath(rounded(areaOf(f)), FS * 0.9, { suffix: areaUnit }) : null
      if (nameBox) parts.push(nameBox)
      if (areaBox) parts.push(areaBox)
      // Clear of a line drawn in the face (a slant height), on the side away from its label.
      let m = faceMid(fi)
      const line = net.inner.find((l) => l.face === fi && content(l.part))
      if (line && parts.length) {
        const [a, b] = [at(line.a), at(line.b)]
        let away = perp(unit(sub(b, a)))
        if (dot(away, innerSide(line)) > 0) away = mul(away, -1)
        const w = Math.max(...parts.map((p) => p.w))
        const h = parts.reduce((t, p) => t + p.asc + p.desc + 4, -4)
        const need = reach({ w, asc: h / 2, desc: h / 2, items: [] }, away) + 8 - dot(sub(m, a), away)
        if (need > 0) m = add(m, mul(away, need))
      }
      const total = parts.reduce((t, p) => t + p.asc + p.desc + 4, -4)
      let y = m[1] - total / 2
      parts.forEach((p, i) => {
        y += p.asc + p.desc
        const cy = y - (p.asc + p.desc) / 2
        place(`${i ? 'a' : 'f'}${name}`, p, [m[0], cy], [1, 0], [0, 1])
        y += 4
      })
    })
  }

  // Measures along edges: on the outside of a cut edge, toward the bottom or left
  // of the net where it can; inside a face along a fold.
  const used = new Set<NetEdge>()
  const outward = (e: NetEdge) => {
    let n = unit(perp(sub(e.b, e.a)))
    if (dot(n, sub(mid(e.a, e.b), middleOf(net.faces[e.face]))) < 0) n = mul(n, -1)
    return n
  }
  const score = (e: NetEdge) => {
    const n = outward(e)
    const m = mid(e.a, e.b)
    if (e.fold || e.tab) return -100 + m[1] * 1e-3
    // Down first, then left, up and right; then furthest that way.
    if (n[1] > 0.7) return 40 + m[1] * 1e-3
    if (n[0] < -0.7) return 30 - m[0] * 1e-3
    if (n[1] < -0.7) return 20 - m[1] * 1e-3
    return 10 + m[0] * 1e-3
  }
  const edgePart = (e: NetEdge) => net.edgeParts.get(e.key)
  const LABEL_ORDER: Part[] = ['length', 'width', 'triBase', 'triHeight', 'hyp', 'side', 'height', 'slant', 'circ']
  for (const k of LABEL_ORDER) {
    const box = content(k)
    if (!box || net.inner.some((i) => i.part === k)) continue
    const candidates = net.edges.filter((e) => edgePart(e) === k && !used.has(e))
    if (!candidates.length) continue
    const best = candidates.reduce((b, e) => (score(e) > score(b) + 1e-9 ? e : b))
    // Both copies of a fold, and the edge it's glued to, are the same edge: label it once.
    for (const e of net.edges) if (e.key === best.key) used.add(e)
    const [a, b] = [at(best.a), at(best.b)]
    // A cylinder's circumference goes toward the left end, clear of the circle at its middle.
    if (!best.fold && !best.tab) labelBeside(k, box, a, b, outward(best), k === 'circ' ? (a[0] < b[0] ? 0.2 : 0.8) : 0.5)
    else {
      // Inside the larger face along the fold.
      const sharing = net.edges.filter((e) => e.key === best.key && ((near(e.a, best.a) && near(e.b, best.b)) || (near(e.a, best.b) && near(e.b, best.a))))
      const face = sharing.map((e) => e.face).reduce((f, g) => (areaOf(net.faces[g]) > areaOf(net.faces[f]) + EPS ? g : f))
      labelBeside(k, box, a, b, sub(faceMid(face), mid(a, b)))
    }
  }

  // Measures on lines of their own inside a face.
  for (const line of net.inner) {
    const box = content(line.part)
    if (!box) continue
    const [a, b] = [at(line.a), at(line.b)]
    extras.push({ a, b, dashed: line.dashed })
    if (line.dot) dots.push(a)
    if (line.square) {
      // Square where the line meets its side, the side along the face's edge.
      const f = net.faces[line.face]
      if (f.kind === 'poly') {
        const foot = line.part === 'apothem' ? b : a
        const other = line.part === 'apothem' ? a : b
        const side = f.pts.map(at).find((p) => Math.abs(dot(unit(sub(p, foot)), unit(sub(other, foot)))) < 0.05 && len(sub(p, foot)) > 1)
        if (side) square(foot, other, side)
      }
    }
    // Beside the line, to the right of it unless that's off the face.
    // A slant height's face narrows to its tip, so its label sits nearer the base.
    labelBeside(line.part, box, a, b, innerSide(line), line.part === 'slant' || line.part === 'slantW' ? 0.32 : 0.5)
  }

  // A cone's sector angle, marked at its tip.
  if (form.shape === 'cone') {
    const box = content('angle')
    const f = net.faces[0]
    if (box && f.kind === 'sector') {
      const tip = at(f.apex)
      const R = Math.min(28, f.r * scale * 0.25)
      const [p, q] = [add(tip, mul([Math.cos(f.from), Math.sin(f.from)], R)), add(tip, mul([Math.cos(f.to), Math.sin(f.to)], R))]
      arcs.push(`M${r1(p[0])},${r1(p[1])} A${r1(R)},${r1(R)} 0 ${f.to - f.from > Math.PI ? 1 : 0} 1 ${r1(q[0])},${r1(q[1])}`)
      const dir: Vec = [0, 1]
      place('angle', box, add(tip, mul(dir, R + 6 + reach(box, dir))), [1, 0], [0, 1])
    }
  }

  // ---- The 3D shape beside it ----
  let solid: { edges: { a: Vec; b: Vec; hidden: boolean }[]; arcs: { d: string; hidden: boolean }[] } | null = null
  const netPoints: Vec[] = [...raw.map(at), ...extras.flatMap((e) => [e.a, e.b])]
  for (const l of labels) netPoints.push([l.cx - l.box.w / 2, l.y - l.box.asc], [l.cx + l.box.w / 2, l.y + l.box.desc])
  const box = {
    minX: Math.min(...netPoints.map((p) => p[0])),
    minY: Math.min(...netPoints.map((p) => p[1])),
    maxX: Math.max(...netPoints.map((p) => p[0])),
    maxY: Math.max(...netPoints.map((p) => p[1])),
  }
  if (s.showShape) {
    const figure = solidFigure(s, read)
    if (figure) {
      const f = figure.frame
      const netH = box.maxY - box.minY
      const k = Math.min((netH * 0.6) / f.h, (FIT_W * 0.45) / f.w, 1)
      const x = box.maxX + SOLID_GAP
      const y = box.minY + (netH - f.h * k) / 2
      const [dx, dy] = [x - f.x * k, y - f.y * k]
      const move = (p: Vec): Vec => [r1(p[0] * k + dx), r1(p[1] * k + dy)]
      solid = {
        edges: figure.edges.map((e) => ({ a: move(e.a), b: move(e.b), hidden: e.hidden })),
        arcs: figure.arcs.map((a) => ({ d: movePath(a.d, k, dx, dy), hidden: a.hidden })),
      }
      box.maxX = x + f.w * k
    }
  }

  const minX = box.minX - PAD
  const minY = box.minY - PAD
  return {
    frame: { x: r1(minX), y: r1(minY), w: r1(box.maxX + PAD - minX), h: r1(box.maxY + PAD - minY) },
    faces,
    folds,
    cuts,
    curves,
    tabs: tabShapes,
    extras,
    squares,
    dots,
    arcs,
    labels,
    solid,
    dashedFolds: s.fold === 'dashed',
  }
}

/** The 3D shape the net folds into, drawn by the 3D shape generators without labels. */
function solidFigure(s: Settings, read: NetRead & { values: Record<Part, number> }): ShapeLayout | null {
  const { form } = read
  const kind = form.shape === 'cube' ? 'prism' : form.shape
  const defs = settingsFor(kind)
  const settings = defs.cleanSettings({
    ...defs.DEFAULT_SETTINGS,
    ...Object.fromEntries(SHAPE_PARTS.map((k) => [`${k}Label`, 'none'])),
    base: form.shape === 'cube' ? 'rectangle' : form.base,
    sides: form.sides,
    length: form.shape === 'cube' ? s.side : s.length,
    width: form.shape === 'cube' ? s.side : s.width,
    height: form.shape === 'cube' ? s.side : s.height,
    triBase: s.triBase, triHeight: s.triHeight, side: s.side, radius: s.radius, slant: s.slant, diameter: s.diameter,
    oblique: false, pose: 'auto', showHeight: false, square: false, names: false, labelSize: s.labelSize,
  })
  const solved = readShape(settings)
  return solved.values ? buildShape(settings, { ...solved, values: solved.values }) : null
}

/** An SVG path of moves and arcs (as the 3D shapes draw their curves), scaled by k and moved. */
function movePath(d: string, k: number, dx: number, dy: number): string {
  return d.replace(/([MA])([^MA]*)/g, (_, cmd: string, args: string) => {
    const n = args.trim().split(/[\s,]+/).map(Number)
    if (cmd === 'M') return `M${r1(n[0] * k + dx)},${r1(n[1] * k + dy)} `
    return `A${r1(n[0] * k)},${r1(n[1] * k)} ${n[2]} ${n[3]} ${n[4]} ${r1(n[5] * k + dx)},${r1(n[6] * k + dy)} `
  }).trim()
}
