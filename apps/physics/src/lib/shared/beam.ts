// A level beam and what goes with it: the fulcrum it rests on, the forces on
// it, and the distances marked along it. The Lever draws one beam on one
// fulcrum; the pivot can be anywhere along the beam, and everything is placed
// by its x along it, so a beam drawn to scale stays to scale.
// Draw the beam, its fulcrums and its marks with Beam.svelte, and each force
// with VectorArrow.

import { HATCH_LENGTH, ground, type Support } from './support'
import type { Point, Segment } from './vector'

const r2 = (n: number) => Math.round(n * 100) / 100

/** A box on the page: its top left corner and its size. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * The beam: a level bar `thickness` thick whose middle line runs between
 * `from` and `to`, either end first. Its top is `y` and its underside
 * `y + height`.
 */
export function beamRect(from: Point, to: Point, thickness: number): Rect {
  return {
    x: r2(Math.min(from.x, to.x)),
    y: r2((from.y + to.y) / 2 - thickness / 2),
    width: r2(Math.abs(to.x - from.x)),
    height: thickness,
  }
}

/** How wide a fulcrum's triangle is at its base, as a share of its height, either side of its apex. */
export const FULCRUM_SLOPE = 0.55
/** How far a fulcrum's ground reaches past its triangle, either side. */
export const FULCRUM_GROUND = 20

/** A fulcrum: a triangle with its apex up, standing on a hatched ground line. */
export interface Fulcrum {
  /** where it touches the beam */
  apex: Point
  /** apex, then the base's left and right ends */
  triangle: [Point, Point, Point]
  ground: Support
}

/** A fulcrum `height` tall with its apex at `at`, a point on the beam's underside. */
export function fulcrum(at: Point, height: number): Fulcrum {
  const half = height * FULCRUM_SLOPE
  const base = at.y + height
  return {
    apex: { x: at.x, y: at.y },
    triangle: [
      { x: at.x, y: at.y },
      { x: r2(at.x - half), y: r2(base) },
      { x: r2(at.x + half), y: r2(base) },
    ],
    ground: ground(r2(at.x - half - FULCRUM_GROUND), r2(at.x + half + FULCRUM_GROUND), r2(base)),
  }
}

/** How far below a fulcrum's ground line its hatches reach. */
export const GROUND_DEPTH = HATCH_LENGTH

export type ForceDirection = 'up' | 'down'

/**
 * A force `length` long on the beam at `x`, for VectorArrow: an arrow lying
 * outside the beam, on its top unless `side` is 'bottom'. One pointing at the
 * beam ends on it (down onto the top, up into the underside); one pointing
 * away starts on it (up from the top, down from the underside).
 */
export function forceOnBeam(beam: Rect, x: number, direction: ForceDirection, length: number, side: 'top' | 'bottom' = 'top'): Segment {
  const edge = side === 'top' ? beam.y : beam.y + beam.height
  const far = side === 'top' ? edge - length : edge + length
  const toward = (side === 'top') === (direction === 'down')
  return toward ? { x1: x, y1: r2(far), x2: x, y2: r2(edge) } : { x1: x, y1: r2(edge), x2: x, y2: r2(far) }
}

/** A place along the beam to measure to: its x, and the y its witness line drops from. */
export interface BeamPoint {
  x: number
  y: number
}

/** `fromPivot`: every point's distance from the pivot. `chained`: each point's distance from the next one along. */
export type MarkMode = 'fromPivot' | 'chained'

export interface DistanceMark {
  /** the dimension line, left end first, for DimensionLine */
  line: Segment
  /** which row it is in, 0 nearest the beam */
  row: number
  /** the points it runs between, by their place in `points`, left one first; −1 is the pivot */
  between: [number, number]
  /** the middle of the line, to put its label by */
  middle: Point
}

export interface DistanceMarks {
  marks: DistanceMark[]
  /** the thin lines dropping from each point (and the pivot) to its dimension line */
  witnesses: Segment[]
  /** how many rows there are */
  rows: number
  /** the y of the lowest dimension line (the baseline, when there are no marks); with `upward`, the highest */
  bottom: number
}

/** From one row of dimension lines to the next, unless told. */
export const MARK_ROW = 40
/** How far a witness line runs past its dimension line. */
export const WITNESS_PAST = 5

/**
 * The dimension lines under a beam for any number of points along it, in
 * rows from `baseline` down that never overlap, with the witness lines
 * dropping to them.
 *
 * `fromPivot` measures every point from `pivot`: points on opposite sides
 * share a row, and points on the same side get a row each, the nearest to
 * the pivot nearest the beam. `chained` measures from each point to the next
 * along the beam in one row; give the pivot as one of the points. Points at
 * the same x (or at the pivot) have no distance between them and get no mark.
 *
 * With `upward` the rows stack up from `baseline` instead, for marks above a
 * beam, and the witness lines rise to them.
 */
