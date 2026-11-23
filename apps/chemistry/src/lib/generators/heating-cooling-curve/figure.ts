// Lays out a heating or cooling curve for CurveFigure.svelte to draw: the grid
// from $shared/graph, the curve on it, dashed lines from its plateaus to the
// temperature axis with the melting and boiling points by them, a letter at
// each corner, and each segment's label.

import { axisEnd, readAxes } from '$shared/graph/axes'
import { COLORS } from '$shared/graph/colors'
import { clipPath, layoutGrid, pathOf, round, type Point } from '$shared/graph/grid'
import { niceRange } from '$lib/shared/niceRange'
import { curveEnd, curvePoints, heatOf, isPlateau, placeSegments, segmentsOf, type Direction, type SegmentKey } from './curve'
import { propertiesOf, temperaturesOf, WIDTH_KEYS, type CurveSettings } from './settings'

const POINT_NAMES: Record<Direction, Record<'melt' | 'boil', string>> = {
  heating: { melt: 'm.p.', boil: 'b.p.' },
  cooling: { melt: 'f.p.', boil: 'b.p.' },
}

const LETTER_GAP = 0.9 // from a corner to its letter's middle, in label heights
const LABEL_GAP = 10 // from a segment to its label
const BLANK_W = 80 // a write-on line for a label left blank
// Where a letter can go around its corner, nearest first: [turn from the
// outside of the corner, in radians; how far out, in letter gaps].
const LETTER_SPOTS = [1, 1.5, 2, 2.6, 3.2].flatMap((far) =>
  Array.from({ length: 24 }, (_, k) => ((k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI) / 12).map((turn) => [turn, far]),
)

type Segment = { x1: number; y1: number; x2: number; y2: number }
type Text = { x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end' }

type Box = { x0: number; y0: number; x1: number; y1: number }
const grow = (b: Box, by: number): Box => ({ x0: b.x0 - by, y0: b.y0 - by, x1: b.x1 + by, y1: b.y1 + by })
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

/** Whether a line passes through a box (Liang–Barsky). */
function crosses(l: Segment, b: Box) {
  const dx = l.x2 - l.x1
  const dy = l.y2 - l.y1
  let t0 = 0
  let t1 = 1
  for (const [p, q] of [[-dx, l.x1 - b.x0], [dx, b.x1 - l.x1], [-dy, l.y1 - b.y0], [dy, b.y1 - l.y1]]) {
    if (p === 0) {
      if (q < 0) return false
    } else if (p < 0) t0 = Math.max(t0, q / p)
    else t1 = Math.min(t1, q / p)
  }
  return t0 <= t1
}

const STATE_NAMES: Record<SegmentKey, string> = {
  solid: 'Solid',
  melt: 'Solid + liquid',
  liquid: 'Liquid',
  boil: 'Liquid + gas',
  gas: 'Gas',
}
const CHANGE_NAMES: Record<Direction, Record<'melt' | 'boil', string>> = {
  heating: { melt: 'Melting', boil: 'Boiling' },
  cooling: { melt: 'Freezing', boil: 'Condensing' },
}

/** What a segment is called in the settings panel: "Solid warms", "Melting". */
export function segmentName(dir: Direction, key: SegmentKey) {
  if (isPlateau(key)) return CHANGE_NAMES[dir][key as 'melt' | 'boil']
  return `${STATE_NAMES[key]} ${dir === 'heating' ? 'warms' : 'cools'}`
}

/** The label written on a segment, by the teacher's choice of states or changes. */
export function segmentLabel(s: Pick<CurveSettings, 'direction' | 'plateauLabels'>, key: SegmentKey) {
  return isPlateau(key) && s.plateauLabels === 'change' ? CHANGE_NAMES[s.direction][key as 'melt' | 'boil'] : STATE_NAMES[key]
}

/** A corner's letter: A, B, C… */
export const letter = (i: number) => String.fromCharCode(65 + i)

/** What the teacher typed that doesn't make a curve, by field. */
export function checkCurve(s: CurveSettings): Record<string, string> {
  const problems: Record<string, string> = {}
  const { mp, bp } = temperaturesOf(s)
  if (bp <= mp) problems.bp = 'The boiling point has to be higher than the melting point.'
  if (s.direction === 'heating' && s.endT <= s.startT)
    problems.endT = 'A heating curve ends hotter than it starts, so make the ending temperature higher than the starting one.'
  if (s.direction === 'cooling' && s.endT >= s.startT)
    problems.endT = 'A cooling curve ends colder than it starts, so make the ending temperature lower than the starting one.'
  return problems
}

/** The curve's segments, laid along the x-axis in the settings' units. */
export function placedSegments(s: CurveSettings) {
  const segs = segmentsOf(s.direction, temperaturesOf(s))
  if (s.source === 'lengths') return placeSegments(segs, (seg) => s[WIDTH_KEYS[seg.key]])
  const p = propertiesOf(s)
  return placeSegments(segs, (seg) => heatOf(seg, s.mass, p) / (s.xQuantity === 'time' ? s.rate : 1))
}

/** A temperature as written on the figure: −114.1 °C. */
export const degrees = (t: number) => `${String(round(t)).replace('-', '−')} °C`

/** Axes that just fit the curve, counting in tidy steps, or none when there's no curve. */
export function fittedAxes(s: CurveSettings) {
  const g = buildCurve(s)
  if (!g.span) return null
  const [x0, x1, xs] = niceRange(0, g.end, true)
  const [y0, y1, ys] = niceRange(g.span.lo, g.span.hi)
  const blocks = (a: number, b: number, step: number) => Math.round((b - a) / step)
  return {
    xFrom: String(x0), xTo: String(x1), xStep: String(xs), xEvery: blocks(x0, x1, xs) > 10 ? 2 : 1,
    yFrom: String(y0), yTo: String(y1), yStep: String(ys), yEvery: blocks(y0, y1, ys) > 10 ? 2 : 1,
  }
}

export function buildCurve(s: CurveSettings) {
  const axes = readAxes(s)
  const { px, box, ...grid } = layoutGrid(s, axes, { edges: true })
  const problems: Record<string, string> = checkCurve(s)
  const drawable = !problems.bp && !problems.endT
  const placed = drawable ? placedSegments(s) : []
  const end = curveEnd(placed)
  const supercooled = s.direction === 'cooling' && s.supercool
  const pts = curvePoints(placed, supercooled ? s.supercoolBy : 0)
  const unit = s.source === 'properties' ? (s.xQuantity === 'time' ? 'min' : 'kJ') : ''
  const xEnd = axisEnd(axes.x)

  // Say when the curve runs off the grid; the Fit button fixes it.
  if (drawable) {
    const lo = Math.min(...pts.map((p) => p.y))
    const hi = Math.max(...pts.map((p) => p.y))
    const off: string[] = []
    if (end > xEnd * (1 + 1e-9)) off.push(`runs to ${round(end)}${unit ? ` ${unit}` : ''} along the x-axis, which ends at ${round(xEnd)}`)
    if (lo < box.y0 - 1e-9 || hi > box.y1 + 1e-9) off.push(`goes from ${round(lo)} to ${round(hi)} °C, past the temperature axis (${round(box.y0)} to ${round(box.y1)})`)
    if (off.length) problems.fit = `The curve ${off.join(', and ')}.`
  }

  const curve = clipPath(pts, box).map((run) => pathOf(run.map(px)))
  const onGrid = (p: Point) => p.x >= box.x0 - 1e-9 && p.x <= box.x1 + 1e-9 && p.y >= box.y0 - 1e-9 && p.y <= box.y1 + 1e-9
  const LFS = grid.fs * 1.1 // label font size
  const CHAR = LFS * 0.58
  const heating = s.direction === 'heating'

  // Dashed lines from each plateau across to the temperature axis.
  const guides: Segment[] = []
  if (s.guides) {
    for (const seg of placed) {
      if (!isPlateau(seg.key) || !onGrid({ x: seg.x0, y: seg.t0 })) continue
      const a = px({ x: box.x0, y: seg.t0 })
      const b = px({ x: seg.x0, y: seg.t0 })
      if (b.x - a.x > 1) guides.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
    }
  }

  // Everything a label or letter has to keep clear of: the curve, the
  // dashed lines, what's already placed, and the grid's edges. A letter can
  // go just off the grid when there's no room on it, clear of the axes and
  // their numbers.
  const lines: Segment[] = [...guides]
  for (const run of clipPath(pts, box).map((r) => r.map(px)))
    for (let k = 1; k < run.length; k++) lines.push({ x1: run[k - 1].x, y1: run[k - 1].y, x2: run[k].x, y2: run[k].y })
  const taken: Box[] = []
  const inside = { x0: grid.grid.x + 3, y0: grid.grid.y + 3, x1: grid.grid.x + grid.grid.w - 3, y1: grid.grid.y + grid.grid.h - 3 }
  const figure = { x0: 2, y0: 2, x1: grid.width - 2, y1: grid.height - 2 }
  const numbers: Box[] = grid.numbers.map((n) => {
    const w = n.text.length * grid.fs * 0.6
    const x0 = n.anchor === 'end' ? n.x - w : n.x - w / 2
    return { x0, y0: n.y - grid.fs * 0.8, x1: x0 + w, y1: n.y + grid.fs * 0.2 }
  })
  const axisLines: Segment[] = [
    { x1: grid.xAxis.x1, y1: grid.xAxis.y, x2: grid.xAxis.x2, y2: grid.xAxis.y },
    { x1: grid.yAxis.x, y1: grid.yAxis.y1, x2: grid.yAxis.x, y2: grid.yAxis.y2 },
  ]
  const within = (b: Box, r: Box) => b.x0 >= r.x0 && b.x1 <= r.x1 && b.y0 >= r.y0 && b.y1 <= r.y1
  const free = (b: Box) => !lines.some((l) => crosses(l, grow(b, 3))) && !taken.some((o) => overlaps(o, grow(b, 2)))
  const clear = (b: Box) => within(b, inside) && free(b)
  const onTheGrid = { x0: grid.grid.x, y0: grid.grid.y, x1: grid.grid.x + grid.grid.w, y1: grid.grid.y + grid.grid.h }
  const clearOff = (b: Box) =>
    within(b, figure) && free(b) && !overlaps(onTheGrid, grow(b, 3)) &&
    !axisLines.some((l) => crosses(l, grow(b, 3))) && !numbers.some((o) => overlaps(o, grow(b, 2)))
  // Where no spot is clear: the one on the grid crossing the fewest lines and
  // labels, so it never lands on the axes or their numbers.
  const intoGrid = (b: Box): Box => {
    const dx = Math.max(inside.x0 - b.x0, Math.min(0, inside.x1 - b.x1))
    const dy = Math.max(inside.y0 - b.y0, Math.min(0, inside.y1 - b.y1))
    return { x0: b.x0 + dx, y0: b.y0 + dy, x1: b.x1 + dx, y1: b.y1 + dy }
  }
  const inTheWay = (b: Box) =>
    lines.filter((l) => crosses(l, grow(b, 3))).length + 2 * taken.filter((o) => overlaps(o, grow(b, 2))).length
  const leastInTheWay = (spots: Box[]) =>
    spots.map(intoGrid).reduce((best, b) => (inTheWay(b) < inTheWay(best) ? b : best))

  // The melting and boiling points by the temperature axis, just above (or
  // below) each dashed line, or further along it where the curve is in the way.
  const pointLabels: Text[] = []
  const pointBlanks: Segment[] = []
  if (s.pointLabels !== 'none') {
    for (const seg of placed) {
      if (!isPlateau(seg.key) || !onGrid({ x: box.x0, y: seg.t0 })) continue
      const y = px({ x: box.x0, y: seg.t0 }).y
      const text = s.pointLabels === 'values' ? degrees(seg.t0) : POINT_NAMES[s.direction][seg.key as 'melt' | 'boil']
      const w = s.pointLabels === 'blank' ? BLANK_W * 0.75 : text.length * CHAR
      const spots: Box[] = []
      for (const along of [6, 30, 60, 100, 150])
        for (const y0 of [y - 6 - LFS, y + 6]) spots.push({ x0: grid.grid.x + along, y0, x1: grid.grid.x + along + w, y1: y0 + LFS })
      const spot = spots.find(clear) ?? leastInTheWay(spots.slice(0, 4))
      taken.push(spot)
      if (s.pointLabels === 'blank') pointBlanks.push({ x1: spot.x0, y1: spot.y1, x2: spot.x1, y2: spot.y1 })
      else pointLabels.push({ x: spot.x0, y: spot.y1 - LFS * 0.22, text, anchor: 'start' })
    }
  }

  const corners = placed.length ?[{ x: 0, y: placed[0].t0 }, ...placed.map((seg) => ({ x: seg.x0 + seg.width, y: seg.t1 }))] : []
  const drawn = corners.map(px)

  // Where each corner's letter could go: outside the turn the curve makes
  // there, then turning away from that toward the nearest clear spot.
  const unitOf = (a: Point, b: Point) => {
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    return d > 1e-6 ? { x: (b.x - a.x) / d, y: (b.y - a.y) / d } : null
  }
  const letterSpots: Box[][] = !s.letters
    ? []
    : drawn.map((c, i) => {
        if (!onGrid(corners[i])) return []
        const din = i > 0 ? unitOf(drawn[i - 1], c) : null
        const dout = i < drawn.length - 1 ? unitOf(c, drawn[i + 1]) : null
        // Heating runs up the page and cooling down it, so the outside of an
        // end is below-right of a heating curve's start and above-left of its end.
        const side = heating ? 1 : -1
        let off = { x: 0, y: 1 }
        if (din && dout && Math.hypot(din.x - dout.x, din.y - dout.y) > 0.05) off = { x: din.x - dout.x, y: din.y - dout.y }
        else if (dout) off = { x: -dout.y * side, y: dout.x * side }
        else if (din) off = { x: din.y * side, y: -din.x * side }
        const angle = Math.atan2(off.y, off.x)
        return LETTER_SPOTS.map(([turn, far]) => {
          const x = c.x + Math.cos(angle + turn) * LFS * LETTER_GAP * far
          const y = c.y + Math.sin(angle + turn) * LFS * LETTER_GAP * far
          return { x0: x - LFS * 0.45, y0: y - LFS * 0.5, x1: x + LFS * 0.45, y1: y + LFS * 0.5 }
        })
      })
  const bestLetterSpot = (spots: Box[]) => spots.find(clear) ?? spots.find(clearOff)
  // Labels keep off each letter's best spot when they can.
  const kept = letterSpots.map(bestLetterSpot).filter((b): b is Box => !!b)

  // Each segment's label (or a blank line for it) goes in the first spot
  // near it that's clear: beside a sloped segment, above or below a plateau.
  const labels: Text[] = []
  const blanks: Segment[] = []
  if (s.segmentLabels !== 'none') {
    // Plateaus first: they have the least room, and matter most.
    const h = LFS
    const order = [...placed.keys()].sort((i, j) => Number(isPlateau(placed[j].key)) - Number(isPlateau(placed[i].key)))
    const placedLabels: { i: number; spot: Box }[] = []
    for (const i of order) {
      const seg = placed[i]
      if (!onGrid({ x: seg.x0 + seg.width / 2, y: (seg.t0 + seg.t1) / 2 })) continue
      const a = drawn[i]
      const b = drawn[i + 1]
      const w = s.segmentLabels === 'blank' ? BLANK_W : segmentLabel(s, seg.key).length * CHAR
      const at = (t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
      const boxAt = (x0: number, yMid: number): Box => ({ x0, y0: yMid - h / 2, x1: x0 + w, y1: yMid + h / 2 })
      const spots: Box[] = []
      if (isPlateau(seg.key)) {
        // Above or below it, a row further out each time: centered, lined up
        // with either end, or just past its start (where the curve isn't).
        for (let row = 0; row < 6; row++) {
          const gap = LABEL_GAP + row * h * 1.1
          for (const y of [a.y - gap - h / 2, a.y + gap + h / 2])
            spots.push(
              boxAt((a.x + b.x - w) / 2, y), boxAt(b.x - 2 - w, y), boxAt(a.x + 2, y), boxAt(a.x + 8, y), boxAt(a.x + 16, y),
              boxAt(a.x - 4 - w, y),
            )
        }
      } else {
        for (const gap of [LABEL_GAP, LABEL_GAP + h, LABEL_GAP + h * 2])
          for (const t of [0.5, 0.35, 0.65, 0.2, 0.8]) {
            const p = at(t)
            spots.push(boxAt(p.x - gap - w, p.y), boxAt(p.x + gap, p.y))
          }
        // A short segment by the axis may have no room beside it; then above
        // or below it.
        for (const gap of [LABEL_GAP, LABEL_GAP + h, LABEL_GAP + h * 2])
          for (const t of [0.5, 0, 1]) {
            const p = at(t)
            spots.push(boxAt(p.x - w / 2, p.y - gap - h / 2), boxAt(p.x - w / 2, p.y + gap + h / 2))
          }
      }
      const spot = spots.find((b) => clear(b) && !kept.some((k) => overlaps(k, grow(b, 2)))) ?? spots.find(clear) ?? leastInTheWay(spots)
      taken.push(spot)
      placedLabels.push({ i, spot })
    }
    for (const { i, spot } of placedLabels.sort((p, q) => p.i - q.i)) {
      if (s.segmentLabels === 'blank') blanks.push({ x1: spot.x0, y1: spot.y1, x2: spot.x1, y2: spot.y1 })
      else labels.push({ x: spot.x0, y: spot.y1 - h * 0.22, text: segmentLabel(s, placed[i].key), anchor: 'start' })
    }
  }

  // Then the letters, each in its best spot still clear.
  const letters: Text[] = []
  letterSpots.forEach((spots, i) => {
    if (!spots.length) return
    const spot = bestLetterSpot(spots) ?? leastInTheWay(spots)
    taken.push(spot)
    letters.push({ x: (spot.x0 + spot.x1) / 2, y: spot.y1 - LFS * 0.15, text: letter(i), anchor: 'middle' })
  })

  // What each segment takes, for the settings panel.
  const props = propertiesOf(s)
  const rows = placed.map((seg, i) => ({
    key: seg.key,
    t0: seg.t0,
    t1: seg.t1,
    from: letter(i),
    to: letter(i + 1),
    width: seg.width,
    heat: heatOf(seg, s.mass, props),
  }))

  return {
    ...grid,
    curve,
    color: COLORS[s.color],
    guides,
    letters,
    segmentLabels: labels,
    segmentBlanks: blanks,
    pointLabels,
    pointBlanks,
    lfs: LFS,
    problems: { ...axes.problems, ...problems },
    rows,
    end,
    /** The curve's lowest and highest temperatures, for fitting the axes. */
    span: pts.length ? { lo: Math.min(...pts.map((p) => p.y)), hi: Math.max(...pts.map((p) => p.y)) } : null,
  }
}

export type CurveLayout = ReturnType<typeof buildCurve>
