// Works out a business cycle graph from its settings, as a panel for the
// econ graph library to lay out: real GDP's wave around a dashed long-run
// trend, its peaks and troughs named over and under them, the phases
// (expansion, contraction, recession, recovery) named with arrows to the
// wave, recessions shaded from peak to trough, and every label in words or
// as letters along the wave for a quiz. The phases' names are laid out,
// looked over and laid out again until no arrow crosses another or the
// wave, no name sits on a line or another name or reads as one with a peak's
// or trough's, and none runs past the end of the time axis or into a
// recession band it contradicts.

import type { Axes } from '$shared/graph/axes'
import type { Point } from '$shared/graph/grid'
import { crosses, textBox, type Box, type Segment, type Spot } from '$shared/graph/labels'
import { plainOf, runsOf, runsWidth } from '$shared/graph/runs'
import { graphOf } from '$lib/graph/curves'
import { buildFigure, type FigureLayout } from '$lib/graph/figure'
import { inks, shows, type CalloutSpec, type CurveSpec, type PanelLayout, type PanelSpec, type PointSpec, type RegionSpec, type Words } from '$lib/graph/panel'
import { panelBase, wordsOf } from '$lib/graph/settings'
import { waveOf, type Phase, type Wave } from './model'
import { LABEL_NAMES, type BusinessCycleSettings, type LabelKey } from './settings'

/** The hidden grid the graph is drawn on: wider than tall, as time runs on. */
export const AXES: Axes = {
  x: { start: 0, step: 1, blocks: 15, numbering: 'decimal' },
  y: { start: 0, step: 1, blocks: 10, numbering: 'decimal' },
}
/** Where the wave runs across the graph, and the trend under it. */
const WAVE = { x0: 0.4, x1: 14.2 }
const TREND = { x0: 0, x1: 14.8 }
/** How high up the graph the wave and trend fit, leaving room for names over the peaks and under the troughs. */
const FIT = { lo: 1.5, hi: 8.7 }

/**
 * Where along a rise or a fall (by time, from its start) each phase's arrow
 * points, which end's turn it's named near, and whether its name sits over
 * the wave (near a peak) or under it (near a trough). Contraction and
 * recession are two names for the same fall, so they point at it from
 * either side, either side of its middle; a recovery is the start of an
 * expansion, just after the trough.
 */
const PHASE_AT: Record<'expansionLabel' | 'recoveryLabel' | 'contractionLabel' | 'recessionLabel', { rising: boolean; at: number; near: 'start' | 'end'; over: boolean }> = {
  recoveryLabel: { rising: true, at: 0.3, near: 'start', over: false },
  expansionLabel: { rising: true, at: 0.7, near: 'end', over: true },
  contractionLabel: { rising: false, at: 0.4, near: 'start', over: true },
  recessionLabel: { rising: false, at: 0.6, near: 'end', over: false },
}
type PhaseKey = keyof typeof PHASE_AT
const PHASE_KEYS = Object.keys(PHASE_AT) as PhaseKey[]

/** How far a phase's arrow lands from the trend, at least, in the graph's units, so it plainly points at the wave. */
const CLEAR_OF_TREND = 0.4
/** How long an arrow may run, on the drawing, before its name counts as far from its point. */
const FAR = 50

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Whether a turn is at one of the wave's ends, where it was asked to start or end. */
const atEnd = (t: { x: number }) => t.x === WAVE.x0 || t.x === WAVE.x1

