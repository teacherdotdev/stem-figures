// Every choice the teacher makes, with its default. The page address carries
// any non-default values so a graph can be bookmarked or shared.
//
// Each axis's range is kept as the text the teacher typed ("-2", "2pi", "pi/4");
// readAxes() works out what it means.

import {
  CAP_KEYS, EVERY, LABEL_MODES, MINOR, TITLE_MODES, readAxes as readRanges, type Axis, type AxisName, type GridSettings, type LabelMode,
  type NumberReader, type RangeSettings, type TitleMode,
} from '$shared/graph/axes'
import { CAPS, type Cap } from '$shared/graph/caps'
import { GRIDLINES, type Gridlines } from '$shared/graph/grid'
import { parseNumber } from '$lib/shared/math.js'
import { fmt } from '$shared/graph/numbering'
import { cleanRow, rowFromParam, rowToParam, type Row } from './equations.js'
import type { AngleUnit } from './evaluate.js'
import { cleanLabelSize } from '$shared/labelSize'

export { CAPS, EVERY, MINOR, TITLE_MODES, LABEL_MODES, fmt }
export type { Axis, AxisName, TitleMode, LabelMode }

export const ANGLE_UNITS = { radians: 'Radians', degrees: 'Degrees' } // what trig functions read x in

export type Settings = RangeSettings &
  GridSettings & {
    angle: AngleUnit
    gridlines: Gridlines
    equations: Row[]
  }

/** Settings as they may arrive: from a form, a link, or a preset stored by an older version. */
export type RawSettings = Record<string, any>

export const DEFAULT_SETTINGS: Settings = {
  xFrom: '0',
  xTo: '15',
  xStep: '1',
  yFrom: '0',
  yTo: '15',
  yStep: '1',
  xEvery: 1,
  yEvery: 1,
  title: '',
  titleMode: 'none',
  xTitle: '', // runs along the axis, e.g. "Time (hours)"
  xTitleMode: 'none',
  yTitle: '',
  yTitleMode: 'none',
  xLabel: 'x', // sits at the arrow tip
  xLabelMode: 'text',
  yLabel: 'y',
  yLabelMode: 'text',
  xStartCap: 'triangle', // left end
  xEndCap: 'triangle', // right end
  yStartCap: 'triangle', // bottom end
  yEndCap: 'triangle', // top end
  minor: 0, // minor gridlines per block
  gridlines: 'standard', // light, standard, bold or none
  angle: 'radians', // the angle unit: whether sin x reads x in radians or degrees
  labelSize: 'medium', // how big the text is (see labelSize.ts)
  equations: [], // what's graphed, one row each: { text: "y=2x+1", color, line, arrows }
}

/** Settings that describe the graph itself, which is what a preset saves. */
export const GRAPH_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const text = (v: unknown, fallback: string) => (v === undefined || v === null ? fallback : String(v))
const titleMode = (v: any, fallback: TitleMode): TitleMode => (TITLE_MODES.includes(v) ? v : fallback)
const labelMode = (v: any, fallback: LabelMode): LabelMode => (LABEL_MODES.includes(v) ? v : fallback)

const cap = (v: any, fallback: Cap): Cap => (v in CAPS ? v : fallback)

/** Older links and presets: an axis label could be a blank line (now an axis
 *  title), arrows were one on/off switch for every end, and a range was a start
 *  and a number of blocks rather than From and To. */
function upgrade(s: RawSettings): RawSettings {
  const out = { ...s }
  for (const axis of ['x', 'y'] as const) {
    if (s[`${axis}LabelMode`] === 'blank') Object.assign(out, { [`${axis}LabelMode`]: 'none', [`${axis}TitleMode`]: 'blank' })
    const [blocks, start] = [s[`${axis}Blocks`], s[`${axis}Start`]]
    if (s[`${axis}From`] === undefined && (blocks !== undefined || start !== undefined)) {
      const step = parseNumber(String(s[`${axis}Step`] ?? 1)) ?? 1
      const from = num(start, 0)
      const to = from + Math.max(1, Math.round(num(blocks, 15))) * (step > 0 ? step : 1)
      Object.assign(out, { [`${axis}From`]: plain(from), [`${axis}To`]: plain(to), [`${axis}Step`]: plain(step > 0 ? step : 1) })
    }
    delete out[`${axis}Blocks`]
    delete out[`${axis}Start`]
  }
  if (s.arrows === false && CAP_KEYS.every((k) => s[k] === undefined)) for (const k of CAP_KEYS) out[k] = 'none'
  delete out.arrows
  delete out.light
  delete out.xNumbering // now follows how the range is typed
  delete out.yNumbering
  return out
}

