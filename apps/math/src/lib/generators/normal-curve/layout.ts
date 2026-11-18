// Lays out a normal curve as plain numbers for NormalCurve.svelte to draw:
// the horizontal axis with a tick at each SD from the mean and the rows of
// numbers under it, the bell curve, the SD lines up to it, the shaded regions
// under it with their areas, the section percents, the marked values, an
// optional density axis and the titles.
//
// Everything is placed with the axis along y = 0 and the curve above it
// (negative y), then the whole figure is measured and moved into its box.
// A shaded region is filled along the same sampled points the curve is drawn
// through, so the shading always meets the curve exactly.

import { LABEL_SCALE } from '$shared/labelSize'
import { textWidth } from '$shared/graph/labels'
import { fmt } from '$shared/graph/numbering'
import { niceRange } from '$lib/stats/data'
import { fillOf, type Fill } from '$lib/stats/fills'
import { Phi, PhiInverse } from '$lib/stats/normal'
import { areaText, percentileText, readCurve, rounded, sectionPercent, type Numbers, type ReadCurve, type Settings } from './settings'

const BASE_FS = 14 // the numbers' size, at medium labels
const WIDTH = 560 // the axis
const HEIGHT = 210 // the curve's peak above the axis
const SAMPLES = 280 // points the curve is drawn through
const TICK = 7
const PAD = 12
const ROW = 1.35 // rows of numbers under the axis, in font sizes

