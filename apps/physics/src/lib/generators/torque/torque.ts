// Where everything in a Torque figure goes, before mirroring, in a fixed
// 640 × 420 figure: the beam and what holds it up (a pivot, two supports or
// a wall with or without a cable), its loads, the force arrows, the distance
// marks stacked in rows above the beam, and every label.
//
// The beam is drawn to scale along its length: a place x along it is drawn
// x ÷ length of the way along. Up and down nothing is to scale: objects,
// strings and arrows have fixed sizes, like every Vector. A beam at a wall is
// drawn shorter when its cable is too steep to reach the wall inside the
// figure at its true angle.

import {
  beamRect,
  cable as cableTo,
  distanceMarks,
  forceOnBeam,
  fulcrum,
  GROUND_DEPTH,
  hangingObject,
  hingeAt,
  type BeamPoint,
  type Cable,
  type DistanceMarks,
  type Fulcrum,
  type Rect,
} from '$lib/shared/beam'
import { componentLabel, type Label } from '$lib/shared/label'
import { LABEL_SIZE, arcPieces, crosses, labelBox, labelWidth, placeLabels, pt, type Placing } from '$lib/shared/layout'
import { objectHeight, objectWidth } from '$lib/shared/objects'
import { wall as wallAt, type Support } from '$lib/shared/support'
import type { Point, Segment } from '$lib/shared/vector'
import { distanceText, loadDistanceText, pivotSums, twoSums, valueText, wallSums } from './moments'
import { onBeam, type Load, type TorqueSettings } from './settings'

export const WIDTH = 640
export const HEIGHT = 420
/** The longest the beam is drawn. */
export const BEAM = 480
/** The shortest a beam at a wall is drawn, however steep its cable. */
export const MIN_WALL_BEAM = 200
export const THICKNESS = 12
export const FULCRUM_HEIGHT = 44
/** Every force arrow is this long; a gravity arrow from an object is shorter. */
export const ARROW = 56
export const WEIGHT_ARROW = 36
/** The shortest string a hanging object hangs on, and how much longer each lower one's is. */
export const STRING = 24
/** From one row of distance marks to the next. */
export const ROW = 32
/** Where the wall's face is, and the beam's left end otherwise. */
export const WALL_X = 92
export const BEAM_LEFT = (WIDTH - BEAM) / 2
/** The space kept clear at the figure's edges. */
const MARGIN = 6
/** How tall a label's box is. */
const LH = LABEL_SIZE + 4
/** From the tallest thing above the beam up to the first row of distance marks. */
const ROWS_GAP = 14
/** How deep a beam fixed into a wall goes into it. */
const INTO_WALL = 12
/** The wall's moment on a fixed beam: a curved arrow this far round the beam's end at the wall, and its head. */
export const MOMENT_R = 40
const MOMENT_HEAD = 12

export type LabelKey = string

export interface PlacedLabel {
  key: LabelKey
  label: Label
  /** the middle of the label */
  at: Point
  /** a force arrow's label, drawn in the vectors' color */
  onVector: boolean
  /** a label drawn inside an object, centered on its ink, with no white outline */
  inside?: boolean
}

export interface DrawnObject {
  of: number
  kind: 'block' | 'ball'
  size: number
  /** its bottom middle */
  at: Point
}

export interface DrawnArrow {
  key: string
  v: Segment
}

