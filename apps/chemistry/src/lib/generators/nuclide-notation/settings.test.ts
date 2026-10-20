import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import { answerLines, buildFigure, figureLabel, partsOf } from './figure'
import NuclideFigure from './NuclideFigure.svelte'
import { PARTICLES, PARTICLE_INFO } from './particles'
import { countsOf, fromCounts, nuclideSettings, unnaturalNote, withElement, withNumbers, type NuclideSettings } from './settings'

const d = nuclideSettings.defaults
const fromQuery = (query: string) => nuclideSettings.fromParams(new URLSearchParams(query))
/** The figure as it's downloaded: the SVG, with its label for screen readers. */
const drawn = (s: NuclideSettings) => render(NuclideFigure, { props: { settings: s } }).body
/** Every piece of text the figure draws, in order. */
const texts = (s: NuclideSettings) => [...drawn(s).matchAll(/<(?:text|tspan)[^>]*>([^<]*)/g)].map((m) => m[1]).filter(Boolean)

describe('settings in the address', () => {
  it('are left out at their defaults, and draw carbon-12', () => {
    expect(nuclideSettings.toQuery(d)).toBe('')
    expect(partsOf(d)).toEqual({ mass: { text: '12' }, z: { text: '6' }, symbol: { text: 'C' }, charge: null })
  })

  it('travel intact', () => {
    const s = { ...d, z: 17, mass: 37, charge: -1, zPart: 'blank' as const, notation: 'both' as const, font: 'serif' as const }
    expect(fromQuery(nuclideSettings.toQuery(s))).toEqual(s)
  })

  it('never give fewer than 0 neutrons or electrons, nor an element past oganesson', () => {
    expect(fromQuery('z=17&mass=5')).toMatchObject({ z: 17, mass: 17 })
    expect(fromQuery('z=1&charge=3')).toMatchObject({ z: 1, charge: 1 })
    expect(fromQuery('z=150&mass=300')).toMatchObject({ z: 118, mass: 300 })
    expect(fromQuery('kind=custom&z=150&mass=300')).toMatchObject({ z: 150, mass: 300 })
    expect(fromQuery('z=6.4&mass=13.6').mass).toBe(14)
  })

  it('write a particle with one of its own symbols', () => {
    expect(fromQuery('kind=particle&particle=alpha&particleSymbol=alpha').particleSymbol).toBe('alpha')
    expect(fromQuery('kind=particle&particle=neutron&particleSymbol=alpha').particleSymbol).toBe('n')
  })
})

describe('protons, neutrons and electrons', () => {
  it('are worked out from the atomic number, mass number and charge', () => {
    expect(countsOf({ z: 17, mass: 37, charge: -1 })).toEqual({ protons: 17, neutrons: 20, electrons: 18 })
    expect(countsOf({ z: 26, mass: 56, charge: 3 })).toEqual({ protons: 26, neutrons: 30, electrons: 23 })
  })

  it('set them, and back again', () => {
    expect(fromCounts({ protons: 17, neutrons: 20, electrons: 18 })).toEqual({ z: 17, mass: 37, charge: -1 })
    for (const numbers of [{ z: 6, mass: 14, charge: 0 }, { z: 92, mass: 235, charge: 4 }, { z: 8, mass: 16, charge: -2 }]) {
      expect(fromCounts(countsOf(numbers))).toEqual(numbers)
    }
  })
})

describe('a number that can’t be', () => {
  it('a mass number below the atomic number gives a message and changes nothing', () => {
    const s = { ...d, z: 17, mass: 35 }
    const { settings, problem } = withNumbers(s, { mass: 12 })
    expect(problem).toMatch(/below the atomic number \(17\).*fewer than 0 neutrons/)
    expect(settings).toBe(s)
    expect(buildFigure(settings)).toEqual(buildFigure(s))
  })

  it('more protons than the mass number allows is refused the same way', () => {
    const s = { ...d, kind: 'custom' as const, z: 6, mass: 14 }
    expect(withNumbers(s, { z: 15 }).problem).toMatch(/fewer than 0 neutrons/)
    expect(withNumbers(s, fromCounts({ ...countsOf(s), electrons: -1 })).problem).toMatch(/fewer than 0 electrons/)
  })

  it('a number that can be is taken', () => {
    expect(withNumbers(d, { mass: 14 })).toEqual({ settings: { ...d, mass: 14 }, problem: null })
  })
})

describe('picking an element', () => {
  it('starts at its usual mass number', () => {
    expect(withElement(d, 17)).toMatchObject({ z: 17, mass: 35 })
    expect(withElement(d, 92)).toMatchObject({ z: 92, mass: 238 })
  })

  it('notes a mass number that isn’t a natural isotope, and still draws it', () => {
    const c14 = { ...d, mass: 14 }
    expect(unnaturalNote(c14)).toBe('Carbon’s naturally abundant isotopes are C-12 and C-13. C-14 is drawn all the same.')
    expect(partsOf(c14).mass).toEqual({ text: '14' })
    expect(unnaturalNote({ ...d, mass: 13 })).toBeNull()
    expect(unnaturalNote({ ...d, z: 43, mass: 99 })).toBeNull() // no data for technetium
  })
})

