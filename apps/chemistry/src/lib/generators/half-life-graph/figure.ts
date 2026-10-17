// Lays out a half-life graph for HalfLifeFigure.svelte to draw: up to three
// decay curves on a $shared/graph grid, told apart by their dashes and a key
// under the graph, as Biology's Photosynthesis Rate's are, and the first
// isotope's stable daughter rising as it falls. Marked on them if wanted: a
// dot at the start and at each half-life, and dashed guide lines from 50%,
// 25%, 12.5%… across to the first isotope's curve and down to the time axis,
// each labeled with its time, T½, 2T½…, a blank line or nothing, placed by
// $shared/graph/labels where it touches nothing.

import { EVERY, readAxes } from '$shared/graph/axes'
import { COLORS } from '$shared/graph/colors'
import { CELL, clipPath, layoutGrid, pathOf, round, type Point } from '$shared/graph/grid'
import { DASHES, besidePoint, layoutKey, placer, textBox, textWidth, type Anchor, type Box, type KeyEntry, type Spot } from '$shared/graph/labels'
import { fmt } from '$shared/graph/numbering'
import { daughter, decayConstant, halvesText, remaining } from './decay'
import { UNIT_NAMES, convert, timeText } from './isotopes'
import {
  daughterShown, drawnIsotopes, shownDaughter, shownName, valueOf, yTitleFor, type Drawn, type HalfLifeSettings,
} from './settings'

const SAMPLES = 400
const PAD = 14 // the figure's margin, as the grid's
const INSET = 4 // how far inside the grid's border labels stay
const BLANK_W = 70 // a write-on line for a label left blank
/** The most half-lives a curve's dots go to: past that they lie along the axis. */
const MAX_DOTS = 6
const INKS = ['blue', 'red', 'green'] as const
export const MARKERS = ['circle', 'square', 'triangle'] as const

type Segment = { x1: number; y1: number; x2: number; y2: number }

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

/** An isotope's half-life in the x-axis's unit. */
export const halfOn = (s: HalfLifeSettings, iso: Drawn) => convert(iso.half, iso.unit, s.xUnit)

/** A value up the side, as written in messages: "150 g", "1000 Bq". */
function valueText(s: HalfLifeSettings, v: number) {
  const n = fmt(Number(v.toPrecision(6)))
  if (s.quantity === 'percent') return `${n}%`
  if (s.quantity === 'mass') return `${n} g`
  if (s.quantity === 'activity') return s.activityUnit === 'Bq' ? `${n} Bq` : `${n} counts/min`
  return n
}

/** An isotope's name mid-sentence: a setup's in lowercase ("carbon-14"); a made-up or typed one as it is. */
const inSentence = (iso: Drawn, name: string) => (iso.id === 'custom' || iso.id === 'x' ? name : name.toLowerCase())

/** A list in words: "a", "a and b", "a, b and c". */
const listed = (words: string[]) => (words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : words[0])

/** What the figure shows, for screen readers: never the names, when they're hidden. */
export function labelOf(s: HalfLifeSettings) {
  if (s.titleMode === 'text' && s.title.trim()) return s.title.trim()
  const isotopes = drawnIsotopes(s)
  const names = isotopes.map((iso) => (s.names ? inSentence(iso, iso.name) : shownName(s, iso.slot).replace(/^P/, 'p')))
  const child = !daughterShown(s) ? '' : s.names ? `, decaying to ${inSentence(isotopes[0], shownDaughter(s))}` : ', decaying to its daughter isotope'
  return `Half-life graph of ${listed(names)}${child}`
}

/** "1.21 × 10⁻⁴", or "0.0866" from 0.001 up to 10,000: to three significant figures. */
export function sciText(v: number) {
  if (v >= 1e-3 && v < 1e4) return fmt(Number(v.toPrecision(3)))
  const e = Math.floor(Math.log10(v))
  let m = Number((v / 10 ** e).toPrecision(3))
  let p = e
  if (m >= 10) [m, p] = [Number((m / 10).toPrecision(3)), p + 1]
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
  const power = String(Math.abs(p)).split('').map((d) => SUP[Number(d)]).join('')
  return `${m} × 10${p < 0 ? '⁻' : ''}${power}`
}

/**
 * The answer key: each isotope's half-life, decay constant and what it
 * decays to (naming each hidden one), then what's left of the first at each
 * guide line, in the x-axis's unit.
 */