export function buildBusinessCycle(s: BusinessCycleSettings) {
  const wave = waveOf(s, { ...WAVE, ...FIT, trendFrom: TREND.x0, trendTo: TREND.x1 })
  const notes: string[] = []
  if (!wave.falls) notes.push('With the trend this steep and the swings this small, real GDP never falls: there are no peaks, troughs or contractions. Make the swings bigger or the trend flatter.')

  // A wave started or ended at a peak or trough has it named there too,
  // unless that crowds the labels (or leaves a name off) and leaving it unnamed doesn't.
  const worse = (l: ReturnType<typeof layOut>) => l.dropped.length * 1000 + l.score
  let laid = layOut(s, wave, true)
  if (laid.score && wave.turns.some(atEnd)) {
    const unnamed = layOut(s, wave, false)
    if (worse(unnamed) < worse(laid)) laid = unnamed
  }
  const { figure, answers } = laid
  if (laid.dropped.length) {
    const names = [...new Set(laid.dropped)].map((key) => LABEL_NAMES[key].toLowerCase())
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]
    const they = names.length > 1 ? 'they’re' : 'it’s'
    notes.push(
      s.every
        ? `There’s no room to name ${list} in every cycle, so ${they} left off where there isn’t. Name each phase once, or use fewer cycles, fewer terms or smaller labels.`
        : `There’s no room to name ${list} clear of the other labels, so ${they} left off. Use fewer cycles, fewer terms or smaller labels.`,
    )
  }
  if (figure.panels[0].crowded) {
    notes.push(s.every ? 'Some labels are crowded. Name each phase once, or use fewer cycles, fewer terms or smaller labels.' : 'Some labels are crowded. Use fewer cycles, fewer terms or smaller labels.')
  }

  // Only the turns drawn as such: those at the wave's ends left unnamed aren't counted.
  const turns = wave.turns.filter((t) => laid.nameEnds || !atEnd(t))
  return {
    figure,
    wave,
    notes,
    /** each letter on a quiz and the term it stands for */
    answers,
    label: labelOf(s, turns.filter((t) => t.kind === 'peak').length, turns.filter((t) => t.kind === 'trough').length),
  }
}

export type BusinessCycleFigure = ReturnType<typeof buildBusinessCycle>

/** A phase named on one rise or fall: which, and where its arrow points. */
type Named = { key: PhaseKey; phase: Phase; x: number; over: boolean }
/** A name with an arrow, on the graph: what it is, where it points, and the way its words would best go from there. */
type Call = { key: LabelKey; at: Point; toward: Point; x: number; phase?: Phase }

/**
 * What a first, unlabeled layout tells the phases' names to keep clear of:
 * where the graph's units fall on the drawing, the peaks' and troughs'
 * names, the end of the time axis and the recession bands.
 */
type Room = { px: (p: Point) => Point; names: Box[]; xEnd: number; fs: number; bands: [number, number][]; lines: Point[][] }

/**
 * The figure with its phases (and the trend) named, the turns at the wave's
 * ends named or not: the phases on the rises and falls that leave their
 * names clearest, and any with no clear place anywhere left off.
 */
