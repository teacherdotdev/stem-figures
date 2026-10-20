// Lays out a potential energy diagram for EnergyFigure.svelte to draw: the
// $shared/graph grid with its y-axis numbered (or shape only) and the
// reaction coordinate never numbered; the curve through the levels (or, as
// a level diagram, the reactants and products as lines); a catalysed path,
// dashed, with a key naming both under the graph; the Ea, ΔH and reverse Ea
// arrows, with dashed lines carrying each level across to its arrow; and a
// label on each level and arrow, written, blank or left off, placed where it
// touches nothing ($shared/graph/labels, as Photosynthesis Rate's are).

import { readAxes, type GridSettings, type RangeSettings } from '$shared/graph/axes'
import { COLORS } from '$shared/graph/colors'
import { CELL, clipPath, layoutGrid, pathOf, round, type Gridlines, type Point } from '$shared/graph/grid'
import { LABEL_SCALE } from '$shared/labelSize'
import { DASHES, crosses, layoutKey, placer, textBox, textWidth, type Anchor, type Box, type KeyEntry, type Segment, type Spot } from '$shared/graph/labels'
import { textSpans, type Span } from '$shared/particles/key'
import { plainText } from '$shared/particles/keyText'
import {
  catalysedLevels, enthalpyChange, kindOf, levelXs, placementOf, profilePoints, rateDeterminingStep, stepsIn, stepsOf,
  type LevelKind, type Placement,
} from './profile'
import { LABEL_KEYS, LEVEL_WORDS, unitText, type ArrowLabel, type EnergySettings } from './settings'

const PAD = 14 // the figure's margin, as the grid's
const INSET = 4 // how far inside the grid's border labels stay
const BLANK_W = 70 // a write-on line for a label left blank
const LEVEL_GAP = 9 // from a level to its label, just past what the placer counts as close
const ARROW_GAP = 9 // from an arrow to its label
const OFFSET = 0.9 // how far an arrow moves aside from another in its way, in blocks
/** How far Grid.svelte's triangle arrowhead reaches past the end of its line. */
const TIP = 2.6
/** How far along the products' flat run the ΔH arrow is at least, in blocks. */
const DH_AT = 0.8
/** The labels' font size at medium, as the grid's numbers' (14) times 1.1. */
const BASE_LFS = 14 * 1.1

/** A level diagram: the reactants' line, the products' line, and the ΔH arrow between them, in blocks. */
const LEVEL_DIAGRAM = { width: 15, reactants: [1.5, 5.5], products: [9.5, 13.5], arrow: 7.5 } as const

/** How wide pieces of label text are, each at its own size. */
const spansWidth = (spans: Span[]) => spans.reduce((w, sp) => w + textWidth(sp.text, sp.size), 0)

/** A number as written on the figure, with a true minus sign. */
export const num = (v: number) => String(round(v)).replace('-', '−')
/** ΔH as written: its sign always shown, +60 or −30. */
export const signed = (v: number) => (round(v) > 0 ? `+${num(v)}` : num(v))

/** The word a name is written with in the middle of a sentence: "With enzyme" is "with enzyme", "Pt catalyst" stays. */
export const inSentence = (t: string) => (/^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t)

/** The two curves' names in the key. */
export const curveNames = (s: Pick<EnergySettings, 'uncatName' | 'catName'>) => [s.uncatName.trim() || 'Uncatalysed', s.catName.trim() || 'Catalysed']

/** The levels drawn: all of them as a curve; the reactants and products alone as a level diagram. */
export const drawnLevels = (s: EnergySettings) => (s.style === 'curve' ? s.levels : [s.levels[0], s.levels[s.levels.length - 1]])

/** Whether a catalysed path is drawn. */
export const hasCatalyst = (s: EnergySettings) => s.style === 'curve' && s.catalyst

/** Every energy drawn, for fitting the y-axis. */
const energiesOf = (s: EnergySettings) => [...drawnLevels(s), ...(hasCatalyst(s) ? [s.catTs] : [])]

