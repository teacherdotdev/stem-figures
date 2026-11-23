import { describe, expect, it } from 'vitest'
import {
  STRAIGHT, concentration, dataPoints, dataTimes, endTime, firstHalfLife, halfLifeTimes, kForHalfLife, kUnit, lnRound, lnText, plotted, rSquared, sigText,
  straightness, timeAtShare, type Order,
} from './kinetics'

const ORDERS: Order[] = [0, 1, 2]

describe('the integrated rate laws', () => {
  it('zero order: [A] = [A]₀ − kt, ending at [A]₀/k', () => {
    expect(concentration(0, 1, 0.01, 0)).toBe(1)
    expect(concentration(0, 1, 0.01, 30)).toBeCloseTo(0.7, 12)
    expect(concentration(0, 1, 0.01, 100)).toBeCloseTo(0, 12)
    // It has ended: nothing is left, and never less than nothing.
    expect(concentration(0, 1, 0.01, 150)).toBe(0)
    expect(endTime(0, 1, 0.01)).toBeCloseTo(100, 12)
    expect(endTime(1, 1, 0.01)).toBe(Infinity)
    expect(endTime(2, 1, 0.01)).toBe(Infinity)
  })

  it('first order: ln[A] = ln[A]₀ − kt', () => {
    // [A]₀ = 1.00 M, k = 0.020 s⁻¹: 0.135 M at 100 s.
    expect(concentration(1, 1, 0.02, 100)).toBeCloseTo(0.1353, 4)
    expect(Math.log(concentration(1, 0.5, 0.02, 40))).toBeCloseTo(Math.log(0.5) - 0.8, 12)
  })

  it('second order: 1/[A] = 1/[A]₀ + kt', () => {
    // [A]₀ = 1.00 M, k = 0.020 M⁻¹ s⁻¹: 1/[A] = 3.00 M⁻¹ at 100 s.
    expect(1 / concentration(2, 1, 0.02, 100)).toBeCloseTo(3, 12)
    expect(1 / concentration(2, 0.25, 0.5, 10)).toBeCloseTo(4 + 5, 12)
  })

  it('each order starts at [A]₀ and only falls', () => {
    for (const order of ORDERS) {
      expect(concentration(order, 0.8, 0.05, 0)).toBeCloseTo(0.8, 12)
      let last = Infinity
      for (let t = 0; t <= 30; t += 1) {
        const a = concentration(order, 0.8, 0.05, t)
        expect(a).toBeLessThanOrEqual(last)
        expect(a).toBeGreaterThanOrEqual(0)
        last = a
      }
    }
  })

  it('plots [A], ln[A] or 1/[A], and nothing for ln or 1/ of zero', () => {
    expect(plotted('conc', 0.5)).toBe(0.5)
    expect(plotted('ln', 0.5)).toBeCloseTo(-0.6931, 4)
    expect(plotted('inv', 0.5)).toBe(2)
    expect(plotted('conc', 0)).toBe(0)
    expect(plotted('ln', 0)).toBeNull()
    expect(plotted('inv', 0)).toBeNull()
  })
})

describe('the straight graph', () => {
  // Exact values of the model, not rounded data, every 5 s.
  const times = Array.from({ length: 12 }, (_, i) => i * 5)
  const r2 = (order: Order) => {
    const conc = times.map((t) => concentration(order, 1, 0.01, t))
    return {
      conc: rSquared(times, conc)!,
      ln: rSquared(times, conc.map((a) => Math.log(a)))!,
      inv: rSquared(times, conc.map((a) => 1 / a))!,
    }
  }

  it('is [A] for zero order, ln[A] for first and 1/[A] for second, and only that one', () => {
    for (const order of ORDERS) {
      const found = r2(order)
      for (const plot of ['conc', 'ln', 'inv'] as const) {
        if (plot === STRAIGHT[order]) expect(found[plot], `order ${order} ${plot}`).toBeCloseTo(1, 10)
        else expect(found[plot], `order ${order} ${plot}`).toBeLessThan(0.999)
      }
    }
    expect(STRAIGHT).toEqual({ 0: 'conc', 1: 'ln', 2: 'inv' })
  })

  it('has slope −k, −k and +k, and intercept [A]₀, ln[A]₀ and 1/[A]₀', () => {
    const slope = (order: Order, plot: 'conc' | 'ln' | 'inv') =>
      (plotted(plot, concentration(order, 0.5, 0.03, 12))! - plotted(plot, concentration(order, 0.5, 0.03, 4))!) / 8
    expect(slope(0, 'conc')).toBeCloseTo(-0.03, 12)
    expect(slope(1, 'ln')).toBeCloseTo(-0.03, 12)
    expect(slope(2, 'inv')).toBeCloseTo(0.03, 12)
    expect(plotted('ln', concentration(1, 0.5, 0.03, 0))).toBeCloseTo(Math.log(0.5), 12)
    expect(plotted('inv', concentration(2, 0.5, 0.03, 0))).toBeCloseTo(2, 12)
  })

  it('r² needs three points that vary', () => {
    expect(rSquared([0, 1], [1, 2])).toBeNull()
    expect(rSquared([0, 1, 2], [3, 3, 3])).toBeNull()
    expect(rSquared([0, 1, 2], [1, 3, 5])).toBeCloseTo(1, 12)
  })
})

