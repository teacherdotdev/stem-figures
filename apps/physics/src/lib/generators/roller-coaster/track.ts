// Where everything in a Roller Coaster figure goes, before mirroring: the
// track, a smooth curve through the teacher's points from left to right, the
// loop standing on one of them, the object riding it, the marks under it and
// every label. Heights and the loop's radius share one vertical scale, the
// tallest filling the room above the ground; nothing else is to scale, and
// nothing is worked out from the heights.

import { baselineBelowMiddle, typeLabel, withoutVectors, type Label } from '$lib/shared/label'
import {
  LABEL_SIZE,
  bounds,
  boxCorners,
  crosses,
  labelBox,
  labelWidth,
  overlaps,
  placeLabels,
  pt,
  seg,
  type Box,
  type Placing,
} from '$lib/shared/layout'
import { objectHeight, objectLabelHeight, objectWidth, type ObjectKind } from '$lib/shared/objects'
import { HATCH_LENGTH, HATCH_SPACING } from '$lib/shared/support'
import { labelPoint, type Point, type Segment } from '$lib/shared/vector'
import type { CoasterSettings } from './settings'

export const WIDTH = 640
export const HEIGHT = 400
const MARGIN = 14
/** From the figure's bottom edge up to the ground line, with no length mark: room for hatching under track on the ground. */
const BOTTOM = 24
/** From the ground down to a length mark (Projectile Motion's range mark gap), and on to its label. */
const MARK_GAP = 26
const MARK_LABEL_GAP = 20
/** The room kept under the ground when a length mark is shown: the mark and its label, less what's kept anyway. */
export const MARK_ROOM = MARK_GAP + MARK_LABEL_GAP + (LABEL_SIZE + 4) / 2 + MARGIN - BOTTOM
/** The least room from one point to the next, which caps how big a loop is drawn. */
const MIN_GAP = 44
export const DOT_R = 4.5
/** From a dot's edge, or an object's top, to its label's box. */
const LABEL_GAP = 6
const LABEL_HALF = (LABEL_SIZE + 4) / 2
/** Level track past an object sitting at the first or last point, so all of it is on the track. */
const LEAD = 6
const VELOCITY_LENGTH = 56
/** How far the curve under an object may bend away from its flat bottom, as a share of its height, before it's drawn smaller. */
const BEND = 0.2
const MIN_SIZE = 0.3

/** A point the curve passes through, with its slope there (down the page per unit across). */
export interface Knot {
  x: number
  y: number
  m: number
}

export type LabelKind = 'length' | 'height' | 'object' | 'point' | 'loopTop' | 'radius' | 'velocity' | 'rough'

/** A label and where its middle goes; `point` is the row it belongs to. */
export interface PlacedLabel {
  kind: LabelKind
  label: Label
  at: Point
  point?: number
}

export interface PlacedObject {
  kind: ObjectKind
  /** The size it's drawn at: the teacher's, or smaller where the track bends too tightly under it. */
  size: number
  /** Its bottom middle, and its tilt in degrees. */
  at: Point
  tilt: number
  width: number
  height: number
  label: Label
  /** Its label when it fits inside: where its baseline's middle goes and how big it is. Otherwise the label is among `labels`. */
  inside: { at: Point; size: number } | null
  /** Its four corners, bottom first. */
  corners: Point[]
}

export interface LengthMark {
  /** The points (counted from 0) it runs from and to. */
  from: number
  to: number
  m: Segment
}

export interface TrackFigure {
  width: number
  height: number
  knots: Knot[]
  /** The track as one SVG path, a cubic Bézier for each gap. */
  path: string
  /** Each row's place on the track, and whether it gets a dot. */
  points: { at: Point; dot: boolean }[]
  loop: {
    center: Point
    r: number
    radius: Segment | null
    top: Point
    topDot: boolean
  } | null
  /** The loop is drawn smaller than to scale, because there's no room for it. */
  loopCapped: boolean
  groundY: number
  ground: Segment | null
  /** Each row's height mark, if it has one. */
  heightMarks: (Segment | null)[]
  lengthMarks: LengthMark[]
  /** Thin lines from the ground, or the track, down to the ends of the length marks. */
  extensions: Segment[]
  /** Hatching under the rough stretches. */
  hatches: Segment[]
  object: PlacedObject | null
  velocity: Segment | null
  labels: PlacedLabel[]
  /** Every outermost point drawn, for fitting (and tests). */
  extent: Point[]
}

const add = (p: Point, d: Point, by: number): Point => ({
  x: p.x + d.x * by,
  y: p.y + d.y * by,
})
const unit = (x: number, y: number): Point => {
  const len = Math.hypot(x, y) || 1
  return { x: x / len, y: y / len }
}
/** The side of a direction along the track that's away from it: up, for one pointing right. */
const outOf = (u: Point): Point => ({ x: u.y, y: -u.x })

