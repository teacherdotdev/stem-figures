import { describe, expect, it } from 'vitest'
import { allShells, dotCrossSettings, layoutOf, readOnce } from './settings'

const d = dotCrossSettings.defaults
const fromQuery = (query: string) => dotCrossSettings.fromParams(new URLSearchParams(query))

describe('settings in the address', () => {
  it('are left out at their defaults', () => {
    expect(dotCrossSettings.toQuery(d)).toBe('')
    expect(d.formula).toBe('H2O')
  })

  it('travel intact', () => {
    const s = { ...d, formula: 'Mg 2+', shells: 'all' as const, layout: 'numbered' as const, swap: true, color: true, blank: true, charges: 'blank' as const, answerKey: true }
    expect(fromQuery(dotCrossSettings.toQuery(s))).toEqual(s)
  })

  it('ignore values they don’t take', () => {
    expect(fromQuery('shells=some&layout=grid&charges=maybe')).toEqual(d)
  })
})

describe('what the settings draw', () => {
  const at = (query: string) => {
    const s = fromQuery(query)
    return { s, r: readOnce(s.formula, s.which) }
  }

  it('lay out every ion up to three, and number bigger compounds', () => {
    for (const [formula, layout] of [['NaCl', 'every'], ['MgCl2', 'every'], ['Na2O', 'every'], ['AlF3', 'numbered'], ['Al2O3', 'numbered']]) {
      const { s, r } = at(`formula=${formula}`)
      expect(layoutOf(s, r), formula).toBe(layout)
    }
    const { s, r } = at('formula=MgCl2&layout=numbered')
    expect(layoutOf(s, r)).toBe('numbered')
  })

  it('keep outer shells and an atom’s shells apart', () => {
    const molecule = at('formula=H2O&atomShells=all')
    expect(allShells(molecule.s, molecule.r)).toBe(false)
    const atom = at('formula=Na')
    expect(allShells(atom.s, atom.r)).toBe(true)
    const outer = at('formula=Na&atomShells=outer')
    expect(allShells(outer.s, outer.r)).toBe(false)
  })
})
