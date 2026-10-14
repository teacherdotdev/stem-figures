// Lays out a coordinate grid as plain numbers for Graph.svelte to draw: the
// grid itself from $shared/graph, then what the teacher graphed on it.

import { niceText } from '$shared/graph/numbering'
import { layoutGrid, pathOf, round } from '$shared/graph/grid'
import { COLORS, clipLine, readEquations, type Point } from './equations.js'
import { readAxes, type Settings } from './settings.js'

export { CELL } from '$shared/graph/grid'
const HEAD = 12 // length of an arrowhead where a graphed line leaves the grid
const HEAD_HALF = 5.5 // half its width
const CIRCLE_R = 5.5 // a hole's or endpoint's circle
const NAME_GAP = 7 // how far a point name sits up and right of its point
const TINT = 0.18 // how strongly a shaded region's color shows, so the grid reads through it
// Hatching's direction for each hatched row in turn (degrees from upright), so overlapping regions stay apart in gray.
const HATCH_ANGLES = [45, -45, 0, 90]

const pathLength = (pts: Point[]) => pts.reduce((sum, p, k) => (k ? sum + Math.hypot(p.x - pts[k - 1].x, p.y - pts[k - 1].y) : 0), 0)

/**
 * An arrowhead at the last point of a path, pointing along it, and the path
 * cut back to the arrowhead's base so the line doesn't poke through its tip.
 */
function arrowAt(pts: Point[], heads: string[]): { pts: Point[] } {
  const tip = pts.at(-1)!
  // Walk back one arrowhead's length along the path to find the base.
  let k = pts.length - 1
  let left = HEAD
  let base = tip
  while (k > 0) {
    const a = pts[k - 1]
    const b = pts[k]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    if (seg >= left) {
      const t = left / seg
      base = { x: b.x + (a.x - b.x) * t, y: b.y + (a.y - b.y) * t }
      break
    }
    left -= seg
    k--
  }
  const len = Math.hypot(tip.x - base.x, tip.y - base.y) || 1
  const u = { x: (tip.x - base.x) / len, y: (tip.y - base.y) / len }
  heads.push(
    `M${round(tip.x)},${round(tip.y)} L${round(base.x - u.y * HEAD_HALF)},${round(base.y + u.x * HEAD_HALF)} L${round(base.x + u.y * HEAD_HALF)},${round(base.y - u.x * HEAD_HALF)} z`,
  )
  // Stop the line just inside the arrowhead's base, so they overlap a little.
  const inset = { x: base.x + u.x * 1, y: base.y + u.y * 1 }
  return { pts: [...pts.slice(0, k), inset] }
}

/** A coordinate grid laid out for Graph.svelte to draw. */
export type GraphLayout = ReturnType<typeof buildGraph>

export function buildGraph(settings: Settings) {
  const axes = readAxes(settings)
  const { x, y } = axes
  const { px, box, ...grid } = layoutGrid(settings, axes)

  // What the teacher graphed: each line or curve runs to the grid's edge, with
  // an arrowhead where it leaves at the ends the teacher picked; points are dots or crosses.
  const lines: { d: string; heads: string[]; color: string; dash: string | undefined; cap: 'round' | 'butt'; width: number }[] = []
  const dots: (Point & { color: string; cross: boolean })[] = []
  // Holes and endpoints: open circles (not included) and closed ones (included).
  const circles: (Point & { color: string; closed: boolean })[] = []
  const pointNames: (Point & { name: string; coords: string; color: string })[] = []
  // Asymptotes, when a row shows them: dotted lines in the row's color, under the curves.
  const asymptotes: { d: string; color: string }[] = []
  // Inequalities' shaded regions, drawn under the gridlines: a tint, or hatching at an angle.
  const regions: { d: string; color: string; hatch: number | null }[] = []
  let hatched = 0
  const rows = settings.equations ?? []
  readEquations(rows.map((r) => r.text), box, settings.angle).forEach((read, i) => {
    const { color, point, names, ends, asym, fill } = rows[i]
    const ink = COLORS[color]
    // An inequality's boundary has its own arrows, and is dashed or solid by its sign.
    const inequality = !!read?.regions
    const arrows = inequality ? rows[i].barrows : rows[i].arrows
    if (read?.regions?.length) {
      regions.push({
        d: read.regions.map((poly) => `${pathOf(poly.map(px))}Z`).join(''),
        color: ink,
        hatch: fill === 'hatch' ? HATCH_ANGLES[hatched++ % HATCH_ANGLES.length] : null,
      })
    }
    if (asym === 'shown') {
      for (const a of read?.asymptotes ?? []) {
        const seg = clipLine(a, box)
        if (seg) asymptotes.push({ d: `M${seg.map(px).map((p) => `${round(p.x)},${round(p.y)}`).join(' L')}`, color: ink })
      }
    }
    for (const run of read?.runs ?? []) {
      const style = run.strict === undefined ? rows[i].line : run.strict ? 'dashed' : 'solid'
      let pts = run.points.map(px)
      const heads: string[] = []
      // Arrows go on ends that leave the grid, if the teacher wants that end.
      const want = [arrows === 'both' || arrows === 'left', arrows === 'both' || arrows === 'right']
      if (pathLength(pts) > HEAD * 2.5) {
        if (want[1] && run.edges[1]) ({ pts } = arrowAt(pts, heads))
        if (want[0] && run.edges[0]) {
          const r = arrowAt([...pts].reverse(), heads)
          pts = r.pts.reverse()
        }
      }
      lines.push({
        d: pathOf(pts),
        heads,
        color: ink,
        dash: style === 'dashed' ? '9 6' : style === 'dotted' ? '0.01 6' : undefined,
        cap: style === 'dotted' ? 'round' : 'butt',
        width: style === 'dotted' ? 3.2 : 2.5, // round dots look lighter than a solid stroke
      })
    }
    for (const c of read?.circles ?? []) if (!(c.end && ends === 'hidden')) circles.push({ ...px(c), color: ink, closed: c.closed })
    for (const pt of read?.points ?? []) {
      const at = px(pt)
      dots.push({ ...at, color: ink, cross: point === 'cross' })
      // Point names sit up and to the right of their point.
      const coords = names === 'coords' ? `(${niceText(pt.x, x.numbering)}, ${niceText(pt.y, y.numbering)})` : ''
      if (pt.name || coords) pointNames.push({ x: at.x + NAME_GAP, y: at.y - NAME_GAP, name: pt.name ?? '', coords, color: ink })
    }
  })

  return {
    ...grid,
    lines,
    dots,
    circles,
    r: CIRCLE_R,
    pointNames,
    asymptotes,
    regions,
    tint: TINT,
  }
}
