// Where everything in a Ray Diagram goes, in drawing units (px): the lens or
// mirror on the principal axis, the focal points, the object, the principal
// rays and the image, with their labels, dimension arrows and the cm scale.
//
// The figure is drawn to scale, the same across as up, from ./optics. It is
// fitted to hold the object, the focal points (2F′ on a lens's far side, C on
// a mirror) and the image, as long as the image is no more than CAP focal
// lengths from the lens or mirror. An image farther out than that (an object
// just outside F) is left off and the rays run off the edge. Rays and their
// dashed lines are clipped to the frame round the drawing.
//
// The layout is the same whatever is shown, so a blank setup and its
// completed figure line up: the image, the rays and their labels' places are
// worked out every time, and only drawn when shown.

import { LABEL_SCALE } from '$shared/labelSize'
import type { Label } from '$lib/shared/label'
import { LABEL_SIZE, boxCorners, labelBox, placeLabels, pt, seg, type Box, type Placing } from '$lib/shared/layout'
import type { Point, Segment } from '$lib/shared/vector'
import {
  RAYS_OF,
  focalPoints,
  imageOf,
  isLens,
  principalRays,
  signedFocal,
  type Element,
  type Point as CmPoint,
  type PrincipalRay,
  type RayId,
} from './optics'
import type { RaySettings, Shown } from './settings'

/** How far from the lens or mirror an image can be and still be drawn, in focal lengths. */
export const CAP = 6
/** The largest the part inside the frame is drawn, in px. */
const MAX_W = 720
const MAX_H = 440
/** Room in the frame beside the outermost things, and above and below the lens or mirror. */
const SIDE = 34
const END = 18
/** The label size at Medium. */
const BASE_LABEL = 20
/** The smallest the lens or mirror is drawn, as a fraction of the figure's width, either side of the axis. */
const MIN_HALF = 0.16

export interface Head {
  x: number
  y: number
  angle: number
}

/** One principal ray as drawn: solid where light goes, dashed where it only seems to come from, with small arrowheads along it. */
export interface DrawnRay {
  id: RayId
  solid: Segment[]
  dashed: Segment[]
  heads: Head[]
}

export interface Arrow {
  base: Point
  tip: Point
}

/** A dimension arrow, with thin lines out to what it measures and its label. */
export interface Mark {
  id: 'do' | 'di' | 'f' | 'ho' | 'hi'
  line: Segment
  extensions: Segment[]
  label: Label
  at: Point
}

export interface FocalMark {
  id: 'f' | 'fBack' | 'twoF' | 'twoFBack' | 'c'
  dot: Point
  label: Label
  at: Point
}

export interface Ruler {
  line: Segment
  ticks: Segment[]
  numbers: { x: number; y: number; text: string }[]
  unit: Point
  size: number
}

/** The lens or mirror as drawn. */
export interface ElementDrawing {
  kind: Element
  /** the outline: a lens's shape, or a mirror's arc or line */
  path: string
  /** a lens shape is filled */
  filled: boolean
  /** the line symbol's two arrowheads */
  heads: string[]
  /** the hatching on a mirror's back */
  hatches: Segment[]
}

