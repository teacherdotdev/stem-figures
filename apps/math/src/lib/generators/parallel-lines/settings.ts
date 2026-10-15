// Every choice the teacher makes for parallel lines cut by transversals, with
// its default. The page address carries any non-default values, so a figure
// can be bookmarked or shared.
//
// The figure is lines: one or more parallel lines, evenly spaced, and any
// number of transversals, each set by its angle with the parallel lines (the
// angle above the top one, to the right of the transversal) and where it
// crosses the top one. Each line has an id that never changes, so what's set
// on an angle or a point stays with it while lines are added, moved or
// deleted.
//
// An angle is named by the two rays around it, each a line's id and which way
// along it: "+" runs right along a parallel line and up along a transversal,
// "-" the other way. "p1+~t1+" is the angle above the top line, right of the
// first transversal. A point is either where lines cross, named by its lines
// ("p1.t1"), or near one end of a line ("p1:start", "t1:end").
//
// In the page address each line is one value, like t=t1|name=t|angle=65|pos=0,
// each labeled angle one too, like a=p1+~t1+|label=measure, and each point
// pt=p1.t1|name=A.

import { parseNumber } from '$lib/shared/math.js'
import { cleanLabelSize, type LabelSize } from '$shared/labelSize'
import { ANGLE_DEFAULTS, ANGLE_LABELS, MARKS, SHADES, type AngleLabel, type AngleStyle, type Mark } from '$lib/labeling/options.js'
import { LINE_STYLES, MARKS as COUNTS, ROUNDING, oneOf, type LineStyle, type RawSettings } from '$lib/shapes/parts.js'

export type { AngleLabel, AngleStyle, LineStyle, Mark, RawSettings }
// What an angle can have is shared with every figure whose parts are labeled by clicking them.
export { ANGLE_DEFAULTS, ANGLE_LABELS, LINE_STYLES, MARKS, SHADES }

/**
 * How one end of a line finishes, as the Coordinate Grid's axes do: a
 * triangle arrow, a line arrow, a dot (where a ray or segment stops), or
 * nothing. A line's start is its left end, the bottom of a transversal.
 */
export const CAPS = { triangle: 'Arrow', line: 'Line arrow', circle: 'Dot', none: 'None' }
export type Cap = keyof typeof CAPS

export const MAX_LINES = 6
export const MIN_ANGLE = 10
export const MAX_ANGLE = 170

/** What every line has: its name, how its two ends finish, parallel arrows and line style. */
export type LineBase = { id: string; name: string; startCap: Cap; endCap: Cap; arrows: number; style: LineStyle }
export type Parallel = LineBase
/** A transversal: its angle with the parallel lines, as typed, and where it crosses the top one, in gaps between the lines. */
export type Transversal = LineBase & { angle: string; pos: number }

export type Settings = {
  parallels: Parallel[]
  transversals: Transversal[]
  angles: Record<string, AngleStyle>
  points: Record<string, string>
  turn: number
  round: number
  labelSize: LabelSize
}

const LINE_DEFAULTS = { startCap: 'triangle' as Cap, endCap: 'triangle' as Cap, arrows: 0, style: 'solid' as LineStyle }

/** Names for new lines, in order. */
const PARALLEL_NAMES = ['m', 'n', 'o', 'p', 'q', 'r']
const TRANSVERSAL_NAMES = ['t', 's', 'u', 'v', 'w', 'k']

export const newParallel = (id: string, name: string): Parallel => ({ id, name, ...LINE_DEFAULTS, arrows: 1 })
export const newTransversal = (id: string, name: string, angle: string, pos: number): Transversal => ({ id, name, ...LINE_DEFAULTS, angle, pos })

export const DEFAULT_SETTINGS: Settings = {
  parallels: [newParallel('p1', 'm'), newParallel('p2', 'n')],
  transversals: [newTransversal('t1', 't', '65', 0)],
  angles: {},
  points: {},
  turn: 0,
  round: 1,
  labelSize: 'medium',
}

