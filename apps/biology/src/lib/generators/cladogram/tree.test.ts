import { describe, expect, it } from 'vitest'
import { cladogramSettings } from './settings'
import { SETUPS } from './setups'
import {
  MAX_TAXA,
  applyEdit,
  clade,
  cladesOf,
  ladder,
  nodeAt,
  setText,
  taxaOf,
  taxon,
  tidyTree,
  type Clade,
} from './tree'

const names = (t: Clade) => taxaOf(t).map((x) => x.name)
const abc = () => clade('root', taxon('A'), clade('BC', taxon('B'), taxon('C')))

describe('tidyTree', () => {
  it('keeps a valid tree as it is', () => {
    expect(tidyTree(abc())).toEqual(abc())
  })

  it('rejects anything with fewer than two taxa', () => {
    expect(tidyTree(null)).toBeUndefined()
    expect(tidyTree('((A,B),C)')).toBeUndefined()
    expect(tidyTree({ trait: '', children: [{ name: 'A' }] })).toBeUndefined()
    expect(tidyTree({ name: 'A' })).toBeUndefined()
  })

  it('drops unusable nodes and collapses clades left with one member', () => {
    const t = tidyTree({ trait: 'x', children: [{ name: 'A' }, 7, { trait: 'y', children: [{ name: 'B' }, 'junk'] }, { name: 'C' }] })
    expect(t).toEqual(clade('x', taxon('A'), taxon('B', 'y'), taxon('C')))
  })

  it('adds a trait input to a taxon, kept even while empty', () => {
    const t = applyEdit(abc(), 'addTrait', [0])
    expect(t.children[0]).toEqual(taxon('A', ''))
    expect(tidyTree(JSON.parse(JSON.stringify(t)))).toEqual(t)
  })

  it('passes a trait to a lone member clade with none', () => {
    const t = tidyTree({ trait: 'outer', children: [{ trait: '', children: [{ name: 'A' }, { name: 'B' }] }] })
    expect(t).toEqual(clade('outer', taxon('A'), taxon('B')))
  })

  it('caps the taxa and the length of labels', () => {
    const many = clade('', ...Array.from({ length: 30 }, (_, i) => taxon(`T${i}`)))
    expect(taxaOf(tidyTree(many)!)).toHaveLength(MAX_TAXA)
    expect(tidyTree(clade('x'.repeat(99), taxon('A'), taxon('B')))!.trait).toHaveLength(40)
  })

  it('reads every setup and the defaults back from the address unchanged', () => {
    for (const setup of SETUPS) {
      expect(tidyTree(JSON.parse(JSON.stringify(setup.tree))), setup.id).toEqual(setup.tree)
      const s = { ...cladogramSettings.defaults, tree: setup.tree, style: 'rectangular' as const }
      expect(cladogramSettings.fromParams(new URLSearchParams(cladogramSettings.toQuery(s)))).toEqual(s)
    }
  })
})

describe('ladder', () => {
  it('builds a comb, each trait shared by its taxon and every one after', () => {
    expect(ladder(['A', 'B', 'C'], ['root', 'b'])).toEqual(clade('root', taxon('A'), clade('b', taxon('B'), taxon('C'))))
    expect(ladder(['A', 'B', 'C'], ['root', 'b', 'c'])).toEqual(clade('root', taxon('A'), clade('b', taxon('B'), taxon('C', 'c'))))
  })

  it('gives every setup trait a place', () => {
    expect(SETUPS[0].tree).toMatchObject({ trait: 'Notochord' })
    expect(taxaOf(SETUPS[0].tree).at(-1)).toEqual(taxon('Mouse', 'Hair'))
    expect(taxaOf(SETUPS[1].tree).at(-1)).toEqual(taxon('Flowering plants', 'Flowers'))
  })
})

describe('editing', () => {
  it('adds a taxon to a clade', () => {
    expect(names(applyEdit(abc(), 'addTaxon', [1]))).toEqual(['A', 'B', 'C', ''])
  })

  it('pairs a taxon with a new one', () => {
    const t = applyEdit(abc(), 'pair', [0])
    expect(t.children[0]).toEqual(clade('', taxon('A'), taxon('')))
  })

  it('removes a node and collapses what is left, its group’s trait passing to the one left', () => {
    const t = applyEdit(abc(), 'remove', [1, 0])
    expect(t).toEqual(clade('root', taxon('A'), taxon('C', 'BC')))
  })

  it('never leaves fewer than two taxa or removes the root', () => {
    const two = clade('', taxon('A'), taxon('B'))
    expect(applyEdit(two, 'remove', [0])).toEqual(two)
    expect(applyEdit(abc(), 'remove', [])).toEqual(abc())
  })

  it('moves a node among its siblings, and not past the ends', () => {
    expect(names(applyEdit(abc(), 'down', [0]))).toEqual(['B', 'C', 'A'])
    expect(names(applyEdit(abc(), 'up', [1, 1]))).toEqual(['A', 'C', 'B'])
    expect(applyEdit(abc(), 'up', [0])).toEqual(abc())
  })

  it('ungroups a clade into its parent', () => {
    expect(applyEdit(abc(), 'ungroup', [1])).toEqual(clade('root', taxon('A'), taxon('B'), taxon('C')))
  })

  it('stops adding at the most taxa', () => {
    const full = clade('', ...Array.from({ length: MAX_TAXA }, (_, i) => taxon(`T${i}`)))
    expect(applyEdit(full, 'addTaxon', [])).toEqual(full)
    expect(applyEdit(full, 'pair', [0])).toEqual(full)
  })

  it('changes a name or a trait without touching the original', () => {
    const t = abc()
    expect(nodeAt(setText(t, [1, 0], 'name', 'Bee'), [1, 0])).toEqual(taxon('Bee'))
    expect(nodeAt(setText(t, [1, 0], 'trait', 'wings'), [1, 0])).toEqual(taxon('B', 'wings'))
    expect(setText(t, [1], 'trait', 'new').children[1]).toMatchObject({ trait: 'new' })
    expect(setText(t, [1], 'name', 'x')).toEqual(t)
    expect(t).toEqual(abc())
  })

  it('lists clades root first, each before those inside it', () => {
    expect(cladesOf(SETUPS[3].tree).map((c) => c.trait)).toEqual(['', '1', '2', '3', '4'])
  })
})
