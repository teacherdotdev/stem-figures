import { describe, expect, test } from 'vitest'
import { crosses, labelBox, overlaps, pt } from '$lib/shared/layout'
import { newLoad, torqueSettings, type Load, type TorqueSettings } from './settings'
import { BEAM, BEAM_LEFT, HEIGHT, MIN_WALL_BEAM, MOMENT_R, WALL_X, WIDTH, buildTorque, describe as describeFigure, suffixed } from './torque'

const settings = (over: Partial<TorqueSettings> = {}): TorqueSettings => torqueSettings.clean({ ...torqueSettings.defaults, ...over })
const fig = (over: Partial<TorqueSettings> = {}) => buildTorque(settings(over))
const at = (position: number, value: number, kind: Load['kind'] = 'hanging'): Load => newLoad(position, value, kind)
const boxOf = (l: { at: { x: number; y: number }; label: Parameters<typeof labelBox>[1] }) => labelBox(pt(l.at.x, l.at.y), l.label)

/** Every figure worth checking for crowding: each support, the extremes, typed and blank labels. */
const CASES: Partial<TorqueSettings>[] = [
  {},
  { loads: [at(0.95, 1), at(0.9, 2), at(0.8, 3, 'resting'), at(0.7, 4, 'down'), at(0.6, 5, 'up'), at(0.55, 6)], weightArrows: true, supportForces: true, lengthMark: true },
  { pivot: 0.1, loads: [at(0.95, 1, 'resting'), at(0.85, 2, 'down'), at(0.75, 3, 'up'), at(0.6, 4, 'down'), at(0.45, 5, 'resting'), at(0.3, 6, 'down')] },
  { pivot: 0, loads: [at(0.2, 6), at(0.5, 2, 'resting'), at(1, 1, 'down')], lengthMark: true },
  { unit: 'kg', beamWeight: 0.5, supportForces: true, loads: [at(0.3, 2), at(0.9, 1)] },
  { support: 'two', length: 4, supportA: 0, supportB: 4, beamWeight: 200, supportForces: true, loads: [at(1, 600)] },
  { support: 'two', length: 4, supportA: 1, supportB: 3, supportForces: true, loads: [at(0, 50), at(2, 100, 'resting'), at(4, 30)] },
  { support: 'wall', length: 2, cableAt: 2, beamWeight: 50, supportForces: true, loads: [at(1.5, 100)] },
  { support: 'wall', cableAngle: 15, cableAt: 0.6, supportForces: true, weightArrows: true, loads: [at(0.3, 10), at(1, 5, 'down')] },
  { support: 'wall', cableAngle: 75, cableAt: 0.5, supportForces: true, loads: [at(0.6, 10), at(0.9, 5, 'resting')] },
  { support: 'wall', cable: false, supportForces: true, loads: [at(0.5, 20), at(1, 30, 'resting')] },
  {
    loads: [
      { ...at(0.3, 6), label: { mode: 'text', text: 'm_1' }, distanceLabel: { mode: 'text', text: 'd_1' } },
      { ...at(0.9, 3), label: { mode: 'blank', text: '' }, distanceLabel: { mode: 'text', text: 'x' } },
      { ...at(0.7, 2, 'resting'), label: { mode: 'text', text: 'The heavy box' } },
      { ...at(0.1, 4, 'down'), label: { mode: 'text', text: '?' }, distanceLabel: { mode: 'blank', text: '' } },
    ],
  },
]