/** A line's name, as typed, without the characters the page address uses. */
const cleanName = (v: unknown) => String(v ?? '').replace(/[|=]/g, '').slice(0, 4)
const cleanId = (v: unknown, prefix: string) => (new RegExp(`^${prefix}\\d{1,3}$`).test(String(v)) ? String(v) : '')
const num = (v: unknown, fallback: number) => (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : fallback)

function cleanLine(r: any, prefix: 'p' | 't'): LineBase {
  return {
    id: cleanId(r?.id, prefix),
    name: cleanName(r?.name),
    startCap: oneOf(Object.keys(CAPS) as Cap[], r?.startCap, 'triangle'),
    endCap: oneOf(Object.keys(CAPS) as Cap[], r?.endCap, 'triangle'),
    arrows: oneOf(COUNTS, num(r?.arrows, 0), 0),
    style: oneOf(Object.keys(LINE_STYLES) as LineStyle[], r?.style, 'solid'),
  }
}

/** Gives lines without a usable id (or with a repeated one) a fresh one. */
function withIds<T extends LineBase>(lines: T[], prefix: string): T[] {
  const used = new Set<string>()
  let next = 1 + Math.max(0, ...lines.map((l) => Number(l.id.slice(1)) || 0))
  return lines.map((l) => {
    const id = l.id && !used.has(l.id) ? l.id : `${prefix}${next++}`
    used.add(id)
    return { ...l, id }
  })
}

/** The next free id for a new line. */
export const nextId = (lines: LineBase[], prefix: 'p' | 't') => `${prefix}${1 + Math.max(0, ...lines.map((l) => Number(l.id.slice(1)) || 0))}`

/** A point's key: where lines cross ("p1.t1"), or near one end of a line ("p1:start", "t1:end"). */
const POINT_KEY = /^([pt]\d+(\.[pt]\d+)+|[pt]\d+:(start|end))$/

/** The line ids an angle's or a point's key is made from. */
export const idsIn = (key: string): string[] => key.match(/[pt]\d+/g) ?? []

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  let parallels = (Array.isArray(s.parallels) ? s.parallels : d.parallels).slice(0, MAX_LINES).map((r: any) => cleanLine(r, 'p'))
  if (!parallels.length) parallels = [cleanLine(d.parallels[0], 'p')]
  const transversals = (Array.isArray(s.transversals) ? s.transversals : d.transversals).slice(0, MAX_LINES).map((r: any) => ({
    ...cleanLine(r, 't'),
    angle: String(r?.angle ?? '').slice(0, 20),
    pos: Math.round(Math.max(-20, Math.min(20, num(r?.pos, 0))) * 100) / 100,
  }))
  const out: Settings = {
    parallels: withIds(parallels, 'p'),
    transversals: withIds(transversals, 't'),
    angles: {},
    points: {},
    turn: Math.max(-180, Math.min(180, Math.round(num(s.turn, d.turn)))),
    round: oneOf(ROUNDING, num(s.round, d.round), d.round),
    labelSize: cleanLabelSize(s.labelSize),
  }
  // Only what belongs to lines that are still there, and isn't the default.
  const ids = new Set([...out.parallels, ...out.transversals].map((l) => l.id))
  const known = (key: string) => idsIn(key).length >= 1 && idsIn(key).every((id) => ids.has(id))
  for (const [key, a] of Object.entries((s.angles ?? {}) as Record<string, any>)) {
    if (!/^[pt]\d+[+-]~[pt]\d+[+-]$/.test(key) || !known(key)) continue
    const style: AngleStyle = {
      label: oneOf(ANGLE_LABELS, a?.label, 'none'),
      text: String(a?.text ?? '').slice(0, 40),
      mark: oneOf(MARKS, a?.mark, 'none'),
      shade: oneOf(SHADES.map((_, i) => i), num(a?.shade, 0), 0),
    }
    if (style.label !== 'none' || style.mark !== 'none' || style.shade || style.text) out.angles[key] = style
  }
  for (const [key, name] of Object.entries((s.points ?? {}) as Record<string, any>)) {
    if (POINT_KEY.test(key) && known(key)) out.points[key] = cleanName(name)
  }
  return out
}