function layOut(s: BusinessCycleSettings, wave: Wave, nameEnds: boolean) {
  const drawn = (calls: Call[]) => draw(s, wave, nameEnds, calls)
  const room = roomOf(drawn([]).figure.panels[0], s, wave)
  const trend = shown(s, 'trendLabel') ? trendCalls(wave) : []
  const attempt = (calls: Call[]) => {
    const d = drawn(calls.map((c) => withSpots(c, room, s)))
    const flaws = flawsOf(d.figure.panels[0], calls, room)
    return { ...d, calls, flaws, score: flaws.reduce((a, b) => a + b, 0) + d.figure.panels[0].crowded * 100 + reachOf(d.figure.panels[0]) }
  }
  const plans = wave.falls ? plansOf(s, wave) : [[]]
  let best = attempt([...plans[0].map((n) => phaseCall(wave, n)), ...trend.slice(0, 1)])
  for (const plan of plans.slice(1)) {
    if (best.score < 1) break
    const next = attempt([...plan.map((n) => phaseCall(wave, n)), ...trend.slice(0, 1)])
    if (next.score < best.score) best = next
  }
  // Each name still out of place tried a little either way along its rise
  // or fall, or from its other side, or (named once) on the other rises or
  // falls it could go on; the trend's at the next places along it.
  let tries = s.every ? 12 : 24
  for (let k = 0; k < best.calls.length; k++) {
    const c = best.calls[k]
    if (best.flaws[k] < 10) continue
    const elsewhere = (o: Call) => (o.x !== c.x || Math.sign(o.toward.y) !== Math.sign(c.toward.y)) && (!s.every || o.phase === c.phase)
    const others = c.phase ? namedOnAny(s, wave, c.key as PhaseKey).map((n) => phaseCall(wave, n)).filter(elsewhere) : trend.slice(1)
    for (const other of others) {
      if (best.flaws[k] < 10 || tries-- <= 0) break
      const next = attempt(best.calls.map((d, j) => (j === k ? other : d)))
      if (next.score < best.score) best = next
    }
  }
  // A name with no clear place anywhere is left off (in every cycle, one
  // just a little out of place too): in every cycle, from the phase named
  // most often first, so each phase keeps what names it can.
  const dropped: LabelKey[] = []
  while (dropped.length < 12) {
    const { calls, flaws } = best
    const count = (key: LabelKey) => calls.filter((c) => c.key === key).length
    const worse = (k: number, w: number) => count(calls[k].key) > count(calls[w].key) || (count(calls[k].key) === count(calls[w].key) && flaws[k] > flaws[w])
    const worst = flaws.reduce((w, f, k) => (f >= (s.every ? SOFT : HARD) && (w < 0 || worse(k, w)) ? k : w), -1)
    if (worst < 0) break
    dropped.push(calls[worst].key)
    best = attempt(calls.filter((_, k) => k !== worst))
  }
  return { figure: best.figure, answers: best.answers, score: best.score, dropped, nameEnds }
}

const shown = (s: BusinessCycleSettings, key: LabelKey) => s[`${key}Mode`] !== 'none'

/** The rises or falls a phase can be named on: a recovery only on a rise from a trough. */
const onesFor = (wave: Wave, key: PhaseKey) => wave.phases.filter((p) => p.rising === PHASE_AT[key].rising && (key !== 'recoveryLabel' || p.fromTurn))

/**
 * A phase named on a rise or fall, where its arrow points. Named once, it's
 * kept on the part of its rise or fall there is; in every cycle, only if
 * that part has the turn it's named near.
 */
function namedOn(s: BusinessCycleSettings, wave: Wave, key: PhaseKey, phase: Phase | undefined, shift = 0, flip = false): Named[] {
  if (!phase) return []
  const at = anchorOf(wave, key, phase, !s.every || (PHASE_AT[key].near === 'start' ? phase.fromTurn : phase.toTurn), shift, flip)
  return at ? [{ key, phase, ...at }] : []
}
/** Every place a phase could be named: a little either way along each rise or fall too, and from its other side. */
const namedOnAny = (s: BusinessCycleSettings, wave: Wave, key: PhaseKey) =>
  [false, true].flatMap((flip) => [0, -0.15, 0.15].flatMap((shift) => onesFor(wave, key).flatMap((p) => namedOn(s, wave, key, p, shift, flip))))

/**
 * The rises and falls to name each phase on, best first. In every cycle,
 * every one long enough to hold a label. Once, each phase on the longest
 * that runs from turn to turn (the first of any about as long, and one
 * clear of the graph's ends if there is one); then each peak in turn with
 * expansion on the rise to it and contraction on the fall from it, and
 * recession and recovery either side of the trough after it, whose arrows
 * lean apart and never cross.
 */
