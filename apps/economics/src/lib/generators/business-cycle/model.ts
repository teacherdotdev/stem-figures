// The business cycle as a wave: real GDP swinging above and below a rising
// long-run trend, one swing after another. Each swing is half a cosine from
// a high to a low (or back), so the wave is a plain sine when every swing is
// the same; irregular cycles vary each swing's height and length, from a
// seed, so the same settings always draw the same wave, and bend each swing
// a little so it turns as sharply as the next where they meet, with no
// corner where a short, steep swing meets a long, gentle one. Where real GDP
// peaks and bottoms out, and the stretches where it rises and falls between
// them, are worked out from the wave as drawn, trend and all; a wave asked
// to start or end at a peak or trough is fitted so it does, trend and all.

import type { Point } from '$shared/graph/grid'

/** Where the wave starts: at a trough, halfway up, at a peak or halfway down. */
export const STARTS = ['trough', 'rising', 'peak', 'falling'] as const
export type Start = (typeof STARTS)[number]
export const START_NAMES: Record<Start, string> = { trough: 'At a trough', rising: 'Rising', peak: 'At a peak', falling: 'Falling' }

/** How far into a cycle each start is, in half cycles from a trough. */
const START_AT: Record<Start, number> = { trough: 0, rising: 0.5, peak: 1, falling: 1.5 }

/** How much irregular cycles vary, at the most: each swing's height and each half cycle's length, as shares. */
const HEIGHT_VARIES = 0.4
const LENGTH_VARIES = 0.45

export type WaveSettings = {
  /** how many cycles, peak to peak, in halves */
  cycles: number
  start: Start
  /** how far GDP swings above and below the trend, in the graph's units */
  amplitude: number
  /** how steeply the trend rises, in the graph's units up for each across */
  trend: number
  /** 0 for even waves, up to 1 for swings and lengths that vary the most */
  irregularity: number
  seed: number
}

export type Turn = Point & { kind: 'peak' | 'trough' }
/**
 * A stretch of the wave between turning points (or the graph's ends):
 * rising or falling, whether it starts and ends at a turn, and whether it
 * runs turn to turn.
 */
export type Phase = { x0: number; x1: number; rising: boolean; fromTurn: boolean; toTurn: boolean; whole: boolean }

