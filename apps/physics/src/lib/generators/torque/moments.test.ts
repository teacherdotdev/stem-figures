import { describe, expect, test } from 'vitest'
import { answerLines, balancingValue, forcesOf, num, pivotSums, twoSums, verdict, wallSums, weightOf, whereText } from './moments'
import { converted, inUnit, newLoad, resized, torqueSettings, type Load, type TorqueSettings } from './settings'

const settings = (over: Partial<TorqueSettings> = {}): TorqueSettings => torqueSettings.clean({ ...torqueSettings.defaults, ...over })
const at = (position: number, value: number, kind: Load['kind'] = 'hanging'): Load => newLoad(position, value, kind)

describe('a pivot', () => {
  test('the default figure balances: 6 N 0.2 m left of the pivot, 3 N 0.4 m right of it', () => {
    const p = pivotSums(settings())
    expect(p.counterclockwise).toBeCloseTo(1.2, 9)
    expect(p.clockwise).toBeCloseTo(1.2, 9)
    expect(p.balanced).toBe(true)
    expect(p.pivotForce).toBeCloseTo(9, 9)
    expect(answerLines(settings())).toEqual([
      'Load 1: 6 N × 0.2 m = 1.2 N·m counterclockwise',
      'Load 2: 3 N × 0.4 m = 1.2 N·m clockwise',
      'Clockwise 1.2 N·m, counterclockwise 1.2 N·m',
      'Balanced: the clockwise and counterclockwise torques are equal',
      'Force at the pivot = 9 N up',
    ])
  })

  test('an unbalanced beam gives its net torque and which way it turns', () => {
    const s = settings({ loads: [at(0.3, 6), at(1, 3)] })
    const p = pivotSums(s)
    expect(p.balanced).toBe(false)
    expect(p.net).toBeCloseTo(0.3, 9)
    expect(answerLines(s).at(-1)).toBe('Not balanced: net torque 0.3 N·m clockwise')
    expect(verdict(s)).toEqual({ text: 'Net torque 0.3 N·m clockwise', warning: false })
  })

  test('mirrored, clockwise and counterclockwise swap, as do left and right', () => {
    const s = settings({ loads: [at(0.3, 6), at(1, 3)], mirror: true })
    expect(answerLines(s)).toContain('Load 1: 6 N × 0.2 m = 1.2 N·m clockwise')
    expect(answerLines(s).at(-1)).toBe('Not balanced: net torque 0.3 N·m counterclockwise')
    expect(whereText(s, 0)).toBe('0.3 m from the right end · 0.2 m right of the pivot')
    expect(whereText(settings(), 0)).toBe('0.3 m from the left end · 0.2 m left of the pivot')
  })

  test('a force up turns the beam the other way from a force down at the same place', () => {
    // 8 N down 0.4 m left of the pivot: 3.2 N·m counterclockwise. 8 N up 0.4 m right of it: 3.2 N·m counterclockwise too.
    const s = settings({ loads: [at(0.1, 8), at(0.9, 8, 'up')] })
    const p = pivotSums(s)
    expect(p.counterclockwise).toBeCloseTo(6.4, 9)
    expect(p.clockwise).toBe(0)
    expect(p.pivotForce).toBeCloseTo(0, 9)
    expect(answerLines(s)[1]).toBe('Load 2 (up): 8 N × 0.4 m = 3.2 N·m counterclockwise')
    // A force up where a force down is cancels it; up on the left of the pivot turns the beam clockwise.
    expect(pivotSums(settings({ loads: [at(0.1, 8), at(0.1, 8, 'up')] })).balanced).toBe(true)
    expect(pivotSums(settings({ loads: [at(0.3, 5, 'up')] })).clockwise).toBeCloseTo(1, 9)
  })

  test('the beam’s weight acts at its middle: a metre rule on a pivot at 30 cm balanced by 10 N at 10 cm', () => {
    const s = settings({ pivot: 0.3, beamWeight: 10, loads: [at(0.1, 10)] })
    const p = pivotSums(s)
    expect(p.clockwise).toBeCloseTo(2, 9)
    expect(p.counterclockwise).toBeCloseTo(2, 9)
    expect(p.balanced).toBe(true)
    expect(p.pivotForce).toBeCloseTo(20, 9)
    expect(answerLines(s)).toContain('Beam (at its middle): 10 N × 0.2 m = 2 N·m clockwise')
    // A light beam has no weight at all.
    expect(forcesOf(settings()).some((f) => f.of === 'beam')).toBe(false)
  })

  test('a load at the pivot has no torque', () => {
    const s = settings({ loads: [at(0.5, 6), at(0.3, 2), at(0.7, 2)] })
    expect(answerLines(s)[0]).toBe('Load 1: at the pivot, no torque')
    expect(pivotSums(s).balanced).toBe(true)
  })

  test('nearly equal totals, as rounded values leave, count as balanced; a real difference doesn’t', () => {
    // 3.33 N × 0.3 m = 0.999 N·m against 10 N × 0.1 m = 1 N·m
    expect(pivotSums(settings({ loads: [at(0.2, 3.33), at(0.6, 10)] })).balanced).toBe(true)
    expect(pivotSums(settings({ loads: [at(0.2, 3.2), at(0.6, 10)] })).balanced).toBe(false)
  })

  test('loads past the end of a shortened beam act at its end', () => {
    const s = settings({ length: 0.8, pivot: 0.4, loads: [at(0.2, 4), at(0.9, 4)] })
    const f = forcesOf(s)
    expect(f[1]).toMatchObject({ x: 0.8, clamped: true })
    expect(pivotSums(s).net).toBeCloseTo(4 * 0.4 - 4 * 0.2, 9)
  })
})

