// VSEPR Shapes' settings, as they appear in the page address, and the shape
// a formula makes. The structure is Lewis Structures' built structure under
// the octet rule, its first resonance structure.

import { figureTextFields } from '$lib/shared/figureText'
import { bool, choice, defineSettings, number, text } from '$lib/shared/settings'
import { resolve } from '../lewis-structures/resolve'
import type { Structure } from '../lewis-structures/structure'
import { defaultAngleText, vseprShape, type VseprShape } from './shape'

export const STYLES = ['wedge-and-dash', 'ball-and-stick'] as const
export type Style = (typeof STYLES)[number]

/** How the central atom's lone pairs are drawn. */
export const LONE_PAIRS = ['lobes', 'dots', 'none'] as const
export type LonePairs = (typeof LONE_PAIRS)[number]

export const MAX_FORMULA = 40
/** The bond angle labels the teacher typed, one per kind of angle, joined by | */
export const MAX_ANGLES = 60
export const MAX_ANGLE_TEXT = 12

export const vseprSettings = defineSettings(
  {
    formula: text('NH3', MAX_FORMULA),
    style: choice(STYLES, 'wedge-and-dash'),
    yaw: number({ min: -180, max: 180, fallback: 0 }),
    pitch: number({ min: -90, max: 90, fallback: 0 }),
    lonePairs: choice(LONE_PAIRS, 'lobes'),
    outerPairs: bool(false),
    symbols: bool(true),
    grayscale: bool(false),
    shapeName: bool(true),
    electronGeometry: bool(false),
    axe: bool(false),
    bondAngles: bool(false),
    angles: text('', MAX_ANGLES),
    question: bool(false),
    ...figureTextFields(),
  },
  (s) => ({
    ...s,
    yaw: Math.round(s.yaw),
    pitch: Math.round(s.pitch),
    // a question needs a label to leave blank
    question: s.question && anyLabel(s),
  }),
)

export type VseprSettings = typeof vseprSettings.defaults

type Labels = { shapeName: boolean; electronGeometry: boolean; axe: boolean; bondAngles: boolean }

/** Whether any label is on that a "name the shape" question could leave blank. */
export function anyLabel(s: Labels): boolean {
  return s.shapeName || s.electronGeometry || s.axe || s.bondAngles
}

/** Whether the figure is a "name the shape" question: asked for, with a label to leave blank. */
export const asking = (s: Labels & { question: boolean }): boolean => s.question && anyLabel(s)

export type Found =
  | { ok: true; name: string; structure: Structure; shape: VseprShape }
  | { ok: false; message: string; request: boolean }

const found = new Map<string, Found>()

/** The shape a formula makes, or why it can't be drawn. */
export function findShape(formula: string): Found {
  let f = found.get(formula)
  if (f) return f
  f = findOnce(formula)
  if (found.size >= 8) found.delete(found.keys().next().value!)
  found.set(formula, f)
  return f
}

function findOnce(formula: string): Found {
  const r = resolve({ formula, which: '', rule: 'octet', shape: 'flat' })
  if (!r.ok) return { ok: false, message: r.message.replace('a correct Lewis structure', 'a structure'), request: r.request }
  if (r.listed) return { ok: false, message: `${r.name} has more than one central atom, so it has a shape around each of them. VSEPR Shapes draws one central atom.`, request: true }
  if (r.formula.atoms.length === 1 || r.central === undefined) return { ok: false, message: `${r.name} is one atom on its own, with no shape to draw.`, request: false }
  const structure = r.correct[0]
  const shape = vseprShape(structure, r.central)
  if (!shape.ok) return { ok: false, message: shape.message, request: true }
  return { ok: true, name: r.name, structure, shape: shape.shape }
}

/** Each kind of bond angle's label: what the teacher typed, or the ideal angle. */
export function angleLabels(shape: VseprShape, typed: string): string[] {
  const own = typed.split('|')
  return shape.angles.map((a, i) => own[i]?.trim() || defaultAngleText(a))
}

/** The typed labels with one of them changed; blank goes back to the default. */
export function withAngleLabel(shape: VseprShape, typed: string, i: number, label: string): string {
  const own = shape.angles.map((_, k) => typed.split('|')[k] ?? '')
  own[i] = label.replaceAll('|', '').slice(0, MAX_ANGLE_TEXT)
  return own.every((t) => !t.trim()) ? '' : own.join('|')
}

/** The lines under the figure, and the answer key's, for the labels that are on. */
export function labelLines(s: VseprSettings, shape: VseprShape) {
  const angles = angleLabels(shape, s.angles)
  const answers: [string, string][] = []
  if (s.shapeName) answers.push(['Shape', shape.name])
  if (s.electronGeometry) answers.push(['Electron geometry', shape.electronGeometry])
  if (s.axe) answers.push(['AXE notation', shape.axe])
  if (s.bondAngles && angles.length) answers.push([angles.length > 1 ? 'Bond angles' : 'Bond angle', angles.join(' and ')])
  const blank = '______________'
  // The bond angles have their own labels in the figure.
  const under = answers.filter(([what]) => !what.startsWith('Bond')).map(([what, answer]) => `${what}: ${asking(s) ? blank : answer}`)
  const key = asking(s) && s.answerKey && answers.length ? ['Answer key', ...answers.map(([what, answer]) => `${what}: ${answer}`)] : []
  return { under, key }
}