function plansOf(s: BusinessCycleSettings, wave: Wave): Named[][] {
  const keys = PHASE_KEYS.filter((key) => shown(s, key))
  const length = (p: Phase) => p.x1 - p.x0
  if (s.every) {
    return [
      keys.flatMap((key) => {
        const ones = onesFor(wave, key)
        const longest = Math.max(0, ...ones.map(length))
        return ones.filter((p) => length(p) >= longest * 0.4).flatMap((p) => namedOn(s, wave, key, p))
      }),
    ]
  }
  const first = (key: PhaseKey) => {
    const ones = onesFor(wave, key).filter((p) => anchorOf(wave, key, p, true) !== null)
    const whole = ones.filter((p) => p.whole)
    const inside = whole.filter((p) => p.x0 > WAVE.x0 && p.x1 < WAVE.x1)
    const pick = inside.length ? inside : whole.length ? whole : ones
    const most = Math.max(...pick.map(length))
    return pick.find((p) => length(p) >= most * 0.95)
  }
  const plans: Named[][] = [keys.flatMap((key) => namedOn(s, wave, key, first(key)))]
  const peaks = wave.turns.filter((t) => t.kind === 'peak')
  const troughs = wave.turns.filter((t) => t.kind === 'trough')
  for (const peak of peaks) {
    const trough = troughs.find((t) => t.x > peak.x) ?? troughs.at(-1)
    const around: Record<PhaseKey, Phase | undefined> = {
      expansionLabel: wave.phases.find((p) => p.rising && p.x1 === peak.x),
      contractionLabel: wave.phases.find((p) => !p.rising && p.x0 === peak.x),
      recessionLabel: trough && wave.phases.find((p) => !p.rising && p.x1 === trough.x),
      recoveryLabel: trough && wave.phases.find((p) => p.rising && p.x0 === trough.x),
    }
    plans.push(keys.flatMap((key) => namedOn(s, wave, key, around[key] && onesFor(wave, key).includes(around[key]) ? around[key] : first(key))))
  }
  const seen = new Set<string>()
  return plans.filter((plan) => {
    const id = plan.map((n) => `${n.key}@${n.phase.x0}`).join()
    return !seen.has(id) && !!seen.add(id)
  })
}

/**
 * Where on a rise or fall a phase's arrow points: `at` of the way along it.
 * A stretch cut off by the graph's edge is measured as if it were a whole
 * one, from the turn it has, so the arrow lands where it would on a whole
 * one; if that's off the graph it's left out, or (`clamp`) kept on the part
 * there is; `shift` further along. Then moved until it's clear of the trend
 * on its name's side (or, if it can't be, or with `flip`, the other side,
 * which its name then goes on), so it can't be taken to point at the trend.
 */
function anchorOf(wave: Wave, key: PhaseKey, phase: Phase, clamp: boolean, shift = 0, flip = false): { x: number; over: boolean } | null {
  const { near, over } = PHASE_AT[key]
  const at = PHASE_AT[key].at + shift
  const all = wave.phases
  const span = phase.x1 - phase.x0
  let x = phase.x0 + span * at
  if (!phase.whole) {
    const whole = all.filter((p) => p.whole).map((p) => p.x1 - p.x0)
    const full = whole.length ? whole.reduce((a, b) => a + b, 0) / whole.length : span
    if (full > span) {
      // Cut off at the left, it ends at a turn; cut off at the right, it starts at one.
      x = !phase.fromTurn && phase.toTurn ? phase.x1 - full * (1 - at) : phase.x0 + full * at
      const lo = phase.x0 + span * 0.15
      const hi = phase.x1 - span * 0.15
      if (x < lo || x > hi) {
        if (!clamp) return null
        x = Math.max(lo, Math.min(hi, x))
      }
    }
  }
  // Clear of the trend on its name's side, toward its turn or else away
  // from it; or, if no part of the stretch is (a fall wholly under the
  // trend), on the other side.
  const [lo, hi] = [phase.x0 + span * 0.12, phase.x1 - span * 0.12]
  for (const side of [over !== flip, over === flip]) {
    const clear = (x: number) => (side ? 1 : -1) * (wave.y(x) - wave.trend(x)) >= CLEAR_OF_TREND
    for (const way of near === 'start' ? [-1, 1] : [1, -1]) {
      let t = x
      while (!clear(t) && t + way * span * 0.02 >= lo && t + way * span * 0.02 <= hi) t += way * span * 0.02
      if (clear(t)) return { x: t, over: side }
    }
  }
  return { x, over }
}

