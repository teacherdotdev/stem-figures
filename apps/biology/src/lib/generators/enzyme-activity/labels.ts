// Placing labels on a graph so they never sit on a line or on each other.
// Each label offers places to go, best first; it takes the first that
// touches nothing and keeps a little clear of every line (or, if none
// does, the one touching least). Lines, dots and labels already placed are
// in its way. A copy of Population Growth's, less the places it offers.

import type { Point } from '$shared/graph/grid'

export type Box = { x0: number; y0: number; x1: number; y1: number }
export type Anchor = 'start' | 'middle' | 'end'
/** Where a label could go: its baseline's anchor point. */
export type Spot = { x: number; y: number; anchor: Anchor }
type Segment = { x1: number; y1: number; x2: number; y2: number }

// How wide each letter of bold Arial is, in thousandths of the font size
// (its published metrics, which Helvetica and Liberation Sans share).
const BOLD_WIDTHS: Record<string, number> = {
  ' ': 278, '(': 333, ')': 333, '/': 278, '=': 584, '.': 278, ',': 278, '-': 333, '−': 584, '×': 584, '+': 584, '%': 889, "'": 238, '’': 278,
  A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 556, K: 722, L: 611, M: 833,
  N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  a: 556, b: 611, c: 556, d: 611, e: 556, f: 333, g: 611, h: 611, i: 278, j: 278, k: 556, l: 278, m: 889,
  n: 611, o: 611, p: 611, q: 611, r: 389, s: 556, t: 333, u: 611, v: 556, w: 778, x: 556, y: 556, z: 500,
}

/** How wide `text` is in bold Arial at size `fs`; digits are 0.556 of it, anything unknown 0.6. */
export const textWidth = (text: string, fs: number) =>
  ([...text].reduce((w, ch) => w + (BOLD_WIDTHS[ch] ?? (/\d/.test(ch) ? 556 : 600)), 0) * fs) / 1000

const PAD = 3 // the clear space kept around a label
const CLOSE = 7 // labels this close to a line are kept if nothing better is free

/** The box a line of text takes up, `width` wide in letters `fs` high. */
export function textBox({ x, y, anchor }: Spot, width: number, fs: number): Box {
  const x0 = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2
  // Capitals rise about 0.78 of the size; descenders and the white outline reach 0.3 below.
  return { x0, y0: y - fs * 0.78, x1: x0 + width, y1: y + fs * 0.3 }
}

/** Whether a segment passes through a box (Liang–Barsky). */
export function crosses(s: Segment, b: Box) {
  const dx = s.x2 - s.x1
  const dy = s.y2 - s.y1
  let t0 = 0
  let t1 = 1
  for (const [p, q] of [[-dx, s.x1 - b.x0], [dx, b.x1 - s.x1], [-dy, s.y1 - b.y0], [dy, b.y1 - s.y1]]) {
    if (p === 0) {
      if (q < 0) return false
    } else {
      const t = q / p
      if (p < 0) t0 = Math.max(t0, t)
      else t1 = Math.min(t1, t)
      if (t0 > t1) return false
    }
  }
  return true
}

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
const grow = (b: Box, by: number): Box => ({ x0: b.x0 - by, y0: b.y0 - by, x1: b.x1 + by, y1: b.y1 + by })

export function placer(bounds: Box) {
  const segments: Segment[] = []
  const soft: Segment[] = []
  const boxes: Box[] = []

  return {
    /** A line labels keep off; `soft` ones (like the phase edges) they cross only if they must. */
    line(pts: Point[], isSoft = false) {
      for (let k = 1; k < pts.length; k++) (isSoft ? soft : segments).push({ x1: pts[k - 1].x, y1: pts[k - 1].y, x2: pts[k].x, y2: pts[k].y })
    },
    box(b: Box) {
      boxes.push(b)
    },
    /** The best of `spots` for a label `width` wide; it's then in the way of later labels. */
    place(spots: Spot[], width: number, fs: number): Spot & { box: Box } {
      return this.choose(spots.map((spot) => ({ ...spot, box: textBox(spot, width, fs) })))
    },
    /**
     * The best of places whose boxes are already worked out (for text turned
     * on its side), and how much it touches (0 for nothing). Unless `keep` is
     * false, it's then in the way of later labels.
     */
    choose<T extends { box: Box }>(options: T[], keep = true): T & { score: number } {
      let best = options[0]
      let bestScore = Infinity
      for (const option of options) {
        const { box } = option
        const near = grow(box, PAD)
        const close = grow(box, CLOSE)
        const outside = box.x0 < bounds.x0 || box.x1 > bounds.x1 || box.y0 < bounds.y0 || box.y1 > bounds.y1
        let score = outside ? 1e6 : 0
        for (const b of boxes) if (overlaps(near, b)) score += 100
        for (const s of segments) score += crosses(s, near) ? 10 : crosses(s, close) ? 0.5 : 0
        for (const s of soft) if (crosses(s, near)) score += 1
        if (score < bestScore) {
          best = option
          bestScore = score
          if (score === 0) break
        }
      }
      if (keep) boxes.push(best.box)
      return { ...best, score: bestScore }
    },
    keep(b: Box) {
      boxes.push(b)
    },
  }
}
