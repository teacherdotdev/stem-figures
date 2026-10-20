// Half-Life Graph's settings, as they appear in the page address: up to
// three isotopes (each a setup, or the teacher's own name and half-life),
// what's up the side, the time unit along the bottom, and what's marked. The
// grid and axes are $shared/graph's, as Heating and Cooling Curve's are; the
// axis titles follow the quantity and the time unit unless the teacher typed
// their own, as Mass Spectrum's y-axis title does.

import { gridFields } from '$shared/graph/axes'
import { bool, choice, defineSettings, number, text, type Field } from '$lib/shared/settings'
import { ISOTOPE_IDS, UNITS, UNIT_NAMES, isotopeOf, type IsotopeId, type Unit } from './isotopes'

/** The most isotopes on one graph. */
export const MAX_ISOTOPES = 3
export const SLOTS = [0, 1, 2] as const
export type Slot = (typeof SLOTS)[number]

/** Each isotope: one of the setups, or the teacher's own (custom). */
export const ISOTOPE_CHOICES = [...ISOTOPE_IDS, 'custom'] as (IsotopeId | 'custom')[]
export type IsotopeChoice = (typeof ISOTOPE_CHOICES)[number]

/** What's up the side: the share left (as a percent or a fraction), the mass, the number of nuclei, or the activity. */
export const QUANTITIES = ['percent', 'fraction', 'mass', 'nuclei', 'activity'] as const
export type Quantity = (typeof QUANTITIES)[number]
export const QUANTITY_NAMES: Record<Quantity, string> = {
  percent: 'Percent remaining',
  fraction: 'Fraction remaining',
  mass: 'Mass',
  nuclei: 'Number of nuclei',
  activity: 'Activity',
}
/** The quantities that start from an amount the teacher types. */
export const STARTED = ['mass', 'nuclei', 'activity'] as const satisfies Quantity[]
export const hasStart = (q: Quantity) => (STARTED as readonly Quantity[]).includes(q)
/** The amount each of those starts from, until the teacher types another. */
export const START_DEFAULTS: Record<Quantity, number> = { percent: 100, fraction: 1, mass: 100, nuclei: 1000, activity: 1000 }
/** The quantities a daughter can be drawn in: amounts of atoms. A stable daughter has no activity, and an alpha emitter's daughter is lighter. */
export const DAUGHTER_QUANTITIES = ['percent', 'fraction', 'nuclei'] as const satisfies Quantity[]

export const ACTIVITY_UNITS = ['Bq', 'cpm'] as const
export type ActivityUnit = (typeof ACTIVITY_UNITS)[number]

/** What's written by each guide line: the time, T½, 2T½…, a blank line, or nothing. */
export const GUIDE_LABELS = ['times', 'halves', 'blank', 'none'] as const
export const GUIDE_LABEL_NAMES: Record<(typeof GUIDE_LABELS)[number], string> = {
  times: 'Times',
  halves: 'T½, 2T½…',
  blank: 'Blank lines',
  none: 'None',
}

/** The x-axis title this page writes for a time unit. */
export const xTitleFor = (unit: Unit) => `Time (${UNIT_NAMES[unit].many})`
const X_TITLES = UNITS.map(xTitleFor)

/** The y-axis title this page writes for what's up the side, and whether a daughter's drawn with it. */
export function yTitleFor(q: Quantity, unit: ActivityUnit, withDaughter: boolean) {
  if (q === 'percent') return withDaughter ? 'Percent of atoms (%)' : 'Percent remaining (%)'
  if (q === 'fraction') return withDaughter ? 'Fraction of atoms' : 'Fraction remaining'
  if (q === 'mass') return 'Mass remaining (g)'
  if (q === 'nuclei') return withDaughter ? 'Number of nuclei' : 'Nuclei remaining'
  return unit === 'Bq' ? 'Activity (Bq)' : 'Count rate (counts/min)'
}
const Y_TITLES = QUANTITIES.flatMap((q) => ACTIVITY_UNITS.flatMap((u) => [yTitleFor(q, u, false), yTitleFor(q, u, true)]))

/** One isotope's fields, numbered from 1 in the address: iso1, half1… */
function isotope<N extends 1 | 2 | 3>(n: N, id: IsotopeChoice) {
  return {
    [`iso${n}`]: choice(ISOTOPE_CHOICES, id),
    /** a custom isotope's name; empty for "Isotope 1" */
    [`name${n}`]: text('', 40),
    /** a custom isotope's half-life, in unit{n} */
    [`half${n}`]: number({ min: 1e-6, max: 1e12, fallback: 10 }),
    [`unit${n}`]: choice(UNITS, 'y'),
  } as Record<`iso${N}`, Field<IsotopeChoice>> & Record<`name${N}`, Field<string>> & Record<`half${N}`, Field<number>> & Record<`unit${N}`, Field<Unit>>
}

