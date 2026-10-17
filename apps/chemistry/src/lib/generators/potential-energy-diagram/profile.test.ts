import { describe, expect, it } from 'vitest'
import {
  catalysedLevels, energyAt, enthalpyChange, kindOf, placementOf, profilePoints, rateDeterminingStep, stepsIn, stepsOf,
} from './profile'

const EXO = [50, 150, 20]
const ENDO = [20, 150, 80]
const TWO = [40, 120, 70, 100, 10]
const THREE = [30, 110, 60, 130, 50, 90, -20]

describe('a reaction profile', () => {
  it('names each level in order: reactants, transition states and intermediates, products', () => {
    expect(TWO.map((_, i) => kindOf(i, TWO.length))).toEqual(['reactants', 'ts', 'intermediate', 'ts', 'products'])
    expect([EXO, TWO, THREE].map(stepsOf)).toEqual([1, 2, 3])
  })

  for (const levels of [EXO, ENDO, TWO, THREE]) {
    const p = placementOf(stepsOf(levels))
    const pts = profilePoints(levels, p)

    it(`peaks at each transition state's energy, exactly (${levels.join(', ')})`, () => {
      for (const st of stepsIn(levels)) {
        const half = (p.end - p.start) / (levels.length - 1)
        const [x0, x1] = [p.start + (st.index - 1) * half, p.start + (st.index + 1) * half]
        const inStep = pts.filter((q) => q.x >= x0 - 1e-9 && q.x <= x1 + 1e-9).map((q) => q.y)
        expect(Math.max(...inStep)).toBeCloseTo(st.ts, 9)
      }
    })

    it(`runs flat at both ends (${levels.join(', ')})`, () => {
      expect(pts.filter((q) => q.x <= p.start).every((q) => q.y === levels[0])).toBe(true)
      expect(pts.filter((q) => q.x >= p.end).every((q) => q.y === levels.at(-1))).toBe(true)
      // and leaves and joins the flat runs with no slope
      const d = 1e-4
      expect(Math.abs(energyAt(levels, p, p.start + d) - levels[0]) / d).toBeLessThan(1e-2)
      expect(Math.abs(energyAt(levels, p, p.end - d) - levels.at(-1)!) / d).toBeLessThan(1e-2)
    })

    it(`only rises or only falls between neighboring levels, never past them (${levels.join(', ')})`, () => {
      const half = (p.end - p.start) / (levels.length - 1)
      for (let i = 1; i < levels.length; i++) {
        const [a, b] = [levels[i - 1], levels[i]]
        const run = pts.filter((q) => q.x >= p.start + (i - 1) * half - 1e-9 && q.x <= p.start + i * half + 1e-9).map((q) => q.y)
        for (let k = 1; k < run.length; k++) expect(Math.sign(run[k] - run[k - 1]) * Math.sign(b - a)).toBeGreaterThanOrEqual(0)
        expect(Math.min(...run)).toBeGreaterThanOrEqual(Math.min(a, b) - 1e-9)
        expect(Math.max(...run)).toBeLessThanOrEqual(Math.max(a, b) + 1e-9)
      }
    })
  }
})

describe('the energies worked out', () => {
  it('gives ΔH and the forward and reverse Ea of an exothermic reaction', () => {
    expect(enthalpyChange(EXO)).toBe(-30)
    expect(stepsIn(EXO).map((st) => [st.ea, st.eaReverse])).toEqual([[100, 130]])
  })

  it('gives ΔH and the forward and reverse Ea of an endothermic reaction', () => {
    expect(enthalpyChange(ENDO)).toBe(60)
    expect(stepsIn(ENDO).map((st) => [st.ea, st.eaReverse])).toEqual([[130, 70]])
    // Ea (reverse) = Ea − ΔH for one step
    expect(stepsIn(ENDO)[0].eaReverse).toBe(stepsIn(ENDO)[0].ea - enthalpyChange(ENDO))
  })

  it('gives each step’s Ea in a mechanism, from the level before it', () => {
    expect(enthalpyChange(TWO)).toBe(-30)
    expect(stepsIn(TWO).map((st) => [st.ea, st.eaReverse])).toEqual([[80, 50], [30, 90]])
    expect(stepsIn(THREE).map((st) => st.ea)).toEqual([80, 70, 40])
  })

  it('lowers both activation energies by the same amount with a catalyst, and leaves ΔH alone', () => {
    const cat = catalysedLevels(EXO, 100)
    const [before, after] = [stepsIn(EXO)[0], stepsIn(cat)[0]]
    expect(enthalpyChange(cat)).toBe(enthalpyChange(EXO))
    expect(before.ea - after.ea).toBe(50)
    expect(before.eaReverse - after.eaReverse).toBe(50)
    expect(catalysedLevels(TWO, 90)).toEqual([40, 90, 10])
  })
})

describe('the rate-determining step', () => {
  it('is the step with the highest Ea when that is also the highest above the lowest point before it', () => {
    expect(rateDeterminingStep(TWO)).toBe(0)
    expect(rateDeterminingStep([40, 70, 20, 110, 10])).toBe(1)
  })

  it('is named only when the two definitions agree', () => {
    // Step 1 has the highest Ea (70), but step 2's transition state is
    // higher above the reactants, the lowest point before it (90 against 70).
    expect(rateDeterminingStep([30, 100, 80, 120, 0])).toBeNull()
  })

  it('isn’t named for one step, or when two steps tie', () => {
    expect(rateDeterminingStep(EXO)).toBeNull()
    expect(rateDeterminingStep([0, 50, 20, 70, -10])).toBeNull()
  })
})
