// Lays out a bond energy curve for BondEnergyFigure.svelte to draw: up to
// three curves of potential energy against internuclear distance on a
// $shared/graph grid, told apart by their dashes and a key under the graph,
// as Half-Life Graph's are. Each curve's lowest point is at its bond length
// and minus its bond energy, and the zero line, the energy of the separated
// atoms, runs across the grid. Marked if wanted: a dot on each minimum,
// dashed guide lines from it across to the energy axis and down to the
// distance axis, each labeled by its foot, and "Repulsion" and "Attraction"
// either side of one curve's minimum, all placed by $shared/graph/labels
// where they touch nothing.

import { EVERY, readAxes, type GridSettings, type RangeSettings } from '$shared/graph/axes'
import { guidesFrom } from '$shared/graph/axisMarks'
import { COLORS } from '$shared/graph/colors'
import { CELL, clipPath, layoutGrid, pathOf, round, type Gridlines, type Point } from '$shared/graph/grid'
import {
  DASHES, alongCurve, besidePoint, layoutKey, placer, textBox, textWidth, type Anchor, type Box, type KeyEntry, type Segment, type Spot,
} from '$shared/graph/labels'
import { fmt } from '$shared/graph/numbering'
import { LABEL_SCALE } from '$shared/labelSize'
import { LENGTH_UNIT_TEXT, fromPm, samples, wallAt } from './morse'
import { UNIT_TEXT, drawnBonds, namesHidden, regionsShown, shownName, type BondSettings } from './settings'

const SAMPLES = 400
const PAD = 14 // the figure's margin, as the grid's
const INSET = 4 // how far inside the grid's border labels stay
const BLANK_W = 70 // a write-on line for a label left blank
const CROSSING = 10 // what the placer counts against a label for crossing a line
const INKS = ['blue', 'red', 'green'] as const
/** The most blocks Fit gives each axis: a graph wider than it is tall, that prints at a readable size. */
const MOST = { x: 18, y: 16 }
/** A well shallower than this many blocks is too squashed to read. */
const SHALLOW = 2

/** A label on the figure: written text, or a write-on line for students. */
export type Label = { x: number; y: number; anchor: Anchor; text?: string; blank?: Segment; color?: string; back?: Box }
export type Curve = { index: number; name: string; color: string; dash?: string; paths: string[] }

/** A bond length as written: "150 pm", "1.5 Å", "0.15 nm". */
export const lengthText = (s: BondSettings, pm: number) => `${fmt(fromPm(pm, s.lengthUnit))} ${LENGTH_UNIT_TEXT[s.lengthUnit]}`

/** An energy as written: "300 kJ/mol", "−300 kJ mol⁻¹". */
export const energyText = (s: BondSettings, energy: number) => `${fmt(energy)} ${UNIT_TEXT[s.unit]}`

/** A list in words: "a", "a and b", "a, b and c". */
const listed = (words: string[]) => (words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : words[0])

/** What the figure shows, for screen readers: never the names, when they're hidden. */
export function describe(s: BondSettings) {
  if (s.titleMode === 'text' && s.title.trim()) return s.title.trim()
  return `Potential energy against internuclear distance for ${listed(drawnBonds(s).map((b) => shownName(s, b.slot)))}`
}

/** The answer key: each bond's length and energy, naming each hidden one with the name the teacher typed. */
export function answerLines(s: BondSettings): string[] {
  return drawnBonds(s).map((b) => {
    const who = namesHidden(s) ? `${shownName(s, b.slot)} is ${b.name}` : b.name
    return `${who}: bond length ${lengthText(s, b.pm)}, bond energy ${energyText(s, b.energy)}`
  })
}

/**
 * A tidy axis from at most `lo` to at least `hi`, counting by 1, 2, 2.5 or
 * 5 times a power of ten, 0 always on one of its lines: the smallest such
 * step that takes no more than `most` blocks. `under` blocks are kept clear
 * below `lo`. The steps are round, not the bond length or energy, so
 * students read those off the curve.
 */