/**
 * The slope at each of a row of points for a smooth curve that never
 * overshoots (a monotone cubic): 0 at both ends and at a point higher or
 * lower than both its neighbours, or level with one; between a higher and a
 * lower neighbour, the weighted harmonic mean of the slopes either side.
 */
export function slopes(xs: number[], ys: number[]): number[] {
  const h = xs.slice(1).map((x, k) => x - xs[k])
  const d = h.map((hk, k) => (ys[k + 1] - ys[k]) / hk)
  return xs.map((_, k) => {
    if (k === 0 || k === xs.length - 1) return 0
    const [d0, d1] = [d[k - 1], d[k]]
    if (d0 * d1 <= 0) return 0
    const [h0, h1] = [h[k - 1], h[k]]
    return (3 * (h0 + h1)) / ((2 * h1 + h0) / d0 + (h1 + 2 * h0) / d1)
  })
}

/** The curve at x: how far down the page it is, and its slope. Past either end it's level. */
export function curveAt(knots: Knot[], x: number): { y: number; slope: number } {
  if (x <= knots[0].x) return { y: knots[0].y, slope: 0 }
  const last = knots[knots.length - 1]
  if (x >= last.x) return { y: last.y, slope: 0 }
  const k = Math.max(0, knots.findIndex((q) => q.x > x) - 1)
  const [a, b] = [knots[k], knots[k + 1]]
  const h = b.x - a.x
  const s = (x - a.x) / h
  const s2 = s * s
  const s3 = s2 * s
  return {
    y: (2 * s3 - 3 * s2 + 1) * a.y + (s3 - 2 * s2 + s) * h * a.m + (-2 * s3 + 3 * s2) * b.y + (s3 - s2) * h * b.m,
    slope: ((6 * s2 - 6 * s) * a.y + (-6 * s2 + 6 * s) * b.y) / h + (3 * s2 - 4 * s + 1) * a.m + (3 * s2 - 2 * s) * b.m,
  }
}

/** Each gap as one exact cubic Bézier: its control points are a third of the gap along, on each end's slope. */
function pathOf(knots: Knot[]): string {
  const r = (n: number) => Math.round(n * 100) / 100
  return knots
    .map((b, k) => {
      if (k === 0) return `M${r(b.x)},${r(b.y)}`
      const a = knots[k - 1]
      const third = (b.x - a.x) / 3
      return `C${r(a.x + third)},${r(a.y + a.m * third)} ${r(b.x - third)},${r(b.y - b.m * third)} ${r(b.x)},${r(b.y)}`
    })
    .join(' ')
}

function crossing(a: Segment, b: Segment): boolean {
  const side = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
    Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px))
  return (
    side(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1) !== side(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2) &&
    side(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1) !== side(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2)
  )
}

/** The loop's number (from 0) among these points, or −1 for none. */
export const loopIndexOf = (s: CoasterSettings) => (s.loopAt >= 1 && s.loopAt <= s.points.length ? s.loopAt - 1 : -1)

/**
 * The rough stretches' length marks, as the points (from 0) each runs between.
 * A stretch with a label starts a mark; a rough stretch after it whose label
 * is none is taken into that mark, so one label can span a run.
 */
export function lengthRuns(s: CoasterSettings): { from: number; to: number; label: Label }[] {
  const runs: { from: number; to: number; label: Label }[] = []
  s.points.slice(0, -1).forEach((p, i) => {
    if (!p.rough) return
    const before = runs.at(-1)
    if (p.lengthLabel.mode !== 'none') runs.push({ from: i, to: i + 1, label: p.lengthLabel })
    else if (before && before.to === i) before.to = i + 1
  })
  return runs
}

interface Frame {
  /** The track's left and right ends. */
  xa: number
  xb: number
  /** Where the tallest thing to scale (a point, or the loop's top) reaches. */
  top: number
  groundY: number
}

