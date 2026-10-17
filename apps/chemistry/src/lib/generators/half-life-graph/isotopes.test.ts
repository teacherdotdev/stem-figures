import { describe, expect, it } from 'vitest'
import { ISOTOPES, convert, timeText } from './isotopes'

// The cited table (NuDat 3, rounded as textbooks give them; carbon-14 at the
// textbook 5,730 years), with each stable daughter, or none.
const TABLE: [string, number, string, string | undefined][] = [
  ['Carbon-14', 5730, 'y', 'Nitrogen-14'],
  ['Hydrogen-3', 12.3, 'y', 'Helium-3'],
  ['Fluorine-18', 110, 'min', 'Oxygen-18'],
  ['Phosphorus-32', 14.3, 'd', 'Sulfur-32'],
  ['Cobalt-60', 5.27, 'y', 'Nickel-60'],
  ['Strontium-90', 28.8, 'y', undefined],
  ['Technetium-99m', 6.01, 'h', 'Technetium-99'],
  ['Iodine-131', 8.02, 'd', 'Xenon-131'],
  ['Cesium-137', 30.1, 'y', 'Barium-137'],
  ['Radon-222', 3.82, 'd', undefined],
  ['Radium-226', 1600, 'y', undefined],
  ['Polonium-210', 138, 'd', 'Lead-206'],
  ['Uranium-238', 4.47, 'Gy', 'Lead-206'],
  ['Potassium-40', 1.25, 'Gy', undefined],
  ['Plutonium-239', 24100, 'y', 'Uranium-235'],
  ['Americium-241', 432, 'y', 'Neptunium-237'],
  ['Isotope X', 10, 'y', 'Isotope Y'],
]

describe('the isotope setups', () => {
  it('have the cited half-lives and stable daughters, and nothing else', () => {
    expect(ISOTOPES.map((x) => [x.name, x.half, x.unit, x.daughter])).toEqual(TABLE)
  })

  it('give no daughter where it is radioactive', () => {
    for (const id of ['sr90', 'rn222', 'ra226', 'k40']) expect(ISOTOPES.find((x) => x.id === id)!.daughter, id).toBeUndefined()
  })

  it('each have their own id', () => {
    expect(new Set(ISOTOPES.map((x) => x.id)).size).toBe(ISOTOPES.length)
  })
})

describe('times', () => {
  it('convert between units, a year being 365.25 days', () => {
    expect(convert(1, 'y', 'd')).toBeCloseTo(365.25, 9)
    expect(convert(110, 'min', 'h')).toBeCloseTo(110 / 60, 9)
    expect(convert(4.47, 'Gy', 'y')).toBeCloseTo(4.47e9, 0)
    expect(convert(5730, 'y', 'y')).toBe(5730)
  })

  it('are written with thousands separators and their unit', () => {
    expect(timeText(5730, 'y')).toBe('5,730 years')
    expect(timeText(1, 'd')).toBe('1 day')
    expect(timeText(3 * 4.47, 'Gy')).toBe('13.41 billion years')
    expect(timeText(17190, 'y')).toBe('17,190 years')
  })
})