describe('along the beam', () => {
  test('places are drawn to scale: 0.2 m and 0.4 m from the pivot are drawn 1 : 2', () => {
    const f = fig()
    const pivot = f.supportX[0]
    expect(pivot).toBe(BEAM_LEFT + BEAM / 2)
    expect(pivot - f.loadX[0]).toBeCloseTo(0.2 * BEAM, 9)
    expect(f.loadX[1] - pivot).toBeCloseTo(0.4 * BEAM, 9)
    expect(f.beam.width).toBe(BEAM)
  })

  test('the same on any length of beam, in any unit', () => {
    const f = fig({ length: 50, lengthUnit: 'cm', pivot: 25, loads: [at(5, 1), at(40, 1)] })
    expect(f.loadX[0]).toBeCloseTo(BEAM_LEFT + 0.1 * BEAM, 9)
    expect(f.loadX[1]).toBeCloseTo(BEAM_LEFT + 0.8 * BEAM, 9)
  })

  test('a load past the end of the beam is drawn at the end', () => {
    const f = fig({ length: 0.8, pivot: 0.4, loads: [at(0.9, 4)] })
    expect(f.loadX[0]).toBe(BEAM_LEFT + BEAM)
  })

  test('two supports sit at A and B; a wall’s beam starts at the wall', () => {
    expect(fig({ support: 'two', supportA: 0.25, supportB: 1 }).supportX).toEqual([BEAM_LEFT + BEAM / 4, BEAM_LEFT + BEAM])
    const w = fig({ support: 'wall' })
    expect(w.beam.x).toBe(WALL_X)
    expect(w.hinge).toMatchObject({ x: WALL_X })
    expect(w.wall!.line.x1).toBe(WALL_X)
  })

  test('a fixed beam goes into the wall with no hinge, and no hatch crosses it', () => {
    const f = fig({ support: 'wall', cable: false })
    expect(f.hinge).toBeNull()
    expect(f.cable).toBeNull()
    expect(f.beam.x).toBeLessThan(WALL_X)
    for (const h of f.wall!.hatches) expect(Math.max(h.y1, h.y2) < f.beam.y || Math.min(h.y1, h.y2) > f.beam.y + f.beam.height).toBe(true)
  })
})

describe('the cable', () => {
  test('rises to the wall at its true angle', () => {
    for (const angle of [15, 30, 45, 60, 75]) {
      const c = fig({ support: 'wall', cableAngle: angle, cableAt: 0.5 }).cable!.line
      expect(c.x2).toBe(WALL_X)
      expect(Math.atan2(c.y1 - c.y2, c.x1 - c.x2) * (180 / Math.PI)).toBeCloseTo(angle, 1)
    }
  })

  test('a steep cable shortens the beam so it meets the wall inside the figure, down to a shortest beam', () => {
    const at45 = fig({ support: 'wall', cableAngle: 45 })
    expect(at45.beam.width).toBeLessThan(BEAM)
    expect(at45.beam.width).toBeGreaterThanOrEqual(MIN_WALL_BEAM)
    expect(at45.cable!.line.y2).toBeGreaterThanOrEqual(0)
    expect(at45.cableOffTop).toBe(false)
    expect(fig({ support: 'wall' }).beam.width).toBe(BEAM)
    const at75 = fig({ support: 'wall', cableAngle: 75 })
    expect(at75.beam.width).toBe(MIN_WALL_BEAM)
    expect(at75.cableOffTop).toBe(true)
  })
})

describe('marks', () => {
  test('rows of distance marks never overlap, and the nearest load is on the lowest row', () => {
    for (const c of CASES) {
      const f = fig(c)
      const m = f.marks?.marks ?? []
      for (const a of m)
        for (const b of m) if (a !== b && a.row === b.row) expect(Math.max(a.line.x1, b.line.x1) >= Math.min(a.line.x2, b.line.x2) - 0.01).toBe(true)
      // Above the beam, and above everything on it.
      for (const a of m) expect(a.line.y1).toBeLessThan(f.beam.y)
    }
    const f = fig(CASES[2])
    const rowOf = (i: number) => f.marks!.marks.find((m) => m.between.includes(i))!.row
    expect(rowOf(5)).toBe(0)
    expect(rowOf(0)).toBe(5)
  })

  test('six loads on one side fit all six rows when nothing hangs below', () => {
    expect(fig(CASES[2]).marks!.rows).toBe(6)
    expect(fig(CASES[2]).dropped).toBe(0)
  })

  test('when rows don’t fit, the length mark goes first, then the farthest marks, and the count says so', () => {
    const f = fig(CASES[1])
    expect(f.lengthMark).toBeNull()
    expect(f.dropped).toBeGreaterThan(1)
    expect(f.marks!.marks.length + f.dropped).toBe(6 + 1)
    for (const m of f.marks!.marks) expect(m.line.y1 - 30).toBeGreaterThan(0)
  })

  test('two supports also mark B from A, and a wall the cable from the wall', () => {
    expect(fig({ support: 'two', loads: [at(0.3, 1)] }).marks!.marks).toHaveLength(2)
    expect(fig({ support: 'wall', cableAt: 0.8, loads: [at(0.3, 1)] }).marks!.marks).toHaveLength(2)
    // Not twice, when a load is already there.
    expect(fig({ support: 'wall', cableAt: 0.3, loads: [at(0.3, 1)] }).marks!.marks).toHaveLength(1)
  })

  test('turned off, there are none', () => {
    expect(fig({ distances: false }).marks).toBeNull()
  })
})