function layout(s: CoasterSettings, frame: Frame): TrackFigure {
  const { xa, xb, top, groundY } = frame
  const n = s.points.length
  const loopAt = loopIndexOf(s)
  const units = s.points.map((p) => p.height)
  const tallest = Math.max(...units, loopAt >= 0 ? units[loopAt] + 2 * s.loopRadius : 0)
  let scale = tallest > 0 ? (groundY - top) / tallest : 0

  const kind: ObjectKind | null = s.object === 'none' ? null : s.object
  const onLoop = kind !== null && s.objectOnLoop && loopAt >= 0
  const objectAt = kind === null || onLoop ? -1 : Math.min(s.objectAt, n) - 1

  // Across: the points evenly spaced, the loop's point with room for its
  // circle (the track is level under it), and level track past an object at
  // either end.
  const need = kind ? objectWidth(kind, s.objectSize) / 2 + LEAD : 0
  let leadL = objectAt === 0 ? need : 0
  let leadR = objectAt === n - 1 ? need : 0
  const wanted = s.loopRadius * scale
  const r = loopAt < 0 ? 0 : Math.max(4, Math.min(wanted, (xb - xa - leadL - leadR - MIN_GAP * (n - 1)) / 2))
  // A loop drawn smaller than to scale no longer reaches the top, so the heights take the room it leaves.
  if (r < wanted) {
    const room = groundY - top
    const fits = Math.min(room / Math.max(...units), units[loopAt] > 0 ? (room - 2 * r) / units[loopAt] : Infinity)
    if (Number.isFinite(fits)) scale = Math.max(scale, fits)
  }
  if (loopAt === 0) leadL = Math.max(0, leadL - r)
  if (loopAt === n - 1) leadR = Math.max(0, leadR - r)
  const gap = (xb - xa - leadL - leadR - 2 * r) / (n - 1)
  const at = s.points.map((_, i) =>
    pt(xa + leadL + i * gap + (i > loopAt && loopAt >= 0 ? 2 * r : i === loopAt ? r : 0), groundY - units[i] * scale),
  )

  const xs: number[] = []
  const ys: number[] = []
  const knot = (x: number, y: number) => (xs.push(x), ys.push(y))
  // An object at the first or last point stands on a level platform as wide as it is (less where the points are close), its point in the middle.
  const platform = Math.min(need, gap * 0.6)
  if (leadL > 0) knot(xa, at[0].y)
  at.forEach((p, i) => {
    if (i === loopAt) return void (knot(p.x - r, p.y), knot(p.x + r, p.y))
    if (i === n - 1 && i === objectAt && platform) knot(p.x - platform, p.y)
    knot(p.x, p.y)
    if (i === 0 && i === objectAt && platform) knot(p.x + platform, p.y)
  })
  if (leadR > 0) knot(xb, at[n - 1].y)
  const ms = slopes(xs, ys)
  const knots: Knot[] = xs.map((x, k) => ({ x, y: ys[k], m: ms[k] }))
  const [x0, x1] = [xs[0], xs[xs.length - 1]]
  const on = (x: number): Point => ({ x, y: curveAt(knots, x).y })
  /** Along the track at x (to the right), and out of it (up). */
  const along = (x: number) => unit(1, curveAt(knots, x).slope)

  // The track and the loop as short straight pieces, for keeping labels and the velocity off them.
  const pieces: Segment[] = []
  knots.slice(1).forEach((b, k) => {
    const a = knots[k]
    const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 14))
    for (let j = 0; j < steps; j++)
      pieces.push(seg(on(a.x + ((b.x - a.x) * j) / steps), on(a.x + ((b.x - a.x) * (j + 1)) / steps)))
  })
  const center = loopAt >= 0 ? pt(at[loopAt].x, at[loopAt].y - r) : null
  const loopPieces: Segment[] = []
  if (center) {
    const around = (j: number) =>
      pt(center.x + Math.cos((j * Math.PI) / 16) * r, center.y + Math.sin((j * Math.PI) / 16) * r)
    for (let j = 0; j < 32; j++) loopPieces.push(seg(around(j), around(j + 1)))
  }

  // The object: a cart's wheels (or a block's bottom corners) rest on the
  // track either side of its point, so it tilts with the slope and sits in a
  // dip without its corners through the curve; a block on a hill is lifted
  // onto the top. Where the track bends too tightly under it, it's drawn smaller.
  let object: PlacedObject | null = null
  let objectAxes: { u: Point; n: Point } | null = null
  if (kind) {
    const contact = (w: number) => (kind === 'cart' ? 0.3 * w : kind === 'block' ? 0.5 * w : 0)
    let size = s.objectSize
    let base: Point
    let u: Point
    let fits: boolean
    for (;;) {
      const w = objectWidth(kind, size)
      const h = objectHeight(kind, size)
      const half = contact(w)
      if (onLoop && center) {
        const sag = (d: number) => r - Math.sqrt(Math.max(0, r * r - d * d))
        u = { x: -1, y: 0 }
        base = { x: center.x, y: center.y - r + sag(Math.min(half, r)) }
        fits = w / 2 <= r * 0.85 && sag(w / 2) - sag(half) <= BEND * h
      } else {
        const x = at[objectAt].x
        let lift = 0
        if (half < 0.5) {
          u = along(x)
          base = on(x)
          // A ball fits where the track doesn't come inside it.
          const middle = add(base, outOf(u), h / 2)
          fits = Array.from({ length: 13 }, (_, j) => on(x + ((j - 6) / 6) * (h / 2))).every(
            (p) => Math.hypot(p.x - middle.x, p.y - middle.y) >= h / 2 - 1,
          )
        } else {
          let dx = half * along(x).x
          let [p1, p2] = [on(x - dx), on(x + dx)]
          for (let i = 0; i < 3; i++) {
            dx *= (2 * half) / (Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1)
            ;[p1, p2] = [on(Math.max(x0, x - dx)), on(Math.min(x1, x + dx))]
          }
          u = unit(p2.x - p1.x, p2.y - p1.y)
          base = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
          // How far the track under its full width rises above its bottom, and falls below it.
          const out = outOf(u)
          const reach = (w / 2) * u.x
          const offs = Array.from({ length: 13 }, (_, j) =>
            on(Math.min(x1, Math.max(x0, x + ((j - 6) / 6) * reach))),
          ).map((p) => (p.x - base.x) * out.x + (p.y - base.y) * out.y)
          const above = Math.max(0, ...offs)
          const below = Math.max(0, ...offs.map((o) => -o))
          // A cart's body rides clear of the track on its wheels, so it takes a little more.
          const bend = (kind === 'cart' ? 1.5 : 1) * BEND * h
          fits = Math.max(above, below) <= bend
          lift = kind === 'block' ? above : Math.max(0, above - BEND * h)
        }
        base = add(base, outOf(u), lift)
      }
      if (fits || size <= MIN_SIZE) break
      size = Math.max(MIN_SIZE, Math.round(size * 90) / 100)
    }
    const out = outOf(u)
    const w = objectWidth(kind, size)
    const h = objectHeight(kind, size)
    const corners = [add(base, u, -w / 2), add(base, u, w / 2)].flatMap((p) => [p, add(p, out, h)])
    // Its label goes inside it when there's room, at a size that fits its body.
    const body = kind === 'cart' ? h * (1 - 0.19 * 1.4) : h
    const labelSize = Math.min(LABEL_SIZE, body * 0.8)
    const room = (kind === 'ball' ? 0.8 : 1) * w - 8
    const inside =
      s.objectLabel.mode !== 'none' && labelSize >= 13 && (labelWidth(s.objectLabel) * labelSize) / LABEL_SIZE <= room
    const middle = add(base, out, objectLabelHeight(kind, size))
    object = {
      kind,
      size,
      at: pt(base.x, base.y),
      tilt: Math.round(((Math.atan2(u.y, u.x) * 180) / Math.PI) * 100) / 100,
      width: w,
      height: h,
      label: s.objectLabel,
      inside: inside
        ? {
            at: pt(middle.x, middle.y + baselineBelowMiddle(s.objectLabel, labelSize)),
            size: Math.round(labelSize * 10) / 10,
          }
        : null,
      corners: [corners[0], corners[2], corners[3], corners[1]].map((p) => pt(p.x, p.y)),
    }
    objectAxes = { u, n: out }
  }
  const outline = object ? object.corners.map((p, i, all) => seg(p, all[(i + 1) % 4])) : []

  // The velocity: from the object's front, along the track there. Where that
  // would run through the track (in a dip) or the loop, it rides over the
  // object instead.
  let velocity: Segment | null = null
  let velocitySide: 1 | -1 = 1
  let velocityOver = false
  if (object && objectAxes && s.velocity !== 'none') {
    const { u: tilt, n: out } = objectAxes
    // Along the track at the object's point (level at the bottom of a dip, even where the object sits a little tilted).
    const u = onLoop ? tilt : along(at[objectAt].x)
    const sign = s.velocity === 'forward' ? 1 : -1
    const d = { x: u.x * sign, y: u.y * sign }
    const middle = add(object.at, out, object.height / 2)
    const from = add(middle, d, object.width / 2 + 5)
    const beside = seg(from, add(from, d, VELOCITY_LENGTH))
    if (!onLoop && ![...pieces, ...loopPieces].some((p) => crossing(p, beside))) velocity = beside
    else {
      velocityOver = true
      const over = add(middle, out, object.height / 2 + 18)
      // Inside the loop, the arrow and the label past its tip are no longer than the room across it there.
      const depth = center ? Math.abs(over.y - (center.y - r)) : 0
      const tail = onLoop ? 12 + labelWidth(s.velocityLabel) : 0
      const across = onLoop ? 2 * Math.sqrt(Math.max(0, r * r - (r - depth) ** 2)) - 16 - tail : VELOCITY_LENGTH
      const length = Math.max(26, Math.min(VELOCITY_LENGTH, across))
      const start = add(over, d, onLoop ? -(length + tail) / 2 : -10)
      velocity = seg(start, add(start, d, length))
    }
    velocitySide = sign === 1 ? 1 : -1
  }

  // Marks. A height mark runs from the ground straight up to its point,
  // stopping short of the dot there.
  const points = s.points.map((p, i) => ({
    at: at[i],
    dot: p.label.mode !== 'none' && i !== objectAt,
  }))
  const heightMarks = s.points.map((p, i) => {
    const tip = at[i].y + (points[i].dot ? DOT_R + 1 : 2)
    return p.heightLabel.mode !== 'none' && groundY - tip >= 4 ? seg(pt(at[i].x, groundY), pt(at[i].x, tip)) : null
  })
  const runs = lengthRuns(s)
  const markY = groundY + MARK_GAP
  const lengthMarks: LengthMark[] = runs.map((run) => ({
    from: run.from,
    to: run.to,
    m: seg(pt(at[run.from].x, markY), pt(at[run.to].x, markY)),
  }))
  // A line down to each end of a length mark, from the ground, or from the track where no height mark comes down to it.
  const extensions = [...new Set(runs.flatMap((run) => [run.from, run.to]))].map((i) =>
    seg(pt(at[i].x, heightMarks[i] ? groundY : Math.min(groundY, at[i].y) + 3), pt(at[i].x, markY + 6)),
  )

  // Hatches along the underside of each run of rough stretches, unbroken
  // through the points between them, and a line along their ends for
  // keeping labels off them.
  const hatches: Segment[] = []
  const hatchEdge: Segment[] = []
  const roughAt = (i: number) => i >= 0 && i < n - 1 && s.points[i].rough
  for (let i = 0; i < n - 1; i++) {
    if (!roughAt(i) || roughAt(i - 1)) continue
    let j = i
    while (roughAt(j + 1)) j++
    let walked = 0
    let next = HATCH_SPACING / 2
    let edge: Point | null = null
    for (let x = at[i].x; x < at[j + 1].x; x += 1) {
      const [p, q] = [on(x), on(Math.min(at[j + 1].x, x + 1))]
      const step = Math.hypot(q.x - p.x, q.y - p.y)
      if (walked + step >= next) {
        const u = along(x)
        const out = outOf(u)
        const end = pt(
          p.x - out.x * HATCH_LENGTH - u.x * HATCH_LENGTH * 0.7,
          p.y - out.y * HATCH_LENGTH - u.y * HATCH_LENGTH * 0.7,
        )
        hatches.push(seg(p, end))
        if (edge) hatchEdge.push(seg(edge, end))
        edge = end
        next += HATCH_SPACING
      }
      walked += step
    }
  }

  // The loop's radius, from its middle to its side, and its top.
  const loopTop = center ? pt(center.x, center.y - r) : null
  const radius = center && s.radiusLabel.mode !== 'none' ? seg(center, pt(center.x + r, center.y)) : null

  // Labels, the fixed ones first, each moved clear of the lines and of the ones before it.
  const ground = s.ground ? seg(pt(MARGIN, groundY), pt(WIDTH - MARGIN, groundY)) : null
  const marks = [...heightMarks.filter((m) => m !== null), ...lengthMarks.map((m) => m.m)]
  // The track and the loop are kept a little clear of labels' white boxes, by a line along each side of them.
  const beside = [...pieces, ...loopPieces].flatMap((p) => {
    const out = outOf(unit(p.x2 - p.x1, p.y2 - p.y1))
    return [4, -4].map((d) => seg(add({ x: p.x1, y: p.y1 }, out, d), add({ x: p.x2, y: p.y2 }, out, d)))
  })
  const lines = [
    ...pieces,
    ...loopPieces,
    ...beside,
    ...marks,
    ...extensions,
    ...hatchEdge,
    ...outline,
    ...(ground ? [ground] : []),
    ...(velocity ? [velocity] : []),
    ...(radius ? [radius] : []),
  ]
  const labels: PlacedLabel[] = []
  const placings: (Placing & { kind: LabelKind; point?: number })[] = []
  const up = { x: 0, y: -1 }
  // A height's label goes beside its mark, to the right if there's room, else to the left, sliding
  // along the mark to a clear spot; with no room either side of a long mark it sits on the mark itself.
  const taken: Box[] = []
  s.points.forEach((p, i) => {
    const mark = heightMarks[i]
    if (!mark) return
    const side = 9 + labelWidth(p.heightLabel) / 2
    const spots = [0.5, 0.36, 0.64, 0.22, 0.78].flatMap((t) =>
      [1, -1].map((dir) => pt(mark.x1 + dir * side, mark.y1 + (mark.y2 - mark.y1) * t)),
    )
    const clear = (q: Point) => {
      const box = labelBox(q, p.heightLabel)
      return !taken.some((b) => overlaps(b, box, 2)) && !lines.some((v) => crosses(v, box))
    }
    // On the mark, at a height where it keeps off the track and the labels before it, if there is one.
    const onMark = [0.5, 0.36, 0.64, 0.22, 0.78, 0.12].map((t) => pt(mark.x1, mark.y1 + (mark.y2 - mark.y1) * t))
    const clearOn = (q: Point) => {
      const box = labelBox(q, p.heightLabel)
      return (
        q.y + LABEL_HALF <= groundY - 2 &&
        !taken.some((b) => overlaps(b, box, 2)) &&
        !lines.some((v) => v !== mark && crosses(v, box))
      )
    }
    // Failing that, on the mark across the track, but never on another label.
    const offLabels = (q: Point) =>
      q.y + LABEL_HALF <= groundY - 2 && !taken.some((b) => overlaps(b, labelBox(q, p.heightLabel), 2))
    let spot =
      spots.find(clear) ?? (mark.y1 - mark.y2 >= 40 ? (onMark.find(clearOn) ?? onMark.find(offLabels) ?? null) : null)
    // Crowded (eight points with long labels): anywhere near the mark, above the ground, clear of
    // everything if it can be, and otherwise across the track, but still never on another label.
    if (!spot) {
      const near: Point[] = []
      for (let dy = 0; dy <= 120; dy += 10) {
        for (const dx of [0, side, -side, 24, -24, side + 24, -(side + 24), 48, -48]) {
          const y = Math.min(groundY - LABEL_HALF - 2, mark.y2 + (mark.y1 - mark.y2) / 2) - dy
          near.push(pt(mark.x1 + dx, y), pt(mark.x1 + dx, Math.min(groundY - LABEL_HALF - 2, y + 2 * dy)))
        }
      }
      spot = near.find(clear) ?? near.find(offLabels) ?? null
    }
    if (spot) {
      taken.push(labelBox(spot, p.heightLabel))
      labels.push({ kind: 'height', label: p.heightLabel, at: spot, point: i })
    } else
      placings.push({
        kind: 'height',
        point: i,
        label: p.heightLabel,
        at: spots[0],
        out: { x: 1, y: 0 },
        alt: spots[1],
      })
  })
  // The labels after them keep off them.
  for (const b of taken) {
    const [l, r, t, m, u] = [b.x - b.w / 2, b.x + b.w / 2, b.y - b.h / 2, b.y, b.y + b.h / 2]
    for (const y of [t, m, u]) lines.push(seg(pt(l, y), pt(r, y)))
  }
  runs.forEach((run) =>
    placings.push({
      kind: 'length',
      point: run.from,
      label: run.label,
      at: pt((at[run.from].x + at[run.to].x) / 2, markY + MARK_LABEL_GAP),
      out: { x: 0, y: 1 },
    }),
  )
  // Over the object, and over its velocity when that rides over it.
  const overObject =
    object && objectAxes
      ? add(object.at, objectAxes.n, object.height + LABEL_GAP + LABEL_HALF + (velocityOver ? 24 : 0))
      : null
  if (object && objectAxes && overObject && !object.inside)
    placings.push({
      kind: 'object',
      label: object.label,
      at: pt(overObject.x, overObject.y),
      out: objectAxes.n,
    })
  s.points.forEach((p, i) => {
    if (i === objectAt && objectAxes && overObject) {
      placings.push({
        kind: 'point',
        point: i,
        label: p.label,
        at: pt(overObject.x, overObject.y),
        out: objectAxes.n,
      })
      return
    }
    const out = outOf(along(at[i].x))
    const off = DOT_R + LABEL_GAP + LABEL_HALF
    const above = add(at[i], out, off)
    const below = add(at[i], out, -off)
    placings.push({
      kind: 'point',
      point: i,
      label: p.label,
      at: pt(above.x, above.y),
      out,
      alt: pt(below.x, below.y),
    })
  })
  if (loopTop)
    placings.push({
      kind: 'loopTop',
      label: s.loopTopLabel,
      at: pt(loopTop.x, loopTop.y - DOT_R - LABEL_GAP - LABEL_HALF),
      out: up,
    })
  if (radius && center)
    placings.push({
      kind: 'radius',
      label: s.radiusLabel,
      at: pt(center.x + r / 2, center.y - LABEL_HALF - 3),
      out: up,
      alt: pt(center.x + r / 2, center.y + LABEL_HALF + 3),
    })
  if (velocity && objectAxes) {
    // Above the arrow's middle, or past its tip when it rides over the object, where the labels above it are.
    const d = unit(velocity.x2 - velocity.x1, velocity.y2 - velocity.y1)
    const tip = 12 + (labelWidth(s.velocityLabel) / 2) * Math.abs(d.x) + 11 * Math.abs(d.y)
    const p = velocityOver
      ? labelPoint(velocity, { at: 'tip', gap: tip })
      : labelPoint(velocity, { at: 'middle', side: velocitySide, gap: 16 })
    placings.push({
      kind: 'velocity',
      label: s.velocityLabel,
      at: pt(p.x, p.y),
      out: objectAxes.n,
    })
  }
  const firstRough = s.points.findIndex((_, i) => roughAt(i))
  if (firstRough >= 0) {
    const x = (at[firstRough].x + at[firstRough + 1].x) / 2
    const out = outOf(along(x))
    const under = add(on(x), out, -(HATCH_LENGTH + 5 + LABEL_HALF))
    const over = add(on(x), out, 12 + LABEL_HALF)
    // Under the hatching, unless that's down among a length mark under the ground: then over the track.
    const run = runs.find((run) => run.from <= firstRough && firstRough < run.to)
    if (run && under.y + LABEL_HALF > groundY - 2) {
      // Or over the middle of a longer run, if the first stretch is taken (by the object, say).
      const mid = (at[run.from].x + at[run.to].x) / 2
      const alt = run.to - run.from > 1 ? add(on(mid), outOf(along(mid)), 12 + LABEL_HALF) : null
      placings.push({
        kind: 'rough',
        label: s.roughLabel,
        at: pt(over.x, over.y),
        out,
        ...(alt ? { alt: pt(alt.x, alt.y) } : {}),
      })
    } else
      placings.push({
        kind: 'rough',
        label: s.roughLabel,
        at: pt(under.x, under.y),
        out: { x: -out.x, y: -out.y },
        alt: pt(over.x, over.y),
      })
  }
  const shown = placings.filter((p) => p.label.mode !== 'none')
  const placed = placeLabels(shown, lines, null)
  shown.forEach((p, i) =>
    labels.push({
      kind: p.kind,
      label: p.label,
      at: placed[i],
      ...(p.point === undefined ? {} : { point: p.point }),
    }),
  )

  const around = (p: Point, d: number) => [pt(p.x - d, p.y - d), pt(p.x + d, p.y + d)]
  const extent = [
    ...knots.flatMap((q) => around(q, 2)),
    ...pieces.flatMap((p) => around({ x: p.x1, y: p.y1 }, 2)),
    ...(center ? around(center, r + 2) : []),
    ...points.filter((p) => p.dot).flatMap((p) => around(p.at, DOT_R)),
    ...(object ? object.corners.flatMap((p) => around(p, 2)) : []),
    ...(velocity
      ? [...around({ x: velocity.x1, y: velocity.y1 }, 2), ...around({ x: velocity.x2, y: velocity.y2 }, 7)]
      : []),
    ...lengthMarks.flatMap((m) => [pt(m.m.x1, m.m.y1 + 6), pt(m.m.x2, m.m.y2 + 6)]),
    ...hatches.map((h) => pt(h.x2, h.y2)),
    ...labels.flatMap((l) => boxCorners(labelBox(l.at, l.label))),
    ...(ground ? [pt(ground.x1, groundY + 1)] : []),
  ]

  return {
    width: WIDTH,
    height: HEIGHT,
    knots,
    path: pathOf(knots),
    points,
    loop:
      center && loopTop
        ? {
            center,
            r,
            radius,
            top: loopTop,
            topDot: s.loopTopLabel.mode !== 'none' && !onLoop,
          }
        : null,
    loopCapped: loopAt >= 0 && r < wanted - 0.5,
    groundY,
    ground,
    heightMarks,
    lengthMarks,
    extensions,
    hatches,
    object,
    velocity,
    labels,
    extent,
  }
}