describe('masses', () => {
  test('a mass in kg weighs m × g with each g', () => {
    expect(weightOf(2, { unit: 'kg', g: '9.8' })).toBeCloseTo(19.6, 9)
    expect(weightOf(2, { unit: 'kg', g: '9.81' })).toBeCloseTo(19.62, 9)
    expect(weightOf(2, { unit: 'kg', g: '10' })).toBeCloseTo(20, 9)
    expect(weightOf(500, { unit: 'g', g: '9.8' })).toBeCloseTo(4.9, 9)
    expect(weightOf(6, { unit: 'N', g: '10' })).toBe(6)
  })

  test('the working turns masses into weights first, with the g it was given', () => {
    const s = settings({ unit: 'kg', g: '9.81', loads: [at(0.3, 2), at(0.9, 1)] })
    const lines = answerLines(s)
    expect(lines[0]).toBe('Weight = mass × g, with g = 9.81 N/kg: Load 1 2 kg → 19.62 N, Load 2 1 kg → 9.81 N')
    expect(lines[1]).toBe('Load 1: 19.62 N × 0.2 m = 3.924 N·m counterclockwise')
    expect(lines[2]).toBe('Load 2: 9.81 N × 0.4 m = 3.924 N·m clockwise')
    expect(pivotSums(s).balanced).toBe(true)
    const tenG = answerLines(settings({ unit: 'kg', g: '10', loads: [at(0.3, 2), at(0.9, 1)] }))
    expect(tenG[1]).toBe('Load 1: 20 N × 0.2 m = 4 N·m counterclockwise')
  })

  test('in cm the torques are in N·cm', () => {
    const s = settings({ length: 100, lengthUnit: 'cm', pivot: 50, loads: [at(30, 6), at(90, 3)] })
    expect(answerLines(s)[0]).toBe('Load 1: 6 N × 20 cm = 120 N·cm counterclockwise')
  })
})

