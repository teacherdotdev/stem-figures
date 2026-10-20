import { describe, expect, it } from 'vitest'
import { corrected, tidyReading, tidyZero } from './instrument'
import { AT, DIVISIONS, MICROMETER, MICROMETER_ESTIMATED, PX, magnifierSource, micrometerLayout, readingOf, thimbleMarks } from './micrometer'
import { answerLine, figureLabel, lengthSettings, workingLines } from './settings'

const round2 = (n: number) => Math.round(n * 100) / 100

describe('micrometers', () => {
  it('read the sleeve to the half mm and the thimble to 0.01 mm, at every reading', () => {
    for (let n = 0; n <= 2500; n++) {
      const reading = n / 100
      const { sleeve, thimble } = readingOf(reading)
      expect(sleeve, `${reading}`).toBe(Math.floor(n / 50) * 0.5)
      expect(thimble, `${reading}`).toBe(n % 50)
      expect(round2(sleeve + thimble * 0.01)).toBe(reading)
      // the thimble's mark on the datum line, and no other, sits at angle 0
      const on = thimbleMarks(reading).filter((m) => Math.abs(m.angle) < 1e-9)
      expect(on.map((m) => m.j)).toEqual([thimble])
    }
  })

  it('catch the half-mm traps', () => {
    expect(readingOf(5.49)).toEqual({ sleeve: 5, thimble: 49 })
    expect(readingOf(5.51)).toEqual({ sleeve: 5.5, thimble: 1 })
    expect(readingOf(5.5)).toEqual({ sleeve: 5.5, thimble: 0 })
  })

  it('estimate the tenths of a mark past the thimble mark below the datum line', () => {
    for (let n = 0; n <= 25000; n += 7) {
      const reading = n / 1000
      const { sleeve, thimble } = readingOf(reading)
      expect(sleeve, `${reading}`).toBe(Math.floor(n / 500) * 0.5)
      expect(thimble, `${reading}`).toBe(((n % 500) / 10))
    }
    expect(readingOf(7.384)).toEqual({ sleeve: 7, thimble: 38.4 })
    expect(readingOf(5.499)).toEqual({ sleeve: 5, thimble: 49.9 })
    expect(readingOf(5.501)).toEqual({ sleeve: 5.5, thimble: 0.1 })
    // the datum line 0.4 of the way from mark 38 to mark 39
    const marks = thimbleMarks(7.384)
    const at = (j: number) => marks.find((m) => m.j === j)!.angle
    expect(at(38)).toBeLessThan(0)
    expect(at(39)).toBeGreaterThan(0)
    expect(-at(38) / (at(39) - at(38))).toBeCloseTo(0.4, 9)
  })

  it('read a negative zero error as the thimble turned past zero', () => {
    expect(readingOf(-0.03)).toEqual({ sleeve: -0.5, thimble: 47 })
    expect(thimbleMarks(-0.03).find((m) => Math.abs(m.angle) < 1e-9)?.j).toBe(47)
  })

  it('show the front half of the thimble, bigger numbers above the datum line, bunching toward the edges', () => {
    const marks = thimbleMarks(7.38)
    expect(marks.length).toBeGreaterThan(DIVISIONS / 2 - 3)
    expect(marks.length).toBeLessThanOrEqual(DIVISIONS / 2)
    const at = (j: number) => marks.find((m) => m.j === j)!.angle
    expect(at(39)).toBeGreaterThan(0)
    expect(at(37)).toBeLessThan(0)
    // equal turns, unequal heights: sin is steeper near the datum than at the edges
    const height = (j: number) => AT.thimbleR * Math.sin(at(j))
    const nearGap = height(39) - height(38)
    const edgeGap = height(48) - height(47)
    expect(nearGap).toBeGreaterThan(2.5 * edgeGap)
  })
})

describe('the drawn micrometer', () => {
  it('holds an object as wide as the reading less the zero error', () => {
    for (const zero of [0, 0.03, -0.04]) {
      const reading = 7.38
      const at = micrometerLayout(reading, reading - zero, 'ball')
      expect(at.object.width).toBeCloseTo((reading - zero) * PX, 9)
      expect(at.face - at.x(0)).toBeCloseTo((reading - zero) * PX, 9)
      expect(at.edge).toBeCloseTo(at.xOf(reading), 9)
    }
  })

  it('is as wide at every reading, and its magnifier takes in the thimble edge', () => {
    const widths = [0, 12.5, 25].map((r) => micrometerLayout(r, r).width)
    expect(new Set(widths).size).toBe(1)
    const at = micrometerLayout(7.38, 7.38)
    const m = magnifierSource(at)
    expect(Math.abs(m.x - at.edge)).toBeLessThan(m.r / 2)
    expect(m.r).toBeGreaterThan(AT.thimbleR * PX)
  })
})