/** What the teacher typed that doesn't make a reaction profile, by field: `level1` for the second level, `catTs`. */
export function checkLevels(s: EnergySettings): Record<string, string> {
  const problems: Record<string, string> = {}
  if (s.style !== 'curve') return problems
  const L = s.levels
  const name = (i: number) => {
    const kind = kindOf(i, L.length)
    if (kind === 'reactants') return `the reactants (${num(L[i])})`
    if (kind === 'products') return `the products (${num(L[i])})`
    const many = kind === 'ts' ? stepsOf(L) > 1 : stepsOf(L) > 2
    return `the ${kind === 'ts' ? 'transition state' : 'intermediate'}${many ? ` ${Math.ceil(i / 2)}` : ''} (${num(L[i])})`
  }
  for (let i = 1; i < L.length - 1; i++) {
    const [a, b] = [L[i - 1], L[i + 1]]
    if (kindOf(i, L.length) === 'ts' && (L[i] <= a || L[i] <= b))
      problems[`level${i}`] = `A transition state is the top of its step, so make it higher than ${name(i - 1)} and ${name(i + 1)}.`
    if (kindOf(i, L.length) === 'intermediate' && (L[i] >= a || L[i] >= b))
      problems[`level${i}`] = `An intermediate sits in the dip between two steps, so make it lower than ${name(i - 1)} and ${name(i + 1)}.`
  }
  if (s.catalyst) {
    const [r, p] = [L[0], L[L.length - 1]]
    const top = Math.max(...stepsIn(L).map((st) => st.ts))
    if (s.catTs <= Math.max(r, p)) problems.catTs = `The catalysed transition state is still the top of the path, so make it higher than the reactants (${num(r)}) and the products (${num(p)}).`
    else if (s.catTs >= top) problems.catTs = `A catalyst lowers the transition state, so make it lower than the uncatalysed one (${num(top)}).`
  }
  return problems
}

/**
 * A y-axis that fits every energy drawn, in tidy steps of 6 to 12 blocks,
 * with room above the highest for its label. It starts at 0 when every
 * energy is positive and 0 isn't far below them.
 */
export function fittedAxes(s: EnergySettings): Pick<RangeSettings, 'yFrom' | 'yTo' | 'yStep'> & { yEvery: number } {
  const es = energiesOf(s)
  const lo = Math.min(...es)
  const hi = Math.max(...es)
  const span = Math.max(hi - lo, Math.abs(hi) * 0.1, 1)
  const zero = lo >= 0 && lo <= span * 0.75
  const want = { lo: lo - span * 0.08, hi: hi + span * 0.2 }
  for (const k of [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6]) {
    for (const m of [1, 2, 2.5, 5]) {
      const step = m * 10 ** k
      const start = zero ? 0 : Math.floor(want.lo / step + 1e-9) * step
      const end = Math.ceil(want.hi / step - 1e-9) * step
      if (Math.round((end - start) / step) <= 12) return { yFrom: String(round(start)), yTo: String(round(end)), yStep: String(step), yEvery: 1 }
    }
  }
  return { yFrom: String(lo), yTo: String(hi), yStep: String(span), yEvery: 1 }
}

/** The settings the grid is laid out from: the reaction coordinate fixed and unnumbered, the y-axis as typed or, shape only, fitted. */
function gridSettingsOf(s: EnergySettings, width: number): GridSettings & RangeSettings {
  const shape = s.axes === 'shape'
  const y = shape ? fittedAxes(s) : { yFrom: s.yFrom, yTo: s.yTo, yStep: s.yStep, yEvery: s.yEvery }
  return {
    ...s,
    ...y,
    yEvery: shape ? 0 : y.yEvery,
    xFrom: '0', xTo: String(width), xStep: '1', xEvery: 0,
    xLabel: '', xLabelMode: 'none', yLabel: '', yLabelMode: 'none', xStartCap: 'none', yStartCap: 'none',
    minor: shape || s.gridlines === 'none' ? 0 : s.minor,
  }
}

/** Which arrow: forward Ea (one per step), the catalysed Ea, ΔH or the reverse Ea. */
export type ArrowKey = 'ea' | 'catEa' | 'dh' | 'revEa'

/** The arrows' settings keys: whether each is drawn, and how it's labeled. */
export const ARROW_KEYS = {
  ea: ['eaArrow', 'eaLabel'],
  catEa: ['catEaArrow', 'catEaLabel'],
  dh: ['dhArrow', 'dhLabel'],
  revEa: ['revEaArrow', 'revEaLabel'],
} as const satisfies Record<ArrowKey, readonly [keyof EnergySettings, keyof EnergySettings]>

/** An arrow along the energy axis, in the graph's numbers: at x, from one energy to another. */
type Arrow = { key: ArrowKey; x: number; from: number; to: number; symbol: string; value: number; label: ArrowLabel }