describe('balance with this load', () => {
  test('gives the value that balances the beam', () => {
    expect(balancingValue(settings({ loads: [at(0.3, 1), at(0.9, 3)] }), 0)).toBe(6)
    expect(balancingValue(settings({ loads: [at(0.3, 6), at(0.9, 1)] }), 1)).toBe(3)
    // In kg: 1.2 N·m ÷ 0.4 m = 3 N, which is 3 ÷ 9.8 kg.
    expect(balancingValue(settings({ unit: 'kg', loads: [at(0.3, 6 / 9.8), at(0.9, 1)] }), 1)).toBe(0.31)
    expect(balancingValue(settings({ unit: 'g', loads: [at(0.3, 200), at(0.9, 1)] }), 1)).toBe(100)
  })

  test('rounds to hundredths, which still counts as balanced', () => {
    const s = settings({ loads: [at(0.2, 1), at(0.6, 10)] })
    const v = balancingValue(s, 0)!
    expect(v).toBe(3.33)
    expect(pivotSums(settings({ loads: [at(0.2, v), at(0.6, 10)] })).balanced).toBe(true)
  })

  test('works for a force up, and counts the beam’s weight', () => {
    expect(balancingValue(settings({ loads: [at(0.9, 6), at(0.7, 1, 'up')] }), 1)).toBe(12)
    expect(balancingValue(settings({ pivot: 0.3, beamWeight: 10, loads: [at(0.1, 1)] }), 0)).toBe(10)
  })

  test('is off for a load at the pivot, one that would have to be negative, and on other supports', () => {
    expect(balancingValue(settings({ loads: [at(0.5, 1), at(0.9, 3)] }), 0)).toBeNull()
    // Both on the right: no weight on the right balances another on the right.
    expect(balancingValue(settings({ loads: [at(0.7, 1), at(0.9, 3)] }), 0)).toBeNull()
    expect(balancingValue(settings({ support: 'two' }), 0)).toBeNull()
  })
})

describe('two supports', () => {
  test('a 4 m plank on supports at its ends: torques about A, then forces up = forces down', () => {
    // F_B × 4 = 600 × 1 + 200 × 2 = 1000, so F_B = 250 N and F_A = 800 − 250 = 550 N.
    const s = settings({ support: 'two', length: 4, supportA: 0, supportB: 4, beamWeight: 200, loads: [at(1, 600)] })
    const t = twoSums(s)
    expect(t.forceB).toBeCloseTo(250, 9)
    expect(t.forceA).toBeCloseTo(550, 9)
    expect(t.forceA + t.forceB).toBeCloseTo(800, 9)
    expect(t.negative).toBeNull()
    expect(answerLines(s)).toEqual([
      'Torques about A: F_B × 4 m = 600 N × 1 m + 200 N × 2 m = 1000 N·m',
      'F_B = 1000 N·m ÷ 4 m = 250 N',
      'Forces up = forces down: F_A = 800 N − 250 N = 550 N',
    ])
    expect(verdict(s)).toEqual({ text: 'F_A = 550 N, F_B = 250 N', warning: false })
  })

  test('the forces always add up to the total weight', () => {
    const s = settings({ support: 'two', length: 5, supportA: 1, supportB: 3.5, beamWeight: 40, loads: [at(0.2, 30), at(2, 12), at(4.6, 7)] })
    const t = twoSums(s)
    expect(t.forceA + t.forceB).toBeCloseTo(89, 9)
  })

  test('a load past B that makes F_A negative warns that the beam would tip about B', () => {
    // F_B × 2 = 300 × 4, so F_B = 600 N and F_A = 300 − 600 = −300 N.
    const s = settings({ support: 'two', length: 4, supportA: 0, supportB: 2, loads: [at(4, 300)] })
    const t = twoSums(s)
    expect(t.forceA).toBeCloseTo(-300, 9)
    expect(t.negative).toBe('A')
    expect(answerLines(s).at(-1)).toBe('F_A comes out negative: the beam would tip about B')
    expect(verdict(s).warning).toBe(true)
  })

  test('supports at the same place can’t be solved', () => {
    const s = settings({ support: 'two', supportA: 0.5, supportB: 0.5 })
    expect(twoSums(s).together).toBe(true)
    expect(verdict(s).warning).toBe(true)
  })
})