/** A repeatable stream of random numbers from 0 to 1 (mulberry32, as Biology's Population Growth scatters its counts). */
export function random(seed: number) {
  let a = Math.floor(seed) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let x = Math.imul(a ^ (a >>> 15), 1 | a)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The wave from `x0` to `x1` across the graph, raised and squeezed so it
 * and the trend fit between `lo` and `hi` up the graph (squeezed only when
 * they wouldn't otherwise), with its turning points and phases.
 */
export function waveOf(w: WaveSettings, { x0, x1, lo, hi, trendFrom = x0, trendTo = x1 }: { x0: number; x1: number; lo: number; hi: number; trendFrom?: number; trendTo?: number }) {
  // Each swing's height (troughs below the trend, peaks above) and each half cycle's length.
  const next = random(w.seed)
  const heights: number[] = []
  const lengths: number[] = []
  for (let k = 0; k <= Math.ceil(START_AT[w.start] + 2 * w.cycles) + 1; k++) {
    heights.push((k % 2 ? 1 : -1) * w.amplitude * (1 + w.irregularity * HEIGHT_VARIES * (2 * next() - 1)))
    lengths.push(1 + w.irregularity * LENGTH_VARIES * (2 * next() - 1))
  }
  // And a fall into the first trough, for a wave that starts at it.
  heights.unshift(w.amplitude)
  lengths.unshift(lengths[0])
  const from = START_AT[w.start] + 1
  const to = from + 2 * w.cycles
  const count = heights.length - 1
  const starts = [0]
  for (let k = 0; k < count; k++) starts.push(starts[k] + lengths[k])
  // How sharply each swing turns at its ends, as a share of a half cosine's
  // turn: where two swings meet, each bends to turn as sharply as the other
  // (as sharply as the two's geometric mean), so the wave's curvature runs
  // on smoothly; by a factor of 3 at most, so no swing bends back on itself.
  // Even swings are left half cosines.
  const sharp = (k: number) => Math.abs(heights[k + 1] - heights[k]) / lengths[k] ** 2
  const bendAt = (k: number, toward: number) => (toward < 0 || toward >= count ? 1 : Math.min(3, Math.max(1 / 3, Math.sqrt(sharp(toward) / sharp(k)))))
  const bends = Array.from({ length: count }, (_, k) => ({ start: bendAt(k, k - 1), end: bendAt(k, k + 1) }))
  // A swing from 0 to 1 as `f` runs from 0 to 1, level at both ends: half a
  // cosine, bent by the quintic that changes only how sharply it turns at each end.
  const HALF = Math.PI ** 2 / 2
  const shape = (k: number, f: number) => {
    const [a, b] = [HALF * (bends[k].start - 1), -HALF * (bends[k].end - 1)]
    return (1 - Math.cos(Math.PI * f)) / 2 + a * (f ** 2 / 2 - (3 * f ** 3) / 2 + (3 * f ** 4) / 2 - f ** 5 / 2) + b * (f ** 3 / 2 - f ** 4 + f ** 5 / 2)
  }
  const shapeSlope = (k: number, f: number) => {
    const [a, b] = [HALF * (bends[k].start - 1), -HALF * (bends[k].end - 1)]
    return (Math.PI / 2) * Math.sin(Math.PI * f) + a * f * (1 - f) ** 2 * (1 - 2.5 * f) + b * f ** 2 * (1 - f) * (1.5 - 2.5 * f)
  }
  // Time in half cycles' worth of length, from the high before the first trough.
  const timeAt = (h: number) => {
    const k = Math.min(count - 1, Math.floor(h))
    return starts[k] + (h - k) * lengths[k]
  }
  // Where real GDP turns by the swings' high or low `k`, with the trend
  // rising `g` for each unit of time: a peak a little after the high, the
  // trend carrying it on up until the fall is steeper than the trend; a
  // trough a little before the low. None if the fall is never that steep.
  const turnNear = (k: number, g: number) => {
    const peak = heights[k] > 0
    const j = peak ? k : k - 1
    // How far into the fall (after the high, or back from the low) it first falls as steeply as the trend rises.
    const steep = (f: number) => (Math.abs(heights[j + 1] - heights[j]) * shapeSlope(j, peak ? f : 1 - f)) / lengths[j] - g
    const STEPS = 200
    let f = 1
    for (let i = 1; i <= STEPS; i++) {
      if (steep(i / STEPS) < 0) continue
      let [a, b] = [(i - 1) / STEPS, i / STEPS]
      for (let n = 0; n < 50; n++) {
        const m = (a + b) / 2
        if (steep(m) < 0) a = m
        else b = m
      }
      f = (a + b) / 2
      break
    }
    if (f === 1) return null
    return peak ? starts[k] + f * lengths[k] : starts[k] - f * lengths[k - 1]
  }
  // A wave asked to start (or end) at a peak or trough starts (or ends)
  // where real GDP turns, trend and all, so one cycle from a peak runs to
  // the next peak. How steep the trend is in time depends on how much time
  // fits across, which depends on where the turns are: it settles in a few rounds.
  let t0 = timeAt(from)
  let t1 = timeAt(to)
  const turnsAt = { start: false, end: false }
  for (let i = 0; i < 40 && (Number.isInteger(from) || Number.isInteger(to)); i++) {
    const g = (w.trend * (x1 - x0)) / (t1 - t0)
    const a = Number.isInteger(from) ? turnNear(from, g) : null
    const b = Number.isInteger(to) ? turnNear(to, g) : null
    turnsAt.start = a !== null
    turnsAt.end = b !== null
    const moved = Math.abs((a ?? timeAt(from)) - t0) + Math.abs((b ?? timeAt(to)) - t1)
    t0 = a ?? timeAt(from)
    t1 = b ?? timeAt(to)
    if (moved < 1e-12) break
  }
  const perX = (t1 - t0) / (x1 - x0)
  const swing = (x: number) => {
    const t = t0 + (x - x0) * perX
    let k = 0
    while (k < count - 1 && starts[k + 1] <= t) k++
    const f = (t - starts[k]) / lengths[k]
    const a = heights[k]
    const b = heights[k + 1]
    return { at: a + (b - a) * shape(k, f), slope: ((b - a) * shapeSlope(k, f) * perX) / lengths[k] }
  }
  const rawTrend = (x: number) => w.trend * (x - x0)
  const raw = (x: number) => rawTrend(x) + swing(x).at
  const rawSlope = (x: number) => w.trend + swing(x).slope

  // Fit: the lowest and highest the wave and the trend reach, moved and squeezed into lo to hi.
  const N = 600
  const xs = Array.from({ length: N + 1 }, (_, k) => x0 + ((x1 - x0) * k) / N)
  const ys = [...xs.map(raw), rawTrend(trendFrom), rawTrend(trendTo)]
  const min = Math.min(...ys)
  const max = Math.max(...ys)
  const scale = Math.min(1, (hi - lo) / Math.max(1e-9, max - min))
  const base = (lo + hi) / 2 - ((min + max) / 2) * scale
  const y = (x: number) => base + raw(x) * scale
  const trend = (x: number) => base + rawTrend(x) * scale

  // Turning points, where the slope changes sign, found by halving.
  const turns: Turn[] = []
  for (let k = 1; k <= N; k++) {
    let a = xs[k - 1]
    let b = xs[k]
    const sa = rawSlope(a)
    const sb = rawSlope(b)
    if (!(sa > 0 && sb <= 0) && !(sa < 0 && sb >= 0)) continue
    for (let i = 0; i < 50; i++) {
      const m = (a + b) / 2
      if (Math.sign(rawSlope(m)) === Math.sign(sa)) a = m
      else b = m
    }
    const x = (a + b) / 2
    // Not where the wave just starts or stops level, at the graph's ends.
    if (x - x0 < (x1 - x0) * 1e-3 || x1 - x < (x1 - x0) * 1e-3) continue
    turns.push({ x, y: y(x), kind: sa > 0 ? 'peak' : 'trough' })
  }
  // Unless it was asked to start or end at a turn, and does.
  if (turnsAt.start) turns.unshift({ x: x0, y: y(x0), kind: heights[from] > 0 ? 'peak' : 'trough' })
  if (turnsAt.end) turns.push({ x: x1, y: y(x1), kind: heights[to] > 0 ? 'peak' : 'trough' })
  // The stretches between them, or between one and the graph's end.
  const turning = new Set(turns.map((t) => t.x))
  const edges = [...new Set([x0, ...turning, x1])]
  const phases: Phase[] = []
  for (let k = 1; k < edges.length; k++) {
    const a = edges[k - 1]
    const b = edges[k]
    if (b - a < 1e-6) continue
    phases.push({ x0: a, x1: b, rising: rawSlope((a + b) / 2) > 0, fromTurn: turning.has(a), toTurn: turning.has(b), whole: turning.has(a) && turning.has(b) })
  }
  const falls = xs.some((x) => rawSlope(x) < 0)

  return { y, trend, turns, phases, falls, x0, x1 }
}

export type Wave = ReturnType<typeof waveOf>
