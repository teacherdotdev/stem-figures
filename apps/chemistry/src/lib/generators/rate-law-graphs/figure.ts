// Lays out rate law graphs for RateLawFigure.svelte to draw: [A], ln[A] and
// 1/[A] against time, each on its own $shared/graph grid, all three side by
// side on the same time axis (so the straight one is found at a glance) or
// one alone. On each: the model's curve, the data points, and on the [A]
// graph dashed guide lines at the half-lives, labeled where they touch
// nothing ($shared/graph/labels), as Half-Life Graph's are. Under the graphs,
// the data as a table. The axes are always fitted to the reaction, so
// nothing is cut off. The figure never says the order; the answer key does.

import type { Axes, GridSettings } from '$shared/graph/axes'
import { COLORS } from '$shared/graph/colors'
import { CELL, clipPath, layoutGrid, pathOf, round, type GridLayout, type Gridlines, type Point } from '$shared/graph/grid'
import { besidePoint, placer, textBox, textWidth, type Anchor, type Box, type Spot } from '$shared/graph/labels'
import { fmt } from '$shared/graph/numbering'
import { LABEL_SCALE } from '$shared/labelSize'
import { concentrationOf } from '$lib/shared/concentration'
import {
  INVERSE_UNITS, STRAIGHT, concentration, dataPoints, dataTimes, endTime, firstHalfLife, halfLifeTimes, kUnit, lnText, plotted, sig, sigText,
  straightness, timeAtShare, type DataPoint, type Order, type Plot,
} from './kinetics'
import { axisTitles, orderOf, plotsOf, quantityOf, speciesOf, type RateLawSettings } from './settings'

const SAMPLES = 400
const PAD = 14 // the figure's margin, as the grid's
const INSET = 4 // how far inside the grid's border labels stay
const BLANK_W = 60 // a write-on line for a label left blank
/** How many squares each graph is fitted to: three in a row are 6 each way, one alone about 10 by 8. */
const ROW = { wide: 6, tall: 6 }
const ALONE = { wide: 10, tall: 8 }
/** How far [A] has fallen by the end of the time axis: to a tenth, over three half-lives for every order. */
const SHARE_LEFT = 0.1

type Segment = { x1: number; y1: number; x2: number; y2: number }

/** A label on the figure: written text, or a write-on line for students. */
export type Label = { x: number; y: number; anchor: Anchor; text?: string; blank?: Segment }

/** One graph: its grid, and what's drawn on it. */
export type Panel = {
  plot: Plot
  /** where its grid's drawing goes in the figure */
  at: Point
  layout: GridLayout
  grid: GridSettings
  gridlines: Gridlines
  /** what it shows, for screen readers */
  label: string
  paths: string[]
  points: Point[]
  guides: Segment[]
  guideLabels: Label[]
}

/** An axis range: from `start`, counting by `step`, for `blocks` squares. */
export type Range = { start: number; step: number; blocks: number }

/** Steps an axis counts by: 1, 2, 2.5 and 5 times a power of ten. */
const STEPS = [1, 2, 2.5, 5]
const plain = (v: number) => Number(v.toPrecision(10))
const rangeEnd = (r: Range) => plain(r.start + r.blocks * r.step)

/**
 * A round range covering low..high in close to `target` squares, starting
 * at a round number at or below `low` (as Motion Graphs fits its axes).
 */
export function fitNear(low: number, high: number, target: number): Range {
  const span = Math.max(high - low, Math.abs(high) * 1e-6, 1e-12)
  const base = 10 ** Math.floor(Math.log10(span / target))
  let best: Range & { miss: number } = { start: low, step: span, blocks: 1, miss: Infinity }
  for (const power of [base / 10, base, base * 10]) {
    for (const m of STEPS) {
      const step = plain(m * power)
      const start = Math.floor(low / step + 1e-9) * step
      const blocks = Math.max(1, Math.ceil((high - start) / step - 1e-9))
      const miss = Math.abs(blocks - target)
      // Of two as close, the one in fewer squares.
      if (miss < best.miss || (miss === best.miss && blocks < best.blocks)) best = { start: plain(start), step, blocks, miss }
    }
  }
  return { start: best.start, step: best.step, blocks: best.blocks }
}

/**
 * A round range covering low..high in exactly `blocks` squares, with the
 * smallest step that does, so graphs side by side are all the same height.
 * It starts at a round number at or below `low`, or (`from` 'high') ends at
 * one at or above `high`, for a line that starts at the top.
 */