/** The symbol an arrow is labeled with, typed as keyText writes it: E_a, E_{a1}, ΔH. */
function arrowSymbol(s: EnergySettings, key: ArrowKey, step = 0) {
  const steps = stepsOf(s.levels)
  const [uncat, cat] = curveNames(s).map(inSentence)
  if (key === 'dh') return 'ΔH'
  if (key === 'revEa') return `${steps > 1 ? `E_{a${steps}}` : 'E_a'} (reverse)`
  if (key === 'catEa') return `E_a (${cat})`
  if (steps > 1) return `E_{a${step + 1}}`
  return hasCatalyst(s) ? `E_a (${uncat})` : 'E_a'
}

/** The arrows drawn, with where each goes along the reaction coordinate and the levels it runs between. */
function arrowsOf(s: EnergySettings, p: Layout): Arrow[] {
  const L = drawnLevels(s)
  const out: Arrow[] = []
  const add = (key: ArrowKey, x: number, from: number, to: number, step = 0) => {
    const [show, label] = ARROW_KEYS[key]
    if (s[show] && Math.abs(to - from) > 1e-9) out.push({ key, x, from, to, symbol: arrowSymbol(s, key, step), value: to - from, label: s[label] as ArrowLabel })
  }
  if (s.style === 'levels') {
    add('dh', LEVEL_DIAGRAM.arrow, L[0], L[1])
    return out
  }
  const xs = levelXs(L, p)
  // Two arrows are in each other's way when they're close along the
  // reaction coordinate and overlap up the energy axis; the later one moves aside.
  const clash = (x: number, a: number, b: number) =>
    out.some((o) => Math.abs(o.x - x) < OFFSET * 0.6 && Math.min(a, b) < Math.max(o.from, o.to) && Math.max(a, b) > Math.min(o.from, o.to))
  const aside = (x: number, a: number, b: number, sides: number[]) => sides.map((k) => x + k * OFFSET).find((at) => !clash(at, a, b)) ?? x
  for (const st of stepsIn(L)) if (st.ea > 0) add('ea', xs[st.index], st.before, st.ts, (st.index - 1) / 2)
  if (hasCatalyst(s) && s.catTs > L[0]) {
    const mid = (p.start + p.end) / 2
    add('catEa', aside(mid, L[0], s.catTs, [0, 1, -1, 2, -2]), L[0], s.catTs)
  }
  add('dh', p.dh, L[0], L[L.length - 1])
  const last = stepsIn(L).at(-1)!
  if (last.eaReverse > 0) add('revEa', aside(xs[last.index], last.after, last.ts, [1, -1, 2]), last.after, last.ts)
  return out
}

/** A level's label as written: the teacher's text or this page's word, numbered when there's more than one of its kind. */
export function levelText(s: EnergySettings, kind: LevelKind, nth: number, count: number) {
  const [textKey] = LABEL_KEYS[kind]
  const words = s[textKey].trim() || LEVEL_WORDS[kind]
  return count > 1 ? `${words} ${nth}` : words
}

/**
 * A label on the figure: its pieces of text (subscripts lowered), or a
 * blank line under where it would be, and a line back to its arrow when
 * there was no room beside it.
 */
export type Label = Spot & { rows: Span[][]; box: Box; blank?: Segment; leader?: Segment }

/** The text an arrow is labeled with: its symbol, the symbol and value, its letter or number, or nothing. */
function arrowText(s: EnergySettings, a: Arrow, mark: string) {
  if (a.label === 'symbol') return a.symbol
  if (a.label === 'value') return `${a.symbol} = ${a.key === 'dh' ? signed(a.value) : num(a.value)} ${unitText(s)}`
  return a.label === 'mark' ? mark : ''
}

/** Where the curve goes along the reaction coordinate, and the ΔH arrow on the products' flat run. */
type Layout = Placement & { dh: number }

/**
 * Where a reaction of these settings is laid along the reaction coordinate:
 * the ΔH arrow far enough along the products' flat run for its label to go
 * between it and the curve, and the run long enough after it for the
 * products' label.
 */
function placementFor(s: EnergySettings): Layout {
  const lfs = BASE_LFS * LABEL_SCALE[s.labelSize]
  const widthOf = (mode: string, words: string) => (mode === 'none' ? 0 : mode === 'blank' ? BLANK_W : spansWidth(textSpans(words, lfs)) + 2)
  const dhText = arrowText(s, { key: 'dh', x: 0, from: 0, to: 0, symbol: 'ΔH', value: enthalpyChange(s.levels), label: s.dhLabel }, 'A')
  const dh = s.dhArrow ? widthOf(s.dhLabel, dhText) : 0
  const products = widthOf(s.productsLabelMode, levelText(s, 'products', 1, 1))
  const at = Math.max(DH_AT, (ARROW_GAP * 2 + dh) / CELL)
  const p = placementOf(stepsOf(s.levels), at + (products + 2 * INSET + 8) / CELL)
  return { ...p, dh: p.end + at }
}