export interface RayFigure {
  /** the drawing's box: it starts at (left, top) */
  left: number
  top: number
  width: number
  height: number
  /** the frame rays are clipped to */
  frame: Box
  axis: Segment
  /** the middle of the lens or mirror */
  center: Point
  /** how far the lens or mirror reaches above the axis and below it */
  up: number
  down: number
  element: ElementDrawing
  points: FocalMark[]
  object: Arrow
  objectLabelAt: Point
  /** the image, when it's within the figure and shown */
  image: (Arrow & { real: boolean }) | null
  imageLabelAt: Point | null
  /** where the image's tip is, when it's within the figure, shown or not */
  imageTip: Point | null
  rays: DrawnRay[]
  marks: Mark[]
  ruler: Ruler | null
  /** px per cm */
  k: number
  labelSize: number
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** The part of the segment a–b inside the box (Liang–Barsky), or null if none is. */
export function clip(a: Point, b: Point, box: { x: number; y: number; w: number; h: number }): Segment | null {
  const dx = b.x - a.x
  const dy = b.y - a.y
  let t0 = 0
  let t1 = 1
  const sides: [number, number][] = [
    [-dx, a.x - box.x],
    [dx, box.x + box.w - a.x],
    [-dy, a.y - box.y],
    [dy, box.y + box.h - a.y],
  ]
  for (const [p, q] of sides) {
    if (p === 0) {
      if (q < 0) return null
      continue
    }
    const r = q / p
    if (p < 0) t0 = Math.max(t0, r)
    else t1 = Math.min(t1, r)
    if (t0 > t1) return null
  }
  const s = seg({ x: a.x + dx * t0, y: a.y + dy * t0 }, { x: a.x + dx * t1, y: a.y + dy * t1 })
  return Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < 0.5 ? null : s
}

const length = (v: Segment) => Math.hypot(v.x2 - v.x1, v.y2 - v.y1)
const along = (v: Segment, t: number): Head => ({
  x: Math.round((v.x1 + (v.x2 - v.x1) * t) * 100) / 100,
  y: Math.round((v.y1 + (v.y2 - v.y1) * t) * 100) / 100,
  angle: Math.round((Math.atan2(v.y2 - v.y1, v.x2 - v.x1) * 180) / Math.PI * 100) / 100,
})

/** Which rays the settings turn on, of the ones this lens or mirror has. */
export function raysOn(s: RaySettings): RayId[] {
  const on: Record<RayId, boolean> = { parallel: s.parallelRay, center: s.centerRay, focal: s.focalRay, vertex: s.vertexRay, upper: s.upperRay }
  return RAYS_OF[s.element].filter((id) => on[id])
}

/** Is n 1, 2 or 5 times a power of ten? */
const nice = (n: number) => {
  const lead = n / 10 ** Math.floor(Math.log10(n) + 1e-9)
  return [1, 2, 5].some((m) => Math.abs(lead - m) < 1e-6)
}

/** A cm scale's numbered step and its smallest marks, in cm, at k px per cm: numbers at least 40 px apart, marks at least 8. */
export function rulerSteps(k: number) {
  const majors = [0.5, 1, 2, 5, 10, 20, 50, 100, 200]
  const major = majors.find((m) => m * k >= 40) ?? 500
  const minor = [major / 10, major / 5, major / 4, major / 2, major].filter(nice).find((m) => m * k >= 8)!
  return { major, minor }
}

const numberText = (n: number) => String(Math.round(n * 100) / 100)

export function buildRayFigure(s: RaySettings): RayFigure {
  const e = s.element
  const f = s.focalLength
  const d = s.distance
  const h = s.inverted ? -s.height : s.height
  const fs = signedFocal(e, f)
  const image = imageOf(e, f, d, h)
  const all = principalRays(e, f, d, h)
  const reach = CAP * f
  const within = !!image && (e === 'plane' || Math.abs(image.x) <= reach + 1e-9)
  const focal = focalPoints(e, f)

  // Up and down: the object, the image, and where the rays meet the lens or
  // mirror, unless that's far beyond them (a ray through F with the object
  // just outside F). At least MIN_HALF of the width each way, so the lens or
  // mirror is never a stub. A lens or curved mirror reaches as far either side
  // of the axis; a plane mirror reaches up past where its upper ray meets it,
  // at twice the tip's height, and only a little the other way.
  const tall = Math.max(Math.abs(h), within ? Math.abs(image!.height) : 0)
  const hits = all.map((r) => Math.abs(r.hit.y)).filter((y) => y <= 2.5 * tall)
  const high = 1.2 * Math.max(tall, ...hits)

  // Across: the object, the lens or mirror, its focal points and the image.
  // An image too far out for the figure is left off, and the figure goes
  // toward it only as far as the rays (or their dashed lines back) stay inside
  // it, so they run off its corner rather than leave it half empty.
  const xs = [-d, 0, ...focal.map((p) => p.x)]
  if (within) xs.push(image!.x)
  else if (image) {
    const side = Math.sign(image.x)
    const y = Math.max(high, MIN_HALF * (Math.max(...xs) - Math.min(...xs)))
    const ends = all.map((r) => {
      const dir = image.real ? r.dir : { x: -r.dir.x, y: -r.dir.y }
      if (Math.sign(dir.x) !== side) return 0
      if (dir.y === 0) return Math.abs(r.hit.y) <= y ? reach : 0
      const t = (Math.sign(dir.y) * y - r.hit.y) / dir.y
      return t > 0 ? Math.abs(r.hit.x + t * dir.x) : 0
    })
    xs.push(side * Math.min(reach, Math.max(...ends)))
  }
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const xr = xMax - xMin
  const least = MIN_HALF * xr
  let yUp = Math.max(high, least)
  let yDown = yUp
  if (e === 'plane') {
    const far = Math.max(2.4 * Math.abs(h), least)
    const near = Math.max(0.45 * far, least / 2)
    ;[yUp, yDown] = h > 0 ? [far, near] : [near, far]
  }

  const k = Math.min(MAX_W / xr, MAX_H / (yUp + yDown))
  const W = xr * k + 2 * SIDE
  const H = (yUp + yDown) * k + 2 * END
  const frame: Box = { x: 0, y: 0, w: W, h: H }
  const X = (x: number) => SIDE + (x - xMin) * k
  const axisY = END + yUp * k
  const Y = (y: number) => axisY - y * k
  const px = (p: CmPoint) => pt(X(p.x), Y(p.y))
  const x0 = X(0)
  const center = pt(x0, axisY)

  // The lens or mirror reaches past every ray that meets it inside the frame.
  let up = yUp * k
  let down = yDown * k
  for (const r of all) {
    const y = r.hit.y * k
    if (y > up && y < axisY) up = Math.min(axisY - 2, y + 6)
    if (-y > down && -y < H - axisY) down = Math.min(H - axisY - 2, -y + 6)
  }
  if (e !== 'plane') up = down = Math.max(up, down)

  const sc = (BASE_LABEL / LABEL_SIZE) * LABEL_SCALE[s.labelSize]
  const ls = LABEL_SIZE * sc

  const objectArrow: Arrow = { base: pt(X(-d), axisY), tip: pt(X(-d), Y(h)) }
  const imageTip = within ? pt(X(image!.x), Y(image!.height)) : null
  const imageArrow = within ? { base: pt(X(image!.x), axisY), tip: imageTip!, real: image!.real } : null

  // Arrowheads keep off the focal points and the tips of the object and image.
  const busy = [...focal.map((q) => pt(X(q.x), axisY)), objectArrow.tip, ...(imageTip ? [imageTip] : [])]

  // The rays, as they'd be drawn with everything shown (for placing labels), and as shown.
  const on = raysOn(s)
  const traced = (mode: Shown) => (mode === 'setup' ? [] : all.filter((r) => on.includes(r.id)).map((r) => trace(r, mode)))

  function trace(r: PrincipalRay, mode: Shown): DrawnRay {
    const from = px(r.from)
    const hit = px(r.hit)
    const dir = { x: r.dir.x * k, y: -r.dir.y * k }
    const n = Math.hypot(dir.x, dir.y)
    const u = { x: dir.x / n, y: dir.y / n }
    const far = 1e5
    const solid = [clip(from, hit, frame), clip(hit, { x: hit.x + u.x * far, y: hit.y + u.y * far }, frame)]
    const dashed: (Segment | null)[] = []
    /** how far its dashed lines already run straight back from the hit */
    let back = 0
    const backward = (to: Point) => {
      const v = { x: to.x - hit.x, y: to.y - hit.y }
      const l = Math.hypot(v.x, v.y)
      return l > 0 && Math.abs(v.x * u.y - v.y * u.x) / l < 1e-6 && v.x * u.x + v.y * u.y < 0 ? l : 0
    }
    if (r.backTo) {
      const to = px(r.backTo)
      dashed.push(clip(hit, to, frame))
      back = Math.max(back, backward(to))
    }
    if (r.aim) {
      const [a, b] = r.aim.map(px)
      dashed.push(clip(a, b, frame))
      if (dist(a, hit) < 0.01) back = Math.max(back, backward(b))
    }
    // A virtual image: the ray's dashed line back to it, or off the edge toward it.
    if (mode === 'complete' && image && !image.real) {
      const start = backward(from) ? from : hit
      if (imageTip) {
        if (dist(hit, imageTip) > back + 0.01) dashed.push(clip(start, imageTip, frame))
      } else {
        dashed.push(clip(start, { x: hit.x - u.x * far, y: hit.y - u.y * far }, frame))
      }
    }
    const lines = solid.filter((v): v is Segment => !!v)
    // An arrowhead partway along each solid piece long enough for one, kept
    // apart from the others on the same ray and off the points marked.
    const heads: Head[] = []
    for (const v of lines) {
      if (length(v) < 28) continue
      const spot = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]
        .map((t) => along(v, t))
        .find((a) => heads.every((b) => dist(a, b) > 26) && busy.every((b) => dist(a, b) > 14))
      if (spot) heads.push(spot)
    }
    return { id: r.id, solid: lines, dashed: dashed.filter((v): v is Segment => !!v), heads }
  }