export function fitExact(low: number, high: number, blocks: number, from: 'low' | 'high' = 'low'): Range {
  const span = Math.max(high - low, Math.abs(high) * 1e-6, 1e-12)
  for (let power = Math.floor(Math.log10(span / blocks)) - 1; ; power++) {
    for (const m of STEPS) {
      const step = plain(m * 10 ** power)
      const start = from === 'low' ? Math.floor(low / step + 1e-9) * step : (Math.ceil(high / step - 1e-9) - blocks) * step
      if (start <= low + step * 1e-9 && start + blocks * step >= high - step * 1e-9) return { start: plain(start), step, blocks }
    }
  }
}

/** Every nth line numbered along the time axis, so the numbers never run together. */
function everyAlong(r: Range, fs: number) {
  const widest = Math.max(...Array.from({ length: r.blocks + 1 }, (_, i) => textWidth(fmt(plain(r.start + i * r.step)), fs)))
  return [1, 2, 5, 10].find((n) => n * CELL >= widest + fs * 1.15 && r.blocks / n <= 10) ?? 10
}

/** "1.21 × 10⁻⁴", or "0.0866" from 0.001 up to 10,000: to three significant figures (as Half-Life Graph writes its constants). */
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

/** A time as written by a guide line and in the answer key: "34.7 s". */
export const timeText = (s: Pick<RateLawSettings, 'timeUnit'>, t: number) => `${sciText(t)} ${s.timeUnit}`

/** "1 half-life", "2 half-lives": how many half-lives have passed at the nth guide line, true for every order. */
export const halvesText = (n: number) => `${n} half-li${n === 1 ? 'fe' : 'ves'}`

/** A list in words: "a", "a and b", "a, b and c". */
const listed = (words: string[]) => (words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : words[0])

/**
 * What the figure shows, for screen readers: never the order. A typed chart
 * title comes first, and the data table, when there is one, is read out row
 * by row, as it can't be read from the picture.
 */
export function labelOf(s: RateLawSettings) {
  const plots = plotsOf(s)
  const graphs = `Graph${plots.length > 1 ? 's' : ''} of ${listed(plots.map((p) => quantityOf(s, p)))} against time`
  const title = s.titleMode === 'text' ? s.title.trim() : ''
  const parts = [title ? `${title}: ${graphs.replace(/^G/, 'g')}` : graphs]
  const data = s.table === 'none' ? [] : dataOf(s)
  if (data.length) {
    const rows = tableRows(s, data, s.table === 'all' ? 'all' : 'conc').map((r) => `${r.head}: ${r.cells.join(', ')}`)
    parts.push(`Data table. ${rows.join('. ')}`)
  }
  return parts.join('. ')
}

/** The time axis: from 0 to when [A] has fallen to a tenth, rounded up to a round step. */
export function timeAxis(s: RateLawSettings): Range {
  const tenth = timeAtShare(orderOf(s), s.a0, s.k, SHARE_LEFT)
  return plotsOf(s).length > 1 ? fitFrom0(tenth, ROW.wide - 1, ROW.wide + 2, ROW.wide) : fitNear(0, tenth, ALONE.wide)
}

/**
 * A round range from 0 covering `high` in `fewest` to `most` squares, the one
 * ending nearest `high` (of two as near, the one nearer `target` squares), so
 * graphs in a row stay about square and their curves fill them: 767 s is 8
 * squares of 100, not 4 of 200.
 */
export function fitFrom0(high: number, fewest: number, most: number, target: number): Range {
  const base = 10 ** Math.floor(Math.log10(high / target))
  let best: Range | null = null
  for (const power of [base / 10, base, base * 10]) {
    for (const m of STEPS) {
      const step = plain(m * power)
      const blocks = Math.max(1, Math.ceil(high / step - 1e-9))
      if (blocks < fewest || blocks > most) continue
      const end = blocks * step
      const bestEnd = best ? best.blocks * best.step : Infinity
      if (end < bestEnd - 1e-9 * end || (Math.abs(end - bestEnd) <= 1e-9 * end && Math.abs(blocks - target) < Math.abs(best!.blocks - target)))
        best = { start: 0, step, blocks }
    }
  }
  return best ?? fitNear(0, high, target)
}

