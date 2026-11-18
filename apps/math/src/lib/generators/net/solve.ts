// What a net's settings mean: which measures the chosen 3D shape has, each as
// a number, and the ones worked out from the others. The 3D shape
// generators' own solver does the work (a pyramid or cone takes its height or
// its slant height); a net adds the lengths only a net shows: a rectangular
// pyramid's second slant height, a cylinder's circumference and a cone's
// sector angle.

import { parseNumber } from '$lib/shared/math.js'
import { settingsFor } from '../3d-shape/settings.js'
import { readShape, radiusOf } from '../3d-shape/solve.js'
import { PYRAMID_BASES, type Base, type Measure, type Part, type Settings, type ShapeKind } from './settings.js'

/** The 3D shape the settings describe, with the choices that don't apply to it settled. */
export type Form = {
  shape: ShapeKind
  base: Base
  sides: number
  /** The measures typed for this shape, in the order the settings list them. */
  inputs: Measure[]
  /** The measures the net can be labeled with. */
  parts: Part[]
  /** Every row the settings list: the inputs and the labeled parts, in order. */
  rows: Part[]
}

export type NetRead = {
  form: Form
  /** Every part's measure, typed or worked out; null when the measures don't make a shape. */
  values: Record<Part, number> | null
  given: Record<Part, number | null>
  problems: Partial<Record<Part, string>>
  problem: string | null
}

const ALL: Part[] = ['length', 'width', 'triBase', 'triHeight', 'hyp', 'side', 'apothem', 'radius', 'height', 'slant', 'slantW', 'circ', 'angle']

export function formOf(s: Settings): Form {
  const shape = s.shape
  const base: Base = shape === 'pyramid' && !PYRAMID_BASES.includes(s.base) ? 'rectangle' : shape === 'cube' ? 'rectangle' : s.base
  const parts: Part[] = []
  const inputs: Measure[] = []
  if (shape === 'cube') {
    inputs.push('side')
    parts.push('side')
  }
  if (shape === 'prism' || shape === 'pyramid') {
    if (base === 'rectangle') parts.push('length', 'width')
    else if (base === 'regular') parts.push('side', 'apothem')
    else parts.push('triBase', 'triHeight', 'hyp')
    inputs.push(...(parts.filter((k) => k !== 'apothem' && k !== 'hyp') as Measure[]))
  }
  if (shape === 'prism') {
    inputs.push('height')
    parts.push('height')
  }
  if (shape === 'cylinder' || shape === 'cone') {
    inputs.push('radius')
    parts.push('radius')
  }
  if (shape === 'cylinder') {
    inputs.push('height')
    parts.push('height', 'circ')
  }
  if (shape === 'pyramid' || shape === 'cone') {
    // The height isn't on the net, but it can be given in place of the slant height.
    inputs.push('height', 'slant')
    parts.push('slant')
    if (shape === 'pyramid' && base === 'rectangle') parts.push('slantW')
    if (shape === 'cone') parts.push('angle')
  }
  const rows = ALL.filter((k) => parts.includes(k) || (inputs as Part[]).includes(k))
  return { shape, base, sides: s.sides, inputs, parts, rows }
}

/** Whether a triangle-based prism, which lies on its side, so its height is called its length. */
const lies = (form: Pick<Form, 'shape' | 'base'>) => form.shape === 'prism' && (form.base === 'right' || form.base === 'isosceles')

/** What a part is called, in words, for the settings panel and its messages. */
export function partName(s: Pick<Settings, 'diameter'>, form: Pick<Form, 'shape' | 'base' | 'parts'>, k: Part): string {
  if (form.shape === 'cube' && k === 'side') return 'edge'
  if (k === 'height' && lies(form)) return 'length'
  if (k === 'radius' && s.diameter) return 'diameter'
  if (k === 'hyp') return form.base === 'right' ? 'hypotenuse' : 'slanted side'
  if (k === 'slant' && form.parts.includes('slantW')) return 'slant height on the length'
  return NAMES[k]
}
const NAMES: Record<Part, string> = {
  length: 'length', width: 'width', triBase: 'base', triHeight: 'triangle’s height', side: 'side', apothem: 'apothem', radius: 'radius',
  height: 'height', slant: 'slant height', hyp: 'hypotenuse', slantW: 'slant height on the width', circ: 'circumference', angle: 'sector angle',
}

const blank = () => Object.fromEntries(ALL.map((k) => [k, null])) as Record<Part, number | null>

export function readNet(s: Settings): NetRead {
  const form = formOf(s)
  const given = blank()
  const problems: Partial<Record<Part, string>> = {}
  const fail = (problem: string | null) => ({ form, values: null, given, problems, problem })

  if (form.shape === 'cube') {
    const typed = s.side.trim()
    const v = typed ? parseNumber(typed) : null
    if (typed && v === null) problems.side = 'Type a number, like 12, 2.5, 5/2 or 3√2.'
    else if (typed && !(v! > 0)) problems.side = 'The edge has to be more than 0.'
    if (problems.side) return fail(null)
    if (v === null) return fail('Give the edge.')
    given.side = v
    return { form, values: { ...blank(), side: v } as Record<Part, number>, given, problems, problem: null }
  }

  // The 3D shape generators' solver, for a right shape (a net can't lean).
  const defaults = settingsFor(form.shape).DEFAULT_SETTINGS
  const read = readShape({
    ...defaults,
    shape: form.shape,
    base: form.base,
    sides: form.sides,
    pose: 'auto',
    oblique: false,
    diameter: s.diameter,
    length: s.length, width: s.width, triBase: s.triBase, triHeight: s.triHeight, side: s.side, radius: s.radius, height: s.height, slant: s.slant,
  })
  for (const k of form.inputs) {
    given[k] = read.given[k]
    if (read.problems[k]) problems[k] = read.problems[k]
  }
  if (!read.values) return fail(read.problem)

  const v = { ...blank() } as Record<Part, number>
  for (const k of ALL) if (k in read.values) v[k] = read.values[k as keyof typeof read.values]
  const r = form.parts.includes('radius') ? radiusOf(s, v.radius) : 0
  if (form.shape === 'pyramid' && form.base === 'rectangle') {
    v.slantW = Math.hypot(v.height, v.length / 2)
    // A square base's faces are all alike: one slant height.
    if (Math.abs(v.length - v.width) < 1e-9) {
      form.parts = form.parts.filter((k) => k !== 'slantW')
      form.rows = form.rows.filter((k) => k !== 'slantW')
    }
  }
  if (form.shape === 'cylinder') v.circ = 2 * Math.PI * r
  if (form.shape === 'cone') v.angle = (360 * r) / v.slant
  return { form, values: v, given, problems, problem: null }
}