export function answerLines(s: HalfLifeSettings): string[] {
  const isotopes = drawnIsotopes(s)
  const out = isotopes.map((iso) => {
    const who = s.names ? iso.name : `${shownName(s, iso.slot)} is ${inSentence(iso, iso.name)}`
    const lambda = `λ = ${sciText(decayConstant(iso.half))} per ${UNIT_NAMES[iso.unit].one}`
    const to = iso.mode && iso.daughter ? `; ${iso.mode} to ${inSentence(iso, iso.daughter)}` : iso.mode ? `; ${iso.mode}` : ''
    return `${who}: half-life ${timeText(iso.half, iso.unit)}, ${lambda}${to}`
  })
  const half = halfOn(s, isotopes[0])
  for (let k = 1; k <= s.guides; k++) {
    const left = valueText(s, valueOf(s, remaining(k * half, half)))
    out.push(`After ${k} half-li${k === 1 ? 'fe' : 'ves'} (${timeText(k * half, s.xUnit)}): ${left}`)
  }
  return out
}

/**
 * A tidy axis from 0 up to `top`, in as many blocks as it can up to `most`,
 * counting by 1, 2, 2.5 or 5 times a power of ten: [start, end, step]. The
 * steps are round, not the half-life, so students read it off the curve.
 */
function upTo(top: number, most: number): [number, number, number] {
  for (let k = Math.floor(Math.log10(top)) - 3; ; k++) {
    for (const m of [1, 2, 2.5, 5]) {
      const step = Number((m * 10 ** k).toPrecision(6))
      const blocks = Math.ceil(top / step - 1e-9)
      if (blocks <= most) return [0, Number((blocks * step).toPrecision(12)), step]
    }
  }
}

/** Axes that just fit the curves: 0 to 5 half-lives of the longest isotope, and up to the starting amount, in tidy steps. */
export function fittedAxes(s: HalfLifeSettings) {
  const longest = Math.max(...drawnIsotopes(s).map((iso) => halfOn(s, iso)))
  const [x0, x1, xs] = upTo(5 * longest, 16)
  const [y0, y1, ys] = upTo(valueOf(s, 1), 10)
  const blocks = (a: number, b: number, step: number) => Math.round((b - a) / step)
  // Numbered often enough to read, and never so often the numbers run together.
  const widest = Math.max(...Array.from({ length: blocks(x0, x1, xs) + 1 }, (_, j) => textWidth(fmt(Number((x0 + j * xs).toPrecision(12))), 14)))
  const every = EVERY.find((n) => n && n >= (blocks(x0, x1, xs) > 10 ? 2 : 1) && n * CELL - 8 >= widest) ?? 10
  return {
    xFrom: String(x0), xTo: String(x1), xStep: String(xs), xEvery: every,
    yFrom: String(y0), yTo: String(y1), yStep: String(ys), yEvery: blocks(y0, y1, ys) > 10 ? 2 : 1,
  }
}