/**
 * The data points: `count` of them from 0 to the end of the time axis,
 * scattered from the seed. A zero-order reaction's stop when a tenth of [A]₀
 * is left, where its ln[A] and 1/[A] axes are fitted to, so no point runs
 * them off to near infinity or reads [A] = 0.
 */
export function dataOf(s: RateLawSettings): DataPoint[] {
  const order = orderOf(s)
  const axisEnd = rangeEnd(timeAxis(s))
  const until = order === 0 ? Math.min(axisEnd, timeAtShare(order, s.a0, s.k, SHARE_LEFT)) : axisEnd
  return dataPoints(order, s.a0, s.k, dataTimes(until, s.count), Number(s.noise), s.seed)
}

/** Longest a time axis number may be before the page suggests another unit or k: "0.0025", "100000". */
const LONGEST_TIME = 6

/** Why the time axis is hard to read: its numbers are long strings of zeros, with what to change. */
export function timeProblem(s: RateLawSettings): string | null {
  const r = timeAxis(s)
  const texts = Array.from({ length: r.blocks + 1 }, (_, i) => fmt(plain(r.start + i * r.step)))
  if (Math.max(...texts.map((t) => t.length)) <= LONGEST_TIME) return null
  const long = rangeEnd(r) >= 1
  const unit = long ? s.timeUnit !== 'h' : s.timeUnit !== 's'
  const fix = long ? (unit ? 'a longer time unit, or a larger k' : 'a larger k') : unit ? 'a shorter time unit, or a smaller k' : 'a smaller k'
  return `The times along the axis are long numbers (up to ${texts.at(-1)} ${s.timeUnit}). For tidier numbers, choose ${fix}.`
}

/** Whether the data are on the figure at all: as points or in the table. */
const dataShown = (s: RateLawSettings) => s.points || s.table !== 'none'

/** Why the data may mislead: scatter that makes another graph's points straighter than the right one's. */
export function scatterProblem(s: RateLawSettings, data: DataPoint[]): string | null {
  if (!dataShown(s) || s.noise === '0') return null
  const r2 = straightness(data)
  const right = STRAIGHT[orderOf(s)]
  const mine = r2[right]
  if (mine === null) return null
  const better = (['conc', 'ln', 'inv'] as const).filter((p) => p !== right && r2[p] !== null && r2[p]! > mine)
  if (!better.length) return null
  return `With this scatter the ${quantityOf(s, better[0])} points lie closer to a straight line than the ${quantityOf(s, right)} points, so the data point to the wrong order. Press New data, or lower the scatter.`
}

/**
 * The answer key: the order and rate law, the integrated law, k, which
 * graph is straight with its slope and intercept, the half-life and what's
 * left at each guide line, and, with data, how straight each graph's points
 * are (r²) and how much they were scattered.
 */
export function answerLines(s: RateLawSettings): string[] {
  const order = orderOf(s)
  const q = concentrationOf(speciesOf(s))
  const unit = kUnit(order, s.concUnit, s.timeUnit)
  const k = sciText(s.k)
  const law = [`Zero order: rate = k`, `First order: rate = k${q}`, `Second order: rate = k${q}²`][order]
  const integrated = [`${q} = ${q}₀ − kt`, `ln${q} = ln${q}₀ − kt`, `1/${q} = 1/${q}₀ + kt`][order]
  const intercept = [
    `${q}₀ = ${sigText(s.a0)} ${s.concUnit}`,
    `ln${q}₀ = ${lnText(Math.log(s.a0))}`,
    `1/${q}₀ = ${sigText(1 / s.a0)} ${INVERSE_UNITS[s.concUnit]}`,
  ][order]
  const slope = order === 2 ? `k = ${k} ${unit}` : `−k = −${k} ${unit}`
  const half = timeText(s, firstHalfLife(order, s.a0, s.k))
  const out = [
    law,
    `Integrated rate law: ${integrated}`,
    `k = ${k} ${unit}`,
    `Straight graph: ${quantityOf(s, STRAIGHT[order])} against time, slope ${slope}, y-intercept ${intercept}`,
    [`First half-life: ${half} (each one half as long as the last)`, `Half-life: ${half} (the same every time)`, `First half-life: ${half} (each one twice as long as the last)`][order],
  ]
  halfLifeTimes(order, s.a0, s.k, s.guides).forEach((t, i) => {
    out.push(`After ${halvesText(i + 1)} (${timeText(s, t)}): ${sigText(s.a0 * 0.5 ** (i + 1))} ${s.concUnit}`)
  })
  if (dataShown(s)) {
    const r2 = straightness(dataOf(s))
    const parts = (['conc', 'ln', 'inv'] as const).filter((p) => r2[p] !== null).map((p) => `${quantityOf(s, p)} ${r2[p]!.toFixed(4)}`)
    if (parts.length) out.push(`r² of the data against time: ${parts.join(', ')}`)
    if (s.noise !== '0') out.push(`Each ${q} in the data is scattered by about ${s.noise}%`)
  }
  return out
}

