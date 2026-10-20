// The business cycle as a wave: real GDP swinging above and below a rising
// long-run trend, one swing after another. Each swing is half a cosine from
// a high to a low (or back), so the wave is a plain sine when every swing is
// the same; irregular cycles vary each swing's height and length, from a
// seed, so the same settings always draw the same wave. Where real GDP
// peaks and bottoms out, and the stretches where it rises and falls between
// them, are worked out from the wave as drawn, trend and all.

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
/** A stretch of the wave between turning points (or the graph's ends): rising or falling, and whether it runs turn to turn. */
export type Phase = { x0: number; x1: number; rising: boolean; whole: boolean }

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
  const from = START_AT[w.start]
  const to = from + 2 * w.cycles
  const count = Math.ceil(to) + 1
  // Each swing's height (troughs below the trend, peaks above) and each half cycle's length.
  const next = random(w.seed)
  const heights: number[] = []
  const lengths: number[] = []
  for (let k = 0; k <= count; k++) {
    heights.push((k % 2 ? 1 : -1) * w.amplitude * (1 + w.irregularity * HEIGHT_VARIES * (2 * next() - 1)))
    lengths.push(1 + w.irregularity * LENGTH_VARIES * (2 * next() - 1))
  }
  const starts = [0]
  for (let k = 0; k < count; k++) starts.push(starts[k] + lengths[k])
  // Time in half cycles' worth of length, from the first trough.
  const timeAt = (h: number) => {
    const k = Math.min(count - 1, Math.floor(h))
    return starts[k] + (h - k) * lengths[k]
  }
  const t0 = timeAt(from)
  const t1 = timeAt(to)
  const perX = (t1 - t0) / (x1 - x0)
  const swing = (x: number) => {
    const t = t0 + (x - x0) * perX
    let k = 0
    while (k < count - 1 && starts[k + 1] <= t) k++
    const f = (t - starts[k]) / lengths[k]
    const a = heights[k]
    const b = heights[k + 1]
    return { at: a + ((b - a) * (1 - Math.cos(Math.PI * f))) / 2, slope: (((b - a) * Math.PI) / 2) * Math.sin(Math.PI * f) / lengths[k] * perX }
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
  // The stretches between them.
  const edges = [x0, ...turns.map((t) => t.x), x1]
  const phases: Phase[] = []
  for (let k = 1; k < edges.length; k++) {
    const a = edges[k - 1]
    const b = edges[k]
    if (b - a < 1e-6) continue
    phases.push({ x0: a, x1: b, rising: rawSlope((a + b) / 2) > 0, whole: k > 1 && k < edges.length - 1 })
  }
  const falls = xs.some((x) => rawSlope(x) < 0)

  return { y, trend, turns, phases, falls, x0, x1 }
}

export type Wave = ReturnType<typeof waveOf>
