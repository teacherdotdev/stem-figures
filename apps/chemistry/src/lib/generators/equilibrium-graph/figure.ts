// Lays out an equilibrium graph for EquilibriumFigure.svelte to draw: each
// species' concentration against time on a $shared/graph grid, solved by
// model.ts, the lines solid, dashed and dotted so they read apart in black
// and white. Each species' formula sits beside its line where it first
// levels off, placed by $shared/graph/labels where it touches nothing. A
// dashed vertical line marks each stress, its words above the grid, over the
// line, so they never cover a curve. Also the answer key, the axes the Fit
// button gives, and what the page says when a stress can't be drawn as set.

import { EVERY, readAxes } from '$shared/graph/axes'
import { COLORS } from '$shared/graph/colors'
import { CELL, clipPath, layoutGrid, pathOf, round, type GridLayout, type Point } from '$shared/graph/grid'
import { placer, textBox, textWidth, type Anchor, type Box } from '$shared/graph/labels'
import { fmt } from '$shared/graph/numbering'
import { textSpans, type Span } from '$shared/particles/key'
import { plainText } from '$shared/particles/keyText'
import { SPECIES_DASHES, concentrationOf, formulaText, placeSpeciesLabel, type SpeciesLabel } from '$lib/shared/concentration'
import { niceRange } from '$lib/shared/niceRange'
import { run, type Stretch } from './model'
import { MADE_UP, equationText, moleChange, reactionOf, type Reaction } from './reactions'
import { heatOf, kFactorOf, specOf, stressesOf, type Drawn, type EquilibriumSettings } from './settings'

const PAD = 14 // the figure's margin, as the grid's
const INSET = 4 // how far inside the grid's border labels stay
const INKS = ['blue', 'red', 'green'] as const

type Segment = { x1: number; y1: number; x2: number; y2: number }

export type Curve = { index: number; color: string; dash?: string; paths: string[] }
/** A stress's dashed line, and its words above the grid. */
export type StressMark = { slot: number; line: Segment; x: number; y: number; anchor: Anchor; spans: Span[] }

/** A number to three significant figures: "0.514", "1.54", "12.3". */
export const sig = (v: number) => fmt(Number(v.toPrecision(3)))

/** A list in words: "a", "a and b", "a, b and c". */
const listed = (words: string[]) => (words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : (words[0] ?? ''))

/** What a stress does, in words, whatever the teacher wrote over its line; `short` is how much of a removal wasn't there to take. */
function stressWords(rx: Reaction, d: Drawn, short = 0) {
  const formula = formulaText(rx.species[d.species].formula)
  if (d.kind === 'add') return `${formula} added (${sig(d.amount)} mol/L)`
  if (d.kind === 'remove') return short > 1e-12 ? `all the ${formula} removed (${sig(d.amount - short)} mol/L)` : `${formula} removed (${sig(d.amount)} mol/L)`
  if (d.kind === 'volume') {
    const how = rx.phase === 'aqueous' ? (d.amount >= 1 ? 'water added, ' : 'water evaporated, ') : ''
    return `volume × ${sig(d.amount)} (${how}every concentration × ${sig(1 / d.amount)})`
  }
  return `temperature ${d.kind === 'raise' ? 'raised' : 'lowered'}`
}

/** What the figure shows, for screen readers: a stress whose words were emptied stays unnamed. */
export function labelOf(s: EquilibriumSettings) {
  if (s.titleMode === 'text' && s.title.trim()) return s.title.trim()
  const rx = reactionOf(s.reaction)
  const stresses = stressesOf(s).map((d) => (d.text ? `${plainText(d.text)} at time ${fmt(d.at)}` : `a stress at time ${fmt(d.at)}`))
  return `Equilibrium graph of ${equationText(rx)}: concentration against time${stresses.length ? `, with ${listed(stresses)}` : ''}`
}

const concentrations = (rx: Reaction, c: number[]) => `${rx.species.map((sp, i) => `${concentrationOf(sp.formula)} = ${sig(c[i])}`).join(', ')} mol/L`

const SHIFTS = { forward: 'shifts right, toward the products', reverse: 'shifts left, toward the reactants', none: 'no shift' }

