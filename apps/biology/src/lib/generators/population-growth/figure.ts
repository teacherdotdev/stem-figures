// Lays out a population growth figure for PopulationFigure.svelte to draw:
// one graph, or two stacked on the same x-axis, each a $shared/graph grid
// with the curves, the carrying capacity, the inflection point and census
// points on it. Above them go the chart title and the growth phases; beside
// them, the census as a table.

import { axisEnd, readAxes, type GridSettings } from '$shared/graph/axes'
import { COLORS } from '$shared/graph/colors'
import { clipPath, layoutGrid, pathOf, round, type GridLayout, type Point } from '$shared/graph/grid'
import { alongCurve, besidePoint, placer, textBox, textWidth, type Anchor, type Box, type Spot } from '$shared/graph/labels'
import {
  census, censusDecimals, checkGrowth, curvesOf, hasK, hasLogistic, inflection, perCapitaAtN, phases, rateAtN, solve,
  type Curve, type Solution,
} from './growth'
import { againstOf, growthOf, viewsOf, type PopulationSettings, type View } from './settings'

const DOT_R = 5.5
const CENSUS_R = 4.5
const BLANK_W = 110 // a write-on line for a label left blank
const PAD = 14
const INSET = 4 // how far inside the grid's border labels stay
/** The exponential curve's dashes when it's drawn with the logistic one. */
export const EXP_DASH = '12 7'

type Segment = { x1: number; y1: number; x2: number; y2: number }
type Mode = PopulationSettings['kLabelMode']
/** A label on the figure: written text, or a write-on line for students. */
export type Label = {
  x: number
  y: number
  anchor: Anchor
  text?: string
  blank?: Segment
  rotate?: boolean
  /** the white behind its letters, so no gridline runs through them */
  box?: Box
}
export type Line = { d: string; color: string; dash?: string }

export type Panel = {
  view: View
  /** where the panel's own SVG sits in the figure */
  at: Point
  layout: GridLayout
  grid: GridSettings
  curves: Line[]
  /** the carrying capacity and dashed guides from marked points to the axes */
  refs: Segment[]
  /** edges between growth phases */
  edges: Segment[]
  dots: Point[]
  points: Point[]
  labels: Label[]
  /** its y-axis title, drawn by the figure (see below) */
  yTitle?: { x: number; y: number; lines: string[]; half: number }
}

const labelText = (mode: Mode, words: string) => (mode === 'text' ? words.trim() : '')

/** The box a tick number takes up (Grid.svelte writes them in bold at `fs`). */
export function numberBox(n: { x: number; y: number; text: string; anchor: 'middle' | 'end' }, fs: number): Box {
  const w = textWidth(n.text, fs)
  const x0 = n.anchor === 'end' ? n.x - w : n.x - w / 2
  return { x0: x0 - 2, y0: n.y - fs * 0.8, x1: x0 + w + 2, y1: n.y + fs * 0.25 }
}

/** A view's value on a curve at time t. */
const valueAt = (view: View, sol: Solution, t: number) => (view === 'size' ? sol.n(t) : view === 'rate' ? sol.rate(t) : sol.perCapita(t))

