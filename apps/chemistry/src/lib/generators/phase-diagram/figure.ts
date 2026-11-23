// Lays out a phase diagram for PhaseFigure.svelte to draw: the $shared/graph
// grid (numbered, for Your own substance on a grid, or with no numbers or
// gridlines for a diagram not to scale); the sublimation curve, fusion line
// and vaporization curve through the diagram's places (./phase.ts); dots at
// the triple and critical points with dashed lines to the axes; the 1 atm
// line with a dot and a dashed line down where it crosses each boundary;
// and the labels: the regions, the points and the 1 atm crossings placed
// where they touch nothing ($shared/graph/labels), the boundaries' names
// written along them, and, not to scale, the values at the axes
// ($shared/graph/axisMarks).

import { readAxes, type GridSettings, type RangeSettings } from '$shared/graph/axes'
import { guidesFrom, rowsUnder, spread } from '$shared/graph/axisMarks'
import { COLORS } from '$shared/graph/colors'
import { clipPath, layoutGrid, pathOf, round, type Gridlines, type Point } from '$shared/graph/grid'
import { besidePoint, placer, textBox, textWidth, type Anchor, type Box, type Segment, type Spot } from '$shared/graph/labels'
import { seededRandom } from '$shared/particles/random'
import { niceRange } from '$lib/shared/niceRange'
import {
  MAX_K, P_UNIT_TEXT, T_UNIT_TEXT, atmIn, bendThrough, crossings, fromKelvin, fromPascal, fusion, meltingAt, run, sublimation,
  sublimationBend, vaporization, type Boundary, type Shape,
} from './phase'
import { onGrid, substanceName, substanceOf, type LabelMode, type PhaseSettings } from './settings'

const INSET = 4 // how far inside the grid's border labels stay
const BLANK_W = 70 // a write-on line for a label left blank
const MARK_BLANK_W = 54 // a write-on line at an axis
const DOT = 4.5 // the dots at the triple and critical points and on the 1 atm line
const SMALL_DOT = 3 // the dot a boundary's letter points at
/** The labels' font size at medium, as the grid's numbers' (14) times 1.1. */
const LABEL_SCALE_UP = 1.1

/** A diagram not to scale, in blocks: where its points sit, and how its lines run. */
const SCHEMATIC = {
  width: 12, height: 10,
  /** With the supercritical region marked, room right of and above the critical point for its name. */
  wide: { width: 14, height: 11 },
  triple: { x: 4.5, y: 2.5 },
  critical: { x: 10, y: 8 },
  /** How high 1 atm is; a triple point above 1 atm swaps heights with it. */
  atm: 4.5,
  /** How far the fusion line leans over its height: far more than a real one. */
  lean: 1.2,
  bend: 2,
}

// The values ------------------------------------------------------------------

/** A number as written on the figure, with a true minus sign and no float noise: as typed, to 6 significant figures. */
export const num = (v: number) => String(Number(v.toPrecision(6))).replace('-', '−')
const fixed = (v: number, places: number) => {
  const t = v.toFixed(places)
  return (Number(t) === 0 ? t.replace('-', '') : t).replace('-', '−')
}
/** A pressure to 3 significant figures, keeping a final zero: 0.00604, 48.0, 218, 3,400, 22,100. */
export const sig3 = (v: number) => {
  const r = Number(v.toPrecision(3))
  return Math.abs(r) >= 1000 ? r.toLocaleString('en-US') : v.toPrecision(3).replace('-', '−')
}

/** The diagram's values in the units chosen, and each as written on the figure. */
export interface Values {
  tripleT: number
  tripleP: number
  critT: number
  critP: number
  /** At 1 atm: where it melts and boils, or, with the triple point above 1 atm, sublimes. Null where not known apart from the triple point. */
  nmp: number | null
  nbp: number | null
  sublimes: number | null
  atm: number
  lean: 'left' | 'right'
  text: { tripleT: string; tripleP: string; critT: string; critP: string; nmp: string; nbp: string; sublimes: string; atm: string }
}

export function valuesOf(s: PhaseSettings): Values {
  const tu = T_UNIT_TEXT[s.tUnit]
  const pu = P_UNIT_TEXT[s.pUnit]
  const atm = atmIn(s.pUnit)
  const atmText = s.pUnit === 'atm' ? '1 atm' : '101.3 kPa'
  const sub = substanceOf(s)
  if (!sub) {
    const t = (v: number) => `${num(v)} ${tu}`
    const p = (v: number) => `${num(v)} ${pu}`
    return {
      tripleT: s.tripleT, tripleP: s.tripleP, critT: s.critT, critP: s.critP, nmp: s.nmp, nbp: s.nbp, sublimes: null, atm,
      lean: s.nmp < s.tripleT ? 'left' : 'right',
      // A melting point typed the same as the triple point's temperature is written once, at the triple point.
      text: { tripleT: t(s.tripleT), tripleP: p(s.tripleP), critT: t(s.critT), critP: p(s.critP), nmp: s.nmp === s.tripleT ? '' : t(s.nmp), nbp: t(s.nbp), sublimes: '', atm: atmText },
    }
  }
  const T = (k: number) => fromKelvin(k, s.tUnit)
  const P = (pa: number) => fromPascal(pa, s.pUnit)
  // Temperatures to 0.1°, or 0.01° where that tells the triple point from
  // the normal melting point (water: 0.01 °C and 0.00 °C).
  const close = sub.nmp !== undefined && fixed(T(sub.nmp), 1) === fixed(T(sub.triple.T), 1) && fixed(T(sub.nmp), 2) !== fixed(T(sub.triple.T), 2)
  const t = (k: number | undefined, places = 1) => (k === undefined ? '' : `${fixed(T(k), places)} ${tu}`)
  const p = (pa: number) => `${sig3(P(pa))} ${pu}`
  return {
    tripleT: T(sub.triple.T), tripleP: P(sub.triple.P), critT: T(sub.critical.T), critP: P(sub.critical.P),
    nmp: sub.nmp === undefined ? null : T(sub.nmp), nbp: sub.nbp === undefined ? null : T(sub.nbp),
    sublimes: sub.sublimes === undefined ? null : T(sub.sublimes), atm,
    lean: sub.fusion,
    text: {
      tripleT: t(sub.triple.T, close ? 2 : 1), tripleP: p(sub.triple.P), critT: t(sub.critical.T), critP: p(sub.critical.P),
      nmp: t(sub.nmp, close ? 2 : 1), nbp: t(sub.nbp), sublimes: t(sub.sublimes), atm: atmText,
    },
  }
}

