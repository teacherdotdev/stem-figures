// Laying out a ruler figure's magnifiers: one above each end being read, in
// a row over the ruler. The figure is always wide enough for two and for
// the outlined regions at either end of the scale, so dragging the object
// along never resizes it under the pointer.

import type { Circle } from '$shared/magnify'

const R = 150
/** between the magnifiers and the drawing */
const GAP = 56
/** between the two magnifiers */
const APART = 36

/**
 * Where the drawing (`width` × `height`) and the magnifiers go, for
 * magnified regions `sources` (one or two, left to right, all `r` across
 * and level) somewhere between x = `from` and `to` on the drawing.
 */
export function rulerLayout(width: number, height: number, sources: Circle[], from: number, to: number) {
  if (!sources.length) return { width, height, origin: { x: 0, y: 0 }, magnifiers: [] }
  const { r, y } = sources[0]
  const left = Math.max(0, r - from)
  const right = Math.max(0, to + r - width)
  const above = Math.max(0, r - y)
  const below = Math.max(0, y + r - height)
  const wide = left + width + right
  const total = Math.max(wide, 4 * R + APART)
  // A drawing narrower than two magnifiers is centered under them.
  const origin = { x: (total - wide) / 2 + left, y: 2 * R + GAP + above }

  // Over their regions, pushed apart when they'd overlap, and kept inside.
  const xs = sources.map((s) => origin.x + s.x)
  if (xs.length === 2 && xs[1] - xs[0] < 2 * R + APART) {
    const mid = (xs[0] + xs[1]) / 2
    xs[0] = mid - R - APART / 2
    xs[1] = mid + R + APART / 2
  }
  const shift = Math.max(0, R - xs[0]) - Math.max(0, xs[xs.length - 1] - (total - R))
  return {
    width: total,
    height: origin.y + height + below,
    origin,
    magnifiers: xs.map((x) => ({ x: x + shift, y: R, r: R })),
  }
}
