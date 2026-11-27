// Draws a composite 3D shape: which lines show, which are hidden (dashed),
// which are seams, where labels go, and what can be clicked.
//
// Every line a piece could be drawn with (its edges, circles and outlines,
// see solid.ts) is cut into short bits, and each bit is tested on the whole
// shape, so pieces joined together and holes need no special cases:
//   - Is it on the surface at all? Points just around it, square to the line,
//     are tested for being inside the shape. All in or all out: it's buried
//     or in thin air (a box's edge under a piece sitting on it), so it isn't
//     drawn.
//   - Does the surface bend there? If the inside covers exactly half the
//     points around it, the surface is flat across it: a seam where two flush
//     pieces meet, drawn only when seams are on. Round pieces' circles are
//     drawn anyway where two kinds of piece meet, as textbooks draw a silo's.
//   - Does it show? The line of sight from it toward the viewer is followed
//     through every piece (a convex solid, so it's one stretch each), less
//     the holes' stretches. If any of it is left, something is in front.
// The view is a parallel projection (see viewOf): the 3D shape generators'
// oblique one by default, or a corner view.

import { LABEL_SCALE, type LabelSize } from '$shared/labelSize'
import { layoutMath, type MathBox } from '$lib/shared/mathSvg.js'
import type { PlacedLabel } from '$lib/shapes/layout.js'
import { add, dot, len, mul, perp, reach, sub, unit, type Vec } from '$lib/shapes/vec.js'
import {
  applyRot, cubesPossible, faceAxes, placeAll, QUARTER, ROTATIONS, viewAngle, type Dir, type Figure, type LineKind, type Overall, type Placed, type V3,
} from './model.js'
import {
  add3, centerOf, cross3, dot3, featuresOf, inside, len3, mul3, ROUND, solidOf, span, sub3, triangleOf, toSpace, unit3,
  type Feature, type Solid,
} from './solid.js'

export type { Vec } from '$lib/shapes/vec.js'

const FIT_W = 420
const FIT_H = 300
const PAD = 12
const BASE_FS = 20
const DEPTH = 0.5
const PROBES = 16

/** How a bit of line is drawn. */
export type Look = 'line' | 'hidden' | 'seam' | 'grid'
/** A stretch of one line drawn one way. `key` names the line it's on (its piece, kind and which), for leaving hidden ones out. */
export type Run = { look: Look; pts: Vec[]; key?: string }
/** Something that can carry a label: an edge (or several in a line, read as one) or a piece's height, radius or slant line. */
/** `length`: it measures a length, so it can be set on a dimension line. `dimension`: it's only ever drawn on one (an overall measure). */
export type Labelable = {
  key: string; a: Vec; b: Vec; measure: number; hidden: boolean; name: string; outer: boolean; length: boolean; dimension?: boolean
  /** Edges as long as it and alongside it (a cylinder's sides, for its height): a dimension line is drawn off the one on its side rather than off it. */
  alongside?: [Vec, Vec][]
  /** An edge running along one of the axes (not a slope), so a new figure labels it. */
  square?: boolean
}
export type Extra = { a: Vec; b: Vec; dashed: boolean }

export type Drawing = ReturnType<typeof drawFigure>

/** Which lines each kind of piece can show. */
export const LINES_FOR: Record<string, LineKind[]> = {
  box: [], prism: ['height'], cylinder: ['height', 'radius', 'diameter'], halfCylinder: ['radius', 'diameter'], cone: ['height', 'radius', 'diameter', 'slant'],
  pyramid: ['height', 'slant'], sphere: ['radius', 'diameter'], hemisphere: ['radius', 'diameter'],
}
export const LINE_NAMES: Record<LineKind, string> = { height: 'Height', radius: 'Radius', diameter: 'Diameter', slant: 'Slant height' }

/**
 * The view a figure is drawn in for print, as textbooks draw it: the front
 * view (front face square-on, depth back on a slant), unless a circle would
 * come out a skewed oval there, a cylinder standing on a box, say. Then it's
 * a view turned a little to the side and looking down, where circles lying
 * flat are level ovals. (Figures of only upright round pieces already get
 * level ovals in the front view, which looks at them from a little above.)
 */
export function textbookView(f: Figure): Figure['view'] {
  const front: Figure['view'] = { ...f.view, style: 'front' }
  if (viewAngle({ ...f, view: front }) >= 90) return front
  const skewed = f.pieces.some((p) => {
    if (!['cylinder', 'cone', 'hemisphere', 'sphere'].includes(p.kind)) return false
    if (p.kind === 'sphere') return true
    // Its circles face along its own up; only circles facing the viewer (along z) keep their shape.
    const r = ROTATIONS[p.turn] ?? ROTATIONS[0]
    return r[2 * 3 + 1] === 0
  })
  return skewed ? { ...f.view, style: 'camera', yaw: f.view.side === 'left' ? -28 : 28, pitch: f.view.from === 'below' ? -24 : 24 } : front
}

/** How far the corner view looks down on the figure. */
const CORNER_PITCH = 28

/**
 * The view's way of turning space and flattening it onto the page: one
 * parallel projection either way. Front is oblique: the front face as it is,
 * depth slid back on a slant. Corner turns the figure to show a corner and
 * tips it toward the viewer, then looks straight on, so nothing is slanted
 * but no face keeps its true shape.
 */
