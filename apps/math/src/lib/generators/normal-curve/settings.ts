// Every choice the teacher makes, with its default. The page address carries
// any non-default values so a normal curve can be bookmarked or shared.
//
// The mean, SD and every typed number are kept as typed; readCurve() works
// out what they mean: each shaded region's bounds (typed as values or
// z-scores, or worked out from an area, as invNorm does) and its area, each
// marked value, and anything the teacher should fix.

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'
import { TITLE_MODES, type TitleMode } from '$shared/graph/axes'
import { fmt } from '$shared/graph/numbering'
import { parseNumber } from '$lib/shared/math.js'
import { FILLS, type Fill } from '$lib/stats/fills'
import { Phi, PhiInverse } from '$lib/stats/normal'

export { fmt }

/** How far either side of the mean the SD ticks go. */
export const REACHES = { 3: '±3σ', 4: '±4σ' } as const
/** What's written under each SD tick, in each of the two rows under the axis. */
export const NUMBERS = { values: 'Values', z: 'z-scores', symbols: 'μ ± σ', blank: 'Blank lines', none: 'None' } as const
export const SD_LINES = { dashed: 'Dashed', solid: 'Solid', off: 'Off' } as const
/** The percent of the area in each section between SD lines. */
export const PERCENTS = { off: 'Off', rule: 'Empirical rule', exact: 'Exact' } as const
export const LOOKS = { color: 'Color', bw: 'Black and white' } as const

/** A shaded region: which side of its bound (or bounds) it's on. */
export const KINDS = { left: 'Left of', right: 'Right of', between: 'Between', outside: 'Outside' } as const
/** How a region's bounds are given: as values, as z-scores, or by its area (the bound is worked out). */
export const BYS = { value: 'Values', z: 'z-scores', area: 'Area' } as const
/** What's written on a region: its area as a probability or a percent, a blank line, or nothing. */
export const AREA_LABELS = { probability: 'Probability', percent: 'Percent', blank: 'Blank', none: 'None' } as const
/** What's written at a region's bounds under the axis. */
export const BOUND_LABELS = { value: 'Value', z: 'z-score', blank: 'Blank', none: 'None' } as const
/** What's written over a marked value. */
export const MARK_LABELS = { value: 'Value', z: 'z-score', percentile: 'Percentile', text: 'Text', blank: 'Blank' } as const

export type Reach = 3 | 4
export type Numbers = keyof typeof NUMBERS
export type SdLines = keyof typeof SD_LINES
export type Percents = keyof typeof PERCENTS
export type Look = keyof typeof LOOKS
export type Kind = keyof typeof KINDS
export type By = keyof typeof BYS
export type AreaLabel = keyof typeof AREA_LABELS
export type BoundLabel = keyof typeof BOUND_LABELS
export type MarkLabel = keyof typeof MARK_LABELS

/** One shaded region as typed. `a` is its only bound (left of, right of), or its lower one; with `by: 'area'`, `a` is its area. */
export type Region = { kind: Kind; by: By; a: string; b: string; area: AreaLabel; bounds: BoundLabel; fill: Fill | '' }
/** One marked value as typed: a dotted line up to the curve with a label over it. */
export type Mark = { at: string; label: MarkLabel; text: string }

export const MAX_REGIONS = 4
export const MAX_MARKS = 6
/** How far from the mean, in SDs, anything can be drawn. */
export const MAX_Z = 6

export type Settings = {
  mean: string
  sd: string
  reach: Reach
  /** the first row of numbers under the SD ticks */
  numbers: Numbers
  /** a second row under it */
  second: Numbers
  /** more ticks, at values typed as a list */
  ticks: string
  sdLines: SdLines
  percents: Percents
  regions: Region[]
  marks: Mark[]
  look: Look
  /** a vertical axis of the curve's height (probability density) */
  density: boolean
  title: string
  titleMode: TitleMode
  xTitle: string
  xTitleMode: TitleMode
  labelSize: LabelSize
}
/** Settings as they may arrive: from a form, a link, or a preset stored by an older version. */
export type RawSettings = Record<string, any>

export const DEFAULT_SETTINGS: Settings = {
  mean: '0',
  sd: '1',
  reach: 3,
  numbers: 'values',
  second: 'none',
  ticks: '',
  sdLines: 'dashed',
  percents: 'off',
  regions: [],
  marks: [],
  look: 'color',
  density: false,
  title: '',
  titleMode: 'none',
  xTitle: '',
  xTitleMode: 'none',
  labelSize: 'medium',
}

