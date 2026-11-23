// Every choice the teacher makes on the Lever Generator, with its default: a
// class 1 lever with a 300 N load 0.5 m from the fulcrum and the effort 1.5 m
// from it. The effort is never typed: an ideal lever balances, so it is
// worked out here, in one place, for the figure's label, the form and the
// answer key. The labels are Physics' own ($lib/shared/label), each written,
// a blank line, or none.

import { figureTextFields } from '$shared/figureText'
import { LABEL_SIZES, type LabelSize } from '$shared/labelSize'
import { bool, choice, defineSettings, number, type Field } from '$shared/settings'
import { cleanLabel, decodeLabel, encodeLabel, type Label } from '$lib/shared/label'

/** The lever's class: which of the fulcrum (1), the load (2) and the effort (3) is in the middle. */
export const CLASSES = ['1', '2', '3'] as const
export type LeverClass = (typeof CLASSES)[number]

export const LENGTH_UNITS = ['cm', 'm', 'in', 'ft'] as const
export type LengthUnit = (typeof LENGTH_UNITS)[number]

/** A load in N or lb is a force; in kg or g it is a mass. */
export const LOAD_UNITS = ['N', 'lb', 'kg', 'g'] as const
export type LoadUnit = (typeof LOAD_UNITS)[number]

/** The load drawn as a block on the beam, or as a force arrow down onto it. */
export const LOAD_SHOWN = ['block', 'arrow'] as const
export type LoadShown = (typeof LOAD_SHOWN)[number]

/** What 1 kg weighs, in N. */
export const G = 9.8

/** A label on the figure: written text, a blank line, or none. */
function label(fallback: Label): Field<Label> {
  return {
    fallback,
    accept: (v) => (v && typeof v === 'object' ? cleanLabel(v, fallback) : undefined),
    parse: (text) => decodeLabel(text, fallback),
    format: encodeLabel,
  }
}

const text = (t: string): Label => ({ mode: 'text', text: t })
const thousandths = (n: number) => Math.round(n * 1000) / 1000

/** Do these arms suit the class? Class 2 has the longer effort arm, class 3 the longer load arm. */
export const armsSuit = (cls: LeverClass, effortArm: number, loadArm: number) =>
  cls === '1' || (cls === '2' ? effortArm >= loadArm : effortArm <= loadArm)

export const leverSettings = defineSettings(
  {
    class: choice(CLASSES, '1'),
    /** the distances from the fulcrum, in lengthUnit */
    effortArm: number({ min: 0.1, max: 999, fallback: 1.5 }),
    loadArm: number({ min: 0.1, max: 999, fallback: 0.5 }),
    lengthUnit: choice(LENGTH_UNITS, 'm'),
    load: number({ min: 0.1, max: 9999, fallback: 300 }),
    loadUnit: choice(LOAD_UNITS, 'N'),
    loadShown: choice(LOAD_SHOWN, 'block'),
    // The four values. Written and left empty, each shows its value with its unit.
    loadLabel: label(text('')),
    effortLabel: label(text('')),
    effortArmLabel: label(text('')),
    loadArmLabel: label(text('')),
    // The parts' names.
    effortName: label(text('Effort')),
    loadName: label(text('Load')),
    fulcrumName: label(text('Fulcrum')),
    /** the two dimension lines under the lever */
    arms: bool(true),
    mirror: bool(false),
    color: bool(false),
    labelSize: choice(Object.keys(LABEL_SIZES) as LabelSize[], 'medium'),
    ...figureTextFields(),
  },
  (s) => {
    const [effortArm, loadArm, load] = [s.effortArm, s.loadArm, s.load].map(thousandths)
    // Arms that don't suit the class are the other way round.
    return armsSuit(s.class, effortArm, loadArm) ? { ...s, effortArm, loadArm, load } : { ...s, effortArm: loadArm, loadArm: effortArm, load }
  },
)

export type LeverSettings = typeof leverSettings.defaults

type Sums = Pick<LeverSettings, 'class' | 'effortArm' | 'loadArm' | 'lengthUnit' | 'load' | 'loadUnit'>

/** A number as typed or multiplied out, without the stray digits sums leave behind. */
export const exact = (n: number) => plain(Number(n.toPrecision(12)))

/** A number to 3 significant figures, the one way every worked-out value is rounded, its trailing zeros kept: 0.0300, 3.00. */
export function sig3(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '0'
  return expanded(n.toPrecision(3))
}

