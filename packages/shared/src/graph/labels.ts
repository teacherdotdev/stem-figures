// Placing labels on a graph so they never sit on a line or on each other.
// Each label offers places to go, best first; it takes the first that
// touches nothing and keeps a little clear of every line (or, if none
// does, the one touching least). Lines, dots and labels already placed are
// in its way. Also the dashes that tell up to three curves apart in black
// and white, and the key naming them under the graph.
// Started as Biology's Population Growth's; Physics' Motion Graphs keeps a
// copy of its own.

import type { Point } from './grid'

export type Box = { x0: number; y0: number; x1: number; y1: number }
export type Anchor = 'start' | 'middle' | 'end'
/** Where a label could go: its baseline's anchor point. */
export type Spot = { x: number; y: number; anchor: Anchor }
export type Segment = { x1: number; y1: number; x2: number; y2: number }

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

/**
 * Places beside a marked point, whose dashed guides run left and down from
 * it: below right, then above right and above left (clear of the guide
 * across), then level, and below left last.
 */
export function besidePoint(p: Point, fs: number, gap = 12): Spot[] {
  return [
    { x: p.x + gap, y: p.y + fs * 1.3, anchor: 'start' },
    { x: p.x + gap, y: p.y - fs * 0.85, anchor: 'start' },
    { x: p.x - gap, y: p.y - fs * 0.85, anchor: 'end' },
    { x: p.x + gap, y: p.y + fs * 0.35, anchor: 'start' },
    { x: p.x - gap, y: p.y + fs * 0.35, anchor: 'end' },
    { x: p.x - gap, y: p.y + fs * 1.3, anchor: 'end' },
  ]
}

/**
 * Places along a drawn curve, from its far end back, each with the label
 * above left, below right, above right and below left of the curve.
 */
export function alongCurve(pts: Point[], fs: number): Spot[] {
  const spots: Spot[] = []
  if (pts.length < 2) return spots
  // Points evenly spaced along the curve's length, about every 24 units.
  const lengths = [0]
  for (let k = 1; k < pts.length; k++) lengths.push(lengths[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y))
  const total = lengths.at(-1)!
  let k = pts.length - 1
  for (let at = total * 0.97; at >= total * 0.03; at -= 24) {
    while (k > 0 && lengths[k - 1] > at) k--
    const p = pts[k]
    spots.push(
      { x: p.x - 8, y: p.y - 9, anchor: 'end' },
      { x: p.x + 8, y: p.y + fs + 4, anchor: 'start' },
      { x: p.x + 8, y: p.y - 9, anchor: 'start' },
      { x: p.x - 8, y: p.y + fs + 4, anchor: 'end' },
    )
  }
  return spots
}

/** Each curve's dashes, so up to three read apart in black and white: solid, dashed, dotted. */
export const DASHES = [undefined, '12 7', '3 5'] as const

const SAMPLE_W = 30 // the line sample in front of a curve's name in the key
const KEY_GAP = 28 // between the key's entries

/** A curve in the key: its line sample, and its name after it. */
export type KeyEntry<I = number> = { index: I; sample: Segment; text: { x: number; y: number; text: string } }

/**
 * A key naming curves under a graph: each one's line sample and name, in
 * rows centered on `midX`, a new row when one would be wider than `wrap`,
 * the first just under `top`. It gives the entries, how far right the
 * widest row reaches and how far down the last one does.
 */
export function layoutKey<I>(
  curves: { index: I; name: string }[],
  { midX, wrap, top, left, fs, labelFs }: { midX: number; wrap: number; top: number; left: number; fs: number; labelFs: number },
) {
  const entries: KeyEntry<I>[] = []
  const entryW = (c: { name: string }) => SAMPLE_W + 6 + textWidth(c.name, labelFs)
  const rows: (typeof curves)[] = [[]]
  let rowW = 0
  for (const c of curves) {
    const w = entryW(c) + (rows.at(-1)!.length ? KEY_GAP : 0)
    if (rows.at(-1)!.length && rowW + w > wrap) {
      rows.push([])
      rowW = 0
    }
    rowW += entryW(c) + (rows.at(-1)!.length ? KEY_GAP : 0)
    rows.at(-1)!.push(c)
  }
  let right = -Infinity
  let bottom = top
  let y = top + 4 + fs * 0.6
  for (const row of rows) {
    const rw = row.reduce((w, c, k) => w + entryW(c) + (k ? KEY_GAP : 0), 0)
    let x = Math.max(left, midX - rw / 2)
    for (const c of row) {
      entries.push({
        index: c.index,
        sample: { x1: x, y1: y, x2: x + SAMPLE_W, y2: y },
        text: { x: x + SAMPLE_W + 6, y: y + labelFs * 0.36, text: c.name },
      })
      x += entryW(c) + KEY_GAP
    }
    right = Math.max(right, x - KEY_GAP)
    bottom = y + fs * 0.5
    y += labelFs * 1.6
  }
  return { entries, right, bottom }
}