/** Why a volume change shifts the way it does, or doesn't. */
function volumeReason(rx: Reaction, stretch: Stretch) {
  const particles = rx.phase === 'aqueous' ? 'dissolved particles' : 'moles of gas'
  if (!moleChange(rx)) return ` (the same ${particles} on both sides)`
  if (stretch.shift === 'none') return ''
  const toProducts = stretch.shift === 'forward'
  return ` (the side with ${toProducts === moleChange(rx) > 0 ? 'more' : 'fewer'} ${particles})`
}

/**
 * The answer key: K, marked as an example value, and the equilibrium
 * concentrations first reached; then for each stress which way the system
 * shifts, the new K after a temperature change, and the new equilibrium
 * concentrations.
 */
export function answerLines(s: EquilibriumSettings): string[] {
  const rx = reactionOf(s.reaction)
  const stresses = stressesOf(s).filter((d) => d.at > 0)
  const { stretches, reacts } = run(specOf(s), Math.max(s.established, ...stresses.map((d) => d.at)) * 1.5)
  const out = [`K = ${sig(s.k)} (${s.reaction === MADE_UP ? 'a made-up reaction' : 'an example value, not measured'})`]
  if (!reacts) return [...out, 'Nothing can react from these starting concentrations.']
  const first = stretches[0]
  out.push(
    first.shift === 'none'
      ? `Starts at equilibrium: ${concentrations(rx, first.equilibrium)}`
      : `Equilibrium first reached: ${concentrations(rx, first.equilibrium)}`,
  )
  stresses.forEach((d, n) => {
    const stretch = stretches[n + 1]
    if (!stretch) return
    // Two stresses at once: the system answers both together, under the later line.
    if (stresses[n + 1]?.at === d.at) {
      out.push(`At time ${fmt(d.at)}, ${stressWords(rx, d, stretch.short)}, at the same moment as the next stress.`)
      return
    }
    const temperature = d.kind === 'raise' || d.kind === 'lower'
    const kChange = temperature ? `K ${kFactorOf(heatOf(s), d) > 1 ? 'rises' : 'falls'} to ${sig(stretch.k)}, ` : ''
    const reason = d.kind === 'volume' ? volumeReason(rx, stretch) : ''
    const then = stretch.shift === 'none' ? `Concentrations stay at ${concentrations(rx, stretch.equilibrium)}` : `New equilibrium: ${concentrations(rx, stretch.equilibrium)}`
    out.push(`At time ${fmt(d.at)}, ${stressWords(rx, d, stretch.short)}: ${kChange}${SHIFTS[stretch.shift]}${reason}. ${then}`)
  })
  return out
}

/** Axes that just fit the graph, in tidy steps: time from 0 until the last shift has settled and stayed level a while, and concentration from 0 to a little over the highest any line goes. */
export function fittedAxes(s: EquilibriumSettings) {
  const spec = specOf(s)
  const last = Math.max(0, ...spec.stresses.map((d) => d.at))
  // How long the last shift takes, from a run long enough to see it settle.
  const { stretches } = run(spec, last + 40 * s.established)
  const final = stretches.at(-1)!
  const tail = final.settledAt === null ? 4 * s.established : final.settledAt - final.from
  // Nothing at all to draw still gets an axis to 1 mol/L.
  const top = Math.max(0, ...stretches.flatMap((st) => [...st.start, ...st.end])) || 1
  const blocks = (a: number, b: number, step: number) => Math.round((b - a) / step)
  /** Numbered every other line past 10 blocks, with a block added if the top one would go unnumbered. */
  const fit = (to: number) => {
    const [from, end, step] = niceRange(0, to, true)
    const n = blocks(from, end, step)
    const every = n > 10 ? 2 : 1
    return { from, to: n % every ? Number((end + step).toPrecision(12)) : end, step, every }
  }
  const x = fit(final.from + Math.max(2 * tail, s.established))
  // A little room over the highest line, so none runs along the grid's top edge.
  const y = fit(top * 1.04)
  // Never numbered so often that the numbers run together.
  const widest = Math.max(...Array.from({ length: blocks(x.from, x.to, x.step) + 1 }, (_, j) => textWidth(fmt(Number((x.from + j * x.step).toPrecision(12))), 14)))
  const xEvery = EVERY.find((n) => n && n >= x.every && n * CELL - 8 >= widest) ?? 10
  return {
    xFrom: String(x.from), xTo: String(x.to), xStep: String(x.step), xEvery,
    yFrom: String(y.from), yTo: String(y.to), yStep: String(y.step), yEvery: y.every,
  }
}