/** A phase's arrow: to its point on the wave, its words out from the wave, leaning away from the turn it's named near. */
function phaseCall(wave: Wave, { key, phase, x, over }: Named): Call {
  const { near } = PHASE_AT[key]
  const slope = (wave.y(x + 0.01) - wave.y(x - 0.01)) / 0.02
  const square = over ? { x: -slope, y: 1 } : { x: slope, y: -1 }
  const len = Math.hypot(square.x, square.y)
  const away = { x: near === 'start' ? Math.SQRT1_2 : -Math.SQRT1_2, y: over ? Math.SQRT1_2 : -Math.SQRT1_2 }
  return { key, at: { x, y: wave.y(x) }, toward: { x: square.x / len + away.x, y: square.y / len + away.y }, x, phase }
}

/**
 * The trend's name, with an arrow to it late on where the wave is furthest
 * from it (or, if there's no room there, the next furthest), on the far
 * side from the wave; failing those, earlier on.
 */
function trendCalls(wave: Wave): Call[] {
  const gap = (t: number) => Math.abs(wave.y(t) - wave.trend(t))
  const picks: number[] = []
  const pick = (from: number, to: number, most: number) => {
    const spots: number[] = []
    for (let t = from; t >= to; t -= 0.1) spots.push(t)
    spots.sort((a, b) => gap(b) - gap(a))
    for (const t of spots) if (picks.length < most && picks.every((u) => Math.abs(u - t) > 0.6)) picks.push(t)
  }
  pick(WAVE.x1 - 0.4, WAVE.x1 - 6, 6)
  pick(WAVE.x1 - 6.1, WAVE.x0 + 0.6, 10)
  const rise = wave.trend(1) - wave.trend(0)
  return picks.map((t) => ({ key: 'trendLabel', at: { x: t, y: wave.trend(t) }, toward: wave.y(t) > wave.trend(t) ? { x: rise, y: -1 } : { x: -rise, y: 1 }, x: t }))
}

/** The graph drawn with these names and arrows: the wave, the trend, the turns' names, and letters for a quiz. */
function draw(s: BusinessCycleSettings, wave: Wave, nameEnds: boolean, calls: (Call & { spots?: CalloutSpec['spots'] })[]) {
  const ink = inks(s.ink === 'bw')

  // Everything labeled, in order along the wave, so a quiz's letters run left to right.
  type Item = { x: number; key: LabelKey; name: Words; place: (name: Words) => void }
  const items: Item[] = []
  const word = (key: LabelKey) => wordsOf(s, key)

  const points: PointSpec[] = []
  for (const t of wave.turns) {
    const key = t.kind === 'peak' ? 'peakLabel' : 'troughLabel'
    const point: PointSpec = { at: t, dot: s.dots, side: t.kind === 'peak' ? 'above' : 'below' }
    points.push(point)
    if (shown(s, key) && (nameEnds || !atEnd(t))) items.push({ x: t.x, key, name: word(key), place: (name) => (point.name = name) })
  }
  const callouts: CalloutSpec[] = calls.map((c) => {
    const callout: CalloutSpec = { at: c.at, toward: c.toward, name: word(c.key), spots: c.spots }
    items.push({ x: c.x, key: c.key, name: word(c.key), place: (name) => (callout.name = name) })
    return callout
  })

  // Written labels become letters for a quiz; blank lines stay blank.
  items.sort((a, b) => a.x - b.x)
  let letter = 0
  const answers: { letter: string; key: LabelKey }[] = []
  for (const item of items) {
    if (s.style === 'letters' && item.name.mode === 'text') {
      const l = LETTERS[letter++ % LETTERS.length]
      answers.push({ letter: l, key: item.key })
      item.place({ text: l, mode: 'text' })
    } else item.place(item.name)
  }

  // Recessions shaded, from each peak down to the trough after it.
  const regions: RegionSpec[] = []
  if (s.shade) {
    for (const p of wave.phases.filter((p) => !p.rising)) {
      regions.push({ poly: [{ x: p.x0, y: 0 }, { x: p.x1, y: 0 }, { x: p.x1, y: 10 }, { x: p.x0, y: 10 }], color: ink.region.gray, hatch: 45 })
    }
  }

  const trend: CurveSpec = { pts: [{ x: TREND.x0, y: wave.trend(TREND.x0) }, { x: TREND.x1, y: wave.trend(TREND.x1) }], color: ink.black, dash: '9 6', width: 2 }
  const gdp: CurveSpec = { pts: graphOf(wave.y, WAVE.x0, WAVE.x1, 400), color: ink.demand }
  const spec: PanelSpec = { ...panelBase({ ...s, look: 'schematic' }, AXES), regions, curves: [trend, gdp], points, callouts }
  const figure = buildFigure([spec])
  if (s.shade && s.ink === 'bw') haloed(figure)
  return { figure, answers }
}