/** A number as range text, the way the address writes it: "-2", "0.5". */
const plain = (v: number) => String(Number(v.toFixed(10)))

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  s = upgrade(s)
  const d = DEFAULT_SETTINGS
  return {
    ...d,
    ...s,
    xFrom: text(s.xFrom, d.xFrom),
    xTo: text(s.xTo, d.xTo),
    xStep: text(s.xStep, d.xStep),
    yFrom: text(s.yFrom, d.yFrom),
    yTo: text(s.yTo, d.yTo),
    yStep: text(s.yStep, d.yStep),
    xEvery: EVERY.includes(Number(s.xEvery)) ? Number(s.xEvery) : 1,
    yEvery: EVERY.includes(Number(s.yEvery)) ? Number(s.yEvery) : 1,
    minor: MINOR.includes(Number(s.minor)) ? Number(s.minor) : 0,
    gridlines: s.gridlines in GRIDLINES ? s.gridlines : d.gridlines,
    angle: s.angle in ANGLE_UNITS ? s.angle : d.angle,
    labelSize: cleanLabelSize(s.labelSize),
    title: String(s.title ?? d.title),
    xTitle: String(s.xTitle ?? d.xTitle),
    yTitle: String(s.yTitle ?? d.yTitle),
    xLabel: String(s.xLabel ?? d.xLabel),
    yLabel: String(s.yLabel ?? d.yLabel),
    titleMode: titleMode(s.titleMode, d.titleMode),
    xTitleMode: titleMode(s.xTitleMode, d.xTitleMode),
    yTitleMode: titleMode(s.yTitleMode, d.yTitleMode),
    xLabelMode: labelMode(s.xLabelMode, d.xLabelMode),
    yLabelMode: labelMode(s.yLabelMode, d.yLabelMode),
    ...Object.fromEntries(CAP_KEYS.map((k) => [k, cap(s[k], d[k])])),
    equations: Array.isArray(s.equations) ? s.equations.map(cleanRow) : [],
  }
}

/** Do two settings draw the same graph? */
export function sameGraph(a: RawSettings, b: RawSettings): boolean {
  const ca = cleanSettings(a)
  const cb = cleanSettings(b)
  const rows = (c: Settings) => c.equations.filter((r) => r.text.trim()).map(rowToParam).join('\n')
  return GRAPH_KEYS.every((k) => (k === 'equations' ? rows(ca) === rows(cb) : ca[k] === cb[k]))
}

export function settingsToQuery(s: Settings): string {
  const params = new URLSearchParams()
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    const v = s[key as keyof Settings]
    if (key === 'equations' || v === def || v === null || v === undefined) continue
    params.set(key, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
  }
  // One eq= per row that has something in it.
  for (const r of s.equations ?? []) if (r.text.trim()) params.append('eq', rowToParam(r))
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const s: RawSettings = structuredClone(DEFAULT_SETTINGS)
  if (params.get('arrows') === '0' && !CAP_KEYS.some((k) => params.has(k))) for (const k of CAP_KEYS) s[k] = 'none'
  // A link from before From/To: let upgrade() turn its start and blocks into a range.
  for (const axis of ['x', 'y'] as const) {
    if (params.has(`${axis}From`) || !(params.has(`${axis}Blocks`) || params.has(`${axis}Start`))) continue
    delete s[`${axis}From`]
    delete s[`${axis}To`]
    for (const key of [`${axis}Blocks`, `${axis}Start`]) if (params.has(key)) s[key] = Number(params.get(key))
  }
  s.equations = params.getAll('eq').map(rowFromParam)
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (key === 'equations' || !params.has(key)) continue
    const raw = params.get(key)
    if (typeof def === 'number') s[key] = Number(raw)
    else if (typeof def === 'boolean') s[key] = raw === '1'
    else s[key] = raw
  }
  return cleanSettings(s)
}

// Ranges are typed in Caret, so they can be fractions and multiples of π.
const MATH_NUMBERS: NumberReader = {
  parse: parseNumber,
  examples: { From: '−10, 2.5, 1/2 or −2π', To: '10, 2.5, 1/2 or 2π', Step: '1, 0.5, 1/4 or π/6' },
}

/** Each axis's range as numbers, how to write them, and anything the teacher should fix. */
export const readAxes = (s: Settings) => readRanges(s, MATH_NUMBERS)
