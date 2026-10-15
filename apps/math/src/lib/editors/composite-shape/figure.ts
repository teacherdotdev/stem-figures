// Lays out a composite shape as plain pieces for CompositeDrawing.svelte to
// draw on the page: its outline, shading, angle arcs and right-angle squares,
// congruence ticks and parallel arrows, extra lines, a semicircle's radius
// and center, corner points, and every label at its spot. Marks are drawn
// the way the Parallel Lines and Transversal draws them (see
// $lib/labeling/marks.ts), so a composite shape looks like the rest of the
// site. It also works out what label mode lets the teacher click (`pick`).
//
// The shape is drawn to scale, `k` page units to one of its own, chosen to
// fit it in the same box whatever its size, so every figure pastes in at a
// similar size and its marks and labels stay the same size.
//
// Labels are keyed by what they label: "s:" a side, "a:" an angle, "v:" a
// corner's point, "l:" an extra line, "r:" a radius, "o:" a center and "c:"
// a semicircle's curve, each followed by that part's key or id.
//
// A ray runs on past its end: far out of sight while the shape is built, or,
// in label mode and print, the same distance past the shape's outside edge
// as every other ray, with its end cap there.

import { LABEL_SCALE, type LabelSize } from '$shared/labelSize'
import { layoutMath, type MathBox } from '$lib/shared/mathSvg.js'
import type { PlacedLabel } from '$lib/shapes/layout.js'
import { reach } from '$lib/shapes/vec.js'
import { angleMark, parallelArrows, sectorPath, tickMarks } from '$lib/labeling/marks.js'
import type { Pickable } from '$lib/labeling/pick.js'
import {
  ANGLE_DEFAULTS, edgeAt, exitAlong, footAlong, NO_RAY, lineEnds, onArc, PIECE_NAMES, outline, placeAll, pointAt, roundTo, SEMI_DEFAULTS, turnedPieces, SHADES, SIDE_DEFAULTS, vec,
  type Composite, type Corner, type LineWeight, type Edge, type ExtraLine, type Seam, type LineStyle, type Outline, type Placed, type Vec,
} from './composite'

const { add, sub, mul, len, unit, perp } = vec

const BASE_FS = 20
const BASE_NAME_FS = 21
const MARKS = { arc: 22, arcGap: 4.5, square: 13 }
const TICK = 7
const TICK_GAP = 5
const ARROW = 4.5
const ARROW_W = 5
const ARROW_GAP = 6
const WEDGE = 34
const PAD = 14
/** How far a ray runs past the shape's outside edge, and its arrowhead's length and half width (as on a Parallel Lines and Transversal). */
const RUN = 40
const HEAD = 12
const HEAD_W = 5.5
const FAR = 1e5
/** Each line weight's stroke, against a regular one. */
const WEIGHT: Record<LineWeight, number> = { thin: 0.6, regular: 1, thick: 1.7 }
/** The box a shape is fitted to, and the most page units one of its units can take. */
const FIT_W = 420
const FIT_H = 300
const MAX_K = 60

const r1 = (v: number) => Math.round(v * 10) / 10
/** Whether a point lies on a segment, away from its ends. */
const within = (p: Vec, [a, b]: [Vec, Vec]) => {
  const d = sub(b, a)
  const t = vec.dot(sub(p, a), d) / vec.dot(d, d)
  return t > 1e-6 && t < 1 - 1e-6 && Math.abs(vec.cross(d, sub(p, a))) / len(d) < 1e-6
}
const turnBy = (d: Vec, rad: number): Vec => [d[0] * Math.cos(rad) - d[1] * Math.sin(rad), d[0] * Math.sin(rad) + d[1] * Math.cos(rad)]