export function buildDiagram(s: EnergySettings) {
  const curve = s.style === 'curve'
  const L = drawnLevels(s)
  const p: Layout = curve ? placementFor(s) : { start: 0, end: 0, half: 0, width: LEVEL_DIAGRAM.width, dh: LEVEL_DIAGRAM.arrow }
  const shape = s.axes === 'shape'
  const gs = gridSettingsOf(s, p.width)
  const axes = readAxes(gs)
  const problems: Record<string, string | null> = { ...axes.problems, ...checkLevels(s) }
  const { px, box, ...grid } = layoutGrid(gs, axes, { edges: true })
  const fs = grid.fs
  const LFS = fs * 1.1 // label font size
  const ROW = LFS * 1.15 // between the lines of a label on two
  const area = grid.grid
  const unit = unitText(s)
  const catalysed = hasCatalyst(s)

  // Say when the diagram runs off the energy axis; the Fit button fixes it.
  const es = energiesOf(s)
  const [lo, hi] = [Math.min(...es), Math.max(...es)]
  if (!shape && (lo < box.y0 - 1e-9 || hi > box.y1 + 1e-9))
    problems.fit = `The diagram goes from ${num(lo)} to ${num(hi)} ${unit}, past the energy axis (${num(box.y0)} to ${num(box.y1)}).`

  // The curves, cut to the grid: the reaction, and the catalysed path dashed.
  const ink = { main: COLORS[s.color], cat: COLORS[s.catColor] }
  const pathsOf = (pts: Point[]) => clipPath(pts, box).map((run) => run.map(px))
  const mainRuns = curve ? pathsOf(profilePoints(L, p)) : []
  const catRuns = catalysed ? pathsOf(profilePoints(catalysedLevels(L, s.catTs), p)) : []
  const curves = [
    ...(curve ? [{ index: 0, paths: mainRuns.map(pathOf), color: ink.main, dash: DASHES[0] as string | undefined }] : []),
    ...(catalysed ? [{ index: 1, paths: catRuns.map(pathOf), color: ink.cat, dash: DASHES[1] as string | undefined }] : []),
  ]

  // A level diagram's lines: the reactants on the left, the products on the right.
  const bars: Segment[] = []
  if (!curve) {
    for (const [[x0, x1], e] of [[LEVEL_DIAGRAM.reactants, L[0]], [LEVEL_DIAGRAM.products, L[1]]] as const) {
      const [a, b] = [px({ x: x0, y: e }), px({ x: x1, y: e })]
      if (e >= box.y0 - 1e-9 && e <= box.y1 + 1e-9) bars.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
    }
  }

  // The arrows, and the dashed lines carrying each level across to them.
  const arrows = arrowsOf(s, p)
  const onAxis = (e: number) => e >= box.y0 - 1e-9 && e <= box.y1 + 1e-9
  const xs = curve ? levelXs(L, p) : []
  /** Where a level's own line ends nearest x: its plateau's end, its peak or dip, or its line in a level diagram. */
  const levelEdge = (e: number, x: number) => {
    if (!curve) {
      const [r0, r1] = LEVEL_DIAGRAM.reactants
      const [p0, p1] = LEVEL_DIAGRAM.products
      if (Math.abs(e - L[0]) < 1e-9 && x >= r0) return Math.min(x, r1)
      if (Math.abs(e - L[1]) < 1e-9) return Math.max(Math.min(x, p1), p0)
      return x
    }
    if (Math.abs(e - L[0]) < 1e-9 && x >= p.start) return p.start
    if (Math.abs(e - L[L.length - 1]) < 1e-9 && x <= p.end) return p.end
    // A peak or a dip: the nearest one at this energy, the catalysed peak included.
    const points = [...xs.slice(1, -1).map((at, i) => ({ at, e: L[i + 1] })), ...(catalysed ? [{ at: (p.start + p.end) / 2, e: s.catTs }] : [])]
    const same = points.filter((q) => Math.abs(q.e - e) < 1e-9).sort((a, b) => Math.abs(a.at - x) - Math.abs(b.at - x))
    return same[0]?.at ?? x
  }
  const guideRuns: { e: number; x0: number; x1: number }[] = []
  const guide = (e: number, x: number) => {
    const edge = levelEdge(e, x)
    if (Math.abs(edge - x) < 1e-6 || !onAxis(e)) return
    const [x0, x1] = [Math.min(edge, x), Math.max(edge, x)]
    // One dashed line per level and side: a longer one takes in a shorter.
    const same = guideRuns.find((g) => Math.abs(g.e - e) < 1e-9 && g.x0 <= x1 + 1e-9 && x0 <= g.x1 + 1e-9)
    if (same) Object.assign(same, { x0: Math.min(same.x0, x0), x1: Math.max(same.x1, x1) })
    else guideRuns.push({ e, x0, x1 })
  }
  for (const a of arrows) {
    guide(a.from, a.x)
    guide(a.to, a.x)
  }
  const guides: Segment[] = s.guides
    ? guideRuns.map((g) => {
        const [a, b] = [px({ x: g.x0, y: g.e }), px({ x: g.x1, y: g.e })]
        return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
      })
    : []

  // Each arrow on the drawing, cut to the grid, its line stopping short so
  // the arrowhead's tip just touches the level.
  type Drawn = Arrow & { line: Segment; heads: { start: boolean; end: boolean }; top: number; bottom: number }
  const drawn: Drawn[] = []
  for (const a of arrows) {
    const clamp = (e: number) => Math.min(box.y1, Math.max(box.y0, e))
    const [from, to] = [px({ x: a.x, y: clamp(a.from) }), px({ x: a.x, y: clamp(a.to) })]
    const length = Math.abs(to.y - from.y)
    if (length < 1) continue
    const dir = Math.sign(to.y - from.y)
    const heads = { start: s.bothHeads && onAxis(a.from), end: onAxis(a.to) }
    const room = (n: number) => Math.min(TIP, length / (2 * n))
    const n = Number(heads.start) + Number(heads.end)
    const line = {
      x1: from.x, y1: from.y + (heads.start ? dir * room(n) : 0),
      x2: to.x, y2: to.y - (heads.end ? dir * room(n) : 0),
    }
    drawn.push({ ...a, line, heads, top: Math.min(from.y, to.y), bottom: Math.max(from.y, to.y) })
  }

  // Everything a label keeps off: the curves, the level lines, the arrows
  // and (if it can) the dashed lines, then each label placed before it.
  const bounds: Box = { x0: area.x + INSET, y0: area.y + INSET, x1: area.x + area.w - INSET, y1: area.y + area.h - INSET }
  const place = placer(bounds)
  for (const run of [...mainRuns, ...catRuns]) place.line(run)
  for (const b of bars) place.line([{ x: b.x1, y: b.y1 }, { x: b.x2, y: b.y2 }])
  for (const a of drawn) place.line([{ x: a.line.x1, y: a.top }, { x: a.line.x1, y: a.bottom }])
  for (const g of guides) place.line([{ x: g.x1, y: g.y1 }, { x: g.x2, y: g.y2 }], true)

  const labels: Label[] = []
  const put = (spots: Spot[], text: string, blank: boolean) => {
    const spans = blank ? [] : textSpans(text, LFS)
    const spot = place.place(spots, blank ? BLANK_W : spansWidth(spans) + 2, LFS)
    labels.push({ x: spot.x, y: spot.y, anchor: spot.anchor, rows: blank ? [] : [spans], box: spot.box, blank: blank ? { x1: spot.box.x0, y1: spot.y, x2: spot.box.x1, y2: spot.y } : undefined })
  }
  /** Baselines putting a label just above, or just below, a line at y. */
  const above = (y: number, row = 0) => y - LEVEL_GAP - LFS * 0.3 - row * LFS * 1.25
  const below = (y: number, row = 0) => y + LEVEL_GAP + LFS * 0.78 + row * LFS * 1.25

  // The level labels: each plateau's or line's above it, a transition
  // state's over its peak, an intermediate's under its dip.
  const levelSpots = (i: number): Spot[] => {
    const kind = curve ? kindOf(i, L.length) : i === 0 ? 'reactants' : 'products'
    const e = L[i]
    if (curve && !onAxis(e)) return []
    if (!curve) {
      const [x0, x1] = i === 0 ? LEVEL_DIAGRAM.reactants : LEVEL_DIAGRAM.products
      const [a, b] = [px({ x: x0, y: e }), px({ x: x1, y: e })]
      const mid = (a.x + b.x) / 2
      return [0, 1, 2].flatMap((row) => [
        { x: mid, y: above(a.y, row), anchor: 'middle' as Anchor },
        { x: mid, y: below(a.y, row), anchor: 'middle' as Anchor },
      ])
    }
    const at = px({ x: xs[i], y: e })
    if (kind === 'reactants' || kind === 'products') {
      // Along its flat run, clear of the ΔH arrow on the products' run.
      const [x0, x1] = kind === 'reactants' ? [area.x, px({ x: p.start, y: e }).x] : [px({ x: p.end, y: e }).x, area.x + area.w]
      const dh = drawn.find((a) => a.key === 'dh')
      const free = kind === 'products' && dh ? [dh.line.x1, x1] : [x0, x1]
      const spots: Spot[] = []
      for (const row of [0, 1]) {
        for (const y of [above(at.y, row), below(at.y, row)]) {
          spots.push(
            { x: (free[0] + free[1]) / 2, y, anchor: 'middle' },
            { x: (x0 + x1) / 2, y, anchor: 'middle' },
            kind === 'reactants' ? { x: x0 + INSET + 2, y, anchor: 'start' } : { x: x1 - INSET - 2, y, anchor: 'end' },
            kind === 'reactants' ? { x: x1, y, anchor: 'end' } : { x: x0, y, anchor: 'start' },
          )
        }
      }
      return spots
    }
    if (kind === 'ts') {
      return [0, 1, 2].flatMap((row) => [
        { x: at.x, y: above(at.y, row), anchor: 'middle' as Anchor },
        { x: at.x - 4, y: above(at.y, row), anchor: 'end' as Anchor },
        { x: at.x + 4, y: above(at.y, row), anchor: 'start' as Anchor },
      ])
    }
    return [0, 1, 2].flatMap((row) => [
      { x: at.x, y: below(at.y, row), anchor: 'middle' as Anchor },
      { x: at.x, y: above(at.y, row), anchor: 'middle' as Anchor },
      { x: at.x - 4, y: below(at.y, row), anchor: 'end' as Anchor },
      { x: at.x + 4, y: below(at.y, row), anchor: 'start' as Anchor },
    ])
  }
  // The arrows' labels: beside each, as near its middle as there's room.
  const markOrder = drawn.filter((a) => a.label === 'mark')
  const markText = (a: Drawn) => {
    const k = markOrder.indexOf(a)
    return s.marks === 'numbers' ? String(k + 1) : String.fromCharCode(65 + k)
  }
  for (const a of drawn) {
    if (a.label === 'none') continue
    const text = arrowText(s, a, markText(a))
    const x = a.line.x1
    // Each label starts on its arrow's right, or its left when another Ea
    // arrow is just to the right (the catalysed or reverse Ea's, moved
    // aside); ΔH's on its left, between it and the curve, with the products'
    // label on its right.
    const left = a.key === 'dh' || drawn.some((o) => o !== a && o.key !== 'dh' && o.line.x1 > x && o.line.x1 - x < CELL * OFFSET * 1.5)
    const blank = a.label === 'blank'
    // A long label can be written on two lines: "Eₐ (catalysed)" over "= 50 kJ/mol".
    const cut = text.search(/ = | \(/)
    const ways = [blank ? [] : [textSpans(text, LFS)], ...(cut > 0 && !blank ? [[text.slice(0, cut), text.slice(cut + 1)].map((t) => textSpans(t, LFS))] : [])]
    const optionsOf = (rows: Span[][], spot: Spot) => {
      const w = blank ? BLANK_W : Math.max(...rows.map(spansWidth)) + 2
      const b = textBox(spot, w, LFS)
      return { ...spot, rows, box: { ...b, y1: b.y1 + Math.max(0, rows.length - 1) * ROW } }
    }
    /** The first baseline for a label `rows` high, centered at y. */
    const top = (y: number, rows: Span[][]) => y + LFS * 0.3 - (Math.max(0, rows.length - 1) * ROW) / 2
    const beside = (rows: Span[][]) => {
      const spots: ReturnType<typeof optionsOf>[] = []
      for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9]) {
        const y = top(a.top + (a.bottom - a.top) * t, rows)
        const sides: Spot[] = [{ x: x - ARROW_GAP, y, anchor: 'end' }, { x: x + ARROW_GAP, y, anchor: 'start' }]
        spots.push(...(left ? sides : sides.reverse()).map((sp) => optionsOf(rows, sp)))
      }
      return place.choose(spots, false)
    }
    // No room beside it (a long label in a narrow peak): the nearest clear
    // spot level with the arrow, with a thin line back to it that crosses no
    // other arrow.
    const others = drawn.filter((o) => o !== a).map((o) => ({ x1: o.line.x1, y1: o.top, x2: o.line.x1, y2: o.bottom }))
    const away = (rows: Span[][]) => {
      const far: (ReturnType<typeof optionsOf> & { leader: Segment; d: number })[] = []
      for (const [k, t] of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8].entries()) {
        const mid = a.top + (a.bottom - a.top) * t
        for (let d = ARROW_GAP + 14; d < area.w; d += 6) {
          for (const side of left ? [-1, 1] : [1, -1]) {
            const at = x + side * d
            const leader = { x1: x, y1: mid, x2: at - side * 3, y2: mid }
            const along = { x0: Math.min(leader.x1, leader.x2) + 1, y0: mid - 0.5, x1: Math.max(leader.x1, leader.x2) - 1, y1: mid + 0.5 }
            if (others.some((o) => crosses(o, along))) continue
            far.push({ ...optionsOf(rows, { x: at, y: top(mid, rows), anchor: side < 0 ? 'end' : 'start' }), leader, d: d + k * 12 })
          }
        }
      }
      return far.sort((m, n) => m.d - n.d).find((c) => place.choose([c], false).score === 0)
    }
    // Beside it on one line, then two; then away from it on one line, then two.
    const near = ways.map(beside)
    const chosen: ReturnType<typeof optionsOf> & { leader?: Segment } = near.find((o) => o.score === 0) ?? ways.map(away).find(Boolean) ?? near[0]
    place.keep(chosen.box)
    const leader = chosen.leader
    if (leader) place.line([{ x: leader.x1, y: leader.y1 }, { x: leader.x2, y: leader.y2 }])
    labels.push({
      x: chosen.x, y: chosen.y, anchor: chosen.anchor, rows: chosen.rows, box: chosen.box, leader,
      blank: blank ? { x1: chosen.box.x0, y1: chosen.y, x2: chosen.box.x1, y2: chosen.y } : undefined,
    })
  }

  const counts = { reactants: 1, products: 1, ts: stepsOf(L), intermediate: stepsOf(L) - 1 }
  // Then the level labels, round the arrows': transition states first,
  // then the plateaus, then the intermediates.
  const order = curve
    ? [...L.keys()].sort((i, j) => ['ts', 'reactants', 'products', 'intermediate'].indexOf(kindOf(i, L.length)) - ['ts', 'reactants', 'products', 'intermediate'].indexOf(kindOf(j, L.length)))
    : [0, 1]
  for (const i of order) {
    const kind: LevelKind = curve ? kindOf(i, L.length) : i === 0 ? 'reactants' : 'products'
    const [, modeKey] = LABEL_KEYS[kind]
    const mode = s[modeKey]
    if (mode === 'none') continue
    const spots = levelSpots(i)
    if (!spots.length) continue
    const nth = kind === 'ts' ? (i + 1) / 2 : kind === 'intermediate' ? i / 2 : 1
    put(spots, levelText(s, kind, nth, curve ? counts[kind] : 1), mode === 'blank')
  }

  // The key, when there's a catalysed path to tell apart.
  let keyEntries: KeyEntry[] = []
  let width = grid.width
  let height = grid.height
  if (catalysed) {
    const names = curveNames(s)
    const key = layoutKey(names.map((name, index) => ({ index, name })), {
      midX: area.x + area.w / 2, wrap: Math.max(area.w, 360), top: grid.height - PAD + 2, left: PAD, fs, labelFs: LFS,
    })
    keyEntries = key.entries
    width = Math.max(width, key.right + PAD)
    height = key.bottom + PAD
  }

  const gridlines: Gridlines = shape ? 'none' : s.gridlines
  return {
    ...grid,
    // With no numbers along the reaction coordinate, the lowest energy's
    // number goes level with its line like the rest, not above it.
    numbers: grid.numbers.map((n) => (Math.abs(n.y - (grid.xAxis.y - 5)) < 1e-6 ? { ...n, y: grid.xAxis.y + fs * 0.35 } : n)),
    width: round(width),
    height: round(height),
    // The reaction coordinate has no scale, so no lines or ticks along it;
    // shape only has none up the energy axis either.
    vLines: [] as number[],
    minorV: [] as number[],
    hLines: shape ? [] : grid.hLines,
    minorH: shape ? [] : grid.minorH,
    gridlines,
    gridSettings: gs,
    lfs: LFS,
    row: ROW,
    curves,
    bars,
    barColor: ink.main,
    guides,
    arrows: drawn.map((a) => ({ key: a.key, line: a.line, heads: a.heads })),
    words: labels,
    keyEntries,
    problems,
  }
}

