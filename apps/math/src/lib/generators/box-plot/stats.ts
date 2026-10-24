// The statistics behind a box plot: reading a data set as typed, its
// five-number summary worked out the way a TI-84 does, and its outliers.
// Reading and summing up are Math's shared ones, in $lib/stats/data.

import type { Summary } from '$lib/stats/data'

export { niceRange, parseData, summarize, type Summary } from '$lib/stats/data'
export const SUMMARY_KEYS = ['min', 'q1', 'median', 'q3', 'max'] as const
export type SummaryKey = (typeof SUMMARY_KEYS)[number]

/**
 * Where the whiskers end when outliers are drawn apart: at the last values
 * within 1.5 box widths of the box. The rest are outliers.
 */
export function withOutliers(values: number[], sum: Summary): { lo: number; hi: number; outliers: number[] } {
  const reach = 1.5 * (sum.q3 - sum.q1)
  const inside = (v: number) => v >= sum.q1 - reach - 1e-9 && v <= sum.q3 + reach + 1e-9
  const kept = values.filter(inside)
  return {
    lo: Math.min(...kept),
    hi: Math.max(...kept),
    outliers: values.filter((v) => !inside(v)).sort((a, b) => a - b),
  }
}

/** Five numbers in order, smallest first, read as a summary rather than data. */
export const looksLikeSummary = (values: number[]) => values.length === 5 && values.every((v, i) => i === 0 || v >= values[i - 1])
