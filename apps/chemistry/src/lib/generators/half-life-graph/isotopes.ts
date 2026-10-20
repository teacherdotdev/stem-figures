// The isotope setups Half-Life Graph offers: each one's half-life, how it
// decays and what it decays to. Half-lives are from the NNDC's NuDat 3
// (https://www.nndc.bnl.gov/nudat3/), rounded to three significant figures
// as textbooks give them, except carbon-14's:
//
// - Carbon-14: NuDat 3 gives 5,700 ± 30 years, but nearly every textbook and
//   exam board uses 5,730 (the Cambridge half-life), so this does too.
//
// A daughter is named only where it's stable, or lives so much longer than
// its parent that it counts as stable on the graph (technetium-99,
// uranium-235 and neptunium-237, at hundreds of thousands of years or more).
// Uranium-238 reaches lead-206 through a chain whose steps are all far
// shorter than its own half-life, so it's drawn as going straight there.
// Strontium-90, radon-222 and radium-226 decay to radioactive daughters, and
// potassium-40 to two (argon-40 and calcium-40), so none gets a daughter
// curve.

/** The units a half-life is given in, shortest first. */
export const UNITS = ['s', 'min', 'h', 'd', 'y', 'ky', 'Gy'] as const
export type Unit = (typeof UNITS)[number]

/** Each unit as written on the figure and in the answer key, one and many. */
export const UNIT_NAMES: Record<Unit, { one: string; many: string }> = {
  s: { one: 'second', many: 'seconds' },
  min: { one: 'minute', many: 'minutes' },
  h: { one: 'hour', many: 'hours' },
  d: { one: 'day', many: 'days' },
  y: { one: 'year', many: 'years' },
  ky: { one: 'thousand years', many: 'thousand years' },
  Gy: { one: 'billion years', many: 'billion years' },
}

const YEAR = 365.25 * 24 * 3600
/** Each unit in seconds, a year being 365.25 days. */
export const SECONDS: Record<Unit, number> = { s: 1, min: 60, h: 3600, d: 86400, y: YEAR, ky: 1e3 * YEAR, Gy: 1e9 * YEAR }

/** A time in one unit, in another. */
export const convert = (t: number, from: Unit, to: Unit) => (from === to ? t : (t * SECONDS[from]) / SECONDS[to])

export type IsotopeId =
  | 'c14' | 'h3' | 'f18' | 'p32' | 'co60' | 'sr90' | 'tc99m' | 'i131'
  | 'cs137' | 'rn222' | 'ra226' | 'po210' | 'u238' | 'k40' | 'pu239' | 'am241' | 'x'

export type Isotope = {
  id: IsotopeId
  /** as in a sentence's start: "Carbon-14" */
  name: string
  half: number
  unit: Unit
  /** how it decays, as written in the answer key */
  mode: string
  /** its stable daughter, or none when the daughter is radioactive */
  daughter?: string
}

export const ISOTOPES: Isotope[] = [
  { id: 'c14', name: 'Carbon-14', half: 5730, unit: 'y', mode: 'beta decay', daughter: 'Nitrogen-14' },
  { id: 'h3', name: 'Hydrogen-3', half: 12.3, unit: 'y', mode: 'beta decay', daughter: 'Helium-3' },
  { id: 'f18', name: 'Fluorine-18', half: 110, unit: 'min', mode: 'positron emission', daughter: 'Oxygen-18' },
  { id: 'p32', name: 'Phosphorus-32', half: 14.3, unit: 'd', mode: 'beta decay', daughter: 'Sulfur-32' },
  { id: 'co60', name: 'Cobalt-60', half: 5.27, unit: 'y', mode: 'beta decay', daughter: 'Nickel-60' },
  { id: 'sr90', name: 'Strontium-90', half: 28.8, unit: 'y', mode: 'beta decay' },
  { id: 'tc99m', name: 'Technetium-99m', half: 6.01, unit: 'h', mode: 'gamma emission', daughter: 'Technetium-99' },
  { id: 'i131', name: 'Iodine-131', half: 8.02, unit: 'd', mode: 'beta decay', daughter: 'Xenon-131' },
  { id: 'cs137', name: 'Cesium-137', half: 30.1, unit: 'y', mode: 'beta decay', daughter: 'Barium-137' },
  { id: 'rn222', name: 'Radon-222', half: 3.82, unit: 'd', mode: 'alpha decay' },
  { id: 'ra226', name: 'Radium-226', half: 1600, unit: 'y', mode: 'alpha decay' },
  { id: 'po210', name: 'Polonium-210', half: 138, unit: 'd', mode: 'alpha decay', daughter: 'Lead-206' },
  { id: 'u238', name: 'Uranium-238', half: 4.47, unit: 'Gy', mode: 'alpha decay', daughter: 'Lead-206' },
  { id: 'k40', name: 'Potassium-40', half: 1.25, unit: 'Gy', mode: 'beta decay and electron capture' },
  { id: 'pu239', name: 'Plutonium-239', half: 24100, unit: 'y', mode: 'alpha decay', daughter: 'Uranium-235' },
  { id: 'am241', name: 'Americium-241', half: 432, unit: 'y', mode: 'alpha decay', daughter: 'Neptunium-237' },
  // Made up, with round numbers, for worksheets.
  { id: 'x', name: 'Isotope X', half: 10, unit: 'y', mode: 'beta decay', daughter: 'Isotope Y' },
]

export const ISOTOPE_IDS = ISOTOPES.map((x) => x.id)

export const isotopeOf = (id: IsotopeId) => ISOTOPES.find((x) => x.id === id)!

/** "5,730 years", "1 day", "4.47 billion years". */
export function timeText(t: number, unit: Unit) {
  const v = Number(t.toPrecision(4))
  const n = v.toLocaleString('en-US', { maximumFractionDigits: 10 })
  return `${n} ${v === 1 ? UNIT_NAMES[unit].one : UNIT_NAMES[unit].many}`
}