export type DiagramLayout = ReturnType<typeof buildDiagram>

/** A symbol written out in plain characters: E_{a1} is Eₐ₁. */
const plainSymbol = (t: string) => plainText(t.replace(/E_\{a(\d)\}/g, 'Eₐ_$1').replace(/E_a/g, 'Eₐ'))

/** An energy with its unit: "120 kJ/mol". */
const withUnit = (s: EnergySettings, v: number) => `${num(v)} ${unitText(s)}`

/**
 * The answer key: ΔH with its sign and whether the reaction is exothermic
 * or endothermic; the forward and reverse activation energies (each step's,
 * and the intermediates between, for a mechanism); the catalysed ones; and
 * the rate-determining step when it's clear cut. Values left blank on the
 * figure are here too: this is for the teacher.
 */
export function answerLines(s: EnergySettings): string[] {
  const L = s.levels
  const dh = enthalpyChange(L)
  const kind = dh < 0 ? 'exothermic' : dh > 0 ? 'endothermic' : 'neither exothermic nor endothermic'
  const out = [`ΔH = ${signed(dh)} ${unitText(s)}: ${kind}`]
  if (s.style !== 'curve' || Object.keys(checkLevels(s)).some((k) => k.startsWith('level'))) return out
  const steps = stepsIn(L)
  if (steps.length === 1) {
    out.push(`Eₐ (forward) = ${withUnit(s, steps[0].ea)}`, `Eₐ (reverse) = ${withUnit(s, steps[0].eaReverse)}`)
  } else {
    steps.forEach((st, k) => {
      out.push(`Step ${k + 1}: Eₐ = ${withUnit(s, st.ea)} (reverse ${withUnit(s, st.eaReverse)})`)
      if (k < steps.length - 1) out.push(`Intermediate${steps.length > 2 ? ` ${k + 1}` : ''} at ${withUnit(s, st.after)}`)
    })
    const rds = rateDeterminingStep(L)
    if (rds !== null) out.push(`Rate-determining step: step ${rds + 1}, with the highest activation energy`)
  }
  if (s.catalyst && !checkLevels(s).catTs) {
    const [uncat, cat] = curveNames(s).map(inSentence)
    const ea = s.catTs - L[0]
    const top = Math.max(...steps.map((st) => st.ts))
    out.push(
      `Eₐ (${cat}) = ${withUnit(s, ea)} forward, ${withUnit(s, s.catTs - L[L.length - 1])} reverse: both ${withUnit(s, top - s.catTs)} lower than ${uncat}; ΔH is the same`,
    )
  }
  return out
}