export const halfLifeSettings = defineSettings(
  {
    /** how many isotopes are drawn, 1 to 3 */
    count: number({ min: 1, max: MAX_ISOTOPES, fallback: 1 }),
    ...isotope(1, 'c14'),
    ...isotope(2, 'cs137'),
    ...isotope(3, 'co60'),
    /** the isotopes' names in the key; hidden, they're Isotope A, B and C */
    names: bool(true),
    quantity: choice(QUANTITIES, 'percent'),
    /** the starting mass (g), number of nuclei or activity */
    start: number({ min: 0.001, max: 1e6, fallback: 100 }),
    activityUnit: choice(ACTIVITY_UNITS, 'Bq'),
    /** the time unit along the x-axis */
    xUnit: choice(UNITS, 'y'),
    /** the curves drawn; off, only the dots (or an empty grid) are left */
    curve: bool(true),
    /** a dot at the start and at each half-life */
    dots: bool(false),
    /** the first isotope's stable daughter, rising as the parent falls */
    daughter: bool(false),
    /** a custom isotope's daughter's name; empty for "Daughter" */
    daughterName: text('', 40),
    /** dashed guide lines at the first isotope's first 1 to 4 half-lives; 0 for none */
    guides: number({ min: 0, max: 4, fallback: 0 }),
    guideLabels: choice(GUIDE_LABELS, 'times'),
    color: bool(true),
    ...gridFields({
      xFrom: '0', xTo: '30000', xStep: '2000', xEvery: 2,
      yFrom: '0', yTo: '100', yStep: '10', yEvery: 1,
      title: '', titleMode: 'none',
      xTitle: xTitleFor('y'), xTitleMode: 'text',
      yTitle: yTitleFor('percent', 'Bq', false), yTitleMode: 'text',
      xLabel: 'x', xLabelMode: 'none', yLabel: 'y', yLabelMode: 'none',
      xStartCap: 'none', xEndCap: 'none', yStartCap: 'none', yEndCap: 'none',
      minor: 0,
    }),
  },
  (s) => {
    const fixed = { ...s, count: Math.round(s.count), guides: Math.round(s.guides) }
    // The axis titles follow the time unit and what's up the side, unless the teacher typed their own.
    const xTitle = X_TITLES.includes(s.xTitle) ? xTitleFor(s.xUnit) : s.xTitle
    const yTitle = Y_TITLES.includes(s.yTitle) ? yTitleFor(s.quantity, s.activityUnit, daughterShown(fixed)) : s.yTitle
    return { ...fixed, xTitle, yTitle }
  },
)

export type HalfLifeSettings = typeof halfLifeSettings.defaults

/** One isotope as drawn: its name, half-life and unit, and its stable daughter if it has one. */
export type Drawn = { slot: Slot; id: IsotopeChoice; name: string; half: number; unit: Unit; mode?: string; daughter?: string }

const field = <K extends string>(name: K, i: Slot) => `${name}${i + 1}` as `${K}${1 | 2 | 3}`

/** The isotope in a slot (0 to 2), whether drawn or not. */
export function isotopeIn(s: HalfLifeSettings, i: Slot): Drawn {
  const id = s[field('iso', i)]
  if (id === 'custom') {
    const name = s[field('name', i)].trim() || `Isotope ${i + 1}`
    return { slot: i, id, name, half: s[field('half', i)], unit: s[field('unit', i)], daughter: s.daughterName.trim() || 'Daughter' }
  }
  const x = isotopeOf(id)
  return { slot: i, id, name: x.name, half: x.half, unit: x.unit, mode: x.mode, daughter: x.daughter }
}

/** The isotopes drawn, first to last. */
export const drawnIsotopes = (s: HalfLifeSettings): Drawn[] => SLOTS.slice(0, s.count).map((i) => isotopeIn(s, i))

/** The settings the daughter depends on, as their own type, since the settings' rules use them. */
type DaughterFields = { count: number; quantity: Quantity; iso1: IsotopeChoice; daughter: boolean }

/** Whether the daughter can be drawn: one isotope, with a stable daughter, in an amount of atoms. */
export function daughterAllowed(s: Omit<DaughterFields, 'daughter'>): boolean {
  return (
    s.count === 1 &&
    (DAUGHTER_QUANTITIES as readonly Quantity[]).includes(s.quantity) &&
    (s.iso1 === 'custom' || !!isotopeOf(s.iso1).daughter)
  )
}

/** Whether the daughter is drawn. */
export function daughterShown(s: DaughterFields): boolean {
  return s.daughter && daughterAllowed(s)
}

/** What the figure calls an isotope: its name, or Isotope A, B or C when names are hidden (the parent, alone with its daughter). */
export function shownName(s: HalfLifeSettings, i: Slot) {
  if (s.names) return isotopeIn(s, i).name
  return s.count === 1 && daughterShown(s) ? 'Parent isotope' : `Isotope ${String.fromCharCode(65 + i)}`
}

/** What the figure calls the daughter: its name, or "Daughter isotope" when names are hidden. */
export const shownDaughter = (s: HalfLifeSettings) => (s.names ? (isotopeIn(s, 0).daughter ?? 'Daughter') : 'Daughter isotope')

/** The value up the side for a share of the starting amount. */
export const valueOf = (s: Pick<HalfLifeSettings, 'quantity' | 'start'>, share: number) =>
  s.quantity === 'percent' ? 100 * share : s.quantity === 'fraction' ? share : s.start * share