export function buildHalfLife(s: HalfLifeSettings) {
  const axes = readAxes(s)
  const problems: Record<string, string | null> = { ...axes.problems }
  const { px, box, ...grid } = layoutGrid(s, axes, { edges: true })
  const fs = grid.fs
  const LABEL_FS = fs * 1.05
  const area = grid.grid
  const inBox = (p: Point) => p.x >= box.x0 - 1e-9 && p.x <= box.x1 + 1e-9 && p.y >= box.y0 - 1e-9 && p.y <= box.y1 + 1e-9
  const isotopes = drawnIsotopes(s)
  const withDaughter = daughterShown(s)

  const bounds: Box = { x0: area.x + INSET, y0: area.y + INSET, x1: area.x + area.w - INSET, y1: area.y + area.h - INSET }
  const place = placer(bounds)
  for (const n of grid.numbers) place.box(textBox({ x: n.x, y: n.y, anchor: n.anchor ?? 'middle' }, textWidth(n.text, fs), fs))

  // Each curve from time 0 (decay starts there) to the end of the x-axis,
  // the daughter's after the parents', each in its own ink, dash and marker.
  const from = Math.max(0, box.x0)
  const lines = isotopes.map((iso, k) => ({ index: k, name: shownName(s, iso.slot), half: halfOn(s, iso), share: remaining }))
  if (withDaughter) lines.push({ index: 1, name: shownDaughter(s), half: lines[0].half, share: daughter })
  const curves: Curve[] = lines.map((line) => {
    const color = s.color ? COLORS[INKS[line.index]] : COLORS.black
    const paths: string[] = []
    const points: Point[] = []
    if (s.curve && box.x1 > from) {
      const pts = Array.from({ length: SAMPLES + 1 }, (_, j) => {
        const t = from + ((box.x1 - from) * j) / SAMPLES
        return { x: t, y: valueOf(s, line.share(t, line.half)) }
      })
      for (const run of clipPath(pts, box)) {
        const page = run.map(px)
        paths.push(pathOf(page))
        // Labels keep off the curve as a few longer pieces, so crossing it counts once, not once a pixel.
        place.line(page.filter((_, j) => j === 0 || j === page.length - 1 || j % 8 === 0))
      }
    }
    // A dot at each half-life, for reading off or for students to join, and
    // at the start when it's one curve's alone: several isotopes all start
    // at the top-left corner, and the daughter on the axis.
    // A curve whose half-lives are too close together on this axis has none:
    // they'd pile up along the y-axis.
    if (s.dots && (line.half / axes.x.step) * CELL >= 12) {
      const alone = lines.length === 1
      for (let k = alone ? 0 : 1; k <= MAX_DOTS && k * line.half <= box.x1 + 1e-9; k++) {
        const q = { x: k * line.half, y: valueOf(s, line.share(k * line.half, line.half)) }
        if (!inBox(q)) continue
        const dot = px(q)
        points.push(dot)
        place.box({ x0: dot.x - 6, y0: dot.y - 6, x1: dot.x + 6, y1: dot.y + 6 })
      }
    }
    return { index: line.index, name: line.name, color, dash: DASHES[line.index], marker: MARKERS[line.index], paths, points }
  })

  // Dashed guide lines at the first isotope's half-lives: from 50%, 25%…
  // across from the y-axis to its curve, then down to the time axis.
  const guides: Segment[] = []
  const corners: { at: Point; k: number; t: number }[] = []
  const axisY = grid.xAxis.y
  const axisX = grid.yAxis.x
  const first = isotopes[0]
  const half = halfOn(s, first)
  for (let k = 1; k <= s.guides; k++) {
    const q = { x: k * half, y: valueOf(s, remaining(k * half, half)) }
    if (!inBox(q)) continue
    const p = px(q)
    for (const l of [{ x1: axisX, y1: p.y, x2: p.x, y2: p.y }, { x1: p.x, y1: p.y, x2: p.x, y2: axisY }]) {
      guides.push(l)
      place.line([{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }])
    }
    corners.push({ at: p, k, t: k * half })
  }
  if (s.guides && corners.length < s.guides) {
    problems.guides = corners.length
      ? `Only ${corners.length} of the ${s.guides} guide lines fit on the grid.`
      : 'None of the guide lines fit on the grid.'
  }

  // Each guide line's label: by its foot on the time axis, or beside its
  // corner on the curve where the curve is in the way.
  const guideLabels: Label[] = []
  if (s.guideLabels !== 'none') {
    for (const { at, k, t } of corners) {
      const words = s.guideLabels === 'times' ? timeText(t, s.xUnit) : s.guideLabels === 'halves' ? halvesText(k) : ''
      const w = s.guideLabels === 'blank' ? BLANK_W : textWidth(words, LABEL_FS) * 1.06 + 2
      // Its baseline just high enough to keep its descenders inside the grid.
      const foot = axisY - INSET - LABEL_FS * 0.3 - 1
      const spots: Spot[] = [
        { x: at.x + 9, y: foot, anchor: 'start' },
        { x: at.x - 9, y: foot, anchor: 'end' },
        { x: at.x + 9, y: foot - LABEL_FS * 1.25, anchor: 'start' },
        { x: at.x - 9, y: foot - LABEL_FS * 1.25, anchor: 'end' },
        { x: at.x + 10, y: at.y - LABEL_FS * 0.6, anchor: 'start' },
        ...besidePoint(at, LABEL_FS),
      ]
      const spot = place.place(spots, w, LABEL_FS)
      if (s.guideLabels === 'blank') guideLabels.push({ x: spot.x, y: spot.y, anchor: spot.anchor, blank: { x1: spot.box.x0, y1: spot.y, x2: spot.box.x1, y2: spot.y } })
      else guideLabels.push({ x: spot.x, y: spot.y, anchor: spot.anchor, text: words })
    }
  }

  // Say when the curves don't fit; the Fit button fixes it.
  const off: string[] = []
  const top = valueOf(s, 1)
  if (top > box.y1 * (1 + 1e-9)) off.push(`The curve starts at ${valueText(s, top)}, above the top of the y-axis (${valueText(s, box.y1)}).`)
  if (box.x1 < half * (1 - 1e-9)) off.push(`The x-axis ends at ${fmt(box.x1)}, before ${first.name.toLowerCase()}’s first half-life (${timeText(half, s.xUnit)}).`)
  if (off.length) problems.fit = off.join(' ')

  // The key, when there's more than one line to tell apart.
  let keyEntries: KeyEntry[] = []
  let width = grid.width
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
    labelFs: LABEL_FS,
    curves,
    guides,
    guideLabels,
    keyEntries,
    problems,
    /** the y-axis title this page would write, for the title settings' placeholder */
    yTitle: yTitleFor(s.quantity, s.activityUnit, withDaughter),
  }
}

export type HalfLifeLayout = ReturnType<typeof buildHalfLife>
