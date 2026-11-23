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

  it('finds Dot-and-Cross Diagram the ways teachers ask for it', () => {
    for (const query of ['dot and cross', 'dot-and-cross', 'dot cross', 'ionic bonding', 'covalent bonding', 'electron arrangement', 'electron transfer', 'IGCSE'])
      expect(ids(query), query).toContain('dot-and-cross')
  })

  it('finds VSEPR Shapes the ways teachers ask for it', () => {
    for (const query of ['vsepr', 'molecular geometry', 'molecular shape', 'electron geometry', 'bond angle', 'ball and stick', 'wedge dash', 'trigonal pyramidal', 'seesaw'])
      expect(ids(query), query).toContain('vsepr-shapes')
  })

  it('finds Chromatography the ways teachers ask for it', () => {
    for (const query of ['chromatography', 'paper chromatography', 'chromatogram', 'rf value', 'solvent front', 'ink separation'])
      expect(ids(query), query).toContain('chromatography')
  })

  it('finds Electrochemical Cells the ways teachers ask for it', () => {
    for (const query of ['electrochemical cell', 'galvanic cell', 'voltaic cell', 'salt bridge', 'voltmeter', 'anode cathode', 'half-cell'])
      expect(ids(query), query).toContain('electrochemical-cells')
  })

  it('finds Equilibrium Graph the ways teachers ask for it', () => {
    for (const query of ['le chatelier', 'le châtelier’s principle', 'equilibrium graph', 'concentration vs time', 'haber', 'reversible reaction', 'Kc', 'ICE table', 'stress', 'shift'])
      expect(ids(query), query).toContain('equilibrium-graph')
  })

  it('finds Rate Law Graphs the ways teachers ask for it', () => {
    for (const query of ['rate law graphs', 'integrated rate law', 'kinetics', 'reaction kinetics', 'first order', 'zero order', 'second order', 'reaction order', 'rate constant', 'concentration vs time', 'ln[A]', '1/[A]', 'molarity', 'straight line'])
      expect(ids(query), query).toContain('rate-law-graphs')
  })

  it('keeps "lewis dot" for Lewis Structures', () => {
    expect(ids('lewis dot')).toEqual(['lewis-structures'])
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

  it('finds Phase Diagram the ways teachers ask for it', () => {
    for (const query of ['phase diagram', 'phase change diagram', 'triple point', 'critical point', 'sublimation', 'dry ice', 'supercritical fluid', 'normal boiling point', 'carbon dioxide'])
      expect(ids(query), query).toContain('phase-diagram')
    // Phase change still finds the heating curve too.
    expect(ids('phase change')).toContain('heating-cooling-curve')
  })

  it('finds Length Reading the ways teachers ask for it', () => {
    for (const query of ['ruler', 'length', 'measuring length', 'centimeter', 'millimeter', 'inches', 'metric ruler'])
      expect(ids(query), query).toContain('length-reading')
  })

  it('finds Bond Energy Curve the ways teachers ask for it', () => {
    for (const query of ['bond energy', 'bond length', 'bond energy curve', 'bond graph', 'internuclear distance', 'potential energy internuclear', 'leonard jones potential', 'lennard-jones', 'morse', 'covalent bond graph'])
      expect(ids(query), query).toContain('bond-energy-curve')
  })

  it('keeps bond words for Bond Energy Curve and reaction words for Potential Energy Diagram', () => {
    for (const query of ['bond energy', 'bond length', 'internuclear distance']) {
      expect(ids(query), query).toContain('bond-energy-curve')
      expect(ids(query), query).not.toContain('potential-energy-diagram')
    }
    for (const query of ['activation energy', 'reaction coordinate', 'catalyst', 'enthalpy']) {
      expect(ids(query), query).toContain('potential-energy-diagram')
      expect(ids(query), query).not.toContain('bond-energy-curve')
    }
    // Teachers use these words for both; the cards tell them apart.
    for (const query of ['potential energy', 'potential energy diagram'])
      expect(ids(query), query).toEqual(expect.arrayContaining(['potential-energy-diagram', 'bond-energy-curve']))
  })

  it('finds a generator by its path', () => {
    expect(findGenerator('/volume-by-displacement')?.name).toBe('Volume by Displacement')
  })
})