describe('Length Reading’s caliper and micrometer settings', () => {
  it('keep the ruler’s defaults and address', () => {
    expect(lengthSettings.defaults.instrument).toBe('ruler')
    expect(lengthSettings.toQuery(lengthSettings.defaults)).toBe('')
    expect(answerLine(lengthSettings.defaults)).toBe('Length: 4.37 cm')
  })

  it('round-trip through the address', () => {
    const s = {
      ...lengthSettings.defaults,
      instrument: 'micrometer' as const,
      micrometer: 5.51,
      micrometerZero: -0.02,
      jaws: 'wire' as const,
      jawsLabel: 'X',
      closeUp: 'magnifier' as const,
    }
    expect(lengthSettings.fromParams(new URLSearchParams(lengthSettings.toQuery(s)))).toEqual(s)
    const c = { ...lengthSettings.defaults, instrument: 'caliper' as const, leastCount: '0.02' as const, caliper: 41.38, caliperZero: -0.04 }
    expect(lengthSettings.fromParams(new URLSearchParams(lengthSettings.toQuery(c)))).toEqual(c)
  })

  it('tidy and clamp readings from the address', () => {
    const read = (q: string) => lengthSettings.fromParams(new URLSearchParams(q))
    expect(read('caliper=23.47').caliper).toBe(23.45)
    expect(read('caliper=400').caliper).toBe(150)
    expect(read('leastCount=0.1&caliper=12.345&caliperZero=0.22')).toMatchObject({ caliper: 12.3, caliperZero: 0.2 })
    expect(read('micrometer=7.384').micrometer).toBe(7.384)
    expect(read('micrometer=7.3846').micrometer).toBe(7.385)
    expect(read('micrometerRead=mark&micrometer=7.384').micrometer).toBe(7.38)
    expect(read('micrometerZero=0.013').micrometerZero).toBe(0.013)
    expect(read('micrometerRead=mark&micrometerZero=0.013').micrometerZero).toBe(0.01)
    expect(read('micrometer=40').micrometer).toBe(25)
    expect(read('micrometerZero=0.3').micrometerZero).toBe(0.05)
    expect(read('micrometerZero=0.04&micrometer=0.01').micrometer).toBe(0.04)
  })

  it('tidy zero errors on each instrument’s least count', () => {
    expect(tidyZero(MICROMETER, 0.034)).toBe(0.03)
    expect(tidyZero(MICROMETER, -0.2)).toBe(-0.05)
    expect(tidyReading(MICROMETER, 0, 5.505)).toBe(5.51)
    expect(corrected(MICROMETER, 5.51, -0.02)).toBe(5.53)
    expect(corrected(MICROMETER, 5.51, 0.03)).toBe(5.48)
    expect(tidyReading(MICROMETER_ESTIMATED, 0, 5.5054)).toBe(5.505)
    expect(corrected(MICROMETER_ESTIMATED, 7.384, -0.012)).toBe(7.396)
  })

  it('write the answer key and its working', () => {
    const d = lengthSettings.defaults
    const caliper = { ...d, instrument: 'caliper' as const }
    expect(answerLine(caliper)).toBe('Reading: 23.45 mm')
    expect(workingLines(caliper)).toEqual(['Reading: main scale 23 mm + sliding scale mark 9 × 0.05 mm = 23.45 mm'])
    expect(workingLines({ ...caliper, leastCount: '0.1', caliper: 12.3, caliperZero: -0.3 })).toEqual([
      'Reading: main scale 12 mm + sliding scale mark 3 × 0.1 mm = 12.3 mm',
      'Zero error (jaws closed): sliding scale mark 7 lines up, so −(10 − 7) × 0.1 mm = −0.3 mm',
      'Corrected reading: 12.3 mm − (−0.3 mm) = 12.6 mm',
    ])
    const micrometer = { ...d, instrument: 'micrometer' as const, micrometerRead: 'mark' as const, micrometer: 5.51, micrometerZero: -0.03 }
    expect(answerLine(micrometer)).toBe('Reading: 5.51 mm, zero error: −0.03 mm\nCorrected reading: 5.54 mm')
    expect(workingLines(micrometer)).toEqual([
      'Reading: sleeve 5.5 mm + thimble mark 1 × 0.01 mm = 5.51 mm',
      'Zero error (closed): the thimble’s 0 is 3 marks above the datum line, so −3 × 0.01 mm = −0.03 mm',
      'Corrected reading: 5.51 mm − (−0.03 mm) = 5.54 mm',
    ])
    expect(figureLabel(micrometer)).toBe('A micrometer reading 5.51 mm, holding a block, below the same micrometer closed, reading −0.03 mm')
    const estimated = { ...d, instrument: 'micrometer' as const, micrometer: 7.384, micrometerZero: -0.012 }
    expect(answerLine(estimated)).toBe('Reading: 7.384 mm, zero error: −0.012 mm\nCorrected reading: 7.396 mm')
    expect(workingLines(estimated)).toEqual([
      'Reading: sleeve 7.0 mm + thimble 38.4 marks × 0.01 mm = 7.384 mm',
      'Zero error (closed): the thimble’s 0 is 1.2 marks above the datum line, so −1.2 × 0.01 mm = −0.012 mm',
      'Corrected reading: 7.384 mm − (−0.012 mm) = 7.396 mm',
    ])
    // on a mark, the estimated digit is a 0
    expect(answerLine({ ...d, instrument: 'micrometer' as const, micrometer: 7.38 })).toBe('Reading: 7.380 mm')
  })
})
