// Lays out a photosynthesis graph for PhotosynthesisFigure.svelte to draw:
// up to three curves on a $shared/graph grid, told apart by their dashes
// and a key under the graph, as Enzyme Activity's are. The rate against
// light intensity (or the lamp's distance), CO₂ concentration or
// temperature; or the CO₂ in a closed chamber over time; or the CO₂ and O₂
// around one plant, over time with the O₂ on a right-hand axis (as
// Predator–Prey Cycles puts its predators) or against each other. Marked
// on them if wanted: where each curve levels off, what limits the rate on
// its rise and its plateau, lettered points for questions, the optimum and
// the compensation point, each label written, blank or left off and placed
// where it touches nothing. Points measured off the curves can be scattered
// about them, or drawn alone for students to draw the line.

import { readAxes, type GridSettings, type RangeSettings } from '$shared/graph/axes'
import { COLORS } from '$shared/graph/colors'
import { CELL, clipPath, layoutGrid, pathOf, round, type Point } from '$shared/graph/grid'
import {
  DASHES, alongCurve, besidePoint, layoutKey, placer, textBox, textWidth, type Anchor, type Box, type KeyEntry, type Spot,
} from '$shared/graph/labels'
import { fmt } from '$shared/graph/numbering'
import { random } from '../population-growth/growth'
import {
  DENATURED_AT, chamber, co2Compensation, co2Plateau, co2Saturation, distanceFor, grossRate, intensityAt,
  lightCompensation, lightPlateau, lightSaturation, respiration, type Sample,
} from './model'
import {
  BUBBLES, CO2_UNIT_TEXT, CURVES, co2In, curveOf, isRate, type CurveIndex, type PhotosynthesisSettings,
} from './settings'

const SAMPLES = 400
const PAD = 14 // the figure's margin, as the grid's
const INSET = 4 // how far inside the grid's border labels stay
const DOT_R = 5
const LETTER_R = 4
const BLANK_W = 70 // a write-on line for a label left blank
/** The most points measured along a curve. */
const MAX_POINTS = 12
/** Shape-only axes: the x-axis's blocks, and how many blocks up the highest value sits, of the y-axis's ten. */
const SHAPE_X = 15
const SHAPE_TOP = 8
const SHAPE_Y = 10
const INKS = ['blue', 'red', 'green'] as const
export const MARKERS = ['circle', 'square', 'triangle'] as const

type Segment = { x1: number; y1: number; x2: number; y2: number }
type Mode = PhotosynthesisSettings['satLabelMode']
type Ranges = RangeSettings & { y2From: string; y2Step: string }

/** A label on the figure: written text, or a write-on line for students. */
export type Label = { x: number; y: number; anchor: Anchor; text?: string; blank?: Segment }
export type Curve = {
  index: number
  name: string
  color: string
  dash?: string
  marker: (typeof MARKERS)[number]
  paths: string[]
  points: Point[]
}
export type Letter = { at: Point; text: Label }

const numText = (v: number) => String(Number(v.toPrecision(12)))
const sig = (v: number, n = 2) => fmt(Number(v.toPrecision(n)))

/** The curves drawn, by index; the gases are one plant's, curve 1's. */
export const drawnOf = (s: PhotosynthesisSettings) => (s.graph === 'gases' ? (s.show1 ? [0 as const] : []) : CURVES.filter((i) => curveOf(s, i).show))

/** What tells the curves apart on this graph: the factors it isn't drawn against. */
function factorsOf(s: PhotosynthesisSettings): ('light' | 'co2' | 'temp')[] {
  if (s.graph === 'light') return ['co2', 'temp']
  if (s.graph === 'co2') return ['light', 'temp']
  if (s.graph === 'temperature') return ['light', 'co2']
  return ['light', 'temp']
}

/** The factors that differ between the curves drawn. */
const differing = (s: PhotosynthesisSettings) => factorsOf(s).filter((k) => new Set(drawnOf(s).map((i) => curveOf(s, i)[k])).size > 1)

/** A curve's name in the key: the one typed, or what it's drawn at that the others aren't ("0.1 % CO₂, 25 °C"). */
export function curveName(s: PhotosynthesisSettings, i: CurveIndex) {
  const c = curveOf(s, i)
  if (c.name.trim()) return c.name.trim()
  if (s.graph === 'gases') return 'CO₂'
  const shown = differing(s)
  const parts = (shown.length ? shown : factorsOf(s)).map((k) =>
    k === 'co2' ? `${fmt(co2In(c.co2, s.co2Unit))} ${CO2_UNIT_TEXT[s.co2Unit]} CO₂`
    : k === 'temp' ? `${fmt(c.temp)} °C`
    : c.light === 0 ? 'Dark' : `Light intensity ${fmt(c.light)}`,
  )
  return parts.join(', ')
}

/** A rate in the unit shown: arbitrary units, or bubbles a minute. */
const rateIn = (s: PhotosynthesisSettings, v: number) => (s.rateUnit === 'bubbles' ? v * BUBBLES : v)

/** The rate a curve shows at light i, CO₂ c and temperature t: gross, or net of respiration. */
function rateAt(s: PhotosynthesisSettings, i: number, c: number, t: number) {
  const gross = grossRate(i, c, t)
  return rateIn(s, s.rate === 'net' ? gross - respiration(t) : gross)
}