describe('half-lives', () => {
  it('zero order: [A]₀/2k, each half as long as the last, ending at 50, 75 and 87.5 s', () => {
    const t = halfLifeTimes(0, 1, 0.01, 3)
    expect(t[0]).toBeCloseTo(50, 10)
    expect(t[1]).toBeCloseTo(75, 10)
    expect(t[2]).toBeCloseTo(87.5, 10)
  })

  it('first order: ln 2/k, the same every time (34.7 s for k = 0.020 s⁻¹)', () => {
    const t = halfLifeTimes(1, 1, 0.02, 3)
    expect(t[0]).toBeCloseTo(34.657, 3)
    expect(t[1] - t[0]).toBeCloseTo(t[0], 10)
    expect(t[2] - t[1]).toBeCloseTo(t[0], 10)
    // It doesn't depend on [A]₀.
    expect(firstHalfLife(1, 7, 0.02)).toBeCloseTo(t[0], 10)
  })

  it('second order: 1/(k[A]₀), each twice the last, ending at 50, 150 and 350 s', () => {
    const t = halfLifeTimes(2, 1, 0.02, 3)
    expect(t[0]).toBeCloseTo(50, 10)
    expect(t[1]).toBeCloseTo(150, 10)
    expect(t[2]).toBeCloseTo(350, 10)
    expect(t[2] - t[1]).toBeCloseTo(2 * (t[1] - t[0]), 10)
  })

  it('each ends with half of what the last left', () => {
    for (const order of ORDERS) {
      halfLifeTimes(order, 0.6, 0.04, 3).forEach((t, i) => expect(concentration(order, 0.6, 0.04, t)).toBeCloseTo(0.6 / 2 ** (i + 1), 12))
    }
  })

  it('a tenth of [A]₀ is left at 0.9[A]₀/k, ln 10/k and 9/(k[A]₀), over three half-lives for every order', () => {
    expect(timeAtShare(0, 2, 0.01, 0.1)).toBeCloseTo(180, 10)
    expect(timeAtShare(1, 2, 0.01, 0.1)).toBeCloseTo(Math.LN10 / 0.01, 10)
    expect(timeAtShare(2, 2, 0.01, 0.1)).toBeCloseTo(450, 10)
    for (const order of ORDERS) expect(timeAtShare(order, 2, 0.01, 0.1)).toBeGreaterThan(halfLifeTimes(order, 2, 0.01, 3)[2])
  })

  it('switching order keeps the first half-life', () => {
    for (const from of ORDERS) {
      const half = firstHalfLife(from, 0.4, 0.02)
      for (const to of ORDERS) expect(firstHalfLife(to, 0.4, kForHalfLife(to, 0.4, half))).toBeCloseTo(half, 10)
    }
  })
})

describe('the unit of k', () => {
  it('follows the order: concentration per time, per time, per concentration per time', () => {
    expect(kUnit(0, 'M', 's')).toBe('M s⁻¹')
    expect(kUnit(1, 'M', 's')).toBe('s⁻¹')
    expect(kUnit(2, 'M', 's')).toBe('M⁻¹ s⁻¹')
  })

  it('is written from the concentration and time units', () => {
    expect(kUnit(0, 'M', 'min')).toBe('M min⁻¹')
    expect(kUnit(0, 'mol/L', 's')).toBe('mol L⁻¹ s⁻¹')
    expect(kUnit(0, 'mol dm⁻³', 'h')).toBe('mol dm⁻³ h⁻¹')
    expect(kUnit(1, 'mol/L', 'min')).toBe('min⁻¹')
    expect(kUnit(2, 'mol/L', 's')).toBe('L mol⁻¹ s⁻¹')
    expect(kUnit(2, 'mol dm⁻³', 's')).toBe('dm³ mol⁻¹ s⁻¹')
  })
})