export interface TorqueFigure {
  width: number
  height: number
  beam: Rect
  fulcrums: Fulcrum[]
  wall: Support | null
  hinge: Point | null
  cable: Cable | null
  strings: Segment[]
  objects: DrawnObject[]
  arrows: DrawnArrow[]
  marks: DistanceMarks | null
  /** the whole beam's length mark, with its witness lines */
  lengthMark: { line: Segment; witnesses: Segment[] } | null
  labels: PlacedLabel[]
  /** where each load is drawn along the beam */
  loadX: number[]
  /** where the pivot, the supports and the cable are drawn */
  supportX: number[]
  /** distance marks left off for want of room above the beam */
  dropped: number
  /** does the cable meet the wall above the top of the figure? */
  cableOffTop: boolean
  /** a fixed beam's wall moment: a curved arrow round the beam's end at the wall, turning the way the wall turns the beam */
  moment: { d: string; head: Point[]; clockwise: boolean } | null
  /** loads drawn on top of a support or of each other, by their places in the list: [i, j] for two loads, [i, -1] for a support */
  clashes: [number, number][]
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const r2 = (n: number) => Math.round(n * 100) / 100
const seg2 = (a: Point, b: Point): Segment => ({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
const head3 = (h: Point[]): Segment[] => h.map((p, i) => seg2(p, h[(i + 1) % h.length]))

/**
 * Objects drawn on top of something else: a hanging object over a support's
 * triangle, or two objects over each other. Each is [load, other load], or
 * [load, -1] for a support.
 */
function clashesOf(objects: DrawnObject[], fulcrums: Fulcrum[]): [number, number][] {
  const out: [number, number][] = []
  const boxOf = (o: DrawnObject) => {
    const w = objectWidth(o.kind, o.size)
    const h = objectHeight(o.kind, o.size)
    return { left: o.at.x - w / 2, right: o.at.x + w / 2, top: o.at.y - h, bottom: o.at.y }
  }
  for (const o of objects) {
    const b = boxOf(o)
    for (const f of fulcrums) {
      const [apex, baseL, baseR] = f.triangle
      if (b.bottom <= apex.y || b.top >= baseL.y) continue
      // The triangle's half-width at the object's lowest point within it.
      const y = Math.min(b.bottom, baseL.y)
      const half = ((baseR.x - baseL.x) / 2) * ((y - apex.y) / (baseL.y - apex.y))
      if (b.left < apex.x + half - 1 && b.right > apex.x - half + 1) {
        out.push([o.of, -1])
        break
      }
    }
  }
  for (let i = 0; i < objects.length; i++)
    for (let j = i + 1; j < objects.length; j++) {
      const a = boxOf(objects[i])
      const b = boxOf(objects[j])
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push([objects[i].of, objects[j].of])
    }
  return out
}
const text = (t: string): Label => ({ mode: 'text', text: t })

/** A label that shows its value when it is written and left empty. */
export const valueLabel = (label: Label, value: string): Label => (label.mode === 'text' && !label.text.trim() ? text(value) : label)

/** A support's force label with a letter after it: F → F_A, F_N → F_{NA}. */
export function suffixed(label: Label, suffix: string): Label {
  const braced = /^(.*)_\{(.*)\}$/.exec(label.text)
  const single = /^(.*)_(.)$/u.exec(label.text)
  const t = braced ? `${braced[1]}_{${braced[2]}${suffix}}` : single ? `${single[1]}_{${single[2]}${suffix}}` : label.text ? `${label.text}_${suffix}` : ''
  return { ...label, text: t }
}

/** An object's outline and its diagonals, so no label is placed on it or inside it. */
const objectLines = (left: number, top: number, right: number, bottom: number): Segment[] => [
  ...boxLines(left, top, right, bottom),
  { x1: left, y1: top, x2: right, y2: bottom },
  { x1: right, y1: top, x2: left, y2: bottom },
]

const boxLines = (left: number, top: number, right: number, bottom: number): Segment[] => [
  { x1: left, y1: top, x2: right, y2: top },
  { x1: right, y1: top, x2: right, y2: bottom },
  { x1: right, y1: bottom, x2: left, y2: bottom },
  { x1: left, y1: bottom, x2: left, y2: top },
]

/** Lines along the figure's edges and beyond them, so no label is placed off the figure. */
function fences(): Segment[] {
  const out: Segment[] = []
  for (let d = MARGIN - 4; d > -160; d -= 12) {
    out.push({ x1: -200, y1: d, x2: WIDTH + 200, y2: d }, { x1: -200, y1: HEIGHT - d, x2: WIDTH + 200, y2: HEIGHT - d })
    out.push({ x1: d, y1: -200, x2: d, y2: HEIGHT + 200 }, { x1: WIDTH - d, y1: -200, x2: WIDTH - d, y2: HEIGHT + 200 })
  }
  return out
}

/** A label's width as drawn. */
const widthOf = (l: Label) => labelBox(pt(0, 0), l).w

/**
 * Places for arrows on top of the beam, keyed as given: arrows closer than
 * 14 px are set side by side, 18 px apart, around where they were.
 */
function spread(arrows: { key: string; x: number }[]): Map<string, number> {
  const out = new Map<string, number>()
  const sorted = [...arrows].sort((a, b) => a.x - b.x)
  for (let k = 0; k < sorted.length; ) {
    let n = 1
    while (k + n < sorted.length && sorted[k + n].x - sorted[k + n - 1].x < 14) n++
    const group = sorted.slice(k, k + n)
    const middle = group.reduce((t, a) => t + a.x, 0) / n
    group.forEach((a, j) => out.set(a.key, n === 1 ? a.x : Math.round((middle + (j - (n - 1) / 2) * 18) * 100) / 100))
    k += n
  }
  return out
}

/** Does a label fit inside an object? */
function fitsInside(l: Label, kind: 'block' | 'ball', size: number): boolean {
  if (l.mode === 'none') return true
  const room = (kind === 'ball' ? 0.72 : 0.9) * objectWidth(kind, size)
  return labelWidth(l) + 4 <= room && objectHeight(kind, size) >= LABEL_SIZE + 4
}

/** How long each hanging object's string is: the shortest, unless it would hit a neighbour at that height. */
function stringLevels(loads: { i: number; x: number; w: number }[]): Map<number, number> {
  const levels = new Map<number, number>()
  const placed: { x: number; w: number; level: number }[] = []
  for (const l of [...loads].sort((a, b) => a.x - b.x)) {
    let level = 0
    while (level < 2 && placed.some((p) => p.level === level && Math.abs(p.x - l.x) < (p.w + l.w) / 2 + 6)) level++
    placed.push({ x: l.x, w: l.w, level })
    levels.set(l.i, level)
  }
  return levels
}

/** For each support drawn (the pivot, or A and B), does its force on the beam point down? */
export function supportDirections(s: TorqueSettings): boolean[] {
  if (s.support === 'pivot') {
    const f = pivotSums(s).pivotForce
    return [f < -1e-9 * Math.max(1, Math.abs(f))]
  }
  if (s.support === 'two') {
    const t = twoSums(s)
    return t.together ? [false, false] : [t.negative === 'A', t.negative === 'B']
  }
  return []
}

export function buildTorque(s: TorqueSettings): TorqueFigure {
  const L = s.length
  const isWall = s.support === 'wall'
  const withCable = isWall && s.cable
  const objectOf = (l: Load) => (l.kind === 'hanging' || l.kind === 'resting' ? { kind: l.shape as 'block' | 'ball', size: l.size } : null)
  const tallest = Math.max(0, ...s.loads.filter((l) => l.kind === 'hanging').map((l) => objectHeight(l.shape as 'block', l.size)))
  const levelString = (level: number) => STRING + level * (tallest + 14)
  const loadLabels = s.loads.map((l) => valueLabel(l.label, valueText(l.value, s)))
  /** Does an object's label go inside it? Not on a resting object with a weight arrow down its middle. */
  const insideOf = (l: Load, i: number) => fitsInside(loadLabels[i], l.shape as 'block', l.size) && !(l.kind === 'resting' && s.weightArrows)

  // A fixed beam's wall moment goes on the other side of the beam from the wall's force: below it, unless that force points down.
  const fixedSum = isWall && !s.cable ? wallSums(s) : null
  const showMoment = !!fixedSum && s.supportForces && Math.abs(fixedSum.moment) > 1e-9
  const wallDown = !!fixedSum && fixedSum.up < -1e-9
  // An object hanging near the wall would sit on the arrow below the beam, so the moment goes above and the wall's force below.
  const hangingNearWall =
    !!fixedSum && s.loads.some((l) => l.kind === 'hanging' && (onBeam(l.position, L) / L) * BEAM - objectWidth(l.shape as 'block', l.size) / 2 < MOMENT_R + 6)
  const momentBelow = showMoment && !wallDown && !hangingNearWall
  /** Is a fixed beam's wall force drawn under the beam (pushing up onto it, or pulling down)? */
  const wallForceBelow = !!fixedSum && (wallDown || (showMoment && !momentBelow))

  // How far below the beam's underside things reach, for a beam `px` long.
  const stringsFor = (left: number, px: number) =>
    stringLevels(
      s.loads.flatMap((l, i) => (l.kind === 'hanging' ? [{ i, x: left + (onBeam(l.position, L) / L) * px, w: objectWidth(l.shape as 'block', l.size) }] : [])),
    )
  const belowFor = (levels: Map<number, number>) => {
    let below = isWall ? 0 : FULCRUM_HEIGHT + GROUND_DEPTH + (s.support === 'two' && s.supportNames ? 4 + LH : 0)
    s.loads.forEach((l, i) => {
      if (l.kind !== 'hanging') return
      const h = objectHeight(l.shape as 'block', l.size)
      const inside = fitsInside(loadLabels[i], l.shape as 'block', l.size)
      below = Math.max(below, levelString(levels.get(i) ?? 0) + h + (s.weightArrows ? WEIGHT_ARROW + 2 : 0) + (inside ? 0 : 4 + LH))
    })
    if (s.beamWeight > 0) below = Math.max(below, ARROW + 4 + LH)
    if (withCable && s.supportForces) below = Math.max(below, 16 + 4 + LH + 4)
    if (momentBelow) below = Math.max(below, MOMENT_R + 4 + LH)
    if (wallForceBelow && s.supportForces) below = Math.max(below, ARROW + 4)
    return below + 4
  }

  // Along the beam. A beam at a wall is shortened, if it must be, for its cable to reach the wall at its angle.
  const tan = Math.tan((s.cableAngle * Math.PI) / 180)
  let left = isWall ? WALL_X : BEAM_LEFT
  let px = BEAM
  if (withCable) {
    const share = onBeam(s.cableAt, L) / L
    const below = belowFor(stringsFor(left, BEAM))
    const room = HEIGHT - 2 * MARGIN - below - THICKNESS - 4
    if (share > 0 && share * BEAM * tan > room) px = clamp(room / (tan * share), MIN_WALL_BEAM, BEAM)
  }
  const X = (x: number) => left + (onBeam(x, L) / L) * px
  const levels = stringsFor(left, px)
  const below = belowFor(levels)

  // Above the beam, before the distance marks: what stands on it or points up from it.
  // Each column's top is where its witness line starts.
  const columns: { x1: number; x2: number; rise: number }[] = []
  const column = (x: number, half: number, rise: number) => columns.push({ x1: x - half, x2: x + half, rise })
  const arrowRise = (l: Label) => ARROW + (l.mode === 'none' ? 0 : 4 + LH)
  const supportXs = s.support === 'pivot' ? [X(s.pivot)] : s.support === 'two' ? [X(s.supportA), X(s.supportB)] : []
  const beamMiddle = X(L / 2)
  const hangingNearMiddle = s.loads.some((l) => l.kind === 'hanging' && Math.abs(X(l.position) - beamMiddle) < 30)
  const beamWeightOnTop = s.beamWeight > 0 && (supportXs.some((x) => Math.abs(x - beamMiddle) < 30) || hangingNearMiddle)
  const beamLabel = valueLabel(s.beamLabel, valueText(s.beamWeight, s))
  const supportLabels: Label[] =
    s.support === 'pivot' ? [s.supportLabel] : s.support === 'two' ? [suffixed(s.supportLabel, 'A'), suffixed(s.supportLabel, 'B')] : []
  // Arrows on top of the beam at the same place (the beam's weight and the pivot's force, say) are drawn side by side.
  const arrowX = spread([
    ...s.loads.flatMap((l, i) => (l.kind === 'down' || l.kind === 'up' ? [{ key: `load${i}`, x: X(l.position) }] : [])),
    ...(beamWeightOnTop ? [{ key: 'beam', x: beamMiddle }] : []),
    ...(s.supportForces ? supportXs.map((x, k) => ({ key: `support${k}`, x })) : []),
  ])
  s.loads.forEach((l, i) => {
    const x = X(l.position)
    if (l.kind === 'resting') {
      const h = objectHeight(l.shape as 'block', l.size)
      column(x, objectWidth(l.shape as 'block', l.size) / 2, h + (insideOf(l, i) ? 0 : 4 + LH))
    } else if (l.kind === 'down' || l.kind === 'up') column(arrowX.get(`load${i}`)!, 8, arrowRise(loadLabels[i]))
  })
  if (beamWeightOnTop) column(arrowX.get('beam')!, 8, arrowRise(beamLabel))
  if (s.supportForces) supportXs.forEach((_, k) => column(arrowX.get(`support${k}`)!, 8, arrowRise(supportLabels[k])))
  const wallSum = isWall ? wallSums(s) : null
  const wallUpX = WALL_X + 16
  const wallUp = isWall && s.supportForces && wallSum && Math.abs(wallSum.up) > 1e-9 && !(withCable && wallSum.cableProblem)
  const wallUpLabel = withCable ? { ...s.supportLabel, text: componentLabel(s.supportLabel.text, 'y') } : s.supportLabel
  if (wallUp && wallSum!.up > 0 && !wallForceBelow) column(wallUpX, 8, ARROW + 4)
  if (showMoment && !momentBelow) column(left + MOMENT_R / 2, MOMENT_R / 2 + 4, MOMENT_R + 4 + LH)
  const above = Math.max(0, ...columns.map((c) => c.rise))
  const riseAt = (x: number) => Math.max(0, ...columns.filter((c) => x >= c.x1 - 2 && x <= c.x2 + 2).map((c) => c.rise))

  // The distance marks: from the pivot, support A or the wall, to each load, and to B or the cable.
  const refX = s.support === 'pivot' ? X(s.pivot) : s.support === 'two' ? X(s.supportA) : left
  const loadX = s.loads.map((l) => X(l.position))
  const extra: { x: number; d: number }[] = []
  if (s.support === 'two') extra.push({ x: X(s.supportB), d: onBeam(s.supportB, L) - onBeam(s.supportA, L) })
  if (withCable) extra.push({ x: X(s.cableAt), d: onBeam(s.cableAt, L) })
  const extraMarks = extra.filter((e) => !loadX.some((x) => Math.abs(x - e.x) < 0.5))
  const markLabels: Label[] = [
    ...s.loads.map((l, i) => valueLabel(l.distanceLabel, loadDistanceText(s, i))),
    ...extraMarks.map((e) => text(distanceText(e.d, s))),
  ]
  const markXs = [...loadX, ...extraMarks.map((e) => e.x)]
  // A first try, just to count the rows. A mark left off is a point at the pivot, which gets none.
  const keep = markXs.map(() => true)
  const counted = s.distances ? distanceMarks(markXs.map((x) => ({ x, y: 0 })), 0, 'fromPivot', { pivot: { x: refX, y: 0 }, rowGap: ROW, upward: true }) : null
  const lengthRows = s.lengthMark ? 1 : 0
  const rowsHeight = (rows: number) => (rows ? ROWS_GAP + (rows - 1) * ROW + LH + 6 : 0)

  // Up and down: centered when it all fits, otherwise at the bottom with the rows that fit.
  const avail = HEIGHT - 2 * MARGIN
  const cableRise = withCable ? (onBeam(s.cableAt, L) / L) * px * tan + 4 : 0
  const rows = (counted?.rows ?? 0) + lengthRows
  const aboveAll = Math.max(above + rowsHeight(rows), cableRise, isWall ? 40 : 0)
  let beamTop: number
  let dropped = 0
  let lengthShown = s.lengthMark
  if (aboveAll + THICKNESS + below <= avail) beamTop = MARGIN + (avail - aboveAll - THICKNESS - below) / 2 + aboveAll
  else {
    beamTop = HEIGHT - MARGIN - below - THICKNESS
    const room = beamTop - MARGIN - above
    const fit = room >= ROWS_GAP + LH + 6 ? Math.floor((room - ROWS_GAP - LH - 6) / ROW) + 1 : 0
    if (rows > fit && lengthRows) {
      // The whole length goes first: each load's distance matters more.
      lengthShown = false
      dropped++
    }
    if ((counted?.rows ?? 0) > fit && counted) {
      // Then the marks farthest from the beam, until the rest fit.
      const distanceRows = fit
      for (const m of counted.marks) {
        if (m.row >= distanceRows) {
          const i = m.between[0] === -1 ? m.between[1] : m.between[0]
          if (keep[i]) {
            keep[i] = false
            dropped++
          }
        }
      }
    }
  }
  beamTop = Math.round(beamTop * 100) / 100

  // The beam.
  const middle = beamTop + THICKNESS / 2
  const fixed = isWall && !s.cable
  const beam = beamRect(pt(fixed ? left - INTO_WALL : left, middle), pt(left + px, middle), THICKNESS)
  const underside = beam.y + beam.height
  const top = beam.y

  // What holds it up.
  const fulcrums = supportXs.map((x) => fulcrum(pt(x, underside), FULCRUM_HEIGHT))
  const groundY = underside + FULCRUM_HEIGHT
  const cable = withCable ? cableTo(beam, X(s.cableAt), left, s.cableAngle, clamp((X(s.cableAt) - left) * 0.6, 16, 34)) : null
  const hinge = withCable ? hingeAt(beam, left) : null

  // The loads.
  const strings: Segment[] = []
  const objects: DrawnObject[] = []
  const arrows: DrawnArrow[] = []
  const placings: (Placing & { key: string; onVector: boolean })[] = []
  const labels: PlacedLabel[] = []
  const lines: Segment[] = []
  const up = { x: 0, y: -1 }
  const down = { x: 0, y: 1 }
  /** An arrow's label moves up out of the way, or sideways when the arrow is set beside another. */
  const outFor = (key: string, x: number) => {
    const moved = (arrowX.get(key) ?? x) - x
    return Math.abs(moved) > 0.5 ? { x: Math.sign(moved), y: 0 } : up
  }
  s.loads.forEach((l, i) => {
    const x = loadX[i]
    const label = loadLabels[i]
    const obj = objectOf(l)
    if (obj) {
      const h = objectHeight(obj.kind, obj.size)
      const w = objectWidth(obj.kind, obj.size)
      const inside = insideOf(l, i)
      if (l.kind === 'hanging') {
        const hang = hangingObject(beam, x, levelString(levels.get(i) ?? 0), h)
        strings.push(hang.string)
        lines.push(hang.string)
        objects.push({ of: i, ...obj, at: hang.at })
        lines.push(...objectLines(x - w / 2, hang.top, x + w / 2, hang.bottom))
        const arrowEnd = hang.bottom + (s.weightArrows ? WEIGHT_ARROW : 0)
        if (s.weightArrows) arrows.push({ key: `weight${i}`, v: { x1: x, y1: hang.bottom, x2: x, y2: arrowEnd } })
        if (inside) labels.push({ key: `load${i}`, label, at: pt(x, hang.top + h / 2), onVector: false, inside: true })
        else placings.push({ key: `load${i}`, label, at: pt(x, arrowEnd + 4 + LH / 2), out: down, onVector: false })
      } else {
        objects.push({ of: i, ...obj, at: pt(x, top) })
        lines.push(...objectLines(x - w / 2, top - h, x + w / 2, top))
        if (s.weightArrows) arrows.push({ key: `weight${i}`, v: { x1: x, y1: top - h / 2, x2: x, y2: top - 2 } })
        if (inside) labels.push({ key: `load${i}`, label, at: pt(x, top - h / 2), onVector: false, inside: true })
        else placings.push({ key: `load${i}`, label, at: pt(x, top - h - 4 - LH / 2), out: up, onVector: false })
      }
    } else {
      const ax = arrowX.get(`load${i}`)!
      const v = forceOnBeam(beam, ax, l.kind === 'up' ? 'up' : 'down', ARROW)
      arrows.push({ key: `load${i}`, v })
      placings.push({ key: `load${i}`, label, at: pt(ax, top - ARROW - 4 - LH / 2), out: outFor(`load${i}`, x), onVector: true })
    }
  })

  // The beam's own weight, from its middle: down from its underside, or onto its top when a support or object is there.
  if (s.beamWeight > 0) {
    const bx = arrowX.get('beam') ?? beamMiddle
    const v = beamWeightOnTop ? forceOnBeam(beam, bx, 'down', ARROW) : forceOnBeam(beam, beamMiddle, 'down', ARROW, 'bottom')
    arrows.push({ key: 'beam', v })
    placings.push(
      beamWeightOnTop
        ? { key: 'beam', label: beamLabel, at: pt(bx, top - ARROW - 4 - LH / 2), out: outFor('beam', beamMiddle), onVector: true }
        : { key: 'beam', label: beamLabel, at: pt(beamMiddle, underside + ARROW + 4 + LH / 2), out: down, onVector: true },
    )
  }

  // The forces holding the beam up.
  if (s.supportForces) {
    // A support whose force comes out down (a pivot under forces that are all up, or a support the beam would lift off) points down onto the beam.
    const supportDown = supportDirections(s)
    supportXs.forEach((_, k) => {
      const x = arrowX.get(`support${k}`)!
      arrows.push({ key: `support${k}`, v: forceOnBeam(beam, x, supportDown[k] ? 'down' : 'up', ARROW) })
      placings.push({ key: `support${k}`, label: supportLabels[k], at: pt(x, top - ARROW - 4 - LH / 2), out: outFor(`support${k}`, supportXs[k]), onVector: true })
    })
    if (wallUp) {
      const goingUp = wallSum!.up > 0
      const below = goingUp ? wallForceBelow : true
      arrows.push({ key: 'wallUp', v: forceOnBeam(beam, wallUpX, goingUp ? 'up' : 'down', ARROW, below ? 'bottom' : 'top') })
      // Beside its head, away from the wall, where the cable is least in the way.
      const half = widthOf(wallUpLabel) / 2
      placings.push({
        key: 'wallUp',
        label: wallUpLabel,
        at: below ? pt(wallUpX + 6 + half, underside + ARROW - LH / 2) : pt(wallUpX + 6 + half, top - ARROW + LH / 2),
        out: { x: 1, y: 0 },
        onVector: true,
      })
    }
    if (withCable && cable && wallSum && !wallSum.cableProblem) {
      // The tension along the cable from the beam, and the wall's push along the beam under it.
      const c = cable.line
      const len = Math.hypot(c.x2 - c.x1, c.y2 - c.y1)
      const reach = Math.min(ARROW + 10, len)
      const t = { x1: c.x1, y1: c.y1, x2: c.x1 + ((c.x2 - c.x1) / len) * reach, y2: c.y1 + ((c.y2 - c.y1) / len) * reach }
      arrows.push({ key: 'tension', v: t })
      // Beside the arrow's middle, on the side away from the beam.
      const a = (s.cableAngle * Math.PI) / 180
      const side = { x: Math.sin(a), y: -Math.cos(a) }
      const off = 10 + (widthOf(s.tensionLabel) / 2) * side.x + (LH / 2) * -side.y
      placings.push({
        key: 'tension',
        label: s.tensionLabel,
        at: pt((t.x1 + t.x2) / 2 + side.x * off, (t.y1 + t.y2) / 2 + side.y * off),
        out: side,
        onVector: true,
      })
      if (Math.abs(wallSum.along) > 1e-9) {
        const y = underside + 16
        arrows.push({ key: 'wallAlong', v: { x1: left + 4, y1: y, x2: left + 4 + ARROW, y2: y } })
        const along = { ...s.supportLabel, text: componentLabel(s.supportLabel.text, 'x') }
        placings.push({ key: 'wallAlong', label: along, at: pt(left + 4 + ARROW / 2, y + 4 + LH / 2), out: down, onVector: true })
      }
    }
  }

  // The wall's moment on a fixed beam: a curved arrow round the beam's end, against the loads' turning.
  let moment: TorqueFigure['moment'] = null
  if (showMoment) {
    const clockwise = -fixedSum!.moment > 0
    const P = (deg: number) => pt(left + MOMENT_R * Math.cos((deg * Math.PI) / 180), middle + MOMENT_R * Math.sin((deg * Math.PI) / 180))
    // y is down, so a growing angle turns clockwise as drawn.
    const [lo, hi] = momentBelow ? [14, 80] : [-80, -14]
    const [from, to] = clockwise ? [lo, hi] : [hi, lo]
    const dir = Math.sign(to - from)
    const headDeg = ((MOMENT_HEAD / MOMENT_R) * 180) / Math.PI
    const tip = P(to)
    const back = P(to - dir * headDeg)
    const len = Math.hypot(tip.x - back.x, tip.y - back.y)
    const u = { x: (tip.x - back.x) / len, y: (tip.y - back.y) / len }
    const base = { x: tip.x - u.x * MOMENT_HEAD, y: tip.y - u.y * MOMENT_HEAD }
    const shaftEnd = P(to - dir * headDeg * 0.6)
    const start = P(from)
    moment = {
      d: `M${r2(start.x)},${r2(start.y)} A${MOMENT_R},${MOMENT_R} 0 0 ${dir > 0 ? 1 : 0} ${r2(shaftEnd.x)},${r2(shaftEnd.y)}`,
      head: [tip, pt(r2(base.x - u.y * 5.5), r2(base.y + u.x * 5.5)), pt(r2(base.x + u.y * 5.5), r2(base.y - u.x * 5.5))],
      clockwise,
    }
    for (let k = 0; k < 8; k++) lines.push(seg2(P(lo + ((hi - lo) * k) / 8), P(lo + ((hi - lo) * (k + 1)) / 8)))
    lines.push(...head3(moment.head))
    const mid = (lo + hi) / 2
    const out = { x: Math.cos((mid * Math.PI) / 180), y: Math.sin((mid * Math.PI) / 180) }
    const half = widthOf(s.momentLabel) / 2
    const reach = MOMENT_R + 8 + Math.max(half * Math.abs(out.x), (LH / 2) * Math.abs(out.y))
    placings.push({ key: 'moment', label: s.momentLabel, at: pt(left + out.x * reach, middle + out.y * reach), out, onVector: true })
  }

  // The cable's angle mark.
  if (cable) {
    placings.push({ key: 'angle', label: s.angleLabel, at: cable.labelAt, out: { x: -1, y: -0.3 }, onVector: false })
    lines.push(cable.line, ...arcPieces(pt(cable.line.x1, cable.line.y1), cable.arc))
  }

  // A and B under two supports.
  if (s.support === 'two' && s.supportNames) {
    ;['A', 'B'].forEach((name, k) =>
      placings.push({ key: `name${name}`, label: text(name), at: pt(supportXs[k], groundY + GROUND_DEPTH + 3 + LH / 2), out: down, onVector: false }),
    )
  }

  // The distance marks, in rows up from above the tallest thing on the beam.
  const crossing = cable ? [cable.line, ...arcPieces(pt(cable.line.x1, cable.line.y1), cable.arc)] : []
  const baseline = top - above - ROWS_GAP
  let marks: DistanceMarks | null = null
  if (s.distances && keep.some(Boolean)) {
    const points: BeamPoint[] = markXs.map((x, i) => (keep[i] ? { x, y: top - riseAt(x) } : { x: refX, y: top }))
    const m = distanceMarks(points, baseline, 'fromPivot', { pivot: { x: refX, y: top - riseAt(refX) }, rowGap: ROW, upward: true })
    // At a wall, the wall's line is the line they're measured from.
    marks = isWall ? { ...m, witnesses: m.witnesses.filter((w) => Math.abs(w.x1 - refX) > 0.5) } : m
    for (const mk of marks.marks) {
      const i = mk.between[0] === -1 ? mk.between[1] : mk.between[0]
      const label = markLabels[i]
      const half = widthOf(label) / 2
      // A label wider than its line moves away from the point it's measured from, so the two sides' labels don't meet.
      const x = mk.middle.x < refX ? Math.min(mk.middle.x, refX - 3 - half) : Math.max(mk.middle.x, refX + 3 + half)
      const y = mk.line.y1 - 5 - LH / 2
      // Along its line, off the cable that crosses the rows, nearest the middle first.
      const span = [Math.min(mk.line.x1, mk.line.x2) + half, Math.max(mk.line.x1, mk.line.x2) - half]
      const tries = [x, ...Array.from({ length: 60 }, (_, k) => x + (k % 2 ? 1 : -1) * 8 * Math.ceil((k + 1) / 2)).filter((t) => t >= span[0] && t <= span[1])]
      const clear = (t: number) => !crossing.some((c) => crosses(c, { x: t, y, w: half * 2, h: LH }))
      const at = pt(clamp(tries.find(clear) ?? x, MARGIN + half, WIDTH - MARGIN - half), y)
      labels.push({ key: `mark${i}`, label, at, onVector: false })
      lines.push(...boxLines(at.x - half, at.y - LH / 2, at.x + half, at.y + LH / 2))
    }
    // Each dimension line counted thicker, so no label sits right on it.
    lines.push(...marks.marks.flatMap((mk) => [-3, 0, 3].map((d) => ({ ...mk.line, y1: mk.line.y1 + d, y2: mk.line.y2 + d }))), ...marks.witnesses)
  }

  // The whole beam's length, above every other row.
  let lengthMark: TorqueFigure['lengthMark'] = null
  if (lengthShown) {
    const y = baseline - (marks?.rows ?? 0) * ROW
    const ends = [left, left + px]
    const line = { x1: left, y1: y, x2: left + px, y2: y }
    const witnesses = ends.filter((x) => !(isWall && x === left)).map((x) => ({ x1: x, y1: top - riseAt(x), x2: x, y2: y - 5 }))
    lengthMark = { line, witnesses }
    const label = valueLabel(s.lengthLabel, distanceText(L, s))
    const at = pt(left + px / 2, y - 5 - LH / 2)
    labels.push({ key: 'length', label, at, onVector: false })
    lines.push(line, ...witnesses, ...boxLines(at.x - widthOf(label) / 2, at.y - LH / 2, at.x + widthOf(label) / 2, at.y + LH / 2))
  }

  // The wall: up past the cable and the marks, and down past the beam.
  let wall: Support | null = null
  if (isWall) {
    const highest = Math.min(cable ? cable.line.y2 : top, marks ? marks.bottom : top, lengthMark ? lengthMark.line.y1 : top, top - 40)
    const wallTop = Math.max(0, highest - 14)
    const wallBottom = Math.min(HEIGHT, underside + 60)
    const w = wallAt(left, wallTop, wallBottom)
    // A fixed beam goes into the wall, so no hatch crosses it.
    wall = fixed ? { ...w, hatches: w.hatches.filter((h) => Math.max(h.y1, h.y2) < top - 1 || Math.min(h.y1, h.y2) > underside + 1) } : w
    lines.push(w.line)
  }

  for (const a of arrows) lines.push(a.v)
  lines.push(...boxLines(beam.x, beam.y, beam.x + beam.width, underside))
  for (const f of fulcrums) {
    lines.push({ x1: f.triangle[0].x, y1: f.triangle[0].y, x2: f.triangle[1].x, y2: f.triangle[1].y })
    lines.push({ x1: f.triangle[0].x, y1: f.triangle[0].y, x2: f.triangle[2].x, y2: f.triangle[2].y })
    lines.push(f.ground.line)
  }

  // Every other label, each clear of the rest, the lines and the figure's edges.
  const within = (at: Point, label: Label): Point => {
    const half = widthOf(label) / 2
    return pt(clamp(at.x, MARGIN + half, WIDTH - MARGIN - half), clamp(at.y, MARGIN + LH / 2, HEIGHT - MARGIN - LH / 2))
  }
  for (const p of placings) p.at = within(p.at, p.label)
  const placed = placeLabels(placings, [...lines, ...fences()], null)
  placings.forEach((p, i) => labels.push({ key: p.key, label: p.label, at: within(placed[i], p.label), onVector: p.onVector }))

  return {
    width: WIDTH,
    height: HEIGHT,
    beam,
    fulcrums,
    wall,
    hinge,
    cable,
    strings,
    objects,
    arrows,
    marks,
    lengthMark,
    labels,
    loadX,
    supportX: withCable ? [X(s.cableAt)] : supportXs,
    dropped,
    cableOffTop: !!cable && cable.line.y2 < 0,
    moment,
    clashes: clashesOf(objects, fulcrums),
  }
}

/** What the figure shows, for screen readers. It names no value, so it never gives an answer away. */
export function describe(s: Pick<TorqueSettings, 'support' | 'loads' | 'cable' | 'beamWeight'>): string {
  const n = s.loads.length
  const held =
    s.support === 'pivot' ? 'on a pivot' : s.support === 'two' ? 'on two supports' : s.cable ? 'held at a wall by a hinge and a cable' : 'fixed into a wall'
  return `A ${s.beamWeight > 0 ? '' : 'light '}beam ${held}, with ${n ? `${n} load${n === 1 ? '' : 's'} on it` : 'nothing on it'}`
}