/** The grid moved down by `dy` to make room above it, its chart title staying at the top. */
function lowered<G extends GridLayout>(g: G, dy: number, titleBlank: boolean): G {
  if (!dy) return g
  return {
    ...g,
    height: g.height + dy,
    grid: { ...g.grid, y: g.grid.y + dy },
    hLines: g.hLines.map((y) => y + dy),
    minorH: g.minorH.map((y) => y + dy),
    xAxis: { ...g.xAxis, y: g.xAxis.y + dy },
    yAxis: { ...g.yAxis, y1: g.yAxis.y1 + dy, y2: g.yAxis.y2 + dy },
    numbers: g.numbers.map((n) => ({ ...n, y: n.y + dy })),
    labels: g.labels.map((l) => (l.kind === 'title' ? l : { ...l, y: l.y + dy })),
    // The chart title's write-on line, when there is one, is the first.
    blanks: g.blanks.map((b, k) => (titleBlank && k === 0 ? b : { ...b, y1: b.y1 + dy, y2: b.y2 + dy })),
  }
}

export function buildEquilibrium(s: EquilibriumSettings) {
  const axes = readAxes(s)
  const problems: Record<string, string | null> = { ...axes.problems }
  const { px: gridPx, box, ...flat } = layoutGrid(s, axes, { edges: true })
  const fs = flat.fs
  const LABEL_FS = fs * 1.05
  const rx = reactionOf(s.reaction)
  const all = stressesOf(s)
  const shown = all.filter((d) => d.at > 0 && d.at >= box.x0 - 1e-9 && d.at <= box.x1 + 1e-9)

  // The stresses' words go above the grid: centered over their lines when
  // they fit side by side; otherwise each to the right of its line's top,
  // the earlier ones a row higher, so no line runs through another's words.
  const ROW = LABEL_FS * 1.45
  const lineX = (d: Drawn) => gridPx({ x: d.at, y: 0 }).x
  const words = shown.map((d) => {
    const spans = d.text ? textSpans(d.text, LABEL_FS) : []
    return { d, x: lineX(d), spans, w: spans.reduce((w, sp) => w + textWidth(sp.text, sp.size), 0) }
  })
  const written = words.filter((w) => w.spans.length)
  let width = flat.width
  const centered = written.map((w) => {
    const mid = Math.max(PAD + w.w / 2, Math.min(w.x, Math.max(width - 4 - w.w / 2, PAD + w.w / 2)))
    return { ...w, x0: mid - w.w / 2, x1: mid + w.w / 2, at: mid, anchor: 'middle' as Anchor, row: 0 }
  })
  const fits = centered.every((w, k) => k === 0 || w.x0 >= centered[k - 1].x1 + 10)
  let placed = centered
  if (!fits) {
    placed = []
    for (const w of [...written].reverse()) {
      const x0 = w.x + 6
      const x1 = x0 + w.w
      let row = 0
      // Clear of the words already in the row, and of every later line that runs up past it.
      while (placed.some((p) => (p.row === row && p.x0 < x1 + 10) || (p.row > row && p.x > x0 - 4 && p.x < x1 + 4))) row++
      placed.unshift({ ...w, x0, x1, at: x0, anchor: 'start', row })
    }
  }
  const rows = placed.length ? Math.max(...placed.map((p) => p.row)) + 1 : 0
  const room = rows ? rows * ROW + 4 : 0
  for (const p of placed) width = Math.max(width, p.x1 + PAD)

  const grid = lowered(flat, room, s.titleMode === 'blank')
  const px = (p: Point): Point => ({ x: gridPx(p).x, y: gridPx(p).y + room })
  const area = grid.grid

  const bounds: Box = { x0: area.x + INSET, y0: area.y + INSET, x1: area.x + area.w - INSET, y1: area.y + area.h - INSET }
  const place = placer(bounds)
  for (const n of grid.numbers) place.box(textBox({ x: n.x, y: n.y, anchor: n.anchor ?? 'middle' }, textWidth(n.text, fs), fs))

  // Each stress's dashed line, from the time axis up to its words.
  const baseline = (row: number) => area.y - 8 - row * ROW
  const marks: StressMark[] = words.map((w) => {
    const p = placed.find((p) => p.d === w.d)
    const flag = p?.anchor === 'start'
    const top = !p ? area.y : flag ? baseline(p.row) - LABEL_FS * 0.75 : area.y - 2
    place.line([{ x: w.x, y: area.y }, { x: w.x, y: area.y + area.h }])
    return {
      slot: w.d.slot, line: { x1: w.x, y1: area.y + area.h, x2: w.x, y2: top },
      x: p?.at ?? w.x, y: baseline(p?.row ?? 0), anchor: p?.anchor ?? 'middle', spans: w.spans,
    }
  })

  // Every species' line from time 0 to the end of the time axis; a jump at a
  // stress is a vertical piece of the same line.
  const result = box.x1 > 0 ? run(specOf(s), box.x1) : null
  const stretches = result?.stretches ?? []
  const track = (i: number, of: Stretch[]) => of.flatMap((st) => st.samples.map((p) => ({ x: p.t, y: p.c[i] })))
  const curves: Curve[] = rx.species.map((_, i) => {
    const paths: string[] = []
    for (const piece of clipPath(track(i, stretches), box)) {
      const page = piece.map(px)
      paths.push(pathOf(page))
      // Labels keep off the line as a few longer pieces, so crossing it counts once, not once a pixel.
      place.line(page.filter((_, j) => j === 0 || j === page.length - 1 || j % 8 === 0))
    }
    return { index: i, color: s.color ? COLORS[INKS[i]] : COLORS.black, dash: SPECIES_DASHES[i], paths }
  })

  // Each species' formula beside its line where it first levels off: from
  // when the first approach is nearly over to the first stress.
  const formulas: (SpeciesLabel & { index: number; color: string })[] = []
  if (s.speciesLabels && stretches.length) {
    const first = stretches[0]
    const from = Math.min(first.settledAt ?? first.to, first.from + (first.to - first.from) * 0.6)
    const level = (i: number) => {
      const pts = track(i, [first]).filter((p) => p.x >= from)
      return clipPath(pts.length > 1 ? pts : track(i, [first]), box).flat().map(px)
    }
    rx.species.forEach((sp, i) => {
      const label = placeSpeciesLabel(place, level(i), sp.formula, LABEL_FS)
      if (label) formulas.push({ ...label, index: i, color: curves[i].color })
    })
  }

  // What the page says when the graph can't be drawn as set.
  const notes: string[] = []
  const name = (d: Drawn) => (all.length > 1 ? `Stress ${d.slot + 1}` : 'The stress')
  if (result && !result.reacts) notes.push('Nothing can react from these starting concentrations: a reactant and a product are both at 0.')
  for (const d of all) {
    if (d.at <= 0) notes.push(`${name(d)} needs a time after 0.`)
    else if (d.at > box.x1 + 1e-9) notes.push(`${name(d)} is at time ${fmt(d.at)}, past the end of the time axis (${fmt(box.x1)}).`)
  }
  const drawn = all.filter((d) => d.at > 0 && d.at <= box.x1 + 1e-9)
  stretches.forEach((st, n) => {
    const next = drawn[n]
    const before = drawn[n - 1]
    if (before && st.short > 1e-12) {
      notes.push(`${name(before)} removes ${sig(before.amount)} mol/L of ${formulaText(rx.species[before.species].formula)}, but only ${sig(before.amount - st.short)} mol/L is there, so all of it goes.`)
    }
    if (st.shift === 'none' || (st.settledAt !== null && st.settledAt <= st.to + 1e-9)) return
    // A stress at the same moment as the one before isn't early: the two act together.
    if (next && before && next.at === before.at) return
    if (next) notes.push(`${name(next)} comes at time ${fmt(next.at)}, before the system has settled. Move it later, or make equilibrium establish sooner.`)
    else notes.push(`The time axis ends at ${fmt(box.x1)}, before the system has settled. Make it longer, or fit the axes.`)
  })
  const top = Math.max(0, ...stretches.flatMap((st) => [...st.start, ...st.end]))
  if (top > box.y1 * (1 + 1e-9)) notes.push(`A line reaches ${sig(top)} mol/L, above the top of the y-axis (${fmt(box.y1)}).`)

  return {
    ...grid,
    width: round(width),
    height: round(grid.height),
    labelFs: LABEL_FS,
    curves,
    formulas,
    marks,
    notes,
    problems,
  }
}

export type EquilibriumLayout = ReturnType<typeof buildEquilibrium>