describe('the data', () => {
  it('is taken at plain times: to the end when the spacing is plain, else at the plain spacing under it', () => {
    expect(dataTimes(120, 7)).toEqual([0, 20, 40, 60, 80, 100, 120])
    expect(dataTimes(120, 6)).toEqual([0, 24, 48, 72, 96, 120])
    // 120/7 is 17.14…: every 15 instead.
    expect(dataTimes(120, 8)).toEqual([0, 15, 30, 45, 60, 75, 90, 105])
    expect(dataTimes(0.9, 10)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9])
    for (const until of [7, 90, 115, 450, 0.0031, 23000]) {
      for (let count = 5; count <= 10; count++) {
        const times = dataTimes(until, count)
        expect(times).toHaveLength(count)
        expect(times.at(-1)!).toBeLessThanOrEqual(until * (1 + 1e-9))
        expect(times.at(-1)!).toBeGreaterThan(until * 0.7)
      }
    }
  })

  it('with no scatter is the model rounded to three significant figures, with ln[A] and 1/[A] from the rounded [A]', () => {
    const data = dataPoints(1, 1, 0.02, [0, 20, 40, 100])
    expect(data.map((p) => p.conc)).toEqual([1, 0.67, 0.449, 0.135])
    // ln 0.449 = −0.8007…, 1/0.449 = 2.227…
    expect(data[2].ln).toBe(-0.801)
    expect(data[2].inv).toBe(2.23)
    expect(data[0]).toEqual({ t: 0, conc: 1, ln: 0, inv: 1 })
  })

  it('makes the straight graph’s points straight, and the other two not', () => {
    const cases: [Order, number][] = [[0, 0.01], [1, 0.02], [2, 0.02]]
    for (const [order, k] of cases) {
      const until = timeAtShare(order, 1, k, 0.1)
      const r2 = straightness(dataPoints(order, 1, k, dataTimes(until, 8)))
      for (const plot of ['conc', 'ln', 'inv'] as const) {
        // Rounding to three significant figures bends the straight one a little.
        if (plot === STRAIGHT[order]) expect(r2[plot]!, `order ${order} ${plot}`).toBeGreaterThan(0.9999)
        else expect(r2[plot]!, `order ${order} ${plot}`).toBeLessThan(0.99)
      }
    }
  })

  it('stops when a zero-order reaction ends', () => {
    const data = dataPoints(0, 1, 0.01, [0, 25, 50, 75, 100, 125, 150])
    expect(data.map((p) => p.t)).toEqual([0, 25, 50, 75, 100])
    expect(data.map((p) => p.conc)).toEqual([1, 0.75, 0.5, 0.25, 0])
    // Nothing is left at the end, so there is no ln[A] or 1/[A] there.
    expect(data.at(-1)).toEqual({ t: 100, conc: 0, ln: null, inv: null })
    expect(straightness(data).conc).toBeCloseTo(1, 10)
  })

  it('is scattered from the seed: the same seed, the same data', () => {
    const times = dataTimes(120, 8)
    const a = dataPoints(1, 1, 0.02, times, 5, 7)
    expect(dataPoints(1, 1, 0.02, times, 5, 7)).toEqual(a)
    expect(dataPoints(1, 1, 0.02, times, 5, 8)).not.toEqual(a)
    // The first point is [A]₀ exactly, and the rest are near the model.
    expect(a[0].conc).toBe(1)
    const clean = dataPoints(1, 1, 0.02, times)
    expect(a.slice(1).some((p, i) => p.conc !== clean[i + 1].conc)).toBe(true)
    a.forEach((p, i) => expect(Math.abs(p.conc - clean[i].conc)).toBeLessThan(clean[i].conc * 0.25))
  })

  it('scatters by about the percent asked for', () => {
    // Many points of a slow reaction: the spread of their errors is near 2%.
    const times = Array.from({ length: 400 }, (_, i) => i)
    const errors = dataPoints(1, 1, 1e-6, times, 2, 3).slice(1).map((p) => p.conc - 1)
    const sd = Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length)
    expect(sd).toBeGreaterThan(0.015)
    expect(sd).toBeLessThan(0.025)
  })
})

describe('numbers to three significant figures', () => {
  it('keeps their zeros and writes a true minus sign', () => {
    expect(sigText(1)).toBe('1.00')
    expect(sigText(0.6065)).toBe('0.607')
    expect(sigText(0.05)).toBe('0.0500')
    expect(sigText(-2.3026)).toBe('−2.30')
    expect(sigText(12.345)).toBe('12.3')
    expect(sigText(1234)).toBe('1230')
    expect(sigText(0.9996)).toBe('1.00')
    expect(sigText(0)).toBe('0')
  })
})

describe('ln[A] to three decimal places', () => {
  it('has as many decimal places as [A] has significant figures, never −0', () => {
    expect(lnText(Math.log(0.94))).toBe('−0.062')
    expect(lnText(Math.log(1))).toBe('0.000')
    expect(lnText(-0.0004)).toBe('0.000')
    expect(lnText(Math.log(0.1))).toBe('−2.303')
    expect(lnText(Math.log(2.7))).toBe('0.993')
    expect(lnRound(Math.log(0.94))).toBe(-0.062)
    expect(Object.is(lnRound(-0.0004), 0)).toBe(true)
  })

  it('is how the data give ln[A]', () => {
    const data = dataPoints(1, 1, 0.003, [0, 20])
    expect(data[1].conc).toBe(0.942)
    expect(data[1].ln).toBe(-0.06) // ln 0.942 = −0.0598
    expect(data[1].inv).toBe(1.06)
  })
})
