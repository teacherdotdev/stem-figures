// Values written at a graph's axes where a number would be (P₁ and Q₁ on an
// economics graph, Vmax and Km on an enzyme's), and the dashed guides from
// a point on the graph across to them. Those at the y-axis are moved apart
// along it; those under the x-axis each stay under their line, on a row
// further down when they'd run into one already there.
// Started as Biology's Enzyme Activity's.

import type { Point } from './grid'
import type { Segment } from './labels'

/**
 * Places along an axis for labels wanting to be `at`, each `half` its
 * length either side: moved apart, in order, just enough to keep `gap`
 * between neighbours.
 */
export function spread<T extends { at: number; half: number }>(items: T[], gap: number): T[] {
  const sorted = [...items].sort((a, b) => a.at - b.at)
  const out: T[] = []
  for (const item of sorted) {
    const before = out.at(-1)
    out.push(before ? { ...item, at: Math.max(item.at, before.at + before.half + item.half + gap) } : item)
  }
  return out
}

/**
 * Labels centered at `x` under an axis, each `half` its width either side,
 * left to right: each on the first row where it keeps `pad` clear of the
 * others there. It gives each label's row (0 nearest the axis) and how many
 * rows there are.
 */
export function rowsUnder<T extends { x: number; half: number }>(items: T[], pad = 4) {
  const rows: { x0: number; x1: number }[][] = []
  const placed = [...items]
    .sort((a, b) => a.x - b.x)
    .map((item) => {
      const span = { x0: item.x - item.half - pad, x1: item.x + item.half + pad }
      let row = rows.findIndex((r) => r.every((b) => span.x0 >= b.x1 || span.x1 <= b.x0))
      if (row < 0) row = rows.push([]) - 1
      rows[row].push(span)
      return { ...item, row }
    })
  return { placed, rows: rows.length }
}

/**
 * The dashed guides from a point across to the y-axis at `axisX` and down
 * to the x-axis at `axisY`, either left out (`to`).
 */
export function guidesFrom(p: Point, axisX: number, axisY: number, to: { x?: boolean; y?: boolean } = {}): Segment[] {
  const out: Segment[] = []
  if (to.y !== false && Math.abs(p.x - axisX) > 0.5) out.push({ x1: p.x, y1: p.y, x2: axisX, y2: p.y })
  if (to.x !== false && Math.abs(p.y - axisY) > 0.5) out.push({ x1: p.x, y1: p.y, x2: p.x, y2: axisY })
  return out
}