export interface Drawn {
  o: Outline
  /** Page units to one of the shape's own. */
  k: number
  /** The outline, one path per loop, but for a loop with a side drawn some other way, which goes in `edges`, a path a side. */
  paths: string[]
  edges: { d: string; style: LineStyle; width: number }[]
  /** Shaded pieces, under everything. */
  fills: { d: string; fill: string }[]
  /** Shaded angles. */
  wedges: { d: string; fill: string }[]
  arcs: string[]
  squares: Vec[][]
  ticks: [Vec, Vec][]
  arrows: Vec[][]
  /** `seg`, for an extra line drawn as a ray, is the stretch between its ends, without the run-on. */
  /** `width` scales its stroke (a thin or thick line); `pale` draws it as faint as the outline (a hidden line, while it's built). */
  lines: { id: string; from: Vec; to: Vec; style: LineStyle; seg?: [Vec, Vec]; width?: number; pale?: boolean }[]
  /** Rays' end caps: filled arrowheads and open ones. */
  heads: Vec[][]
  openHeads: Vec[][]
  dots: Vec[]
  labels: PlacedLabel[]
  /** The page area an export keeps, or null when nothing is drawn. */
  crop: { x: number; y: number; w: number; h: number } | null
  /** What label mode lets the teacher click, in page units (its frame is set by the page). */
  pick: Omit<Pickable, 'frame'>
}

/** Page units to one of the shape's own that fit it in the usual box. */
export function fitScale(o: Outline) {
  const pts: Vec[] = []
  for (const loop of o.loops) for (const e of loop) pts.push(...(e.kind === 'line' ? [e.p, e.q] : arcPoints(e, 16, 1)))
  if (!pts.length) return MAX_K
  const w = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]))
  const h = Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]))
  return Math.min(FIT_W / (w || 1), FIT_H / (h || 1), MAX_K)
}

/** A piece's own area as a path on the page, for shading it. */
export function piecePath(pl: Placed, k: number) {
  if (pl.arc) {
    // Round the curve from hi to lo, then back through the center for a quarter circle, or along the base for a semicircle.
    const { lo, hi } = pl.arc
    const pts = Array.from({ length: 49 }, (_, i) => mul(onArc(pl, hi - ((hi - lo) * i) / 48), k))
    if (pl.piece.kind === 'quarter') pts.push(mul(pl.arc.c, k))
    return 'M' + pts.map((p) => `${r1(p[0])},${r1(p[1])}`).join(' L') + ' Z'
  }
  return 'M' + pl.corners.map((p) => mul(p, k).map(r1).join(',')).join(' L') + ' Z'
}

/** The points along a curve of the outline, on the page. */
export function arcPoints(e: Extract<Edge, { kind: 'arc' }>, steps: number, k: number): Vec[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const th = e.start + (e.sweep * i) / steps
    return mul([e.c[0] + e.r * Math.cos(th), e.c[1] + e.r * Math.sin(th)], k)
  })
}

function loopPath(loop: Edge[], k: number) {
  const start = mul(loop[0].p, k)
  let d = `M${r1(start[0])},${r1(start[1])}`
  for (const e of loop) {
    if (e.kind === 'line') {
      const q = mul(e.q, k)
      d += ` L${r1(q[0])},${r1(q[1])}`
    } else d += ' ' + arcPoints(e, 48, k).slice(1).map((p) => `L${r1(p[0])},${r1(p[1])}`).join(' ')
  }
  return d + ' Z'
}

/** The spots where extra lines meet the outline, which become corners there. */
export function splitsOf(c: Composite, placed: Map<string, Placed>): Vec[] {
  return c.lines.flatMap((l) => lineEnds(placed, l) ?? [])
}

/** The extra line drawn along a seam, when the teacher shows it as one: a line from its one end to the other. */
export function seamLine(c: Composite, placed: Map<string, Placed>, seam: Seam) {
  const at = (p: Vec | null, q: Vec) => !!p && len(sub(p, q)) < 1e-6
  return c.lines.find((l) => {
    const ends = lineEnds(placed, l)
    return !!ends && ((at(ends[0], seam.p) && at(ends[1], seam.q)) || (at(ends[0], seam.q) && at(ends[1], seam.p)))
  })
}