export function viewOf(f: Figure) {
  // The whole figure turned for print.
  const turned: number[] = [...(ROTATIONS[f.view.orient ?? 0] ?? ROTATIONS[0])]
  let rot = turned
  const s = f.view.side === 'right' ? 1 : -1
  const v = f.view.from === 'above' ? 1 : -1
  let dx = 0
  let dy = 0
  if (f.view.style === 'corner' || f.view.style === 'camera') {
    const camera = f.view.style === 'camera'
    const yaw = ((camera ? f.view.yaw : s * f.view.corner) * Math.PI) / 180
    const pitch = (-(camera ? f.view.pitch : v * CORNER_PITCH) * Math.PI) / 180
    const ry = [Math.cos(yaw), 0, Math.sin(yaw), 0, 1, 0, -Math.sin(yaw), 0, Math.cos(yaw)]
    const rx = [1, 0, 0, 0, Math.cos(pitch), -Math.sin(pitch), 0, Math.sin(pitch), Math.cos(pitch)]
    rot = mulRotLocal(rx, mulRotLocal(ry, rot))
  } else {
    const a = (viewAngle(f) * Math.PI) / 180
    dx = Math.abs(Math.cos(a)) < 1e-9 ? 0 : s * DEPTH * Math.cos(a)
    dy = v * DEPTH * Math.sin(a)
  }
  const back = [rot[0], rot[3], rot[6], rot[1], rot[4], rot[7], rot[2], rot[5], rot[8]]
  /** Flat, in the figure's own units (y down). */
  const flat = (p: V3): Vec => {
    const q = applyRot(rot, p)
    return [q[0] + dx * q[2], -(q[1] + dy * q[2])]
  }
  /** Toward the viewer, in space: every point along it lands on the same spot. */
  const toViewer = applyRot(back, [dx, dy, -1])
  /** A point in space that lands on this flat spot. */
  const unflat = ([x, y]: Vec): V3 => applyRot(back, [x, -y, 0])
  return { flat, toViewer, unflat, turned }
}
const mulRotLocal = (a: number[], b: number[]): number[] => {
  const out: number[] = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c])
  return out
}

/** The whole shape as solids, with the tests drawing uses. */
export function sceneOf(f: Figure) {
  const placed = placeAll(f.pieces)
  const solids = new Map<string, Solid>()
  for (const [id, pl] of placed) solids.set(id, solidOf(pl))
  const added = [...solids.values()].filter((s) => !s.cut)
  const cuts = [...solids.values()].filter((s) => s.cut)
  const all = [...solids.values()].flatMap((s) => s.corners)
  const lo: V3 = [0, 1, 2].map((i) => Math.min(...all.map((p) => p[i]))) as V3
  const hi: V3 = [0, 1, 2].map((i) => Math.max(...all.map((p) => p[i]))) as V3
  const size = all.length ? Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) || 1 : 1
  const insideShape = (p: V3) => added.some((s) => inside(s, p)) && !cuts.some((s) => inside(s, p))

  /** Whether something of the shape is in front of p, looking back along `dir`. */
  function hiddenFrom(p: V3, dir: V3): boolean {
    const start = size * 1e-4
    const enough = size * 1e-3
    const solid: [number, number][] = []
    for (const s of added) {
      const sp = span(s, p, dir)
      if (sp && sp.t1 > Math.max(sp.t0, start) + enough * 0.1) solid.push([Math.max(sp.t0, start), sp.t1])
    }
    if (!solid.length) return false
    const holes: [number, number][] = []
    for (const s of cuts) {
      const sp = span(s, p, dir)
      if (sp) holes.push([sp.t0, sp.t1])
    }
    for (const [a, b] of mergeSpans(solid)) {
      // What of [a, b] the holes leave.
      let left: [number, number][] = [[a, b]]
      for (const [c, d] of holes) left = left.flatMap(([x, y]) => (d <= x || c >= y ? [[x, y]] : ([[x, c], [d, y]] as [number, number][]).filter(([u, w]) => w > u)))
      if (left.some(([x, y]) => y - x > enough)) return true
    }
    return false
  }

  /** The front-most piece (and face) a line of sight from the viewer meets at a point in space along it. */
  function frontAt(o: V3, dir: V3): { piece: string; normal: V3; t: number } | null {
    const spans = [...solids.values()].map((s) => ({ s, sp: span(s, o, dir) })).filter((x) => x.sp)
    let best: { piece: string; normal: V3; t: number } | null = null
    for (const { s, sp } of spans) {
      if (!s.cut) {
        // Its front, unless that's inside a hole.
        const t = sp!.t1
        const p = add3(o, mul3(dir, t - size * 1e-5))
        if (cuts.some((c) => inside(c, p))) continue
        if (!best || t > best.t) best = { piece: s.id, normal: sp!.n1, t }
      } else {
        // A hole's far wall, seen where it's inside the shape.
        const t = sp!.t0
        const p = add3(o, mul3(dir, t + size * 1e-5))
        if (!added.some((a) => inside(a, p)) || cuts.some((c) => c !== s && inside(c, p))) continue
        if (!best || t > best.t) best = { piece: s.id, normal: mul3(sp!.n0, -1), t }
      }
    }
    return best
  }

  return { placed, solids, added, cuts, size, insideShape, hiddenFrom, frontAt }
}
export type Scene = ReturnType<typeof sceneOf>

function mergeSpans(list: [number, number][]): [number, number][] {
  const sorted = [...list].sort((a, b) => a[0] - b[0])
  const out: [number, number][] = []
  for (const [a, b] of sorted) {
    const last = out.at(-1)
    if (last && a <= last[1]) last[1] = Math.max(last[1], b)
    else out.push([a, b])
  }
  return out
}

type Status = Look | 'off' | 'gone'

