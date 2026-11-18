// Every choice the teacher makes on the Segment Addition Generator, with its
// default. The page address carries any non-default values, so a figure can
// be bookmarked or shared.
//
// The figure is points on one straight line, in order: A, B, C. The parts are
// the pieces between neighbouring points (AB, BC), each labeled above the
// line with a length or an expression like 2x + 3, and marked with congruence
// ticks. A span is a stretch over several parts (AC), drawn as a brace under
// the line with its own label. A line can cross at one of the points, as a
// segment bisector does at a midpoint.
//
// In the page address each point is one value (pt=A|dot=0), each part one
// (part=2x%2B3|ticks=1) and each span one (span=0-2|label=27).

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'

export const MIN_POINTS = 2
export const MAX_POINTS = 7
export const MAX_SPANS = 3
export const MIN_CROSS_ANGLE = 20
export const MAX_CROSS_ANGLE = 160

/** How a part's or a span's label is shown: as typed, a blank line for students, or not at all. */
export const LABEL_MODES = { text: 'Text', blank: 'Blank line', none: 'None' } as const
export type LabelMode = keyof typeof LABEL_MODES

/** How an end of the line finishes: stopping at its point (a segment), or running on to an arrow (a ray or line). */
export const ENDS = { none: 'Stops at the point', triangle: 'Arrow', line: 'Line arrow' } as const
export type End = keyof typeof ENDS

export type Point = { name: string; dot: boolean }
/** A part: the piece from one point to the next. `size` is how long it's drawn, as typed; empty means worked out. */
export type Part = { label: string; mode: LabelMode; ticks: number; size: string }
/** A span: from one point to a later one, by their places in the list. */
export type Span = { from: number; to: number; label: string; mode: LabelMode }

export type Settings = {
  points: Point[]
  parts: Part[]
  spans: Span[]
  start: End
  end: End
  /** The point a line crosses at, by its place in the list, or -1 for none. */
  cross: number
  crossName: string
  crossAngle: number
  /** A right-angle square where the crossing line meets at 90°. */
  crossSquare: boolean
  /** Turn the whole figure, in degrees counterclockwise. */
  turn: number
  labelSize: LabelSize
}
export type RawSettings = Record<string, any>

const NAMES = 'ABCDEFG'
export const newPoint = (i: number): Point => ({ name: NAMES[i] ?? '', dot: true })
export const newPart = (label = ''): Part => ({ label, mode: 'text', ticks: 0, size: '' })
export const newSpan = (from: number, to: number, label = ''): Span => ({ from, to, label, mode: 'text' })

export const DEFAULT_SETTINGS: Settings = {
  points: [newPoint(0), newPoint(1), newPoint(2)],
  parts: [newPart('2x+1'), newPart('3x-4')],
  spans: [newSpan(0, 2, '27')],
  start: 'none',
  end: 'none',
  cross: -1,
  crossName: '',
  crossAngle: 90,
  crossSquare: true,
  turn: 0,
  labelSize: 'medium',
}

const POINT_DEFAULTS: Point = { name: '', dot: true }
const PART_DEFAULTS: Part = newPart()
const SPAN_DEFAULTS = { label: '', mode: 'text' as LabelMode }

const str = (v: unknown, max: number) => (v === undefined || v === null ? '' : String(v).slice(0, max))
const num = (v: unknown, fallback: number) => (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : fallback)
const bool = (v: unknown, fallback: boolean) => (v === true || v === '1' || v === 1 ? true : v === false || v === '0' || v === 0 ? false : fallback)
const keyOf = <T extends string>(names: Record<T, string>, v: unknown, fallback: T): T => (typeof v === 'string' && v in names ? (v as T) : fallback)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  const rawPoints: any[] = Array.isArray(s.points) ? s.points : d.points
  const points = rawPoints.slice(0, MAX_POINTS).map((p) => ({ name: str(p?.name, 4), dot: bool(p?.dot, true) }))
  while (points.length < MIN_POINTS) points.push(newPoint(points.length))
  // One part between each pair of neighbouring points.
  const rawParts: any[] = Array.isArray(s.parts) ? s.parts : d.parts
  const parts = points.slice(1).map((_, i) => {
    const p = rawParts[i]
    return {
      label: str(p?.label, 40),
      mode: keyOf(LABEL_MODES, p?.mode, 'text'),
      ticks: clamp(Math.round(num(p?.ticks, 0)), 0, 3),
      size: str(p?.size, 12),
    }
  })
  const rawSpans: any[] = Array.isArray(s.spans) ? s.spans : d.spans
  const spans = rawSpans
    .map((sp) => ({ from: Math.round(num(sp?.from, -1)), to: Math.round(num(sp?.to, -1)), label: str(sp?.label, 40), mode: keyOf(LABEL_MODES, sp?.mode, 'text') }))
    .map((sp) => (sp.from > sp.to ? { ...sp, from: sp.to, to: sp.from } : sp))
    .filter((sp) => sp.from >= 0 && sp.to < points.length && sp.to > sp.from)
    .slice(0, MAX_SPANS)
  const cross = Math.round(num(s.cross, d.cross))
  return {
    points,
    parts,
    spans,
    start: keyOf(ENDS, s.start, d.start),
    end: keyOf(ENDS, s.end, d.end),
    cross: cross >= 0 && cross < points.length ? cross : -1,
    crossName: str(s.crossName ?? d.crossName, 4),
    crossAngle: clamp(Math.round(num(s.crossAngle, d.crossAngle)), MIN_CROSS_ANGLE, MAX_CROSS_ANGLE),
    crossSquare: bool(s.crossSquare, d.crossSquare),
    turn: clamp(Math.round(num(s.turn, d.turn)), -90, 90),
    labelSize: cleanLabelSize(s.labelSize),
  }
}

