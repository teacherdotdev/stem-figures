import { describe, expect, it } from 'vitest'
import { energyAt, fromPm, samples, toPm, wallAt, zeroCrossing } from './morse'

// A spread of bond lengths (pm, Å, nm sized numbers) and bond energies.
const BONDS: [number, number][] = [[150, 300], [74, 436], [10, 1], [1000, 2000], [1.2, 498], [0.11, 945], [267, 151]]

describe('the bond energy curve', () => {
  it('has its minimum at the bond length, at minus the bond energy', () => {
    for (const [r0, D] of BONDS) {
      expect(energyAt(r0, r0, D)).toBe(-D)
      // Nowhere lower, however finely it's looked at.
      for (let k = 1; k <= 4000; k++) {
        const r = (r0 * k) / 500
        if (r !== r0) expect(energyAt(r, r0, D), `${r0}, ${D} at ${r}`).toBeGreaterThan(-D)
      }
      // And just either side of it, the same height: a level bottom.
      expect(energyAt(r0 * 1.0001, r0, D) / D).toBeCloseTo(-1, 6)
      expect(energyAt(r0 * 0.9999, r0, D) / D).toBeCloseTo(-1, 6)
    }
  })

  it('tends to 0 from below as the atoms separate', () => {
    for (const [r0, D] of BONDS) {
      expect(energyAt(2 * r0, r0, D) / D).toBeCloseTo(-0.0971, 4)
      expect(energyAt(3 * r0, r0, D) / D).toBeCloseTo(-0.00495, 5)
      expect(Math.abs(energyAt(10 * r0, r0, D) / D)).toBeLessThan(1e-7)
      expect(energyAt(10 * r0, r0, D)).toBeLessThan(0)
      expect(energyAt(20 * r0, r0, D)).toBeLessThanOrEqual(0)
    }
  })

  it('rises all the way from the bond length outward without passing 0', () => {
    for (const [r0, D] of BONDS) {
      let before = -D
      for (let k = 1; k <= 2000; k++) {
        const e = energyAt(r0 * (1 + k / 200), r0, D)
        expect(e).toBeGreaterThanOrEqual(before)
        expect(e).toBeLessThanOrEqual(0)
        before = e
      }
    }
  })

  it('crosses 0 at about 0.77 of the bond length and climbs steeply inside it', () => {
    for (const [r0, D] of BONDS) {
      expect(zeroCrossing(r0) / r0).toBeCloseTo(0.769, 3)
      expect(energyAt(zeroCrossing(r0), r0, D) / D).toBeCloseTo(0, 9)
      expect(energyAt(0.4 * r0, r0, D) / D).toBeCloseTo(24.5, 1)
      // Falling all the way down the wall to the minimum.
      let before = Infinity
      for (let k = 0; k <= 200; k++) {
        const e = energyAt((r0 * k) / 200, r0, D)
        expect(e).toBeLessThan(before)
        before = e
      }
      // And finite even with the nuclei on top of each other.
      expect(Number.isFinite(energyAt(0, r0, D))).toBe(true)
    }
  })

  it('finds the point on the wall at a given energy', () => {
    for (const [r0, D] of BONDS) {
      for (const e of [-D, -D / 2, 0, D / 4, 3 * D]) {
        const r = wallAt(e, r0, D)
        expect(r).toBeLessThanOrEqual(r0)
        expect(energyAt(r, r0, D) / D).toBeCloseTo(e / D, 9)
      }
      expect(wallAt(0, r0, D)).toBeCloseTo(zeroCrossing(r0), 12)
    }
  })

  it('samples the curve with the bond length itself one of the points', () => {
    for (const [r0, D] of BONDS) {
      const pts = samples(r0, D, 0.31 * r0, 3.07 * r0)
      expect(pts).toHaveLength(401)
      expect(pts[0].x).toBe(0.31 * r0)
      expect(pts.at(-1)!.x).toBe(3.07 * r0)
      const lowest = pts.reduce((a, b) => (b.y < a.y ? b : a))
      expect(lowest).toEqual({ x: r0, y: -D })
      for (let k = 1; k < pts.length; k++) expect(pts[k].x).toBeGreaterThan(pts[k - 1].x)
    }
    // A stretch that doesn't reach the bond length is sampled evenly.
    expect(samples(150, 300, 200, 400, 4).map((p) => p.x)).toEqual([200, 250, 300, 350, 400])
    expect(samples(150, 300, 400, 400)).toEqual([])
  })

  it('writes a length in pm, Å or nm', () => {
    expect([fromPm(150, 'pm'), fromPm(150, 'angstrom'), fromPm(150, 'nm')]).toEqual([150, 1.5, 0.15])
    expect([fromPm(74, 'angstrom'), fromPm(74, 'nm')]).toEqual([0.74, 0.074])
    expect([toPm(0.74, 'angstrom'), toPm(0.074, 'nm'), toPm(1.21, 'angstrom'), toPm(0.154, 'nm')]).toEqual([74, 74, 121, 154])
    for (let pm = 10; pm <= 1000; pm += 7) for (const u of ['angstrom', 'nm'] as const) expect(toPm(fromPm(pm, u), u)).toBe(pm)
  })
})