export function distanceMarks(
  points: BeamPoint[],
  baseline: number,
  mode: MarkMode,
  { pivot, rowGap = MARK_ROW, upward = false }: { pivot?: BeamPoint; rowGap?: number; upward?: boolean } = {},
): DistanceMarks {
  const rowY = (row: number) => r2(baseline + (upward ? -row : row) * rowGap)
  const mark = (a: number, b: number, x1: number, x2: number, row: number): DistanceMark => ({
    line: { x1: r2(x1), y1: rowY(row), x2: r2(x2), y2: rowY(row) },
    row,
    between: [a, b],
    middle: { x: r2((x1 + x2) / 2), y: rowY(row) },
  })
  const witness = (p: BeamPoint, row: number): Segment => ({ x1: r2(p.x), y1: r2(p.y), x2: r2(p.x), y2: r2(rowY(row) + (upward ? -WITNESS_PAST : WITNESS_PAST)) })
  const marks: DistanceMark[] = []
  const witnesses: Segment[] = []

  if (mode === 'chained') {
    const order = points.map((_, i) => i).sort((a, b) => points[a].x - points[b].x)
    for (let k = 1; k < order.length; k++) {
      const [a, b] = [order[k - 1], order[k]]
      if (points[b].x - points[a].x > 0.5) marks.push(mark(a, b, points[a].x, points[b].x, 0))
    }
    if (marks.length) for (const p of points) witnesses.push(witness(p, 0))
  } else {
    if (!pivot) throw new Error('distanceMarks: fromPivot needs a pivot')
    let deepest = -1
    for (const side of [-1, 1]) {
      const onSide = points
        .map((p, i) => ({ i, d: (p.x - pivot.x) * side }))
        .filter((q) => q.d > 0.5)
        .sort((a, b) => a.d - b.d)
      onSide.forEach(({ i }, row) => {
        const p = points[i]
        marks.push(side < 0 ? mark(i, -1, p.x, pivot.x, row) : mark(-1, i, pivot.x, p.x, row))
        witnesses.push(witness(p, row))
        deepest = Math.max(deepest, row)
      })
    }
    if (deepest >= 0) witnesses.push(witness(pivot, deepest))
    // In the order the points were given.
    marks.sort((a, b) => Math.max(...a.between) - Math.max(...b.between))
  }

  const rows = marks.length ? Math.max(...marks.map((m) => m.row)) + 1 : 0
  return { marks, witnesses, rows, bottom: rowY(Math.max(0, rows - 1)) }
}

/** An object hanging under the beam: its string, and where the object's bottom middle goes. */
export interface Hanging {
  string: Segment
  /** the object's bottom middle, for ObjectShape */
  at: Point
  /** the object's top, where the string ends */
  top: number
  bottom: number
}

/**
 * An object `height` tall hanging from the beam's underside at `x` on a
 * string `string` long. Draw the string with Beam.svelte's `strings` and the
 * object with ObjectShape at `at`.
 */
export function hangingObject(beam: Rect, x: number, string: number, height: number): Hanging {
  const top = r2(beam.y + beam.height + string)
  return { string: { x1: x, y1: r2(beam.y + beam.height), x2: x, y2: top }, at: { x, y: r2(top + height) }, top, bottom: r2(top + height) }
}

/** Where a beam held at a wall meets it: on the beam's middle line, at the wall's face. */
export const hingeAt = (beam: Rect, wallX: number): Point => ({ x: wallX, y: r2(beam.y + beam.height / 2) })

/** A cable from the beam's top up to a wall, and the angle mark between them. */
export interface Cable {
  /** from where it meets the beam to where it meets the wall */
  line: Segment
  /** the angle mark's arc, centered where the cable meets the beam */
  arc: { from: Point; to: Point; r: number; sweep: 0 | 1 }
  /** halfway round the arc, `r` + `labelGap` out, for its label's middle */
  labelAt: Point
}

/**
 * A cable meeting the beam's top at `x` and rising toward a wall at `wallX`
 * at `angle` degrees to the beam, with an angle mark of radius `r` at the
 * beam between the beam's top and the cable.
 */
export function cable(beam: Rect, x: number, wallX: number, angle: number, r = 34, labelGap = 16): Cable {
  const a = (angle * Math.PI) / 180
  const toward = Math.sign(wallX - x) || -1
  const rise = Math.abs(x - wallX) * Math.tan(a)
  const y = beam.y
  const along = (d: number, t: number) => ({ x: r2(x + toward * Math.cos(t) * d), y: r2(y - Math.sin(t) * d) })
  return {
    line: { x1: x, y1: y, x2: wallX, y2: r2(y - rise) },
    // From the beam round to the cable: clockwise on the page when the wall is to the left.
    arc: { from: along(r, 0), to: along(r, a), r, sweep: toward < 0 ? 1 : 0 },
    labelAt: along(r + labelGap, a / 2),
  }
}
