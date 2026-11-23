import { describe, expect, it } from 'vitest'
import {
  ATM, SUBSTANCES, bendThrough, crossings, findSubstance, fromKelvin, fromPascal, phaseAt, slopesAtTriple, sublimationBend, toKelvin, toPascal,
  vaporPressure, vaporization, type Shape,
} from './phase'

/** A diagram's places as a test draws them: Your own substance's defaults, in °C and atm. */
function shapeOf(nbp?: number): Shape {
  const triple = { x: 20, y: 0.4 }
  const critical = { x: 140, y: 3 }
  const kVap = nbp === undefined ? 2 : bendThrough((nbp - triple.x) / (critical.x - triple.x), (1 - triple.y) / (critical.y - triple.y))!
  const partial = { triple, critical, corner: { x: 0, y: 0 }, top: 3.5, fusionTopX: 20 + (2 * 3.1) / 0.6, kVap }
  return { ...partial, kSub: sublimationBend(partial) }
}

describe('the substances', () => {
  it('has every 1 atm value checked against a source (see the comment on SUBSTANCES)', () => {
    // Each was read from the NIST Chemistry WebBook, or for water’s melting
    // point worked out from IAPWS R14-08(2011), on 2026-11-22. A value
    // added or changed in phase.ts fails here until it is checked and
    // changed here too.
    const atOneAtm = Object.fromEntries(SUBSTANCES.map((x) => [x.id, { nmp: x.nmp, nbp: x.nbp, sublimes: x.sublimes }]))
    expect(atOneAtm).toEqual({
      water: { nmp: 273.1525, nbp: 373.1243, sublimes: undefined },
      co2: { nmp: undefined, nbp: undefined, sublimes: 194.686 },
      nitrogen: { nmp: undefined, nbp: 77.355, sublimes: undefined },
      oxygen: { nmp: undefined, nbp: 90.1878, sublimes: undefined },
      argon: { nmp: undefined, nbp: 87.302, sublimes: undefined },
      methane: { nmp: undefined, nbp: 111.667, sublimes: undefined },
      ammonia: { nmp: undefined, nbp: 239.832, sublimes: undefined },
    })
  })

  it('has the triple and critical points the WebBook gives', () => {
    const points = Object.fromEntries(SUBSTANCES.map((x) => [x.id, [x.triple.T, x.triple.P, x.critical.T, x.critical.P]]))
    expect(points).toEqual({
      water: [273.16, 611.657, 647.096, 22.064e6],
      co2: [216.592, 517964, 304.1282, 7.3773e6],
      nitrogen: [63.151, 12519.8, 126.192, 3.3958e6],
      oxygen: [54.361, 146.278, 154.581, 5.043e6],
      argon: [83.8058, 68890.9, 150.687, 4.863e6],
      methane: [90.6941, 11696.1, 190.564, 4.5992e6],
      ammonia: [195.49, 6053.39, 405.56, 11.3634e6],
    })
  })

  it('leans only water’s fusion line left', () => {
    for (const x of SUBSTANCES) expect(x.fusion).toBe(x.id === 'water' ? 'left' : 'right')
  })

  it('makes sense of every substance: the critical point hotter and higher, 1 atm between them (or below the triple point), boiling between them', () => {
    for (const x of SUBSTANCES) {
      expect(x.critical.T).toBeGreaterThan(x.triple.T)
      expect(x.critical.P).toBeGreaterThan(x.triple.P)
      expect(x.critical.P).toBeGreaterThan(ATM)
      if (x.sublimes !== undefined) {
        expect(x.triple.P).toBeGreaterThan(ATM)
        expect(x.sublimes).toBeLessThan(x.triple.T)
      } else {
        expect(x.triple.P).toBeLessThan(ATM)
        expect(x.nbp!).toBeGreaterThan(x.triple.T)
        expect(x.nbp!).toBeLessThan(x.critical.T)
      }
    }
    // Water melts just below its triple point’s temperature, as its fusion line leans left.
    const water = findSubstance('water')!
    expect(water.nmp!).toBeLessThan(water.triple.T)
    expect(fromKelvin(water.nmp!, 'C').toFixed(2)).toBe('0.00')
    expect(fromKelvin(water.triple.T, 'C').toFixed(2)).toBe('0.01')
  })

  it('converts the units both ways', () => {
    expect(fromKelvin(373.15, 'C')).toBeCloseTo(100, 9)
    expect(toKelvin(-78.5, 'C')).toBeCloseTo(194.65, 9)
    expect(fromPascal(ATM, 'atm')).toBe(1)
    expect(fromPascal(ATM, 'kPa')).toBeCloseTo(101.325, 9)
    expect(toPascal(5.11, 'atm')).toBeCloseTo(5.11 * ATM, 6)
    expect(toPascal(12.5, 'kPa')).toBe(12500)
  })
})

