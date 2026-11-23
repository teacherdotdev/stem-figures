// Bond Energy Curve's settings, as they appear in the page address: up to
// three bonds, each the teacher's own name, bond length and bond energy, the
// units they're shown in, and what's marked on the curves. The grid and axes
// are $shared/graph's, as Half-Life Graph's are; the axis titles follow the
// units unless the teacher typed their own.

import { gridFields } from '$shared/graph/axes'
import { GRIDLINES, type Gridlines } from '$shared/graph/grid'
import { bool, choice, defineSettings, number, text, type Field } from '$lib/shared/settings'
import { LENGTH_UNITS, LENGTH_UNIT_TEXT, fromPm, type LengthUnit } from './morse'

/** The most bonds on one graph. */
export const MAX_BONDS = 3
export const SLOTS = [0, 1, 2] as const
export type Slot = (typeof SLOTS)[number]

/** The name each bond starts with: made up, as its numbers are. */
export const BOND_NAMES = ['Bond X', 'Bond Y', 'Bond Z'] as const

export const LENGTH_UNIT_NAMES: Record<LengthUnit, string> = { pm: 'Picometers (pm)', angstrom: 'Ångströms (Å)', nm: 'Nanometers (nm)' }

/** The energy unit, for the y-axis title and the values written by the guide lines. */
export const UNITS = ['kj-per-mol', 'kj-mol-1'] as const
export type Unit = (typeof UNITS)[number]
export const UNIT_TEXT: Record<Unit, string> = { 'kj-per-mol': 'kJ/mol', 'kj-mol-1': 'kJ mol⁻¹' }

/** The axes numbered (with gridlines if wanted), or shape only: no numbers or gridlines, fitted to the curves. */
export const AXES = ['numbered', 'shape'] as const
export type AxesMode = (typeof AXES)[number]

/** What's written by each guide line's foot: the value, "Bond length" and "Bond energy", a blank line, or nothing. */
export const GUIDE_LABELS = ['values', 'words', 'blank', 'none'] as const
export type GuideLabels = (typeof GUIDE_LABELS)[number]
export const GUIDE_LABEL_NAMES: Record<GuideLabels, string> = {
  values: 'Values',
  words: 'Bond length, bond energy',
  blank: 'Blank lines',
  none: 'None',
}

/** "Repulsion" and "Attraction" either side of one curve's minimum: written, blank lines, or left off. */
export const REGIONS = ['words', 'blank', 'none'] as const
export type Regions = (typeof REGIONS)[number]
export const REGION_NAMES: Record<Regions, string> = { words: 'Repulsion, attraction', blank: 'Blank lines', none: 'None' }

/** The axis titles this page writes; shape only has no units. */
export const xTitleFor = (unit: LengthUnit, numbered = true) =>
  numbered ? `Internuclear distance (${LENGTH_UNIT_TEXT[unit]})` : 'Internuclear distance'
export const yTitleFor = (unit: Unit, numbered = true) => (numbered ? `Potential energy (${UNIT_TEXT[unit]})` : 'Potential energy')
const X_TITLES = [...LENGTH_UNITS.map((u) => xTitleFor(u)), xTitleFor('pm', false)]
const Y_TITLES = [...UNITS.map((u) => yTitleFor(u)), yTitleFor('kj-per-mol', false)]

/** One bond's fields, numbered from 1 in the address: name1, length1, energy1… */
function bond<N extends 1 | 2 | 3>(n: N, length: number, energy: number) {
  return {
    /** the bond's name as the key writes it; empty for "Bond 1" */
    [`name${n}`]: text(BOND_NAMES[n - 1], 40),
    /** its bond length, in pm whatever unit it's shown in */
    [`length${n}`]: number({ min: 10, max: 1000, fallback: length }),
    /** its bond energy, in kJ/mol */
    [`energy${n}`]: number({ min: 1, max: 2000, fallback: energy }),
  } as Record<`name${N}`, Field<string>> & Record<`length${N}` | `energy${N}`, Field<number>>
}

export const bondSettings = defineSettings(
  {
    /** how many bonds are drawn, 1 to 3 */
    count: number({ min: 1, max: MAX_BONDS, fallback: 1 }),
    ...bond(1, 150, 300),
    ...bond(2, 120, 500),
    ...bond(3, 200, 200),
    /** the bonds' names in the key; hidden, they're Bond A, B and C */
    names: bool(true),
    /** the unit lengths are typed and shown in */
    lengthUnit: choice(LENGTH_UNITS, 'pm'),
    unit: choice(UNITS, 'kj-per-mol'),
    axes: choice(AXES, 'numbered'),
    /** dashed lines from each minimum across to the energy axis and down to the distance axis */
    guides: bool(false),
    guideLabels: choice(GUIDE_LABELS, 'values'),
    /** a dot on each minimum */
    dots: bool(false),
    regions: choice(REGIONS, 'none'),
    color: bool(true),
    gridlines: choice(Object.keys(GRIDLINES) as Gridlines[], 'light'),
    ...gridFields({
      xFrom: '0', xTo: '450', xStep: '25', xEvery: 2,
      yFrom: '-325', yTo: '75', yStep: '25', yEvery: 2,
      title: '', titleMode: 'none',
      xTitle: xTitleFor('pm'), xTitleMode: 'text',
      yTitle: yTitleFor('kj-per-mol'), yTitleMode: 'text',
      xLabel: 'r', xLabelMode: 'none', yLabel: 'E', yLabelMode: 'none',
      xStartCap: 'none', xEndCap: 'none', yStartCap: 'none', yEndCap: 'none',
      minor: 0,
    }),
  },
  (s) => {
    // The axis titles follow the units, and lose them with the numbers, unless the teacher typed their own.
    const numbered = s.axes === 'numbered'
    const xTitle = X_TITLES.includes(s.xTitle) ? xTitleFor(s.lengthUnit, numbered) : s.xTitle
    const yTitle = Y_TITLES.includes(s.yTitle) ? yTitleFor(s.unit, numbered) : s.yTitle
    return { ...s, count: Math.round(s.count), xTitle, yTitle }
  },
)

export type BondSettings = typeof bondSettings.defaults

/** One bond as drawn: the name the teacher typed, its bond length (in pm, and in the unit shown) and its bond energy. */
export type Bond = { slot: Slot; name: string; pm: number; length: number; energy: number }

export const field = <K extends string>(name: K, i: Slot) => `${name}${i + 1}` as `${K}${1 | 2 | 3}`

/** The bond in a slot (0 to 2), whether drawn or not. */
export function bondIn(s: BondSettings, i: Slot): Bond {
  const pm = s[field('length', i)]
  return { slot: i, name: s[field('name', i)].trim() || `Bond ${i + 1}`, pm, length: fromPm(pm, s.lengthUnit), energy: s[field('energy', i)] }
}

/** The bonds drawn, first to last. */
export const drawnBonds = (s: BondSettings): Bond[] => SLOTS.slice(0, s.count).map((i) => bondIn(s, i))

/** Whether the names are hidden: only with more than one bond, where the setting is offered; one bond is always named. */
export const namesHidden = (s: Pick<BondSettings, 'names' | 'count'>) => !s.names && s.count > 1

/** What the figure calls a bond: its name, or Bond A, B or C when names are hidden. */
export const shownName = (s: BondSettings, i: Slot) => (namesHidden(s) ? `Bond ${String.fromCharCode(65 + i)}` : bondIn(s, i).name)

/** Whether "Repulsion" and "Attraction" are marked: on one curve only. */
export const regionsShown = (s: Pick<BondSettings, 'count' | 'regions'>) => s.count === 1 && s.regions !== 'none'