  const element = drawElement(e, s.lensStyle, center, up, down)
  const bodyW = isLens(e) ? Math.max(2 * lensWidth(up), 14) + 4 : 20
  const body: Box = { x: isLens(e) ? x0 : x0 + 4, y: axisY + (down - up) / 2, w: bodyW, h: up + down }

  // Dimension arrows under the frame, each in the first row where it fits.
  const rowGap = ls + 14
  const rowY = (i: number) => H + ls * 0.6 + 8 + i * rowGap
  const spans: { id: Mark['id']; from: number; to: number; label: Label }[] = []
  if (s.doMark) spans.push({ id: 'do', from: X(-d), to: x0, label: s.doLabel })
  if (s.fMark && e !== 'plane') spans.push({ id: 'f', from: X(isLens(e) ? -Math.abs(fs) : -fs), to: x0, label: s.fMarkLabel })
  if (s.diMark && within) spans.push({ id: 'di', from: x0, to: X(image!.x), label: s.diLabel })
  const rows: [number, number][][] = []
  const marks: Mark[] = []
  for (const span of spans) {
    const a = Math.min(span.from, span.to)
    const b = Math.max(span.from, span.to)
    if (b - a < 1) continue
    let row = rows.findIndex((r) => r.every(([c, dd]) => b + 8 < c || a > dd + 8))
    if (row < 0) row = rows.push([]) - 1
    rows[row].push([a, b])
    const y = rowY(row)
    // Out from the axis, or from below the lens or mirror at its end.
    const ext = (x: number) => seg(pt(x, Math.abs(x - x0) < 0.5 ? axisY + down + 4 : axisY + 4), pt(x, y + 6))
    marks.push({ id: span.id, line: seg(pt(a, y), pt(b, y)), extensions: [ext(a), ext(b)], label: span.label, at: pt((a + b) / 2, y) })
  }