describe('labels', () => {
  test('stay inside the figure, clear of each other, the strings, the arrows and the cable', () => {
    for (const c of CASES) {
      const f = fig(c)
      const shown = f.labels.filter((l) => l.label.mode !== 'none' && !l.inside)
      for (const l of shown) {
        const b = boxOf(l)
        expect(b.x - b.w / 2).toBeGreaterThanOrEqual(0)
        expect(b.x + b.w / 2).toBeLessThanOrEqual(WIDTH)
        expect(b.y - b.h / 2).toBeGreaterThanOrEqual(0)
        expect(b.y + b.h / 2).toBeLessThanOrEqual(HEIGHT)
        for (const s of f.strings) expect(crosses(s, b), `${l.key} on a string`).toBe(false)
        for (const a of f.arrows) expect(crosses(a.v, b), `${l.key} on an arrow`).toBe(false)
        if (f.cable) expect(crosses(f.cable.line, b), `${l.key} on the cable`).toBe(false)
        for (const o of shown) if (o !== l) expect(overlaps(b, boxOf(o)), `${l.key} on ${o.key}`).toBe(false)
      }
    }
  })

  test('a short label goes inside its object, a long one beside it', () => {
    const f = fig({ loads: [at(0.3, 6), { ...at(0.9, 3), label: { mode: 'text', text: 'The heavy box' } }] })
    expect(f.labels.find((l) => l.key === 'load0')!.inside).toBe(true)
    expect(f.labels.find((l) => l.key === 'load1')!.inside).toBeFalsy()
  })

  test('an empty label shows its value; a typed one replaces it', () => {
    const f = fig({ unit: 'g', loads: [at(0.3, 200), { ...at(0.9, 100), label: { mode: 'text', text: 'm_2' } }] })
    expect(f.labels.find((l) => l.key === 'load0')!.label.text).toBe('200 g')
    expect(f.labels.find((l) => l.key === 'load1')!.label.text).toBe('m_2')
    expect(f.labels.find((l) => l.key === 'mark0')!.label.text).toBe('0.2 m')
  })

  test('arrows at the same place are set side by side', () => {
    const f = fig(CASES[4])
    const beam = f.arrows.find((a) => a.key === 'beam')!.v
    const pivot = f.arrows.find((a) => a.key === 'support0')!.v
    expect(Math.abs(beam.x1 - pivot.x1)).toBeGreaterThanOrEqual(14)
  })

  test('support forces are named F_A and F_B, or F_x and F_y at a wall', () => {
    expect(suffixed({ mode: 'text', text: 'F' }, 'A').text).toBe('F_A')
    expect(suffixed({ mode: 'text', text: 'F_N' }, 'B').text).toBe('F_{NB}')
    const w = fig({ support: 'wall', supportForces: true })
    expect(w.labels.find((l) => l.key === 'wallUp')!.label.text).toBe('F_y')
    expect(w.labels.find((l) => l.key === 'wallAlong')!.label.text).toBe('F_x')
    expect(w.labels.find((l) => l.key === 'tension')!.label.text).toBe('T')
  })
})