/** Whether the substance's triple point is above 1 atm, so that at 1 atm its solid sublimes. */
export const sublimesAtOneAtm = (v: Values) => v.tripleP > v.atm

/**
 * What the teacher typed for their own substance that doesn't make a phase
 * diagram, by field. On a grid, also a fusion line that leaves the side of
 * the grid before it reaches the top.
 */
export function checkDiagram(s: PhaseSettings): Record<string, string> {
  const problems: Record<string, string> = {}
  if (s.substance !== 'custom') return problems
  const v = valuesOf(s)
  const tu = T_UNIT_TEXT[s.tUnit]
  const t = (x: number) => `${num(Math.round(x * 100) / 100)} ${tu}`
  if (s.tUnit === 'K' && Math.min(s.tripleT, s.critT, s.nmp, s.nbp) <= 0) {
    for (const key of ['tripleT', 'critT', 'nmp', 'nbp'] as const) if (s[key] <= 0) problems[key] = 'A temperature in kelvin is above 0.'
    return problems
  }
  if (s.tripleP <= 0) problems.tripleP = 'The triple point’s pressure has to be above 0.'
  else if (s.tripleP >= v.atm) problems.tripleP = `Your own substance has to be a liquid somewhere along the ${v.text.atm} line, so make its triple point’s pressure less than ${v.text.atm}. (Carbon dioxide shows a solid that sublimes.)`
  if (s.critT <= s.tripleT) problems.critT = `The critical point is hotter than the triple point, so make this higher than ${v.text.tripleT}.`
  if (s.critP <= s.tripleP) problems.critP = `The critical point is at a higher pressure than the triple point, so make this more than ${v.text.tripleP}.`
  else if (s.critP <= v.atm) problems.critP = `The vaporization curve has to cross the ${v.text.atm} line, so make the critical pressure more than ${v.text.atm}.`
  if (Object.keys(problems).length) return problems

  // At 1 atm the vaporization curve is this far up its pressures; a curve
  // that bends upward gets there later than a straight line would.
  const f = (v.atm - s.tripleP) / (s.critP - s.tripleP)
  const span = s.critT - s.tripleT
  const straight = s.tripleT + span * f
  const elbow = s.tripleT + span * run(f, MAX_K)
  if (s.nbp <= straight) problems.nbp = `The vaporization curve bends upward, as vapor pressure does, so it reaches ${v.text.atm} later than a straight line from the triple point to the critical point would: make the boiling point higher than ${t(straight)}.`
  else if (s.nbp > elbow) problems.nbp = `A boiling point this close to the critical point would make the curve an elbow, so make it ${t(elbow)} or lower.`
  if (s.nmp >= straight) problems.nmp = `The fusion line would cross the vaporization curve, so make the melting point lower than ${t(straight)}.`
  else if (onGrid(s)) {
    // The fusion line must reach the top of the grid before a side.
    const axes = readAxes(s)
    const [x0, x1] = [axes.x.start, axes.x.start + axes.x.blocks * axes.x.step]
    const top = axes.y.start + axes.y.blocks * axes.y.step
    if (top > v.atm) {
      const at = (edge: number) => s.tripleT + ((edge - s.tripleT) * (v.atm - s.tripleP)) / (top - s.tripleP)
      const topX = s.tripleT + ((s.nmp - s.tripleT) * (top - s.tripleP)) / (v.atm - s.tripleP)
      if (x0 < s.tripleT && s.tripleT < x1 && (topX < x0 || topX > x1))
        problems.nmp = `The fusion line leaves the side of the grid before it reaches the top, so make the melting point between ${t(at(x0))} and ${t(at(x1))}.`
    }
  }
  return problems
}

/** The fields whose problems leave nothing to draw. */
const VALUE_KEYS = ['tripleT', 'tripleP', 'critT', 'critP', 'nmp', 'nbp']

// The lettering ---------------------------------------------------------------

export type Region = 'solid' | 'liquid' | 'gas' | 'supercritical'
export const REGION_NAMES: Record<Region, string> = { solid: 'Solid', liquid: 'Liquid', gas: 'Gas', supercritical: 'Supercritical fluid' }
export const BOUNDARY_NAMES: Record<Boundary, string> = {
  fusion: 'Melting / freezing',
  vaporization: 'Boiling / condensing',
  sublimation: 'Sublimation / deposition',
}
export type PointKey = 'triple' | 'critical'
export const POINT_NAMES: Record<PointKey, string> = { triple: 'Triple point', critical: 'Critical point' }
/** What each place the 1 atm line crosses a boundary is called. */
export const CROSSING_NAMES: Record<Boundary, string> = { fusion: 'Normal m.p.', vaporization: 'Normal b.p.', sublimation: 'Sublimation point' }
const CROSSING_LONG: Record<Boundary, string> = { fusion: 'normal melting point', vaporization: 'normal boiling point', sublimation: 'sublimation point at 1 atm' }

/** The boundaries the 1 atm line crosses, left to right. */
export const crossed = (v: Values): Boundary[] => (sublimesAtOneAtm(v) ? ['sublimation'] : ['fusion', 'vaporization'])

/**
 * The letter on everything lettered, in one run of A, B, C…: the regions,
 * the boundaries, the points, then the 1 atm crossings. A shuffle seed
 * reorders them, so A isn't always the solid.
 */
