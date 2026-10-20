import { describe, expect, it } from 'vitest'
import { answerLines, buildFigure, type DotCrossFigure } from './figure'
import { markOf } from './marks'
import { readSpecies } from './read'
import { MARK } from './shells'
import { dotCrossSettings, type DotCrossSettings } from './settings'

const fromQuery = (query: string) => dotCrossSettings.fromParams(new URLSearchParams(query))
const figure = (query: string) => buildFigure(fromQuery(query))
const marksIn = (f: DotCrossFigure, x: number, y: number, r: number) => f.marks.filter((m) => Math.hypot(m.x - x, m.y - y) <= r + 0.5)
const kinds = (f: DotCrossFigure, s: DotCrossSettings, ms = f.marks) => ms.map((m) => markOf(m.owner, s.swap)).sort().join(' ')

describe('ions', () => {
  it('draw a gained electron in the metal’s mark: crosses on Cl⁻ in NaCl', () => {
    const s = fromQuery('formula=NaCl')
    const f = buildFigure(s)
    const [na, cl] = f.symbols
    expect([na.text, cl.text]).toEqual(['Na', 'Cl'])
    expect(kinds(f, s, marksIn(f, cl.x, cl.y, 60))).toBe('cross dot dot dot dot dot dot dot')
    expect(kinds(f, s, marksIn(f, na.x, na.y, 60))).toBe(Array(8).fill('cross').join(' '))
  })

  it('give Mg²⁺ the full shell it’s left with: 8 crosses, or 2 and 8 with every shell', () => {
    const outer = fromQuery('formula=MgCl2')
    const f = buildFigure(outer)
    const mg = f.symbols.find((t) => t.text === 'Mg')!
    expect(kinds(f, outer, marksIn(f, mg.x, mg.y, 60))).toBe(Array(8).fill('cross').join(' '))
    const all = fromQuery('formula=MgCl2&shells=all')
    const g = buildFigure(all)
    const mg2 = g.symbols.find((t) => t.text === 'Mg')!
    const rings = g.circles.filter((c) => c.x === mg2.x && c.y === mg2.y)
    expect(rings.map((r) => marksIn(g, mg2.x, mg2.y, r.r).length)).toEqual([2, 10])
  })

  it('are each in brackets with its charge', () => {
    const f = figure('formula=MgCl2')
    expect(f.brackets.map((b) => b.charge?.text)).toEqual(['−', '2+', '−'])
    expect(figure('formula=Na%2B').brackets.map((b) => b.charge?.text)).toEqual(['+'])
    expect(figure('formula=Na').brackets).toEqual([])
  })

  it('keep their brackets with the charges blank or left off', () => {
    expect(figure('formula=MgCl2&charges=blank').brackets.map((b) => b.charge?.blank)).toEqual([true, true, true])
    const none = figure('formula=MgCl2&charges=none')
    expect(none.brackets).toHaveLength(3)
    expect(none.brackets.every((b) => !b.charge)).toBe(true)
  })

  it('face an anion’s gained electrons toward the metal ion beside it', () => {
    const s = fromQuery('formula=MgCl2')
    const f = buildFigure(s)
    const [left, mg, right] = f.symbols
    const crossOf = (t: { x: number; y: number }) => marksIn(f, t.x, t.y, 60).find((m) => markOf(m.owner, false) === 'cross')!
    expect(crossOf(left).x).toBeGreaterThan(left.x)
    expect(crossOf(right).x).toBeLessThan(right.x)
    expect(mg.x).toBeGreaterThan(left.x)
  })
})

describe('ionic layouts', () => {
  const boxesClear = (f: DotCrossFigure) => {
    for (const [i, a] of f.brackets.entries())
      for (const b of f.brackets.slice(i + 1)) {
        const apart = Math.abs(a.x - b.x) >= a.half + b.half || Math.abs(a.y - b.y) >= a.half + b.half
        expect(apart, `${a.x},${a.y} and ${b.x},${b.y}`).toBe(true)
      }
  }
  const inside = (f: DotCrossFigure) => {
    for (const b of f.brackets) {
      expect(b.x - b.half).toBeGreaterThanOrEqual(0)
      expect(b.x + b.half).toBeLessThanOrEqual(f.width)
      expect(b.y - b.half).toBeGreaterThanOrEqual(0)
      expect(b.y + b.half).toBeLessThanOrEqual(f.height)
    }
    for (const m of f.marks) {
      expect(m.x - MARK).toBeGreaterThanOrEqual(0)
      expect(m.x + MARK).toBeLessThanOrEqual(f.width)
    }
  }

  it('draw every ion of a 1:2 compound, the single ion in the middle', () => {
    const f = figure('formula=MgCl2')
    expect(f.layout).toBe('every')
    expect(f.symbols.map((t) => t.text)).toEqual(['Cl', 'Mg', 'Cl'])
    expect(figure('formula=Na2O').symbols.map((t) => t.text)).toEqual(['Na', 'O', 'Na'])
    boxesClear(f)
    inside(f)
  })

  it('number the ions past three, unless every ion is asked for', () => {
    const f = figure('formula=Al2O3')
    expect(f.layout).toBe('numbered')
    expect(f.symbols.map((t) => t.text)).toEqual(['Al', 'O'])
    expect(f.counts.map((t) => t.text)).toEqual(['2', '3'])
    boxesClear(f)
    inside(f)
    const every = figure('formula=Al2O3&layout=every')
    expect(every.symbols.map((t) => t.text)).toEqual(['O', 'Al', 'O', 'Al', 'O'])
    expect(every.counts).toEqual([])
    boxesClear(every)
    inside(every)
  })

  it('number a small compound when asked, leaving 1 unwritten', () => {
    const f = figure('formula=MgCl2&layout=numbered')
    expect(f.counts.map((t) => t.text)).toEqual(['2'])
    expect(f.counts[0].x).toBeLessThan(f.brackets[1].x - f.brackets[1].half)
  })

  it('put a third ion of three around one below the middle', () => {
    const f = figure('formula=AlF3&layout=every')
    expect(f.symbols.map((t) => t.text)).toEqual(['F', 'Al', 'F', 'F'])
    expect(f.symbols[3].x).toBeCloseTo(f.symbols[1].x)
    expect(f.symbols[3].y).toBeGreaterThan(f.symbols[1].y)
    boxesClear(f)
    inside(f)
  })
})

