// Every choice the teacher makes for a circle figure, with its default. The
// page address carries any non-default values, so a figure can be bookmarked
// or shared.
//
// The figure is one circle with center O, points on it, and lines: each line
// joins two points (the center or points on the circle), or is a tangent at a
// point on the circle. A point on the circle is placed by its direction from
// O, 0° to the right and counterclockwise, as the Angles Generator measures.
// Points and lines have ids that never change, so what's set on an angle, an
// arc or a crossing stays with it while points move and lines come and go.
//
// The parts the teacher labels are named from those ids (see geometry.ts):
// - a place on the figure (a node): the center "o", a point "p2", where lines
//   cross "l1.l3", or where a line meets the circle away from a point, by the
//   stretch of the line it's on, "l2:a1" (past its a end), "l2:m1" (between
//   its ends) or "l2:b1" (past its b end), counted out from the end;
// - an angle: its node and the two rays around it, counterclockwise from the
//   first, each a line's id and which way along it ("+" from its a end toward
//   its b end): "o@l1+~l2+";
// - an arc: the two places on the circle it runs between, counterclockwise,
//   "p1~p2" ("p1~p1" with only one place on the circle, all the way round).
//
// In the page address each point is one value, like pt=p1|name=A|dir=40, each
// line one too, like l=l1|a=o|b=p1|ticks=1, each labeled angle, arc and named
// crossing and shaded area too: a=o@l1+~l2+|label=measure,
// arc=p1~p2|label=degrees, m=l1.l2|name=E, f=l1+l2+p1~p2|fill=2.

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'
import { parseNumber } from '$lib/shared/math.js'
import { ANGLE_DEFAULTS, ANGLE_LABELS, MARKS, SHADES, type AngleLabel, type AngleStyle } from '$lib/labeling/options.js'
import { LINE_STYLES, MARKS as COUNTS, ROUNDING, UNITS, bool, oneOf, type LineStyle, type RawSettings } from '$lib/shapes/parts.js'
import { CAPS, type Cap } from '../parallel-lines/settings.js'

export type { AngleLabel, AngleStyle, Cap, LineStyle, RawSettings }
export { ANGLE_DEFAULTS, CAPS }

export const MAX_POINTS = 12
export const MAX_LINES = 24
export const CENTER = 'o'

/** A point on the circle: its name and its direction from the center in degrees, as typed. */
export type Point = { id: string; name: string; dir: string }

/**
 * A line. A join runs from point `a` to point `b` (either can be the center);
 * a tangent touches the circle at `a`, and its b end is the way the circle
 * turns counterclockwise. Each end can stop at its point or run on past it
 * (`runA`, `runB`), finishing in a cap. A run-on end that would cross the
 * circle goes all the way through it.
 */
export type Line = {
  id: string
  kind: 'join' | 'tangent'
  a: string
  b: string
  runA: boolean
  runB: boolean
  capA: Cap
  capB: Cap
  style: LineStyle
  label: AngleLabel
  text: string
  ticks: number
  arrows: number
}

/** How an arc is labeled: not at all, its measure in degrees, its length, or typed text. */
export const ARC_LABELS = ['none', 'degrees', 'length', 'text'] as const
export type ArcLabel = (typeof ARC_LABELS)[number]
/** How an arc is drawn over the circle: as the circle is, bolder, or bold in a color. */
export const ARC_DRAWS = { normal: { name: 'Normal', color: '' }, bold: { name: 'Bold', color: '#111827' }, blue: { name: 'Blue', color: '#2563eb' }, red: { name: 'Red', color: '#dc2626' }, green: { name: 'Green', color: '#16a34a' } }
export type ArcDraw = keyof typeof ARC_DRAWS
export type ArcStyle = { label: ArcLabel; text: string; ticks: number; draw: ArcDraw }
export const ARC_DEFAULTS: ArcStyle = { label: 'none', text: '', ticks: 0, draw: 'normal' }

export type Settings = {
  points: Point[]
  lines: Line[]
  angles: Record<string, AngleStyle>
  arcs: Record<string, ArcStyle>
  /** Shaded enclosed areas, by their key (see faces.ts): the shading color, from SHADES. */
  faces: Record<string, number>
  /** Names at crossings and where lines meet the circle, by node key; there's a dot at each. */
  marks: Record<string, string>
  centerName: string
  centerDot: boolean
  /** Dots at the points on the circle. */
  dots: boolean
  /** The radius's length and unit, for measures; the circle is always drawn the same size. */
  radius: string
  unit: string
  round: number
  labelSize: LabelSize
}

