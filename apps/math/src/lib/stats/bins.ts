// Bins as teachers type them in a frequency table, and data sets sorted into
// bins, for the Histogram and Cumulative Frequency generators. A bin is a
// stretch of the axis from `lo` to `hi`; which end holds a value sitting on it
// comes from how it was typed (10 ≤ x < 20 holds 10, 10 < x ≤ 20 holds 20) or,
// for a plain 10–20, from the table's edge choice.

export type Edge = 'left' | 'right' // which end of a bin holds a value on it
export type Bin = { lo: number; hi: number; holds: Edge | null }

const NUM = String.raw`[-−]?(?:\d+\.?\d*|\.\d+)`
const num = (t: string) => Number(t.replace('−', '-'))
const LESS = String.raw`(<=|≤|<|=<)`
const RANGE = new RegExp(String.raw`^\s*(${NUM})\s*(?:–|—|-|to)\s*(${NUM})\s*$`, 'i')
const BETWEEN = new RegExp(String.raw`^\s*(${NUM})\s*${LESS}\s*[a-z]\s*${LESS}\s*(${NUM})\s*$`, 'i')

/** A bin as typed: 10–20, 10-20, 10 to 20, 10 ≤ x < 20 or 20 < t <= 30. */
export function parseBin(typed: string): Bin | { problem: string } {
  const t = typed.trim()
  let m = t.match(RANGE)
  let bin: Bin | null = null
  if (m) bin = { lo: num(m[1]), hi: num(m[2]), holds: null }
  else if ((m = t.match(BETWEEN))) {
    const loIn = m[2] !== '<'
    const hiIn = m[3] !== '<'
    bin = { lo: num(m[1]), hi: num(m[4]), holds: loIn && !hiIn ? 'left' : hiIn && !loIn ? 'right' : null }
  }
  if (!bin) return { problem: `Type “${t}” as two numbers, like 10–20 or 10 ≤ x < 20.` }
  if (!(bin.hi > bin.lo)) return { problem: `A bin has to end after it starts, so “${t}” needs its bigger number second.` }
  return bin
}

/** Bins in order: each starting where the one before ends, or a message saying where they don't. */
export function checkBins(bins: Bin[]): string | null {
  for (let i = 1; i < bins.length; i++) {
    const a = bins[i - 1]
    const b = bins[i]
    if (Math.abs(b.lo - a.hi) < 1e-9) continue
    if (b.lo > a.hi) return `There's a gap between ${a.hi} and ${b.lo}. Each bin starts where the one before it ends.`
    return `The bins from ${a.lo} and ${b.lo} overlap. Put them in order, each starting where the one before it ends.`
  }
  return null
}

/**
 * A data set sorted into bins `width` wide from `start`, enough of them to
 * hold every value. A value on an edge goes in the bin whose `holds` end it is,
 * so with bins that hold their right ends a value on `start` gets a bin before it.
 */
export function binData(values: number[], start: number, width: number, holds: Edge): { bins: Bin[]; counts: number[] } {
  if (!values.length || !(width > 0)) return { bins: [], counts: [] }
  const max = Math.max(...values)
  const min = Math.min(...values)
  const below = holds === 'right' ? Math.ceil((min - start) / width - 1e-9) - 1 : Math.floor((min - start) / width + 1e-9)
  const first = Math.min(start, start + below * width)
  // A value exactly on the last edge needs a bin of its own unless bins hold their right end.
  let n = Math.max(1, Math.ceil((max - first) / width - 1e-9))
  if (holds === 'left' && Math.abs(first + n * width - max) < 1e-9) n++
  const bins = Array.from({ length: n }, (_, i) => ({ lo: tidy(first + i * width), hi: tidy(first + (i + 1) * width), holds }))
  const counts = bins.map(() => 0)
  for (const v of values) {
    const k = (v - first) / width
    let i = Math.floor(k + 1e-9)
    if (holds === 'right' && Math.abs(k - Math.round(k)) < 1e-9) i = Math.round(k) - 1
    counts[Math.min(n - 1, Math.max(0, i))]++
  }
  return { bins, counts }
}

const tidy = (v: number) => Number(v.toPrecision(12)) || 0
