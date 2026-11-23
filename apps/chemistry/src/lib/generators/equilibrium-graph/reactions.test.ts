import { describe, expect, it } from 'vitest'
import { textRuns } from '$shared/particles/keyText'
import { settle } from './model'
import { REACTIONS, REACTION_IDS, equationText, moleChange, reactionOf, signed } from './reactions'

describe('the reaction setups', () => {
  it('are the seven, each with a starting concentration for every species', () => {
    expect(REACTION_IDS).toEqual(['ammonia', 'hi', 'n2o4', 'so3', 'pcl5', 'fescn', 'abc'])
    for (const rx of REACTIONS) {
      expect(rx.start.length, rx.id).toBe(rx.species.length)
      expect(rx.species.length, rx.id).toBeLessThanOrEqual(3)
      expect(rx.k, rx.id).toBeGreaterThan(0)
    }
  })

  it('write their equations with lowered digits and raised charges', () => {
    expect(REACTIONS.map(equationText)).toEqual([
      'N₂ + 3H₂ ⇌ 2NH₃', 'H₂ + I₂ ⇌ 2HI', 'N₂O₄ ⇌ 2NO₂', '2SO₂ + O₂ ⇌ 2SO₃', 'PCl₅ ⇌ PCl₃ + Cl₂', 'Fe³⁺ + SCN⁻ ⇌ FeSCN²⁺', 'A + B ⇌ C',
    ])
    expect(textRuns(reactionOf('fescn').species[2].formula)).toEqual([{ text: 'FeSCN', shift: null }, { text: '2+', shift: 'super' }])
  })

  it('know the real direction of each reaction’s heat, and its change in moles', () => {
    expect(Object.fromEntries(REACTIONS.filter((rx) => rx.id !== 'abc').map((rx) => [rx.id, rx.heat]))).toEqual({
      ammonia: 'exothermic', hi: 'exothermic', n2o4: 'endothermic', so3: 'exothermic', pcl5: 'endothermic', fescn: 'exothermic',
    })
    expect(REACTIONS.map(moleChange)).toEqual([-2, 0, 1, -1, 1, -1, -1])
    expect(reactionOf('ammonia').species.map(signed)).toEqual([-1, -3, 2])
  })

  it('say what backs up each real reaction’s heat: its ΔH°, with the sign its heat says', () => {
    for (const rx of REACTIONS.filter((x) => x.id !== 'abc' && x.id !== 'fescn')) {
      const evidence = (rx as { evidence?: string }).evidence ?? ''
      expect(evidence, rx.id).toMatch(rx.heat === 'exothermic' ? /^ΔH° = −/ : /^ΔH° = \+/)
    }
    expect((reactionOf('fescn') as { evidence?: string }).evidence).toBe('the red color fades on warming')
    expect((reactionOf('hi') as { evidence?: string }).evidence).toContain('I₂ as a gas')
  })

  it('have example values that give a clear graph: the lines level off well apart, none along the axis', () => {
    for (const rx of REACTIONS) {
      const { equilibrium } = settle(rx.start, rx.species.map(signed), rx.k)
      const top = Math.max(...rx.start, ...equilibrium)
      for (const [i, c] of equilibrium.entries()) {
        expect(c / top, `${rx.id}: ${rx.species[i].formula} off the axis`).toBeGreaterThan(0.1)
        // …and every line moves far enough to see
        expect(Math.abs(c - rx.start[i]) / top, `${rx.id}: ${rx.species[i].formula} moves`).toBeGreaterThan(0.1)
        for (let j = 0; j < i; j++) expect(Math.abs(c - equilibrium[j]) / top, `${rx.id}: ${rx.species[i].formula} apart`).toBeGreaterThan(0.08)
      }
    }
  })
})
