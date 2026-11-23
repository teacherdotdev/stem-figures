// Where everything in a Lever figure goes, before mirroring: the beam on its
// fulcrum, the load, the force arrows, the two arms' dimension lines and
// every label, in a fixed 640 × 400 figure.
//
// The beam is drawn to scale from the two arms. Unmirrored, a class 1 lever
// has its load on the left and its effort on the right; a class 2 or 3 lever
// has its fulcrum at the left end.

import { LABEL_SCALE } from '$shared/labelSize'
import { beamRect, distanceMarks, forceOnBeam, fulcrum, FULCRUM_SLOPE, GROUND_DEPTH, type DistanceMarks, type Fulcrum, type Rect } from '$lib/shared/beam'
import type { Label } from '$lib/shared/label'
import { LABEL_SIZE, labelBox, placeLabels, pt, type Box, type Placing } from '$lib/shared/layout'
import { objectHeight, objectWidth } from '$lib/shared/objects'
import type { Point, Segment } from '$lib/shared/vector'
import { leverOf, valueTexts, type LeverSettings } from './settings'

export const WIDTH = 640
export const HEIGHT = 400
/** How long the beam is drawn. */
export const BEAM = 480
/** How far the beam runs past the outermost load, effort or fulcrum, at each end. */
export const OVERHANG = 30
/** From the outermost point at one end of the beam to the one at the other. */
export const SPAN = BEAM - 2 * OVERHANG
/** The shortest an arm is drawn, and the nearest a load and an effort on the same side are drawn: 15% of the beam. */
export const MIN_ARM = 0.15 * BEAM
export const BEAM_TOP = 204
export const THICKNESS = 14
export const FULCRUM_HEIGHT = 54
/** The load's block, as an Object's size. */
export const BLOCK_SIZE = 0.85
/** The longest and shortest a force arrow is drawn. */
export const LONGEST = 110
export const SHORTEST = 45
/** From the fulcrum's hatches down to the first dimension line. */
const MARK_GAP = 16
/** From a dimension line down to its label. */
const MARK_LABEL_GAP = 5
/** How near the figure's edge a label may come. */
const EDGE = 4

export type LabelKey = 'loadValue' | 'effortValue' | 'loadName' | 'effortName' | 'fulcrumName' | 'effortArm' | 'loadArm'

export interface PlacedLabel {
  key: LabelKey
  label: Label
  /** the middle of the label */
  at: Point
  /** the label of a force arrow, drawn in the vectors' color */
  onVector: boolean
}