/** A title's words split into lines of about `width` letters, for the table's headings. */
function wrap(words: string, width: number) {
  const lines: string[] = []
  for (const word of words.split(/\s+/).filter(Boolean)) {
    const last = lines.at(-1)
    if (last !== undefined && (last + ' ' + word).length <= width) lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  return lines.length ? lines : ['']
}

export function buildPopulation(s: PopulationSettings) {
  const g = growthOf(s)
  const views = viewsOf(s)
  const against = againstOf(s)
  const model = s.model
  const growthProblems = checkGrowth(model, g)
  const drawable = Object.keys(growthProblems).length === 0
  const curveKinds = curvesOf(model)
  const sols = drawable ? curveKinds.map((c) => solve(c, g, s.span)) : []

  const xRange = { xFrom: s.xFrom, xTo: s.xTo, xStep: s.xStep }
  const topAxes = readAxes({ ...xRange, yFrom: s.yFrom, yTo: s.yTo, yStep: s.yStep })
  const lowAxes = readAxes({ ...xRange, yFrom: s.y2From, yTo: s.y2To, yStep: s.y2Step })
  const problems: Record<string, string | null> = { ...topAxes.problems, ...growthProblems }
  if (views.length > 1) for (const k of ['From', 'To', 'Step']) problems[`y2${k}`] = lowAxes.problems[`y${k}`]

  const tEnd = Math.min(s.span, against === 'time' ? axisEnd(topAxes.x) : Infinity)
  const ip = drawable && hasLogistic(model) ? inflection(g) : null
  const ph = drawable && hasLogistic(model) && s.curve && s.phases && against === 'time' ? phases(g) : null
  const counted =
    drawable && s.census && against === 'time' ? census(sols[0], s.censusEvery, s.span, s.noise, s.seed) : []

  const titleOf = (view: View) =>
    ({ size: [s.nTitle, s.nTitleMode], rate: [s.rateTitle, s.rateTitleMode], percapita: [s.pcTitle, s.pcTitleMode] })[view] as [string, Mode]
  const [xTitle, xTitleMode] = against === 'time' ? [s.timeTitle, s.timeTitleMode] : titleOf('size')

  // Each graph's grid. Only the bottom one has the x-axis title and letter,
  // and only the top one the y-axis letter.
  type Building = Panel & { px: (v: Point) => Point; box: { x0: number; x1: number; y0: number; y1: number } }
  const panels: Building[] = views.map((view, i) => {
    const last = i === views.length - 1
    const [yTitle, yTitleMode] = titleOf(view)
    const grid: GridSettings = {
      xEvery: s.xEvery, yEvery: i ? s.y2Every : s.yEvery,
      title: '', titleMode: 'none',
      xTitle, xTitleMode: last ? xTitleMode : 'none',
      yTitle, yTitleMode,
      xLabel: s.xLabel, xLabelMode: last ? s.xLabelMode : 'none',
      yLabel: s.yLabel, yLabelMode: i ? 'none' : s.yLabelMode,
      xStartCap: s.xStartCap, xEndCap: s.xEndCap, yStartCap: s.yStartCap, yEndCap: s.yEndCap,
      minor: s.minor, labelSize: s.labelSize,
    }
    const axes = i ? lowAxes : topAxes
    const { px, box, ...layout } = layoutGrid(grid, axes)
    return { view, at: { x: 0, y: 0 }, layout, grid, curves: [], refs: [], edges: [], dots: [], points: [], labels: [], px, box }
  })

  const fs = panels[0].layout.fs
  const LABEL_FS = fs * 1.05
  // The room a label is kept clear in: its letters, and a little to spare
  // for a font a little wider than Arial.
  const widthOf = (mode: Mode, words: string) => (mode === 'blank' ? BLANK_W : textWidth(labelText(mode, words), LABEL_FS) * 1.06 + 2)
  // The white behind a label: its letters' own width.
  const backing = ({ x, y, anchor }: Spot, words: string, rotate = false): Box => {
    const w = textWidth(words, LABEL_FS)
    const from = anchor === 'start' ? 0 : anchor === 'end' ? -w : -w / 2
    if (!rotate) return { x0: x + from - 2, y0: y - LABEL_FS * 0.78, x1: x + from + w + 2, y1: y + LABEL_FS * 0.24 }
    // Turned to read upward, its start is at the bottom.
    return { x0: x - LABEL_FS * 0.78, y0: y - from - w - 2, x1: x + LABEL_FS * 0.24, y1: y - from + 2 }
  }

  for (const p of panels) {
    const { px, box, view, layout } = p
    const grid = layout.grid
    // Labels stay a little inside the grid's border, and off any tick numbers
    // (which are inside the grid where an axis crosses it at 0).
    const bounds: Box = { x0: grid.x + INSET, y0: grid.y + INSET, x1: grid.x + grid.w - INSET, y1: grid.y + grid.h - INSET }
    const place = placer(bounds)
    for (const n of layout.numbers) place.box(numberBox(n, fs))
    const onGrid = (v: Point) => v.x >= box.x0 - 1e-9 && v.x <= box.x1 + 1e-9 && v.y >= box.y0 - 1e-9 && v.y <= box.y1 + 1e-9

    // The curves, cut to the grid, leaving out points too close to see.
    const drawn: { kind: Curve; runs: Point[][] }[] = []
    if (s.curve && drawable) {
      curveKinds.forEach((kind, ci) => {
        const sol = sols[ci]
        let pts: Point[]
        if (against === 'time') {
          pts = Array.from({ length: 601 }, (_, k) => {
            const t = (tEnd * k) / 600
            return { x: t, y: valueAt(view, sol, t) }
          })
        } else if (kind === 'logistic' || kind === 'exponential') {
          // Against N, the growth rates are the equations themselves: from 0 to
          // K for logistic growth (or down from N₀ above K), across the axis for exponential.
          const nEnd = kind === 'logistic' ? Math.min(box.x1, Math.max(g.k, g.n0)) : box.x1
          const n0 = Math.max(0, box.x0)
          pts = Array.from({ length: 401 }, (_, k) => {
            const n = n0 + ((nEnd - n0) * k) / 400
            return { x: n, y: view === 'rate' ? rateAtN(kind, g, n) : perCapitaAtN(kind, g, n) }
          })
        } else {
          // A curve that overshoots doubles back on itself against N, so it's traced through time.
          pts = Array.from({ length: 1201 }, (_, k) => {
            const t = (s.span * k) / 1200
            return { x: sol.n(t), y: valueAt(view, sol, t) }
          })
        }
        const runs = clipPath(pts.filter((v) => Number.isFinite(v.y)), box).map((run) => {
          const on = run.map(px)
          return on.filter((v, k) => k === 0 || k === on.length - 1 || Math.hypot(v.x - on[k - 1].x, v.y - on[k - 1].y) > 0.4)
        })
        const dashed = model === 'both' && kind === 'exponential'
        for (const run of runs) {
          p.curves.push({ d: pathOf(run), color: COLORS[dashed ? s.expColor : s.color], dash: dashed ? EXP_DASH : undefined })
          place.line(run)
        }
        drawn.push({ kind, runs })
      })
    }

    // The carrying capacity: across the graph at K, or up it against N.
    let kLine: Segment | null = null
    if (drawable && hasK(model) && s.kLine) {
      if (against === 'size' && g.k > box.x0 && g.k <= box.x1) {
        const x = px({ x: g.k, y: 0 }).x
        kLine = { x1: x, y1: grid.y + grid.h, x2: x, y2: grid.y }
      } else if (against === 'time' && view === 'size' && g.k > box.y0 && g.k <= box.y1) {
        const y = px({ x: 0, y: g.k }).y
        kLine = { x1: grid.x, y1: y, x2: grid.x + grid.w, y2: y }
      }
    }
    if (kLine) {
      p.refs.push(kLine)
      place.line([{ x: kLine.x1, y: kLine.y1 }, { x: kLine.x2, y: kLine.y2 }])
    }

    // The inflection point, where a logistic curve grows fastest: on the
    // population graph at K/2, and at the growth rate's peak.
    let marked: { at: Point; mode: Mode; words: string } | null = null
    if (drawable && s.curve && s.inflection && hasLogistic(model)) {
      if (view === 'size' && against === 'time' && ip && ip.t <= tEnd) marked = { at: { x: ip.t, y: ip.n }, mode: s.inflLabelMode, words: s.inflLabel }
      if (view === 'rate' && against === 'time' && ip && ip.t <= tEnd) marked = { at: { x: ip.t, y: ip.rate }, mode: s.peakLabelMode, words: s.peakLabel }
      if (view === 'rate' && against === 'size') marked = { at: { x: g.k / 2, y: (g.r * g.k) / 4 }, mode: s.peakLabelMode, words: s.peakLabel }
      if (marked && !onGrid(marked.at)) marked = null
    }
    if (marked) {
      const dot = px(marked.at)
      const xAxisY = px({ x: 0, y: Math.max(0, box.y0) }).y
      const yAxisX = px({ x: Math.max(0, box.x0), y: 0 }).x
      const guides = [
        { x1: dot.x, y1: dot.y, x2: dot.x, y2: xAxisY },
        { x1: dot.x, y1: dot.y, x2: yAxisX, y2: dot.y },
      ]
      p.refs.push(...guides)
      p.dots.push(dot)
      for (const l of guides) place.line([{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }])
      place.box({ x0: dot.x - DOT_R, y0: dot.y - DOT_R, x1: dot.x + DOT_R, y1: dot.y + DOT_R })
    }

    // The edges between growth phases run down every graph against time.
    if (ph) {
      for (const t of [ph.lagEnd, ph.stationary]) {
        if (t === null || t <= box.x0 || t >= Math.min(box.x1, tEnd)) continue
        const x = px({ x: t, y: 0 }).x
        p.edges.push({ x1: x, y1: grid.y, x2: x, y2: grid.y + grid.h })
        place.line([{ x, y: grid.y }, { x, y: grid.y + grid.h }], true)
      }
    }

    // Census points, on the population graph.
    if (view === 'size') {
      for (const c of counted) {
        const at = { x: c.t, y: c.n }
        if (!onGrid(at)) continue
        const v = px(at)
        p.points.push(v)
        place.box({ x0: v.x - CENSUS_R, y0: v.y - CENSUS_R, x1: v.x + CENSUS_R, y1: v.y + CENSUS_R })
      }
    }

    // Labels: the carrying capacity, the marked point, then each curve.
    const label = (spots: Spot[], mode: Mode, words: string) => {
      if (mode === 'none' || (mode === 'text' && !words.trim()) || !spots.length) return
      const spot = place.place(spots, widthOf(mode, words), LABEL_FS)
      if (mode === 'text') p.labels.push({ x: spot.x, y: spot.y, anchor: spot.anchor, text: words.trim(), box: backing(spot, words.trim()) })
      else p.labels.push({ ...spot, blank: { x1: spot.box.x0, y1: spot.y, x2: spot.box.x1, y2: spot.y } })
    }
    if (kLine && kLine.y1 === kLine.y2) {
      // Along the line, above it then below, from the left end (where a
      // growing population is still low) to the right; then a little
      // further off the line, for a curve that swings around K.
      const y = kLine.y1
      const spots = [-11, LABEL_FS + 7, -11 - LABEL_FS, 2 * LABEL_FS + 10].flatMap((dy) => [
        { x: grid.x + 8, y: y + dy, anchor: 'start' as const },
        { x: grid.x + grid.w - 8, y: y + dy, anchor: 'end' as const },
        ...[0.25, 0.375, 0.5, 0.625, 0.75].map((f) => ({ x: grid.x + f * grid.w, y: y + dy, anchor: 'middle' as const })),
      ])
      label(spots, s.kLabelMode, s.kLabel)
    } else if (kLine && s.kLabelMode !== 'none' && (s.kLabelMode === 'blank' || s.kLabel.trim())) {
      // Against N, the label runs up beside the line, reading from the
      // bottom, just under the top of the graph: past K is room a logistic
      // curve never reaches.
      // Hung from the top, or (when a line crosses up there) standing on the
      // bottom. Words that don't fit clear of every line become just "K".
      const top = grid.y + INSET + 2
      const bottom = grid.y + grid.h - INSET - 2
      const sides = [kLine.x1 + 9 + LABEL_FS * 0.78, kLine.x1 - 9 - LABEL_FS * 0.3]
      const spotsFor = (w: number) =>
        [
          ...sides.map((x) => ({ x, y: top, anchor: 'end' as const, from: top })),
          ...sides.map((x) => ({ x, y: bottom, anchor: 'start' as const, from: bottom - w })),
        ].map((o) => ({ ...o, w, box: { x0: o.x - LABEL_FS * 0.78, y0: o.from, x1: o.x + LABEL_FS * 0.3, y1: o.from + w } }))
      let words = s.kLabel.trim()
      let at = place.choose(spotsFor(widthOf(s.kLabelMode, words)), false)
      // (Only lines crossed count here; being near one, as next to K's own, doesn't.)
      if (at.score >= 1 && s.kLabelMode === 'text' && words !== 'K') {
        words = 'K'
        at = place.choose(spotsFor(widthOf('text', words)), false)
      }
      place.keep(at.box)
      p.labels.push(
        s.kLabelMode === 'text'
          ? { x: at.x, y: at.y, anchor: at.anchor, text: words, rotate: true, box: backing(at, words, true) }
          : { x: at.x, y: at.y, anchor: at.anchor, rotate: true, blank: { x1: at.x, y1: at.from, x2: at.x, y2: at.from + at.w } },
      )
    }
    if (marked) label(besidePoint(px(marked.at), LABEL_FS), marked.mode, marked.words)
    if (model === 'both') {
      for (const { kind, runs } of drawn) {
        const longest = runs.reduce<Point[]>((a, b) => (b.length > a.length ? b : a), [])
        const [mode, words] = kind === 'exponential' ? [s.expLabelMode, s.expLabel] : [s.logLabelMode, s.logLabel]
        label(alongCurve(longest, LABEL_FS), mode, words)
      }
    }
  }

  // The figure: the chart title, the phases above the top graph, the graphs
  // lined up on their grids' left edges, and the census table to the right.
  const title = s.titleMode === 'text' ? s.title.trim() : ''
  const titleRow = title || s.titleMode === 'blank' ? fs * 1.6 + 14 : 0

  type BandLabel = Label & { row: number }
  const band: { brackets: Segment[]; labels: BandLabel[]; rows: number } = { brackets: [], labels: [], rows: 0 }
  const top = panels[0]
  if (ph) {
    const end = Math.min(top.box.x1, tEnd)
    const edges = [Math.max(0, top.box.x0), ...[ph.lagEnd, ph.stationary].filter((t): t is number => t !== null && t > top.box.x0 && t < end), end]
    const names: [Mode, string][] = []
    if (ph.lagEnd !== null && ph.lagEnd > top.box.x0) names.push([s.lagLabelMode, s.lagLabel])
    names.push([s.expPhaseLabelMode, s.expPhaseLabel])
    if (ph.stationary < end) names.push([s.statLabelMode, s.statLabel])
    const placed: Box[][] = []
    names.slice(0, edges.length - 1).forEach(([mode, words], i) => {
      const x1 = top.px({ x: edges[i], y: 0 }).x
      const x2 = top.px({ x: edges[i + 1], y: 0 }).x
      band.brackets.push({ x1: x1 + 2, y1: 0, x2: x2 - 2, y2: 0 })
      if (mode === 'none' || (mode === 'text' && !words.trim())) return
      // Centered over its phase, kept on the graph's width, and on a row
      // above when it would run into the phase before.
      const w = mode === 'blank' ? Math.min(BLANK_W, Math.max(40, x2 - x1 - 12)) : widthOf(mode, words)
      const gx = top.layout.grid.x
      const x = Math.min(Math.max((x1 + x2) / 2, gx + w / 2), gx + top.layout.grid.w + 30 - w / 2)
      let row = 0
      const box = (r: number) => ({ ...textBox({ x, y: -r * 100, anchor: 'middle' }, w + 14, LABEL_FS) })
      while (placed[row]?.some((b) => b.x0 < box(row).x1 && box(row).x0 < b.x1)) row++
      ;(placed[row] ??= []).push(box(row))
      band.rows = Math.max(band.rows, row + 1)
      band.labels.push(
        mode === 'text'
          ? { x, y: 0, anchor: 'middle', text: words.trim(), row }
          : { x, y: 0, anchor: 'middle', row, blank: { x1: x - w / 2, y1: 0, x2: x + w / 2, y2: 0 } },
      )
    })
  }
  // The brackets fit in the space above the top grid; their names need rows of their own.
  const ROW = LABEL_FS + 8
  const bandH = band.rows * ROW

  // Each graph's y-axis title is drawn here rather than in its grid, whose
  // SVG would cut off a title longer than the graph is tall. A title much
  // longer than its graph goes on two lines, and the graphs move apart to
  // keep one title off the next.
  const LINE = fs * 1.25
  for (const p of panels) {
    const t = p.layout.labels.find((l) => l.kind === 'side' && l.rotate)
    if (!t) continue
    p.layout = { ...p.layout, labels: p.layout.labels.filter((l) => l !== t) }
    const words = t.text.split(' ')
    let lines = [t.text]
    if (textWidth(t.text, fs * 1.2) > p.layout.grid.h + 24 && words.length > 1) {
      // Split at the space nearest the middle.
      const offMiddle = (k: number) => Math.abs(words.slice(0, k).join(' ').length - t.text.length / 2)
      let best = 1
      for (let k = 2; k < words.length; k++) if (offMiddle(k) < offMiddle(best)) best = k
      lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')]
    }
    p.yTitle = { x: t.x, y: t.y, lines, half: Math.max(...lines.map((l) => textWidth(l, fs * 1.2))) / 2 }
  }
  const extraL = panels.some((p) => (p.yTitle?.lines.length ?? 0) > 1) ? LINE : 0
  const gx = Math.max(...panels.map((p) => p.layout.grid.x)) + extraL
  let y = titleRow + bandH
  let titleBottom = -Infinity
  for (const p of panels) {
    let at = y
    if (p.yTitle) {
      at += Math.max(0, Math.max(titleBottom + 10, 4) - (at + p.yTitle.y - p.yTitle.half))
      titleBottom = at + p.yTitle.y + p.yTitle.half
    }
    p.at = { x: gx - p.layout.grid.x, y: at }
    y = at + p.layout.height
  }
  let width = Math.max(...panels.map((p) => p.at.x + p.layout.width))
  let height = Math.max(y, titleBottom + 4)
  // Two lines sit side by side, the second where a single line would be.
  const yTitles = panels.flatMap(({ at, yTitle: t }) =>
    t ? t.lines.map((text, k) => ({ x: at.x + t.x - (t.lines.length - 1 - k) * LINE, y: at.y + t.y, text })) : [],
  )

  // The phases' brackets sit just above the top grid, their names above them.
  const bracketY = top.at.y + top.layout.grid.y - 7
  const bracketsOut = band.brackets.map((b) => ({ x1: b.x1 + top.at.x, y1: bracketY, x2: b.x2 + top.at.x, y2: bracketY }))
  const bandLabels = band.labels.map((l) => {
    const ly = bracketY - 7 - l.row * ROW
    return { ...l, x: l.x + top.at.x, y: ly, blank: l.blank && { x1: l.blank.x1 + top.at.x, y1: ly, x2: l.blank.x2 + top.at.x, y2: ly } }
  })

  // The census as a table, its headings the axis titles.
  let table: null | {
    x: number; y: number; rowH: number
    columns: { x: number; w: number }[]
    heads: { x: number; lines: string[] }[]
    headH: number
    rows: { x: number; y: number; text: string }[]
    rules: Segment[]
    frame: { x: number; y: number; w: number; h: number }[]
  } = null
  if (s.table && counted.length) {
    const TFS = fs
    const charW = TFS * 0.6
    const rowH = TFS * 1.55
    const decimals = censusDecimals(Math.max(...counted.map((c) => c.n)))
    const tText = counted.map((c) => String(c.t))
    const nText = counted.map((c) => c.n.toFixed(decimals))
    const timeHead = wrap(against === 'time' && s.timeTitleMode === 'text' && s.timeTitle.trim() ? s.timeTitle.trim() : 'Time', 12)
    const nHead = wrap(s.nTitleMode === 'text' && s.nTitle.trim() ? s.nTitle.trim() : 'N', 14)
    const headLines = Math.max(timeHead.length, nHead.length)
    const headH = headLines * TFS * 1.2 + 10
    const colW = (head: string[], vals: string[]) => Math.max(...head.map((l) => l.length), ...vals.map((v) => v.length)) * charW + 18
    const w1 = colW(timeHead, tText)
    const w2 = colW(nHead, nText)
    // As many rows as fit beside the graphs; the rest carry on in more columns.
    const firstGrid = panels[0].at.y + panels[0].layout.grid.y
    const lastP = panels.at(-1)!
    const lastGrid = lastP.at.y + lastP.layout.grid.y + lastP.layout.grid.h
    const fit = Math.max(6, Math.floor((lastGrid - firstGrid - headH) / rowH))
    const groups = Math.ceil(counted.length / fit)
    const perGroup = Math.ceil(counted.length / groups)
    const tx = width + 12
    const columns: { x: number; w: number }[] = []
    const heads: { x: number; lines: string[] }[] = []
    const rows: { x: number; y: number; text: string }[] = []
    const rules: Segment[] = []
    const frame: { x: number; y: number; w: number; h: number }[] = []
    for (let gi = 0; gi < groups; gi++) {
      const x0 = tx + gi * (w1 + w2 + 12)
      const count = Math.min(perGroup, counted.length - gi * perGroup)
      const h = headH + count * rowH
      columns.push({ x: x0, w: w1 }, { x: x0 + w1, w: w2 })
      heads.push({ x: x0 + w1 / 2, lines: timeHead }, { x: x0 + w1 + w2 / 2, lines: nHead })
      frame.push({ x: x0, y: firstGrid, w: w1 + w2, h })
      rules.push({ x1: x0 + w1, y1: firstGrid, x2: x0 + w1, y2: firstGrid + h })
      rules.push({ x1: x0, y1: firstGrid + headH, x2: x0 + w1 + w2, y2: firstGrid + headH })
      for (let k = 0; k < count; k++) {
        const i = gi * perGroup + k
        const ry = firstGrid + headH + k * rowH + rowH * 0.68
        rows.push({ x: x0 + w1 - 9, y: ry, text: tText[i].replace('-', '−') }, { x: x0 + w1 + w2 - 9, y: ry, text: nText[i] })
      }
      height = Math.max(height, firstGrid + h + PAD)
    }
    width = tx + groups * (w1 + w2 + 12) - 12 + PAD
    table = { x: tx, y: firstGrid, rowH, columns, heads, headH, rows, rules, frame }
  }

  return {
    width: round(width),
    height: round(height),
    fs,
    labelFs: LABEL_FS,
    r: DOT_R,
    censusR: CENSUS_R,
    title: title ? { x: gx + panels[0].layout.grid.w / 2, y: PAD + fs * 1.6, text: title } : null,
    titleBlank:
      s.titleMode === 'blank'
        ? { x1: gx + panels[0].layout.grid.w / 2 - 130, y1: PAD + fs * 1.6, x2: gx + panels[0].layout.grid.w / 2 + 130, y2: PAD + fs * 1.6 }
        : null,
    yTitles,
    brackets: bracketsOut,
    bandLabels,
    panels: panels.map(({ px: _px, box: _box, ...p }): Panel => p),
    table,
    problems,
    /** What the curves work out to, for the settings panel. */
    inflection: ip,
    phases: drawable && hasLogistic(model) ? phases(g) : null,
    census: counted,
  }
}

export type PopulationLayout = ReturnType<typeof buildPopulation>