/** Draws the figure at a label size. With `labelAll`, every edge shows its measure (for previews). */
export function drawFigure(f: Figure, labelSize: LabelSize) {
  const FS = BASE_FS * LABEL_SCALE[labelSize]
  const scene = sceneOf(f)
  const { placed, solids, size, insideShape, hiddenFrom } = scene
  const view = viewOf(f)
  const V = view.toViewer
  const raw = [...solids.values()].flatMap((s) => s.corners).map(view.flat)
  const xs = raw.map((p) => p[0])
  const ys = raw.map((p) => p[1])
  const w0 = raw.length ? Math.max(...xs) - Math.min(...xs) : 1
  const h0 = raw.length ? Math.max(...ys) - Math.min(...ys) : 1
  const k = Math.min(FIT_W / (w0 || 1), FIT_H / (h0 || 1))
  const at = (p: V3): Vec => mul(view.flat(p), k)
  const step = size / 150
  const probe = size * 2e-3
  const cubes = f.cubes && cubesPossible(f.pieces)
  // Front view at a slant draws circles lying flat as slanted ovals, true to the face under them; the corner view draws them level.
  const tilted =
    f.view.style === 'front' && viewAngle(f) < 90 &&
    [...placed.values()].some((pl) => ['cylinder', 'cone', 'hemisphere'].includes(pl.piece.kind) && Math.abs(applyRot(pl.rot, [0, 1, 0])[1]) === 1)
  /** Whether nothing of the shape is at this spot on the page. */
  const emptyAt = (spot: Vec) => !scene.frontAt(view.unflat(mul(spot, 1 / k)), V)
  /** Whether one side of a line on the page is empty: it's on the outline. */
  const onOutline = (a: Vec, b: Vec) => {
    const m = mul(add(a, b), 0.5)
    const n = mul(perp(unit(sub(b, a))), 8)
    return emptyAt(add(m, n)) || emptyAt(sub(m, n))
  }

  // ---- Every line, tested a bit at a time ----
  const features: Feature[] = []
  for (const [id, pl] of placed) {
    features.push(...featuresOf(pl, solids.get(id)!, V))
    if (cubes && !pl.piece.cut) features.push(...gridOf(pl))
  }

  function status(f0: Feature, m: V3, t: V3): Status {
    // A piece's line only counts where it's on that piece's own surface (a sphere's outline dips into the cone under it).
    const own = solids.get(f0.piece)
    if (own && (!inside(own, m, -probe / 2) || inside(own, m, probe / 2))) return 'off'
    const helper: V3 = Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
    const e1 = unit3(cross3(t, helper))
    const e2 = cross3(t, e1)
    const ins: boolean[] = []
    for (let i = 0; i < PROBES; i++) {
      const a = ((i + 0.37) / PROBES) * 2 * Math.PI
      ins.push(insideShape(add3(m, add3(mul3(e1, probe * Math.cos(a)), mul3(e2, probe * Math.sin(a))))))
    }
    let changes = 0
    for (let i = 0; i < PROBES; i++) if (ins[i] !== ins[(i + 1) % PROBES]) changes++
    if (!changes) return 'off'
    const count = ins.filter(Boolean).length
    const flatAcross = changes === 2 && Math.abs(count - PROBES / 2) <= 1
    let look: Look = 'line'
    if (f0.kind === 'grid') look = 'grid'
    else if (f0.kind === 'edge' && flatAcross) look = 'seam'
    else if (f0.kind === 'rim' && flatAcross) {
      // Flat across a circle: a seam, unless two kinds of piece meet there (a silo's hemisphere on its cylinder).
      const kinds = new Set<string>()
      for (let i = 0; i < PROBES; i++) {
        if (!ins[i]) continue
        const a = ((i + 0.37) / PROBES) * 2 * Math.PI
        const p = add3(m, add3(mul3(e1, probe * Math.cos(a)), mul3(e2, probe * Math.sin(a))))
        for (const s of scene.added) if (inside(s, p)) kinds.add(s.kind)
      }
      look = kinds.size > 1 ? 'line' : 'seam'
    }
    const hidden = hiddenFrom(m, V)
    if (!hidden) return look
    // Hidden lines are always found; whether they're drawn is settled per line below.
    if (look === 'line') return 'hidden'
    return 'gone'
  }

  type Bit = { a: V3; b: V3; st: Status; f: Feature }
  const runs: Run[] = []
  const creases: Bit[] = []
  const nth = new Map<string, number>()
  for (const feat of features) {
    const kindOf = `${feat.piece}:${feat.kind}`
    const n = nth.get(kindOf) ?? 0
    nth.set(kindOf, n + 1)
    const key = `h:${kindOf}:${feat.index ?? n}`
    const pts = feat.closed ? [...feat.pts, feat.pts[0]] : feat.pts
    const bits: Bit[] = []
    // A sphere's circles are cut into straight bits whose middles fall just inside it; they're tested back on its surface.
    const ball = solids.get(feat.piece)?.ball
    const onBall = !!ball && feat.kind !== 'grid'
    const toBall = (p: V3) => add3(ball!.c, mul3(unit3(sub3(p, ball!.c)), ball!.r))
    for (let i = 0; i + 1 < pts.length; i++) {
      const [a, b] = [pts[i], pts[i + 1]]
      const L = len3(sub3(b, a))
      if (L < 1e-12) continue
      const n = Math.max(1, Math.ceil(L / step))
      const t = mul3(sub3(b, a), 1 / L)
      const test = (p: V3) => status(feat, onBall ? toBall(p) : p, t)
      let prev: Bit | null = null
      for (let j = 0; j < n; j++) {
        const p = add3(a, mul3(sub3(b, a), j / n))
        const q = add3(a, mul3(sub3(b, a), (j + 1) / n))
        const bit: Bit = { a: p, b: q, st: test(mul3(add3(p, q), 0.5)), f: feat }
        // Where the look changes partway along a line, find the spot, so measures and ends come out exact.
        if (prev && prev.st !== bit.st) {
          let lo = mul3(add3(prev.a, prev.b), 0.5)
          let hi = mul3(add3(p, q), 0.5)
          for (let it = 0; it < 12; it++) {
            const mid = mul3(add3(lo, hi), 0.5)
            if (test(mid) === prev.st) lo = mid
            else hi = mid
          }
          const at0 = mul3(add3(lo, hi), 0.5)
          prev.b = at0
          bit.a = at0
        }
        bits.push(bit)
        prev = bit
      }
    }
    // Bits in a row that look the same make one run.
    let cur: Run | null = null
    let curSt: Status | null = null
    for (const bit of bits) {
      const show = bit.st === 'seam' ? f.seams : bit.st !== 'off' && bit.st !== 'gone'
      if (feat.kind === 'edge' && (bit.st === 'line' || bit.st === 'hidden')) creases.push(bit)
      if (!show) {
        cur = null
        curSt = null
        continue
      }
      if (cur && curSt === bit.st) cur.pts.push(at(bit.b))
      else {
        cur = { look: bit.st as Look, pts: [at(bit.a), at(bit.b)], key }
        curSt = bit.st
        runs.push(cur)
      }
    }
  }

  // ---- Edges to label: straight runs in a line, read as one ----
  // Each is named by the pieces' edges it's made of, so its label stays on it as pieces are resized.
  const labelables: Labelable[] = []
  type Span = { a: number; b: number; hid: boolean; by: string }
  const groups = new Map<string, { d: V3; foot: V3; spans: Span[] }>()
  const r4 = (x: number) => (Math.abs(x) < 5e-5 ? 0 : Math.round(x * 1e4) / 1e4)
  for (const bit of creases) {
    let d = unit3(sub3(bit.b, bit.a))
    const lead = Math.abs(d[0]) > 1e-6 ? d[0] : Math.abs(d[1]) > 1e-6 ? d[1] : d[2]
    if (lead < 0) d = mul3(d, -1)
    const ta = dot3(bit.a, d)
    const tb = dot3(bit.b, d)
    const foot = sub3(bit.a, mul3(d, ta))
    const key = `${d.map(r4).join(',')}@${foot.map(r4).join(',')}`
    const g = groups.get(key) ?? { d, foot, spans: [] }
    g.spans.push({ a: Math.min(ta, tb), b: Math.max(ta, tb), hid: bit.st === 'hidden', by: `${bit.f.piece}#${bit.f.index ?? 0}` })
    groups.set(key, g)
  }
  const used = new Map<string, number>()
  for (const g of groups.values()) {
    const sorted = g.spans.sort((a, b) => a.a - b.a)
    const merged: { a: number; b: number; shown: number; total: number; by: Set<string> }[] = []
    for (const sp of sorted) {
      const last = merged.at(-1)
      // Touching, or one edge broken only where a round piece meets it at a tangent (a short gap, the same edge on both sides): one edge to label.
      const sameEdge = !!last && last.by.has(sp.by)
      const gap = last ? sp.a - last.b : Infinity
      if (last && (gap <= size * 1e-6 || (sameEdge && gap < Math.min(1, 0.12 * (sp.b - last.a))))) {
        last.b = Math.max(last.b, sp.b)
        last.total += sp.b - sp.a
        if (!sp.hid) last.shown += sp.b - sp.a
        last.by.add(sp.by)
      } else merged.push({ a: sp.a, b: sp.b, shown: sp.hid ? 0 : sp.b - sp.a, total: sp.b - sp.a, by: new Set([sp.by]) })
    }
    for (const m of merged) {
      if (m.b - m.a < size * 1e-3) continue
      const pa = add3(g.foot, mul3(g.d, m.a))
      const pb = add3(g.foot, mul3(g.d, m.b))
      const hidden = m.shown < m.total / 2
      const base = `e:${[...m.by].sort().join('+')}`
      const n = used.get(base) ?? 0
      used.set(base, n + 1)
      labelables.push({
        key: n ? `${base}~${n}` : base, a: at(pa), b: at(pb), measure: m.b - m.a, hidden, name: 'Edge', outer: !hidden && onOutline(at(pa), at(pb)), length: true,
        square: g.d.some((c) => Math.abs(Math.abs(c) - 1) < 1e-6),
      })
    }
  }

  // ---- Height, radius, diameter and slant lines ----
  const extras: Extra[] = []
  const squares: Vec[][] = []
  for (const [id, pl] of placed) {
    for (const kind of LINES_FOR[pl.piece.kind]) {
      if (!pl.piece.lines[kind]) continue
      const line = lineOf(pl, solids.get(id)!, kind, V, view.flat, insideShape)
      if (!line) continue
      const mid = mul3(add3(line.a, line.b), 0.5)
      const hidden = line.inside || hiddenFrom(mid, V)
      if (line.draw) extras.push({ a: at(line.a), b: at(line.b), dashed: hidden })
      if (line.square) squares.push(line.square.map((p) => at(p)))
      labelables.push({
        key: `${id}:${kind}`, a: at(line.a), b: at(line.b), measure: len3(sub3(line.b, line.a)), hidden: hidden && !line.dimension, name: LINE_NAMES[kind], outer: false, length: kind !== 'radius',
        dimension: line.dimension,
        // A cylinder's height is measured along its sides, as the side drawn is the edge a reader sees.
        alongside: kind === 'height' && pl.piece.kind === 'cylinder'
          ? features.filter((ft) => ft.piece === id && ft.kind === 'outline' && ft.pts.length === 2).map((ft) => [at(ft.pts[0]), at(ft.pts[1])] as [Vec, Vec])
          : undefined,
      })
    }
  }

  // ---- Measures across the whole figure, along its outside ----
  if (scene.added.length) {
    const all = scene.added.flatMap((s) => s.corners)
    const lo: V3 = [0, 1, 2].map((i) => Math.min(...all.map((p) => p[i]))) as V3
    const hi: V3 = [0, 1, 2].map((i) => Math.max(...all.map((p) => p[i]))) as V3
    const corner = (x: number, y: number, z: number): V3 => [x ? hi[0] : lo[0], y ? hi[1] : lo[1], z ? hi[2] : lo[2]]
    const OVERALL: [Overall, 0 | 1 | 2, string][] = [['height', 1, 'Overall height'], ['width', 0, 'Overall width'], ['depth', 2, 'Overall depth']]
    for (const [name, axis, title] of OVERALL) {
      if (!f.overall[name]) continue
      // Of the box's four edges along this axis, the one furthest right (heights) or lowest on the page.
      const options: [V3, V3][] = []
      for (const u of [0, 1]) for (const w of [0, 1]) {
        const c0 = [u, w]
        const pick = (end: number) => {
          const ix = [0, 0, 0]
          ix[axis] = end
          const others = [0, 1, 2].filter((i) => i !== axis)
          ix[others[0]] = c0[0]
          ix[others[1]] = c0[1]
          return corner(ix[0], ix[1], ix[2])
        }
        options.push([pick(0), pick(1)])
      }
      const score = ([a3, b3]: [V3, V3]) => {
        const m = mul(add(at(a3), at(b3)), 0.5)
        return axis === 1 ? m[0] : m[1] + (axis === 2 ? m[0] * 0.01 : 0)
      }
      const [a3, b3] = options.reduce((best, o) => (score(o) > score(best) ? o : best), options[0])
      labelables.push({ key: `all:${name}`, a: at(a3), b: at(b3), measure: hi[axis] - lo[axis], hidden: false, name: title, outer: true, length: true, dimension: true })
    }
  }

  // ---- Hidden lines the teacher has left out (kept aside, so the editor can show them faintly to bring back) ----
  const unseen: Run[] = []
  for (let i = runs.length - 1; i >= 0; i--) if (runs[i].look === 'hidden' && runs[i].key && (f.unseen?.[runs[i].key!] ?? !f.hidden)) unseen.unshift(...runs.splice(i, 1))

  // ---- Labels ----
  const outline = runs.flatMap((r) => r.pts)
  const bx = outline.map((p) => p[0])
  const by = outline.map((p) => p[1])
  const center: Vec = outline.length ? [(Math.min(...bx) + Math.max(...bx)) / 2, (Math.min(...by) + Math.max(...by)) / 2] : [0, 0]
  const unitText = f.unit.trim() ? ` ${f.unit.trim()}` : ''
  const labels: PlacedLabel[] = []
  /** Thin lines that go with labels: dimension lines, their ticks and extension lines, and leaders. */
  const dims: [Vec, Vec][] = []
  /** Arrowheads on dimension lines, as filled triangles. */
  const arrows: Vec[][] = []
  /** Which measure each dimension line, arrowhead and leader belongs to (by its key), to light it all up together. */
  const dimOwner: string[] = []
  const arrowOwner: string[] = []
  const leaderOwner: string[] = []
  /** Each dimension line, end to end, with the measure it belongs to, so clicking any of it picks that measure. */
  const dimHits: { key: string; a: Vec; b: Vec }[] = []
  const leaders: [Vec, Vec][] = []
  // Every drawn line, as segments, for labels to keep clear of.
  const segs: [Vec, Vec][] = []
  for (const r of runs) for (let i = 0; i + 1 < r.pts.length; i++) segs.push([r.pts[i], r.pts[i + 1]])
  for (const e of extras) segs.push([e.a, e.b])
  for (const sq of squares) for (let i = 0; i + 1 < sq.length; i++) segs.push([sq[i], sq[i + 1]])
  const rectOf = (box: MathBox, [cx, cy]: Vec, pad: number) =>
    [cx - box.w / 2 - pad, cy - (box.asc + box.desc) / 2 - pad, cx + box.w / 2 + pad, cy + (box.asc + box.desc) / 2 + pad] as const
  const overlaps = (box: MathBox, [cx, cy]: Vec) =>
    labels.some((l) => Math.abs(l.cx - cx) < (l.box.w + box.w) / 2 + 3 && Math.abs(l.cy - cy) < (l.box.asc + l.box.desc + box.asc + box.desc) / 2 + 2)
  const crossesLines = (box: MathBox, c: Vec, skip: [Vec, Vec][] = []) => {
    const r = rectOf(box, c, 2)
    return [...segs, ...dims].some((sg) => !skip.includes(sg) && segHitsRect(sg[0], sg[1], r))
  }
  const ordered = [...labelables].sort((a, b) => Number(!!b.dimension) - Number(!!a.dimension))
  for (let part of ordered) {
    const lab = f.labels[part.key]
    if (!lab || lab.mode === 'none') continue
    const box = lab.mode === 'text' ? layoutMath(lab.text, FS) : layoutMath(measureText(part.measure), FS, { suffix: unitText })
    if (!box) continue
    const t = unit(sub(part.b, part.a))
    let m = mul(add(part.a, part.b), 0.5)
    // The label's side: the line's empty side if only one side is; otherwise away from the middle of the figure.
    let n = perp(t)
    const [outA, outB] = [emptyAt(add(m, mul(n, 8))), emptyAt(sub(m, mul(n, 8)))]
    if (outA !== outB) {
      if (outB) n = mul(n, -1)
    } else if (dot(n, sub(m, center)) < 0) n = mul(n, -1)
    const o = f.moved[part.key] ?? [0, 0]
    const style = part.dimension ? 'dimension' : (lab.style ?? f.labelStyle)
    const L = len(sub(part.b, part.a))

    if (style === 'dimension' && part.length && L > 1) {
      // Off the side edge on the label's side, when it has some.
      if (part.alongside?.length) {
        const side = part.alongside.reduce((best, e) => (dot(sub(mul(add(e[0], e[1]), 0.5), m), n) > dot(sub(mul(add(best[0], best[1]), 0.5), m), n) ? e : best))
        const [ea, eb] = dot(sub(side[1], side[0]), sub(part.b, part.a)) < 0 ? [side[1], side[0]] : side
        part = { ...part, a: ea, b: eb }
        m = mul(add(ea, eb), 0.5)
      }
      // Set off parallel to the line, out on its side, with extension lines and end ticks; the label breaks the line.
      let off = 16 + o[1]
      let c = add(add(m, mul(n, off)), mul(t, o[0]))
      for (let i = 0; i < 6 && (overlaps(box, c) || crossesLines(box, c)); i++) {
        off += 12
        c = add(add(m, mul(n, off)), mul(t, o[0]))
      }
      const a2 = add(part.a, mul(n, off))
      const b2 = add(part.b, mul(n, off))
      dimHits.push({ key: part.key, a: a2, b: b2 })
      const gap = reach(box, t) + 4
      const along = dot(sub(c, a2), t)
      const owned = (seg: [Vec, Vec]) => (dims.push(seg), dimOwner.push(part.key))
      if (along - gap > 0) owned([a2, add(a2, mul(t, along - gap))])
      if (L - along - gap > 0) owned([add(a2, mul(t, along + gap)), b2])
      // As textbooks and tests draw them: an arrowhead at each end, against a short bar square to the line.
      for (const [q, inward] of [[a2, t], [b2, mul(t, -1)]] as const) {
        owned([sub(q, mul(n, 6)), add(q, mul(n, 6))])
        arrows.push([q, add(add(q, mul(inward, 9)), mul(n, 3.5)), add(add(q, mul(inward, 9)), mul(n, -3.5))])
        arrowOwner.push(part.key)
      }
      labels.push({ part: part.key, box, cx: c[0], cy: c[1], x: c[0] - box.w / 2, y: c[1] + (box.asc - box.desc) / 2, along: t, across: n, offset: o })
      continue
    }

    // Beside the line: nearest spot clear of other labels and every drawn line, a little further out or along if need be.
    const own = segs.filter(([p, q]) => near(p, q, part.a, part.b))
    const base = (d: number, sl: number) => add(add(m, mul(n, 6 + d + reach(box, n))), mul(t, sl))
    let c = base(0, 0)
    const slide = Math.max(8, 0.45 * L)
    search: for (const d of [0, 4, 9, 15, 24]) {
      for (let k = 0; k * 6 <= slide; k++) {
        for (const sl of k ? [k * 6, -k * 6] : [0]) {
          const cand = base(d, sl)
          if (!overlaps(box, cand) && !crossesLines(box, cand, own)) {
            c = cand
            break search
          }
        }
      }
    }
    const [cx, cy] = add(c, add(mul(t, o[0]), mul(n, o[1])))
    labels.push({ part: part.key, box, cx, cy, x: cx - box.w / 2, y: cy + (box.asc - box.desc) / 2, along: t, across: n, offset: o })
    // Dragged well away from its line: a thin leader back to it.
    if (o[0] || o[1]) {
      const anchor = add(m, mul(t, Math.max(-L / 2, Math.min(L / 2, o[0]))))
      const toward = sub(anchor, [cx, cy])
      const room = reach(box, unit(toward)) + 3
      if (len(toward) > room + 14) (leaders.push([add([cx, cy], mul(unit(toward), room)), anchor]), leaderOwner.push(part.key))
    }
  }

  // ---- The frame: the lines and the labels, padded ----
  const ex: Vec[] = [...outline, ...extras.flatMap((e) => [e.a, e.b]), ...dims.flat(), ...leaders.flat()]
  for (const l of labels) ex.push([l.x, l.y - l.box.asc], [l.x + l.box.w, l.y + l.box.desc])
  const fx = ex.map((p) => p[0])
  const fy = ex.map((p) => p[1])
  const frame = ex.length
    ? { x: Math.min(...fx) - PAD, y: Math.min(...fy) - PAD, w: Math.max(...fx) - Math.min(...fx) + 2 * PAD, h: Math.max(...fy) - Math.min(...fy) + 2 * PAD }
    : { x: 0, y: 0, w: 100, h: 100 }

  /** Each piece's outline on the page, for tinting it. */
  const hulls = new Map<string, Vec[]>()
  for (const [id, s] of solids) hulls.set(id, hull(s.corners.map(at)))

  /** A flat face of a piece on the page, and its middle there, for adding a piece onto. */
  function faceShape(id: string, face: Dir): { poly: Vec[]; mid: Vec } | null {
    const pl = placed.get(id)
    const s = solids.get(id)
    if (!pl || !s) return null
    const level = face.sign > 0 ? pl.max[face.axis] : pl.min[face.axis]
    const on = s.corners.filter((p) => Math.abs(p[face.axis] - level) < size * 1e-6)
    if (on.length < 3) return null
    const poly = hull(on.map(at))
    return { poly, mid: at(centerOf(on)) }
  }

  /** The piece, and its flat face if it's one, at a spot on the page. */
  function pickAt(spot: Vec): { piece: string; face: Dir | null } | null {
    const o = view.unflat(mul(spot, 1 / k))
    const hit = scene.frontAt(o, V)
    if (!hit) return null
    const pl = placed.get(hit.piece)
    let face: Dir | null = null
    if (pl && !pl.piece.cut) {
      for (const axis of [0, 1, 2] as const) {
        if (Math.abs(Math.abs(hit.normal[axis]) - 1) < 1e-6) {
          const d: Dir = { axis, sign: hit.normal[axis] > 0 ? 1 : -1 }
          if (pl.faces.some((x) => x.axis === d.axis && x.sign === d.sign)) face = d
        }
      }
    }
    return { piece: hit.piece, face }
  }

  // Where a point in the turned figure's space lands on the page, and the turned figure's box, for drawing how it would turn next.
  const turnedT = [view.turned[0], view.turned[3], view.turned[6], view.turned[1], view.turned[4], view.turned[7], view.turned[2], view.turned[5], view.turned[8]]
  const turnedToPage = (q: V3): Vec => at(applyRot(turnedT, q) as V3)
  const tc = [...solids.values()].flatMap((s) => s.corners).map((p) => applyRot(view.turned, p))
  const turnedBox = { lo: [0, 1, 2].map((i) => Math.min(...tc.map((p) => p[i]))) as V3, hi: [0, 1, 2].map((i) => Math.max(...tc.map((p) => p[i]))) as V3 }
  const turnedViewer = applyRot(view.turned, V) as V3
  /** Each piece's straight edges in space, by `piece#index`, for finding the edges that measure the same thing. */
  const edges3 = new Map<string, { piece: string; a: V3; b: V3 }>()
  for (const ft of features) if (ft.kind === 'edge' && ft.index != null) edges3.set(`${ft.piece}#${ft.index}`, { piece: ft.piece, a: ft.pts[0], b: ft.pts[1] })
  return { edges3, turnedToPage, turnedBox, turnedViewer, frame, runs, unseen, extras, squares, labels, labelables, dims, dimOwner, arrows, arrowOwner, dimHits, leaders, leaderOwner, hulls, faceShape, pickAt, scale: k, cubesShown: cubes, tiltedCircles: tilted }
}

