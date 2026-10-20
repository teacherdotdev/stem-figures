// Lays out a Motion Map for MotionMap.svelte to draw: the Motion Graph's
// motion (../motion-graphs/motion) as a dot every Δt along a number line in
// meters, each dot at positionAt(kΔt), with a velocity arrow above it.
//
// The motion goes one way until it turns back: each run like that is drawn
// on its own line, the next one above the last, so dots never sit on each
// other. Dots at
// one spot (at rest) are drawn as one dot, labeled with its time range, and
// have no arrow. At a segment end a dot takes the later segment's velocity,
// as pieceAt does.
//
// Arrows are on one scale for the whole map, so equal speeds draw equal
// arrows: the fastest is 0.8 of the widest dot spacing, shorter if that would
// take any arrow up to the next dot (slowing down to a stop, where the dots
// close up faster than the velocity falls).

import { LABEL_SCALE } from '$shared/labelSize'
import { labelRuns, type Label } from '$lib/shared/label'
import type { Point, Segment } from '$lib/shared/vector'
import { niceRange, plain } from '../motion-graphs/figure'
import { textWidth } from '../motion-graphs/labels'
import { letterOf, motionOf, numberText, positionAt, segmentLines, velocityAt, type Motion } from '../motion-graphs/motion'
import { stepOf, type MapSettings } from './settings'

/** How long the number line is, from its first number to its last. */
export const LINE = 760
const R_MAX = 6
const R_MIN = 3.5
/** Every arrow's head: smaller than other figures', as a map's arrows are short. */
export const HEAD = 9
/** From a dot's top to the middle of its arrow. */
const ARROW_RISE = 9
/** The fastest arrow, as a share of the widest dot spacing. */
const FILL = 0.8
/** The shortest the fastest arrow gets, as a share of the widest spacing, however close the dots at a stop are. */
const FLOOR = 0.3
/** How far short of the next dot an arrow stops. */
const CLEAR = 3
/** Space kept between labels side by side, and how many levels of them a run has at most. */
const LABEL_PAD = 7
const MAX_LEVELS = 4
const ACC_LENGTH = 36
const RUN_GAP = 20
/** Between the first run and the number line. */
const LINE_GAP = 14
const TICK = 6
const MINOR_TICK = 3.5
/** How far the number line runs past its last number, to its arrowhead. */
const OVERHANG = 22
/** Positions closer than this (in meters) are one spot. */
const SAME = 1e-6
const EPS = 1e-9

const r2 = (n: number) => Math.round(n * 100) / 100
const pt = (x: number, y: number): Point => ({ x: r2(x), y: r2(y) })
const sg = (x1: number, y1: number, x2: number, y2: number): Segment => ({ x1: r2(x1), y1: r2(y1), x2: r2(x2), y2: r2(y2) })
const sign = (v: number) => (Math.abs(v) < EPS ? 0 : Math.sign(v))

/** One sample of the motion: its index, time, position (m) and velocity (m/s). */
export interface Sample {
  k: number
  t: number
  x: number
  v: number
}

/** The motion at t = 0, Δt, 2Δt… up to its end. With no segments, one dot where it starts. */
export function samplesOf(m: Motion, dt: number, start: number): Sample[] {
  if (!m.pieces.length) return [{ k: 0, t: 0, x: start, v: 0 }]
  const n = Math.floor(m.end / dt + EPS)
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = k * dt
    const v = velocityAt(m, t)
    return { k, t, x: positionAt(m, t), v: Math.abs(v) < EPS ? 0 : v }
  })
}

/** Segment ends (times, in s) that fall between dots. */
export function offGrid(m: Motion, dt: number): number[] {
  const ends = [...m.pieces.slice(1).map((p) => p.t0), ...(m.pieces.length ? [m.end] : [])]
  return ends.filter((t) => Math.abs(t / dt - Math.round(t / dt)) > 1e-6)
}

/** A dot on the map: one sample, or several at one spot while at rest. */
export interface Dot {
  /** where it's drawn */
  x: number
  y: number
  /** its position in meters, and the first and last time it's there */
  at: number
  t0: number
  t1: number
  /** its samples' indices */
  k0: number
  k1: number
  /** its velocity, 0 for a dot at rest */
  v: number
  run: number
}