/**
 * The figure, fitted: the track starts as wide and as tall as the figure
 * allows, then draws in from whichever side something (a label, the object,
 * a mark) would run off.
 */
export function buildTrack(s: CoasterSettings): TrackFigure {
  const flat = Math.max(...s.points.map((p) => p.height)) === 0 && loopIndexOf(s) < 0
  const frame: Frame = {
    xa: MARGIN + 10,
    xb: WIDTH - MARGIN - 10,
    top: MARGIN + 4,
    // A track all at height 0 sits on the ground in the middle of the figure.
    groundY: flat ? Math.round(HEIGHT * 0.6) : HEIGHT - BOTTOM - (lengthRuns(s).length ? MARK_ROOM : 0),
  }
  const start = { ...frame }
  let f = layout(s, frame)
  for (let i = 0; i < 12; i++) {
    const b = bounds(f.extent)
    const over = {
      left: MARGIN - b.left,
      right: b.right - (WIDTH - MARGIN),
      top: MARGIN - b.top,
      bottom: b.bottom - (HEIGHT - MARGIN),
    }
    if (Math.max(over.left, over.right, over.top, over.bottom) <= 0.5) break
    const xa = frame.xa + Math.max(0, over.left)
    const xb = frame.xb - Math.max(0, over.right)
    if (xb - xa >= 240) Object.assign(frame, { xa, xb })
    const top = frame.top + Math.max(0, over.top)
    const groundY = frame.groundY - Math.max(0, over.bottom)
    if (groundY - top >= 120) Object.assign(frame, { top, groundY })
    f = layout(s, frame)
  }
  // Drawing in can overshoot: what ran off on one pass (a label first tried
  // under the track, say) may sit elsewhere on the next, leaving an empty band
  // at that edge. Give the room back, no farther than the start, while
  // everything still fits.
  const over = (g: TrackFigure) => {
    const b = bounds(g.extent)
    return { left: MARGIN - b.left, right: b.right - (WIDTH - MARGIN), top: MARGIN - b.top, bottom: b.bottom - (HEIGHT - MARGIN) }
  }
  const fits = (g: TrackFigure) => Math.max(...Object.values(over(g))) <= 0.5
  for (let i = 0; i < 6 && fits(f); i++) {
    const o = over(f)
    const next: Frame = {
      xa: Math.max(start.xa, frame.xa + Math.min(0, o.left)),
      xb: Math.min(start.xb, frame.xb - Math.min(0, o.right)),
      top: Math.max(start.top, frame.top + Math.min(0, o.top)),
      groundY: Math.min(start.groundY, frame.groundY - Math.min(0, o.bottom)),
    }
    if (Math.max(frame.xa - next.xa, next.xb - frame.xb, frame.top - next.top, next.groundY - frame.groundY) < 1) break
    const g = layout(s, next)
    if (!fits(g)) break
    Object.assign(frame, next)
    f = g
  }
  return f
}