/** A new region's settings, as Add a region makes it. */
export const newRegion = (): Region => ({ kind: 'right', by: 'value', a: '', b: '', area: 'probability', bounds: 'value', fill: '' })

const LISTS = ['regions', 'marks'] as const
type Scalar = Exclude<keyof Settings, (typeof LISTS)[number]>
const SCALARS = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).filter((k): k is Scalar => !(LISTS as readonly string[]).includes(k))

const text = (v: unknown, fallback: string) => (v === undefined || v === null ? fallback : String(v))
const oneOf = <T extends string>(names: Record<T, string>, v: any, fallback: T): T => (typeof v === 'string' && v in names ? (v as T) : fallback)
const bool = (v: unknown, fallback: boolean) => (v === undefined || v === null ? fallback : v === true || v === '1' || v === 'true')
const titleMode = (v: unknown, fallback: TitleMode) => ((TITLE_MODES as readonly unknown[]).includes(v) ? (v as TitleMode) : fallback)
const noBars = (v: unknown) => text(v, '').replace(/\|/g, '')

function cleanRegions(list: unknown): Region[] {
  const d = newRegion()
  return (Array.isArray(list) ? list : []).slice(0, MAX_REGIONS).map((r: any) => ({
    kind: oneOf(KINDS, r?.kind, d.kind),
    by: oneOf(BYS, r?.by, d.by),
    a: noBars(r?.a),
    b: noBars(r?.b),
    area: oneOf(AREA_LABELS, r?.area, d.area),
    bounds: oneOf(BOUND_LABELS, r?.bounds, d.bounds),
    fill: typeof r?.fill === 'string' && r.fill in FILLS ? (r.fill as Fill) : '',
  }))
}

function cleanMarks(list: unknown): Mark[] {
  return (Array.isArray(list) ? list : []).slice(0, MAX_MARKS).map((m: any) => ({
    at: noBars(m?.at),
    label: oneOf(MARK_LABELS, m?.label, 'value'),
    text: noBars(m?.text),
  }))
}

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  return {
    mean: text(s.mean, d.mean),
    sd: text(s.sd, d.sd),
    reach: Number(s.reach) === 4 ? 4 : 3,
    numbers: oneOf(NUMBERS, s.numbers, d.numbers),
    second: oneOf(NUMBERS, s.second, d.second),
    ticks: text(s.ticks, d.ticks),
    sdLines: oneOf(SD_LINES, s.sdLines, d.sdLines),
    percents: oneOf(PERCENTS, s.percents, d.percents),
    regions: cleanRegions(s.regions),
    marks: cleanMarks(s.marks),
    look: oneOf(LOOKS, s.look, d.look),
    density: bool(s.density, d.density),
    title: text(s.title, d.title),
    titleMode: titleMode(s.titleMode, d.titleMode),
    xTitle: text(s.xTitle, d.xTitle),
    xTitleMode: titleMode(s.xTitleMode, d.xTitleMode),
    labelSize: cleanLabelSize(s.labelSize),
  }
}