describe('support forces that come out down', () => {
  test('a pivot under forces that are all up is pulled down, and its arrow points down onto the beam', () => {
    const f = fig({ loads: [at(0.3, 6, 'up'), at(0.9, 3, 'up')], supportForces: true })
    const v = f.arrows.find((a) => a.key === 'support0')!.v
    expect(v.y2).toBeGreaterThan(v.y1)
    expect(v.y2).toBeCloseTo(f.beam.y, 6)
  })

  test('a support the beam would lift off points down; the other still points up', () => {
    const f = fig({ support: 'two', supportA: 0, supportB: 0.5, loads: [at(1, 10)], supportForces: true })
    const a = f.arrows.find((x) => x.key === 'support0')!.v
    const b = f.arrows.find((x) => x.key === 'support1')!.v
    expect(a.y2).toBeGreaterThan(a.y1)
    expect(b.y2).toBeLessThan(b.y1)
  })
})

describe('a cantilever’s wall moment', () => {
  const cantilever = { support: 'wall', cable: false, supportForces: true, loads: [at(0.5, 20), at(1, 30)] } as Partial<TorqueSettings>

  test('turns against the loads: counterclockwise under loads down, below the beam, labelled M', () => {
    const f = fig(cantilever)
    expect(f.moment).not.toBeNull()
    expect(f.moment!.clockwise).toBe(false)
    // Below the beam, round its end at the wall, the arrow's tip within its radius of the end.
    const tip = f.moment!.head[0]
    expect(tip.y).toBeGreaterThan(f.beam.y + f.beam.height)
    expect(Math.hypot(tip.x - WALL_X, tip.y - (f.beam.y + f.beam.height / 2))).toBeCloseTo(MOMENT_R, 0)
    // Counterclockwise as drawn: its tip is the end nearer the beam (the arrow runs from straight down up toward the beam).
    expect(tip.x).toBeGreaterThan(WALL_X + MOMENT_R * 0.8)
    expect(f.labels.find((l) => l.key === 'moment')!.label.text).toBe('M')
  })

  test('turns clockwise when the forces up win, and sits above the beam when the wall’s force points down', () => {
    const f = fig({ ...cantilever, loads: [at(0.5, 20, 'up')] })
    expect(f.moment!.clockwise).toBe(true)
    expect(f.moment!.head[0].y).toBeLessThan(f.beam.y)
  })

  test('only on a fixed beam with the support forces on, and a torque to hold', () => {
    expect(fig({ ...cantilever, supportForces: false }).moment).toBeNull()
    expect(fig({ ...cantilever, cable: true }).moment).toBeNull()
    expect(fig({ ...cantilever, loads: [] }).moment).toBeNull()
  })

  test('mirrored, it is the same drawing flipped, so its sense turns with it', () => {
    expect(fig({ ...cantilever, mirror: true }).moment).toEqual(fig(cantilever).moment)
  })
})

describe('clashes', () => {
  test('a hanging object where a support stands is reported', () => {
    expect(fig({ support: 'two', supportA: 0, supportB: 1, loads: [at(0.03, 10), at(0.6, 5)] }).clashes).toEqual([[0, -1]])
    expect(fig({ loads: [at(0.5, 6), at(0.9, 3)] }).clashes).toEqual([[0, -1]])
  })

  test('two resting objects drawn over each other are reported', () => {
    expect(fig({ loads: [at(0.8, 6, 'resting'), at(0.83, 3, 'resting')] }).clashes).toEqual([[0, 1]])
  })

  test('the default and the examples’ kinds of figure have none', () => {
    expect(fig().clashes).toEqual([])
    for (const c of CASES.slice(4, 11)) expect(fig(c).clashes).toEqual([])
  })
})

test('mirroring changes nothing in the layout: the figure is flipped as it is drawn', () => {
  const a = fig(CASES[7])
  const b = fig({ ...CASES[7], mirror: true })
  expect(b).toEqual(a)
})

test('the description names no value', () => {
  expect(describeFigure(settings())).toBe('A light beam on a pivot, with 2 loads on it')
  expect(describeFigure(settings({ support: 'wall', beamWeight: 5 }))).toBe('A beam held at a wall by a hinge and a cable, with 2 loads on it')
})