const COUNT = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']

/** A label as it's read out: its text with symbols ("mu_k" is μ_k), "a blank line", or null when it's off or empty. */
function said(l: Label): string | null {
  if (l.mode === 'none') return null
  if (l.mode === 'blank') return 'a blank line'
  return typeLabel(withoutVectors(l.text)).trim() || null
}

/**
 * The figure in words, for screen readers: what's drawn and the labels on
 * it, never the heights behind them, so a height marked h or left blank isn't
 * read out as its number.
 */
export function describe(s: CoasterSettings): string {
  const n = s.points.length
  const hs = s.points.map((p) => p.height)
  const name = (i: number) => {
    const l = s.points[i].label
    return l.mode === 'text' && said(l) ? said(l)! : `point ${i + 1}`
  }
  const shape = (i: number) =>
    i === 0 ? 'the start' : i === n - 1 ? 'the end' : hs[i] > hs[i - 1] && hs[i] > hs[i + 1] ? 'a hilltop' : hs[i] < hs[i - 1] && hs[i] < hs[i + 1] ? 'a dip' : ''
  const points = s.points.map((p, i) => {
    const label = said(p.label)
    const mark = said(p.heightLabel)
    return [
      p.label.mode === 'text' && label ? label : p.label.mode === 'blank' ? `point ${i + 1}, labeled with a blank line` : `point ${i + 1}`,
      shape(i),
      mark ? `height marked ${mark}` : '',
    ]
      .filter(Boolean)
      .join(', ')
  })
  const sentences = [
    `A roller coaster track through ${COUNT[n]} points, ${s.mirror ? 'right to left' : 'left to right'}: ${points.join('; ')}.`,
  ]
  const loopAt = loopIndexOf(s)
  if (loopAt >= 0) {
    const radius = said(s.radiusLabel)
    const top = said(s.loopTopLabel)
    sentences.push(`A loop stands at ${name(loopAt)}${radius ? `, its radius marked ${radius}` : ''}${top ? `, its top labeled ${top}` : ''}.`)
  }
  // Each run of rough stretches, with the friction label on the first and the length marks along it.
  const rough: { from: number; to: number }[] = []
  s.points.slice(0, -1).forEach((p, i) => {
    if (!p.rough) return
    const last = rough.at(-1)
    if (last && last.to === i) last.to = i + 1
    else rough.push({ from: i, to: i + 1 })
  })
  const marks = lengthRuns(s)
  rough.forEach((r, k) => {
    const mu = k === 0 ? said(s.roughLabel) : null
    const lengths = marks.filter((m) => m.from >= r.from && m.to <= r.to).flatMap((m) => said(m.label) ?? [])
    sentences.push(
      `The track from ${name(r.from)} to ${name(r.to)} is rough${mu ? `, labeled ${mu}` : ''}${lengths.length ? `, its length marked ${lengths.join(' and ')}` : ''}.`,
    )
  })
  if (s.object !== 'none') {
    const label = said(s.objectLabel)
    const at = s.objectOnLoop && loopAt >= 0 ? 'upside down at the top of the loop' : `at ${name(Math.min(s.objectAt, n) - 1)}`
    const v = s.velocity === 'none' ? '' : `, moving ${s.velocity === 'forward' ? 'forward' : 'back'} along the track${said(s.velocityLabel) ? ` with velocity ${said(s.velocityLabel)}` : ''}`
    sentences.push(`A ${s.object}${label ? ` labeled ${label}` : ''} is ${at}${v}.`)
  }
  return sentences.join(' ')
}