export const LINE_DEFAULTS = {
  runA: false, runB: false, capA: 'none' as Cap, capB: 'none' as Cap, style: 'solid' as LineStyle,
  label: 'none' as AngleLabel, text: '', ticks: 0, arrows: 0,
}
export const newJoin = (id: string, a: string, b: string): Line => ({ id, kind: 'join', a, b, ...LINE_DEFAULTS })
/** A tangent runs on both ways from where it touches, unless an end is cut back. */
const TANGENT_RUNS = { runA: true, runB: true }
export const newTangent = (id: string, at: string): Line => ({ id, kind: 'tangent', a: at, b: '', ...LINE_DEFAULTS, ...TANGENT_RUNS })

// A central angle and an inscribed angle on the same arc, labeled, so the figure says what it is at a glance.
export const DEFAULT_SETTINGS: Settings = {
  points: [
    { id: 'p1', name: 'A', dir: '210' },
    { id: 'p2', name: 'B', dir: '330' },
    { id: 'p3', name: 'C', dir: '100' },
  ],
  lines: [newJoin('l1', CENTER, 'p1'), newJoin('l2', CENTER, 'p2'), newJoin('l3', 'p3', 'p1'), newJoin('l4', 'p3', 'p2')],
  angles: {
    'o@l1+~l2+': { ...ANGLE_DEFAULTS, label: 'measure', mark: '1' },
    'p3@l3+~l4+': { ...ANGLE_DEFAULTS, label: 'text', text: 'x', mark: '1' },
  },
  arcs: {},
  faces: {},
  marks: {},
  centerName: 'O',
  centerDot: true,
  dots: true,
  radius: '6',
  unit: 'cm',
  round: 1,
  labelSize: 'medium',
}

const cleanName = (v: unknown) => String(v ?? '').replace(/[|=]/g, '').slice(0, 4)
const num = (v: unknown, fallback: number) => (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : fallback)
const CAP_LIST = Object.keys(CAPS) as Cap[]

/** The next free id for a new point or line. */
export const nextId = (list: { id: string }[], prefix: 'p' | 'l') => `${prefix}${1 + Math.max(0, ...list.map((x) => Number(x.id.slice(1)) || 0))}`

/** Gives items without a usable id (or with a repeated one) a fresh one. */
function withIds<T extends { id: string }>(list: T[], prefix: 'p' | 'l'): T[] {
  const used = new Set<string>()
  const ok = (id: string) => new RegExp(`^${prefix}\\d{1,3}$`).test(id)
  let next = 1 + Math.max(0, ...list.map((x) => (ok(x.id) ? Number(x.id.slice(1)) : 0)))
  return list.map((x) => {
    const id = ok(x.id) && !used.has(x.id) ? x.id : `${prefix}${next++}`
    used.add(id)
    return { ...x, id }
  })
}

/** The point and line ids a part's key is made from (but the center's, which is always there). */
export const idsIn = (key: string): string[] => key.match(/[pl]\d+/g) ?? []

const NODE = String.raw`(o|p\d+|l\d+(\.l\d+)+|l\d+:[abm]\d+)`
const RAY = String.raw`l\d+[+-]`
const ANGLE_KEY = new RegExp(`^${NODE}@${RAY}~${RAY}$`)
const ARC_KEY = new RegExp(`^${NODE}~${NODE}$`)
const FACE_KEY = new RegExp(`^(c|l\\d+|${NODE}~${NODE})(\\+(l\\d+|${NODE}~${NODE}))*$`)
const MARK_KEY = /^(l\d+(\.l\d+)+|l\d+:[abm]\d+)$/