export interface Arrow {
  v: Segment
  /** the dot it's on */
  dot: number
}

/** A label on a dot: a time or a letter, in levels below it, with a leader from a lower level. */
export interface DotLabel {
  x: number
  y: number
  text: string
  leader: Segment | null
}

/** An acceleration mark above a segment's dots: an arrow labeled a, or a = 0. */
export interface AccMark {
  piece: number
  arrow: Segment | null
  label: Label
  labelAt: Point
}

export interface MotionMapLayout {
  width: number
  height: number
  /** pixels per meter, and per m/s for the arrows */
  ppm: number
  arrowScale: number
  r: number
  fs: number
  letterFs: number
  labelSize: number
  motion: Motion
  samples: Sample[]
  dots: Dot[]
  arrows: Arrow[]
  accMarks: AccMark[]
  labels: DotLabel[]
  /** the number line: its line (to the arrowhead), the arrowhead, ticks, numbers, and its title */
  line: Segment
  lineHead: Point[]
  ticks: Segment[]
  numbers: { x: number; y: number; text: string }[]
  lineTitle: { x: number; y: number; text: string }
  origin: Segment | null
  range: { from: number; to: number; step: number }
  displacement: { v: Segment; labelAt: Point } | null
  object: { at: Point; anchor: 'start' | 'end' } | null
  /** segment ends between dots (s), and whether any dots overlap, for the settings panel */
  offGrid: number[]
  overlap: boolean
}

/** A round number line around `lo` to `hi`, in about eight steps. */
export function fitLine(lo: number, hi: number) {
  if (hi - lo < SAME) {
    lo -= 5
    hi += 5
  }
  const step = Number(niceRange(0, hi - lo, 8).step)
  const from = Number(plain(Math.floor(lo / step + 1e-9) * step))
  const to = Number(plain(Math.ceil(hi / step - 1e-9) * step))
  return { from, to, step }
}

/** Unnumbered ticks between the numbered ones: each meter for steps of 2 or 5, two for 10. */
function minorCount(step: number) {
  const lead = Number((step / 10 ** Math.floor(Math.log10(step) + 1e-9)).toPrecision(3))
  return lead === 2 ? 2 : 5
}

/** How wide a label is drawn on the map, roughly, in its serif at `size`. */
export function labelWidth(l: Label, size: number) {
  if (l.mode === 'none') return 0
  if (l.mode === 'blank') return size * 2.4
  return [...labelRuns(l.text).map((r) => r.text).join('')].length * size * 0.5
}

const on = (l: Label) => l.mode === 'blank' || (l.mode === 'text' && !!l.text.trim())

/** The time written under a dot: t = 0 s first, then 1 s, or 4–7 s for a dot at rest. */
function timeText(d: Dot, first: boolean) {
  const span = d.t1 - d.t0 > EPS ? `${plain(d.t0)}–${plain(d.t1)}` : plain(d.t0)
  return `${first ? 't = ' : ''}${span} s`
}