/**
 * What the figure shows, for screen readers: the chart title or what kind
 * of diagram it is, and each arrow as labeled. A value left blank, lettered
 * or as a symbol isn't given, so the label never answers the question.
 */
export function describe(s: EnergySettings): string {
  const L = s.levels
  const steps = stepsOf(L)
  const title = s.titleMode === 'text' && s.title.trim() ? s.title.trim() : ''
  const what = s.style === 'levels' ? 'Energy level diagram' : `Potential energy diagram${steps > 1 ? ` of a ${steps}-step reaction` : ''}`
  const parts: string[] = []
  if (hasCatalyst(s)) parts.push(`${curveNames(s).join(' and ')} paths`)
  const arrows = arrowsOf(s, placementFor(s))
  for (const a of arrows) {
    const symbol = plainSymbol(a.symbol)
    if (a.label === 'value') parts.push(`${symbol} = ${a.key === 'dh' ? signed(a.value) : num(a.value)} ${unitText(s)}`)
    else if (a.label === 'symbol') parts.push(`an arrow for ${symbol}`)
    else if (a.label === 'mark') parts.push(s.marks === 'numbers' ? 'a numbered arrow' : 'a lettered arrow')
    else if (a.label === 'blank') parts.push('an arrow with a blank to label')
  }
  return [title || what, parts.join(', ')].filter(Boolean).join(': ')
}
