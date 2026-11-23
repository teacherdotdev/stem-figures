import { describe, expect, it } from 'vitest'
import { quotient, rateConstant, run, settle, SETTLED, type Stress } from './model'
import { REACTIONS, signed } from './reactions'

const AMMONIA = [-1, -3, 2]
const HI = [-1, -1, 2]
const N2O4 = [-1, 2]
const spec = (coefs: number[], start: number[], k: number, stresses: Stress[] = [], established = 4) => ({ coefs, start, k, established, stresses })
const close = (a: number, b: number, rel = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(rel * Math.max(Math.abs(a), Math.abs(b), 1e-12))

describe('where a reaction settles', () => {
  it('finds Q = K to 1 part in a million for every setup, from K = 10⁻⁴ to 10⁴', () => {
    for (const rx of REACTIONS) {
      const coefs = rx.species.map(signed)
      for (const k of [1e-4, 1e-2, rx.k, 1, 1e2, 1e4]) {
        const { equilibrium } = settle(rx.start, coefs, k)
        close(quotient(equilibrium, coefs), k)
        for (const c of equilibrium) expect(c).toBeGreaterThan(0)
      }
    }
  })

  it('matches a hand-worked ICE table: H₂ + I₂ ⇌ 2HI from 1.00 M each with K = 49', () => {
    // (2x)² / (1 − x)² = 49, so 2x / (1 − x) = 7 and x = 7/9
    const { xi, equilibrium } = settle([1, 1, 0], HI, 49)
    expect(xi.toPrecision(3)).toBe('0.778')
    expect(equilibrium.map((c) => c.toPrecision(3))).toEqual(['0.222', '0.222', '1.56'])
  })

  it('runs backwards from products alone, and not at all from equilibrium or with nothing to react', () => {
    expect(settle([0, 0, 2], HI, 49).xi).toBeLessThan(0)
    close(quotient(settle([0, 0, 2], HI, 49).equilibrium, HI), 49)
    const eq = settle([1, 1, 0], HI, 49).equilibrium
    expect(Math.abs(settle(eq, HI, 49).xi)).toBeLessThan(1e-12)
    expect(settle([1, 0, 0], HI, 49)).toEqual({ xi: 0, equilibrium: [1, 0, 0] })
    expect(run(spec(HI, [1, 0, 0], 49), 10).reacts).toBe(false)
  })
})

describe('how it gets there', () => {
  it('comes within 1% of equilibrium at the time given, for every setup', () => {
    for (const rx of REACTIONS) {
      const coefs = rx.species.map(signed)
      const [first] = run(spec(coefs, [...rx.start], rx.k, [], 5), 20).stretches
      expect(first.settledAt).toBeCloseTo(5, 3)
      const at5 = first.samples.find((p) => Math.abs(p.t - 5) < 1e-9)!
      const whole = Math.abs(first.equilibrium[0] - first.start[0])
      expect(Math.abs(at5.c[0] - first.equilibrium[0]) / whole).toBeCloseTo(SETTLED, 3)
      // …and by the end it's level, at Q = K
      close(quotient(first.end, coefs), rx.k)
    }
  })

  it('moves every line in the ratio of the coefficients, between any two times', () => {
    const [first] = run(spec(AMMONIA, [1, 3, 0], 0.5), 12).stretches
    for (const [a, b] of [[0, 40], [10, 200], [100, 350], [3, 4]]) {
      const d = first.samples[b].c.map((c, i) => c - first.samples[a].c[i])
      close(d[1] / d[0], 3, 1e-9)
      close(d[2] / d[0], -2, 1e-9)
    }
  })

  it('approaches steadily, never past equilibrium, for K from 10⁻⁴ to 10⁴', () => {
    for (const rx of REACTIONS) {
      const coefs = rx.species.map(signed)
      for (const k of [1e-4, 1e-2, 1, 1e2, 1e4]) {
        const [first] = run(spec(coefs, [...rx.start], k), 40).stretches
        const product = coefs.length - 1
        for (let j = 1; j < first.samples.length; j++) {
          expect(first.samples[j].c[product]).toBeGreaterThanOrEqual(first.samples[j - 1].c[product] - 1e-12)
          expect(first.samples[j].c[product]).toBeLessThanOrEqual(first.equilibrium[product] + 1e-12)
          for (const c of first.samples[j].c) expect(c).toBeGreaterThanOrEqual(0)
        }
        expect(first.settledAt).toBeCloseTo(4, 3)
        // (at K = 10⁴ a reactant nearly runs out, and the last of the approach is slow)
        close(quotient(first.end, coefs), k, 1e-4)
      }
    }
  })

  it('gives the same curve whatever the sampling: the end of the axis doesn’t move it', () => {
    const short = run(spec(AMMONIA, [1, 3, 0], 0.5), 6).stretches[0]
    const long = run(spec(AMMONIA, [1, 3, 0], 0.5), 60).stretches[0]
    const at = (st: typeof short, t: number) => st.samples.find((p) => Math.abs(p.t - t) < 1e-9)!.c[2]
    close(at(short, 3), at(long, 3), 1e-7)
  })

  it('sets a rate from a small push when the mixture starts at equilibrium', () => {
    const eq = settle([1, 3, 0], AMMONIA, 0.5).equilibrium
    expect(rateConstant(eq, AMMONIA, 0.5, 4)).toBeGreaterThan(0)
    const { stretches } = run(spec(AMMONIA, eq, 0.5, [{ kind: 'add', at: 2, species: 0, amount: 0.5 }]), 12)
    expect(stretches[0].shift).toBe('none')
    expect(stretches[1].shift).toBe('forward')
    expect(stretches[1].settledAt).not.toBeNull()
  })
})

describe('stresses', () => {
  const settled = (stresses: Stress[], coefs = AMMONIA, start = [1, 3, 0], k = 0.5) => run(spec(coefs, start, k, stresses), 40).stretches

  it('adding a reactant: its line alone jumps, the system shifts forward, and it ends above where it was', () => {
    const [before, after] = settled([{ kind: 'add', at: 10, species: 0, amount: 0.5 }])
    close(after.start[0], before.end[0] + 0.5, 1e-12)
    expect(after.start.slice(1)).toEqual(before.end.slice(1))
    expect(after.shift).toBe('forward')
    expect(after.equilibrium[0]).toBeLessThan(after.start[0])
    expect(after.equilibrium[0]).toBeGreaterThan(before.equilibrium[0])
    expect(after.equilibrium[1]).toBeLessThan(before.equilibrium[1])
    expect(after.equilibrium[2]).toBeGreaterThan(before.equilibrium[2])
    close(quotient(after.end, AMMONIA), 0.5)
  })

  it('adding a product shifts it back; removing a product shifts it forward', () => {
    const added = settled([{ kind: 'add', at: 10, species: 2, amount: 0.5 }])[1]
    expect(added.shift).toBe('reverse')
    expect(added.equilibrium[2]).toBeGreaterThan(added.start[2] - 0.5)
    const removed = settled([{ kind: 'remove', at: 10, species: 2, amount: 0.5 }])
    close(removed[1].start[2], removed[0].end[2] - 0.5, 1e-12)
    expect(removed[1].shift).toBe('forward')
    expect(removed[1].equilibrium[2]).toBeLessThan(removed[0].equilibrium[2])
    expect(removed[1].short).toBe(0)
  })

  it('removing more than is there takes it all, and says how much was missing', () => {
    const [before, after] = settled([{ kind: 'remove', at: 10, species: 2, amount: 5 }])
    expect(after.start[2]).toBe(0)
    close(after.short, 5 - before.end[2], 1e-9)
    expect(after.shift).toBe('forward')
  })

  it('halving the volume doubles every concentration, then shifts to the side with fewer moles', () => {
    const [before, after] = settled([{ kind: 'volume', at: 10, factor: 0.5 }])
    after.start.forEach((c, i) => close(c, 2 * before.end[i], 1e-12))
    expect(after.shift).toBe('forward') // 4 moles of gas → 2
    expect(after.equilibrium[2]).toBeGreaterThan(after.start[2])
    close(quotient(after.end, AMMONIA), 0.5)

    const n2o4 = settled([{ kind: 'volume', at: 10, factor: 0.5 }], N2O4, [1, 0], 0.2)[1]
    expect(n2o4.shift).toBe('reverse') // 1 mole ← 2
    const doubled = settled([{ kind: 'volume', at: 10, factor: 2 }], N2O4, [1, 0], 0.2)
    doubled[1].start.forEach((c, i) => close(c, doubled[0].end[i] / 2, 1e-12))
    expect(doubled[1].shift).toBe('forward')
  })

  it('a volume change with equal moles on both sides jumps and then stays flat', () => {
    const [before, after] = settled([{ kind: 'volume', at: 10, factor: 0.5 }], HI, [1, 0.8, 0], 10)
    after.start.forEach((c, i) => close(c, 2 * before.end[i], 1e-12))
    expect(after.shift).toBe('none')
    expect(after.samples.every((p) => p.c.every((c, i) => c === after.start[i]))).toBe(true)
  })

  it('a temperature change has no jump: K changes and every line turns a corner', () => {
    // heating an exothermic reaction halves K
    const [before, after] = settled([{ kind: 'temperature', at: 10, kFactor: 0.5, speed: 2 }])
    expect(after.start).toEqual(before.end)
    expect(after.k).toBe(0.25)
    expect(after.shift).toBe('reverse')
    close(quotient(after.end, AMMONIA), 0.25)
    // …and it gets there sooner than the first approach did
    expect(after.settledAt! - after.from).toBeLessThan(before.settledAt!)
    // cooling it doubles K and is slower
    const cooled = settled([{ kind: 'temperature', at: 10, kFactor: 2, speed: 0.5 }])[1]
    expect(cooled.shift).toBe('forward')
    close(quotient(cooled.end, AMMONIA), 1)
    expect(cooled.settledAt! - cooled.from).toBeGreaterThan(after.settledAt! - after.from)
  })

  it('keeps every atom: 2[N₂] + [NH₃] and 2[H₂] + 3[NH₃] change only when something is added, and scale with the volume', () => {
    const n = (c: number[]) => 2 * c[0] + c[2]
    const h = (c: number[]) => 2 * c[1] + 3 * c[2]
    const stretches = settled([
      { kind: 'add', at: 8, species: 0, amount: 0.5 },
      { kind: 'volume', at: 16, factor: 0.5 },
      { kind: 'temperature', at: 24, kFactor: 0.5, speed: 2 },
    ])
    expect(stretches).toHaveLength(4)
    for (const st of stretches) {
      for (const p of st.samples) {
        close(n(p.c), n(st.start), 1e-9)
        close(h(p.c), h(st.start), 1e-9)
      }
    }
    const [a, b, c, d] = stretches
    close(n(b.start), n(a.end) + 1, 1e-12)
    close(h(b.start), h(a.end), 1e-12)
    close(n(c.start), 2 * n(b.end), 1e-12)
    close(h(c.start), 2 * h(b.end), 1e-12)
    close(n(d.start), n(c.end), 1e-12)
    // every level stretch gives the K it should
    close(quotient(a.end, AMMONIA), 0.5)
    close(quotient(b.end, AMMONIA), 0.5)
    close(quotient(c.end, AMMONIA), 0.5)
    close(quotient(d.end, AMMONIA), 0.25)
  })

  it('takes stresses in order of time, and leaves out one before 0 or past the end', () => {
    const { stretches } = run(spec(AMMONIA, [1, 3, 0], 0.5, [
      { kind: 'volume', at: 20, factor: 0.5 },
      { kind: 'add', at: 10, species: 0, amount: 0.5 },
      { kind: 'add', at: 0, species: 0, amount: 0.5 },
      { kind: 'add', at: 50, species: 0, amount: 0.5 },
    ]), 30)
    expect(stretches.map((st) => [st.from, st.to])).toEqual([[0, 10], [10, 20], [20, 30]])
    expect(stretches[0].samples[0].t).toBe(0)
    expect(stretches[2].samples.at(-1)!.t).toBe(30)
  })

  it('starts each shift from a true equilibrium once the stretch before has settled, and from where it is when it hasn’t', () => {
    const [settledFirst, after] = settled([{ kind: 'add', at: 6, species: 0, amount: 0.5 }])
    expect(settledFirst.end).toEqual(settledFirst.equilibrium)
    expect(after.start.slice(1)).toEqual(settledFirst.equilibrium.slice(1))
    const [early] = settled([{ kind: 'add', at: 2, species: 0, amount: 0.5 }])
    expect(early.settledAt).toBeNull()
    expect(early.end[2]).toBeLessThan(early.equilibrium[2] * 0.99)
  })

  it('says when a stretch ends before it has settled', () => {
    const { stretches } = run(spec(AMMONIA, [1, 3, 0], 0.5, [{ kind: 'add', at: 2, species: 0, amount: 0.5 }]), 3)
    expect(stretches[0].settledAt).toBeNull()
    expect(stretches[1].settledAt).toBeNull()
  })
})
