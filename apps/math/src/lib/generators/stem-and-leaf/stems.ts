// Splitting values into stems and leaves. The leaf is a value's digit at the
// leaf unit (1 for 34's 4, 0.1 for 2.3's 3) and the stem every digit before
// it; digits past the leaf unit are cut off, not rounded, as textbooks do.
//
// Each row of the plot has a place in order, counted from the row holding 0
// to 0.9 (or 0 to 9, …): 0, 1, 2 … upward, and −1, −2 … for the negative rows
// below it. A negative stem's leaves count down from it, so −0 (for −0.1 to
// −9) is its own row, under 0. With split stems a stem takes two rows (leaves
// 0–4, then 5–9) or five (0–1, 2–3 …), and a negative stem's rows run the
// other way, so the plot always reads from the smallest value to the largest.

/** The leaf units a teacher can pick. */
export const UNITS = [0.01, 0.1, 1, 10, 100] as const
/** How many rows each stem takes. */
export const SPLITS = [1, 2, 5] as const
export type Split = (typeof SPLITS)[number]

/** The most rows a plot can have. */
export const MAX_ROWS = 40

/** A value at the leaf unit: its stem and leaf, its row, and the value it now stands for. */
export type Placed = {
  negative: boolean
  /** the stem's size, as a count of tens of leaf units (3 for 34) */
  stem: number
  /** 0 to 9 */
  leaf: number
  row: number
  /** the value with the digits past the leaf unit cut off */
  value: number
  /** whether any digits were cut off */
  cut: boolean
}

/** A row of the plot by its place in order: its stem and which of the stem's rows it is. */
export type RowPlace = { negative: boolean; stem: number; part: number }

const exact = (v: number) => Number(v.toPrecision(12))
/** How many decimals a leaf unit has: 2 for 0.01, 0 for 1 or 10. */
export const decimalsOfUnit = (unit: number) => Math.max(0, -Math.round(Math.log10(unit)))

/** The row a stem and leaf go on. */
export function rowOf(negative: boolean, stem: number, leaf: number, split: Split): number {
  const t = stem * split + Math.floor(leaf / (10 / split))
  return negative ? -t - 1 : t
}

/** The stem and part of the row at a place in order. */
export function placeOf(row: number, split: Split): RowPlace {
  const t = row < 0 ? -row - 1 : row
  return { negative: row < 0, stem: Math.floor(t / split), part: t % split }
}

/** A value split at the leaf unit, its extra digits cut off. */
export function place(v: number, unit: number, split: Split): Placed {
  const negative = v < 0
  // Leaf units in it, toward 0; toPrecision keeps 2.3 / 0.1 from coming to 22.999….
  const count = Math.trunc(exact(Math.abs(v) / unit))
  const value = (negative ? -1 : 1) * exact(count * unit)
  const stem = Math.floor(count / 10)
  const leaf = count % 10
  return { negative, stem, leaf, row: rowOf(negative, stem, leaf, split), value, cut: Math.abs(value - v) > 1e-9 * Math.max(1, Math.abs(v)) }
}

/** A stem as it's written: 3 (for 34), 2 (for 2.3), 2.3 (for 2.35 at 0.01) or −0. */
export function stemText(negative: boolean, stem: number, unit: number): string {
  const places = decimalsOfUnit(unit * 10)
  return (negative ? '−' : '') + (places ? (stem * unit * 10).toFixed(places) : String(stem))
}

/** A value as the key writes it, with the leaf unit's decimals: 34, 2.3, 340, −4. */
export function valueText(negative: boolean, stem: number, leaf: number, unit: number): string {
  const v = exact((stem * 10 + leaf) * unit)
  return (negative ? '−' : '') + v.toFixed(decimalsOfUnit(unit))
}

/** The pieces a teacher typed, as parseData splits them. */
const pieces = (text: string) => text.replace(/[−–]/g, '-').split(/[\s,;]+/).filter(Boolean)

/** The most decimals any typed number has (2 for "1.25, 3"), so 2.30 counts as 2. */
export function decimalsTyped(texts: string[]): number {
  let most = 0
  for (const p of texts.flatMap(pieces)) {
    if (/e/i.test(p) || !Number.isFinite(Number(p))) continue
    most = Math.max(most, p.split('.')[1]?.length ?? 0)
  }
  return most
}

/** How many rows the values need, from the lowest to the highest. */
export function rowsNeeded(values: number[], unit: number, split: Split): number {
  if (!values.length) return 0
  const rows = values.map((v) => place(v, unit, split).row)
  return Math.max(...rows) - Math.min(...rows) + 1
}

/**
 * The leaf unit worked out from what was typed: the last digit typed (1 for
 * whole numbers, 0.1 for one decimal, at most two decimals), or a bigger
 * unit if that would make more rows than a plot can have.
 */
export function autoUnit(texts: string[], values: number[], split: Split): number {
  let unit = exact(10 ** -Math.min(decimalsTyped(texts), 2))
  while (rowsNeeded(values, unit, split) > MAX_ROWS && unit < 1e12) unit = exact(unit * 10)
  return unit
}

/**
 * A stem typed for the first or last row, like 3, −0 or 2.3 (at a leaf unit
 * of 0.01), or null when it isn't a stem at this leaf unit.
 */
export function readStem(text: string, unit: number): { negative: boolean; stem: number } | null {
  const t = text.trim().replace(/[−–]/g, '-')
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return null
  const negative = t.startsWith('-')
  // Written as its digits: 3 is stem 3 whatever the unit, but 2.3 is 23 tenths.
  const stemPlace = unit * 10
  const size = exact(Math.abs(Number(t)) / (stemPlace < 1 ? stemPlace : 1))
  return Number.isInteger(size) ? { negative, stem: size } : null
}

/** The first row of a stem (its smallest values) and its last. */
export function stemRows(negative: boolean, stem: number, split: Split): { first: number; last: number } {
  const a = rowOf(negative, stem, 0, split)
  const b = rowOf(negative, stem, 9, split)
  return { first: Math.min(a, b), last: Math.max(a, b) }
}

/** Leaves in order from the stem outward: smallest value first, so a negative stem's biggest digit first. */
export function sortLeaves(leaves: Placed[]): Placed[] {
  return [...leaves].sort((a, b) => a.value - b.value)
}