/** One value of the page address: the first part, then key=value for anything not the default. */
function joinParts(first: string, values: Record<string, unknown>, defaults: Record<string, unknown>) {
  const parts = Object.entries(values)
    .filter(([k, v]) => v !== defaults[k])
    .map(([k, v]) => `${k}=${typeof v === 'boolean' ? (v ? '1' : '0') : encodeURIComponent(String(v))}`)
  return [encodeURIComponent(first), ...parts].join('|')
}
function splitParts(value: string): [string, Record<string, string>] {
  const [first, ...rest] = String(value).split('|')
  const decode = (t: string) => {
    try {
      return decodeURIComponent(t)
    } catch {
      return t
    }
  }
  const values: Record<string, string> = {}
  for (const part of rest) {
    const i = part.indexOf('=')
    if (i > 0) values[part.slice(0, i)] = decode(part.slice(i + 1))
  }
  return [decode(first), values]
}

const SCALARS = ['start', 'end', 'cross', 'crossName', 'crossAngle', 'crossSquare', 'turn', 'labelSize'] as const

export function settingsToQuery(s: Settings): string {
  const d = DEFAULT_SETTINGS
  const params = new URLSearchParams()
  for (const key of SCALARS) {
    const v = s[key]
    if (v !== d[key]) params.set(key, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
  }
  // The points, parts and spans only when they aren't the opening ones; then all of them.
  const figure = (x: Settings) => JSON.stringify([x.points, x.parts, x.spans])
  if (figure(s) !== figure(d)) {
    for (const p of s.points) params.append('pt', joinParts(p.name, { dot: p.dot }, POINT_DEFAULTS))
    for (const p of s.parts) params.append('part', joinParts(p.label, { mode: p.mode, ticks: p.ticks, size: p.size }, PART_DEFAULTS))
    for (const sp of s.spans) params.append('span', joinParts(`${sp.from}-${sp.to}`, { label: sp.label, mode: sp.mode }, SPAN_DEFAULTS))
    // A figure with no spans says so, or it would open with the default's.
    if (!s.spans.length) params.set('span', '')
  }
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const s: RawSettings = structuredClone(DEFAULT_SETTINGS)
  for (const key of SCALARS) if (params.has(key)) s[key] = params.get(key)
  if (params.has('pt')) {
    s.points = params.getAll('pt').map((v) => {
      const [name, values] = splitParts(v)
      return { ...POINT_DEFAULTS, ...values, name }
    })
    s.parts = params.getAll('part').map((v) => {
      const [label, values] = splitParts(v)
      return { ...PART_DEFAULTS, ...values, label }
    })
  }
  if (params.has('span')) {
    s.spans = params
      .getAll('span')
      .filter(Boolean)
      .map((v) => {
        const [range, values] = splitParts(v)
        const [from, to] = range.split('-').map(Number)
        return { ...SPAN_DEFAULTS, ...values, from, to }
      })
  }
  return cleanSettings(s)
}

/** A part's name from its two points ("AB"), or its place ("part 1") when they aren't named. */
export function partName(s: Settings, i: number) {
  const [a, b] = [s.points[i]?.name.trim(), s.points[i + 1]?.name.trim()]
  return a && b ? `${a}${b}` : `part ${i + 1}`
}
export function spanName(s: Settings, sp: Pick<Span, 'from' | 'to'>) {
  const [a, b] = [s.points[sp.from]?.name.trim(), s.points[sp.to]?.name.trim()]
  return a && b ? `${a}${b}` : `point ${sp.from + 1} to point ${sp.to + 1}`
}

/** Add a point at the right end, with a part before it. */
export function addPoint(s: Settings): Partial<Settings> {
  if (s.points.length >= MAX_POINTS) return {}
  const used = new Set(s.points.map((p) => p.name))
  const name = [...NAMES, ...'HJKLMNPQRSTUVWXYZ'].find((n) => !used.has(n)) ?? ''
  return { points: [...s.points, { name, dot: true }], parts: [...s.parts, newPart()] }
}

/** Remove a point: the parts on either side of it become one, and spans keep to the points they had. */
export function removePoint(s: Settings, i: number): Partial<Settings> {
  if (s.points.length <= MIN_POINTS) return {}
  const points = s.points.filter((_, k) => k !== i)
  // The part before the point stays (the one after it, for the first point).
  const parts = s.parts.filter((_, k) => k !== (i === 0 ? 0 : i - 1))
  if (i > 0 && i < s.points.length - 1) parts[i - 1] = { ...parts[i - 1], label: '', size: '' }
  const shift = (k: number) => (k > i ? k - 1 : k)
  const spans = s.spans
    .filter((sp) => sp.from !== i && sp.to !== i)
    .map((sp) => ({ ...sp, from: shift(sp.from), to: shift(sp.to) }))
    .filter((sp) => sp.to > sp.from)
  const cross = s.cross === i ? -1 : shift(s.cross)
  return { points, parts, spans, cross }
}