/** A point's direction in degrees, from 0 up to 360, or what to fix about it. */
export function readDir(typed: string): number | string {
  const v = parseNumber(typed)
  if (v === null) return 'Type a direction in degrees, like 40.'
  return ((v % 360) + 360) % 360
}

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  const points = withIds(
    (Array.isArray(s.points) ? s.points : d.points).slice(0, MAX_POINTS).map((p: any) => ({
      id: String(p?.id ?? ''),
      name: cleanName(p?.name),
      dir: String(p?.dir ?? '').slice(0, 20),
    })),
    'p',
  )
  const pointIds = new Set([CENTER, ...points.map((p) => p.id)])
  const onCircle = new Set(points.map((p) => p.id))
  const lines = withIds(
    (Array.isArray(s.lines) ? s.lines : d.lines).slice(0, MAX_LINES).map((l: any): Line => ({
      id: String(l?.id ?? ''),
      kind: l?.kind === 'tangent' ? 'tangent' : 'join',
      a: String(l?.a ?? ''),
      b: l?.kind === 'tangent' ? '' : String(l?.b ?? ''),
      runA: bool(l?.runA, LINE_DEFAULTS.runA),
      runB: bool(l?.runB, LINE_DEFAULTS.runB),
      capA: oneOf(CAP_LIST, l?.capA, 'none'),
      capB: oneOf(CAP_LIST, l?.capB, 'none'),
      style: oneOf(Object.keys(LINE_STYLES) as LineStyle[], l?.style, 'solid'),
      label: oneOf(ANGLE_LABELS, l?.label, 'none'),
      text: String(l?.text ?? '').slice(0, 40),
      ticks: oneOf(COUNTS, num(l?.ticks, 0), 0),
      arrows: oneOf(COUNTS, num(l?.arrows, 0), 0),
    })),
    'l',
  ).filter((l) => (l.kind === 'tangent' ? onCircle.has(l.a) && (l.runA || l.runB) : pointIds.has(l.a) && pointIds.has(l.b) && l.a !== l.b))
  const out: Settings = {
    points,
    lines,
    angles: {},
    arcs: {},
    faces: {},
    marks: {},
    centerName: cleanName(s.centerName ?? d.centerName),
    centerDot: bool(s.centerDot, d.centerDot),
    dots: bool(s.dots, d.dots),
    radius: String(s.radius ?? d.radius).slice(0, 20),
    unit: oneOf(UNITS, s.unit, d.unit),
    round: oneOf(ROUNDING, num(s.round, d.round), d.round),
    labelSize: cleanLabelSize(s.labelSize),
  }
  // Only what belongs to points and lines that are still there.
  const ids = new Set([...pointIds, ...lines.map((l) => l.id)])
  const known = (key: string) => idsIn(key).every((id) => ids.has(id))
  for (const [key, a] of Object.entries((s.angles ?? {}) as Record<string, any>)) {
    if (!ANGLE_KEY.test(key) || !known(key)) continue
    // Kept even when it's all defaults: a right angle's square is drawn on its own until it's taken off.
    out.angles[key] = {
      label: oneOf(ANGLE_LABELS, a?.label, 'none'),
      text: String(a?.text ?? '').slice(0, 40),
      mark: oneOf(MARKS, a?.mark, 'none'),
      // Angles aren't shaded in this figure: enclosed areas are.
      shade: 0,
    }
  }
  for (const [key, a] of Object.entries((s.arcs ?? {}) as Record<string, any>)) {
    if (!ARC_KEY.test(key) || !known(key)) continue
    const style: ArcStyle = {
      label: oneOf(ARC_LABELS, a?.label, 'none'),
      text: String(a?.text ?? '').slice(0, 40),
      ticks: oneOf(COUNTS, num(a?.ticks, 0), 0),
      draw: oneOf(Object.keys(ARC_DRAWS) as ArcDraw[], a?.draw, 'normal'),
    }
    if (style.label !== 'none' || style.text || style.ticks || style.draw !== 'normal') out.arcs[key] = style
  }
  for (const [key, fill] of Object.entries((s.faces ?? {}) as Record<string, any>)) {
    const shade = num(fill, 0)
    if (FACE_KEY.test(key) && known(key) && shade > 0 && shade < SHADES.length && Number.isInteger(shade)) out.faces[key] = shade
  }
  for (const [key, name] of Object.entries((s.marks ?? {}) as Record<string, any>)) {
    if (MARK_KEY.test(key) && known(key)) out.marks[key] = cleanName(name)
  }
  return out
}

