import { describe, expect, it } from 'vitest'
import { answerText, buildFigure } from './figure'
import { energies, energyText, layoutPyramid } from './pyramid'
import { foodWebSettings } from './settings'
import { parseWeb } from './web'

const settingsOf = (query: string) => foodWebSettings.fromParams(new URLSearchParams(query))
const pyramid = (query: string) => buildFigure(settingsOf(`figure=pyramid&${query}`)).pyramid!

describe('an energy pyramid', () => {
  it('applies the 10% rule exactly', () => {
    expect(energies(10000, 10, 4)).toEqual([10000, 1000, 100, 10])
    expect(energies(10000, 10, 5)).toEqual([10000, 1000, 100, 10, 1])
  })

  it('applies any share to any base exactly, each level that share of the one below', () => {
    for (const base of [1, 7, 250, 1234.5, 25000, 99999, 1e6]) {
      for (const share of [1, 5, 10, 12.5, 15, 20, 33, 50]) {
        const values = energies(base, share, 5)
        expect(values[0]).toBe(base)
        for (let i = 1; i < 5; i++) expect(values[i]).toBeCloseTo((values[i - 1] * share) / 100, 9)
      }
    }
    expect(energies(25000, 15, 4)).toEqual([25000, 3750, 562.5, 84.375])
    expect(energies(1000, 20, 3)).toEqual([1000, 200, 40])
  })

  it('writes energies with thousands separated', () => {
    expect(energyText(10000)).toBe('10,000')
    expect(energyText(84.375)).toBe('84.375')
    expect(energyText(0.1)).toBe('0.1')
  })

  it('stacks levels of equal height, producers at the base and narrowing up', () => {
    const p = pyramid('levels=5')
    expect(p.levels).toHaveLength(5)
    const heights = p.levels.map((l) => l.points[0].y - l.points[2].y)
    expect(new Set(heights.map((h) => Math.round(h))).size).toBe(1)
    const widths = p.levels.map((l) => l.points[1].x - l.points[0].x)
    expect(widths).toEqual([...widths].sort((a, b) => b - a))
    expect(p.levels[0].points[0].y).toBeGreaterThan(p.levels[4].points[0].y)
  })

  it('writes each level’s name and energy, in the units chosen', () => {
    const p = pyramid('')
    expect(p.levels.map((l) => l.name)).toEqual([['Producers'], ['Primary', 'consumers'], ['Secondary', 'consumers'], ['Tertiary', 'consumers']].map((n, i) => (i === 0 ? n : p.levels[i].name)))
    expect(p.levels.map((l) => l.name!.join(' '))).toEqual(['Producers', 'Primary consumers', 'Secondary consumers', 'Tertiary consumers'])
    expect(p.levels.map((l) => l.value)).toEqual(['10,000 kcal', '1,000 kcal', '100 kcal', '10 kcal'])
    expect(pyramid('unit=kJ&perArea=1&energy=20000').levels.map((l) => l.value)).toEqual(['20,000 kJ/m²/yr', '2,000 kJ/m²/yr', '200 kJ/m²/yr', '20 kJ/m²/yr'])
    expect(pyramid('unit=J&levels=3').levels.map((l) => l.value)).toEqual(['10,000 J', '1,000 J', '100 J'])
  })

  it('leaves values blank: all of them, all but the base, or leaves them off', () => {
    expect(pyramid('values=blank').levels.map((l) => l.blankValue)).toEqual([true, true, true, true])
    expect(pyramid('values=base').levels.map((l) => l.blankValue)).toEqual([false, true, true, true])
    expect(pyramid('values=none').levels.map((l) => l.value)).toEqual([null, null, null, null])
  })

  it('names levels by trophic level, from the chain, typed, or blank', () => {
    const names = (q: string) => pyramid(q).levels.map((l) => (l.name === null ? null : l.name.join(' ')))
    expect(names('pyramidNames=chain')).toEqual(['Grass', 'Grasshopper', 'Frog', 'Snake'])
    expect(names('pyramidNames=typed&typedNames=Algae;;Fish')).toEqual(['Algae', 'Primary consumers', 'Fish', 'Tertiary consumers'])
    expect(names('pyramidNames=blank')).toEqual([null, null, null, null])
    expect(names('wording=diet')).toEqual(['Producers', 'Herbivores', 'Carnivores', 'Top carnivores'])
  })

  it('puts a picture beside each level from the chain, and heat lost out of each', () => {
    const p = pyramid('pictures=1&heat=text')
    expect(p.levels.map((l) => l.picture?.entry.key)).toEqual(['grass', 'grasshopper', 'frog', 'snake'])
    expect(p.levels.every((l) => l.picture!.x + l.picture!.size < l.points[0].x + (l.points[3].x - l.points[0].x) / 2)).toBe(true)
    expect(p.levels.map((l) => l.heat!.text)).toEqual(Array(4).fill('90% lost as heat'))
    expect(pyramid('heat=blank&share=20').levels.every((l) => l.heat && l.heat.text === null)).toBe(true)
    expect(pyramid('heat=text&share=20').levels[0].heat!.text).toBe('80% lost as heat')
  })

  it('gives the energies as its answer', () => {
    expect(answerText(settingsOf('figure=pyramid&values=base&answerKey=1'))).toContain('Tertiary consumers (snake): 10 kcal')
    expect(layoutPyramid({ ...foodWebSettings.defaults, pyramidNames: 'chain' }, parseWeb('grass;rabbit=grass')!, ['grass', 'rabbit']).answer[0]).toBe('Grass: 10,000 kcal')
  })
})