/** The data as tab-separated text, a row each for time, [A], ln[A] and 1/[A], for a teacher's own table. */
export function dataText(s: RateLawSettings) {
  return tableRows(s, dataOf(s), 'all').map((r) => [r.head, ...r.cells].join('\t')).join('\n')
}

/** The table's rows: time across the top, then [A], and ln[A] and 1/[A] if wanted, their headings the axis titles. */
function tableRows(s: RateLawSettings, data: DataPoint[], rows: 'conc' | 'all') {
  const titles = axisTitles(s)
  const cell = (v: number | null, text = sigText) => (v === null ? '–' : text(v))
  const out = [
    { head: titles.time, cells: data.map((p) => fmt(p.t)) },
    { head: titles.conc, cells: data.map((p) => cell(p.conc)) },
  ]
  if (rows === 'all') out.push({ head: titles.ln, cells: data.map((p) => cell(p.ln, lnText)) }, { head: titles.inv, cells: data.map((p) => cell(p.inv)) })
  return out
}

export function buildRateLaw(s: RateLawSettings) {
  const order: Order = orderOf(s)
  const { a0, k } = s
  const plots = plotsOf(s)
  const row = plots.length > 1
  const fs = 14 * LABEL_SCALE[s.labelSize]
  const LABEL_FS = fs * 1.05
  const titles = axisTitles(s)
  const problems: Record<string, string | null> = {}

  // The time axis, shared by every graph, and the data along it.
  const time = timeAxis(s)
  const until = rangeEnd(time)
  const end = endTime(order, a0, k)
  const drawTo = Math.min(until, end)
  const data = dataOf(s)
  problems.scatter = scatterProblem(s, data)
  problems.time = timeProblem(s)

  // Each graph's y-axis, fitted to its curve and its data. A zero-order
  // reaction's ln[A] and 1/[A] run off to infinity as it ends, so they are
  // fitted down to a tenth of [A]₀ and leave the grid after that.
  const fitTo = order === 0 ? Math.min(drawTo, timeAtShare(order, a0, k, SHARE_LEFT)) : until
  const yRange = (plot: Plot): Range => {
    const values = [a0, concentration(order, a0, k, fitTo)].map((a) => plotted(plot, a)!)
    if (dataShown(s)) for (const p of data) if (p[plot] !== null) values.push(p[plot]!)
    const high = Math.max(...values)
    // [A] and 1/[A] count up from 0; ln[A] has no 0 to start from.
    const low = plot === 'ln' ? Math.min(...values) : 0
    return row ? fitExact(low, high, ROW.tall, plot === 'ln' ? 'high' : 'low') : fitNear(low, high, ALONE.tall)
  }

  const ink = s.color ? COLORS.blue : COLORS.black
  // Without gridlines, arrows show which way each axis runs.
  const cap = s.gridlines ? 'none' : 'triangle'
  const halves = halfLifeTimes(order, a0, k, s.guides)

  const panels: Panel[] = plots.map((plot) => {
    const y = yRange(plot)
    const axes: Axes = {
      x: { ...time, numbering: 'decimal' },
      y: { ...y, numbering: 'decimal' },
    }
    const grid: GridSettings = {
      xEvery: s.numbers ? everyAlong(time, fs) : 0,
      yEvery: s.numbers ? (y.blocks > 10 ? 2 : 1) : 0,
      title: '', titleMode: 'none',
      xTitle: titles.time, xTitleMode: s.timeTitleMode,
      yTitle: titles[plot], yTitleMode: s[`${plot}TitleMode`],
      xLabel: '', xLabelMode: 'none', yLabel: '', yLabelMode: 'none',
      xStartCap: 'none', xEndCap: cap, yStartCap: 'none', yEndCap: cap,
      minor: 0, labelSize: s.labelSize,
    }
    // ln[A] is negative below 1 M: its axes stay along the left and bottom edges.
    const { px, box, ...laid } = layoutGrid(grid, axes, { edges: true })
    // With neither gridlines nor numbers, the ticks go too: a sketch graph is just its axes.
    const layout: GridLayout = s.gridlines || s.numbers ? laid : { ...laid, vLines: [], hLines: [] }
    const area = layout.grid
    const inBox = (p: Point) => p.x >= box.x0 - 1e-9 && p.x <= box.x1 + 1e-9 && p.y >= box.y0 - Math.abs(y.step) * 1e-6 && p.y <= box.y1 + Math.abs(y.step) * 1e-6

    const place = placer({ x0: area.x + INSET, y0: area.y + INSET, x1: area.x + area.w - INSET, y1: area.y + area.h - INSET })
    for (const n of layout.numbers) place.box(textBox({ x: n.x, y: n.y, anchor: n.anchor ?? 'middle' }, textWidth(n.text, fs), fs))

    // The model's curve, from time 0 to the end of the axis or of the reaction.
    const paths: string[] = []
    if (s.curve) {
      const pts: Point[] = []
      for (let j = 0; j <= SAMPLES; j++) {
        const t = (drawTo * j) / SAMPLES
        const v = plotted(plot, concentration(order, a0, k, t))
        if (v !== null && Number.isFinite(v)) pts.push({ x: t, y: v })
      }
      for (const run of clipPath(pts, box)) {
        const page = run.map(px)
        paths.push(pathOf(page))
        // Labels keep off the curve as a few longer pieces, so crossing it counts once, not once a pixel.
        place.line(page.filter((_, j) => j === 0 || j === page.length - 1 || j % 8 === 0))
      }
    }

    // The data points, as a student would plot them from the table.
    const points: Point[] = []
    if (s.points) {
      for (const p of data) {
        const v = p[plot]
        if (v === null || !inBox({ x: p.t, y: v })) continue
        const dot = px({ x: p.t, y: v })
        points.push({ x: round(dot.x), y: round(dot.y) })
        place.box({ x0: dot.x - 6, y0: dot.y - 6, x1: dot.x + 6, y1: dot.y + 6 })
      }
    }

    // Dashed guide lines at the half-lives, on the [A] graph: from [A]₀/2,
    // [A]₀/4… across from the y-axis to the curve, then down to the time axis.
    const guides: Segment[] = []
    const guideLabels: Label[] = []
    if (plot === 'conc') {
      const corners: { at: Point; n: number; t: number }[] = []
      const axisY = layout.xAxis.y
      const axisX = layout.yAxis.x
      halves.forEach((t, i) => {
        const q = { x: t, y: a0 * 0.5 ** (i + 1) }
        if (!inBox(q)) return
        const p = px(q)
        for (const l of [{ x1: axisX, y1: p.y, x2: p.x, y2: p.y }, { x1: p.x, y1: p.y, x2: p.x, y2: axisY }]) {
          guides.push({ x1: round(l.x1), y1: round(l.y1), x2: round(l.x2), y2: round(l.y2) })
          place.line([{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }])
        }
        corners.push({ at: p, n: i + 1, t })
      })
      if (corners.length < halves.length) {
        problems.guides = corners.length
          ? `Only ${corners.length} of the ${halves.length} guide lines fit on the grid.`
          : 'None of the guide lines fit on the grid.'
      }
      // Each guide line's label: by its foot on the time axis, or beside its
      // corner on the curve where something is in the way.
      if (s.guideLabels !== 'none') {
        let crowded = false
        for (const { at, n, t } of corners) {
          const words = s.guideLabels === 'times' ? timeText(s, t) : s.guideLabels === 'halves' ? halvesText(n) : ''
          const w = s.guideLabels === 'blank' ? BLANK_W : textWidth(words, LABEL_FS) * 1.06 + 2
          // Its baseline just high enough to keep its descenders inside the grid,
          // or a row or two higher, beside its line while still under the corner.
          const foot = axisY - INSET - LABEL_FS * 0.3 - 1
          const beside: Spot[] = [0, 1, 2]
            .map((row) => foot - row * LABEL_FS * 1.25)
            .filter((y, row) => row === 0 || y - LABEL_FS * 0.78 > at.y + 4)
            // Snug against its line, too, for a label that only just fits before the grid's edge.
            .flatMap((y): Spot[] => [{ x: at.x + 9, y, anchor: 'start' }, { x: at.x + 5, y, anchor: 'start' }, { x: at.x - 9, y, anchor: 'end' }])
          const spots: Spot[] = [...beside, { x: at.x + 10, y: at.y - LABEL_FS * 0.6, anchor: 'start' }, ...besidePoint(at, LABEL_FS)]
          // The first spot that touches least, a spot left of its line counting as
          // a near miss, so a label doesn't sit between two lines when it can
          // sit right of its own (as the others do) just shy of the curve.
          const scored = spots.map((p) => {
            const option = place.choose([{ ...p, box: textBox(p, w, LABEL_FS) }], false)
            return { ...option, score: option.score + (p.anchor === 'end' ? 1 : 0) }
          })
          const spot = scored.reduce((best, o) => (o.score < best.score ? o : best))
          place.keep(spot.box)
          // Touching a line or another label: there isn't room for them all.
          if (spot.score >= 10) crowded = true
          if (s.guideLabels === 'blank') guideLabels.push({ x: spot.x, y: spot.y, anchor: spot.anchor, blank: { x1: spot.box.x0, y1: spot.y, x2: spot.box.x1, y2: spot.y } })
          else guideLabels.push({ x: round(spot.x), y: round(spot.y), anchor: spot.anchor, text: words })
        }
        if (crowded) {
          problems.labels = `There isn’t room for every guide line’s label on ${row ? 'a graph this small' : 'this graph'}, so some touch a line or each other. ${
            row ? `Show the ${quantityOf(s, 'conc')} graph alone, or use` : 'Use'
          } fewer guide lines or smaller labels.`
        }
      }
    }

    const gridlines: Gridlines = s.gridlines ? 'standard' : 'none'
    return { plot, at: { x: 0, y: 0 }, layout, grid, gridlines, label: `${quantityOf(s, plot)} against time`, paths, points, guides, guideLabels }
  })

  // The figure: the chart title on top, the graphs in a row, the table under them.
  const titleRow = s.titleMode === 'none' || (s.titleMode === 'text' && !s.title.trim()) ? 0 : fs * 1.6 + 20
  let across = 0
  for (const p of panels) {
    p.at = { x: across, y: titleRow }
    across += p.layout.width
  }
  const panelsW = across
  let height = titleRow + Math.max(...panels.map((p) => p.layout.height))

  let table: null | {
    x: number; y: number; w: number; h: number; headW: number; cellW: number; rowH: number
    rows: { head: string; cells: string[] }[]
  } = null
  if (s.table !== 'none' && data.length) {
    const rows = tableRows(s, data, s.table)
    const headW = Math.max(...rows.map((r) => textWidth(r.head, fs))) + 22
    const cellW = Math.max(fs * 3, ...rows.flatMap((r) => r.cells.map((c) => textWidth(c, fs)))) + 16
    const rowH = fs * 1.9
    table = { x: 0, y: height + 2, w: headW + data.length * cellW, h: rows.length * rowH, headW, cellW, rowH, rows }
    height = table.y + table.h + PAD
  }

  // Whichever is narrower, the graphs or the table, is centered on the other.
  const width = Math.max(panelsW, table ? table.w + 2 * PAD : 0)
  const shift = (width - panelsW) / 2
  for (const p of panels) p.at.x = round(p.at.x + shift)
  if (table) table.x = round((width - table.w) / 2)

  const first = panels[0]
  const last = panels.at(-1)!
  const midX = (first.at.x + first.layout.grid.x + last.at.x + last.layout.grid.x + last.layout.grid.w) / 2
  const titleY = PAD + fs * 1.6

  return {
    width: round(width),
    height: round(height),
    fs,
    labelFs: LABEL_FS,
    ink,
    panels,
    table,
    chartTitle: s.titleMode === 'text' && s.title.trim() ? { x: round(midX), y: titleY, text: s.title.trim() } : null,
    chartBlank: s.titleMode === 'blank' ? { x1: midX - 130, y1: titleY, x2: midX + 130, y2: titleY } : null,
    /** the data, whether or not it's drawn */
    data,
    problems,
  }
}

export type RateLawLayout = ReturnType<typeof buildRateLaw>
