import { describe, expect, it } from 'vitest'
import { ENZYMES, enzymeOf } from './enzymes'
import {
  DENATURED, denaturedAbove, denaturedPH, kinetics, rateAtPH, rateAtSubstrate, rateAtTemperature,
} from './model'

/** Where a rate is fastest, to a hundredth, over a range. */
function peakOf(rate: (v: number) => number, from: number, to: number) {
  let best = from
  for (let v = from; v <= to; v += 0.01) if (rate(v) > rate(best)) best = v
  return best
}

describe('rate against temperature', () => {
  it('peaks at the optimum, at the full rate', () => {
    for (const [opt, width] of [[37, 10], [75, 12], [20, 4]]) {
      expect(peakOf((t) => rateAtTemperature(t, opt, width), 0, 120)).toBeCloseTo(opt, 1)
      expect(rateAtTemperature(opt, opt, width)).toBeCloseTo(1, 9)
    }
  })

  it('rises slowly as it warms and falls steeply past the optimum', () => {
    // Doubling every 10 °C, about half as fast 10 °C below the optimum.
    expect(rateAtTemperature(27, 37, 10)).toBeGreaterThan(0.5)
    expect(rateAtTemperature(27, 37, 10)).toBeLessThan(0.6)
    expect(rateAtTemperature(0, 37, 10)).toBeGreaterThan(0)
    // The fall to half is less than half as long as the rise from half.
    const above = 37 + [...Array(2000).keys()].map((k) => k / 100).find((d) => rateAtTemperature(37 + d, 37, 10) < 0.5)!
    expect(above - 37).toBeLessThan(5)
  })

  it('stops where the enzyme has denatured, and stays stopped', () => {
    const d = denaturedAbove(37, 10)
    expect(d).toBeGreaterThan(45)
    expect(d).toBeLessThan(55)
    expect(rateAtTemperature(d - 0.5, 37, 10)).toBeGreaterThan(0)
    expect(rateAtTemperature(d + 0.01, 37, 10)).toBe(0)
    expect(rateAtTemperature(100, 37, 10)).toBe(0)
    expect(DENATURED).toBeLessThanOrEqual(0.05)
  })

  it('has every curve the same shape, stretched by its width', () => {
    expect(rateAtTemperature(37 - 10, 37, 10)).toBeCloseTo(rateAtTemperature(75 - 12, 75, 12), 9)
    expect(denaturedAbove(75, 12) - 75).toBeCloseTo((denaturedAbove(37, 10) - 37) * 1.2, 6)
  })
})

describe('rate against pH', () => {
  it('is a bell around the optimum, the same either side', () => {
    expect(peakOf((p) => rateAtPH(p, 2, 2.5), 0, 14)).toBeCloseTo(2, 2)
    expect(rateAtPH(2, 2, 2.5)).toBe(1)
    expect(rateAtPH(7 - 1.3, 7, 3)).toBeCloseTo(rateAtPH(7 + 1.3, 7, 3), 12)
    expect(rateAtPH(7 + 1, 7, 3)).toBeLessThan(rateAtPH(7 + 0.5, 7, 3))
  })

  it('stops where the enzyme has denatured, either side', () => {
    const d = denaturedPH(8, 3)
    expect(d).toEqual({ low: 5, high: 11 })
    expect(rateAtPH(5, 8, 3)).toBe(0)
    expect(rateAtPH(11.5, 8, 3)).toBe(0)
    expect(rateAtPH(5.1, 8, 3)).toBeGreaterThan(0)
  })
})

describe('rate against substrate concentration', () => {
  it('is half of Vmax at Km, and levels off toward Vmax', () => {
    const k = kinetics('none', 1.5, 2)
    expect(rateAtSubstrate(1.5, k)).toBeCloseTo(0.5, 12)
    expect(rateAtSubstrate(1e6, k)).toBeCloseTo(1, 5)
    expect(rateAtSubstrate(0, k)).toBe(0)
  })

  it('has a competitive inhibitor raise Km, keeping Vmax', () => {
    const k = kinetics('competitive', 1, 3)
    expect(k).toEqual({ vmax: 1, km: 3 })
    expect(rateAtSubstrate(3, k)).toBeCloseTo(0.5, 12)
    expect(rateAtSubstrate(1e7, k)).toBeCloseTo(1, 5)
    expect(rateAtSubstrate(1, k)).toBeLessThan(rateAtSubstrate(1, kinetics('none', 1, 3)))
  })

  it('has a non-competitive inhibitor lower Vmax, keeping Km', () => {
    const k = kinetics('noncompetitive', 1, 2.5)
    expect(k).toEqual({ vmax: 0.4, km: 1 })
    expect(rateAtSubstrate(1, k)).toBeCloseTo(0.2, 12)
    expect(rateAtSubstrate(1e7, k)).toBeCloseTo(0.4, 5)
  })
})

describe('the enzymes', () => {
  it('work best where biology courses say', () => {
    expect(enzymeOf('pepsin')!.ph.opt).toBe(2)
    expect(enzymeOf('amylase')!.ph.opt).toBe(7)
    expect(enzymeOf('trypsin')!.ph.opt).toBe(8)
    expect(enzymeOf('human')!.temperature.opt).toBe(37)
    expect(enzymeOf('taq')!.temperature.opt).toBe(75)
    expect(enzymeOf('catalase')!.ph.opt).toBe(7)
  })

  it('each has a name and id of its own', () => {
    expect(new Set(ENZYMES.map((e) => e.id)).size).toBe(ENZYMES.length)
    expect(new Set(ENZYMES.map((e) => e.name)).size).toBe(ENZYMES.length)
  })
})