describe('a wall', () => {
  test('a hanging sign: T = Σ(W d) ÷ (d_c sin θ), worked by hand', () => {
    // A 2 m beam weighing 50 N with a 100 N sign at 1.5 m, and a cable at its end at 30°.
    // Torques about the wall: T sin 30° × 2 = 50 × 1 + 100 × 1.5 = 200, so T = 200 N.
    // The wall: 200 cos 30° = 173.2 N along the beam, and 150 − 200 sin 30° = 50 N up.
    const s = settings({ support: 'wall', length: 2, cableAt: 2, cableAngle: 30, beamWeight: 50, loads: [at(1.5, 100)] })
    const w = wallSums(s)
    expect(w.tension).toBeCloseTo(200, 9)
    expect(w.along).toBeCloseTo(173.205, 3)
    expect(w.up).toBeCloseTo(50, 9)
    expect(answerLines(s)).toEqual([
      'Torques about the wall (the left end): T × sin 30° × 2 m = 100 N × 1.5 m + 50 N × 1 m = 200 N·m',
      'T = 200 N·m ÷ (2 m × sin 30°) = 200 N',
      'Wall’s force along the beam = T cos 30° ≈ 173 N, away from the wall',
      'Wall’s force up = forces down − T sin 30° = 150 N − 100 N = 50 N up',
    ])
  })

  test('a cable at the wall can’t hold the beam, and one that would have to push warns', () => {
    expect(wallSums(settings({ support: 'wall', cableAt: 0 })).cableProblem).toBe('atWall')
    const push = settings({ support: 'wall', loads: [at(0.5, 5, 'up')] })
    expect(wallSums(push).cableProblem).toBe('push')
    expect(verdict(push).warning).toBe(true)
  })

  test('a cantilever: the wall holds the whole weight up and supplies the torque', () => {
    // 20 N at 0.5 m and 30 N at 1 m: 50 N up, and 10 + 30 = 40 N·m against the loads' clockwise turn.
    const s = settings({ support: 'wall', cable: false, loads: [at(0.5, 20), at(1, 30)] })
    const w = wallSums(s)
    expect(w.up).toBeCloseTo(50, 9)
    expect(w.moment).toBeCloseTo(40, 9)
    expect(answerLines(s)).toEqual(['Wall’s force up = forces down = 50 N', 'Torque the wall supplies = 20 N × 0.5 m + 30 N × 1 m = 40 N·m counterclockwise'])
    expect(answerLines({ ...s, mirror: true }).at(-1)).toMatch(/ clockwise$/)
  })
})