function stepped(lo: number, hi: number, most: number, under = 0): [number, number, number] {
  for (let k = Math.floor(Math.log10(hi - lo)) - 3; ; k++) {
    for (const m of [1, 2, 2.5, 5]) {
      const step = Number((m * 10 ** k).toPrecision(6))
      const first = Math.floor(lo / step - under + 1e-9)
      const last = Math.ceil(hi / step - 1e-9)
      if (last - first <= most) return [Number((first * step).toPrecision(12)), Number((last * step).toPrecision(12)), step]
    }
  }
}

/**
 * Axes that just fit the curves: distance from 0 to about 3 times the
 * longest bond length, energy from just below the deepest well to about a
 * quarter of its depth above 0, in tidy steps.
 */
export function fittedAxes(s: BondSettings): RangeSettings & { xEvery: number; yEvery: number } {
  const bonds = drawnBonds(s)
  const deepest = Math.max(...bonds.map((b) => b.energy))
  const [x0, x1, xs] = stepped(0, 3 * Math.max(...bonds.map((b) => b.length)), MOST.x)
  const [y0, y1, ys] = stepped(-deepest, deepest / 4, MOST.y, 0.75)
  const blocks = (a: number, b: number, step: number) => Math.round((b - a) / step)
  // Numbered often enough to read, and never so often the numbers run together.
  const widest = Math.max(...Array.from({ length: blocks(x0, x1, xs) + 1 }, (_, j) => textWidth(fmt(Number((x0 + j * xs).toPrecision(12))), 14)))
  const xEvery = EVERY.find((n) => n && n >= (blocks(x0, x1, xs) > 10 ? 2 : 1) && n * CELL - 8 >= widest) ?? 10
  return {
    xFrom: String(x0), xTo: String(x1), xStep: String(xs), xEvery,
    yFrom: String(y0), yTo: String(y1), yStep: String(ys), yEvery: blocks(y0, y1, ys) > 10 ? 2 : 1,
  }
}

/** The settings the grid is laid out from: as typed, or, shape only, fitted to the curves with no numbers or gridlines. */
function gridSettingsOf(s: BondSettings): GridSettings & RangeSettings {
  if (s.axes === 'shape') return { ...s, ...fittedAxes(s), xEvery: 0, yEvery: 0, minor: 0 }
  return { ...s, minor: s.gridlines === 'none' ? 0 : s.minor }
}

/** Of dashed lines lying along each other, only the longest: dashes drawn over dashes blur. */
function longest(lines: Segment[]): Segment[] {
  const length = (l: Segment) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1)
  const along = (a: Segment, b: Segment) =>
    (a.x1 === a.x2 && b.x1 === b.x2 && Math.abs(a.x1 - b.x1) < 0.5) || (a.y1 === a.y2 && b.y1 === b.y2 && Math.abs(a.y1 - b.y1) < 0.5)
  return lines.filter((l, i) => !lines.some((m, j) => j !== i && along(l, m) && (length(m) > length(l) || (length(m) === length(l) && j < i))))
}

/** Minima whose guide lines lie along each other (the same `at` to half a pixel), in groups, in order of `at`. */
function sharing<T>(items: T[], at: (t: T) => number): T[][] {
  const groups: T[][] = []
  for (const item of [...items].sort((a, b) => at(a) - at(b))) {
    const last = groups.at(-1)
    if (last && Math.abs(at(last[0]) - at(item)) < 0.5) last.push(item)
    else groups.push([item])
  }
  return groups
}