export type Text = { x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end'; italic?: boolean; size?: number; bold?: boolean }
export type Blank = { x1: number; x2: number; y: number }
export type Line = { x1: number; y1: number; x2: number; y2: number }
export type Box = { x0: number; y0: number; x1: number; y1: number }

const r2 = (v: number) => Math.round(v * 100) / 100
const overlaps = (a: Box, b: Box, gap = 3) => a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.y0 < b.y1 + gap && b.y0 < a.y1 + gap

/** The number written for a value: to 10 significant figures, so 0.1 + 0.2 reads 0.3. */
const nice = (v: number) => fmt(Number(v.toPrecision(10)))

/** μ, μ + σ, μ − 2σ… */
function symbol(k: number): string {
  if (k === 0) return 'μ'
  const n = Math.abs(k) === 1 ? '' : String(Math.abs(k))
  return `μ ${k < 0 ? '−' : '+'} ${n}σ`
}

export function buildCurve(s: Settings) {
  const read: ReadCurve = readCurve(s)
  const fs = BASE_FS * LABEL_SCALE[s.labelSize]
  const blankW = 2.8 * fs

  // How far the axis reaches either side of the mean, in SDs: past the last SD tick and anything typed.
  const furthest = Math.max(
    s.reach,
    ...read.regions.flatMap((r) => r.bounds.map(Math.abs)),
    ...read.marks.map((m) => Math.abs(m.z)),
    ...read.ticks.map(Math.abs),
  )
  const span = Math.ceil(furthest * 2) / 2 + 0.5
  const px = (z: number) => r2(((Math.max(-span, Math.min(span, z)) + span) / (2 * span)) * WIDTH)
  const height = (z: number) => HEIGHT * Math.exp(-(z * z) / 2)
  const py = (z: number) => r2(-height(z))
  const step = (2 * span) / SAMPLES
  const grid = Array.from({ length: SAMPLES + 1 }, (_, k) => -span + k * step)
  const curve = grid.map((z) => ({ x: px(z), y: py(z) }))
  const curvePath = curve.map((p, k) => `${k ? 'L' : 'M'}${p.x},${p.y}`).join('')

  /** A region under the curve from a to b (z), down to the axis. */
  const under = (a: number, b: number) => {
    const lo = Math.max(a, -span)
    const hi = Math.min(b, span)
    const pts = [lo, ...grid.filter((z) => z > lo + 1e-9 && z < hi - 1e-9), hi].map((z) => `${px(z)},${py(z)}`)
    return `M${px(lo)},0L${pts.join('L')}L${px(hi)},0Z`
  }

  const boxes: Box[] = [{ x0: 0, y0: -HEIGHT, x1: WIDTH, y1: TICK }] // everything drawn, to size the figure
  const taken: Box[] = [] // labels over the curve, which later ones keep clear of
  const texts: Text[] = []
  const blanks: Blank[] = []
  const textBox = (t: Text): Box => {
    const w = textWidth(t.text, t.size ?? fs)
    const x0 = t.anchor === 'start' ? t.x : t.anchor === 'end' ? t.x - w : t.x - w / 2
    return { x0, y0: t.y - 0.78 * (t.size ?? fs), x1: x0 + w, y1: t.y + 0.22 * (t.size ?? fs) }
  }
  /** The curve's highest point over a stretch of the drawing, as a height above the axis. */
  const peakOver = (x0: number, x1: number) => {
    const z0 = (x0 / WIDTH) * 2 * span - span
    const z1 = (x1 / WIDTH) * 2 * span - span
    return z0 <= 0 && z1 >= 0 ? HEIGHT : Math.max(height(z0), height(z1))
  }

  // A label on or over the curve (an area, a section percent, a marked
  // value). One `above` the curve is kept clear of it all along its width,
  // and any label is moved up until it clears the labels already there.
  const over = (x: number, y: number, label: string | null, { anchor = 'middle', above = true, size = fs }: { anchor?: Text['anchor']; above?: boolean; size?: number } = {}): Box => {
    const w = label === null ? blankW : textWidth(label, size)
    const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2
    let box: Box = { x0, y0: y - 0.78 * size, x1: x0 + w, y1: y + 0.22 * size }
    if (above) {
      const lift = Math.max(0, box.y1 + peakOver(box.x0, box.x1) + 4)
      box = { ...box, y0: box.y0 - lift, y1: box.y1 - lift }
    }
    for (let tries = 0; tries < 12 && taken.some((b) => overlaps(b, box)); tries++) box = { ...box, y0: box.y0 - ROW * size * 0.8, y1: box.y1 - ROW * size * 0.8 }
    const baseline = r2(box.y1 - 0.22 * size)
    if (label === null) blanks.push({ x1: r2(box.x0), x2: r2(box.x1), y: baseline })
    else texts.push({ x: r2(x), y: baseline, text: label, anchor, size: size === fs ? undefined : r2(size) })
    taken.push(box)
    boxes.push(box)
    return box
  }

  // The density axis: the curve's height, at the left end of the axis.
  let density: { line: Line; ticks: Line[]; numbers: Text[] } | null = null
  if (s.density) {
    const peak = 1 / (read.sigma * Math.sqrt(2 * Math.PI))
    const r = niceRange(0, peak)
    const yOf = (d: number) => r2(-(d / peak) * HEIGHT)
    const values: number[] = []
    for (let v = 0; v <= r.to + r.step * 1e-6; v += r.step) values.push(Number(v.toPrecision(10)))
    const top = yOf(values.at(-1)!)
    density = {
      line: { x1: 0, y1: 0, x2: 0, y2: top },
      ticks: values.map((v) => ({ x1: -TICK, y1: yOf(v), x2: 0, y2: yOf(v) })),
      numbers: values.map((v) => ({ x: -TICK - 4, y: r2(yOf(v) + 0.32 * fs), text: fmt(v), anchor: 'end' as const })),
    }
    // Labels over the curve keep clear of its numbers.
    for (const t of density.numbers) taken.push(textBox(t))
    boxes.push(...density.numbers.map(textBox), { x0: -TICK, y0: top, x1: 0, y1: 0 })
  }

  // The SD ticks and lines.
  const ks = Array.from({ length: 2 * s.reach + 1 }, (_, i) => i - s.reach)
  const sdLines: Line[] = s.sdLines === 'off' ? [] : ks.map((k) => ({ x1: px(k), y1: 0, x2: px(k), y2: py(k) }))
  const ticks: Line[] = [...ks, ...read.ticks].map((z) => ({ x1: px(z), y1: 0, x2: px(z), y2: TICK }))

  // The rows of numbers under the axis. Row 0 also holds the extra ticks' values and the regions' bounds, which win over an SD tick's number in their way.
  const rows = [s.numbers, s.second].filter((n): n is Exclude<Numbers, 'none'> => n !== 'none')
  const baseline = (row: number) => r2(TICK + 4 + fs * 0.8 + row * ROW * fs)
  type Item = { x: number; text: string | null; italic?: boolean }
  const itemBox = (it: Item, row: number): Box => {
    const w = it.text === null ? blankW : textWidth(it.text, fs)
    return { x0: it.x - w / 2, y0: baseline(row) - 0.78 * fs, x1: it.x + w / 2, y1: baseline(row) + 0.22 * fs }
  }
  const placed: { item: Item; row: number }[] = []
  const apart = fs * 0.6 // the least space between two numbers in a row, so they read as two
  const put = (item: Item, row: number) => placed.push({ item, row })
  const sdItem = (k: number, as: Exclude<Numbers, 'none'>): Item =>
    as === 'blank' ? { x: px(k), text: null } : as === 'symbols' ? { x: px(k), text: symbol(k), italic: true } : { x: px(k), text: as === 'z' ? fmt(k) : nice(read.xOf(k)) }

  // The bounds and extra ticks first, each in the first row it fits.
  const extra: Item[] = [
    ...read.ticks.map((z) => ({ x: px(z), text: nice(read.xOf(z)) })),
    ...read.regions.flatMap((r) =>
      r.settings.bounds === 'none'
        ? []
        : r.bounds.map((z) => ({ x: px(z), text: r.settings.bounds === 'blank' ? null : r.settings.bounds === 'z' ? `z = ${rounded(z)}` : rounded(read.xOf(z)) })),
    ),
  ]
  const extraRows: Box[][] = []
  // Bounds that don't fit in row 0 go in rows of their own under the SD numbers.
  const rowOf = (row: number) => (row === 0 ? 0 : Math.max(rows.length, 1) + row - 1)
  for (const it of extra) {
    // The same bound twice (two regions sharing it) is written once.
    if (placed.some((p) => Math.abs(p.item.x - it.x) < 0.5 && p.item.text === it.text)) continue
    let row = 0
    while ((extraRows[row] ?? []).some((b) => overlaps(b, itemBox(it, rowOf(row)), apart))) row++
    const at = rowOf(row)
    ;(extraRows[row] ??= []).push(itemBox(it, at))
    put(it, at)
  }
  rows.forEach((as, row) => {
    for (const k of ks) {
      const it = sdItem(k, as)
      if (row === 0 && extraRows[0]?.some((b) => overlaps(b, itemBox(it, 0), apart))) continue
      put(it, row)
    }
  })
  for (const { item, row } of placed) {
    const box = itemBox(item, row)
    boxes.push(box)
    if (item.text === null) blanks.push({ x1: r2(box.x0), x2: r2(box.x1), y: baseline(row) })
    else texts.push({ x: item.x, y: baseline(row), text: item.text, anchor: 'middle', italic: item.italic })
  }
  const usedRows = Math.max(rows.length, ...placed.map((p) => p.row + 1))

  // The shaded regions, each over the ones before it, with their bounds drawn up to the curve.
  const fills: Fill[] = []
  const regions = read.regions.map((r, i) => {
    const fill = fillOf(s.look, i, r.settings.fill)
    fills.push(fill)
    return { fill, d: r.spans.map(([a, b]) => under(a, b)).join(''), index: r.index }
  })
  const bounds: Line[] = read.regions.flatMap((r) => r.bounds.map((z) => ({ x1: px(z), y1: 0, x2: px(z), y2: py(z) })))

  // The section percents, in each section between SD lines, or above it where it's too thin.
  if (s.percents !== 'off') {
    const sections: [number, number][] = ks.slice(0, -1).map((k) => [k, k + 1])
    // The tails past the last SD line: the empirical rule's 0.15%, or exactly.
    if (s.reach === 3 || s.percents === 'exact') sections.push([-Infinity, -s.reach], [s.reach, Infinity])
    for (const [a, b] of sections) {
      const label = Number.isFinite(a) && Number.isFinite(b) ? sectionPercent(a, s.percents) : sectionPercent(a === -Infinity ? -s.reach - 1 : s.reach, s.percents)
      const tail = !Number.isFinite(a) || !Number.isFinite(b)
      const mid = tail ? (a === -Infinity ? b - 0.35 : a + 0.35) : (a + b) / 2
      const h = height(mid)
      const room = px(b) - px(a) - 6
      // Inside the section, smaller if that's what it takes, or else above it.
      const size = [fs, fs * 0.8].find((f) => !tail && h >= 2.4 * f && textWidth(label, f) <= room)
      if (size) over(px(mid), r2(-Math.max(6, h * 0.3)), label, { above: false, size })
      else over(px(mid), r2(-h - 6), label)
    }
  }

  // Each region's area: inside it where there's room, or above it to the outside with a line to it.
  const leaders: Line[] = []
  for (const r of read.regions) {
    if (r.settings.area === 'none') continue
    for (const [a, b] of r.spans) {
      const p = r.kind === 'outside' ? Phi(b) - Phi(a) : r.area
      const label = r.settings.area === 'blank' ? null : areaText(p, r.settings.area)
      // Where half the region's area is on each side.
      const c = Math.max(-span + 0.1, Math.min(span - 0.1, PhiInverse((Phi(a) + Phi(b)) / 2)))
      const h = height(c)
      const w = label === null ? blankW : textWidth(label, fs)
      const wide = px(Math.min(b, span)) - px(Math.max(a, -span))
      if (h >= 2.6 * fs && wide >= w + 10) {
        over(px(c), r2(-h * 0.35 + 0.3 * fs), label, { above: false })
        continue
      }
      // Outward from the middle, above the curve.
      const out = c < 0 ? -1 : 1
      const x = px(c) + out * 1.2 * fs
      const box = over(x, r2(-Math.max(h, height(c + out * 0.3 * (span / 3))) - 1.6 * fs), label, { anchor: out < 0 ? 'end' : 'start' })
      leaders.push({ x1: px(c), y1: r2(-Math.min(h * 0.5, h - 2)), x2: r2(out < 0 ? box.x1 + 2 : box.x0 - 2), y2: r2(box.y1 - 0.3 * fs) })
    }
  }

  // The marked values: a dotted line up to the curve, with a label over it.
  const marks: Line[] = []
  for (const m of read.marks) {
    marks.push({ x1: px(m.z), y1: 0, x2: px(m.z), y2: py(m.z) })
    const l = m.settings.label
    const label = l === 'blank' ? null : l === 'z' ? `z = ${rounded(m.z)}` : l === 'percentile' ? percentileText(m.z) : l === 'text' ? m.settings.text.trim() || nice(read.xOf(m.z)) : nice(read.xOf(m.z))
    over(px(m.z), r2(-height(m.z) - 7), label)
  }

  // The axis title under the rows, and the chart title over everything.
  const bottom = Math.max(...boxes.map((b) => b.y1))
  const titles: Text[] = []
  const titleBlanks: Blank[] = []
  if (s.xTitleMode !== 'none') {
    const y = r2(Math.max(bottom, baseline(usedRows - 1) + 0.22 * fs) + fs * 1.3)
    if (s.xTitleMode === 'text' && s.xTitle.trim()) titles.push({ x: WIDTH / 2, y, text: s.xTitle.trim(), anchor: 'middle', bold: true })
    else if (s.xTitleMode === 'blank') titleBlanks.push({ x1: WIDTH / 2 - 6 * fs, x2: WIDTH / 2 + 6 * fs, y })
    boxes.push({ x0: WIDTH / 2 - 6 * fs, y0: y - fs, x1: WIDTH / 2 + 6 * fs, y1: y + 0.3 * fs })
    for (const t of titles) boxes.push(textBox(t))
  }
  if (s.titleMode !== 'none') {
    const size = r2(fs * 1.2)
    const y = r2(Math.min(...boxes.map((b) => b.y0)) - size * 0.7)
    if (s.titleMode === 'text' && s.title.trim()) {
      const t: Text = { x: WIDTH / 2, y, text: s.title.trim(), anchor: 'middle', bold: true, size }
      titles.push(t)
      boxes.push(textBox(t))
    } else if (s.titleMode === 'blank') {
      titleBlanks.push({ x1: WIDTH / 2 - 7 * fs, x2: WIDTH / 2 + 7 * fs, y })
      boxes.push({ x0: WIDTH / 2 - 7 * fs, y0: y - fs, x1: WIDTH / 2 + 7 * fs, y1: y + 2 })
    }
  }

  const x0 = Math.min(...boxes.map((b) => b.x0)) - PAD
  const y0 = Math.min(...boxes.map((b) => b.y0)) - PAD
  const x1 = Math.max(...boxes.map((b) => b.x1)) + PAD
  const y1 = Math.max(...boxes.map((b) => b.y1)) + PAD

  return {
    read,
    fs,
    /** where the axis's left end is, from the figure's top left corner */
    shift: { x: r2(-x0), y: r2(-y0) },
    width: Math.ceil(x1 - x0),
    height: Math.ceil(y1 - y0),
    axis: { x1: 0, x2: WIDTH },
    curve: curvePath,
    sdLines,
    ticks,
    regions,
    fills,
    bounds,
    marks,
    leaders,
    density,
    texts: [...texts, ...titles],
    blanks: [...blanks, ...titleBlanks],
    description: describe(s, read),
  }
}

export type CurveLayout = ReturnType<typeof buildCurve>

/** What the figure shows, for a screen reader. */
function describe(s: Settings, read: ReadCurve): string {
  const title = s.titleMode === 'text' && s.title.trim() ? `${s.title.trim()}: ` : ''
  const parts = [`${title}normal curve with mean ${nice(read.mu)} and standard deviation ${nice(read.sigma)}`]
  for (const r of read.regions) parts.push(`shaded ${r.sentence}`)
  for (const m of read.marks) parts.push(`marked at ${nice(read.xOf(m.z))}`)
  return parts.join('; ')
}