/** Whether two segments lie along the same line, overlapping: a label may sit on its own line's ends. */
function near(p: Vec, q: Vec, a: Vec, b: Vec) {
  const t = unit(sub(b, a))
  const off = (x: Vec) => Math.abs(dot(sub(x, a), perp(t)))
  return off(p) < 0.5 && off(q) < 0.5
}

/** Whether the segment from p to q touches the rectangle [x0, y0, x1, y1]. */
function segHitsRect(p: Vec, q: Vec, [x0, y0, x1, y1]: readonly [number, number, number, number]) {
  let t0 = 0
  let t1 = 1
  const d: Vec = [q[0] - p[0], q[1] - p[1]]
  const clip = (den: number, num: number) => {
    if (Math.abs(den) < 1e-12) return num <= 0
    const t = num / den
    if (den < 0) {
      if (t > t1) return false
      if (t > t0) t0 = t
    } else {
      if (t < t0) return false
      if (t < t1) t1 = t
    }
    return true
  }
  return clip(-d[0], p[0] - x0) && clip(d[0], x1 - p[0]) && clip(-d[1], p[1] - y0) && clip(d[1], y1 - p[1]) && t0 <= t1
}

/** A measure as written: up to two decimal places. */
export const measureText = (x: number) => String(Number(x.toFixed(2)))