describe('an atom or ion on its own', () => {
  it('draws every shell to start with: Ca 2, 8, 8, 2', () => {
    const f = figure('formula=Ca')
    expect(f.allShells).toBe(true)
    expect(f.circles).toHaveLength(4)
    expect(f.circles.map((c) => marksIn(f, f.symbols[0].x, f.symbols[0].y, c.r).length)).toEqual([2, 10, 18, 20])
  })

  it('draws its outer shell only when asked, on its own setting', () => {
    const f = figure('formula=Ca&atomShells=outer')
    expect(f.circles).toHaveLength(1)
    expect(f.marks).toHaveLength(2)
    expect(figure('formula=Ca&shells=outer').allShells).toBe(true)
    expect(figure('formula=H2O&atomShells=all').allShells).toBe(false)
  })

  it('draws an anion’s gained electrons as crosses', () => {
    const s = fromQuery('formula=O+2-&atomShells=outer')
    expect(kinds(buildFigure(s), s)).toBe('cross cross dot dot dot dot dot dot')
  })
})

describe('the blank version', () => {
  it('draws no electrons, and its label doesn’t list them', () => {
    for (const formula of ['H2O', 'MgCl2', 'Al2O3', 'Ca', 'Cl-']) {
      const f = figure(`formula=${encodeURIComponent(formula)}&blank=1`)
      expect(f.marks, formula).toEqual([])
      expect(f.circles.length, formula).toBeGreaterThan(0)
      expect(f.label.replace('dot-and-cross diagram', ''), formula).not.toMatch(/dot|cross|lone pair|shared pair|open circle/)
    }
  })
})

describe('the answer key', () => {
  const lines = (formula: string) => answerLines(readSpecies(formula, ''))

  it('gives each atom’s bonding and lone pairs in a molecule', () => {
    expect(lines('H2O')).toEqual(['O: 2 bonding pairs, 2 lone pairs', 'Each H: 1 bonding pair, no lone pairs'])
    expect(lines('N2')).toEqual(['Each N: 3 bonding pairs, 1 lone pair'])
    expect(lines('CH3OH')).toEqual(['C: 4 bonding pairs, no lone pairs', 'Each H: 1 bonding pair, no lone pairs', 'O: 2 bonding pairs, 2 lone pairs'])
  })

  it('gives the electrons moved and each ion’s arrangement in an ionic compound', () => {
    expect(lines('MgCl2')).toEqual(['Mg loses 2 electrons, one to each Cl.', 'Mg²⁺ 2,8; Cl⁻ 2,8,8'])
    expect(lines('NaCl')).toEqual(['Na loses 1 electron to Cl.', 'Na⁺ 2,8; Cl⁻ 2,8,8'])
    expect(lines('Na2O')).toEqual(['Each Na loses 1 electron to O, which gains 2.', 'Na⁺ 2,8; O²⁻ 2,8'])
    expect(lines('Al2O3')).toEqual(['Each Al loses 3 electrons and each O gains 2.', 'Al³⁺ 2,8; O²⁻ 2,8'])
  })

  it('gives an atom’s or ion’s arrangement', () => {
    expect(lines('Ca')).toEqual(['Ca: 2,8,8,2'])
    expect(lines('Cl-')).toEqual(['Cl⁻: 2,8,8 (Cl gains 1 electron)'])
  })

  it('fits under the figure, and prints only when asked', () => {
    const f = figure('formula=Al2O3&answerKey=1')
    expect(f.answer).toHaveLength(2)
    expect(f.width).toBeGreaterThan(400)
    expect(figure('formula=Al2O3').answer).toEqual([])
  })
})

describe('the figure', () => {
  it('says why there’s nothing to draw', () => {
    const f = figure('formula=CO')
    expect(f.read.ok).toBe(false)
    expect(f.marks).toEqual([])
    expect(f.label).toBe('No dot-and-cross diagram')
  })

  it('names whose electrons are which for screen readers', () => {
    expect(figure('formula=H2O').label).toContain('O’s electrons are dots and H’s crosses')
    expect(figure('formula=H2O&swap=1').label).toContain('O’s electrons are crosses and H’s dots')
    expect(figure('formula=MgCl2').label).toContain('two Cl⁻ ions, each with 7 dots and 1 cross on its outer shell')
  })
})