/**
 * In black and white, the hatching thinned to white under the wave, the
 * trend and the arrows, as the labels have it under their letters, so the
 * trend's dashes and the arrowheads don't run into the hatch lines.
 */
function haloed(figure: FigureLayout) {
  const p = figure.panels[0]
  const halo = (paths: string[], width: number) => ({ paths, color: '#fff', dash: undefined, width })
  const arrows = p.leaders.map((l) => `M${l.x1} ${l.y1}L${l.x2} ${l.y2}`)
  p.curves = [...p.curves.map((c) => halo(c.paths, c.width + 5)), halo(arrows, 7), ...p.curves]
}

/** The room the phases' names have, from the graph laid out without them. */
function roomOf(panel: PanelLayout, s: BusinessCycleSettings, wave: Wave): Room {
  const boxes = labelBoxes(panel)
  // The turns' names come first, the axes' words last.
  const words = ['xTitle', 'yTitle'].filter((k) => shows(wordsOf(s, k as 'xTitle'))).length
  const names = boxes.slice(0, boxes.length - words)
  const bands: [number, number][] = s.shade ? wave.phases.filter((p) => !p.rising).map((p) => [panel.px({ x: p.x0, y: 0 }).x, panel.px({ x: p.x1, y: 0 }).x]) : []
  // The wave, the trend and the axes.
  const lines = [
    graphOf(wave.y, WAVE.x0, WAVE.x1, 400).map(panel.px),
    [TREND.x0, TREND.x1].map((x) => panel.px({ x, y: wave.trend(x) })),
    [{ x: panel.yAxis.x, y: panel.yAxis.y2 }, { x: panel.yAxis.x, y: panel.xAxis.y }, { x: panel.xAxis.x2, y: panel.xAxis.y }],
  ]
  return { px: panel.px, names, xEnd: panel.xAxis.x2, fs: panel.labelFs, bands, lines }
}

/** Every label on a panel, as a box. */
function labelBoxes(panel: PanelLayout): Box[] {
  return panel.labels.map((l) => textBox(l, l.runs ? runsWidth(l.runs, panel.labelFs) * 1.04 + 2 : Math.abs((l.blank?.x2 ?? 0) - (l.blank?.x1 ?? 0)), panel.labelFs))
}

const near = (b: Box, by: number, byY = by): Box => ({ x0: b.x0 - by, y0: b.y0 - byY, x1: b.x1 + by, y1: b.y1 + byY })
const meet = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
/** Whether two labels are one over the other, near enough and lined up enough to read as one label on two lines. */
const stacked = (a: Box, b: Box, fs: number, share = 0.3) => {
  const across = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  return across > share * Math.min(a.x1 - a.x0, b.x1 - b.x0) && Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1) < fs
}

/**
 * How out of place a name's words would be, 0 for not at all: most, past
 * the end of the time axis or over or under a peak's or trough's name as if
 * one label with it; less, a rise's in a recession band, the less the less of
 * them is in it.
 */
