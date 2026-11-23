// Every choice the teacher makes on the Torque Generator, with its default: a
// 1 m beam on a pivot at its middle, a 6 N object hanging 0.2 m to the left
// of the pivot and a 3 N one 0.4 m to the right. It balances.
//
// Every place along the beam (the pivot, the supports, the cable and each
// load) is measured from the beam's left end, which is the wall's end, in
// lengthUnit, so a load stays put when the pivot moves or the support
// changes. Mirrored, that end is on the right.

import { bool, choice, defineSettings, int, label, list, number, type SettingsOf } from '$lib/shared/settings'
import type { Label } from '$lib/shared/label'

/** What holds the beam up: one pivot, two supports (A and B), or a wall, with or without a cable. */
export const SUPPORTS = ['pivot', 'two', 'wall'] as const
export type SupportKind = (typeof SUPPORTS)[number]

/** A load: an object hanging under the beam or resting on it, or a force arrow with no object. */
export const LOAD_KINDS = ['hanging', 'resting', 'down', 'up'] as const
export type LoadKind = (typeof LOAD_KINDS)[number]

export const LENGTH_UNITS = ['m', 'cm'] as const
export type LengthUnit = (typeof LENGTH_UNITS)[number]

/** Every load's value and the beam's weight are in one unit: N is a weight, kg and g a mass. */
export const VALUE_UNITS = ['N', 'kg', 'g'] as const
export type ValueUnit = (typeof VALUE_UNITS)[number]

/** What 1 kg weighs, in N/kg, for a mass. */
export const G_VALUES = ['9.8', '9.81', '10'] as const

export const MAX_LOADS = 6
export const MAX_LENGTH = 100

const text = (t: string): Label => ({ mode: 'text', text: t })
/** A label left as written text with nothing typed shows its value: "6 N", "0.2 m". */
const auto = (): Label => text('')

/** One load. New fields go at the end, so old links keep working (see `list`). */
const load = {
  kind: choice<LoadKind>('hanging', LOAD_KINDS),
  /** from the beam's left end */
  position: number(0.3, 0, MAX_LENGTH),
  /** its weight in N, or its mass in kg or g */
  value: number(6, 0, 99999),
  label: label(auto()),
  /** the label of its distance mark */
  distanceLabel: label(auto()),
  /** an object's shape and size, as the Pulley's */
  shape: choice('block', ['block', 'ball']),
  size: number(1, 0.5, 2),
}

export type Load = SettingsOf<typeof load>

/** A load with every setting at its default. */
const LOAD_DEFAULTS = Object.fromEntries(Object.entries(load).map(([key, f]) => [key, f.default])) as Load

/** A load of this kind at `position` with `value`, its labels showing its values. */
export const newLoad = (position: number, value: number, kind: LoadKind = 'hanging'): Load => ({ ...structuredClone(LOAD_DEFAULTS), kind, position, value })

export const torqueSettings = defineSettings({
  support: choice<SupportKind>('pivot', SUPPORTS),
  /** the beam's length, in lengthUnit */
  length: number(1, 0.1, MAX_LENGTH),
  lengthUnit: choice<LengthUnit>('m', LENGTH_UNITS),
  /** where the pivot is */
  pivot: number(0.5, 0, MAX_LENGTH),
  /** where the two supports are */
  supportA: number(0, 0, MAX_LENGTH),
  supportB: number(1, 0, MAX_LENGTH),
  loads: list(load, [newLoad(0.3, 6), newLoad(0.9, 3)], MAX_LOADS),
  unit: choice<ValueUnit>('N', VALUE_UNITS),
  /** g in N/kg, for a mass; shown only for kg and g */
  g: choice('9.8', G_VALUES),
  /** the beam's own weight or mass, drawn at its middle; 0 is a light beam */
  beamWeight: number(0, 0, 99999),
  beamLabel: label(auto()),
  /** a dimension line from the pivot (or support A, or the wall) to each load */
  distances: bool(true),
  /** a dimension line for the whole beam */
  lengthMark: bool(false),
  lengthLabel: label(auto()),
  /** a gravity arrow down from every object, with no label */
  weightArrows: bool(false),
  /** the forces holding the beam up, often the answer */
  supportForces: bool(false),
  supportLabel: label(text('F')),
  tensionLabel: label(text('T')),
  /** "A" and "B" under two supports */
  supportNames: bool(true),
  // The wall's cable.
  cable: bool(true),
  /** where the cable meets the beam */
  cableAt: number(1, 0, MAX_LENGTH),
  /** between the cable and the beam, in degrees */
  cableAngle: int(30, 15, 75),
  angleLabel: label(text('theta')),
  mirror: bool(false),
  color: bool(false),
  /** the label of a fixed beam's wall moment, drawn with the support forces */
  momentLabel: label(text('M')),
})

export type TorqueSettings = typeof torqueSettings.defaults

/** A place along a beam `length` long, kept on it. */
export const onBeam = (x: number, length: number) => Math.min(length, Math.max(0, x))

const hundredths = (n: number) => Math.round(n * 100) / 100

/**
 * The places along the beam after its length changes from `from` to `to`:
 * the pivot at the middle stays at the middle, and a support or cable at the
 * right end stays at the end. Loads stay where they are (and are drawn at the
 * end when they're past it).
 */
export function resized<S extends Pick<TorqueSettings, 'pivot' | 'supportA' | 'supportB' | 'cableAt'>>(s: S, from: number, to: number): S {
  const follow = (x: number) => (Math.abs(x - from) < 1e-9 ? to : x)
  return {
    ...s,
    pivot: Math.abs(s.pivot - from / 2) < 1e-9 ? hundredths(to / 2) : s.pivot,
    supportA: follow(s.supportA),
    supportB: follow(s.supportB),
    cableAt: follow(s.cableAt),
  }
}

/**
 * The same beam in another length unit, every length and place multiplied
 * by `factor` (100 from m to cm), or null when the beam would be too long or
 * too short to set in it.
 */
export function converted(s: TorqueSettings, factor: number): Pick<TorqueSettings, 'length' | 'pivot' | 'supportA' | 'supportB' | 'cableAt' | 'loads'> | null {
  const length = hundredths(s.length * factor)
  if (length < 0.1 || length > MAX_LENGTH) return null
  const at = (x: number) => hundredths(x * factor)
  return {
    length,
    pivot: at(s.pivot),
    supportA: at(s.supportA),
    supportB: at(s.supportB),
    cableAt: at(s.cableAt),
    loads: s.loads.map((l) => ({ ...l, position: at(l.position) })),
  }
}

/**
 * The beam in another length unit: every length and place converted, or,
 * when the beam can't be set in that unit, why not, and nothing changes.
 */
export function inUnit(
  s: TorqueSettings,
  unit: LengthUnit,
): { changes: Partial<TorqueSettings> & { lengthUnit: LengthUnit } } | { problem: string } {
  if (unit === s.lengthUnit) return { changes: { lengthUnit: unit } }
  const c = converted(s, unit === 'cm' ? 100 : 0.01)
  if (!c) {
    const length = `${Math.round(s.length * 100) / 100} ${s.lengthUnit}`
    return unit === 'cm'
      ? { problem: `A ${length} beam is longer than ${MAX_LENGTH} cm, so it can’t be set in cm. It stays in m.` }
      : { problem: `A ${length} beam is shorter than 0.1 m, so it can’t be set in m. It stays in cm.` }
  }
  return { changes: { ...c, lengthUnit: unit } }
}
