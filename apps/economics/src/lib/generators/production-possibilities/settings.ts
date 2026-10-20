// Production Possibilities Curve's settings, as they appear in the page
// address: the curve's shape and where it meets the axes, the points on,
// inside and outside it with their captions, a shift out or in (or a pivot,
// when only one good can be made more of), the opportunity cost steps, two
// countries' curves for comparative advantage, and every label's words. The
// two goods are the axis titles.

import { TITLE_MODES } from '$shared/graph/axes'
import { bool, choice, defineSettings, number, text } from '$shared/settings'
import { labels, lookFields } from '$lib/graph/settings'
import { SHIFT_SIZES } from '$lib/graph/shifts'

/** The curve's shape: bowed out (increasing opportunity cost), straight (constant) or bowed in (decreasing). */
export const SHAPES = ['out', 'straight', 'in'] as const
export type Shape = (typeof SHAPES)[number]
export const SHAPE_NAMES: Record<Shape, string> = { out: 'Bowed out', straight: 'Straight', in: 'Bowed in' }

/** Where a point is: on the curve (or the new one, after a shift), inside it, outside it, or at numbers typed. */
export const PLACES = ['on', 'on2', 'inside', 'outside', 'at'] as const
export type Place = (typeof PLACES)[number]
export const PLACE_NAMES: Record<Place, string> = {
  on: 'On the curve',
  on2: 'On the new curve',
  inside: 'Inside the curve',
  outside: 'Outside the curve',
  at: 'At numbers typed',
}

/** The captions offered for a point, and the one each place has. */
export const CAPTIONS = ['Efficient', 'Inefficient', 'Unattainable'] as const
export const CAPTION_OF: Record<Place, string> = { on: 'Efficient', on2: 'Efficient', inside: 'Inefficient', outside: 'Unattainable', at: '' }

/** Which goods a shift changes: the whole curve, or only one end of it (a pivot). */
export const SHIFTS = ['none', 'both', 'x', 'y'] as const
export type Shift = (typeof SHIFTS)[number]
export const DIRECTIONS = ['out', 'in'] as const
export type Direction = (typeof DIRECTIONS)[number]

/** One country's curve, or two countries' for comparative advantage, on one graph or side by side. */
export const COUNTRIES = ['one', 'together', 'side'] as const
export type Countries = (typeof COUNTRIES)[number]
export const COUNTRIES_NAMES: Record<Countries, string> = { one: 'One', together: 'Two, one graph', side: 'Two, side by side' }

/** The points a graph starts with: A to D along the curve. */
export const POINTS = 'A,on,0;B,on,0.45;C,on,0.75;D,on,0.95'

export const ppcSettings = defineSettings({
  countries: choice(COUNTRIES, 'one'),
  shape: choice(SHAPES, 'out'),
  /** how far a bowed curve bows: 1 is straight */
  bow: number({ min: 1.2, max: 4, fallback: 2 }),
  /** numbered: where the curve meets each axis */
  xMax: number({ min: 0, max: 1e9, fallback: 100 }),
  yMax: number({ min: 0, max: 1e9, fallback: 100 }),
  fit: bool(true),
  /** rows of name, place, along (or x), y and caption */
  points: text(POINTS, 600),

  shift: choice(SHIFTS, 'none'),
  shiftDir: choice(DIRECTIONS, 'out'),
  shiftSize: choice(SHIFT_SIZES, 'medium'),
  /** numbered: where the new curve meets each axis */
  xMax2: number({ min: 0, max: 1e9, fallback: 120 }),
  yMax2: number({ min: 0, max: 1e9, fallback: 120 }),
  arrows: number({ min: 0, max: 3, fallback: 2 }),

  steps: bool(false),
  /** numbered: each step's change in both goods */
  deltas: bool(true),
  guides: bool(false),

  /** two countries: where each one's curve meets the axes, and those numbers written there */
  aX: number({ min: 0, max: 1e9, fallback: 40 }),
  aY: number({ min: 0, max: 1e9, fallback: 20 }),
  bX: number({ min: 0, max: 1e9, fallback: 30 }),
  bY: number({ min: 0, max: 1e9, fallback: 30 }),
  intercepts: bool(true),

  pointMode: choice(TITLE_MODES, 'text'),
  captionMode: choice(TITLE_MODES, 'text'),
  ...labels({ curveLabel: 'PPC', aName: 'Country A', bName: 'Country B' }),
  ...lookFields({
    xTitle: 'Consumer goods', yTitle: 'Capital goods',
    range: { xFrom: '0', xTo: '140', xStep: '10', yFrom: '0', yTo: '140', yStep: '10' },
  }),
})

export type PpcSettings = typeof ppcSettings.defaults

/** A point as typed: its name, where it is, how far along the curve (or its x), its y when typed, and its caption. */
export type PointRow = { name: string; place: Place; a: number; b: number; caption: string }

/** The point rows written in `points`, any place not known read as on the curve. */
export function pointsOf(points: string): PointRow[] {
  return points
    .split(';')
    .filter((row) => row.trim())
    .map((row) => {
      const [name = '', place = 'on', a = '', b = '', caption = ''] = row.split(',')
      const num = (v: string, fallback: number) => (v.trim() && Number.isFinite(Number(v)) ? Number(v) : fallback)
      return {
        name: name.trim(),
        place: (PLACES as readonly string[]).includes(place.trim()) ? (place.trim() as Place) : 'on',
        a: num(a, 0.5),
        b: num(b, 0),
        caption: caption.trim(),
      }
    })
}

/** Point rows written back, leaving off what a row doesn't use. */
export function pointsText(rows: PointRow[]) {
  const clean = (v: string) => v.replace(/[,;]/g, '').trim()
  const n = (v: number) => String(Number(v.toPrecision(6)))
  return rows
    .map((r) => {
      const cells = [clean(r.name), r.place, n(r.a), r.place === 'at' ? n(r.b) : '', clean(r.caption)]
      while (cells.length > 3 && !cells.at(-1)) cells.pop()
      return cells.join(',')
    })
    .join(';')
}

/** The label keys and modes, for making every label blank at once. */
export const MODE_KEYS = ['curveLabelMode', 'pointMode', 'captionMode', 'aNameMode', 'bNameMode'] as const