export function lettersOf(s: PhaseSettings): { key: string; letter: string; marks: string }[] {
  const v = valuesOf(s)
  const items: { key: string; marks: string }[] = []
  if (s.regions === 'letters')
    for (const r of ['solid', 'liquid', 'gas', ...(s.supercritical ? ['supercritical'] : [])] as Region[]) items.push({ key: r, marks: REGION_NAMES[r].toLowerCase() })
  if (s.curves === 'letters')
    for (const b of ['fusion', 'vaporization', 'sublimation'] as Boundary[]) items.push({ key: b, marks: `${BOUNDARY_NAMES[b].toLowerCase()} (the ${b} ${b === 'fusion' ? 'line' : 'curve'})` })
  if (s.points === 'letters') for (const p of ['triple', 'critical'] as PointKey[]) items.push({ key: p, marks: `the ${POINT_NAMES[p].toLowerCase()}` })
  if (s.isobar && s.normalPoints === 'letters') for (const b of crossed(v)) items.push({ key: `at-${b}`, marks: `the ${CROSSING_LONG[b]}` })
  const letters = items.map((_, i) => String.fromCharCode(65 + i))
  if (s.shuffle) {
    const random = seededRandom(s.shuffle)
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[letters[i], letters[j]] = [letters[j], letters[i]]
    }
  }
  return items.map((item, i) => ({ ...item, letter: letters[i] }))
}

// The axes --------------------------------------------------------------------

/** Axes for Your own substance on a grid that fit its diagram, counting in tidy steps. */
export function fittedAxes(s: PhaseSettings): RangeSettings & { xEvery: number; yEvery: number } {
  const span = Math.max(s.critT - s.tripleT, 1e-6)
  const lowest = s.tUnit === 'K' ? 0 : -273.15
  // With the supercritical region marked, room right of and above the critical point for its name.
  const more = s.supercritical ? 2.5 : 1
  const [x0, x1, xStep] = niceRange(Math.max(lowest, Math.min(s.tripleT, s.nmp) - span * 0.25), s.critT + span * 0.15 * more)
  const [y0, y1, yStep] = niceRange(0, Math.max(s.critP, s.tripleP, atmIn(s.pUnit)) * (1 + 0.15 * more), true)
  const every = (from: number, to: number, step: number) => (Math.round((to - from) / step) > 10 ? 2 : 1)
  return {
    xFrom: String(x0), xTo: String(x1), xStep: String(xStep), xEvery: every(x0, x1, xStep),
    yFrom: String(y0), yTo: String(y1), yStep: String(yStep), yEvery: every(y0, y1, yStep),
  }
}

/** The settings the grid is laid out from: as typed on a grid; not to scale, a fixed block grid with no numbers. */
function gridSettingsOf(s: PhaseSettings): GridSettings & RangeSettings {
  if (onGrid(s)) return s
  const { width, height } = s.supercritical ? SCHEMATIC.wide : SCHEMATIC
  return { ...s, xFrom: '0', xTo: String(width), xStep: '1', xEvery: 0, yFrom: '0', yTo: String(height), yStep: '1', yEvery: 0, minor: 0 }
}

type GraphBox = { x0: number; x1: number; y0: number; y1: number }

/** The diagram's places on the graph, and how high its 1 atm line is. */
export function shapeOf(s: PhaseSettings, v: Values, box: GraphBox): { shape: Shape; atm: number } {
  if (!onGrid(s)) {
    const high = sublimesAtOneAtm(v)
    const triple = { x: SCHEMATIC.triple.x, y: high ? SCHEMATIC.atm : SCHEMATIC.triple.y }
    const partial = {
      triple, critical: SCHEMATIC.critical, corner: { x: box.x0, y: box.y0 }, top: box.y1,
      fusionTopX: triple.x + (v.lean === 'left' ? -SCHEMATIC.lean : SCHEMATIC.lean), kVap: SCHEMATIC.bend,
    }
    return { shape: { ...partial, kSub: sublimationBend(partial) }, atm: high ? SCHEMATIC.triple.y : SCHEMATIC.atm }
  }
  const triple = { x: v.tripleT, y: v.tripleP }
  const critical = { x: v.critT, y: v.critP }
  const f = (v.atm - v.tripleP) / (v.critP - v.tripleP)
  const partial = {
    triple, critical, corner: { x: box.x0, y: box.y0 }, top: Math.max(box.y1, v.tripleP),
    fusionTopX: v.tripleT + (((v.nmp ?? v.tripleT) - v.tripleT) * (Math.max(box.y1, v.tripleP) - v.tripleP)) / (v.atm - v.tripleP),
    kVap: bendThrough(((v.nbp ?? v.critT) - v.tripleT) / (v.critT - v.tripleT), f) ?? SCHEMATIC.bend,
  }
  return { shape: { ...partial, kSub: sublimationBend(partial) }, atm: v.atm }
}

// The drawing -----------------------------------------------------------------

/** A label on the graph: its lines of text, or a write-on line where it would be. */
export type Label = Spot & { rows: string[]; box: Box; blank?: Segment; leader?: Segment }
/** A boundary's name written along it: its lines of text (or a write-on line) centered at a point and turned to run with the boundary. */
export type Along = { x: number; y: number; angle: number; rows: string[]; blank?: Segment; corners: Point[] }
/** A value at an axis, where a number would be: text, or a write-on line. */
export type Mark = { x: number; y: number; anchor: Anchor; text: string; blank?: Segment }

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
function toSegment(p: Point, a: Point, b: Point) {
  const [dx, dy] = [b.x - a.x, b.y - a.y]
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
  return dist(p, { x: a.x + dx * t, y: a.y + dy * t })
}
/** How far a point is from a line through points. */
export function toLine(p: Point, pts: Point[]) {
  let best = pts.length === 1 ? dist(p, pts[0]) : Infinity
  for (let k = 1; k < pts.length; k++) best = Math.min(best, toSegment(p, pts[k - 1], pts[k]))
  return best
}
/** The point a length along a line through points. */
function pointAlong(pts: Point[], at: number): Point {
  let left = at
  for (let k = 1; k < pts.length; k++) {
    const len = dist(pts[k - 1], pts[k])
    if (left <= len || k === pts.length - 1) {
      const t = len ? Math.max(0, Math.min(1, left / len)) : 0
      return { x: pts[k - 1].x + (pts[k].x - pts[k - 1].x) * t, y: pts[k - 1].y + (pts[k].y - pts[k - 1].y) * t }
    }
    left -= len
  }
  return pts[0]
}
const lengthOf = (pts: Point[]) => pts.slice(1).reduce((sum, p, k) => sum + dist(pts[k], p), 0)