/** A height's right-angle square where it meets its side, and the side's dotted run on to the foot once the foot has left it (when its triangle leans out), in the shape's units. */
export function heightMarks(placed: Map<string, Placed>, l: ExtraLine): { foot: Vec; up: Vec; along: Vec; run: [Vec, Vec] | null } | null {
  const [foot, other] = l.b.at === 'foot' ? [l.b, l.a] : l.a.at === 'foot' ? [l.a, l.b] : [null, null]
  if (!foot) return null
  const [f, top, p, q] = [pointAt(placed, foot), pointAt(placed, other), pointAt(placed, foot.p), pointAt(placed, foot.q)]
  const t = footAlong(placed, foot)
  if (!f || !top || !p || !q || t === null || len(sub(top, f)) < 1e-6) return null
  // The square sits over the side: toward its far end, or back toward it once the foot is off the side.
  const toward = t > 0.5 ? p : q
  return { foot: f, up: unit(sub(top, f)), along: unit(sub(toward, f)), run: t < -1e-6 ? [p, f] : t > 1 + 1e-6 ? [q, f] : null }
}

/** The shape outlined once: the same for the drawing and for anything worked out from it. */
export function outlineOf(c: Composite) {
  return outline(c.pieces, splitsOf(c, placeAll(c.pieces)))
}