export function buildMap(s: MapSettings): MotionMapLayout {
  const m = motionOf(s.segments, s.start)
  const dt = stepOf(s)
  const scale = LABEL_SCALE[s.labelSize]
  const fs = 14 * scale
  const letterFs = 16 * scale
  const labelSize = 20 * scale
  const samples = samplesOf(m, dt, s.start)

  // The number line, fitted to everywhere the motion goes (and 0, for the origin).
  const reach = [s.start, ...samples.map((p) => p.x), ...m.pieces.flatMap((p) => [p.x0, p.x1]), ...(s.origin ? [0] : [])]
  const range = fitLine(Math.min(...reach), Math.max(...reach))
  const ppm = LINE / (range.to - range.from)
  const px = (x: number) => (x - range.from) * ppm

  // Dots: samples at one spot are one dot, at rest.
  const dots: Dot[] = []
  for (const p of samples) {
    const last = dots.at(-1)
    if (last && Math.abs(p.x - last.at) < SAME) {
      last.t1 = p.t
      last.k1 = p.k
      last.v = 0
    } else {
      dots.push({ x: r2(px(p.x)), y: 0, at: p.x, t0: p.t, t1: p.t, k0: p.k, k1: p.k, v: p.v, run: 0 })
    }
  }

  // Runs: a new one each time the motion turns back.
  let run = 0
  let dir = 0
  for (const d of dots) {
    const sd = sign(d.v)
    if (sd && dir && sd !== dir) run++
    if (sd) dir = sd
    d.run = run
  }
  const runs = run + 1
  const inRun = (i: number) => dots.filter((d) => d.run === i)

  // Spacing within each run, for the dots' size and the arrows' scale.
  const gaps: number[] = []
  for (let i = 1; i < dots.length; i++) if (dots[i].run === dots[i - 1].run) gaps.push(Math.abs(dots[i].x - dots[i - 1].x))
  const r = gaps.length ? Math.min(R_MAX, Math.max(R_MIN, (Math.min(...gaps) - 3) / 2)) : R_MAX
  const widest = gaps.length ? Math.max(...gaps) : 0
  let overlap = false
  for (let i = 0; i < runs && !overlap; i++) {
    const xs = inRun(i).map((d) => d.x).sort((a, b) => a - b)
    overlap = xs.some((x, j) => j > 0 && x - xs[j - 1] < 2 * r + 0.5)
  }

  // One scale for every arrow, stopping each short of the next dot ahead of it.
  const moving = dots.map((d, i) => ({ d, i })).filter(({ d }) => d.v !== 0)
  const vmax = Math.max(0, ...moving.map(({ d }) => Math.abs(d.v)))
  let arrowScale = 0
  if (vmax > 0) {
    const full = widest > 0 ? (FILL * widest) / vmax : 40 / vmax
    let fit = full
    for (const { d } of moving) {
      const ahead = dots.filter((o) => o !== d && o.run === d.run && (o.x - d.x) * Math.sign(d.v) > 0.5).map((o) => Math.abs(o.x - d.x))
      if (!ahead.length) continue
      const room = Math.min(...ahead) - CLEAR
      if (room > 0) fit = Math.min(fit, room / Math.abs(d.v))
    }
    arrowScale = Math.max(fit, widest > 0 ? (FLOOR * widest) / vmax : 0)
  }
  const arrowsOn = !s.dotsOnly

  // Labels on the dots, in each run's own levels.
  const ends = m.pieces.length ? [...m.pieces.map((p) => p.t0), m.end] : []
  const textOf = (d: Dot, i: number): string => {
    if (s.labels === 'times') return timeText(d, i === 0)
    if (s.labels === 'letters') return letterOf(i)
    if (s.labels === 'ends') {
      // A segment end between dots has no dot to go on, so its letter is left off.
      const onGrid = ends
        .map((t, j) => ({ t, j }))
        .filter(({ t }) => t > d.t0 - 1e-6 && t < d.t1 + 1e-6 && Math.abs(t / dt - Math.round(t / dt)) < 1e-6)
      if (!onGrid.length) return ''
      const a = letterOf(onGrid[0].j)
      const b = letterOf(onGrid.at(-1)!.j)
      return a === b ? a : `${a}–${b}`
    }
    return ''
  }
  const labelFs = s.labels === 'times' ? fs : letterFs
  const labelLine = labelFs + 4

  // Each run laid out around its dots at y = 0, then the runs stacked.
  type Rel = { labels: (DotLabel & { level: number })[]; acc: (AccMark & { level: number })[]; top: number; bottom: number }
  const rel: Rel[] = []
  const arrowTop = arrowsOn && vmax > 0 ? -(r + ARROW_RISE + HEAD * 0.42) : -r
  const pieceDots = (j: number) => {
    const p = m.pieces[j]
    return dots.filter((d) => d.t0 < p.t1 - 1e-9 && d.t1 >= p.t0 - 1e-9)
  }
  /** A segment's run: its moving dots' (a stop where it starts is the last run's), else its dot at rest's. */
  const accRun = (j: number) => {
    const own = pieceDots(j)
    return (own.find((d) => d.v !== 0) ?? own[0])?.run ?? -1
  }
  for (let i = 0; i < runs; i++) {
    // Each label goes under its dot if it can, else just to its left or
    // right, else a level lower with a leader up to the dot. A label never
    // covers another labeled dot, so no leader runs through a label.
    const labels: Rel['labels'] = []
    const levels: [number, number][][] = []
    const wanted = inRun(i)
      .map((d) => ({ d, text: textOf(d, dots.indexOf(d)) }))
      .filter((l) => l.text)
      .sort((a, b) => a.d.x - b.d.x)
    // The level each dot's label went to, once placed: a label may cover a dot
    // whose label is no lower than it, but not one whose leader will run past it.
    const placedAt = new Map<Dot, number>()
    for (const { d, text } of wanted) {
      const w = textWidth(text, labelFs)
      const spots = [d.x - w / 2, d.x + 3 - w, d.x - 3].map((x0) => ({ x0, x1: x0 + w }))
      const clear = (b: { x0: number; x1: number }, level: number) =>
        (levels[level] ?? []).every(([a, c]) => b.x1 + LABEL_PAD <= a || b.x0 >= c + LABEL_PAD) &&
        wanted.every(({ d: o }) => o === d || o.x < b.x0 - 3 || o.x > b.x1 + 3 || (placedAt.get(o) ?? Infinity) <= level)
      let level = 0
      let spot = spots.find((b) => clear(b, 0))
      while (!spot && level < MAX_LEVELS - 1) {
        const next = ++level
        spot = spots.find((b) => clear(b, next))
      }
      spot ??= spots[0]
      ;(levels[level] ??= []).push([spot.x0, spot.x1])
      placedAt.set(d, level)
      const y = r + 5 + labelFs * 0.8 + level * labelLine
      labels.push({ x: (spot.x0 + spot.x1) / 2, y, text, level, leader: level ? sg(d.x, r + 2, d.x, y - labelFs * 0.85) : null })
    }

    const acc: Rel['acc'] = []
    if (arrowsOn && s.acceleration) {
      const accLevels: [number, number][][] = []
      m.pieces.forEach((p, j) => {
        if (accRun(j) !== i) return
        const cx = (px(p.x0) + px(p.x1)) / 2
        const a = sign(p.a)
        const label: Label = { mode: 'text', text: a ? 'a' : 'a = 0' }
        const lw = labelWidth(label, labelSize)
        // The a goes behind the arrow's tail.
        const labelX = a ? cx - a * (ACC_LENGTH / 2 + 6 + lw / 2) : cx
        const box = a ? [Math.min(cx - ACC_LENGTH / 2, labelX - lw / 2), Math.max(cx + ACC_LENGTH / 2, labelX + lw / 2)] : [cx - lw / 2, cx + lw / 2]
        const padded: [number, number] = [box[0] - 6, box[1] + 6]
        let level = accLevels.findIndex((l) => l.every(([x0, x1]) => padded[1] <= x0 || padded[0] >= x1))
        if (level < 0) level = accLevels.push([]) - 1
        accLevels[level].push(padded)
        const y = arrowTop - 10 - labelSize * 0.45 - level * (labelSize + 8)
        const arrow = a ? sg(cx - (a * ACC_LENGTH) / 2, y, cx + (a * ACC_LENGTH) / 2, y) : null
        acc.push({ piece: j, arrow, label, labelAt: pt(labelX, y), level })
      })
    }

    const labelBottom = labels.length ? Math.max(...labels.map((l) => l.y + labelFs * 0.3)) : r
    const accTop = acc.length ? Math.min(...acc.map((a) => a.labelAt.y - labelSize * 0.6)) : arrowTop
    rel.push({ labels, acc, top: Math.min(arrowTop, accTop, -r), bottom: Math.max(labelBottom, r) })
  }

  // Runs stacked up from the number line at y = 0.
  const runY: number[] = []
  for (let i = 0; i < runs; i++) {
    const y = i === 0 ? -(rel[0].bottom + LINE_GAP) : Math.min(runY[i - 1] + rel[i - 1].top - RUN_GAP - rel[i].bottom, runY[i - 1] - (4 * r + 8))
    runY.push(y)
  }
  for (const d of dots) d.y = r2(runY[d.run])

  const arrows: Arrow[] = arrowsOn
    ? moving.map(({ d, i }) => {
        const y = d.y - r - ARROW_RISE
        return { v: sg(d.x, y, d.x + d.v * arrowScale, y), dot: i }
      })
    : []
  const labels: DotLabel[] = rel.flatMap((rr, i) =>
    rr.labels.map((l) => ({
      x: r2(l.x),
      y: r2(l.y + runY[i]),
      text: l.text,
      leader: l.leader && sg(l.leader.x1, l.leader.y1 + runY[i], l.leader.x2, l.leader.y2 + runY[i]),
    })),
  )
  const accMarks: AccMark[] = rel.flatMap((rr, i) =>
    rr.acc.map((a) => ({
      piece: a.piece,
      arrow: a.arrow && sg(a.arrow.x1, a.arrow.y1 + runY[i], a.arrow.x2, a.arrow.y2 + runY[i]),
      label: a.label,
      labelAt: pt(a.labelAt.x, a.labelAt.y + runY[i]),
    })),
  )

  // The number line, its ticks and numbers, under everything.
  const x0 = px(range.from)
  const x1 = px(range.to)
  const line = sg(x0, 0, x1 + OVERHANG, 0)
  const lineHead = [pt(x1 + OVERHANG + 2, 0), pt(x1 + OVERHANG - 10, -5), pt(x1 + OVERHANG - 10, 5)]
  const ticks: Segment[] = []
  const numbers: MotionMapLayout['numbers'] = []
  const count = Math.round((range.to - range.from) / range.step)
  if (s.numbers) {
    const minor = minorCount(range.step)
    for (let j = 0; j <= count; j++) {
      const v = range.from + j * range.step
      const x = px(v)
      ticks.push(sg(x, -TICK, x, TICK))
      numbers.push({ x: r2(x), y: r2(TICK + 4 + fs * 0.8), text: numberText(Number(plain(v))) })
      if (j < count && (range.step / minor) * ppm >= 8) {
        for (let q = 1; q < minor; q++) ticks.push(sg(x + (q * range.step * ppm) / minor, -MINOR_TICK, x + (q * range.step * ppm) / minor, MINOR_TICK))
      }
    }
  }
  const origin = s.origin ? sg(px(0), -12, px(0), 12) : null
  if (origin && !s.numbers) numbers.push({ x: r2(px(0)), y: r2(14 + fs * 0.8), text: '0' })
  const lineTitle = { x: r2(x1 + OVERHANG + 8), y: r2(fs * 0.35), text: s.numbers ? 'x (m)' : 'x' }
  const numbersBottom = numbers.length ? numbers[0].y + fs * 0.3 : origin ? 12 : 0

  // The total displacement, under the numbers, from where it starts to where it ends.
  const xStart = m.pieces.length ? m.pieces[0].x0 : s.start
  const xEnd = m.pieces.length ? m.pieces.at(-1)!.x1 : s.start
  let displacement: MotionMapLayout['displacement'] = null
  if (s.displacement && Math.abs(xEnd - xStart) > SAME) {
    const y = numbersBottom + 16
    displacement = { v: sg(px(xStart), y, px(xEnd), y), labelAt: pt((px(xStart) + px(xEnd)) / 2, y + 10 + labelSize * 0.45) }
  }

  // What's moving, beside the first dot, behind the way it goes.
  let object: MotionMapLayout['object'] = null
  if (on(s.object) && dots.length) {
    const first = dots[0]
    const way = sign(dots.find((d) => d.v !== 0)?.v ?? 1) || 1
    object = { at: pt(first.x - way * (r + 8), first.y), anchor: way > 0 ? 'end' : 'start' }
  }

  // Everything's extent, so the drawing starts at (0, 0).
  const xs: number[] = [line.x1, lineHead[0].x, lineTitle.x + textWidth(lineTitle.text, fs)]
  const ys: number[] = [-12, numbersBottom, 12]
  for (const d of dots) xs.push(d.x - r, d.x + r), ys.push(d.y - r, d.y + r)
  for (const a of arrows) xs.push(a.v.x2), ys.push(a.v.y1 - HEAD * 0.42)
  for (const n of numbers) xs.push(n.x - textWidth(n.text, fs) / 2, n.x + textWidth(n.text, fs) / 2)
  for (const l of labels) {
    const w = textWidth(l.text, labelFs) / 2 + 2
    xs.push(l.x - w, l.x + w)
    ys.push(l.y + labelFs * 0.3)
  }
  for (const a of accMarks) {
    const w = labelWidth(a.label, labelSize) / 2
    xs.push(a.labelAt.x - w, a.labelAt.x + w, ...(a.arrow ? [a.arrow.x1, a.arrow.x2] : []))
    ys.push(a.labelAt.y - labelSize * 0.6)
  }
  if (displacement) {
    const w = labelWidth(s.displacementLabel, labelSize) / 2
    xs.push(displacement.v.x1, displacement.v.x2, displacement.labelAt.x - w, displacement.labelAt.x + w)
    ys.push(displacement.v.y1 + HEAD, on(s.displacementLabel) ? displacement.labelAt.y + labelSize * 0.6 : displacement.v.y1 + HEAD)
  }
  if (object) {
    const w = labelWidth(s.object, labelSize)
    xs.push(object.anchor === 'end' ? object.at.x - w : object.at.x + w)
    ys.push(object.at.y - labelSize * 0.6, object.at.y + labelSize * 0.45)
  }
  const left = Math.min(...xs)
  const top = Math.min(...ys)
  const dx = -left
  const dy = -top
  const P = (p: Point) => pt(p.x + dx, p.y + dy)
  const S = (q: Segment) => sg(q.x1 + dx, q.y1 + dy, q.x2 + dx, q.y2 + dy)

  return {
    width: r2(Math.max(...xs) - left),
    height: r2(Math.max(...ys) - top),
    ppm,
    arrowScale,
    r,
    fs,
    letterFs,
    labelSize,
    motion: m,
    samples,
    dots: dots.map((d) => ({ ...d, x: r2(d.x + dx), y: r2(d.y + dy) })),
    arrows: arrows.map((a) => ({ ...a, v: S(a.v) })),
    accMarks: accMarks.map((a) => ({ ...a, arrow: a.arrow && S(a.arrow), labelAt: P(a.labelAt) })),
    labels: labels.map((l) => ({ ...l, x: r2(l.x + dx), y: r2(l.y + dy), leader: l.leader && S(l.leader) })),
    line: S(line),
    lineHead: lineHead.map(P),
    ticks: ticks.map(S),
    numbers: numbers.map((n) => ({ ...n, x: r2(n.x + dx), y: r2(n.y + dy) })),
    lineTitle: { ...lineTitle, x: r2(lineTitle.x + dx), y: r2(lineTitle.y + dy) },
    origin: origin && S(origin),
    range,
    displacement: displacement && { v: S(displacement.v), labelAt: P(displacement.labelAt) },
    object: object && { ...object, at: P(object.at) },
    offGrid: offGrid(m, dt),
    overlap,
  }
}

/** Where position x (m) is drawn across the map, for tests. */
export const xOf = (f: MotionMapLayout, x: number) => f.line.x1 + (x - f.range.from) * f.ppm

/** The answer key: what each segment does, then the total displacement and the distance traveled. */
export function mapAnswer(s: Pick<MapSettings, 'segments' | 'start'>): string[] {
  const m = motionOf(s.segments, s.start)
  if (!m.pieces.length) return []
  const displacement = m.pieces.at(-1)!.x1 - m.pieces[0].x0
  const distance = m.pieces.reduce((sum, p) => sum + Math.abs(p.x1 - p.x0), 0)
  return [...segmentLines(m), `Total displacement: ${numberText(displacement)} m`, `Distance traveled: ${numberText(distance)} m`]
}