describe('the figure', () => {
  it('writes a charge as chemists do', () => {
    const charge = (n: number) => (partsOf({ ...d, z: 26, mass: 56, charge: n }).charge as { text: string } | null)?.text
    expect([charge(2), charge(1), charge(-1), charge(-3), charge(0)]).toEqual(['2+', '+', '−', '3−', undefined])
  })

  it('draws each particle with its own numbers', () => {
    const numbers = (particle: string) => {
      const p = partsOf(fromQuery(`kind=particle&particle=${particle}`))
      return [p.mass, p.z, p.symbol].map((part) => (part as { text: string }).text)
    }
    expect(numbers('alpha')).toEqual(['4', '2', 'He'])
    expect(numbers('beta')).toEqual(['0', '−1', 'e'])
    expect(numbers('positron')).toEqual(['0', '+1', 'e'])
    expect(numbers('neutron')).toEqual(['1', '0', 'n'])
    expect(numbers('proton')).toEqual(['1', '1', 'p'])
    expect(numbers('gamma')).toEqual(['0', '0', 'γ'])
    expect(texts(fromQuery('kind=particle&particle=beta&particleSymbol=beta'))).toEqual(['0', '−1', 'β'])
    for (const p of PARTICLES) expect(partsOf({ ...d, kind: 'particle', particle: p, chargePart: 'shown' }).charge, p).toBeNull()
  })

  it('draws the charge right after the symbol', () => {
    const svg = drawn(fromQuery('z=17&mass=37&charge=-1'))
    expect(svg).toMatch(/>Cl<tspan[^>]*>−<\/tspan>/)
  })

  it('never shows a blank’s value, in the figure or its label, only in the answer key', () => {
    const cases: [string, string][] = [
      ['z=92&mass=235&zPart=blank', '92'],
      ['z=92&mass=235&massPart=blank', '235'],
      ['z=92&mass=235&symbolPart=blank&notation=both', 'U'],
      ['z=17&mass=37&charge=-1&chargePart=blank', '−'],
      ['z=8&mass=18&notation=hyphen&massPart=blank', '18'],
      ['z=8&mass=18&notation=hyphen&symbolPart=blank', 'oxygen'],
    ]
    for (const [query, value] of cases) {
      const s = fromQuery(query)
      expect(texts(s), query).not.toContain(value)
      expect(texts(s).join(' '), query).not.toContain(value === 'U' ? 'uranium' : value)
      expect(figureLabel(s), query).not.toMatch(new RegExp(`(^|[^0-9])${value}([^0-9]|$)`))
      expect(drawn(s), query).toContain('<rect')
      expect(answerLines(s).at(-1), query).toMatch(/^Blank: /)
      expect(answerLines(s).at(-1), query).toContain(value === '−' ? '1−' : value)
    }
  })

  it('draws blanks as lines when asked', () => {
    const svg = drawn(fromQuery('z=92&mass=235&zPart=blank&blank=line'))
    expect(svg).toContain('<line')
    expect(svg.match(/<rect/g)).toHaveLength(1) // only the white sheet
  })

  it('leaves a position off entirely', () => {
    const s = fromQuery('z=6&mass=14&zPart=off')
    expect(texts(s)).toEqual(['14', 'C'])
    expect(figureLabel(s)).toBe('Nuclide notation: symbol C, mass number 14')
  })

  it('writes hyphen notation alone, or under the symbol', () => {
    expect(texts(fromQuery('mass=14&notation=hyphen'))).toEqual(['carbon-14'])
    expect(texts(fromQuery('mass=14&notation=hyphen&hyphenName=symbol'))).toEqual(['C-14'])
    expect(texts(fromQuery('mass=14&notation=both'))).toEqual(['14', '6', 'C', 'carbon-14'])
    // a particle has no hyphen notation, so its symbol is drawn
    expect(texts(fromQuery('kind=particle&notation=hyphen'))).toEqual(['4', '2', 'He'])
  })

  it('widens to fit the answer key, keeping the symbol centered', () => {
    const plain = buildFigure(fromQuery('z=17&mass=37&charge=-1'))
    const keyed = buildFigure(fromQuery('z=17&mass=37&charge=-1&answerKey=1'))
    expect(keyed.width).toBeGreaterThan(plain.width)
    expect(keyed.nuclide!.x * 2 + keyed.nuclide!.layout.width).toBeCloseTo(keyed.width)
  })

  it('names its font', () => {
    expect(drawn(fromQuery('font=serif'))).toContain('Times New Roman')
  })
})

describe('the answer key', () => {
  it('names the nuclide and counts its particles', () => {
    expect(answerLines(fromQuery('z=17&mass=37&charge=-1'))).toEqual(['Chlorine-37 ion, Cl⁻', '17 protons, 20 neutrons, 18 electrons'])
    expect(answerLines(fromQuery('mass=14'))).toEqual(['Carbon-14 atom', '6 protons, 8 neutrons, 6 electrons'])
    expect(answerLines(fromQuery('z=1&mass=1&charge=1'))).toEqual(['Hydrogen-1 ion, H⁺', '1 proton, 0 neutrons, 0 electrons'])
  })

  it('says which element your own symbol is', () => {
    expect(answerLines(fromQuery('kind=custom&z=34&mass=79&charge=-2'))[0]).toBe('X is selenium-79 ion, Se²⁻')
    expect(answerLines(fromQuery('kind=custom&symbol=Q&z=150&mass=290'))[0]).toBe('Q-290')
  })

  it('describes a particle', () => {
    expect(answerLines(fromQuery('kind=particle'))).toEqual(['Alpha particle, a helium-4 nucleus', 'Mass number 4, atomic number (charge) 2'])
    expect(answerLines(fromQuery('kind=particle&particle=beta'))[1]).toBe('Mass number 0, atomic number (charge) −1')
    for (const p of PARTICLES) expect(answerLines(fromQuery(`kind=particle&particle=${p}`))[0]).toContain(PARTICLE_INFO[p].name)
  })
})