export function buildCurve(s: BondSettings) {
  const shape = s.axes === 'shape'
  const gs = gridSettingsOf(s)
  const axes = readAxes(gs)
  const problems: Record<string, string | null> = shape ? {} : { ...axes.problems }
  // Room left of the energy axis for shape only's 0.
  const zeroRoom = shape ? 14 * LABEL_SCALE[s.labelSize] * 0.6 + 12 : 0
  const { px, box, ...grid } = layoutGrid(gs, axes, { edges: true, room: { y: zeroRoom } })
  const fs = grid.fs
  const LABEL_FS = fs * 1.05
  const area = grid.grid
  const axisX = grid.yAxis.x
  const axisY = grid.xAxis.y
  const inBox = (p: Point) => p.x >= box.x0 - 1e-9 && p.x <= box.x1 + 1e-9 && p.y >= box.y0 - 1e-9 && p.y <= box.y1 + 1e-9
  const bonds = drawnBonds(s)

  const bounds: Box = { x0: area.x + INSET, y0: area.y + INSET, x1: area.x + area.w - INSET, y1: area.y + area.h - INSET }
  const place = placer(bounds)

  // The zero line, the energy of the atoms far apart, in the axes' ink. Shape
  // only keeps its 0 on the energy axis, the one number there.
  const numbers = [...grid.numbers]
  let zero: Segment | null = null
  if (box.y0 < 0 && box.y1 > 0) {
    const y = px({ x: box.x0, y: 0 }).y
    zero = { x1: area.x, y1: y, x2: area.x + area.w, y2: y }
    place.line([{ x: zero.x1, y }, { x: zero.x2, y }])
    if (shape) numbers.push({ x: axisX - 7, y: y + fs * 0.35, text: '0', anchor: 'end' })
  }

  // Each curve from where it leaves the top of the grid, down the wall,
  // through its minimum and out to the end of the distance axis.
  const pages: Point[][] = []
  const curves: Curve[] = bonds.map((b, k) => {
    const from = Math.max(box.x0, 0, wallAt(box.y1 + axes.y.step, b.length, b.energy))
    const paths: string[] = []
    pages.push([])
    for (const run of clipPath(samples(b.length, b.energy, from, box.x1, SAMPLES), box)) {
      const page = run.map(px)
      paths.push(pathOf(page))
      pages[k].push(...page)
      // Labels keep off the curve as a few longer pieces, so crossing it counts once, not once a pixel.
      place.line(page.filter((_, j) => j === 0 || j === page.length - 1 || j % 8 === 0))
    }
    return { index: k, name: shownName(s, b.slot), color: s.color ? COLORS[INKS[k]] : COLORS.black, dash: DASHES[k], paths }
  })

  // Each minimum: at the bond length, at minus the bond energy.
  const minima = bonds.map((b, k) => {
    const at = { x: b.length, y: -b.energy }
    return { bond: b, index: k, on: inBox(at), at: px(at) }
  })
  const marked = minima.filter((m) => m.on)

  const dots = s.dots ? marked.map((m) => ({ ...m.at, color: curves[m.index].color })) : []
  for (const d of dots) place.box({ x0: d.x - 6, y0: d.y - 6, x1: d.x + 6, y1: d.y + 6 })

  // Dashed guide lines from each minimum across to the energy axis and down
  // to the distance axis; where two lie along each other, one line.
  const guides = s.guides ? longest(marked.flatMap((m) => guidesFrom(m.at, axisX, axisY))) : []
  for (const l of guides) place.line([{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }])

  const words: Label[] = []
  const write = (spots: Spot[], text: string | null, color?: string) => {
    if (!spots.length) return
    const spot = place.place(spots, text === null ? BLANK_W : textWidth(text, LABEL_FS) * 1.06 + 2, LABEL_FS)
    if (text === null) words.push({ x: spot.x, y: spot.y, anchor: spot.anchor, color, blank: { x1: spot.box.x0, y1: spot.y, x2: spot.box.x1, y2: spot.y } })
    else words.push({ x: spot.x, y: spot.y, anchor: spot.anchor, color, text })
  }

  // Each guide line's label by its foot: the bond length where the line
  // down meets the distance axis, the energy where the line across meets
  // the energy axis. With several curves each label is in its curve's ink,
  // and the lengths spread out from the lines: the shortest bond's to the
  // left of its line, the longest's to the right, one between them a row up.
  // Where lines are too close for a length beside its own line, it sits on
  // the line, on a white patch, so it can't be read as another line's; where
  // even that touches something, by its minimum. A label that could only go
  // over another is left off. Either way the page says the labels are
  // crowded. Bonds sharing a line share its one label, in the axes' ink.
  let crowded = false
  if (s.guides && s.guideLabels !== 'none') {
    const mode = s.guideLabels
    const inked = (group: typeof marked) =>
      curves.length > 1 && new Set(group.map((m) => curves[m.index].color)).size === 1 ? curves[group[0].index].color : undefined
    /** The labels written so far: a label is never written over another. */
    const taken: Box[] = []
    const free = <T extends { box: Box }>(options: T[]) =>
      options.filter(({ box: b }) => !taken.some((t) => b.x0 < t.x1 + 2 && t.x0 < b.x1 + 2 && b.y0 < t.y1 + 2 && t.y0 < b.y1 + 2))
    /**
     * Beside its line, where touches least. With places `on` the line, if
     * nowhere beside it is clear: on it, beside it or by its minimum,
     * wherever touches least. With nowhere free of the other labels, left off.
     */
    const label = (at: Point, beside: Spot[], on: Spot[] | null, text: string | null, color?: string) => {
      const width = text === null ? BLANK_W : textWidth(text, LABEL_FS) * 1.06 + 2
      const boxed = (spots: Spot[]) => free(spots.map((spot) => ({ ...spot, box: textBox(spot, width, LABEL_FS) })))
      const best = <T extends { box: Box }>(options: T[]) => (options.length ? place.choose(options, false) : null)
      let spot = best(boxed(beside))
      let back: Box | undefined
      // Only near a line (closer than CLOSE, crossing nothing) counts as clear.
      if (on && !(spot && spot.score < CROSSING)) {
        // On its own line a label always crosses that line, so that much doesn't count against it.
        const over = best(boxed(on))
        const near = best(boxed(besidePoint(at, LABEL_FS)))
        if (over && over.score - CROSSING <= Math.min(spot?.score ?? Infinity, near?.score ?? Infinity)) {
          spot = { ...over, score: over.score - CROSSING }
          back = { x0: over.box.x0 - 2, y0: over.box.y0, x1: over.box.x1 + 2, y1: over.box.y1 }
        } else if (near && near.score < (spot?.score ?? Infinity)) spot = near
        if (!spot || spot.score >= CROSSING) crowded = true
      }
      if (!spot) {
        crowded = true
        return
      }
      place.keep(spot.box)
      taken.push(spot.box)
      if (text === null) words.push({ x: spot.x, y: spot.y, anchor: spot.anchor, color, back, blank: { x1: spot.box.x0, y1: spot.y, x2: spot.box.x1, y2: spot.y } })
      else words.push({ x: spot.x, y: spot.y, anchor: spot.anchor, color, back, text })
    }
    // A baseline just high enough to keep descenders inside the grid.
    const foot = axisY - INSET - LABEL_FS * 0.3 - 1
    const row = LABEL_FS * 1.25
    const across = sharing(marked, (m) => m.at.x)
    // The outer two first, beside their lines, then the one between them.
    const order = across.map((_, i) => i).sort((a, b) => Number(a > 0 && a < across.length - 1) - Number(b > 0 && b < across.length - 1))
    for (const i of order) {
      const group = across[i]
      const { at, bond } = group[0]
      const right = (up: number): Spot => ({ x: at.x + 9, y: foot - up * row, anchor: 'start' })
      const left = (up: number): Spot => ({ x: at.x - 9, y: foot - up * row, anchor: 'end' })
      const on = (up: number): Spot => ({ x: at.x, y: foot - up * row, anchor: 'middle' })
      const spots =
        across.length === 1 ? [right(0), left(0), right(1), left(1)]
        : i === 0 ? [left(0), left(1), right(0), right(1)]
        : i === across.length - 1 ? [right(0), right(1), left(0), left(1)]
        : [right(1), left(1), right(2), left(2), right(0), left(0)]
      // On the line, no higher than its top.
      const rows = [0, 1, 2, 3].filter((up) => foot - up * row - LABEL_FS > at.y + 4)
      label(at, spots, rows.map(on), mode === 'values' ? lengthText(s, bond.pm) : mode === 'words' ? 'Bond length' : null, inked(group))
    }
    for (const group of sharing(marked, (m) => m.at.y)) {
      const { at, bond } = group[0]
      const text = mode === 'values' ? energyText(s, -bond.energy) : mode === 'words' ? 'Bond energy' : null
      const left = axisX + INSET + 5
      const end = Math.max(...group.map((m) => m.at.x))
      // Clear of its line: just above it, or just under.
      const above = at.y - LABEL_FS * 0.3 - 5
      const below = at.y + LABEL_FS * 0.78 + 5
      const beside: Spot[] = [
        { x: left, y: above, anchor: 'start' },
        { x: left, y: below, anchor: 'start' },
        { x: left + 60, y: above, anchor: 'start' },
        { x: left + 60, y: below, anchor: 'start' },
        { x: end - 12, y: above, anchor: 'end' },
      ]
      // By the energy axis it can only be its own line's, so it may cross a curve.
      label(at, beside, null, text, inked(group))
    }
  }

  // "Repulsion" beside the wall, where the nuclei are closer than the bond
  // length, and "Attraction" along the rise beyond it. One curve only.
  if (regionsShown(s) && pages[0].length) {
    const { length: r0, energy: D } = bonds[0]
    const said = (text: string) => (s.regions === 'words' ? text : null)
    const top = Math.min(box.y1, 4 * D)
    const heights = [...(top > 0 ? [top * 0.5, top * 0.25, top * 0.75] : []), -0.2 * D, -0.45 * D, -0.7 * D]
    const wall = heights
      .map((e) => ({ x: wallAt(e, r0, D), y: e }))
      .filter(inBox)
      .map(px)
      .map((p): Spot => ({ x: p.x - 10, y: p.y + LABEL_FS * 0.35, anchor: 'end' }))
    write(wall, said('Repulsion'))
    const rise = samples(r0, D, Math.max(box.x0, 1.2 * r0), Math.min(box.x1, 2.2 * r0), 60).filter(inBox).map(px)
    write(alongCurve(rise, LABEL_FS), said('Attraction'))
  }

  if (crowded) problems.crowded = 'The guide lines’ labels are crowded where minimums are close together, and some may be left off. Count an axis by a smaller number to spread them out.'

  // Say when a minimum is off the grid; the Fit button fixes it.
  if (!shape) {
    const off = minima.filter((m) => !m.on).map((m) => `${m.bond.name}’s minimum (${lengthText(s, m.bond.pm)}, ${energyText(s, -m.bond.energy)})`)
    if (off.length) problems.fit = `${listed(off)} ${off.length > 1 ? 'are' : 'is'} off the grid. Fit the axes to bring ${off.length > 1 ? 'them' : 'it'} on.`
    const shallow = marked.filter((m) => m.bond.energy / axes.y.step < SHALLOW - 1e-9).map((m) => `${m.bond.name}’s`)
    if (shallow.length) {
      problems.shallow = `${listed(shallow)} well${shallow.length > 1 ? 's are' : ' is'} under ${SHALLOW} blocks deep on this grid, too shallow to read well. Count the energy axis by a smaller number, or graph ${shallow.length > 1 ? 'them' : 'it'} apart from the deeper ${bonds.length - shallow.length > 1 ? 'wells' : 'well'}.`
    }
  }

  // The key, when there's more than one curve to tell apart.
  let keyEntries: KeyEntry[] = []
  let width = grid.width
  let height = grid.height
  if (curves.length > 1) {
    const key = layoutKey(curves, { midX: area.x + area.w / 2, wrap: Math.max(area.w, 360), top: grid.height - PAD + 2, left: PAD, fs, labelFs: LABEL_FS })
    keyEntries = key.entries
    width = Math.max(width, key.right + PAD)
    height = key.bottom + PAD
  }

  const gridlines: Gridlines = shape ? 'none' : s.gridlines
  return {
    ...grid,
    numbers,
    width: round(width),
    height: round(height),
    // Shape only has no scale, so no lines or ticks on either axis.
    vLines: shape ? [] : grid.vLines,
    hLines: shape ? [] : grid.hLines,
    gridlines,
    gridSettings: gs,
    labelFs: LABEL_FS,
    curves,
    zero,
    /** each minimum on the drawing, and whether it's on the grid */
    minima: minima.map((m) => ({ index: m.index, on: m.on, x: m.at.x, y: m.at.y })),
    dots,
    guides,
    /** the guide lines' and regions' labels (the grid's own `labels` are its titles) */
    words,
    keyEntries,
    problems,
  }
}

export type CurveLayout = ReturnType<typeof buildCurve>