export function buildDiagram(s: PhaseSettings) {
  const numbered = onGrid(s)
  const v = valuesOf(s)
  const gs = gridSettingsOf(s)
  const axes = readAxes(gs)
  const problems: Record<string, string | null> = { ...(numbered ? axes.problems : {}), ...checkDiagram(s) }
  const drawable = !VALUE_KEYS.some((key) => problems[key])
  const letterOf = Object.fromEntries(lettersOf(s).map((l) => [l.key, l.letter])) as Record<string, string | undefined>

  // Laid out once to find where everything falls, then again with room at
  // the axes for the values written there.
  const first = layoutGrid(gs, axes, { edges: true })
  const fs = first.fs
  const LFS = fs * LABEL_SCALE_UP // label font size
  const ROW = LFS * 1.15 // between the lines of a label on two
  const MFS = fs // the size of the values at the axes, as the grid's numbers
  const MARK_ROW = MFS * 1.35
  const box = first.box
  const { shape: d, atm: atmY } = shapeOf(s, v, box)
  const inBox = (p: Point) => p.x >= box.x0 - 1e-9 && p.x <= box.x1 + 1e-9 && p.y >= box.y0 - 1e-9 && p.y <= box.y1 + 1e-9
  const isobar = drawable && s.isobar && atmY > box.y0 && atmY < box.y1
  const crossingsAt = isobar ? crossings(d, atmY).filter(inBox) : []

  // What's written at the axes, not to scale: the triple and critical
  // points' values, 1 atm, and what marks each 1 atm crossing.
  type Wanted = { at: number; text: string; blank: boolean }
  const wanted = (at: number, text: string, mode: 'values' | 'blank' | 'none'): Wanted[] =>
    mode === 'none' || (mode === 'values' && !text) ? [] : [{ at, text: mode === 'blank' ? '' : text, blank: mode === 'blank' }]
  const crossingText = (b: Boundary) =>
    s.normalPoints === 'values' ? v.text[b === 'fusion' ? 'nmp' : b === 'vaporization' ? 'nbp' : 'sublimes']
    : s.normalPoints === 'names' ? CROSSING_NAMES[b]
    : s.normalPoints === 'letters' ? (letterOf[`at-${b}`] ?? '')
    : ''
  const yWanted: Wanted[] = []
  const xWanted: Wanted[] = []
  if (!numbered && drawable) {
    yWanted.push(...wanted(d.triple.y, v.text.tripleP, s.axisValues), ...wanted(d.critical.y, v.text.critP, s.axisValues))
    if (isobar) yWanted.push(...wanted(atmY, v.text.atm, 'values'))
    xWanted.push(...wanted(d.triple.x, v.text.tripleT, s.axisValues), ...wanted(d.critical.x, v.text.critT, s.axisValues))
    for (const c of crossingsAt) xWanted.push(...wanted(c.x, crossingText(c.boundary), s.normalPoints === 'blank' ? 'blank' : s.normalPoints === 'none' ? 'none' : 'values'))
  }
  const markW = (m: Wanted) => (m.blank ? MARK_BLANK_W : textWidth(m.text, MFS))

  // Under the temperature axis each is by its dashed line: two that would
  // run into each other move apart, as long as each stays at its line;
  // otherwise they go on rows.
  const xPlaced = settleUnder(xWanted.map((m) => ({ ...m, x: first.px({ x: m.at, y: 0 }).x, half: markW(m) / 2 })))
  const room = {
    x: xPlaced.rows ? xPlaced.rows * MARK_ROW + 2 : 0,
    y: yWanted.length ? Math.max(...yWanted.map(markW)) + 8 : 0,
  }
  const { px, ...grid } = layoutGrid(gs, axes, { edges: true, room })
  const dx = grid.grid.x - first.grid.x
  const area = grid.grid
  const [axisX, axisY] = [grid.yAxis.x, grid.xAxis.y]

  const marks: Mark[] = []
  const mark = (x: number, y: number, anchor: Anchor, m: Wanted) => {
    const w = markW(m)
    const x0 = anchor === 'end' ? x - w : x - w / 2
    marks.push({ x, y, anchor, text: m.text, blank: m.blank ? { x1: x0, y1: y, x2: x0 + w, y2: y } : undefined })
  }
  for (const m of spread(yWanted.map((m) => ({ ...m, at: -px({ x: 0, y: m.at }).y, half: MFS * 0.6 })), 3)) mark(axisX - 7, -m.at + MFS * 0.35, 'end', m)
  for (const m of xPlaced.placed) mark(m.x + dx, axisY + MFS + 6 + m.row * MARK_ROW, 'middle', m)

  // The boundaries, cut to the grid.
  const runsOf = (pts: Point[]) => clipPath(pts, box).map((run) => run.map(px))
  const lines: Record<Boundary, Point[][]> = { fusion: [], vaporization: [], sublimation: [] }
  if (drawable) {
    lines.fusion = runsOf(fusion(d))
    lines.vaporization = runsOf(vaporization(d))
    if (d.corner.x < d.triple.x && d.corner.y < d.triple.y) lines.sublimation = runsOf(sublimation(d))
  }
  const allRuns = [...lines.sublimation, ...lines.fusion, ...lines.vaporization]

  // The dots, and the dashed lines: from the two points to the axes, the
  // 1 atm line with a line down from each crossing, and the supercritical
  // region's edges.
  const points: Record<PointKey, Point | null> = {
    triple: drawable && inBox(d.triple) ? px(d.triple) : null,
    critical: drawable && inBox(d.critical) ? px(d.critical) : null,
  }
  const dots: { x: number; y: number; r: number }[] = []
  const dashed: Segment[] = []
  for (const p of Object.values(points)) {
    if (!p) continue
    dots.push({ ...p, r: DOT })
    if (s.guides) dashed.push(...guidesFrom(p, axisX, axisY))
  }
  const atCrossings = crossingsAt.map((c) => ({ ...c, at: px(c) }))
  if (isobar) {
    const y = px({ x: 0, y: atmY }).y
    dashed.push({ x1: area.x, y1: y, x2: area.x + area.w, y2: y })
    for (const c of atCrossings) {
      dots.push({ ...c.at, r: DOT })
      // Not to scale, a line down to the temperature axis with no value at its
      // foot (a real substance's melting point, not known apart from its
      // triple point's) would only ask what it marks: it's left off.
      const unmarked = !numbered && s.normalPoints === 'values' && !crossingText(c.boundary)
      if (!unmarked) dashed.push(...guidesFrom(c.at, axisX, axisY, { y: false }))
    }
  }
  const supercritical = s.supercritical && !!points.critical
  if (supercritical) {
    const c = points.critical!
    if (c.y > area.y + 1) dashed.push({ x1: c.x, y1: c.y, x2: c.x, y2: area.y })
    if (c.x < area.x + area.w - 1) dashed.push({ x1: c.x, y1: c.y, x2: area.x + area.w, y2: c.y })
  }

  // Everything a label keeps off: the boundaries and the dots, and, if it
  // can, the dashed lines.
  const bounds: Box = { x0: area.x + INSET, y0: area.y + INSET, x1: area.x + area.w - INSET, y1: area.y + area.h - INSET }
  const place = placer(bounds)
  for (const run of allRuns) place.line(run)
  for (const l of dashed) place.line([{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }], true)
  for (const p of dots) place.box({ x0: p.x - p.r - 2, y0: p.y - p.r - 2, x1: p.x + p.r + 2, y1: p.y + p.r + 2 })

  const labels: Label[] = []
  /** The names there was no room for on the grid. */
  const dropped: string[] = []
  /**
   * A label at the first clear place, on one line or, if that touches
   * something, on two; left off if it would run off the grid. With `first`,
   * the first that many spots are tried both ways before the rest.
   */
  const put = (spots: Spot[], text: string, mode: LabelMode | 'values', split?: string[], first = spots.length) => {
    if (mode === 'none' || !spots.length) return
    const blank = mode === 'blank'
    const ways = blank ? [[] as string[]] : [[text], ...(split ? [split] : [])]
    const groups = [spots.slice(0, first), spots.slice(first)].filter((g) => g.length)
    const options = groups.flatMap((spots) => ways.map((rows) => {
      const w = blank ? BLANK_W : Math.max(...rows.map((r) => textWidth(r, LFS))) + 2
      const extra = Math.max(0, rows.length - 1) * ROW
      return place.choose(
        spots.map((spot) => {
          const at = { ...spot, y: spot.y - extra / 2 }
          const b = textBox(at, w, LFS)
          return { ...at, rows, box: { ...b, y1: b.y1 + extra } }
        }),
        false,
      )
    }))
    const chosen = options.find((o) => o.score === 0) ?? options.reduce((a, b) => (b.score < a.score ? b : a))
    if (chosen.score >= 1e6) {
      dropped.push(blank ? 'a blank line' : text)
      return
    }
    place.keep(chosen.box)
    labels.push({
      x: chosen.x, y: chosen.y, anchor: chosen.anchor, rows: chosen.rows, box: chosen.box,
      blank: blank ? { x1: chosen.box.x0, y1: chosen.y, x2: chosen.box.x1, y2: chosen.y } : undefined,
    })
  }
  const textOf = (mode: LabelMode | 'values', name: string, key: string) => (mode === 'letters' ? (letterOf[key] ?? '') : name)

  // The points' names beside their dots, first, so each is next to its own
  // dot and no region's name (or blank line) takes that place and reads as
  // the point's.
  const twoLines = (name: string) => (s.points === 'names' ? name.split(' ') : undefined)
  /** A point's blank line, joined to its dot by a short line so it can't be taken for a region's. */
  const putPoint = (p: Point, spots: Spot[], key: PointKey) => {
    const before = labels.length
    put(spots, textOf(s.points, POINT_NAMES[key], key), s.points, twoLines(POINT_NAMES[key]))
    const l = labels[before]
    if (!l?.blank) return
    const end = Math.abs(l.blank.x1 - p.x) < Math.abs(l.blank.x2 - p.x) ? { x: l.blank.x1, y: l.blank.y1 } : { x: l.blank.x2, y: l.blank.y2 }
    const len = dist(p, end)
    const from = DOT + 2
    if (len > from + 2) l.leader = { x1: round(p.x + ((end.x - p.x) * from) / len), y1: round(p.y + ((end.y - p.y) * from) / len), x2: round(end.x), y2: round(end.y) }
  }
  if (points.triple) putPoint(points.triple, besidePoint(points.triple, LFS), 'triple')
  if (points.critical) {
    const c = points.critical
    // Above left of the dot first: the curve arrives from below left, and the supercritical region's edges leave up and right.
    putPoint(c, [{ x: c.x - 12, y: c.y - LFS * 0.85, anchor: 'end' }, ...besidePoint(c, LFS), { x: c.x, y: c.y - LFS * 1.1, anchor: 'middle' }], 'critical')
  }

  // The regions' names, each at the first clear place in its region.
  if (drawable && s.regions !== 'none') {
    const [x0, x1] = [box.x0, box.x1]
    const subX = (y: number) => d.corner.x + (d.triple.x - d.corner.x) * run((y - d.corner.y) / (d.triple.y - d.corner.y), d.kSub)
    const vapX = (y: number) => d.triple.x + (d.critical.x - d.triple.x) * run((y - d.triple.y) / (d.critical.y - d.triple.y), d.kVap)
    const top = Math.min(d.top, box.y1)
    /** Each region's left and right edges at a pressure, or null where it isn't. */
    const extent: Record<Region, (y: number) => [number, number] | null> = {
      solid: (y) => [x0, y >= d.triple.y ? meltingAt(d, y) : subX(y)],
      liquid: (y) => (y <= d.triple.y ? null : [meltingAt(d, y), y < d.critical.y ? vapX(y) : d.critical.x]),
      gas: (y) => (y < d.triple.y ? [subX(y), x1] : y < d.critical.y ? [vapX(y), x1] : supercritical ? null : [d.critical.x, x1]),
      supercritical: (y) => (y > d.critical.y ? [d.critical.x, x1] : null),
    }
    /** The pressures each region's name is tried at, best first, as parts of the way between two. */
    const levels: Record<Region, [number, number, number[]][]> = {
      solid: [[d.triple.y, top, [0.55, 0.7, 0.4, 0.85, 0.25, 0.1]], [box.y0, d.triple.y, [0.8, 0.6]]],
      liquid: [[d.triple.y, Math.min(d.critical.y, top), [0.72, 0.84, 0.6, 0.93, 0.5, 0.4]], [d.critical.y, top, [0.5, 0.3, 0.7]]],
      gas: [[box.y0, Math.min(d.critical.y, top), [0.35, 0.25, 0.45, 0.15, 0.55, 0.65, 0.08]]],
      supercritical: [[d.critical.y, top, [0.5, 0.35, 0.65, 0.2, 0.8]]],
    }
    const across: Record<Region, number[]> = {
      solid: [0.5, 0.4, 0.6, 0.3, 0.7],
      liquid: [0.5, 0.42, 0.58, 0.34, 0.66],
      gas: [0.6, 0.5, 0.7, 0.4, 0.8, 0.3],
      supercritical: [0.5, 0.4, 0.6],
    }
    for (const region of ['solid', 'liquid', 'gas', ...(s.supercritical ? ['supercritical'] : [])] as Region[]) {
      if (region === 'supercritical' && !supercritical) continue
      const spots: Spot[] = []
      for (const [from, to, parts] of levels[region]) {
        if (!(to > from)) continue
        for (const part of parts) {
          const y = from + (to - from) * part
          const edges = extent[region](y)
          if (!edges) continue
          const [a, b] = [Math.max(edges[0], x0), Math.min(edges[1], x1)]
          if (!(b > a)) continue
          for (const t of across[region]) {
            const at = px({ x: a + (b - a) * t, y })
            spots.push({ x: at.x, y: at.y + LFS * 0.35, anchor: 'middle' })
          }
        }
      }
      const name = REGION_NAMES[region]
      put(spots, textOf(s.regions, name, region), s.regions, name.includes(' ') && s.regions === 'names' ? name.split(' ') : undefined)
    }
  }

  // The boundaries' names, written along them (all on one line, or all on
  // two when one doesn't fit), clear of the labels already placed; a letter
  // instead goes beside a small dot on its boundary.
  const along: Along[] = []
  const bigDots = dots.slice()
  if (s.curves === 'names' || s.curves === 'blank') {
    const blank = s.curves === 'blank'
    const drawn = (['fusion', 'vaporization', 'sublimation'] as Boundary[]).filter((b) => lines[b].length)
    const others = (b: Boundary) => allRuns.filter((run) => !lines[b].includes(run))
    const tryAll = (rowsOf: (b: Boundary) => string[]) =>
      drawn.map((b) => {
        const rows = rowsOf(b)
        const w = blank ? BLANK_W : Math.max(...rows.map((r) => textWidth(r, LFS)))
        const h = blank ? LFS : LFS + (rows.length - 1) * ROW
        // The vaporization and sublimation curves' on their gas side, the fusion line's on its solid side.
        return alongLine(lines[b][0], w, h, { bounds, own: lines[b], hard: others(b), soft: dashed, dots: bigDots, placed: labels.map((l) => l.box), side: b === 'fusion' ? -1 : 1, rows: blank ? [] : rows })
      })
    const oneLine = tryAll((b) => [BOUNDARY_NAMES[b]])
    const fits = blank || oneLine.every((o) => o && o.score < 1)
    const chosen = fits ? oneLine : tryAll((b) => BOUNDARY_NAMES[b].split(' / ').map((word, i) => (i ? word : `${word} /`)))
    for (const [i, o] of chosen.entries()) {
      if (!o) continue
      // Too long for its boundary, off the grid, or with no place clear of the labels already there: left off.
      if (o.score >= 1000) {
        dropped.push(blank ? 'a blank line' : BOUNDARY_NAMES[drawn[i]])
        continue
      }
      along.push(o.label)
      for (const b of o.boxes) place.box(b)
    }
  } else if (s.curves === 'letters') {
    for (const b of ['fusion', 'vaporization', 'sublimation'] as Boundary[]) {
      const run = lines[b][0]
      const letter = letterOf[b]
      if (!run || !letter) continue
      // Partway along, clear of the other dots.
      const total = lengthOf(run)
      const at = [0.5, 0.6, 0.4, 0.7, 0.3, 0.8, 0.2].map((t) => pointAlong(run, total * t)).find((p) => bigDots.every((q) => dist(p, q) > 26)) ?? pointAlong(run, total / 2)
      dots.push({ ...at, r: SMALL_DOT })
      place.box({ x0: at.x - 5, y0: at.y - 5, x1: at.x + 5, y1: at.y + 5 })
      put(besidePoint(at, LFS, 9), letter, 'letters')
    }
  }

  // On a grid, the 1 atm line's name and its crossings' labels go on the
  // graph, the axes being numbered.
  if (numbered && isobar) {
    const y = px({ x: 0, y: atmY }).y
    const [l, r] = [area.x + INSET + 2, area.x + area.w - INSET - 2]
    put(
      [{ x: r, y: y - 7, anchor: 'end' }, { x: r, y: y + LFS + 3, anchor: 'end' }, { x: l, y: y - 7, anchor: 'start' }, { x: l, y: y + LFS + 3, anchor: 'start' }],
      v.text.atm, 'names',
    )
    for (const c of atCrossings) {
      const text = crossingText(c.boundary)
      const mode = s.normalPoints === 'blank' ? 'blank' : s.normalPoints === 'none' || !text ? 'none' : 'names'
      // On the boundary's outer side first, so a label never reaches across
      // toward the other crossing: left of the fusion line (the solid's side),
      // right of the vaporization and sublimation curves (the gas's).
      const p = c.at
      const below = p.y + LFS * 1.3
      const above = p.y - LFS * 0.85
      const left: Spot[] = [{ x: p.x - 11, y: below, anchor: 'end' }, { x: p.x - 11, y: above, anchor: 'end' }]
      const right: Spot[] = [{ x: p.x + 11, y: below, anchor: 'start' }, { x: p.x + 11, y: above, anchor: 'start' }]
      const spots = c.boundary === 'fusion' ? [...left, ...right] : [...right, ...left]
      put(spots, text, mode, s.normalPoints === 'names' ? text.split(' ') : undefined, 2)
    }
  }

  // Say when the diagram runs off the grid; the Fit button fixes it.
  if (numbered && drawable) {
    const off = [d.triple, d.critical].some((p) => !inBox(p)) || atmY <= box.y0 || atmY >= box.y1 || !lines.sublimation.length
    if (off)
      problems.fit = `The diagram runs from the triple point (${v.text.tripleT}, ${v.text.tripleP}) to the critical point (${v.text.critT}, ${v.text.critP}), and doesn’t all fit on these axes.`
  }

  if (dropped.length)
    problems.room = `There’s no room on the graph for ${[...new Set(dropped)].join(', ')}.${numbered ? ' Fit the axes to the diagram, or widen them.' : ' Try a smaller label size.'}`

  const gridlines: Gridlines = numbered ? 'standard' : 'none'
  return {
    ...grid,
    vLines: numbered ? grid.vLines : ([] as number[]),
    hLines: numbered ? grid.hLines : ([] as number[]),
    gridlines,
    gridSettings: gs,
    lfs: LFS,
    mfs: MFS,
    row: ROW,
    color: COLORS[s.color],
    /** The boundaries as drawn, and the lines through them. */
    curves: allRuns.map(pathOf),
    lines,
    dashed,
    dots: dots.map((p) => ({ x: round(p.x), y: round(p.y), r: p.r })),
    words: labels,
    along,
    marks,
    problems,
    /** How sharply the vaporization curve bends, and the diagram's places, for the tests. */
    shape: d,
    atm: atmY,
  }
}