/** A number written out in full, never as 1e-7. */
function plain(n: number): string {
  return expanded(String(n))
}

/** Digits in e-notation ("9.81e-8", "1.23e+3") written out in full, keeping every digit given. */
function expanded(written: string): string {
  if (!written.includes('e')) return written
  const [mantissa, power] = written.split('e')
  const sign = mantissa.startsWith('-') ? '-' : ''
  const unsigned = mantissa.replace('-', '')
  const dot = unsigned.indexOf('.')
  const digits = unsigned.replace('.', '')
  const point = (dot < 0 ? unsigned.length : dot) + Number(power)
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`
  if (point >= digits.length) return `${sign}${digits}${'0'.repeat(point - digits.length)}`
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`
}

/** Does a worked-out value come out even, so 3 significant figures say all of it? */
export const comesOutEven = (n: number) => !Number.isFinite(n) || n === 0 || Number(n.toPrecision(3)) === Number(n.toPrecision(12))

/** A worked-out value as it's shown: in full when it comes out even (3, 49, 0.25), else to 3 significant figures (0.333, 12.1, 0.0300). */
export const worked = (n: number) => (comesOutEven(n) ? exact(n) : sig3(n))

/**
 * The lever's sums. The load's weight is the load itself in N or lb, and
 * mass × 9.8 N/kg for a load in kg or g. An ideal lever balances, so the
 * effort is the weight × load arm ÷ effort arm, in lb for a load in lb and
 * in N otherwise.
 */
export function leverOf(s: Sums) {
  const mass = s.loadUnit === 'kg' || s.loadUnit === 'g'
  const kg = s.loadUnit === 'g' ? s.load / 1000 : s.load
  const weight = mass ? kg * G : s.load
  return {
    /** is the load a mass? */
    mass,
    /** the load in kg, when it is a mass */
    kg,
    /** the load's weight, in forceUnit */
    weight,
    forceUnit: s.loadUnit === 'lb' ? 'lb' : 'N',
    /** mechanical advantage: effort arm ÷ load arm */
    advantage: s.effortArm / s.loadArm,
    effort: (weight * s.loadArm) / s.effortArm,
  }
}

/** The four values as their labels show them when nothing is typed: "300 N", "100 N", "1.5 m", "0.5 m". */
export function valueTexts(s: Sums) {
  const l = leverOf(s)
  return {
    load: `${exact(s.load)} ${s.loadUnit}`,
    effort: `${worked(l.effort)} ${l.forceUnit}`,
    effortArm: `${exact(s.effortArm)} ${s.lengthUnit}`,
    loadArm: `${exact(s.loadArm)} ${s.lengthUnit}`,
  }
}

/**
 * The answer key: the class, a mass's weight, the mechanical advantage and
 * the effort. It is the same whichever label is the unknown. A value that
 * doesn't come out even is written with ≈.
 */
export function answerLines(s: Sums): string[] {
  const l = leverOf(s)
  const v = valueTexts(s)
  // A mass's weight, like every worked-out value, is to 3 significant figures when it doesn't come out even.
  const weight = `${worked(l.weight)} ${l.forceUnit}`
  const is = (n: number) => (comesOutEven(n) ? '=' : '≈')
  const lines = [`Class ${s.class} lever`]
  if (s.loadUnit === 'kg') lines.push(`Load = ${v.load} × ${G} N/kg ${is(l.weight)} ${weight}`)
  if (s.loadUnit === 'g') lines.push(`Load = ${v.load} = ${exact(l.kg)} kg, and ${exact(l.kg)} kg × ${G} N/kg ${is(l.weight)} ${weight}`)
  lines.push(`MA = effort arm ÷ load arm = ${v.effortArm} ÷ ${v.loadArm} ${is(l.advantage)} ${worked(l.advantage)}`)
  // Worked from a rounded weight, the effort is ≈ even when it comes out even itself.
  const effortIs = comesOutEven(l.weight) ? is(l.effort) : '≈'
  lines.push(
    comesOutEven(l.advantage)
      ? `Effort = ${weight} ÷ ${worked(l.advantage)} ${effortIs} ${v.effort}`
      : `Effort = ${weight} × ${v.loadArm} ÷ ${v.effortArm} ${effortIs} ${v.effort}`,
  )
  return lines
}
