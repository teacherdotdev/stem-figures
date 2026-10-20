import { describe, expect, it } from 'vitest'
import { answerLines as instrumentAnswer, corrected, randomReading, tidyReading, tidyZero } from './instrument'
import { LEAST_COUNTS, PX, caliperLayout, caliperScale, mainScaleEnd, readingOf, slideMarks, stripSource } from './caliper'

const near = (x: number) => Math.abs(x - Math.round(x)) < 1e-6

describe('caliper scales', () => {
  it('fit n divisions one least count short of n or 2n mm', () => {
    expect(LEAST_COUNTS.map((lc) => [caliperScale(lc).divisions, caliperScale(lc).length])).toEqual([[10, 9], [20, 39], [50, 49]])
    for (const lc of LEAST_COUNTS) {
      const v = caliperScale(lc)
      const g = Math.ceil(v.spacing)
      expect(g - v.spacing).toBeCloseTo(v.leastCount, 9)
      // numbered 0 to 10, each number a tenth of a mm
      expect(slideMarks(v, 0).filter((m) => m.number).map((m) => m.number)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
    }
  })

  it('line up exactly one mark with the main scale at every reading', () => {
    for (const lc of LEAST_COUNTS) {
      const v = caliperScale(lc)
      const steps = Math.round(150 / v.leastCount)
      for (let n = 0; n <= steps; n++) {
        const reading = Number((n * v.leastCount).toFixed(v.decimals))
        const marks = slideMarks(v, reading)
        // The last mark is the next cycle's zero: at a whole mm both ends line up, as on a real caliper.
        const aligned = marks.slice(0, -1).filter((m) => near(m.at))
        expect(aligned.length, `${reading} at ${lc}`).toBe(1)
        const { main, k } = readingOf(v, reading)
        expect(aligned[0].i).toBe(k)
        expect(main + k * v.leastCount).toBeCloseTo(reading, 9)
        expect(Math.round(aligned[0].at)).toBeLessThanOrEqual(mainScaleEnd(v))
        expect(near(marks[v.divisions].at)).toBe(k === 0)
        for (const m of marks) {
          if (m.i === k || (k === 0 && m.i === v.divisions)) continue
          expect(Math.abs(m.at - Math.round(m.at)), `${reading} mark ${m.i}`).toBeGreaterThanOrEqual(v.leastCount / 2 - 1e-9)
        }
      }
    }
  })

  it('work the plan’s cases', () => {
    expect(readingOf(caliperScale('0.1'), 23.4)).toEqual({ main: 23, k: 4 })
    expect(readingOf(caliperScale('0.05'), 23.45)).toEqual({ main: 23, k: 9 })
    expect(readingOf(caliperScale('0.02'), 23.46)).toEqual({ main: 23, k: 23 })
  })

  it('read a negative zero error from the mark left of zero', () => {
    const v = caliperScale('0.1')
    expect(readingOf(v, -0.3)).toEqual({ main: -1, k: 7 })
    const aligned = slideMarks(v, -0.3).filter((m) => near(m.at))
    expect(aligned.map((m) => [m.i, Math.round(m.at)])).toEqual([[7, 6]])
  })
})

describe('zero errors and readings', () => {
  it('tidy a zero error to the least count, within half a mm', () => {
    expect(tidyZero(caliperScale('0.05'), 0.12)).toBe(0.1)
    expect(tidyZero(caliperScale('0.05'), -0.13)).toBe(-0.15)
    expect(tidyZero(caliperScale('0.02'), 0.9)).toBe(0.5)
    expect(tidyZero(caliperScale('0.1'), -0.74)).toBe(-0.5)
  })

  it('keep a reading on the grid and the scale, and never below the zero error', () => {
    const v = caliperScale('0.05')
    expect(tidyReading(v, 0, 23.47)).toBe(23.45)
    expect(tidyReading(v, 0, 200)).toBe(150)
    expect(tidyReading(v, 0, -3)).toBe(0)
    expect(tidyReading(v, 0.3, 0.1)).toBe(0.3)
    expect(tidyReading(caliperScale('0.02'), 0, 23.461)).toBe(23.46)
  })

  it('correct a reading for either sign of zero error', () => {
    const v = caliperScale('0.05')
    expect(corrected(v, 23.45, 0.1)).toBe(23.35)
    expect(corrected(v, 23.45, -0.15)).toBe(23.6)
    expect(instrumentAnswer(v, 23.45, -0.15)).toBe('Reading: 23.45 mm, zero error: −0.15 mm\nCorrected reading: 23.60 mm')
  })

  it('pick random readings on the grid', () => {
    const v = caliperScale('0.02')
    const r = randomReading(v, 0, () => 0.5)
    expect(r).toBe(75)
    expect(randomReading(v, 0, () => 0.123)).toBe(tidyReading(v, 0, 150 * (0.1 + 0.123 * 0.8)))
  })
})

describe('the drawn caliper', () => {
  it('holds an object as wide as the reading less the zero error', () => {
    const v = caliperScale('0.05')
    for (const zero of [0, 0.25, -0.3]) {
      const reading = 23.45
      const at = caliperLayout(v, reading, reading - zero, 'block')
      expect(at.object.width).toBeCloseTo((reading - zero) * PX, 9)
      expect(at.object.left).toBe(at.face)
      expect(at.slider.left - at.face).toBeCloseTo((reading - zero) * PX, 9)
      // the sliding scale's zero is at the reading on the main scale
      expect(at.slideZero).toBeCloseTo(at.xOf(reading), 9)
    }
  })

  it('closes its jaws with the sliding scale zero at the zero error', () => {
    const v = caliperScale('0.1')
    const at = caliperLayout(v, 0.2, 0)
    expect(at.slider.left).toBe(at.face)
    expect(at.slideZero).toBeCloseTo(at.xOf(0.2), 9)
  })

  it('moves down to fit a ball bigger than its jaws', () => {
    const v = caliperScale('0.1')
    const at = caliperLayout(v, 140, 140, 'ball')
    expect(at.object.top).toBeGreaterThanOrEqual(0)
    expect(at.height).toBeGreaterThanOrEqual(at.object.bottom)
  })

  it('shows the whole sliding scale in its strip', () => {
    for (const lc of LEAST_COUNTS) {
      const v = caliperScale(lc)
      for (const reading of [0.35, 23.46, 99.9, 150]) {
        const r = tidyReading(v, 0, reading)
        const at = caliperLayout(v, r, r)
        const strip = stripSource(v, at, r, true)
        expect(strip.x).toBeLessThan(at.xOf(r))
        expect(strip.x + strip.width).toBeGreaterThan(at.xOf(r + v.length))
      }
    }
  })
})