export type DiagramLayout = ReturnType<typeof buildDiagram>

/**
 * Where values go under the temperature axis: each centered under its
 * dashed line, unless it would run into its neighbour; then the two move
 * apart just enough ($shared's `spread`), as long as each stays at its own
 * line, and failing that they go on rows (`rowsUnder`).
 */
function settleUnder<T extends { x: number; half: number }>(items: T[], gap = 6): { placed: (T & { row: number })[]; rows: number } {
  if (!items.length) return { placed: [], rows: 0 }
  const sorted = [...items].sort((a, b) => a.x - b.x)
  const apart = spread(sorted.map((m) => ({ ...m, at: m.x })), gap)
  // Each run of labels pushed together moves back as one, so every label
  // is as near its own line as its width allows.
  const out: (T & { row: number })[] = []
  let ok = true
  for (let start = 0; start < apart.length; ) {
    let end = start + 1
    while (end < apart.length && apart[end].at - apart[end].x > 1e-6) end++
    const group = apart.slice(start, end)
    let best = 0
    let bestWorst = Infinity
    const most = Math.max(...group.map((m) => m.at - m.x))
    for (let k = 0; k <= 60; k++) {
      const shift = (most * k) / 60
      const worst = Math.max(...group.map((m) => Math.abs(m.at - shift - m.x) / m.half))
      if (worst < bestWorst - 1e-9) [best, bestWorst] = [shift, worst]
    }
    // Each value still has to cover its own dashed line, with room to spare.
    if (bestWorst > 0.7) ok = false
    for (const m of group) out.push({ ...sorted[start + group.indexOf(m)], x: m.at - best, row: 0 })
    start = end
  }
  if (ok) return { placed: out, rows: 1 }
  return rowsUnder(sorted)
}

