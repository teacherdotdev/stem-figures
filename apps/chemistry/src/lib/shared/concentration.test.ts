import { describe, expect, it } from 'vitest'
import { placer } from '$shared/graph/labels'
import {
  CONC_UNITS,
  SPECIES_DASHES,
  TIME_UNITS,
  TIME_UNIT_NAMES,
  concentrationOf,
  concentrationTitle,
  formulaMarkup,
  formulaText,
  placeSpeciesLabel,
  timeTitle,
} from './concentration'

describe('a species’ formula', () => {
  it('lowers the digits after a letter or a bracket', () => {
    expect(formulaMarkup('N2O5')).toBe('N_2O_5')
    expect(formulaMarkup('C6H12O6')).toBe('C_6H_{12}O_6')
    expect(formulaMarkup('Ca(OH)2')).toBe('Ca(OH)_2')
    expect(formulaText('N2O5')).toBe('N₂O₅')
    expect(formulaText('C6H12O6')).toBe('C₆H₁₂O₆')
  })

  it('leaves a number in front, and a name with no digits, as they are', () => {
    expect(formulaMarkup('2NO2')).toBe('2NO_2')
    expect(formulaMarkup(' A ')).toBe('A')
  })

  it('leaves a formula already written with _ or ^ as typed', () => {
    expect(formulaMarkup('Fe^{3+}')).toBe('Fe^{3+}')
    expect(formulaText('Fe^{3+}')).toBe('Fe³⁺')
    expect(formulaText('FeSCN^{2+}')).toBe('FeSCN²⁺')
  })

  it('raises a typed charge at the end, with its digit, instead of lowering it', () => {
    expect(formulaText('Fe3+')).toBe('Fe³⁺')
    expect(formulaText('O2-')).toBe('O²⁻')
    expect(formulaText('Cu2+')).toBe('Cu²⁺')
    expect(formulaText('SO42-')).toBe('SO₄²⁻')
    expect(formulaText('Cr2O72-')).toBe('Cr₂O₇²⁻')
    expect(formulaText('Hg22+')).toBe('Hg₂²⁺')
    expect(formulaText('NH4+')).toBe('NH₄⁺')
    expect(formulaText('MnO4-')).toBe('MnO₄⁻')
    expect(formulaText('H3O+')).toBe('H₃O⁺')
    expect(formulaText('Na+')).toBe('Na⁺')
    expect(formulaText('Cl−')).toBe('Cl⁻')
    expect(concentrationOf('Fe3+')).toBe('[Fe³⁺]')
    // Not a charge: a sign alone, or one in the middle.
    expect(formulaText('+')).toBe('+')
    expect(formulaText('A+B')).toBe('A+B')
  })
})

describe('axis titles', () => {
  it('names the species in brackets, with the unit', () => {
    expect(concentrationOf('N2O5')).toBe('[N₂O₅]')
    expect(concentrationTitle('M', 'N2O5')).toBe('[N₂O₅] (M)')
    expect(concentrationTitle('mol/L', 'A')).toBe('[A] (mol/L)')
    expect(concentrationTitle('mol dm⁻³', 'A')).toBe('[A] (mol dm⁻³)')
  })

  it('says Concentration for several species, in mol/L unless told', () => {
    expect(concentrationTitle()).toBe('Concentration (mol/L)')
    expect(concentrationTitle('M', ' ')).toBe('Concentration (M)')
  })

  it('writes the time unit', () => {
    expect(TIME_UNITS.map(timeTitle)).toEqual(['Time (s)', 'Time (min)', 'Time (h)'])
    expect(TIME_UNIT_NAMES.min).toEqual({ one: 'minute', many: 'minutes' })
    expect(CONC_UNITS).toEqual(['M', 'mol/L', 'mol dm⁻³'])
  })
})

describe('species’ lines', () => {
  const bounds = { x0: 0, y0: 0, x1: 400, y1: 300 }
  const flat = (y: number) => Array.from({ length: 21 }, (_, k) => ({ x: 100 + k * 10, y }))

  it('are solid, dashed and dotted', () => {
    expect(SPECIES_DASHES).toEqual([undefined, '12 7', '3 5'])
  })

  it('have their formulas beside them, digits lowered, off every line and each other', () => {
    const place = placer(bounds)
    const lines = [flat(100), flat(130)]
    for (const line of lines) place.line(line)
    const a = placeSpeciesLabel(place, lines[0], 'N2O4', 16)!
    const b = placeSpeciesLabel(place, lines[1], 'NO2', 16)!
    expect(a.text).toBe('N₂O₄')
    expect(a.spans.map((s) => s.text)).toEqual(['N', '2', 'O', '4'])
    expect(a.spans[1].size).toBeLessThan(16)
    expect(a.spans[1].dy).toBeGreaterThan(0)
    for (const label of [a, b]) {
      expect(label.box.x0).toBeGreaterThanOrEqual(bounds.x0)
      expect(label.box.x1).toBeLessThanOrEqual(bounds.x1)
      for (const y of [100, 130]) expect(label.box.y0 > y || label.box.y1 < y).toBe(true)
    }
    expect(a.box.y1 < b.box.y0 || b.box.y1 < a.box.y0 || a.box.x1 < b.box.x0 || b.box.x1 < a.box.x0).toBe(true)
  })

  it('have no label with no line or no name', () => {
    const place = placer(bounds)
    expect(placeSpeciesLabel(place, [], 'A', 16)).toBeNull()
    expect(placeSpeciesLabel(place, flat(100), ' ', 16)).toBeNull()
  })
})
