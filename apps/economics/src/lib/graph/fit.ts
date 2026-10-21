// Numbered axes fitted to what's on a graph: each from a nice number to a
// nice number, counted by 1, 2, 2.5 or 5 times a power of ten, in about as
// many blocks as wanted. While an axis is fitted, the range boxes show the
// fitted range; typing in one takes over for that axis (`typeRange`).
// Started as Biology's Photosynthesis Rate's niceAxis.

import type { RangeSettings } from '$shared/graph/axes'

const NICE = [1, 2, 2.5, 5]
const numText = (v: number) => String(Number(v.toPrecision(12)))

/** An axis from `lo` to `hi` in about `target` nice blocks, as range text. */
export function niceAxis(lo: number, hi: number, target = 10) {
  const span = hi - lo > 0 ? hi - lo : Math.abs(hi) || 1
  let best: { score: number; from: number; step: number; blocks: number } | null = null
  const e0 = Math.floor(Math.log10(span / target))
  for (let e = e0 - 1; e <= e0 + 1; e++) {
    for (const m of NICE) {
      const step = Number((m * 10 ** e).toPrecision(12))
      const from = Math.floor(lo / step + 1e-9) * step
      const blocks = Math.max(1, Math.ceil((hi - from) / step - 1e-9))
      if (blocks < 4 || blocks > 40) continue
      const score = Math.abs(blocks - target) + (m === 2.5 ? 1.5 : 0)
      if (!best || score < best.score) best = { score, from, step, blocks }
    }
  }
  const b = best ?? { from: lo, step: span / target, blocks: target }
  return { from: numText(b.from), to: numText(b.from + b.blocks * b.step), step: numText(b.step) }
}

/** Ranges fitted to x from `x0` to `x1` and y from `y0` to `y1`. */
export function fitted(x0: number, x1: number, y0: number, y1: number, blocks = 10): RangeSettings {
  const x = niceAxis(x0, x1, blocks)
  const y = niceAxis(y0, y1, blocks)
  return { xFrom: x.from, xTo: x.to, xStep: x.step, yFrom: y.from, yTo: y.to, yStep: y.step }
}

/** The ranges drawn: the fitted ones while `fit` is on, or as typed. */
export const rangesOf = (s: RangeSettings & { fit: boolean }, fit: RangeSettings): RangeSettings =>
  s.fit ? fit : { xFrom: s.xFrom, xTo: s.xTo, xStep: s.xStep, yFrom: s.yFrom, yTo: s.yTo, yStep: s.yStep }

/** The change typing `v` into a range box makes: the fitted ranges kept as typed ones, fitting off, and the new value. */
export const typeRange = (key: keyof RangeSettings, v: string, s: { fit: boolean }, fit: RangeSettings): Partial<RangeSettings> & { fit?: boolean } =>
  s.fit ? { ...fit, fit: false, [key]: v } : { [key]: v }