  // Heights beside the object and the image, with their labels placed below.
  const gap = 14
  const heightMark = (id: 'ho' | 'hi', arrow: Arrow, side: -1 | 1, label: Label): Mark | null => {
    if (Math.abs(arrow.tip.y - arrow.base.y) < 4) return null
    const x = arrow.base.x + side * gap
    return {
      id,
      line: seg(pt(x, arrow.base.y), pt(x, arrow.tip.y)),
      extensions: [seg(pt(arrow.tip.x + side * 3, arrow.tip.y), pt(x + side * 5, arrow.tip.y))],
      label,
      at: pt(x + side * 10, (arrow.base.y + arrow.tip.y) / 2),
    }
  }
  // An image right of the lens is measured on its right; one on the object's side, on its left only if the object isn't there.
  const imageSide: -1 | 1 = imageArrow && imageArrow.base.x < objectArrow.base.x - 1 ? -1 : 1
  const vertical = [
    s.hoMark ? heightMark('ho', objectArrow, -1, s.hoLabel) : null,
    s.hiMark && imageArrow ? heightMark('hi', imageArrow, imageSide, s.hiLabel) : null,
  ].filter((m): m is Mark => !!m)

  // Labels, each clear of the others, the rays, the axis and the lens or mirror.
  const pointsAt = focal.map((p) => ({ ...p, dot: pt(X(p.x), axisY) }))
  const labelOf: Record<FocalMark['id'], Label> = { f: s.fLabel, fBack: s.fBackLabel, twoF: s.twoFLabel, twoFBack: s.twoFBackLabel, c: s.cLabel }
  const below = ls * 0.75 + 4
  const placings: Placing[] = [
    ...pointsAt.map((p) => ({ at: pt(p.dot.x, axisY + below), out: { x: 0, y: 1 }, alt: pt(p.dot.x, axisY - below), label: labelOf[p.id] })),
    beside(objectArrow, -1, s.objectLabel),
    ...(imageArrow ? [beside(imageArrow, imageSide, s.imageLabel)] : []),
    ...vertical.map((m) => ({ at: m.at, out: { x: Math.sign(m.at.x - m.line.x1), y: 0 }, label: m.label })),
  ]
  function beside(a: Arrow, side: -1 | 1, label: Label): Placing {
    const y = a.base.y + (a.tip.y - a.base.y) * 0.6
    const off = ls * 0.5 + 10
    return { at: pt(a.base.x + side * off, y), out: { x: side, y: 0 }, alt: pt(a.base.x - side * off, y), label }
  }
  const lines: Segment[] = [
    seg(pt(0, axisY), pt(W, axisY)),
    seg(objectArrow.base, objectArrow.tip),
    ...(imageArrow ? [seg(imageArrow.base, imageArrow.tip)] : []),
    ...traced('complete').flatMap((r) => [...r.solid, ...r.dashed]),
    ...vertical.flatMap((m) => [m.line, ...m.extensions]),
    ...marks.flatMap((m) => m.extensions),
  ]
  const placed = placeScaled(placings, lines, body, sc)
  const points: FocalMark[] = pointsAt.map((p, i) => ({ id: p.id, dot: p.dot, label: labelOf[p.id], at: placed[i] }))
  const objectLabelAt = placed[pointsAt.length]
  const imageLabelAt = imageArrow ? placed[pointsAt.length + 1] : null
  vertical.forEach((m, i) => (m.at = placed[pointsAt.length + 1 + (imageArrow ? 1 : 0) + i]))