/** The unit-cube lines across each face of a box. */
function gridOf(pl: Placed): Feature[] {
  const out: Feature[] = []
  for (const axis of [0, 1, 2] as const) {
    const [u, v] = faceAxes(axis)
    for (const level of [pl.min[axis], pl.max[axis]]) {
      for (const [a, b] of [[u, v], [v, u]] as const) {
        const n = Math.round(pl.max[a] - pl.min[a])
        for (let i = 1; i < n; i++) {
          const p: V3 = [0, 0, 0]
          p[axis] = level
          p[a] = pl.min[a] + i
          p[b] = pl.min[b]
          const q: V3 = [...p]
          q[b] = pl.max[b]
          out.push({ piece: pl.piece.id, kind: 'grid', pts: [p, q], closed: false })
        }
      }
    }
  }
  return out
}

/** A piece's height, radius or slant line, in space. `inside`: it runs through the piece, so it's dashed. `draw`: it's a line of its own, not one already drawn. */
function lineOf(
  pl: Placed, s: Solid, kind: LineKind, V: V3, flat: (p: V3) => Vec, solidAt: (p: V3) => boolean = () => false,
): { a: V3; b: V3; inside: boolean; draw: boolean; square?: V3[]; dimension?: boolean } | null {
  const own = (p: V3) => toSpace(pl, p)
  const [ex, ey, ez] = pl.ext
  const sq = (foot: V3, d1: V3, d2: V3): V3[] => {
    const e = Math.max(ex, ey, ez) * 0.07
    return [add3(foot, mul3(unit3(d1), e)), add3(add3(foot, mul3(unit3(d1), e)), mul3(unit3(d2), e)), add3(foot, mul3(unit3(d2), e))]
  }
  /** The corner of a ring furthest right on the page. */
  const rightmost = (ring: V3[]) => ring.reduce((best, p) => (flat(p)[0] > flat(best)[0] ? p : best), ring[0])
  const k = pl.piece.kind
  if (k === 'prism' && kind === 'height') {
    const t = triangleOf(pl)
    // On whichever triangle faces the viewer.
    const z = dot3(applyRot(pl.rot, [0, 0, 1]), V) > 0 ? ez : 0
    const apex: V3 = [t[2][0], t[2][1], z]
    const foot: V3 = [t[2][0], 0, z]
    if (pl.piece.triangle === 'right') return { a: own(foot), b: own(apex), inside: false, draw: false }
    return { a: own(foot), b: own(apex), inside: false, draw: true, square: sq(own(foot), sub3(own([t[1][0], 0, z]), own(foot)), sub3(own(apex), own(foot))) }
  }
  /** The ring's longest diameter on the page (its oval's long axis), its right end second. */
  const across = (ring: V3[]) => {
    let best = 0
    const half = ring.length / 2
    const span2 = (i: number) => len(sub(flat(ring[i]), flat(ring[(i + half) % ring.length])))
    for (let i = 0; i < half; i++) if (span2(i) > span2(best) + 1e-9) best = i
    const [p, q] = [ring[best], ring[(best + half) % ring.length]]
    return flat(p)[0] <= flat(q)[0] ? ([p, q] as const) : ([q, p] as const)
  }
  if (k === 'halfCylinder') {
    // On the half circle nearer the viewer.
    const n = ROUND / 2 + 1
    const end = dot3(applyRot(pl.rot, [0, 0, 1]), V) > 0 ? s.corners.slice(n) : s.corners.slice(0, n)
    const c = mul3(add3(end[0], end[n - 1]), 0.5)
    if (kind === 'radius') return { a: c, b: end[Math.round(n / 4)] ?? end[0], inside: false, draw: true }
    if (kind === 'diameter') return { a: end[n - 1], b: end[0], inside: false, draw: false }
    return null
  }
  if (k === 'cylinder' || k === 'cone' || k === 'hemisphere' || k === 'sphere') {
    const r = ex / 2
    const baseY = k === 'sphere' ? r : 0
    const bottom = s.corners.slice(0, ROUND)
    if (kind === 'radius' || kind === 'diameter') {
      // On the circle that faces the viewer: a cylinder's nearer end, anything else's base or equator.
      let ring = bottom
      let far = false
      if (k === 'cylinder') {
        const up = applyRot(pl.rot, [0, 1, 0])
        const top = s.corners.slice(ROUND)
        // An end against another piece is buried: then the other end, even facing away.
        const out = Math.max(ex, ey, ez) * 0.02
        const buried = (ring: V3[], dir: V3) => solidAt(add3(centerOf(ring), mul3(unit3(dir), out)))
        const [near, nearDir, other, otherDir] = dot3(up, V) > 0 ? [top, up, bottom, mul3(up, -1)] : [bottom, mul3(up, -1), top, up]
        ring = near
        if (buried(near, nearDir) && !buried(other, otherDir)) (ring = other), (far = true)
      }
      const c = centerOf(ring)
      const [a, b] = across(ring)
      // Across an end facing away, the line itself would be hidden: a dimension line across its width says it instead.
      if (kind === 'diameter') return far ? { a, b, inside: false, draw: false, dimension: true } : { a, b, inside: false, draw: true }
      return { a: c, b, inside: false, draw: true }
    }
    if (kind === 'height' && k === 'cylinder') {
      // Down its right side, seen edge-on.
      const p = rightmost(bottom)
      const up = sub3(own([r, ey, r]), own([r, 0, r]))
      return { a: p, b: add3(p, up), inside: false, draw: false }
    }
    if (k === 'cone') {
      const c = own([r, baseY, r])
      const apex = own([r, ey, r])
      if (kind === 'height') return { a: c, b: apex, inside: true, draw: true, square: sq(c, sub3(rightmost(bottom), c), sub3(apex, c)) }
      if (kind === 'slant') return { a: rightmost(bottom), b: apex, inside: false, draw: false }
    }
    return null
  }
  if (k === 'pyramid') {
    const c = own([ex / 2, 0, ez / 2])
    const apex = own([ex / 2, ey, ez / 2])
    // The base edge facing the viewer most.
    const mids: V3[] = [[ex / 2, 0, 0], [ex, 0, ez / 2], [ex / 2, 0, ez], [0, 0, ez / 2]].map((p) => own(p as V3))
    const front = mids.reduce((best, p) => (dot3(sub3(p, c), V) > dot3(sub3(best, c), V) ? p : best), mids[0])
    if (kind === 'height') return { a: c, b: apex, inside: true, draw: true, square: sq(c, sub3(front, c), sub3(apex, c)) }
    if (kind === 'slant') return { a: front, b: apex, inside: false, draw: true }
  }
  return null
}

