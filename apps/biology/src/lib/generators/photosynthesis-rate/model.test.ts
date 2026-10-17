import { describe, expect, it } from 'vitest'
import { rateAtTemperature } from '../enzyme-activity/model'
import {
  AIR, ALPHA, T_OPT, T_WIDTH, capacity, chamber, co2Compensation, co2Plateau, co2Saturation, fastestAt, grossRate,
  intensityAt, lightCompensation, lightPlateau, lightSaturation, netRate, respiration,
} from './model'

describe('rate against light intensity', () => {
  it('rises in a straight line at low light, with a slope that doesn’t depend on CO₂ or temperature', () => {
    for (const [c, t] of [[0.1, 25], [0.1, 15], [0.04, 15], [1, 30]]) {
      const slope = grossRate(1, c, t) / 1
      expect(slope).toBeCloseTo(ALPHA, 2)
      // Still straight a third of the way to where it levels off.
      const i = lightSaturation(c, t) / 3
      expect(grossRate(i, c, t) / i).toBeCloseTo(ALPHA, 1)
    }
  })

  it('levels off at the capacity, higher with more CO₂ or a better temperature', () => {
    const top = (c: number, t: number) => grossRate(10_000, c, t)
    expect(top(0.1, 25)).toBeCloseTo(lightPlateau(0.1, 25), 1)
    expect(top(0.1, 25)).toBeGreaterThan(top(0.1, 15))
    expect(top(0.1, 15)).toBeGreaterThan(top(0.04, 15))
    // Levelled off: well past saturation, more light hardly helps.
    const sat = lightSaturation(0.1, 25)
    expect(grossRate(sat, 0.1, 25)).toBeCloseTo(0.95 * lightPlateau(0.1, 25), 6)
    expect(grossRate(2 * sat, 0.1, 25) / grossRate(sat, 0.1, 25)).toBeLessThan(1.05)
  })

  it('falls with the lamp’s distance as 1/d² while light is limiting', () => {
    expect(intensityAt(10) / intensityAt(20)).toBeCloseTo(4, 12)
    const far = (d: number) => grossRate(intensityAt(d), 0.1, 25)
    expect(far(40) / far(80)).toBeCloseTo(4, 1)
    // Close to the lamp, light isn't limiting and the rate stays level.
    expect(far(2) / far(4)).toBeCloseTo(1, 2)
  })
})

describe('rate against CO₂ and temperature', () => {
  it('levels off against CO₂ where light limits it, higher in brighter light', () => {
    expect(grossRate(60, 100, 25)).toBeCloseTo(co2Plateau(60, 25), 1)
    expect(co2Plateau(60, 25)).toBeGreaterThan(co2Plateau(20, 25))
    expect(co2Saturation(60, 25)).toBeGreaterThan(co2Saturation(20, 25))
    // Below where it levels off, more CO₂ means a faster rate.
    expect(grossRate(60, 0.1, 25)).toBeGreaterThan(grossRate(60, 0.05, 25))
  })

  it('has its optimum where the enzymes’ temperature curve does', () => {
    expect(fastestAt((t) => grossRate(1000, 0.1, t))).toBeCloseTo(T_OPT, 1)
    expect(fastestAt((t) => rateAtTemperature(t, T_OPT, T_WIDTH))).toBeCloseTo(T_OPT, 1)
    expect(capacity(0.1, T_OPT)).toBeGreaterThan(capacity(0.1, 20))
    expect(grossRate(1000, 0.1, 60)).toBe(0)
  })

  it('barely changes with temperature in dim light, where light is limiting', () => {
    const dim = [20, 25, 30, 35].map((t) => grossRate(10, 0.1, t))
    expect(Math.max(...dim) / Math.min(...dim)).toBeLessThan(1.05)
    const bright = [20, 25, 30, 35].map((t) => grossRate(1000, 0.1, t))
    expect(Math.max(...bright) / Math.min(...bright)).toBeGreaterThan(1.3)
  })
})

describe('net rate', () => {
  it('is 0 at the compensation point and below 0 in the dark', () => {
    for (const [c, t] of [[0.1, 25], [0.04, 15]]) {
      expect(netRate(lightCompensation(c, t), c, t)).toBeCloseTo(0, 9)
      expect(netRate(0, c, t)).toBe(-respiration(t))
      expect(netRate(0, c, t)).toBeLessThan(0)
    }
    expect(netRate(60, co2Compensation(60, 25), 25)).toBeCloseTo(0, 6)
  })

  it('respires faster when warmer', () => {
    expect(respiration(35) / respiration(25)).toBeCloseTo(2, 12)
  })
})

describe('a closed chamber', () => {
  const minutes = 60
  it('in the dark, CO₂ rises in a straight line', () => {
    const run = chamber({ light: 0, temp: 25, start: AIR.co2, minutes })
    const rises = run.slice(1).map((r, k) => (r.co2 - run[k].co2) / (r.t - run[k].t))
    expect(Math.max(...rises) - Math.min(...rises)).toBeLessThan(1e-9)
    expect(rises[0]).toBeGreaterThan(0)
  })

  it('at the compensation point, CO₂ stays level', () => {
    const run = chamber({ light: lightCompensation(AIR.co2, 25), temp: 25, start: AIR.co2, minutes })
    for (const r of run) expect(r.co2).toBeCloseTo(AIR.co2, 9)
  })

  it('in bright light, CO₂ falls to the CO₂ compensation point and stays there', () => {
    const run = chamber({ light: 60, temp: 25, start: AIR.co2, minutes: 120 })
    const floor = co2Compensation(60, 25)
    expect(run[1].co2).toBeLessThan(AIR.co2)
    for (const [k, r] of run.entries()) if (k) expect(r.co2).toBeLessThanOrEqual(run[k - 1].co2 + 1e-12)
    expect(run.at(-1)!.co2).toBeCloseTo(floor, 4)
    expect(run.at(-1)!.co2).toBeGreaterThan(floor)
  })

  it('has O₂ as CO₂’s mirror image, and CO₂ against O₂ a straight falling line', () => {
    const run = chamber({ light: 60, temp: 25, start: AIR.co2, minutes, offAt: 30 })
    for (const r of run) expect(r.o2 + r.co2).toBeCloseTo(AIR.o2 + AIR.co2, 12)
    const slopes = run.slice(1).filter((r, k) => Math.abs(r.co2 - run[k].co2) > 1e-6).map((r, k) => (r.o2 - run[k].o2) / (r.co2 - run[k].co2))
    for (const m of slopes) expect(m).toBeCloseTo(-1, 6)
  })

  it('rises again in a straight line once the light goes off', () => {
    const run = chamber({ light: 60, temp: 25, start: AIR.co2, minutes, offAt: 30 })
    const low = run.find((r) => Math.abs(r.t - 30) < 1e-9)!
    expect(low.co2).toBe(Math.min(...run.map((r) => r.co2)))
    const after = run.filter((r) => r.t >= 30)
    const rises = after.slice(1).map((r, k) => (r.co2 - after[k].co2) / (r.t - after[k].t))
    expect(Math.max(...rises) - Math.min(...rises)).toBeLessThan(1e-9)
  })
})
