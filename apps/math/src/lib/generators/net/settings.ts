// Every choice the teacher makes for a net, with its default. The page address
// carries any non-default values so a net can be bookmarked or shared.
//
// The measures are the 3D shape generators' own (length, width, the
// triangle's base and height, a polygon's side, the radius, height and slant
// height), kept as the text the teacher typed; readNet() in solve.ts works
// out what they mean, with the 3D shapes' own solver. A cube has one measure,
// its edge, kept in `side`.

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'
import { LABEL_MODES, ROUNDING, cleanAgainst, oneOf, queryAgainst, readMoved, writeMoved, type LabelMode, type RawSettings } from '$lib/shapes/parts.js'
import { CUBE_NETS } from './cubes.js'

export { INK, LABEL_MODES, ROUNDING, readMoved, writeMoved, type LabelMode, type RawSettings } from '$lib/shapes/parts.js'
export type { Offset } from '$lib/shapes/parts.js'

export const SHAPES = { cube: 'Cube', prism: 'Prism', pyramid: 'Pyramid', cylinder: 'Cylinder', cone: 'Cone' }
export type ShapeKind = keyof typeof SHAPES

/** A prism's or pyramid's base. Pyramids take only a rectangle or a regular polygon. */
export const BASES = { rectangle: 'Rectangle', right: 'Right triangle', isosceles: 'Isosceles triangle', regular: 'Regular polygon' }
export type Base = keyof typeof BASES
export const PYRAMID_BASES: Base[] = ['rectangle', 'regular']
export const SIDE_COUNTS = [3, 4, 5, 6, 7, 8]

/** The measures a teacher can type. */
export const MEASURES = ['length', 'width', 'triBase', 'triHeight', 'side', 'radius', 'height', 'slant'] as const
/**
 * Measures that are only ever worked out: a triangle's third side, a
 * polygon's apothem, a rectangle-based pyramid's slant height on its width
 * faces, a cylinder's circumference (its rectangle's length) and a cone's
 * sector angle.
 */
export const SOLVED_ONLY = ['hyp', 'apothem', 'slantW', 'circ', 'angle'] as const
export type Measure = (typeof MEASURES)[number]
export type Part = Measure | (typeof SOLVED_ONLY)[number]
export const PARTS: Part[] = [...MEASURES, ...SOLVED_ONLY]

/** How fold lines are drawn. */
export const FOLDS = { dashed: 'Dashed', solid: 'Solid' }
export type Fold = keyof typeof FOLDS

/** What's written in each face: nothing, a name (A, B, C …), its area, or both. */
export const FACE_TEXT = { none: 'Nothing', names: 'Names', areas: 'Areas', both: 'Names and areas' }
export type FaceText = keyof typeof FACE_TEXT

export type Settings = { [K in Measure]: string } & { [K in `${Part}Label`]: LabelMode } & { [K in `${Part}Text`]: string } & {
  shape: ShapeKind
  base: Base
  sides: number
  /** Which of the 11 cube nets, from 1. */
  cubeNet: number
  /** The radius measure is typed and labeled as a diameter. */
  diameter: boolean
  fold: Fold
  /** Glue tabs on the edges that meet when the net is folded, for cutting out. */
  tabs: boolean
  /** Faces that match tinted alike. */
  shade: boolean
  faceText: FaceText
  /** Right-angle squares, where a height, apothem or slant height meets a side. */
  square: boolean
  /** The 3D shape drawn beside its net. */
  showShape: boolean
  unit: string
  round: number
  moved: string
  labelSize: LabelSize
}

/**
 * Labels that start shown even though they're worked out: a net is for
 * surface area, so every length needed to find each face's area is written.
 */
const SHOWN: Part[] = ['hyp', 'slantW', 'slant']

export const DEFAULT_SETTINGS = {
  shape: 'prism',
  base: 'rectangle',
  sides: 6,
  cubeNet: 1,
  length: '5',
  width: '3',
  triBase: '6',
  triHeight: '4',
  side: '4',
  radius: '3',
  height: '4',
  slant: '',
  ...Object.fromEntries(PARTS.flatMap((k) => [[`${k}Label`, SHOWN.includes(k) ? 'measure' : 'auto'], [`${k}Text`, '']])),
  diameter: false,
  fold: 'dashed',
  tabs: false,
  shade: false,
  faceText: 'none',
  square: true,
  showShape: false,
  unit: 'cm',
  round: 1,
  moved: '',
  labelSize: 'medium',
} as Settings

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  const out = cleanAgainst(d, s)
  for (const k of PARTS) out[`${k}Label`] = oneOf(LABEL_MODES, out[`${k}Label`], d[`${k}Label`])
  out.shape = oneOf(Object.keys(SHAPES), out.shape, d.shape)
  out.base = oneOf(out.shape === 'pyramid' ? PYRAMID_BASES : Object.keys(BASES), out.base, d.base)
  out.sides = oneOf(SIDE_COUNTS, out.sides, d.sides)
  out.cubeNet = oneOf(CUBE_NETS.map((_, i) => i + 1), out.cubeNet, d.cubeNet)
  out.fold = oneOf(Object.keys(FOLDS), out.fold, d.fold)
  out.faceText = oneOf(Object.keys(FACE_TEXT), out.faceText, d.faceText)
  out.round = oneOf(ROUNDING, out.round, d.round)
  out.moved = writeMoved(readMoved(out.moved))
  out.labelSize = cleanLabelSize(out.labelSize)
  return out as Settings
}

export function settingsToQuery(s: Settings): string {
  return queryAgainst(DEFAULT_SETTINGS, s)
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const s: RawSettings = { ...DEFAULT_SETTINGS }
  for (const key of Object.keys(DEFAULT_SETTINGS)) if (params.has(key)) s[key] = params.get(key)
  return cleanSettings(s)
}