/** A curve's rate at x, in the graph's own units. */
function rateFn(s: PhotosynthesisSettings, i: CurveIndex): (x: number) => number {
  const c = curveOf(s, i)
  if (s.graph === 'light') return s.lightAxis === 'distance' ? (d) => rateAt(s, intensityAt(d), c.co2, c.temp) : (x) => rateAt(s, x, c.co2, c.temp)
  if (s.graph === 'co2') return (x) => rateAt(s, c.light, s.co2Unit === 'ppm' ? x / 10_000 : x, c.temp)
  return (x) => rateAt(s, c.light, c.co2, x)
}

/** Where a curve levels off, in the graph's own x units, or null where it doesn't on this graph. */
function saturationOf(s: PhotosynthesisSettings, i: CurveIndex) {
  const c = curveOf(s, i)
  if (s.graph === 'light') {
    const at = lightSaturation(c.co2, c.temp)
    return s.lightAxis === 'distance' ? distanceFor(at) : at
  }
  if (s.graph === 'co2') {
    const at = co2Saturation(c.light, c.temp)
    return Number.isFinite(at) ? co2In(at, s.co2Unit) : null
  }
  return null
}

/** Where a net rate is 0, in the graph's own x units, or null. */
function compensationOf(s: PhotosynthesisSettings, i: CurveIndex) {
  const c = curveOf(s, i)
  if (s.graph === 'light') {
    const at = lightCompensation(c.co2, c.temp)
    return Number.isFinite(at) ? (s.lightAxis === 'distance' ? distanceFor(at) : at) : null
  }
  if (s.graph === 'co2') {
    const at = co2Compensation(c.light, c.temp)
    return Number.isFinite(at) ? co2In(at, s.co2Unit) : null
  }
  return null
}

/** One plant's chamber, curve i's, with the light going off if it does. */
const chamberOf = (s: PhotosynthesisSettings, i: CurveIndex, start = s.co2Start) => {
  const c = curveOf(s, i)
  return chamber({ light: c.light, temp: c.temp, start, minutes: s.minutes, offAt: s.lightsOff ? s.offAt : undefined })
}

/** The x-axis the curves are fitted to, before it's rounded: where they start and where they've long levelled off. */
function xSpanOf(s: PhotosynthesisSettings): [number, number] {
  const drawn = drawnOf(s)
  const curves = drawn.length ? drawn : [0 as const]
  if (s.graph === 'light') {
    if (s.lightAxis === 'distance') return [0, 50]
    return [0, Math.max(20, ...curves.map((i) => 1.9 * lightSaturation(curveOf(s, i).co2, curveOf(s, i).temp)))]
  }
  if (s.graph === 'co2') {
    const ends = curves.map((i) => co2Saturation(curveOf(s, i).light, curveOf(s, i).temp))
    const end = Math.min(2, Math.max(0.1, ...ends.map((e) => (Number.isFinite(e) ? 1.9 * e : 1))))
    return [0, co2In(end, s.co2Unit)]
  }
  if (s.graph === 'temperature') return [0, 50]
  return [0, s.minutes]
}

const NICE = [1, 2, 2.5, 5]
/** A numbered axis covering lo to hi from a whole step, counted by a nice step that makes about `target` blocks. */
export function niceAxis(lo: number, hi: number, target = 10) {
  const span = hi - lo > 0 ? hi - lo : Math.abs(hi) || 1
  let best: { score: number; from: number; step: number; blocks: number } | null = null
  const e0 = Math.floor(Math.log10(span / target))
  for (let e = e0 - 1; e <= e0 + 1; e++) {
    for (const m of NICE) {
      const step = Number((m * 10 ** e).toPrecision(12))
      const from = Math.floor(lo / step + 1e-9) * step
      const blocks = Math.max(1, Math.ceil((hi - from) / step - 1e-9))
      if (blocks < 4 || blocks > 40) continue
      const score = Math.abs(blocks - target) + (m === 2.5 ? 1.5 : 0)
      if (!best || score < best.score) best = { score, from, step, blocks }
    }
  }
  const b = best ?? { from: lo, step: span / target, blocks: target }
  return { from: numText(b.from), to: numText(b.from + b.blocks * b.step), step: numText(b.step) }
}

/** The curves' values, in the graph's own units, along the x-axis from x0 to x1. */
function dataOf(s: PhotosynthesisSettings, x0: number, x1: number) {
  const drawn = drawnOf(s)
  const xs = Array.from({ length: SAMPLES + 1 }, (_, k) => x0 + ((x1 - x0) * k) / SAMPLES)
  if (s.graph === 'gases') {
    const run = drawn.length ? chamberOf(s, 0) : []
    const co2 = (r: Sample) => co2In(r.co2, s.co2Unit)
    if (s.view === 'against') return { series: drawn.length ? [run.map((r) => ({ x: co2(r), y: r.o2 }))] : [], run }
    return { series: drawn.length ? [run.map((r) => ({ x: r.t, y: co2(r) })), run.map((r) => ({ x: r.t, y: r.o2 }))] : [], run }
  }
  if (s.graph === 'chamber') return { series: drawn.map((i) => chamberOf(s, i).map((r) => ({ x: r.t, y: co2In(r.co2, s.co2Unit) }))), run: [] }
  if (s.graph === 'temperature' && s.rate === 'gross') {
    // Each curve stops where the enzymes have denatured, rather than running on along the axis.
    const at = [...xs, DENATURED_AT].filter((x) => x >= x0 && x <= x1).sort((a, b) => a - b)
    return {
      series: drawn.map((i) => {
        const pts = at.map((x) => ({ x, y: rateFn(s, i)(x) }))
        return pts.slice(0, pts.findLastIndex((p) => p.y > 1e-9) + 2)
      }),
      run: [],
    }
  }
  return { series: drawn.map((i) => xs.map((x) => ({ x, y: rateFn(s, i)(x) }))), run: [] }
}