/** The convex hull of points on the page. */
export function hull(points: Vec[]): Vec[] {
  const ps = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (ps.length < 3) return ps
  const cross = (o: Vec, a: Vec, b: Vec) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Vec[] = []
  for (const p of ps) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Vec[] = []
  for (const p of ps.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

/** Labels every visible edge with its measure, one for each different length in each direction: what a new figure starts with. */
export function measureEdges(f: Figure): Figure['labels'] {
  const d = drawFigure({ ...f, labels: {} }, 'medium')
  const out: Figure['labels'] = {}
  const seen = new Set<string>()
  // Lowest first, then furthest right, as textbooks label a box: its width along the bottom, depth at the bottom right.
  const mid = (e: Labelable) => mul(add(e.a, e.b), 0.5)
  const edges = d.labelables
    .filter((e) => e.key.startsWith('e:') && !e.hidden && e.square)
    .sort((a, b) => Number(b.outer) - Number(a.outer) || Math.round(mid(b)[1] - mid(a)[1]) || mid(b)[0] - mid(a)[0])
  for (const e of edges) {
    const dir = unit(sub(e.b, e.a))
    const sig = `${Math.abs(dir[0]).toFixed(2)},${Math.abs(dir[1]).toFixed(2)}:${measureText(e.measure)}`
    if (seen.has(sig)) continue
    seen.add(sig)
    out[e.key] = { mode: 'measure', text: '' }
  }
  return out
}

/** The keys of the hidden lines lying along a straight edge (to leave them out, or bring them back, from the edge's card). */
export function hiddenKeysOn(d: Drawing, l: Labelable): string[] {
  // Its own line, and the edges it's measured along (a cylinder's sides).
  const segs: [Vec, Vec][] = [[l.a, l.b], ...(l.alongside ?? [])]
  const on = ([a, b]: [Vec, Vec], p: Vec) => {
    const dd = sub(b, a)
    const L2 = dot(dd, dd) || 1
    const t = dot(sub(p, a), dd) / L2
    return t > -0.01 && t < 1.01 && len(sub(p, add(a, mul(dd, t)))) < 0.75
  }
  const keys = [...d.runs, ...d.unseen]
    .filter((r) => r.look === 'hidden' && r.key && segs.some((sg) => on(sg, r.pts[0]) && on(sg, r.pts[r.pts.length - 1])))
    .map((r) => r.key!)
  return [...new Set(keys)]
}

/**
 * Which edges a figure's edge measures go on, picked again (after it's
 * turned): a measure on one of a piece's edges can go on any of its edges of
 * the same length running the same way. Never a hidden one if a seen one will
 * do; of those, one on the figure's outline, then the one furthest from the
 * other measures, so they spread out. Gives `from → to` for each that moves.
 */
export function repickedEdges(d: Drawing, labeled: string[]): Map<string, string> {
  const moves = new Map<string, string>()
  const byKey = new Map(d.labelables.map((l) => [l.key, l]))
  const single = (k: string) => /^e:[^+~]+#\d+$/.test(k)
  const mid = (l: Labelable): Vec => mul(add(l.a, l.b), 0.5)
  // Where the other measures are: fixed ones first, then each edge measure as it's placed.
  const taken: Vec[] = labeled.filter((k) => !single(k) && byKey.has(k)).map((k) => mid(byKey.get(k)!))
  const used = new Set(labeled)
  for (const k of labeled.filter(single)) {
    const e = d.edges3.get(k.slice(2))
    if (!e) continue
    const dir = sub3(e.b, e.a)
    const L = len3(dir)
    const same = [...d.edges3].filter(([, o]) => {
      if (o.piece !== e.piece) return false
      const od = sub3(o.b, o.a)
      return Math.abs(len3(od) - L) < 1e-6 && len3(cross3(dir, od)) < 1e-6 * L * L
    })
    const options = same.map(([id]) => byKey.get(`e:${id}`)).filter((l): l is Labelable => !!l && !l.hidden && (l.key === k || !used.has(l.key)))
    if (!options.length) {
      if (byKey.has(k)) taken.push(mid(byKey.get(k)!))
      continue
    }
    const spread = (l: Labelable) => (taken.length ? Math.min(...taken.map((p) => len(sub(mid(l), p)))) : 0)
    const best = options.reduce((a, b) => ((b.outer ? 1e6 : 0) + spread(b) > (a.outer ? 1e6 : 0) + spread(a) ? b : a))
    taken.push(mid(best))
    if (best.key !== k) (moves.set(k, best.key), used.delete(k), used.add(best.key))
  }
  return moves
}