  const shown = s.shown
  const drawnMarks = [...marks, ...vertical].filter((m) => shown === 'complete' || (m.id !== 'di' && m.id !== 'hi'))

  // The cm scale, under everything, 0 at the lens or mirror.
  const rowsBottom = rows.length ? rowY(rows.length - 1) + ls * 0.6 : H
  let ruler: Ruler | null = null
  if (s.scale) {
    const y = rowsBottom + 14
    const size = 13 * LABEL_SCALE[s.labelSize]
    const { major, minor } = rulerSteps(k)
    const per = Math.round(major / minor)
    const ticks: Segment[] = []
    const numbers: Ruler['numbers'] = []
    const from = Math.ceil((xMin * k - SIDE + 2) / (minor * k))
    const to = Math.floor((xMax * k + SIDE - 2) / (minor * k))
    for (let i = from; i <= to; i++) {
      const x = x0 + i * minor * k
      const big = i % per === 0
      ticks.push(seg(pt(x, y), pt(x, y + (big ? 9 : 5))))
      if (big) numbers.push({ x: Math.round(x * 100) / 100, y: Math.round((y + 11 + size) * 100) / 100, text: numberText(Math.abs(i * minor)) })
    }
    const x1 = x0 + from * minor * k
    const x2 = x0 + to * minor * k
    ruler = { line: seg(pt(x1, y), pt(x2, y)), ticks, numbers, unit: pt(x2 + 10, y + 11 + size), size }
  }

  // The drawing's box: the frame, the marks, the scale and every label.
  const corners: Point[] = [pt(0, 0), pt(W, H)]
  const box = (at: Point, label: Label) => boxCorners(scaledBox(at, label, sc))
  for (const m of drawnMarks) corners.push(pt(m.line.x1, m.line.y1), pt(m.line.x2, m.line.y2), ...m.extensions.flatMap((x) => [pt(x.x2, x.y2)]), ...box(m.at, m.label))
  for (const p of points) corners.push(...box(p.at, p.label))
  corners.push(...box(objectLabelAt, s.objectLabel))
  if (imageLabelAt && shown === 'complete') corners.push(...box(imageLabelAt, s.imageLabel))
  if (ruler) {
    corners.push(pt(ruler.line.x1 - 10, ruler.line.y1), pt(ruler.unit.x + 2.2 * ruler.size, ruler.unit.y + 4))
    for (const n of ruler.numbers) corners.push(pt(n.x - 14, n.y + 4), pt(n.x + 14, n.y + 4))
  }
  const left = Math.min(...corners.map((c) => c.x))
  const top = Math.min(...corners.map((c) => c.y))
  const right = Math.max(...corners.map((c) => c.x))
  const bottom = Math.max(...corners.map((c) => c.y))

