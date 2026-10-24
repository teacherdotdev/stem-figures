// Lays out a circle figure for CircleFigure.svelte to draw, and works out what
// the teacher can point at on it: every point, line, angle, arc and place
// where lines cross or meet the circle.
//
// The circle is always drawn the same size, radius R, with its center at the
// SVG's origin, so dragging a point round it never moves or rescales it; the
// frame grows to hold whatever runs past it and the labels.

import { LABEL_SCALE } from '$shared/labelSize'
import { layoutMath, type MathBox } from '$lib/shared/mathSvg.js'
import type { PlacedLabel } from '$lib/shapes/layout.js'
import { roundTo } from '$lib/shapes/parts.js'
import { add, cross, dot, len, mul, perp, r1, reach, sub, unit, type Vec } from '$lib/shapes/vec.js'
import { angleMark, parallelArrows, sectorPath, tickMarks } from '$lib/labeling/marks.js'
import type { Pickable } from '$lib/labeling/pick.js'
import { SHADES } from '$lib/labeling/options.js'
import { ANGLE_DEFAULTS, ARC_DEFAULTS, ARC_DRAWS, CENTER, midKey, readRadius, type AngleStyle, type LineStyle, type Settings } from './settings.js'
import { findFaces } from './faces.js'
import { KIND_NAMES, buildGeometry, degOf, type Angle, type Corner, type GeoLine, type Node } from './geometry.js'

export type { PlacedLabel, Vec }

/** The key of the whole circle, clickable while there's no place on it to split it into arcs. */
export const WHOLE = 'circle'
/** The circle's radius on the page. */
export const R = 130
const BASE_FS = 20 // label font size, at medium labels
const BASE_NAME_FS = 21
const PAD = 12
const ARC = 20 // angle arc radius
const ARC_GAP = 4.5 // between congruence arcs
const WEDGE = 40 // shading's radius, and the highlight's
const SQUARE = 13 // right-angle square
const LINE_W = 2.2
const HEAD = 12 // an arrowhead's length, and
const HEAD_W = 5.5 // half its width
const TICK = 7
const TICK_GAP = 5
const ARROW = 4.5
const ARROW_W = 5
const ARROW_GAP = 6
export const DOT = 3.5
const RAD = Math.PI / 180

/** A direction in the figure's own units (y up) as one on the page (y down). */
const page = (u: Vec): Vec => [u[0], -u[1]]
const px = (p: Vec): Vec => [p[0] * R, -p[1] * R]
const angleOn = (deg: number): Vec => [Math.cos(deg * RAD), Math.sin(deg * RAD)]

export const isRight = (measure: number) => Math.abs(measure - 90) < 1e-4
/**
 * An angle's style. The first right angle at each place has its square drawn
 * on its own (`auto`), until the teacher takes it off: one square where a
 * radius meets a tangent, not one each side.
 */
export const autoStyle = (auto: boolean): AngleStyle => (auto ? { ...ANGLE_DEFAULTS, mark: 'right' } : ANGLE_DEFAULTS)
export const angleStyle = (s: Settings, key: string, auto: boolean): AngleStyle => s.angles[key] ?? autoStyle(auto)

/** A place on the figure's name, as the left card and popups write it. */
export function nodeName(s: Settings, key: string): string {
  if (key === CENTER) return s.centerName.trim() || 'the center'
  const p = s.points.find((x) => x.id === key)
  if (p) return p.name.trim() || 'a point'
  if (key.endsWith(':mid')) {
    const l = s.lines.find((x) => x.id === key.split(':')[0])
    return s.marks[key]?.trim() || `midpoint${l ? ` of ${nodeName(s, l.a)}${nodeName(s, l.b)}` : ''}`
  }
  return s.marks[key]?.trim() || (key.includes('.') ? 'where lines cross' : key.endsWith(':t') ? 'touch point' : 'where a line meets the circle')
}