/**
 * A place for words `w` long and `h` high along a line through points, a
 * little off it on one side: turned to run with the line across their own
 * length, clear of the line itself, the other lines and the dots, and, if
 * they can be, of the dashed lines. Null for a line too short to say.
 */
function alongLine(
  pts: Point[] | undefined,
  w: number,
  h: number,
  o: { bounds: Box; own: Point[][]; hard: Point[][]; soft: Segment[]; dots: Point[]; placed: Box[]; side: 1 | -1; rows: string[] },
): { label: Along; boxes: Box[]; score: number } | null {
  if (!pts || pts.length < 2) return null
  const total = lengthOf(pts)
  const GAP = 6 // between the words and their line
  let best: { label: Along; boxes: Box[]; score: number } | null = null
  const fractions = [0.5, 0.55, 0.45, 0.6, 0.4, 0.65, 0.35, 0.7, 0.3, 0.75, 0.25, 0.8, 0.2]
  for (const [index, fraction] of fractions.entries()) {
    const mid = total * fraction
    const [a, b] = [pointAlong(pts, Math.max(0, mid - w / 2)), pointAlong(pts, Math.min(total, mid + w / 2))]
    const len = dist(a, b)
    if (len < 1) continue
    // Along the line, reading left to right, or bottom to top where it's nearly upright.
    let u = { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
    if (Math.abs(u.x) < 0.26 ? u.y > 0 : u.x < 0) u = { x: -u.x, y: -u.y }
    const n = { x: -u.y, y: u.x } // below the words, as they read
    const chordMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    for (const side of [o.side, -o.side]) {
      // How far the line bulges past its chord on this side, under the words.
      let bulge = 0
      for (let at = Math.max(0, mid - w / 2); at <= Math.min(total, mid + w / 2); at += 4) {
        const p = pointAlong(pts, at)
        bulge = Math.max(bulge, ((p.x - chordMid.x) * n.x + (p.y - chordMid.y) * n.y) * side)
      }
      const off = bulge + GAP + h / 2
      const c = { x: chordMid.x + n.x * side * off, y: chordMid.y + n.y * side * off }
      const corner = (i: number, j: number): Point => ({ x: c.x + (u.x * i * w) / 2 + (n.x * j * h) / 2, y: c.y + (u.y * i * w) / 2 + (n.y * j * h) / 2 })
      const corners = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)]
      // Points down the middle of the words, to measure from.
      const middle: Point[] = []
      const steps = Math.max(2, Math.ceil(w / 5))
      for (let k = 0; k <= steps; k++) middle.push({ x: c.x + u.x * w * (k / steps - 0.5), y: c.y + u.y * w * (k / steps - 0.5) })
      const near = (line: Point[], within: number) => middle.some((p) => toLine(p, line) < within)
      let score = index * 0.01 + (side === o.side ? 0 : 0.2)
      if (corners.some((p) => p.x < o.bounds.x0 || p.x > o.bounds.x1 || p.y < o.bounds.y0 || p.y > o.bounds.y1)) score += 1000
      if (w > total) score += 1000
      for (const line of o.own) if (near(line, h / 2 + GAP - 1.5)) score += 100
      for (const line of o.hard) if (near(line, h / 2 + 3)) score += 100
      for (const p of o.dots) if (near([p], h / 2 + 9)) score += 50
      for (const b of o.placed) if (middle.some((p) => p.x > b.x0 - h / 2 && p.x < b.x1 + h / 2 && p.y > b.y0 - h / 2 && p.y < b.y1 + h / 2)) score += 2000
      for (const l of o.soft) if (near([{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }], h / 2)) score += 2
      if (best && score >= best.score) continue
      const angle = (Math.atan2(u.y, u.x) * 180) / Math.PI
      const boxes = middle.filter((_, k) => k % 2 === 0).map((p) => ({ x0: p.x - h / 2, y0: p.y - h / 2, x1: p.x + h / 2, y1: p.y + h / 2 }))
      best = {
        score, boxes,
        label: {
          x: round(c.x), y: round(c.y), angle: round(angle), rows: o.rows, corners,
          blank: o.rows.length ? undefined : { x1: round(c.x - w / 2), y1: round(c.y), x2: round(c.x + w / 2), y2: round(c.y) },
        },
      }
    }
  }
  return best
}

