// A spring's coil, drawn between two points as one SVG path: a short straight
// lead at each end and the turns between them. The coil is redrawn for every
// length, never scaled, so a stretched or squashed spring keeps its number of
// turns, its width and its line weight, and looks like the same spring pulled
// out or pushed in.
//
// Two styles: a zigzag (the usual textbook spring) or loops (a helix seen from
// the side). Loops pushed close together are drawn narrower along the spring,
// so neighbouring loops never cross.

import type { Point } from './vector'

export type CoilStyle = 'zigzag' | 'loops'

/** The straight lead at each end, unless the spring is too short for it. */
export const COIL_LEAD = 10
/** How far a loop reaches along the spring, at most, either side of its middle. */
const LOOP_REACH = 8
/** A loop reaches along the spring at most this share of the room each turn has, so loops never cross. */
const LOOP_SHARE = 0.42
/** Points drawn per loop. */
const LOOP_STEPS = 28

const r2 = (n: number) => Math.round(n * 100) / 100
const xy = (p: Point) => `${r2(p.x)} ${r2(p.y)}`

/**
 * The coil from `from` to `to`, with `turns` turns, `width` across, in the
 * given style. Both ends lie exactly on `from` and `to`. A spring with no
 * length is a single point.
 */
export function coilPath(from: Point, to: Point, turns: number, width: number, style: CoilStyle = 'zigzag', lead = COIL_LEAD): string {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  if (length < 1e-6) return `M ${xy(from)} L ${xy(from)}`
  const u = { x: (to.x - from.x) / length, y: (to.y - from.y) / length }
  // The side the coil swings to: u turned a quarter turn.
  const n = { x: -u.y, y: u.x }
  const at = (along: number, across: number): Point => ({ x: from.x + u.x * along + n.x * across, y: from.y + u.y * along + n.y * across })

  const ends = Math.min(lead, length * 0.15)
  const body = length - 2 * ends
  const count = Math.max(1, Math.round(turns))
  const half = width / 2
  const points: Point[] = [from, at(ends, 0)]

  if (style === 'zigzag') {
    // Two strokes a turn, out to one side and across to the other, starting
    // and ending on the middle line.
    const step = body / (count * 2)
    for (let i = 0; i < count * 2; i++) points.push(at(ends + (i + 0.5) * step, i % 2 ? -half : half))
  } else {
    // A loop a turn: an ellipse reaching `reach` along the spring and `half`
    // across, carried along by the turn's room (its pitch), doubling back in a
    // loop on one edge. The wire leaves the first lead and meets the last one
    // on the middle line, a quarter turn from an edge, so both ends look alike:
    // n turns and a half, plus a reach at each end, fill the body.
    const halves = count + 0.5
    let pitch = (body - 2 * LOOP_REACH) / halves
    let reach = LOOP_REACH
    if (reach > pitch * LOOP_SHARE) {
      pitch = body / (halves + 2 * LOOP_SHARE)
      reach = pitch * LOOP_SHARE
    }
    const t0 = -Math.PI / 2
    const steps = Math.round(halves * LOOP_STEPS)
    for (let i = 1; i < steps; i++) {
      const t = t0 + (i / LOOP_STEPS) * 2 * Math.PI
      points.push(at(ends + (pitch * (t - t0)) / (2 * Math.PI) + reach * (Math.sin(t) + 1), half * Math.cos(t)))
    }
  }
  points.push(at(length - ends, 0), to)
  return `M ${points.map(xy).join(' L ')}`
}