function outOfPlace(b: Box, room: Room, rising: boolean | undefined) {
  if (b.x1 > room.xEnd) return 200
  if (room.names.some((n) => meet(near(b, 2), n) || stacked(b, n, room.fs * 0.9) || stacked(b, n, room.fs * 1.5, 0.6))) return 200
  if (rising !== true) return 0
  const inBands = room.bands.reduce((sum, [x0, x1]) => sum + Math.max(0, Math.min(b.x1, x1) - Math.max(b.x0, x0) - 2), 0)
  return inBands > 0 ? 100 + (50 * inBands) / (b.x1 - b.x0) : 0
}

/**
 * A name's places close by its point, every way round, each with the
 * nearest edge of the words that far from the point: those nearest the way
 * its words would best go and nearest the point first, so the words go on
 * the wave's other side only if they must, and those out of place last.
 */
function withSpots(c: Call, room: Room, s: BusinessCycleSettings): Call & { spots: CalloutSpec['spots'] } {
  const name = wordsOf(s, c.key)
  const text = s.style === 'letters' && name.mode === 'text' ? 'W' : name.text.trim()
  const spots = (at: Point, fs: number): Spot[] => {
    const width = name.mode === 'blank' ? 46 : Math.min(fs * 10, runsWidth(runsOf(text, fs), fs) * 1.04 + 2)
    const len = Math.hypot(c.toward.x, c.toward.y) || 1
    const places: { cost: number; spot: Spot }[] = []
    for (const r of c.phase ? [30, 40, 52, 66] : [30, 40, 52, 66, 82, 100]) {
      for (let k = 0; k < 16; k++) {
        const a = (k * Math.PI) / 8
        const [dx, dy] = [Math.cos(a), Math.sin(a)]
        const anchor = dx > 0.3 ? 'start' : dx < -0.3 ? 'end' : 'middle'
        // Words below hang from their top, words above stand on their descenders, words level are centered on the point's height.
        const y = at.y + r * dy + (dy > 0.3 ? fs * 0.78 : dy < -0.3 ? -fs * 0.3 : fs * 0.24)
        const spot: Spot = { x: at.x + r * dx, y, anchor }
        const off = Math.acos(Math.max(-1, Math.min(1, (dx * c.toward.x - dy * c.toward.y) / len)))
        const out = outOfPlace(textBox(spot, width, fs), room, c.phase?.rising)
        places.push({ cost: off + ((r - 30) / 52) * 0.8 + out, spot })
      }
    }
    return places.sort((a, b) => a.cost - b.cost).map((p) => p.spot)
  }
  return { ...c, spots }
}

const lengthOf = (l: Segment) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1)
const side = (s: Segment, x: number, y: number) => Math.sign((s.x2 - s.x1) * (y - s.y1) - (s.y2 - s.y1) * (x - s.x1))
const cross = (a: Segment, b: Segment) => side(a, b.x1, b.y1) * side(a, b.x2, b.y2) < 0 && side(b, a.x1, a.y1) * side(b, a.x2, a.y2) < 0
const segmentsOf = (run: Point[]): Segment[] => run.slice(1).map((p, k) => ({ x1: run[k].x, y1: run[k].y, x2: p.x, y2: p.y }))

/**
 * What's wrong with each name and its arrow, as laid out: HARD for each
 * arrow it crosses, each line its words or its arrow cross, each label its
 * words or arrow run into or sit right over or under, an arrow over twice
 * as long as a far one, words past the end of the time axis, or a rise's
 * words mostly in a recession band; SOFT for an arrow brushing past a
 * peak's or trough's name, or words over or under another label near
 * enough to read as one with it; BAND, the more the more of them is in it,
 * for a rise's words partly in a recession band.
 */