/** One value of the page address: the first part, then key=value for anything not the default. */
function joinParts(first: string, values: Record<string, unknown>, defaults: Record<string, unknown>) {
  const parts = Object.entries(values)
    .filter(([k, v]) => v !== defaults[k])
    .map(([k, v]) => `${k}=${typeof v === 'string' ? encodeURIComponent(v) : v}`)
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

const lineValues = (l: LineBase) => ({ name: l.name, startCap: l.startCap, endCap: l.endCap, arrows: l.arrows, style: l.style })
// A line's name, angle and place are always written, so a blank one isn't mistaken for the default.
const ALWAYS = { name: null, angle: null, pos: null }

export function settingsToQuery(s: Settings): string {
  const d = DEFAULT_SETTINGS
  const params = new URLSearchParams()
  for (const key of ['turn', 'round', 'labelSize'] as const) {
    const v = s[key]
    if (v !== d[key]) params.set(key, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
  }
  // The lines only when they aren't the opening ones; then all of them, in order.
  const lines = (x: Settings) => JSON.stringify([x.parallels, x.transversals])
  if (lines(s) !== lines(d)) {
    for (const p of s.parallels) params.append('p', joinParts(p.id, lineValues(p), { ...LINE_DEFAULTS, ...ALWAYS }))
    for (const t of s.transversals) params.append('t', joinParts(t.id, { ...lineValues(t), angle: t.angle, pos: t.pos }, { ...LINE_DEFAULTS, ...ALWAYS }))
  }
  for (const [key, a] of Object.entries(s.angles)) params.append('a', joinParts(key, a, ANGLE_DEFAULTS))
  for (const [key, name] of Object.entries(s.points)) params.append('pt', joinParts(key, { name }, { name: '' }))
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const s: RawSettings = structuredClone(DEFAULT_SETTINGS)
  for (const key of ['turn', 'round', 'labelSize']) if (params.has(key)) s[key] = params.get(key)
  const line = (value: string, base: object) => {
    const [id, values] = splitParts(value)
    return { ...base, ...values, id }
  }
  if (params.has('p') || params.has('t')) {
    s.parallels = params.getAll('p').map((v) => line(v, { ...LINE_DEFAULTS, name: '' }))
    s.transversals = params.getAll('t').map((v) => line(v, { ...LINE_DEFAULTS, name: '', angle: '', pos: 0 }))
  }
  s.angles = Object.fromEntries(params.getAll('a').map(splitParts).map(([key, values]) => [key, { ...ANGLE_DEFAULTS, ...values }]))
  s.points = Object.fromEntries(params.getAll('pt').map(splitParts).map(([key, values]) => [key, values.name ?? '']))
  return cleanSettings(s)
}

/** A transversal's angle in degrees, or what to fix about it. */
export function readAngle(typed: string): number | string {
  if (!typed.trim()) return 'Give the angle a measure.'
  const v = parseNumber(typed)
  if (v === null) return 'Type a number of degrees, like 65 or 47.5.'
  if (v <= 0 || v >= 180) return 'The angle has to be between 0° and 180°.'
  if (v < MIN_ANGLE || v > MAX_ANGLE) return `Keep the angle between ${MIN_ANGLE}° and ${MAX_ANGLE}°, so the figure fits on a page.`
  return v
}

/** A name for a new line, skipping any already used. */
export function freshName(lines: LineBase[], kind: 'p' | 't') {
  const used = new Set(lines.map((l) => l.name))
  return (kind === 'p' ? PARALLEL_NAMES : TRANSVERSAL_NAMES).find((n) => !used.has(n)) ?? ''
}

/** Where a new transversal goes: clear of the others along the top line. */
export function freePos(transversals: Transversal[]) {
  if (!transversals.length) return 0
  return Math.round((Math.max(...transversals.map((t) => t.pos)) + 1.5) * 100) / 100
}

/** The angle a transversal's value sets: above the top parallel line, right of the transversal. */
export const setAngleKey = (s: Settings, t: Transversal) => angleKey(`${s.parallels[0].id}+`, `${t.id}+`)

/** An angle's key from its two rays, in either order. */
export const angleKey = (a: string, b: string) => [a, b].sort().join('~')