// The answer key and screen reader text ---------------------------------------

/**
 * The answer key: the triple and critical points' values, what happens at
 * 1 atm, which way the fusion line leans, and what each letter marks.
 * Values left blank on the figure are here too: this is for the teacher.
 */
export function answerLines(s: PhaseSettings): string[] {
  if (VALUE_KEYS.some((key) => checkDiagram(s)[key])) return []
  const v = valuesOf(s)
  const real = substanceOf(s)
  const out = [`Triple point: ${v.text.tripleT}, ${v.text.tripleP}`, `Critical point: ${v.text.critT}, ${v.text.critP}`]
  if (sublimesAtOneAtm(v)) {
    out.push(`At ${v.text.atm}: sublimes at ${v.text.sublimes}. Its triple point is above ${v.text.atm}, so the solid turns straight to gas`)
  } else {
    const melts = v.text.nmp ? `melts at ${v.text.nmp}` : real ? `melts within 0.1 ${T_UNIT_TEXT[s.tUnit]} of its triple point’s temperature` : `melts at ${v.text.tripleT}`
    out.push(`At ${v.text.atm}: ${melts}, boils at ${v.text.nbp}`)
  }
  out.push(
    v.lean === 'left'
      ? 'The fusion line leans left: more pressure lowers the melting point, so the solid is less dense than the liquid'
      : 'The fusion line leans right: more pressure raises the melting point, so the solid is denser than the liquid',
  )
  const letters = lettersOf(s)
  if (letters.length) out.push([...letters].sort((a, b) => a.letter.localeCompare(b.letter)).map((l) => `${l.letter}: ${l.marks}`).join('; '))
  if (!onGrid(s)) out.push('Not drawn to scale')
  return out
}