function flawsOf(panel: PanelLayout, calls: Call[], room: Room): number[] {
  const boxes = labelBoxes(panel)
  const lines = room.lines.flatMap(segmentsOf)
  const isName = (b: Box) => room.names.some((n) => Math.abs(n.x0 - b.x0) < 0.5 && Math.abs(n.y0 - b.y0) < 0.5)
  // Each name's words, by where its arrow starts (which can be inside a peak's or trough's name).
  const own = boxes.filter((b) => !isName(b))
  const laid = calls.map((c) => {
    const p = panel.px(c.at)
    const leader = panel.leaders.find((l) => Math.hypot(l.x2 - p.x, l.y2 - p.y) < 6)
    const from = leader ? { x: leader.x1, y: leader.y1 } : p
    const box = own.reduce((a, b) => (dist(b, from) < dist(a, from) ? b : a))
    return { leader, box }
  })
  // Two names in each other's way are put down to the one laid out later, which went there knowing the other was.
  return calls.map((c, k) => {
    const { leader, box } = laid[k]
    const later = new Set(laid.slice(k + 1).map((o) => o.box))
    const others = boxes.filter((b) => b !== box && !later.has(b))
    const before = laid.slice(0, k).flatMap((o) => (o.leader ? [o.leader] : []))
    let hard = 0
    let soft = 0
    if (leader) {
      const f = Math.max(0, (lengthOf(leader) - 8) / lengthOf(leader))
      const short = { ...leader, x2: leader.x1 + (leader.x2 - leader.x1) * f, y2: leader.y1 + (leader.y2 - leader.y1) * f }
      hard += before.filter((l) => cross(short, l)).length
      hard += lines.filter((l) => cross(short, l)).length
      hard += others.filter((b) => crosses(short, near(b, 3))).length
      soft += others.filter((b) => isName(b) && !crosses(short, near(b, 3)) && crosses(short, near(b, 10))).length
      if (lengthOf(leader) > FAR * (c.phase ? 2 : 2.5)) hard++
    }
    hard += before.filter((l) => crosses(l, near(box, 3))).length
    hard += lines.some((l) => crosses(l, near(box, 3))) ? 1 : 0
    hard += others.filter((b) => meet(near(box, 3), b) || stacked(box, b, room.fs * 0.5)).length
    soft += others.filter((b) => !meet(near(box, 3), b) && !stacked(box, b, room.fs * 0.5) && (stacked(box, b, room.fs * 0.9) || (isName(b) && stacked(box, b, room.fs * 1.5, 0.6)))).length
    if (box.x1 > room.xEnd) hard++
    // A rise's name in a recession band: as bad as anything if mostly in one, and less the less of it is.
    const inBands = c.phase?.rising === true ? room.bands.reduce((sum, [x0, x1]) => sum + Math.max(0, Math.min(box.x1, x1) - Math.max(box.x0, x0) - 2), 0) / (box.x1 - box.x0) : 0
    if (inBands > 0.6) hard++
    return hard * HARD + soft * SOFT + (inBands > 0 && inBands <= 0.6 ? BAND * (1 + 5 * inBands) : 0)
  })
}
const [HARD, SOFT, BAND] = [100, 40, 10]

const dist = (b: Box, p: Point) => Math.hypot(Math.max(b.x0 - p.x, 0, p.x - b.x1), Math.max(b.y0 - p.y, 0, p.y - b.y1))

/** How far a panel's arrows run past FAR, all told, a little for each pixel. */
const reachOf = (panel: PanelLayout) => panel.leaders.reduce((sum, l) => sum + Math.max(0, lengthOf(l) - FAR), 0) / 100

/** The figure in words, for screen readers. */
function labelOf(s: BusinessCycleSettings, peaks: number, troughs: number) {
  if (s.titleMode === 'text' && s.title.trim()) return plainOf(s.title.trim())
  const trend = s.trend > 0 ? 'a rising long-run trend' : 'a flat long-run trend'
  const turns = [peaks && `${peaks} ${peaks === 1 ? 'peak' : 'peaks'}`, troughs && `${troughs} ${troughs === 1 ? 'trough' : 'troughs'}`].filter(Boolean)
  const parts = [`real GDP rises and falls around ${trend}`]
  if (turns.length) parts.push(`with ${turns.join(' and ')}`)
  if (s.shade) parts.push('recessions shaded')
  if (s.style === 'letters') parts.push('points lettered for a quiz')
  return `Business cycle graph: ${parts.join(', ')}`
}