/** The ranges the axes fit to: everything drawn, with room above for labels. */
export function fittedOf(s: PhotosynthesisSettings) {
  const shape = s.axes === 'shape'
  const against = s.graph === 'gases' && s.view === 'against'
  // The x-axis first, which the curves are worked out along.
  let [x0, x1] = xSpanOf(s)
  if (against) {
    const run = drawnOf(s).length ? chamberOf(s, 0) : chamber({ light: 0, temp: 25, start: s.co2Start, minutes: s.minutes })
    const cs = run.map((r) => co2In(r.co2, s.co2Unit))
    const pad = (Math.max(...cs) - Math.min(...cs)) * 0.1 || co2In(0.01, s.co2Unit)
    ;[x0, x1] = [Math.max(0, Math.min(...cs) - pad), Math.max(...cs) + pad]
  }
  const x = shape && !against ? { from: numText(x0), to: numText(x1), step: numText((x1 - x0) / SHAPE_X) } : niceAxis(x0, x1, against ? 8 : 12)
  if (shape && against) Object.assign(x, { from: numText(x0), to: numText(x1), step: numText((x1 - x0) / SHAPE_X) })

  const { series } = dataOf(s, Number(x.from), Number(x.to))
  const left = s.graph === 'gases' && !against ? series.slice(0, 1) : series
  const ys = left.flat().map((p) => p.y)
  let hi = ys.length ? Math.max(...ys) : 1
  let lo = ys.length ? Math.min(0, ...ys) : 0
  if (hi <= 0) hi = Math.max(1, -lo)
  let y: { from: string; to: string; step: string }
  if (against) {
    const pad = (hi - Math.min(...ys)) * 0.1 || 0.01
    lo = Math.min(...ys) - pad
    hi += pad
    y = shape ? { from: numText(lo), to: numText(hi), step: numText((hi - lo) / SHAPE_Y) } : niceAxis(lo, hi, 8)
  } else if (shape) {
    // The highest value 8 blocks up, as Enzyme Activity's, with whole blocks below 0 for a net rate.
    const step = hi / SHAPE_TOP
    const below = lo < 0 ? Math.ceil(-lo / step + 0.4) : 0
    y = { from: numText(-below * step), to: numText(SHAPE_Y * step), step: numText(step) }
  } else {
    y = niceAxis(lo < 0 ? lo * 1.1 : 0, hi * 1.12, 10)
  }

  // The right-hand axis, for O₂: as many blocks as the left, counted by the same step, the O₂ in the middle.
  let y2 = { from: '0', step: y.step }
  if (s.graph === 'gases' && !against && series[1]) {
    const o2 = series[1].map((p) => p.y)
    const step = Number(y.step)
    const blocks = Math.round((Number(y.to) - Number(y.from)) / step)
    const mid = (Math.max(...o2) + Math.min(...o2)) / 2
    const from = shape ? mid - (blocks * step) / 2 : Math.floor((mid - (blocks * step) / 2) / step + 0.5) * step
    y2 = { from: numText(from), step: numText(step) }
  }
  return { xFrom: x.from, xTo: x.to, xStep: x.step, yFrom: y.from, yTo: y.to, yStep: y.step, y2From: y2.from, y2Step: y2.step }
}

/** The ranges drawn: shape-only axes are always fitted; numbered ones are fitted or as typed, each axis on its own. */
export function rangesOf(s: PhotosynthesisSettings, fitted: Ranges): Ranges {
  if (s.axes === 'shape') return fitted
  const x = s.xFit ? fitted : s
  const y = s.yFit ? fitted : s
  return { xFrom: x.xFrom, xTo: x.xTo, xStep: x.xStep, yFrom: y.yFrom, yTo: y.yTo, yStep: y.yStep, y2From: y.y2From, y2Step: y.y2Step }
}

const plain = (text: string) => {
  const t = text.replace(/−/g, '-').trim()
  return t && Number.isFinite(Number(t)) ? Number(t) : null
}

/** The limiting factor labels' words, for the rise and the plateau, unless the teacher typed their own. */
export function limitWords(s: PhotosynthesisSettings) {
  const differ = differing(s)
  const only = (k: 'light' | 'co2' | 'temp') => differ.length === 1 && differ[0] === k
  if (s.graph === 'co2') {
    return { low: 'CO₂ is limiting', high: only('light') ? 'Light is limiting' : only('temp') ? 'Temperature is limiting' : 'Light or temperature is limiting' }
  }
  return { low: 'Light is limiting', high: only('co2') ? 'CO₂ is limiting' : only('temp') ? 'Temperature is limiting' : 'CO₂ or temperature is limiting' }
}

