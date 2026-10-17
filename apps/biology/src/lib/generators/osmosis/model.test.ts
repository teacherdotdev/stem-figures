import { describe, expect, it } from 'vitest'
import { THREE_FACTORS, osmotic, outcomeOf, panelsOf, soluteFlow, threeOrder, tonicityOf, waterFlow } from './model'
import { osmosisSettings } from './settings'

const settingsOf = (query: string) => osmosisSettings.fromParams(new URLSearchParams(query))
const solute = (inside: number, outside: number, cross = false) => ({ inside, outside, cross })

describe('tonicity', () => {
  it('is worked out from the solutes that can’t cross only', () => {
    const solutes = [solute(3, 0), solute(15, 0, true)]
    expect(osmotic(solutes, 'inside')).toBe(3)
    expect(osmotic(solutes, 'outside')).toBe(0)
    expect(tonicityOf(osmotic(solutes, 'inside'), osmotic(solutes, 'outside'))).toBe('hypotonic')
  })

  it('compares the outside with the inside', () => {
    expect(tonicityOf(0.9, 5)).toBe('hypertonic')
    expect(tonicityOf(0.9, 0)).toBe('hypotonic')
  })

  it('is isotonic when the totals are equal, however they add up', () => {
    expect(tonicityOf(0.9, 0.9)).toBe('isotonic')
    expect(tonicityOf(0.3, 0.1 + 0.2)).toBe('isotonic')
    expect(panelsOf(settingsOf('in1=0.3&out1=0.1&on2=1&cross2=0&in2=0&out2=0.2&view=start'))[0].tonicity).toBe('isotonic')
  })

  it('never changes for a solute that can cross, whatever its concentrations', () => {
    const base = panelsOf(settingsOf('view=start&in1=0.9&out1=5'))[0].tonicity
    for (const [i, o] of [[0, 50], [50, 0], [7, 7]]) {
      const p = panelsOf(settingsOf(`view=start&in1=0.9&out1=5&on2=1&cross2=1&in2=${i}&out2=${o}`))[0]
      expect(p.tonicity).toBe(base)
    }
  })
})

describe('movement', () => {
  it('sends water from the hypotonic side to the hypertonic side', () => {
    // a hypertonic outside draws water out of the cell; a hypotonic one sends it in
    expect(waterFlow('hypertonic')).toBe('out')
    expect(waterFlow('hypotonic')).toBe('in')
    expect(waterFlow('isotonic')).toBe('none')
  })

  it('sends a solute that can cross from higher to lower concentration', () => {
    expect(soluteFlow(solute(15, 0, true))).toBe('out')
    expect(soluteFlow(solute(0, 15, true))).toBe('in')
    expect(soluteFlow(solute(5, 5, true))).toBe('none')
    expect(soluteFlow(solute(15, 0, false))).toBe('none')
  })
})

describe('results', () => {
  it('give each cell its shape for the outside’s tonicity', () => {
    expect(['hypertonic', 'isotonic', 'hypotonic'].map((t) => outcomeOf('blood', t as never))).toEqual(['crenated', 'normal', 'swollen'])
    expect(outcomeOf('blood', 'hypotonic', true)).toBe('burst')
    expect(['hypertonic', 'isotonic', 'hypotonic'].map((t) => outcomeOf('plant', t as never))).toEqual(['plasmolyzed', 'flaccid', 'turgid'])
  })

  it('raise the level on the hypertonic side, and swell a bag that is hypertonic to its beaker', () => {
    // side B hypertonic to side A
    expect(outcomeOf('utube', 'hypertonic')).toBe('rises-b')
    expect(outcomeOf('beaker', 'hypotonic')).toBe('rises-a')
    expect(outcomeOf('utube', 'isotonic')).toBe('level')
    // the beaker hypotonic to the bag: water moves in
    expect(outcomeOf('bag', 'hypotonic')).toBe('swells')
    expect(outcomeOf('bag', 'hypertonic')).toBe('shrinks')
  })
})

describe('a three-up', () => {
  it('puts the same inside in half, the same and double its concentrations', () => {
    const panels = panelsOf(settingsOf('in1=0.9'))
    expect(panels.map((p) => p.solutes[0].inside)).toEqual([0.9, 0.9, 0.9])
    expect(panels.map((p) => p.solutes[0].outside)).toEqual(THREE_FACTORS.map((f) => 0.9 * f))
    expect(panels.map((p) => p.tonicity)).toEqual(['hypotonic', 'isotonic', 'hypertonic'])
    expect(panels.map((p) => p.letter)).toEqual(['A', 'B', 'C'])
  })

  it('works out every solute’s outside, the ones that cross too', () => {
    const [hypo] = panelsOf(settingsOf('in1=1&on2=1&cross2=1&in2=4'))
    expect(hypo.solutes.map((x) => x.outside)).toEqual([0.5, 2])
  })

  it('shuffled, changes only the order, and always changes it', () => {
    const inOrder = panelsOf(settingsOf('in1=0.9'))
    for (const seed of [1, 2, 3, 40, 500]) {
      const shuffled = panelsOf(settingsOf(`in1=0.9&order=shuffled&orderSeed=${seed}`))
      expect(threeOrder({ order: 'shuffled', orderSeed: seed })).not.toEqual([0, 1, 2])
      expect(shuffled.map((p) => p.letter)).toEqual(['A', 'B', 'C'])
      const strip = (p: (typeof inOrder)[number]) => ({ ...p, letter: undefined })
      expect(shuffled.map(strip).sort((a, b) => a.solutes[0].outside - b.solutes[0].outside)).toEqual(inOrder.map(strip))
    }
  })

  it('is only for a cell: another scene shows its start and result', () => {
    expect(settingsOf('scene=utube&view=three').view).toBe('both')
    expect(settingsOf('scene=plant&view=three').view).toBe('three')
  })
})