/** The shape laid out, `k` page units to one of its own (fitted when not given). */
/** With `far`, rays run on out of sight rather than stopping past the shape with their end caps. */
export function drawComposite(c: Composite, labelSize: LabelSize, fixedK?: number, far = false): Drawn {
  if (c.turn) c = { ...c, pieces: turnedPieces(c.pieces, c.turn), turn: 0 }
  const FS = BASE_FS * LABEL_SCALE[labelSize]
  const NAME_FS = BASE_NAME_FS * LABEL_SCALE[labelSize]
  const o = outlineOf(c)
  const k = fixedK ?? fitScale(o)
  const px = (p: Vec): Vec => mul(p, k)
  const unitText = c.unit.trim() ? ` ${c.unit.trim()}` : ''

  const labels: PlacedLabel[] = []
  /** How a side or curve is drawn. */
  const edgeStyle = (e: Edge) => {
    const s = c.sides[e.kind === 'line' ? e.key : `${e.piece}:arc`]
    return { style: s?.style ?? 'solid', weight: s?.weight ?? 'regular' }
  }
  const styled = (e: Edge) => {
    const s = edgeStyle(e)
    return s.style !== 'solid' || s.weight !== 'regular'
  }
  const place = (part: string, box: MathBox | null, center: Vec, along: Vec, across: Vec) => {
    if (!box) return
    const off = c.moved[part] ?? [0, 0]
    const [cx, cy] = add(center, add(mul(along, off[0]), mul(across, off[1])))
    labels.push({ part, box, cx, cy, x: cx - box.w / 2, y: cy + (box.asc - box.desc) / 2, along, across, offset: off })
  }
  /** A length's label: its measure, rounded, or typed text. */
  const lengthBox = (mode: string, text: string, length: number) =>
    mode === 'text' ? layoutMath(text, FS) : mode === 'measure' ? layoutMath(roundTo(length, c.round), FS, { suffix: unitText }) : null

  const fills = [...o.placed.values()]
    .filter((pl) => SHADES[pl.piece.shade]?.fill)
    .map((pl) => ({ d: piecePath(pl, k), fill: SHADES[pl.piece.shade].fill }))

  const pick: Drawn['pick'] = { segments: [], angles: [], spots: [], curves: [], labels }

  // Sides: ticks and arrows across the middle, the label just outside.
  const ticks: [Vec, Vec][] = []
  const arrows: Vec[][] = []
  for (const loop of o.loops)
    for (const e of loop) {
      if (e.kind === 'arc') {
        const text = c.semis[e.piece]?.arcText.trim()
        const pl = o.placed.get(e.piece)!
        // Labeled beside the middle of the curve, outward.
        const away = unit(sub(onArc(pl, (pl.arc!.lo + pl.arc!.hi) / 2), e.c))
        const top = px(add(e.c, mul(away, e.r)))
        const box = text ? layoutMath(text, FS) : null
        if (box) place(`c:${e.piece}`, box, add(top, mul(away, 6 + reach(box, away))), perp(away), away)
        const d = 'M' + arcPoints(e, 32, k).map((p) => `${r1(p[0])},${r1(p[1])}`).join(' L')
        pick.curves!.push({ key: e.piece, d, anchor: top, name: `${PIECE_NAMES[pl.piece.kind]}’s curve` })
        continue
      }
      const s = c.sides[e.key] ?? SIDE_DEFAULTS
      const [p, q] = [px(e.p), px(e.q)]
      const t = unit(sub(q, p))
      const nrm = mul(perp(t), -1) // outward: the inside is on perp's side
      const mid = mul(add(p, q), 0.5)
      const both = s.ticks && s.arrows
      const tickMid = both ? add(mid, mul(t, -(s.ticks * TICK_GAP) / 2 - 4)) : mid
      const arrowMid = both ? add(mid, mul(t, (s.arrows * ARROW_GAP) / 2 + 4)) : mid
      ticks.push(...tickMarks(tickMid, t, nrm, s.ticks, TICK, TICK_GAP))
      const way = t[0] > 1e-9 || (Math.abs(t[0]) <= 1e-9 && t[1] > 0) ? t : mul(t, -1)
      arrows.push(...parallelArrows(arrowMid, way, nrm, s.arrows, ARROW, ARROW_W, ARROW_GAP))
      const box = lengthBox(s.label, s.text, len(sub(e.q, e.p)))
      if (box) place(`s:${e.key}`, box, add(mid, mul(nrm, (s.ticks || s.arrows ? TICK + 6 : 6) + reach(box, nrm))), t, nrm)
      pick.segments.push({ id: `s:${e.key}`, kind: 'side', from: p, to: q })
    }

  const lines: Drawn['lines'] = []
  // Where sides and lines meet: every corner, and every point inside the shape where extra lines end or cross. Each has the rays
  // leaving it along sides and lines; the angles between them can be marked and labeled, and the point named.
  const marks = { arcs: [] as string[], squares: [] as Vec[][] }
  const wedges: { d: string; fill: string }[] = []
  const dots: Vec[] = []
  /** `curved` when it leaves along a curve (`dir` is then the curve's direction there). */
  type Ray = { id: string; dir: Vec; length: number; curved?: boolean }
  type Vertex = { key: string; at: Vec; rays: Ray[]; corner: Corner | null }
  const vertices: Vertex[] = []
  const vertexAt = (p: Vec) => vertices.find((v) => len(sub(v.at, p)) < 1e-6)
  const edgeLength = (e: Edge) => (e.kind === 'line' ? len(sub(e.q, e.p)) : e.r)
  for (const loop of o.loops)
    loop.forEach((e, i) => {
      const corner = o.corners.find((x) => x.key === e.key)!
      const prev = loop[(i + loop.length - 1) % loop.length]
      vertices.push({
        key: corner.key, at: corner.at, corner,
        rays: [
          { id: 'out', dir: corner.outDir, length: edgeLength(e), curved: e.kind === 'arc' },
          { id: 'back', dir: mul(corner.inDir, -1), length: edgeLength(prev), curved: prev.kind === 'arc' },
        ],
      })
    })
  const lineEnds2 = c.lines.flatMap((l) => {
    const e = lineEnds(o.placed, l)
    return e ? [{ l, e }] : []
  })
  for (const { l, e } of lineEnds2)
    e.forEach((p, j) => {
      let v = vertexAt(p)
      if (!v) vertices.push((v = { key: `e:${l.id}:${j ? 'b' : 'a'}`, at: p, rays: [], corner: null }))
      v.rays.push({ id: `${l.id}${j ? '<' : '>'}`, dir: unit(sub(e[1 - j], p)), length: len(sub(e[1 - j], p)) })
    })
  for (let i = 0; i < lineEnds2.length; i++)
    for (let j = i + 1; j < lineEnds2.length; j++) {
      const [[p1, p2], [q1, q2]] = [lineEnds2[i].e, lineEnds2[j].e]
      const [rr, ss] = [sub(p2, p1), sub(q2, q1)]
      const den = vec.cross(rr, ss)
      if (Math.abs(den) < 1e-9) continue
      const at = add(p1, mul(rr, vec.cross(sub(q1, p1), ss) / den))
      if (!within(at, [p1, p2]) || !within(at, [q1, q2]) || vertexAt(at)) continue
      vertices.push({ key: `x:${[lineEnds2[i].l.id, lineEnds2[j].l.id].sort().join(':')}`, at, rays: [], corner: null })
    }
  // Lines running on through a point: a ray each way.
  for (const v of vertices)
    for (const { l, e } of lineEnds2)
      if (within(v.at, e)) v.rays.push({ id: `${l.id}>`, dir: unit(sub(e[1], v.at)), length: len(sub(e[1], v.at)) }, { id: `${l.id}<`, dir: unit(sub(e[0], v.at)), length: len(sub(e[0], v.at)) })

  /** Clockwise on the page from one direction round to another, in radians, 0 up to a full turn. */
  const turnFrom = (a: Vec, b: Vec) => {
    const t = Math.atan2(vec.cross(a, b), vec.dot(a, b))
    return t < -1e-9 ? t + 2 * Math.PI : Math.max(0, t)
  }
  /** An angle at `at` (page units) from e1 clockwise round to e2: its shading, marks, label and pick wedge. */
  const drawAngle = (key: string, at: Vec, e1: Vec, e2: Vec, deg: number, room: number) => {
    const a = c.angles[key] ?? ANGLE_DEFAULTS
    const span = (deg * Math.PI) / 180
    const large = deg > 180
    const bis = turnBy(e1, span / 2)
    const radius = Math.max(12, Math.min(WEDGE, room))
    if (SHADES[a.shade]?.fill) wedges.push({ d: sectorPath(at, e1, e2, radius, true, large), fill: SHADES[a.shade].fill })
    const right = Math.abs(deg - 90) < 1e-4
    const sizes = { ...MARKS, arc: Math.min(MARKS.arc, room), square: Math.min(MARKS.square, room) }
    const outer = angleMark(marks, at, e1, e2, a.mark, right, large, sizes)
    const box = a.label === 'text' ? layoutMath(a.text, FS) : a.label === 'measure' ? layoutMath(roundTo(deg, c.angleRound), FS, { suffix: '°' }) : null
    if (box) {
      const half = Math.sin(Math.min(span, Math.PI) / 2)
      const toSide = (reach(box, perp(bis)) + 3) / Math.max(half, 0.2)
      place(`a:${key}`, box, add(at, mul(bis, Math.max(outer + 5 + reach(box, bis), toSide))), bis, perp(bis))
    }
    pick.angles.push({ key, wedge: sectorPath(at, e1, e2, radius, true, large), anchor: add(at, mul(bis, radius * 0.7)), measure: deg })
  }

  for (const v of vertices) {
    const at = px(v.at)
    const corner = v.corner
    if (corner && corner.angle !== null) {
      // A corner: its angle inside the shape, or, where lines leave it into the shape, the angles between them and its sides.
      const [out, back] = v.rays
      const S = (corner.angle * Math.PI) / 180
      const inner = v.rays.slice(2).map((ray) => ({ ray, t: turnFrom(out.dir, ray.dir) })).filter((x) => x.t > 1e-6 && x.t < S - 1e-6)
      // Its exterior angle, outside: between the side before it run on past the corner and the side after. Once marked or
      // labeled, the run-on is drawn dashed.
      if (corner.angle < 179.999) {
        const key = `${corner.key}|ext`
        const st = c.angles[key]
        const ahead = corner.inDir
        if (st && (st.label !== 'none' || st.mark !== 'none' || SHADES[st.shade]?.fill)) {
          const reachOut = Math.max(46, Math.min(WEDGE + 30, 0.6 * back.length * k))
          lines.push({ id: `ext:${corner.key}`, from: at, to: add(at, mul(ahead, reachOut)), style: 'dashed' })
        }
        drawAngle(key, at, ahead, out.dir, 180 - corner.angle, 0.4 * Math.min(out.length, back.length) * k)
      }
      if (!inner.length) {
        if (corner.angle < 179.999) drawAngle(corner.key, at, out.dir, back.dir, corner.angle, 0.4 * Math.min(out.length, back.length) * k)
      } else {
        const fan = [{ ray: out, t: 0 }, ...inner.sort((x, y) => x.t - y.t), { ray: back, t: S }]
        for (let i = 0; i + 1 < fan.length; i++) {
          const [x, y] = [fan[i], fan[i + 1]]
          drawAngle(`${corner.key}|${x.ray.id}~${y.ray.id}`, at, x.ray.dir, y.ray.dir, ((y.t - x.t) * 180) / Math.PI, 0.4 * Math.min(x.ray.length, y.ray.length) * k)
        }
      }
    } else if (corner) {
      // A corner on a curve: no angle of its own, but where lines leave it into the shape, the angles between them and its
      // straight side.
      const [out, back] = v.rays
      const S = Math.PI - Math.atan2(vec.cross(corner.inDir, corner.outDir), vec.dot(corner.inDir, corner.outDir))
      const inner = v.rays.slice(2).map((ray) => ({ ray, t: turnFrom(out.dir, ray.dir) })).filter((x) => x.t > 1e-6 && x.t < S - 1e-6)
      const fan = [{ ray: out, t: 0 }, ...inner.sort((x, y) => x.t - y.t), { ray: back, t: S }]
      for (let i = 0; i + 1 < fan.length; i++) {
        const [x, y] = [fan[i], fan[i + 1]]
        if (x.ray.curved || y.ray.curved || (x.ray === out && y.ray === back)) continue
        drawAngle(`${corner.key}|${x.ray.id}~${y.ray.id}`, at, x.ray.dir, y.ray.dir, ((y.t - x.t) * 180) / Math.PI, 0.4 * Math.min(x.ray.length, y.ray.length) * k)
      }
    } else if (!corner && v.rays.length > 1) {
      // Inside the shape: every angle round the point between neighboring rays, leaving out a line running straight on.
      const round = v.rays.map((ray) => ({ ray, t: turnFrom(v.rays[0].dir, ray.dir) })).sort((x, y) => x.t - y.t)
      round.forEach((x, i) => {
        const y = round[(i + 1) % round.length]
        const deg = (((y.t - x.t + 2 * Math.PI) % (2 * Math.PI)) * 180) / Math.PI
        if (deg < 1e-4 || Math.abs(deg - 180) < 1e-4 || deg > 359.999) return
        drawAngle(`${v.key}|${x.ray.id}~${y.ray.id}`, at, x.ray.dir, y.ray.dir, deg, 0.4 * Math.min(x.ray.length, y.ray.length) * k)
      })
    }
    pick.spots.push({ key: v.key, at, line: null, name: corner ? 'Corner' : 'Point' })
    const name = c.points[v.key]
    if (name !== undefined) {
      dots.push(at)
      const box = name.trim() ? layoutMath(name.trim(), NAME_FS) : null
      let away: Vec
      if (corner) {
        // Outside the corner: away from the middle of its two sides' directions.
        away = unit(add(corner.inDir, mul(corner.outDir, -1)))
        if (len(away) < 1e-6) away = mul(perp(corner.outDir), -1)
        if (corner.angle !== null && corner.angle > 180) away = mul(away, -1)
      } else {
        // Inside: in the middle of the widest gap between its lines, choosing one whose angle isn't labeled where it can.
        const round = v.rays.map((ray) => turnFrom(v.rays[0].dir, ray.dir)).sort((x, y) => x - y)
        const gaps = round.map((t, i) => {
          const next = i + 1 < round.length ? round[i + 1] : round[0] + 2 * Math.PI
          return { t, span: next - t }
        })
        const labeled = (g: { t: number; span: number }) =>
          labels.some((l) => l.part.startsWith(`a:${v.key}|`) && Math.abs(turnFrom(v.rays[0].dir, unit(sub([l.cx, l.cy], at))) - (g.t + g.span / 2)) < g.span / 2)
        const best = [...gaps].sort((x, y) => Number(labeled(x)) - Number(labeled(y)) || y.span - x.span)[0]
        away = turnBy(v.rays[0].dir, best.t + best.span / 2)
      }
      if (box) place(`v:${v.key}`, box, add(at, mul(away, 7 + reach(box, away))), away, perp(away))
    }
  }

  // Rays: where each leaves the shape, the angles it makes either side with the outline there.
  const heads: Vec[][] = []
  const openHeads: Vec[][] = []
  const runEnds: Vec[] = []
  const runAngles = (key: string, x: Vec, d: Vec) => {
    const corner = o.corners.find((cn) => len(sub(cn.at, x)) < 1e-6)
    const e = corner ? null : edgeAt(o, x)
    const along: Vec[] = corner ? [corner.outDir, mul(corner.inDir, -1)]
      : e?.kind === 'line' ? [unit(sub(e.q, e.p)), unit(sub(e.p, e.q))]
      : e ? [perp(unit(sub(x, e.c))), mul(perp(unit(sub(x, e.c))), -1)]
      : []
    along.forEach((side, i) => {
      const t = turnFrom(d, side)
      const deg = (t * 180) / Math.PI
      if (deg < 1e-4 || Math.abs(deg - 180) < 1e-4 || deg > 359.999) return
      const at = px(x)
      if (deg < 180) drawAngle(`${key}|run~${i}`, at, d, side, deg, WEDGE)
      else drawAngle(`${key}|run~${i}`, at, side, d, 360 - deg, WEDGE)
    })
  }

  // Extra lines, with their ticks and label beside the middle.
  for (const l of c.lines) {
    const ends = lineEnds(o.placed, l)
    if (!ends) continue
    const [p, q] = ends.map(px)
    const ray = l.ray ?? NO_RAY
    // A hidden line isn't drawn as it prints, only faintly while the shape is built, so it can still be picked.
    const hidden = l.style === 'hidden'
    const look = { style: (l.style === 'hidden' ? 'dashed' : l.style) as LineStyle, width: WEIGHT[l.weight ?? 'regular'], ...(hidden ? { pale: true } : {}) }
    if (hidden && !far) {
      // Its run-ons' angles can still be labeled.
      ;([[ray.a, ends[0], ends[1], 'a'], [ray.b, ends[1], ends[0], 'b']] as const).forEach(([cap, end, other, name]) => {
        if (cap === null) return
        const d = unit(sub(end, other))
        runAngles(`${l.id}:${name}`, add(end, mul(d, exitAlong(o, end, d))), d)
      })
    } else if (ray.a === null && ray.b === null) lines.push({ id: l.id, from: p, to: q, ...look })
    else {
      // Each end running on: out of sight, or cut off past the shape with its cap. The angle where it leaves the shape can be labeled.
      const drawnTo: Vec[] = []
      ;([[ray.a, ends[0], ends[1], 'a'], [ray.b, ends[1], ends[0], 'b']] as const).forEach(([cap, end, other, name]) => {
        const tipAt = px(end)
        if (cap === null) return void drawnTo.push(tipAt)
        const d = unit(sub(end, other))
        if (far) return void drawnTo.push(add(tipAt, mul(d, FAR)))
        const out = exitAlong(o, end, d)
        const leave = px(add(end, mul(d, out)))
        const tip = add(leave, mul(d, RUN))
        runEnds.push(tip)
        const base = add(tip, mul(d, -HEAD))
        const head = [add(base, mul(perp(d), HEAD_W)), tip, add(base, mul(perp(d), -HEAD_W))]
        if (cap === 'triangle') heads.push(head)
        else if (cap === 'line') openHeads.push(head)
        else if (cap === 'circle') dots.push(tip)
        drawnTo.push(cap === 'triangle' ? add(tip, mul(d, -HEAD * 0.6)) : tip)
        runAngles(`${l.id}:${name}`, add(end, mul(d, out)), d)
      })
      lines.push({ id: l.id, from: drawnTo[0], to: drawnTo[1], seg: [p, q], ...look })
    }
    const h = heightMarks(o.placed, l)
    if (h) {
      const at = px(h.foot)
      if (l.right) marks.squares.push([add(at, mul(h.up, MARKS.square)), add(at, add(mul(h.up, MARKS.square), mul(h.along, MARKS.square))), add(at, mul(h.along, MARKS.square))])
      if (h.run) lines.push({ id: `run:${l.id}`, from: px(h.run[0]), to: px(h.run[1]), style: 'dotted' })
    }
    const t = unit(sub(q, p))
    let nrm = perp(t)
    if (nrm[1] > 1e-9 || (Math.abs(nrm[1]) <= 1e-9 && nrm[0] < 0)) nrm = mul(nrm, -1) // above, or to the right
    const mid = mul(add(p, q), 0.5)
    ticks.push(...tickMarks(mid, t, nrm, l.ticks, TICK, TICK_GAP))
    const box = lengthBox(l.label, l.text, len(sub(ends[1], ends[0])))
    if (box) place(`l:${l.id}`, box, add(mid, mul(nrm, (l.ticks ? TICK + 6 : 6) + reach(box, nrm))), t, nrm)
    pick.segments.push({ id: `l:${l.id}`, kind: 'extra', from: p, to: q })
  }

  // Semicircles and quarter circles: the radius out to the middle of the curve, and the center.
  for (const [id, semi] of Object.entries(c.semis)) {
    const pl = o.placed.get(id)
    if (!pl?.arc) continue
    const s = { ...SEMI_DEFAULTS, ...semi }
    const center = px(pl.arc.c)
    if (s.radius) {
      const top = px(onArc(pl, (pl.arc.lo + pl.arc.hi) / 2))
      lines.push({ id: `radius:${id}`, from: center, to: top, style: 'solid' })
      const along = unit(sub(top, center))
      const beside = perp(along)
      const box = lengthBox(s.radiusLabel, s.radiusText, pl.arc.r)
      if (box) place(`r:${id}`, box, add(mul(add(center, top), 0.5), mul(beside, 6 + reach(box, beside))), along, beside)
    }
    if (s.center !== null) {
      dots.push(center)
      const box = s.center.trim() ? layoutMath(s.center.trim(), NAME_FS) : null
      const down = mul(pl.out, -1)
      if (box) place(`o:${id}`, box, add(center, mul(down, 7 + reach(box, down))), down, perp(down))
    }
  }

  // Sides drawn other than solid and regular: their loop goes a side at a time, leaving out hidden ones.
  const edges: Drawn['edges'] = []
  for (const loop of o.loops.filter((lp) => lp.some(styled)))
    for (const e of loop) {
      const s = edgeStyle(e)
      if (s.style === 'hidden') continue
      const pts = e.kind === 'line' ? [px(e.p), px(e.q)] : arcPoints(e, 48, k)
      edges.push({ d: 'M' + pts.map((p) => `${r1(p[0])},${r1(p[1])}`).join(' L'), style: s.style, width: WEIGHT[s.weight] })
    }

  // What an export keeps: the shape and its labels, plus a margin.
  let crop: Drawn['crop'] = null
  if (o.placed.size) {
    const pts: Vec[] = []
    for (const loop of o.loops) for (const e of loop) pts.push(...(e.kind === 'line' ? [px(e.p), px(e.q)] : arcPoints(e, 16, k)))
    for (const l of labels) pts.push([l.x, l.y - l.box.asc], [l.x + l.box.w, l.y + l.box.desc])
    for (const tip of runEnds) pts.push(add(tip, [-HEAD_W, -HEAD_W]), add(tip, [HEAD_W, HEAD_W]))
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const [x1, y1, x2, y2] = [Math.min(...xs) - PAD, Math.min(...ys) - PAD, Math.max(...xs) + PAD, Math.max(...ys) + PAD]
    crop = { x: r1(x1), y: r1(y1), w: r1(x2 - x1), h: r1(y2 - y1) }
  }

  return {
    o, k, paths: o.loops.filter((loop) => !loop.some(styled)).map((loop) => loopPath(loop, k)), edges, fills, wedges, arcs: marks.arcs, squares: marks.squares, ticks, arrows, lines, heads, openHeads, dots, labels, crop, pick,
  }
}