export function buildPhotosynthesis(s: PhotosynthesisSettings) {
  const graph = s.graph
  const shape = s.axes === 'shape'
  const rate = isRate(graph)
  const gases = graph === 'gases'
  const against = gases && s.view === 'against'
  const twoAxes = gases && !against
  const drawn = drawnOf(s)
  const fitted = fittedOf(s)
  const ranges = rangesOf(s, fitted)
  const problems: Record<string, string | null> = {}

  // A fitted x-axis numbered every line whose numbers would run together is numbered every other line.
  const xRead = readAxes(ranges).x
  const crowded = Array.from({ length: xRead.blocks + 1 }, (_, j) => fmt(Number((xRead.start + j * xRead.step).toPrecision(12))))
    .some((t) => textWidth(t, 14) > CELL - 8)
  const gs: GridSettings & Ranges = {
    ...s,
    ...ranges,
    xEvery: shape ? 0 : s.xFit && s.xEvery === 1 && crowded ? 2 : s.xEvery,
    yEvery: shape ? 0 : s.yEvery,
    minor: s.gridlines ? s.minor : 0,
  }
  const axes = readAxes(gs)
  Object.assign(problems, axes.problems)
  const { px, box, ...grid } = layoutGrid(gs, axes)
  const fs = grid.fs
  const LABEL_FS = fs * 1.05
  const area = grid.grid
  const x0 = axes.x.start
  const x1 = axes.x.start + axes.x.blocks * axes.x.step
  const inX = (v: number) => v >= x0 - 1e-9 && v <= x1 + 1e-9
  const inBox = (p: Point) => p.x >= box.x0 - 1e-9 && p.x <= box.x1 + 1e-9 && p.y >= box.y0 - 1e-9 && p.y <= box.y1 + 1e-9

  // The right-hand axis's scale, as typed or fitted.
  let y2 = { start: plain(ranges.y2From) ?? 0, step: plain(ranges.y2Step) ?? 1 }
  if (twoAxes && !shape && !s.yFit) {
    if (plain(s.y2From) === null) problems.y2From = 'Type a number, like 20.9 or 21.'
    if (plain(s.y2Step) === null) problems.y2Step = 'Type a number, like 0.01 or 0.005.'
    else if (plain(s.y2Step)! <= 0) problems.y2Step = 'Count by a number bigger than 0.'
    if (problems.y2From || problems.y2Step) y2 = { start: plain(fitted.y2From) ?? 0, step: plain(fitted.y2Step) ?? 1 }
  }
  /** A series' value on the left-hand scale the grid is drawn in: O₂ goes on the right. */
  const onGrid = (series: number, v: number) => (twoAxes && series === 1 ? axes.y.start + ((v - y2.start) * axes.y.step) / y2.step : v)

  const bounds: Box = { x0: area.x + INSET, y0: area.y + INSET, x1: area.x + area.w - INSET, y1: area.y + area.h - INSET }
  const place = placer(bounds)
  // A net rate's x-axis runs across the grid, with its numbers under it.
  if (grid.xAxis.y < area.y + area.h - 1) place.line([{ x: grid.xAxis.x1, y: grid.xAxis.y }, { x: grid.xAxis.x2, y: grid.xAxis.y }])
  for (const n of grid.numbers) place.box(textBox({ x: n.x, y: n.y, anchor: n.anchor ?? 'middle' }, textWidth(n.text, fs), fs))

  // The curves, cut to the grid, and the points measured off them.
  const { series: data } = dataOf(s, x0, x1)
  const pageOf: Point[][] = []
  const names = gases ? (against ? ['CO₂ against O₂'] : ['CO₂', 'O₂']) : drawn.map((i) => curveName(s, i))
  const curves: Curve[] = data.map((pts, k) => {
    const color = s.color ? COLORS[INKS[k]] : COLORS.black
    const paths: string[] = []
    const onPage: Point[] = []
    if (s.points !== 'only') {
      for (const run of clipPath(pts.map((p) => ({ x: p.x, y: onGrid(k, p.y) })), box)) {
        const page = run.map(px).filter((v, j, all) => j === 0 || j === all.length - 1 || Math.hypot(v.x - all[j - 1].x, v.y - all[j - 1].y) > 0.4)
        paths.push(pathOf(page))
        // Labels keep off the curve as a few longer pieces, so crossing it counts once, not once a pixel.
        place.line(page.filter((v, j) => j === 0 || j === page.length - 1 || j % 8 === 0))
        onPage.push(...page)
      }
    }
    pageOf.push(onPage.length ? onPage : pts.map((p) => px({ x: p.x, y: onGrid(k, p.y) })))
    return { index: gases ? k : drawn[k], name: names[k], color, dash: DASHES[k], marker: MARKERS[k], paths, points: [] }
  })

  if (s.points !== 'none' && data.length) {
    // At each numbered line along x (or nine evenly spaced on shape-only axes), thinned to a dozen.
    const step = shape ? (x1 - x0) / 10 : axes.x.step
    let at: number[] = []
    for (let v = x0 + step; v <= x1 + 1e-9; v += step) at.push(Number(v.toPrecision(12)))
    if (gases || graph === 'chamber') at = at.filter((v) => v <= s.minutes + 1e-9)
    while (at.length > MAX_POINTS) at = at.filter((_, k) => k % 2 === 1)
    data.forEach((line, k) => {
      const next = random(s.seed * 7 + k * 1013)
      // CO₂ against O₂ runs right to left as the CO₂ falls; it's the same line either way.
      const pts = against ? [...line].sort((a, b) => a.x - b.x) : line
      const valueAt = (v: number) => {
        // Between the two samples either side.
        const j = pts.findIndex((p) => p.x >= v - 1e-9)
        if (j < 0 || v < pts[0].x - 1e-9) return null
        if (j === 0 || pts[j].x === v) return pts[j]
        const a = pts[j - 1]
        const b = pts[j]
        const f = (v - a.x) / (b.x - a.x)
        return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
      }
      const along = at.map(valueAt).filter((p): p is Point => !!p)
      for (const p of along) {
        // Box–Muller, for points off by a normal amount: a share of the rate,
        // or of the starting CO₂ for the gases (O₂'s 21 % would swamp them).
        const z = Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next())
        const size = !gases ? Math.abs(p.y) : against || k === 1 ? s.co2Start : co2In(s.co2Start, s.co2Unit)
        const q = { x: p.x, y: onGrid(k, p.y + (s.noise / 100) * size * z) }
        if (!inBox(q)) continue
        const dot = px(q)
        curves[k].points.push(dot)
        place.box({ x0: dot.x - 6, y0: dot.y - 6, x1: dot.x + 6, y1: dot.y + 6 })
      }
    })
  }

  // The marks: dots, dashed lines to the axes, letters and labels.
  const dots: Point[] = []
  const guides: Segment[] = []
  const markLabels: Label[] = []
  const letters: Letter[] = []
  const axisY = grid.xAxis.y
  const axisX = grid.yAxis.x
  const guide = (l: Segment) => {
    guides.push(l)
    place.line([{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }])
  }
  const dot = (p: Point, r = DOT_R) => place.box({ x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r })
  /** Where a curve is at x, on the drawing, or null off the grid. */
  const onCurve = (i: CurveIndex, v: number) => {
    const q = { x: v, y: rateFn(s, i)(v) }
    return inBox(q) ? px(q) : null
  }
  const text = (mode: Mode, words: string) => (mode === 'text' ? words.trim() : '')
  const shown = (mode: Mode, words: string) => mode === 'blank' || !!text(mode, words)
  const label = (spots: Spot[], mode: Mode, words: string) => {
    if (!shown(mode, words)) return
    const w = mode === 'blank' ? BLANK_W : textWidth(text(mode, words), LABEL_FS) * 1.06 + 2
    const spot = place.place(spots, w, LABEL_FS)
    if (mode === 'text') markLabels.push({ x: spot.x, y: spot.y, anchor: spot.anchor, text: text(mode, words) })
    else markLabels.push({ x: spot.x, y: spot.y, anchor: spot.anchor, blank: { x1: spot.box.x0, y1: spot.y, x2: spot.box.x1, y2: spot.y } })
  }
  const near = (a: number, b: number) => Math.abs(a - b) < 0.5
  const once = (list: Point[], same: (a: Point, b: Point) => boolean) => list.filter((t, k) => list.findIndex((u) => same(u, t)) === k)

  /** The letters, A, B, C… in order, each just clear of its dot: placed before the other labels, which move round them. */
  const nameLetters = () => letters.forEach((l, k) => {
    const p = l.at
    const gap = LETTER_R + 5
    const spots: Spot[] = [
      { x: p.x - gap, y: p.y - gap, anchor: 'end' },
      { x: p.x, y: p.y - gap - 2, anchor: 'middle' },
      { x: p.x + gap, y: p.y - gap, anchor: 'start' },
      { x: p.x + gap, y: p.y + gap + LABEL_FS * 0.7, anchor: 'start' },
      { x: p.x, y: p.y + gap + LABEL_FS * 0.8, anchor: 'middle' },
      { x: p.x - gap, y: p.y + gap + LABEL_FS * 0.7, anchor: 'end' },
      { x: p.x + gap + 2, y: p.y + LABEL_FS * 0.35, anchor: 'start' },
      { x: p.x - gap - 2, y: p.y + LABEL_FS * 0.35, anchor: 'end' },
    ]
    const name = String.fromCharCode(65 + k)
    const spot = place.place(spots, textWidth(name, LABEL_FS) + 2, LABEL_FS)
    l.text = { x: spot.x, y: spot.y, anchor: spot.anchor, text: name }
  })

  // Each curve's rise and plateau, on the drawing, from how far up its range it is.
  const partsOf = (k: number) => {
    const pts = pageOf[k] ?? []
    const vals = data[k]?.map((p) => p.y) ?? []
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const yHi = px({ x: x0, y: hi }).y
    const yLo = px({ x: x0, y: lo }).y
    const share = (p: Point) => (yLo - p.y) / Math.max(1e-9, yLo - yHi)
    return {
      rise: pts.filter((p) => share(p) > 0.12 && share(p) < 0.7),
      plateau: pts.filter((p) => share(p) > 0.975),
      share,
    }
  }
  const lowest = drawn.length ? drawn.reduce((a, b) => (Math.max(...data[drawn.indexOf(b)].map((p) => p.y)) < Math.max(...data[drawn.indexOf(a)].map((p) => p.y)) ? b : a)) : null
  const highest = drawn.length ? drawn.reduce((a, b) => (Math.max(...data[drawn.indexOf(b)].map((p) => p.y)) > Math.max(...data[drawn.indexOf(a)].map((p) => p.y)) ? b : a)) : null

  if ((graph === 'light' || graph === 'co2') && drawn.length) {
    // Where each curve levels off, with dashed lines to both axes.
    const sats: Point[] = []
    if (s.markSat) {
      for (const i of drawn) {
        const v = saturationOf(s, i)
        const p = v !== null && inX(v) ? onCurve(i, v) : null
        if (p) sats.push(p)
      }
      for (const p of once(sats, (a, b) => near(a.x, b.x) && near(a.y, b.y))) {
        guide({ x1: p.x, y1: p.y, x2: p.x, y2: axisY })
        guide({ x1: axisX, y1: p.y, x2: p.x, y2: p.y })
        dots.push(p)
        dot(p)
      }
    }
    // The compensation point, where a net rate crosses 0.
    const comps: Point[] = []
    if (s.rate === 'net' && s.markComp) {
      for (const i of drawn) {
        const v = compensationOf(s, i)
        if (v !== null && inX(v)) comps.push(px({ x: v, y: 0 }))
      }
      for (const p of once(comps, (a, b) => near(a.x, b.x))) {
        dots.push(p)
        dot(p)
      }
    }

    // Lettered points: A on the rise every curve shares, then one on each
    // curve's plateau, all at one x past where every curve has levelled off
    // (nearer the lamp than any, against distance).
    if (s.letters) {
      const at: Point[] = []
      const low = drawn.indexOf(lowest!)
      const rise = partsOf(low)
      const a = rise.rise.reduce<Point | null>((best, p) => (!best || Math.abs(rise.share(p) - 0.5) < Math.abs(rise.share(best) - 0.5) ? p : best), null)
      if (a) at.push(a)
      const ends = drawn.map((i) => saturationOf(s, i)).filter((v): v is number => v !== null && Number.isFinite(v))
      const distance = graph === 'light' && s.lightAxis === 'distance'
      const far = Math.max(...ends)
      const common = !ends.length ? null : distance ? Math.min(...ends) * 0.5 : far < x1 ? (far + x1) / 2 : null
      drawn.forEach((i, k) => {
        const p = common !== null ? onCurve(i, common) : null
        const plateau = partsOf(k).plateau
        if (p) at.push(p)
        else if (plateau.length) at.push(plateau[Math.floor(plateau.length * 0.6)])
      })
      for (const p of at) {
        dot(p, LETTER_R + 2)
        letters.push({ at: p, text: { x: 0, y: 0, anchor: 'middle' } })
      }
      nameLetters()
    }

    // The labels, those tied to a point first.
    for (const p of once(sats, (a, b) => near(a.x, b.x) && near(a.y, b.y))) label(besidePoint(p, LABEL_FS), s.satLabelMode, s.satLabel)

    // What limits the rate: on the rise every curve shares, and on the top curve's plateau.
    if (s.markLimit) {
      const words = limitWords(s)
      // Beside the rise, or under the top curve's longer rise, out in the open below the plateaus.
      const rise = partsOf(drawn.indexOf(lowest!)).rise
      const beside = alongCurve(partsOf(drawn.indexOf(highest!)).rise, LABEL_FS).filter((_, k) => k % 4 === 1)
      label([...alongCurve(rise, LABEL_FS), ...beside], s.lowLabelMode, s.lowLabelMode === 'text' ? s.lowLabel.trim() || words.low : s.lowLabel)
      const plateau = partsOf(drawn.indexOf(highest!)).plateau
      const middle = plateau.length ? [...plateau].sort((a, b) => Math.abs(a.x - plateau[plateau.length >> 1].x) - Math.abs(b.x - plateau[plateau.length >> 1].x)) : []
      const over = middle.flatMap((p) => [
        { x: p.x, y: p.y - 10, anchor: 'middle' as const },
        { x: p.x, y: p.y - 10 - LABEL_FS * 1.2, anchor: 'middle' as const },
      ])
      const under = middle.map((p) => ({ x: p.x, y: p.y + LABEL_FS + 6, anchor: 'middle' as const }))
      label([...over, ...under], s.highLabelMode, s.highLabelMode === 'text' ? s.highLabel.trim() || words.high : s.highLabel)
    }

    // Compensation points close together share one label.
    const labelled: Point[] = []
    for (const p of once(comps, (a, b) => near(a.x, b.x))) {
      if (labelled.some((q) => Math.abs(q.x - p.x) < 150)) continue
      labelled.push(p)
      const up = LABEL_FS * 0.9
      label(
        [
          { x: p.x + 10, y: p.y - up, anchor: 'start' }, { x: p.x - 10, y: p.y - up, anchor: 'end' },
          { x: p.x + 10, y: p.y + LABEL_FS * 1.4, anchor: 'start' }, { x: p.x - 10, y: p.y + LABEL_FS * 1.4, anchor: 'end' },
          ...besidePoint(p, LABEL_FS),
        ],
        s.compLabelMode, s.compLabel,
      )
    }
  }

  if (graph === 'temperature' && drawn.length) {
    // Each curve's peak, with a dashed line down to the x-axis.
    const peaks: Point[] = []
    for (const [k] of drawn.entries()) {
      const top = data[k].reduce((a, b) => (b.y > a.y ? b : a))
      if (s.markOpt && inBox(top)) peaks.push(px(top))
    }
    for (const p of once(peaks, (a, b) => near(a.x, b.x))) {
      guide({ x1: p.x, y1: p.y, x2: p.x, y2: axisY })
      dots.push(p)
      dot(p)
    }
    // Lettered points on the first curve: on the rise, at the peak and on the fall.
    if (s.letters) {
      const pts = pageOf[0]
      const top = pts.reduce((a, b) => (b.y < a.y ? b : a), pts[0])
      const height = axisY - top.y
      const half = (side: -1 | 1) =>
        pts.filter((p) => (p.x - top.x) * side > 0).reduce<Point | null>((best, p) => (!best || Math.abs(axisY - p.y - height * 0.5) < Math.abs(axisY - best.y - height * 0.5) ? p : best), null)
      for (const p of [half(-1), top, half(1)]) {
        if (!p) continue
        dot(p, LETTER_R + 2)
        letters.push({ at: p, text: { x: 0, y: 0, anchor: 'middle' } })
      }
      nameLetters()
    }
    const rows = [12, 12 + LABEL_FS * 1.25, 12 + LABEL_FS * 2.5]
    // Over a peak, centered, then to either side and higher up, then beside it (as Enzyme Activity's).
    const overPeak = (p: Point): Spot[] => [
      ...rows.flatMap((up) => [
        { x: p.x, y: p.y - up, anchor: 'middle' as const },
        { x: p.x + 8, y: p.y - up, anchor: 'start' as const },
        { x: p.x - 8, y: p.y - up, anchor: 'end' as const },
      ]),
      { x: p.x + 12, y: p.y + LABEL_FS * 0.35, anchor: 'start' },
      { x: p.x - 12, y: p.y + LABEL_FS * 0.35, anchor: 'end' },
    ]
    for (const p of once(peaks, (a, b) => near(a.x, b.x))) label(overPeak(p), s.optLabelMode, s.optLabel)
  }

  // The dark, shaded, after the light goes off, with Light and Dark written over each part.
  let dark: { x: number; y: number; w: number; h: number } | null = null
  const periods: Label[] = []
  if ((graph === 'chamber' || twoAxes) && s.lightsOff && s.offAt > x0 && s.offAt < Math.min(x1, s.minutes)) {
    const from = px({ x: s.offAt, y: 0 }).x
    const to = px({ x: Math.min(x1, s.minutes), y: 0 }).x
    dark = { x: from, y: area.y, w: to - from, h: area.h }
    const y = area.y + LABEL_FS + 4
    for (const [words, a, b] of [['Light', px({ x: Math.max(0, x0), y: 0 }).x, from], ['Dark', from, to]] as const) {
      if (b - a < textWidth(words, LABEL_FS) + 12) continue
      const l: Label = { x: (a + b) / 2, y, anchor: 'middle', text: words }
      periods.push(l)
      place.keep(textBox(l, textWidth(words, LABEL_FS), LABEL_FS))
    }
  }

  // The right-hand axis, for O₂: its line, numbers and title, in room added right of the grid (as Predator–Prey Cycles').
  type Text = { x: number; y: number; text: string; anchor: Anchor }
  let right: { line: Segment; numbers: Text[]; title?: Text; blank?: Segment } | null = null
  let width = grid.width
  if (twoAxes) {
    const x = area.x + area.w
    const numbers: Text[] = []
    if (!shape && s.yEvery) {
      for (let j = 0; j <= axes.y.blocks; j += s.yEvery) {
        numbers.push({ x: x + 6, y: area.y + area.h - j * CELL + fs * 0.35, text: fmt(Number((y2.start + j * y2.step).toPrecision(12))), anchor: 'start' })
      }
    }
    const numW = numbers.length ? Math.max(...numbers.map((n) => textWidth(n.text, fs))) + 10 : 4
    const title = s.y2TitleMode === 'text' ? s.y2Title.trim() : ''
    const side = title || s.y2TitleMode === 'blank'
    const titleX = x + numW + fs * 0.9
    const midY = area.y + area.h / 2
    width = Math.max(grid.width, x + numW + (side ? fs * 1.2 + 12 : 0) + PAD)
    right = {
      line: { x1: x, y1: area.y + area.h, x2: x, y2: area.y },
      numbers,
      title: title ? { x: titleX, y: midY, text: title, anchor: 'middle' } : undefined,
      blank: !title && side ? { x1: titleX, y1: midY - Math.min(100, area.h / 2), x2: titleX, y2: midY + Math.min(100, area.h / 2) } : undefined,
    }
  }

  // The key, when there's more than one line to tell apart.
  let keyEntries: KeyEntry[] = []
  let height = grid.height
  if (curves.length > 1) {
    const key = layoutKey(curves, { midX: area.x + area.w / 2, wrap: Math.max(area.w, 360), top: grid.height - PAD + 2, left: PAD, fs, labelFs: LABEL_FS })
    keyEntries = key.entries
    width = Math.max(width, key.right + PAD)
    height = key.bottom + PAD
  }

  return {
    ...grid,
    width: round(width),
    height: round(height),
    // Shape-only graphs are plain axes unless the teacher wants the grid; numbered ones keep a tick at each block.
    vLines: shape && !s.gridlines ? [] : grid.vLines,
    hLines: shape && !s.gridlines ? [] : grid.hLines,
    gridlines: (s.gridlines || shape ? 'standard' : 'none') as 'standard' | 'none',
    gridSettings: gs,
    labelFs: LABEL_FS,
    r: DOT_R,
    letterR: LETTER_R,
    curves,
    dots,
    guides,
    letters,
    markLabels,
    periods,
    dark,
    right,
    keyEntries,
    fitted,
    problems,
  }
}