export interface LeverFigure {
  width: number
  height: number
  beam: Rect
  fulcrum: Fulcrum
  /** where along the beam the fulcrum, the load and the effort are */
  x: { fulcrum: number; load: number; effort: number }
  /** the load's block, by its bottom middle, when it's drawn as one */
  block: { at: Point; size: number } | null
  forces: { kind: 'effort' | 'load'; v: Segment }[]
  marks: DistanceMarks | null
  labels: PlacedLabel[]
  labelSize: number
  /** are both arms drawn to scale? Not when one would be too short to label. */
  toScale: boolean
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/**
 * How long each arm is drawn. To scale, except that no arm is shorter than
 * MIN_ARM, and on a class 2 or 3 lever the load and effort are at least that
 * far apart, so both arms' labels and dimension lines fit.
 */
export function drawnArms(s: Pick<LeverSettings, 'class' | 'effortArm' | 'loadArm'>): { effort: number; load: number; toScale: boolean } {
  if (s.class === '1') {
    const raw = (SPAN * s.loadArm) / (s.loadArm + s.effortArm)
    const load = clamp(raw, MIN_ARM, SPAN - MIN_ARM)
    return { effort: SPAN - load, load, toScale: Math.abs(load - raw) < 0.01 }
  }
  // The longer arm reaches the far end: the effort's on a class 2 lever, the load's on a class 3.
  const raw = (SPAN * Math.min(s.effortArm, s.loadArm)) / Math.max(s.effortArm, s.loadArm)
  const short = clamp(raw, MIN_ARM, SPAN - MIN_ARM)
  const toScale = Math.abs(short - raw) < 0.01
  return s.class === '2' ? { effort: SPAN, load: short, toScale } : { effort: short, load: SPAN, toScale }
}

/** How long two forces' arrows are: the bigger one LONGEST, the other in proportion but no shorter than SHORTEST. */
export function arrowLengths(effort: number, load: number): { effort: number; load: number } {
  const big = Math.max(effort, load)
  const len = (f: number) => Math.round(clamp((LONGEST * f) / big, SHORTEST, LONGEST) * 100) / 100
  return { effort: len(effort), load: len(load) }
}

/** A value's label: what the teacher typed, or the value itself when it's written and left empty. */
const valueLabel = (label: Label, value: string): Label => (label.mode === 'text' && !label.text.trim() ? { mode: 'text', text: value } : label)

/** A label's box at this label size (labelBox is for LABEL_SIZE). */
export function scaledBox(at: Point, label: Label, sc: number): Box {
  const b = labelBox(pt(at.x / sc, at.y / sc), label)
  return { x: at.x, y: at.y, w: b.w * sc, h: b.h * sc }
}

/** placeLabels at this label size: the figure shrunk to LABEL_SIZE's scale, placed there, and grown back. */
function placeScaled(placings: Placing[], lines: Segment[], sc: number): Point[] {
  const p = (q: Point) => pt(q.x / sc, q.y / sc)
  const shrunk = placings.map((q) => ({ ...q, at: p(q.at), alt: q.alt && p(q.alt) }))
  const ls = lines.map((v) => ({ x1: v.x1 / sc, y1: v.y1 / sc, x2: v.x2 / sc, y2: v.y2 / sc }))
  return placeLabels(shrunk, ls, null).map((q) => pt(q.x * sc, q.y * sc))
}

const box4 = (left: number, top: number, right: number, bottom: number): Segment[] => [
  { x1: left, y1: top, x2: right, y2: top },
  { x1: right, y1: top, x2: right, y2: bottom },
  { x1: right, y1: bottom, x2: left, y2: bottom },
  { x1: left, y1: bottom, x2: left, y2: top },
]

/**
 * Lines along the figure's top, left and right edges, and more beyond them,
 * so no label is moved off the figure: names and values move up and a little
 * sideways, and the fulcrum's name farther sideways.
 */
function fences(fulcrumY: number): Segment[] {
  const out: Segment[] = []
  for (let d = EDGE - 2; d > -150; d -= 14) out.push({ x1: 0, y1: d, x2: WIDTH, y2: d })
  // A name or value moves sideways no more than 36 px at the middle label size.
  for (let d = EDGE - 2; d > -60; d -= 8) out.push({ x1: d, y1: 0, x2: d, y2: fulcrumY - 40 }, { x1: WIDTH - d, y1: 0, x2: WIDTH - d, y2: fulcrumY - 40 })
  for (let d = EDGE - 2; d > -150; d -= 8)
    out.push({ x1: d, y1: fulcrumY - 40, x2: d, y2: fulcrumY + 40 }, { x1: WIDTH - d, y1: fulcrumY - 40, x2: WIDTH - d, y2: fulcrumY + 40 })
  return out
}

export function buildLever(s: LeverSettings): LeverFigure {
  const sums = leverOf(s)
  const values = valueTexts(s)
  const sc = LABEL_SCALE[s.labelSize]
  const ls = LABEL_SIZE * sc
  /** How tall a label's box is. */
  const lh = (LABEL_SIZE + 4) * sc

  // Along the beam.
  const arms = drawnArms(s)
  const left = s.class === '1' ? (WIDTH - BEAM) / 2 : (WIDTH - BEAM) / 2 + 30
  const x =
    s.class === '1'
      ? { load: left + OVERHANG, fulcrum: left + OVERHANG + arms.load, effort: left + OVERHANG + SPAN }
      : { fulcrum: left + OVERHANG, load: left + OVERHANG + arms.load, effort: left + OVERHANG + arms.effort }
  const middle = BEAM_TOP + THICKNESS / 2
  const beam = beamRect(pt(left, middle), pt(left + BEAM, middle), THICKNESS)
  const underside = beam.y + beam.height
  const stand = fulcrum(pt(x.fulcrum, underside), FULCRUM_HEIGHT)
  const groundY = underside + FULCRUM_HEIGHT

  // The load and the forces. A mass is always a block: an arrow is a force.
  const asBlock = s.loadShown === 'block' || sums.mass
  const lengths = arrowLengths(sums.effort, sums.weight)
  const effortV = forceOnBeam(beam, x.effort, s.class === '1' ? 'down' : 'up', lengths.effort)
  const loadV = asBlock ? null : forceOnBeam(beam, x.load, 'down', lengths.load)
  const block = asBlock ? { at: pt(x.load, beam.y), size: BLOCK_SIZE } : null
  const forces: LeverFigure['forces'] = [{ kind: 'effort', v: effortV }, ...(loadV ? [{ kind: 'load' as const, v: loadV }] : [])]
  const blockH = objectHeight('block', BLOCK_SIZE)
  const blockW = objectWidth('block', BLOCK_SIZE)

  // The arms' dimension lines, under the fulcrum's ground.
  const rowGap = MARK_LABEL_GAP + lh + 9
  const marks = s.arms
    ? distanceMarks([pt(x.load, underside + 4), pt(x.effort, underside + 4)], groundY + GROUND_DEPTH + MARK_GAP, 'fromPivot', {
        pivot: pt(x.fulcrum, groundY + GROUND_DEPTH + 3),
        rowGap,
      })
    : null

  // Names above values above each force (or the block); the fulcrum's name beside it.
  const loadLabel = valueLabel(s.loadLabel, values.load)
  const effortLabel = valueLabel(s.effortLabel, values.effort)
  const up = { x: 0, y: -1 }
  /** Along the beam toward the fulcrum, which is at the left end of a class 2 or 3 lever. */
  const toFulcrum = { x: -1, y: 0 }
  const above = (top: number, value: Label): [Point, Point] => {
    const valueAt = pt(0, top - 6 - lh / 2)
    return [valueAt, pt(0, value.mode === 'none' ? valueAt.y : valueAt.y - lh - 3 * sc)]
  }
  const [loadValueAt, loadNameAt] = above(block ? beam.y - blockH : beam.y - lengths.load, loadLabel)
  const [effortValueAt, effortNameAt] = above(beam.y - lengths.effort, effortLabel)
  // Each force's name and value are a column over it. On a class 2 or 3 lever
  // the two columns can be too near to fit side by side, so they move apart:
  // the outer one toward the beam's end, then the inner one toward the
  // fulcrum, each staying over its own force and clear of the other's.
  const column = { load: x.load, effort: x.effort }
  let beside: { part: 'load' | 'effort'; value: Point; name: Point } | null = null
  if (s.class !== '1') {
    const [inner, outer] = s.class === '2' ? (['load', 'effort'] as const) : (['effort', 'load'] as const)
    const widthOf = (part: 'load' | 'effort') =>
      Math.max(...(part === 'load' ? [loadLabel, s.loadName] : [effortLabel, s.effortName]).map((l) => scaledBox(pt(0, 0), l, sc).w))
    const [wi, wo] = [widthOf(inner), widthOf(outer)]
    const gap = 6 * sc
    const most = (w: number) => Math.max(0, w / 2 - 8)
    const outward = clamp(Math.max(x[inner] + gap + wo / 2 - x[outer], (wi + wo) / 2 + gap - (x[outer] - x[inner])), 0, Math.min(most(wo), Math.max(0, WIDTH - EDGE - wo / 2 - x[outer])))
    column[outer] = x[outer] + outward
    const inward = clamp(Math.max(x[inner] + wi / 2 + gap - x[outer], (wi + wo) / 2 + gap - (column[outer] - x[inner])), 0, most(wi))
    column[inner] = x[inner] - inward
    // Columns that still meet (as at equal arms, which leave the two forces
    // only MIN_ARM apart, with long names) can't both stand over their forces,
    // so the inner one goes beside its force instead, on the fulcrum's side,
    // its name over its value, just above the beam.
    const shown = (part: 'load' | 'effort'): Box[] => {
      const rows: [Label, Point][] =
        part === 'load'
          ? [[loadLabel, loadValueAt], [s.loadName, loadNameAt]]
          : [[effortLabel, effortValueAt], [s.effortName, effortNameAt]]
      return rows.filter(([l]) => l.mode !== 'none').map(([l, at]) => scaledBox(pt(column[part], at.y), l, sc))
    }
    const meet = (a: Box, b: Box) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 + gap / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2
    if (shown(inner).some((a) => shown(outer).some((b) => meet(a, b)))) {
      const clear = (inner === 'load' && block ? blockW / 2 : 3) + 8 * sc
      const [value, name] = inner === 'load' ? [loadLabel, s.loadName] : [effortLabel, s.effortName]
      const valueY = beam.y - 4 - lh / 2
      const nameY = value.mode === 'none' ? valueY : valueY - lh - 3 * sc
      beside = {
        part: inner,
        value: pt(x[inner] - clear - scaledBox(pt(0, 0), value, sc).w / 2, valueY),
        name: pt(x[inner] - clear - scaledBox(pt(0, 0), name, sc).w / 2, nameY),
      }
    }
  }
  // Beside the fulcrum's triangle, halfway up: on the longer arm's side of a
  // class 1 lever, and outside the end of a class 2 or 3 lever, with the
  // other side as its second choice.
  const fulcrumW = scaledBox(pt(0, 0), s.fulcrumName, sc).w
  const reach = FULCRUM_SLOPE * (FULCRUM_HEIGHT / 2 + lh / 2) + 12 + fulcrumW / 2
  const fulcrumY = (underside + groundY) / 2
  const rightFirst = s.class === '1' && arms.effort >= arms.load
  const side = rightFirst ? 1 : -1
  const placings: (Placing & { key: LabelKey; onVector: boolean })[] = [
    { key: 'loadValue', label: loadLabel, at: beside?.part === 'load' ? beside.value : pt(column.load, loadValueAt.y), out: beside?.part === 'load' ? toFulcrum : up, onVector: !block },
    { key: 'effortValue', label: effortLabel, at: beside?.part === 'effort' ? beside.value : pt(column.effort, effortValueAt.y), out: beside?.part === 'effort' ? toFulcrum : up, onVector: true },
    { key: 'loadName', label: s.loadName, at: beside?.part === 'load' ? beside.name : pt(column.load, loadNameAt.y), out: beside?.part === 'load' ? toFulcrum : up, onVector: !block },
    { key: 'effortName', label: s.effortName, at: beside?.part === 'effort' ? beside.name : pt(column.effort, effortNameAt.y), out: beside?.part === 'effort' ? toFulcrum : up, onVector: true },
    {
      key: 'fulcrumName',
      label: s.fulcrumName,
      at: pt(x.fulcrum + side * reach, fulcrumY),
      alt: pt(x.fulcrum - side * reach, fulcrumY),
      out: { x: side, y: 0 },
      onVector: false,
    },
  ]
  const lines: Segment[] = [
    ...forces.map((f) => f.v),
    ...box4(beam.x, beam.y, beam.x + beam.width, underside),
    ...(block ? [...box4(x.load - blockW / 2, beam.y - blockH, x.load + blockW / 2, beam.y), { x1: x.load - blockW / 2, y1: beam.y - blockH / 2, x2: x.load + blockW / 2, y2: beam.y - blockH / 2 }] : []),
    { x1: stand.triangle[0].x, y1: stand.triangle[0].y, x2: stand.triangle[1].x, y2: stand.triangle[1].y },
    { x1: stand.triangle[0].x, y1: stand.triangle[0].y, x2: stand.triangle[2].x, y2: stand.triangle[2].y },
    stand.ground.line,
    ...(marks?.witnesses ?? []),
    ...fences(fulcrumY),
  ]
  const within = (at: Point, label: Label): Point => {
    const half = scaledBox(at, label, sc).w / 2
    return half * 2 > WIDTH - 2 * EDGE ? pt(WIDTH / 2, at.y) : pt(clamp(at.x, EDGE + half, WIDTH - EDGE - half), at.y)
  }
  // Each starts inside the figure, so the placer moves it from where it can be.
  for (const p of placings) {
    p.at = within(p.at, p.label)
    if (p.alt) p.alt = within(p.alt, p.label)
  }
  const placed = placeScaled(placings, lines, sc)
  const labels: PlacedLabel[] = placings.map((p, i) => ({ key: p.key, label: p.label, at: within(placed[i], p.label), onVector: p.onVector }))

  // Each arm's label under its dimension line, kept on its own side of the
  // fulcrum's witness line when it is wider than its arm.
  if (marks) {
    const arm = [
      { key: 'loadArm' as const, label: valueLabel(s.loadArmLabel, values.loadArm) },
      { key: 'effortArm' as const, label: valueLabel(s.effortArmLabel, values.effortArm) },
    ]
    for (const m of marks.marks) {
      const { key, label } = arm[Math.max(...m.between)]
      const half = scaledBox(pt(0, 0), label, sc).w / 2
      const awayFrom = m.middle.x < x.fulcrum ? Math.min(m.middle.x, x.fulcrum - 4 - half) : Math.max(m.middle.x, x.fulcrum + 4 + half)
      labels.push({ key, label, at: within(pt(awayFrom, m.line.y1 + MARK_LABEL_GAP + lh / 2), label), onVector: false })
    }
  }

  return { width: WIDTH, height: HEIGHT, beam, fulcrum: stand, x, block, forces, marks, labels, labelSize: ls, toScale: arms.toScale }
}

/** What the figure shows, for screen readers. It names no value, so it never gives an answer away. */
export function describe(s: Pick<LeverSettings, 'class'>): string {
  const middle = s.class === '1' ? 'fulcrum between the load and the effort' : s.class === '2' ? 'load between the fulcrum and the effort' : 'effort between the fulcrum and the load'
  return `A class ${s.class} lever: a beam on a fulcrum, with the ${middle}`
}