describe('fixes from review', () => {
  test('a cantilever with a force up subtracts it in the working', () => {
    const s = settings({ support: 'wall', cable: false, loads: [at(0.5, 10), at(1, 4, 'up')] })
    expect(answerLines(s)).toEqual(['Wall’s force up = forces down = 6 N', 'Torque the wall supplies = 10 N × 0.5 m − 4 N × 1 m = 1 N·m counterclockwise'])
  })

  test('a cantilever pushed up more than down has the wall’s force down, said as such', () => {
    const s = settings({ support: 'wall', cable: false, loads: [at(0.5, 10, 'up')] })
    expect(answerLines(s)[0]).toBe('Wall’s force down = forces up − forces down = 10 N')
    expect(verdict(s).text).toBe('Wall: 10 N down and 5 N·m of torque')
  })

  test('balanced only within what rounding values to the hundredth leaves', () => {
    // 6 N × 0.2 m = 1.2 N·m against 3.01 N × 0.4 m = 1.204 N·m: a real difference
    expect(pivotSums(settings({ loads: [at(0.3, 6), at(0.9, 3.01)] })).balanced).toBe(false)
    // in kg, half a hundredth of a kilogram is weighed with g
    expect(pivotSums(settings({ unit: 'kg', loads: [at(0.3, 3), at(0.9, 1.5)] })).balanced).toBe(true)
    expect(pivotSums(settings({ unit: 'kg', loads: [at(0.3, 3), at(0.9, 1.52)] })).balanced).toBe(false)
  })

  test('a load with no value has no torque, and no direction', () => {
    expect(answerLines(settings({ loads: [at(0.3, 0), at(0.9, 0)] }))[0]).toBe('Load 1: 0 N × 0.2 m = 0 N·m, no torque')
  })

  test('a beam too long or too short for the other unit stays as it is, with the reason', () => {
    const long = inUnit(settings({ length: 2, supportB: 2 }), 'cm')
    expect(long).toEqual({ problem: 'A 2 m beam is longer than 100 cm, so it can’t be set in cm. It stays in m.' })
    const short = inUnit(settings({ length: 5, lengthUnit: 'cm', pivot: 2.5, loads: [at(1, 6), at(4, 3)] }), 'm')
    expect(short).toEqual({ problem: 'A 5 cm beam is shorter than 0.1 m, so it can’t be set in m. It stays in cm.' })
    const ok = inUnit(settings(), 'cm')
    expect(ok).toMatchObject({ changes: { lengthUnit: 'cm', length: 100, pivot: 50 } })
  })
})

describe('numbers and places', () => {
  test('worked-out numbers keep up to 4 significant figures, and round to 3 past that', () => {
    expect(num(1.2)).toBe('1.2')
    expect(num(0.1 + 0.2)).toBe('0.3')
    expect(num(3.924)).toBe('3.924')
    expect(num(173.20508)).toBe('173')
    expect(num(1000)).toBe('1000')
    expect(num(0.0012345)).toBe('0.00123')
  })

  test('a longer beam keeps the pivot at its middle and supports at its end', () => {
    expect(resized({ pivot: 0.5, supportA: 0, supportB: 1, cableAt: 1 }, 1, 3)).toEqual({ pivot: 1.5, supportA: 0, supportB: 3, cableAt: 3 })
    expect(resized({ pivot: 0.3, supportA: 0.2, supportB: 0.8, cableAt: 0.6 }, 1, 3)).toEqual({ pivot: 0.3, supportA: 0.2, supportB: 0.8, cableAt: 0.6 })
  })

  test('changing m to cm multiplies every place by 100, when the beam fits', () => {
    const c = converted(settings(), 100)!
    expect(c.length).toBe(100)
    expect(c.pivot).toBe(50)
    expect(c.loads.map((l) => l.position)).toEqual([30, 90])
    expect(converted(settings({ length: 2 }), 100)).toBeNull()
  })

  test('an old link with a load row missing its later fields still reads', () => {
    const s = torqueSettings.fromParams(new URLSearchParams('loads=resting,0.25,4;up,0.75,2'))
    expect(s.loads).toHaveLength(2)
    expect(s.loads[0]).toMatchObject({ kind: 'resting', position: 0.25, value: 4, shape: 'block', size: 1, label: { mode: 'text', text: '' } })
    expect(s.loads[1]).toMatchObject({ kind: 'up', position: 0.75, value: 2 })
  })

  test('a typed label, a blank one and an empty one each survive a link', () => {
    const s = settings({ loads: [{ ...at(0.3, 6), label: { mode: 'text', text: 'm_1' } }, { ...at(0.9, 3), label: { mode: 'blank', text: '' } }, at(0.5, 1)] })
    const back = torqueSettings.fromParams(new URLSearchParams(torqueSettings.toQuery(s)))
    expect(back.loads.map((l) => l.label)).toEqual([
      { mode: 'text', text: 'm_1' },
      { mode: 'blank', text: '' },
      { mode: 'text', text: '' },
    ])
  })
})