export type PhotosynthesisLayout = ReturnType<typeof buildPhotosynthesis>

/** What each curve works out to, for the settings panel and the examples' answer keys. */
export function readoutOf(s: PhotosynthesisSettings): string[] {
  const drawn = drawnOf(s)
  const unit = CO2_UNIT_TEXT[s.co2Unit]
  const co2 = (c: number) => `${sig(co2In(c, s.co2Unit))} ${unit}`
  const rateText = (v: number) => (s.rateUnit === 'bubbles' ? `${sig(v * BUBBLES)} bubbles a minute` : sig(v))
  const plateauOf = (v: number, t: number) => rateText(s.rate === 'net' ? v - respiration(t) : v)
  if (s.graph === 'gases') {
    if (!drawn.length) return []
    const run = chamberOf(s, 0)
    const lit = s.lightsOff ? run.filter((r) => r.t <= s.offAt + 1e-9) : run
    const end = lit.at(-1)!
    const lines = [
      end.co2 < s.co2Start
        ? `In the light, CO₂ falls from ${co2(s.co2Start)} to ${co2(end.co2)}, and O₂ rises by the same, to ${sig(end.o2, 5)} %`
        : `In the light, CO₂ rises from ${co2(s.co2Start)} to ${co2(end.co2)}, and O₂ falls by the same, to ${sig(end.o2, 5)} %`,
    ]
    if (s.lightsOff && s.offAt < s.minutes) lines.push(`In the dark, from ${sig(s.offAt)} minutes, CO₂ rises and O₂ falls in straight lines: respiration only`)
    return lines
  }
  return drawn.map((i) => {
    const c = curveOf(s, i)
    const name = curveName(s, i)
    if (s.graph === 'chamber') {
      const run = chamberOf(s, i)
      const lit = s.lightsOff ? run.filter((r) => r.t <= s.offAt + 1e-9) : run
      const end = lit.at(-1)!
      const net = grossRate(c.light, s.co2Start, c.temp) - respiration(c.temp)
      const after = s.lightsOff && s.offAt < s.minutes ? `, then rises again after the light goes off at ${sig(s.offAt)} minutes` : ''
      if (c.light === 0) return `${name}: CO₂ rises in a straight line, by ${co2(end.co2 - s.co2Start)} in ${sig(end.t)} minutes: respiration only`
      if (Math.abs(net) < respiration(c.temp) * 0.02) return `${name}: CO₂ stays level, as photosynthesis just keeps up with respiration (the compensation point)${after}`
      if (net < 0) return `${name}: CO₂ rises, more slowly than in the dark, as photosynthesis uses some of what respiration gives off${after}`
      const floor = co2Compensation(c.light, c.temp)
      return `${name}: CO₂ falls and levels off at about ${co2(floor)}, the CO₂ compensation point${after}`
    }
    if (s.graph === 'temperature') {
      const best = (() => {
        let top = 0
        for (let t = 0; t <= 50; t += 0.1) if (rateAt(s, c.light, c.co2, t) > rateAt(s, c.light, c.co2, top)) top = t
        return top
      })()
      const shownRate = rateAt(s, c.light, c.co2, best)
      return `${name}: fastest at about ${Math.round(best)} °C, at ${s.rateUnit === 'bubbles' ? `${sig(shownRate)} bubbles a minute` : sig(shownRate)}; stops by about ${Math.round(DENATURED_AT)} °C as its enzymes denature`
    }
    const comp = s.rate === 'net' ? compensationOf(s, i) : null
    const compText = comp === null ? '' : s.graph === 'light' && s.lightAxis === 'distance' ? `; compensation point about ${sig(comp)} cm from the lamp` : s.graph === 'light' ? `; compensation point at a light intensity of about ${sig(comp)}` : `; compensation point at about ${sig(comp)} ${unit} CO₂`
    if (s.graph === 'light') {
      const at = lightSaturation(c.co2, c.temp)
      const level = plateauOf(lightPlateau(c.co2, c.temp), c.temp)
      if (s.lightAxis === 'distance') return `${name}: levels off at ${level} closer than about ${sig(distanceFor(at))} cm to the lamp; farther away light is limiting, and the rate falls as 1/d²${compText}`
      return `${name}: light is limiting up to a light intensity of about ${sig(at)}, then the rate levels off at ${level}${compText}`
    }
    const at = co2Saturation(c.light, c.temp)
    const level = plateauOf(co2Plateau(c.light, c.temp), c.temp)
    return Number.isFinite(at)
      ? `${name}: CO₂ is limiting up to about ${co2(at)}, then the rate levels off at ${level}${compText}`
      : `${name}: CO₂ is limiting all the way along${compText}`
  })
}