/** A line's name: its kind and its points, like "Chord AB", "Tangent at A" or "Tangent from P". */
export function lineName(s: Settings, g: Pick<GeoLine, 'kind' | 'line'>) {
  const n = (key: string) => (key === CENTER ? s.centerName : s.points.find((p) => p.id === key)?.name ?? s.marks[key] ?? '').trim()
  if (g.line.kind === 'tangent') return `Tangent${n(g.line.a) ? ` at ${n(g.line.a)}` : ''}`
  if (g.line.kind === 'from') return `Tangent${n(g.line.a) ? ` from ${n(g.line.a)}` : ''}`
  return `${KIND_NAMES[g.kind]} ${n(g.line.a)}${n(g.line.b)}`.trim()
}

/** The figure laid out for CircleFigure.svelte, with what can be pointed at on it. */
export type CircleLayout = ReturnType<typeof buildCircle>

export function buildCircle(s: Settings) {
  const FS = BASE_FS * LABEL_SCALE[s.labelSize]
  const NAME_FS = BASE_NAME_FS * LABEL_SCALE[s.labelSize]
  const geo = buildGeometry(s)
  const radius = readRadius(s.radius)
  const unitText = s.unit.trim() ? ` ${s.unit.trim()}` : ''
  const rounded = (v: number) => roundTo(v, s.round)

  const labels: PlacedLabel[] = []
  const boxAt = (box: MathBox, [cx, cy]: Vec) => ({ l: cx - box.w / 2 - 2, r: cx + box.w / 2 + 2, t: cy - (box.asc + box.desc) / 2 - 1, b: cy + (box.asc + box.desc) / 2 + 1 })
  const overlaps = (box: MathBox, c: Vec) => {
    const a = boxAt(box, c)
    return labels.some((l) => {
      const b = boxAt(l.box, [l.cx, l.cy])
      return a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b
    })
  }
  const place = (part: string, box: MathBox, [cx, cy]: Vec, out: Vec) => {
    labels.push({ part, box, cx, cy, x: cx - box.w / 2, y: cy + (box.asc - box.desc) / 2, along: out, across: perp(out), offset: [0, 0] })
  }
  /** Out from `v` along `out` (on the page), as far as it takes to clear the labels already down. */
  const placeOut = (part: string, box: MathBox, v: Vec, out: Vec, gap: number) => {
    let d = gap + reach(box, out)
    for (let n = 0; n < 12 && overlaps(box, add(v, mul(out, d))); n++) d += 4
    place(part, box, add(v, mul(out, d)), out)
  }

  // Each line as drawn: from its lo end to its hi end, on the page.
  const segments = geo.lines.map((g) => ({
    id: g.id,
    kind: 'line',
    name: lineName(s, g),
    from: px(add(g.P, mul(g.d, g.lo))),
    to: px(add(g.P, mul(g.d, g.hi))),
    style: g.line.style as LineStyle,
  }))

  const dots: Vec[] = []
  const pointDot = (n: Node) => (n.kind === 'center' ? s.centerDot : n.kind === 'point' ? s.dots : n.key in s.marks)
  for (const n of geo.nodes) if (pointDot(n)) dots.push(px(n.at))

  // Each angle's style; the first right angle at each place has its square on its own.
  const styles = new Map<string, { style: AngleStyle; auto: boolean }>()
  for (const c of geo.corners) {
    const first = c.angles.find((x) => isRight(x.measure))
    for (const a of c.angles) styles.set(a.key, { style: angleStyle(s, a.key, a === first), auto: a === first })
  }
  const marked = (st: AngleStyle) => st.label !== 'none' || st.mark !== 'none' || !!st.shade

  /**
   * Which way a name goes from its place: into the widest gap between the
   * rays there not taken by a labeled or marked angle, and for a place on the
   * circle, outside it, between the circle's own directions there.
   */
  function nameWay(c: Corner): Vec {
    const n = c.node
    const dirs = c.rays.map((r) => r.u)
    if (n.onCircle) dirs.push(perp(n.at), mul(perp(n.at), -1))
    if (!dirs.length) return n.kind === 'center' ? unit([-0.55, -0.85]) : unit(n.at)
    const sorted = [...dirs].sort((a, b) => degOf(a) - degOf(b)).filter((u, i, all) => i === 0 || degOf(u) - degOf(all[i - 1]) > 1e-6)
    let best: { way: Vec; score: number } | null = null
    sorted.forEach((u, i) => {
      const next = sorted[(i + 1) % sorted.length]
      const gap = sorted.length === 1 ? 360 : (((degOf(next) - degOf(u)) % 360) + 360) % 360
      const way = angleOn(degOf(u) + gap / 2)
      if (n.onCircle && dot(way, n.at) < 0) return
      const taken = c.angles.some((a) => marked(styles.get(a.key)!.style) && Math.abs(degOf(a.from.u) - degOf(u)) < 1e-6)
      const score = gap * (taken ? 0.3 : 1)
      if (!best || score > best.score + 1e-9) best = { way, score }
    })
    return best ? (best as { way: Vec }).way : unit(n.at)
  }

  // Names: the points on the circle, the center, and named crossings and meetings with the circle.
  for (const c of geo.corners) {
    const n = c.node
    const text = n.kind === 'center' ? s.centerName : n.kind === 'point' ? s.points.find((p) => p.id === n.key)!.name : s.marks[n.key]
    const box = text?.trim() ? layoutMath(text.trim(), NAME_FS) : null
    if (!box) continue
    placeOut(`pt:${n.key}`, box, px(n.at), page(nameWay(c)), n.kind === 'center' && !c.rays.length ? 5 : 8)
  }

  // Lines' marks and labels: ticks and parallel arrows across the middle (a quarter of the way from the
  // center, for a line through it, to keep clear of the center), the label beside them.
  const ticks: [Vec, Vec][] = []
  const arrows: Vec[][] = []
  for (const g of geo.lines) {
    const l = g.line
    // A tangent at a point runs both ways from it; every other line has its ends at its places.
    const tangent = g.line.kind === 'tangent'
    const t = page(g.d)
    let midAt = tangent ? (g.hi > 0 ? g.hi * 0.6 : g.lo * 0.6) : g.length / 2
    if (!tangent && len(add(g.P, mul(g.d, midAt))) < 0.05) midAt = g.length * 0.75
    const mid = px(add(g.P, mul(g.d, midAt)))
    // Away from the center, unless the line runs through it (then above, or to the right).
    const m = add(g.P, mul(g.d, midAt))
    let nrm = perp(t)
    const through = Math.abs(cross(g.d, g.P)) < 1e-6
    if (through) {
      if (nrm[1] > 1e-9 || (Math.abs(nrm[1]) <= 1e-9 && nrm[0] < 0)) nrm = mul(nrm, -1)
    } else if (dot(nrm, page(m)) < 0) nrm = mul(nrm, -1)
    const both = l.ticks && l.arrows
    // Once its midpoint is used, its ticks go on each half, to show they're equal.
    const halves = geo.nodes.some((n) => n.key === midKey(g.id))
    if (halves) for (const k of [0.25, 0.75]) ticks.push(...tickMarks(px(add(g.P, mul(g.d, g.length * k))), t, nrm, l.ticks, TICK, TICK_GAP))
    else ticks.push(...tickMarks(both ? add(mid, mul(t, -(l.ticks * TICK_GAP) / 2 - 4)) : mid, t, nrm, l.ticks, TICK, TICK_GAP))
    const way = t[0] > 1e-9 || (Math.abs(t[0]) <= 1e-9 && t[1] > 0) ? t : mul(t, -1)
    arrows.push(...parallelArrows(both ? add(mid, mul(way, (l.arrows * ARROW_GAP) / 2 + 4)) : mid, way, nrm, l.arrows, ARROW, ARROW_W, ARROW_GAP))
    const measure = radius !== null && !tangent ? g.length * radius : null
    const box = l.label === 'text' ? layoutMath(l.text, FS) : l.label === 'measure' && measure !== null ? layoutMath(rounded(measure), FS, { suffix: unitText }) : null
    if (!box) continue
    const gap = l.ticks || l.arrows ? TICK + 6 : 6
    // A chord's label goes inside the circle when there's no room between it and the circle.
    const room = (1 - len(m)) * R
    // Along the line, clear of any place on it where another line crosses: in the middle of the longest stretch between them.
    const along = geo.nodes
      .map((n) => dot(sub(n.at, g.P), g.d))
      .filter((t, i) => Math.abs(cross(g.d, sub(geo.nodes[i].at, g.P))) < 1e-6 && t > g.lo + 1e-6 && t < g.hi - 1e-6)
    const half = (reach(box, t) + 6) / R
    let labelAt = midAt
    if (along.some((t) => Math.abs(t - midAt) < half)) {
      const stops = [tangent ? g.lo : 0, ...along, tangent ? g.hi : g.length].sort((x, y) => x - y)
      let best = 0
      stops.slice(1).forEach((t, i) => t - stops[i] > best && ((best = t - stops[i]), (labelAt = (t + stops[i]) / 2)))
    }
    const base = px(add(g.P, mul(g.d, labelAt)))
    // Where it goes by itself: away from the center, unless there's no room (or another label's in the way) there.
    let side = !through && !tangent && room < 2 * reach(box, nrm) + gap + 6 ? mul(nrm, -1) : nrm
    const spot = (way: Vec) => add(base, mul(way, gap + reach(box, way)))
    if (overlaps(box, spot(side))) side = mul(side, -1)
    // Dragged across the line, it goes on the other side.
    if (l.flip) side = mul(side, -1)
    // Still in another label's way, it slides along the line, as far as the line goes.
    let center = spot(side)
    const [lo, hi] = [((tangent ? g.lo : 0) - labelAt) * R, ((tangent ? g.hi : g.length) - labelAt) * R]
    for (let k = 1; k <= 16 && overlaps(box, center); k++) {
      const tries = [k * 6, -k * 6].filter((d) => d > lo && d < hi).map((d) => add(spot(side), mul(t, d)))
      center = tries.find((c) => !overlaps(box, c)) ?? center
    }
    place(`line:${g.id}`, box, center, side)
  }

  // Arcs: drawn bold or in a color, ticks across the middle, and the label outside the circle.
  const arcPath = (start: number, sweep: number, r = R) => {
    if (sweep >= 360 - 1e-9) {
      const [a, b] = [px(mul(angleOn(start), r / R)), px(mul(angleOn(start + 180), r / R))]
      return `M${r1(a[0])},${r1(a[1])} A${r},${r} 0 1 0 ${r1(b[0])},${r1(b[1])} A${r},${r} 0 1 0 ${r1(a[0])},${r1(a[1])}`
    }
    const [a, b] = [px(mul(angleOn(start), r / R)), px(mul(angleOn(start + sweep), r / R))]
    // Counterclockwise on the page, which SVG calls sweep 0.
    return `M${r1(a[0])},${r1(a[1])} A${r},${r} 0 ${sweep > 180 ? 1 : 0} 0 ${r1(b[0])},${r1(b[1])}`
  }
  const arcStrokes: { d: string; color: string }[] = []
  const hidden: string[] = []
  const shownArcs: string[] = []
  const curves: NonNullable<Pickable['curves']> = []
  for (const a of geo.arcs) {
    const style = s.arcs[a.key] ?? ARC_DEFAULTS
    const d = arcPath(a.start, a.sweep)
    const color = ARC_DRAWS[style.draw].color
    if (color) arcStrokes.push({ d, color })
    if (style.draw === 'hidden') hidden.push(d)
    else shownArcs.push(d)
    const u = angleOn(a.start + a.sweep / 2)
    const mid = px(u)
    const out = page(u)
    ticks.push(...tickMarks(mid, perp(out), out, style.ticks, TICK, TICK_GAP))
    const length = radius !== null ? a.sweep * RAD * radius : null
    const box =
      style.label === 'text' ? layoutMath(style.text, FS)
      : style.label === 'degrees' ? layoutMath(rounded(a.sweep), FS, { suffix: '°' })
      : style.label === 'length' && length !== null ? layoutMath(rounded(length), FS, { suffix: unitText })
      : null
    if (box) placeOut(`arc:${a.key}`, box, mid, out, style.ticks ? TICK + 6 : 7)
    curves.push({ key: a.key, d, anchor: mid, name: `Arc ${nodeName(s, a.from)}${a.to !== a.from ? nodeName(s, a.to) : ''}` })
  }

  // With no place on the circle yet, the whole circle can be clicked, to put a point on it.
  if (!geo.arcs.length) curves.push({ key: WHOLE, d: arcPath(90, 360), anchor: px([0, 1]), name: 'The circle' })

  // The enclosed areas: each can be clicked, and shaded.
  const faces = findFaces(geo)
  const areas = faces.map((f) => ({ key: f.key, d: f.path(px, R), anchor: px(f.inside), name: 'Enclosed area', face: f }))
  const regions = areas.filter((a) => SHADES[s.faces[a.key]]?.fill).map((a) => ({ d: a.d, fill: SHADES[s.faces[a.key]].fill }))

  // Each angle: arcs or a right-angle square, its label, and where the teacher can point at it.
  const arcs: string[] = []
  const squares: Vec[][] = []
  const marks = { arcs, squares }
  const MARK_SIZES = { arc: ARC, arcGap: ARC_GAP, square: SQUARE }
  const angles = geo.corners.flatMap((c) =>
    c.angles.map((a: Angle) => {
      const { style, auto } = styles.get(a.key)!
      const v = px(c.node.at)
      // Clockwise on the page from the angle's last ray round to its first is counterclockwise in the figure.
      const [e1, e2] = [page(a.to.u), page(a.from.u)]
      const large = a.measure > 180
      const radius = Math.max(16, Math.min(WEDGE, 0.4 * R * Math.min(a.from.room, a.to.room)))
      const wedge = sectorPath(v, e1, e2, radius, true, large)
      const right = isRight(a.measure)
      const outer = angleMark(marks, v, e1, e2, style.mark, right, large, MARK_SIZES)
      const box = style.label === 'text' ? layoutMath(style.text, FS) : style.label === 'measure' ? layoutMath(rounded(a.measure), FS, { suffix: '°' }) : null
      // Far enough in to clear the arc, and to fit between the angle's two rays.
      const mid = large ? mul(unit(add(e1, e2)), -1) : unit(add(e1, e2))
      const midWay = len(add(e1, e2)) < 1e-9 ? perp(e2) : mid
      const half = Math.sin((Math.min(a.measure, 179) * RAD) / 2)
      const distance = (b: MathBox) => {
        const toSide = a.measure >= 180 ? 0 : Math.max(...[e1, e2].map((e) => (reach(b, perp(e)) + 3) / half))
        return Math.max(outer + 5 + reach(b, midWay), toSide, 12 + reach(b, midWay))
      }
      if (box) {
        let d = distance(box)
        for (let n = 0; n < 12 && overlaps(box, add(v, mul(midWay, d))); n++) d += 4
        place(`angle:${a.key}`, box, add(v, mul(midWay, d)), midWay)
      }
      const ghostBox = layoutMath(rounded(a.measure), FS, { suffix: '°' })!
      return {
        key: a.key,
        node: c.node.key,
        rays: [a.from.ray, a.to.ray],
        measure: a.measure,
        right,
        /** Whether its square comes on its own. */
        auto,
        wedge,
        ghost: { at: add(v, mul(midWay, distance(ghostBox))), text: `${rounded(a.measure)}°` },
        anchor: add(v, mul(midWay, radius * 0.7)),
      }
    }),
  )

  // Each run-on end's cap: a filled arrowhead or an open one pointing out, or a dot. The line stops
  // short of an arrow's tip, so its round end doesn't poke past the point.
  const heads: Vec[][] = []
  const openHeads: Vec[][] = []
  const drawn = new Map<string, [Vec, Vec]>()
  for (const [i, g] of geo.lines.entries()) {
    const seg = segments[i]
    const ends: Vec[] = []
    const runs = g.line.kind === 'tangent' ? [g.lo < 0, g.hi > 0] : [g.line.runA, g.line.runB]
    for (const [cap, run, tip, from] of [[g.line.capA, runs[0], seg.from, seg.to], [g.line.capB, runs[1], seg.to, seg.from]] as const) {
      if (!run || len(sub(tip, from)) < 1e-9) {
        ends.push(tip)
        continue
      }
      const d = unit(sub(tip, from))
      const base = add(tip, mul(d, -HEAD))
      const head = [add(base, mul(perp(d), HEAD_W)), tip, add(base, mul(perp(d), -HEAD_W))]
      if (cap === 'triangle') heads.push(head)
      else if (cap === 'line') openHeads.push(head)
      else if (cap === 'circle') dots.push(tip)
      ends.push(cap === 'triangle' ? add(tip, mul(d, -HEAD * 0.6)) : cap === 'line' ? add(tip, mul(d, -LINE_W / 2)) : tip)
    }
    drawn.set(g.id, [ends[0], ends[1]])
  }

  // The frame holds the circle, the lines, their caps and every label.
  const extent: Vec[] = [[-R, -R], [R, R], ...segments.flatMap((g) => [g.from, g.to]), ...heads.flat(), ...openHeads.flat()]
  for (const l of labels) extent.push([l.cx - l.box.w / 2, l.y - l.box.asc], [l.cx + l.box.w / 2, l.y + l.box.desc])
  for (const [x, y] of dots) extent.push([x - DOT, y - DOT], [x + DOT, y + DOT])
  const minX = Math.min(...extent.map((p) => p[0])) - PAD
  const minY = Math.min(...extent.map((p) => p[1])) - PAD
  const maxX = Math.max(...extent.map((p) => p[0])) + PAD
  const maxY = Math.max(...extent.map((p) => p[1])) + PAD
  const frame = { x: r1(minX), y: r1(minY), w: r1(maxX - minX), h: r1(maxY - minY) }

  return {
    geo,
    frame,
    segments: segments.map((g) => ({ ...g, drawn: drawn.get(g.id)! })),
    arcStrokes,
    /** The circle as drawn: whole, or the arcs not hidden; and the hidden ones, shown faintly while the figure is edited. */
    circle: hidden.length ? shownArcs : null,
    hidden,
    /** Every enclosed area, which can be clicked, and the shaded ones, under everything. */
    areas,
    regions,
    heads,
    openHeads,
    arcs,
    squares,
    ticks,
    arrows,
    dots,
    labels,
    angles,
    curves,
    /** The points, which are dragged and clicked, and the center, which is clicked. */
    // A point on the circle is dragged round it, and one off it anywhere; the center and touch points are only clicked.
    handles: geo.nodes
      .filter((n) => n.kind === 'center' || n.kind === 'point' || n.kind === 'touch' || n.kind === 'mid')
      .map((n) => ({ key: n.key, at: px(n.at), dir: n.kind === 'point' ? degOf(n.at) : null, dist: n.kind === 'point' ? len(n.at) : null, on: n.onCircle }))
      // And the middle of every line between two places, to join to or name, though it isn't a place on the figure yet.
      .concat(
        [...geo.where]
          .filter(([key, at]) => key.endsWith(':mid') && !geo.nodes.some((n) => n.key === key || len(sub(n.at, at)) < 1e-6))
          .map(([key, at]) => ({ key, at: px(at), dir: null, dist: null, on: false })),
      ),
    /** Where lines cross or meet the circle, where a point can be named. */
    spots: geo.nodes
      .filter((n) => n.kind === 'crossing' || n.kind === 'meet')
      .map((n) => ({ key: n.key, at: px(n.at), line: null as string | null, name: n.kind === 'crossing' ? 'Point where lines cross' : 'Point where a line meets the circle' })),
  }
}