export function settingsToQuery(s: Settings): string {
  const params = new URLSearchParams()
  for (const key of SCALARS) {
    const v = s[key]
    if (v === DEFAULT_SETTINGS[key] || v === null || v === undefined) continue
    params.set(key, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
  }
  // One reg= per shaded region and one mark= per marked value.
  for (const r of s.regions) params.append('reg', [r.kind, r.by, r.a.trim(), r.b.trim(), r.area, r.bounds, r.fill].join('|'))
  for (const m of s.marks) params.append('mark', [m.at.trim(), m.label, m.text.trim()].join('|'))
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const s: RawSettings = {
    regions: params.getAll('reg').map((p) => {
      const [kind, by, a, b, area, bounds, fill] = p.split('|')
      return { kind, by, a, b, area, bounds, fill }
    }),
    marks: params.getAll('mark').map((p) => {
      const [at, label, text] = p.split('|')
      return { at, label, text }
    }),
  }
  for (const key of SCALARS) {
    if (params.has(key)) s[key] = params.get(key)
  }
  return cleanSettings(s)
}

// Reading the settings.

/** A number rounded for writing: to `places` decimal places, without trailing zeros. */
export const rounded = (v: number, places = 2) => fmt(Math.round(v * 10 ** places) / 10 ** places)

/** An area as a figure writes it: a probability to 4 decimal places, or a percent to 2. */
export function areaText(p: number, as: 'probability' | 'percent'): string {
  if (as === 'percent') return p > 0 && p < 0.00005 ? '<0.01%' : p < 1 && p > 0.99995 ? '>99.99%' : `${rounded(p * 100)}%`
  return p > 0 && p < 0.00005 ? '<0.0001' : p < 1 && p > 0.99995 ? '>0.9999' : rounded(p, 4)
}

/** 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st… */
export function ordinal(n: number): string {
  const tens = n % 100
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${suffix}`
}

/** A value's percentile rank, as a school report writes it: the 1st to the 99th, or <1st and >99th. */
export function percentileText(z: number): string {
  const p = Phi(z) * 100
  if (p < 0.5) return '<1st'
  if (p >= 99.5) return '>99th'
  return ordinal(Math.round(p))
}

/** One region as read: its bounds as z-scores (±Infinity for the open side), its area, and how it's named. */
export type ReadRegion = {
  index: number
  kind: Kind
  /** the stretches of the axis it covers, in z: one, or two for outside */
  spans: [number, number][]
  /** the bounds written under the axis, in z */
  bounds: number[]
  area: number
  /** e.g. "P(X > 130) = 0.0228" or "Top 10%: X > 119.22", for the readout and the screen reader */
  sentence: string
  settings: Region
}
export type ReadMark = { index: number; z: number; settings: Mark }

/** The curve's mean and SD, each region's bounds and area, the marks and extra ticks, and anything to fix. */
export function readCurve(s: Settings) {
  const problems: { mean: string | null; sd: string | null; ticks: string | null; regions: (string | null)[]; marks: (string | null)[] } = {
    mean: null,
    sd: null,
    ticks: null,
    regions: s.regions.map(() => null),
    marks: s.marks.map(() => null),
  }
  let mu = parseNumber(s.mean)
  let sigma = parseNumber(s.sd)
  if (mu === null) problems.mean = s.mean.trim() ? 'Type the mean as a number, like 0 or 100.' : 'Type the mean, like 0 or 100.'
  if (sigma === null) problems.sd = s.sd.trim() ? 'Type the standard deviation as a number, like 1 or 15.' : 'Type the standard deviation, like 1 or 15.'
  else if (sigma <= 0) problems.sd = 'The standard deviation has to be bigger than 0.'
  // A curve to draw meanwhile: the standard normal for whatever can't be read.
  if (mu === null) mu = 0
  if (sigma === null || sigma <= 0) sigma = 1
  const m = mu
  const sd = sigma
  const zOf = (x: number) => (x - m) / sd
  const xOf = (z: number) => m + z * sd
  const value = (z: number) => rounded(xOf(z))
  /** A number typed as a value or a z-score, as a z-score; null with a problem when it can't be read or is off the curve. */
  const typedZ = (typed: string, asZ: boolean, what: string): { z: number } | { problem: string } => {
    const v = parseNumber(typed)
    if (v === null) return { problem: typed.trim() ? `Type ${what} as a number, like ${asZ ? '1.5' : fmt(Number(xOf(1).toPrecision(6)))}.` : `Type ${what}.` }
    const z = asZ ? v : zOf(v)
    if (Math.abs(z) > MAX_Z) return { problem: `${typed.trim()} is more than ${MAX_Z} standard deviations from the mean, off the curve. Pick a value nearer ${fmt(m)}.` }
    return { z }
  }

  const regions: ReadRegion[] = []
  s.regions.forEach((r, index) => {
    const fail = (problem: string) => void (problems.regions[index] = problem)
    let lo: number
    let hi: number
    if (r.by === 'area') {
      const p = parseNumber(r.a.replace(/%\s*$/, ''))
      const area = p !== null && /%\s*$/.test(r.a) ? p / 100 : p
      if (area === null) return fail(r.a.trim() ? 'Type the area as a number between 0 and 1, like 0.95, or a percent, like 95%.' : 'Type the region’s area, like 0.95.')
      if (!(area > 0 && area < 1)) return fail('The area has to be between 0 and 1 (or 0% and 100%).')
      if (r.kind === 'left') [lo, hi] = [-Infinity, PhiInverse(area)]
      else if (r.kind === 'right') [lo, hi] = [PhiInverse(1 - area), Infinity]
      else if (r.kind === 'between') [lo, hi] = [PhiInverse((1 - area) / 2), PhiInverse((1 + area) / 2)]
      else [lo, hi] = [PhiInverse(area / 2), PhiInverse(1 - area / 2)]
      if (Math.max(Math.abs(lo), Math.abs(hi)) > MAX_Z && Number.isFinite(lo) && Number.isFinite(hi)) return fail('That area leaves a bound off the curve. Pick an area further from 0 and 1.')
      if ((r.kind === 'left' && hi < -MAX_Z) || (r.kind === 'right' && lo > MAX_Z)) return fail('That area is too small to show. Pick a bigger area.')
      if ((r.kind === 'left' && hi > MAX_Z) || (r.kind === 'right' && lo < -MAX_Z)) return fail('That area is too close to 1 to show. Pick a smaller area.')
    } else {
      const asZ = r.by === 'z'
      const two = r.kind === 'between' || r.kind === 'outside'
      const a = typedZ(r.a, asZ, two ? 'the lower bound' : 'the bound')
      if ('problem' in a) return fail(a.problem)
      if (!two) [lo, hi] = r.kind === 'left' ? [-Infinity, a.z] : [a.z, Infinity]
      else {
        const b = typedZ(r.b, asZ, 'the upper bound')
        if ('problem' in b) return fail(b.problem)
        if (b.z <= a.z) return fail(`The upper bound has to be bigger than ${r.a.trim()}.`)
        ;[lo, hi] = [a.z, b.z]
      }
    }
    const spans: [number, number][] = r.kind === 'outside' ? [[-Infinity, lo], [hi, Infinity]] : [[lo, hi]]
    const area = spans.reduce((sum, [a, b]) => sum + Phi(b) - Phi(a), 0)
    const bounds = [lo, hi].filter(Number.isFinite)
    // X for values, or Z when the region is typed in z-scores.
    const asZ = r.by === 'z'
    const v = (z: number) => (asZ ? rounded(z) : value(z))
    const X = asZ ? 'Z' : 'X'
    const between = `${v(lo)} < ${X} < ${v(hi)}`
    const event = r.kind === 'left' ? `${X} < ${v(hi)}` : r.kind === 'right' ? `${X} > ${v(lo)}` : r.kind === 'between' ? between : `${X} < ${v(lo)} or ${X} > ${v(hi)}`
    const name =
      r.by === 'area'
        ? `${r.kind === 'left' ? 'Bottom' : r.kind === 'right' ? 'Top' : r.kind === 'between' ? 'Middle' : 'Outer'} ${areaText(area, 'percent')}: ${event}${bounds.length === 1 ? ` (z = ${rounded(bounds[0])})` : ` (z = ±${rounded(Math.abs(hi))})`}`
        : `P(${event}) = ${areaText(area, 'probability')}`
    regions.push({ index, kind: r.kind, spans, bounds, area, sentence: name, settings: r })
  })

  const marks: ReadMark[] = []
  s.marks.forEach((mk, index) => {
    if (!mk.at.trim()) return
    const at = typedZ(mk.at, false, 'the value')
    if ('problem' in at) return void (problems.marks[index] = at.problem)
    marks.push({ index, z: at.z, settings: mk })
  })

  const ticks: number[] = []
  for (const part of s.ticks.split(/[,;]/).map((p) => p.trim()).filter(Boolean)) {
    const t = typedZ(part, false, 'each tick')
    if ('problem' in t) {
      problems.ticks ??= t.problem
      continue
    }
    if (!ticks.some((z) => Math.abs(z - t.z) < 1e-9)) ticks.push(t.z)
  }

  return { mu: m, sigma: sd, zOf, xOf, regions, marks, ticks, problems }
}

export type ReadCurve = ReturnType<typeof readCurve>

/** The share of the area in each section between SD lines, as the empirical rule rounds it or exactly. */
export function sectionPercent(k: number, as: 'rule' | 'exact'): string {
  // k is the section from k to k + 1 SDs; −Infinity and +Infinity stand for the tails.
  const inner = Math.min(Math.abs(k), Math.abs(k + 1))
  if (as === 'rule') return ['34%', '13.5%', '2.35%'][inner] ?? '0.15%'
  const p = (Phi(k + 1) - Phi(k)) * 100
  return p >= 0.01 ? `${rounded(p)}%` : `${Number(p.toPrecision(2))}%`
}