/** One value of the page address: the first part, then key=value for anything not the default. */
function joinParts(first: string, values: Record<string, unknown>, defaults: Record<string, unknown>) {
  const parts = Object.entries(values)
    .filter(([k, v]) => v !== defaults[k])
    .map(([k, v]) => `${k}=${typeof v === 'boolean' ? (v ? '1' : '0') : typeof v === 'string' ? encodeURIComponent(v) : v}`)
  return [first, ...parts].join('|')
}
function splitParts(value: string): [string, Record<string, string>] {
  const [first, ...rest] = String(value).split('|')
  const values: Record<string, string> = {}
  for (const part of rest) {
    const i = part.indexOf('=')
    if (i <= 0) continue
    try {
      values[part.slice(0, i)] = decodeURIComponent(part.slice(i + 1))
    } catch {
      values[part.slice(0, i)] = part.slice(i + 1)
    }
  }
  return [first, values]
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const SIMPLE = ['centerName', 'centerDot', 'dots', 'radius', 'unit', 'round', 'labelSize'] as const
// A point's name and direction are always written, so a blank one isn't mistaken for the default.
const POINT_ALWAYS = { name: null, dir: null }

export function settingsToQuery(s: Settings): string {
  const d = DEFAULT_SETTINGS
  const params = new URLSearchParams()
  for (const key of SIMPLE) {
    const v = s[key]
    if (v !== d[key]) params.set(key, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
  }
  // The points and lines only when they aren't the opening ones; then all of them, in order.
  if (!same([s.points, s.lines], [d.points, d.lines])) {
    for (const p of s.points) params.append('pt', joinParts(p.id, { name: p.name, dir: p.dir }, POINT_ALWAYS))
    for (const l of s.lines) {
      const { id, kind, b, ...rest } = l
      const tangent = kind === 'tangent'
      const values = tangent ? { kind, ...rest } : { ...rest, b }
      params.append('l', joinParts(id, values, { ...LINE_DEFAULTS, ...(tangent ? TANGENT_RUNS : {}), kind: 'join', a: null, b: null }))
    }
    if (!s.lines.length) params.append('l', '')
  }
  // The angles only when they aren't the opening ones; an empty "a" says there are none.
  if (!same(s.angles, d.angles)) {
    const entries = Object.entries(s.angles)
    for (const [key, a] of entries) params.append('a', joinParts(key, a, ANGLE_DEFAULTS))
    if (!entries.length) params.append('a', '')
  }
  for (const [key, a] of Object.entries(s.arcs)) params.append('arc', joinParts(key, a, ARC_DEFAULTS))
  for (const [key, fill] of Object.entries(s.faces)) params.append('f', joinParts(key, { fill }, {}))
  for (const [key, name] of Object.entries(s.marks)) params.append('m', joinParts(key, { name }, { name: '' }))
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const s: RawSettings = structuredClone(DEFAULT_SETTINGS)
  for (const key of SIMPLE) if (params.has(key)) s[key] = params.get(key)
  if (params.has('pt') || params.has('l')) {
    s.points = params.getAll('pt').map((v) => {
      const [id, values] = splitParts(v)
      return { name: '', dir: '', ...values, id }
    })
    s.lines = params.getAll('l').filter(Boolean).map((v) => {
      const [id, values] = splitParts(v)
      return { ...LINE_DEFAULTS, kind: 'join', a: '', b: '', ...(values.kind === 'tangent' ? TANGENT_RUNS : {}), ...values, id }
    })
  }
  if (params.has('a')) {
    s.angles = Object.fromEntries(params.getAll('a').filter(Boolean).map(splitParts).map(([key, values]) => [key, { ...ANGLE_DEFAULTS, ...values }]))
  }
  s.arcs = Object.fromEntries(params.getAll('arc').map(splitParts).map(([key, values]) => [key, { ...ARC_DEFAULTS, ...values }]))
  s.faces = Object.fromEntries(params.getAll('f').map(splitParts).map(([key, values]) => [key, values.fill]))
  s.marks = Object.fromEntries(params.getAll('m').map(splitParts).map(([key, values]) => [key, values.name ?? '']))
  return cleanSettings(s)
}

/** The radius as a number, or null when it isn't one above zero. */
export function readRadius(typed: string): number | null {
  const v = parseNumber(typed)
  return v !== null && v > 0 ? v : null
}

/** Names for new points, in order, skipping any already used and the center's. */
const POINT_NAMES = 'ABCDEFGHIJKLMNPQRSTUVWXYZ'.split('')
export function freshNames(s: Pick<Settings, 'points' | 'centerName'>, count: number) {
  const used = new Set([s.centerName, ...s.points.map((p) => p.name)])
  return POINT_NAMES.filter((n) => !used.has(n)).slice(0, count)
}

/** A direction for a new point: the middle of the widest gap between the points already on the circle. */
export function freeDir(points: Point[]): number {
  const dirs = points.map((p) => readDir(p.dir)).filter((v): v is number => typeof v === 'number').sort((a, b) => a - b)
  if (!dirs.length) return 90
  let best = { at: dirs[0] + 180, gap: -1 }
  dirs.forEach((v, i) => {
    const next = i + 1 < dirs.length ? dirs[i + 1] : dirs[0] + 360
    if (next - v > best.gap + 1e-9) best = { at: v + (next - v) / 2, gap: next - v }
  })
  return Math.round(best.at % 360)
}

/** An angle's key from its node and two rays, counterclockwise from the first. */
export const angleKey = (node: string, from: string, to: string) => `${node}@${from}~${to}`
/** An arc's key from the places it runs between, counterclockwise. */
export const arcKey = (from: string, to: string) => `${from}~${to}`