  return {
    left,
    top,
    width: Math.ceil(right - left),
    height: Math.ceil(bottom - top),
    frame,
    axis: seg(pt(0, axisY), pt(W, axisY)),
    center,
    up,
    down,
    element,
    points,
    object: objectArrow,
    objectLabelAt,
    image: shown === 'complete' ? imageArrow : null,
    imageLabelAt: shown === 'complete' ? imageLabelAt : null,
    imageTip,
    rays: traced(shown),
    marks: drawnMarks,
    ruler,
    k,
    labelSize: ls,
  }
}

/** A label's box at this label size (labelBox is for LABEL_SIZE). */
function scaledBox(at: Point, label: Label, sc: number): Box {
  const b = labelBox(pt(at.x / sc, at.y / sc), label)
  return { x: at.x, y: at.y, w: b.w * sc, h: b.h * sc }
}

/** placeLabels at this label size: the figure shrunk to LABEL_SIZE's scale, placed there, and grown back. */
function placeScaled(placings: Placing[], lines: Segment[], body: Box, sc: number): Point[] {
  const p = (q: Point) => pt(q.x / sc, q.y / sc)
  const shrunk = placings.map((q) => ({ ...q, at: p(q.at), alt: q.alt && p(q.alt) }))
  const ls = lines.map((v) => seg(p({ x: v.x1, y: v.y1 }), p({ x: v.x2, y: v.y2 })))
  const b = { x: body.x / sc, y: body.y / sc, w: body.w / sc, h: body.h / sc }
  return placeLabels(shrunk, ls, b).map((q) => pt(q.x * sc, q.y * sc))
}

/** How far a lens shape bulges either side of its middle line. */
const lensWidth = (half: number) => Math.min(16, Math.max(7, half * 0.12))

/** The lens or mirror, reaching `up` above the axis and `down` below it (the same, but on a plane mirror). */
function drawElement(kind: Element, style: RaySettings['lensStyle'], c: Point, up: number, down: number): ElementDrawing {
  const r = (n: number) => Math.round(n * 100) / 100
  const T = r(c.y - up)
  const B = r(c.y + down)
  const half = up
  const x = c.x
  if (kind === 'converging' || kind === 'diverging') {
    const converging = kind === 'converging'
    if (style === 'symbol') {
      const hd = 11
      const hw = 6
      const heads = converging
        ? [`${x},${T} ${x - hw},${r(T + hd)} ${x + hw},${r(T + hd)}`, `${x},${B} ${x - hw},${r(B - hd)} ${x + hw},${r(B - hd)}`]
        : [`${x},${r(T + hd)} ${x - hw},${T} ${x + hw},${T}`, `${x},${r(B - hd)} ${x - hw},${B} ${x + hw},${B}`]
      return { kind, path: `M${x},${T} L${x},${B}`, filled: false, heads, hatches: [] }
    }
    const w = lensWidth(half)
    if (converging) return { kind, path: `M${x},${T} Q${r(x + 2 * w)},${c.y} ${x},${B} Q${r(x - 2 * w)},${c.y} ${x},${T} Z`, filled: true, heads: [], hatches: [] }
    const t = 2.5
    const inset = 2 * (w - t)
    return {
      kind,
      path: `M${r(x - w)},${T} L${r(x + w)},${T} Q${r(x + w - inset)},${c.y} ${r(x + w)},${B} L${r(x - w)},${B} Q${r(x - w + inset)},${c.y} ${r(x - w)},${T} Z`,
      filled: true,
      heads: [],
      hatches: [],
    }
  }
  // A mirror: a shallow arc (or a line), hatched on its back, the right.
  const sag = kind === 'plane' ? 0 : Math.min(12, Math.max(3, half * 0.07))
  const side = kind === 'concave' ? -1 : 1
  const R = sag ? (half * half + sag * sag) / (2 * sag) : 0
  const surface = (dy: number) => (sag ? x + side * (R - Math.sqrt(Math.max(0, R * R - dy * dy))) : x)
  const ends = r(surface(half))
  const path = sag ? `M${ends},${T} A${r(R)},${r(R)} 0 0 ${kind === 'concave' ? 1 : 0} ${ends},${B}` : `M${x},${T} L${x},${B}`
  const hatches: Segment[] = []
  for (let dy = -up + 4; dy <= down; dy += 9) {
    const sx = surface(dy) + 1.5
    hatches.push(seg(pt(sx, c.y + dy), pt(sx + 7, c.y + dy - 7)))
  }
  return { kind, path, filled: false, heads: [], hatches }
}