describe('the phase boundaries', () => {
  it('runs the vaporization curve from the triple point to the critical point, rising all the way and ever more steeply', () => {
    const d = shapeOf()
    const pts = vaporization(d)
    expect(pts[0]).toEqual(d.triple)
    expect(pts.at(-1)!.x).toBeCloseTo(d.critical.x, 9)
    expect(pts.at(-1)!.y).toBeCloseTo(d.critical.y, 9)
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].x).toBeGreaterThan(pts[i - 1].x)
      expect(pts[i].y).toBeGreaterThan(pts[i - 1].y)
    }
    const slopes = pts.slice(1).map((p, i) => (p.y - pts[i].y) / (p.x - pts[i].x))
    for (let i = 1; i < slopes.length; i++) expect(slopes[i]).toBeGreaterThan(slopes[i - 1])
  })

  it('bends the vaporization curve to pass through a typed boiling point', () => {
    for (const nbp of [60, 75, 100]) expect(vaporPressure(shapeOf(nbp), nbp)).toBeCloseTo(1, 6)
  })

  it('finds no upward bend through a boiling point on or above the straight line', () => {
    expect(bendThrough(0.2, 0.3)).toBeNull()
    expect(bendThrough(0.3, 0.3)).toBeNull()
    expect(bendThrough(0.5, 0.2)).toBeGreaterThan(0)
  })

  it('makes the sublimation curve the steeper of the two at the triple point', () => {
    for (const nbp of [undefined, 60, 75, 100]) {
      const s = slopesAtTriple(shapeOf(nbp))
      expect(s.sublimation).toBeGreaterThan(s.vaporization)
    }
  })

  it('crosses 1 atm at the melting and boiling points above the triple point, and only the sublimation curve below it', () => {
    const d = shapeOf(75)
    const at1 = crossings(d, 1)
    expect(at1.map((c) => c.boundary)).toEqual(['fusion', 'vaporization'])
    expect(at1[0].x).toBeCloseTo(22, 9)
    expect(at1[1].x).toBeCloseTo(75, 6)
    // A triple point above 1 atm, as carbon dioxide’s: only the sublimation curve.
    const high = crossings({ ...d, triple: { x: 20, y: 1.5 } }, 1)
    expect(high.map((c) => c.boundary)).toEqual(['sublimation'])
    expect(high[0].x).toBeLessThan(20)
  })

  it('tells the phase either side of each boundary', () => {
    const d = shapeOf(75)
    // Either side of the fusion line at 2 atm, the vaporization curve at 75 °C and the sublimation curve at 10 °C.
    const melt = 20 + (2 * (2 - 0.4)) / 0.6
    expect(phaseAt(d, melt - 0.5, 2)).toBe('solid')
    expect(phaseAt(d, melt + 0.5, 2)).toBe('liquid')
    expect(phaseAt(d, 75, 1.05)).toBe('liquid')
    expect(phaseAt(d, 75, 0.95)).toBe('gas')
    const sub = crossings(d, 0.2)[0]
    expect(phaseAt(d, sub.x - 0.5, 0.2)).toBe('solid')
    expect(phaseAt(d, sub.x + 0.5, 0.2)).toBe('gas')
    expect(phaseAt(d, 150, 3.2)).toBe('supercritical')
    expect(phaseAt(d, 150, 2)).toBe('gas')
  })
})