/**
 * What the figure shows, for screen readers: the chart title or whose phase
 * diagram it is, and what's marked on it. A value or name left blank or
 * lettered isn't given, so the label never answers the question.
 */
export function describe(s: PhaseSettings): string {
  const title = s.titleMode === 'text' && s.title.trim() ? s.title.trim() : `Phase diagram of ${substanceOf(s) ? substanceName(s).toLowerCase() : substanceName(s)}`
  // Values typed that don't make a diagram leave the axes empty.
  if (VALUE_KEYS.some((key) => checkDiagram(s)[key])) return `${title}: empty axes, pressure against temperature, with no diagram drawn (the values typed don’t make one)`
  const v = valuesOf(s)
  const parts = ['pressure against temperature']
  if (s.regions === 'names') parts.push(`the ${['solid', 'liquid', 'gas', ...(s.supercritical ? ['supercritical fluid'] : [])].join(', ')} regions named`)
  else if (s.regions !== 'none') parts.push(s.regions === 'letters' ? 'the regions lettered' : 'blank lines to name the regions')
  const shown = !onGrid(s) && s.axisValues === 'values'
  if (s.points === 'names') parts.push(`the triple point${shown ? ` at ${v.text.tripleT} and ${v.text.tripleP}` : ''} and the critical point${shown ? ` at ${v.text.critT} and ${v.text.critP}` : ''}`)
  else parts.push('dots at two points')
  if (s.isobar) parts.push(`a dashed line across at ${v.text.atm}`)
  if (!onGrid(s)) parts.push('not drawn to scale')
  return `${title}: ${parts.join(', ')}`
}
