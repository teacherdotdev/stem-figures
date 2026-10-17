import { describe, expect, it } from 'vitest'
import { findGenerator, searchGenerators } from './index'

const ids = (query: string) => searchGenerators(query).map((g) => g.id)

describe('searching the directory', () => {
  it('finds Volume by Displacement the ways teachers ask for it', () => {
    for (const query of ['water displacement', 'displacement', 'marble', 'rock', 'object volume'])
      expect(ids(query)).toContain('volume-by-displacement')
  })

  it('finds the volume generators in cm³ as well as mL', () => {
    for (const query of ['cm3', 'cm³', 'cubic centimeter', 'cubic centimetre'])
      expect(ids(query), query).toEqual(expect.arrayContaining(['volume-reading', 'volume-by-displacement']))
  })

  it('finds Orbital Diagram the ways teachers ask for it', () => {
    for (const query of ['electron configuration', 'orbital notation', 'box diagram', 'aufbau', 'hund', 'pauli', 'noble gas'])
      expect(ids(query)).toContain('orbital-diagram')
  })

  it('matches word starts, so "grad cyl" finds the graduated cylinder generators', () => {
    expect(ids('grad cyl')).toEqual(expect.arrayContaining(['volume-reading', 'volume-by-displacement']))
  })

  it('finds Bohr Model the ways teachers ask for it', () => {
    for (const query of ['bohr', 'atomic model', 'electron shell', 'proton', 'neutron', 'energy level'])
      expect(ids(query)).toContain('bohr-model')
  })

  it('finds Nuclide Notation the ways teachers ask for it', () => {
    for (const query of ['nuclide', 'isotope notation', 'nuclear notation', 'atomic notation', 'isotope symbol', 'AZX', 'alpha particle', 'mass number', 'hyphen notation'])
      expect(ids(query), query).toContain('nuclide-notation')
  })

  it('finds Lewis Structures the ways teachers ask for it', () => {
    for (const query of ['lewis dot', 'electron dot', 'lone pair', 'covalent', 'resonance', 'formal charge'])
      expect(ids(query), query).toContain('lewis-structures')
  })

  it('finds Gas Syringe the ways teachers ask for it', () => {
    for (const query of ['gas syringe', 'syringe', 'plunger', 'gas collection', 'rate of reaction', 'cm3'])
      expect(ids(query), query).toContain('gas-syringe')
  })

  it('finds Titration Curve the ways teachers ask for it', () => {
    for (const query of ['titration curve', 'titration', 'equivalence point', 'half equivalence', 'pKa', 'weak acid', 'buffer'])
      expect(ids(query), query).toContain('titration-curve')
  })

  it('finds Heating and Cooling Curve the ways teachers ask for it', () => {
    for (const query of ['heating curve', 'cooling curve', 'phase change', 'melting point', 'boiling point', 'plateau', 'supercooling', 'ethanol'])
      expect(ids(query), query).toContain('heating-cooling-curve')
  })

  it('finds Length Reading the ways teachers ask for it', () => {
    for (const query of ['ruler', 'length', 'measuring length', 'centimeter', 'millimeter', 'inches', 'metric ruler'])
      expect(ids(query), query).toContain('length-reading')
  })

  it('finds a generator by its path', () => {
    expect(findGenerator('/volume-by-displacement')?.name).toBe('Volume by Displacement')
  })
})
