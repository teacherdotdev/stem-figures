import { describe, expect, test } from 'vitest'
import { CEILING_Y } from '$lib/shared/support'
import { COIL_WIDTH, HANGING_EQUILIBRIUM, buildSpring, describe as describeFigure, turnsFor } from './spring'
import { COIL_STYLES, MOTION_ARROWS, OBJECTS, ORIENTATIONS, PICTURES, SPRINGS, springSettings, type SpringSettings } from './settings'

const settings = (more: Partial<SpringSettings> = {}) => springSettings.tidy({ ...springSettings.defaults, ...more })
const fig = (more: Partial<SpringSettings> = {}) => buildSpring(settings(more))

/** The corners of a zigzag coil: every point of its path. */
const pointsOf = (d: string) =>
  d
    .replace(/^M /, '')
    .split(' L ')
    .map((p) => p.split(' ').map(Number))
    .map(([x, y]) => ({ x, y }))

describe('settings', () => {
  test('the default is a hanging spring before and after, stretched by 40% with a block', () => {
    const s = springSettings.defaults
    expect([s.orientation, s.picture, s.springs, s.stretch, s.object, s.extensionMark]).toEqual(['hanging', 'beforeAfter', '1', 0.4, 'block', true])
  })

  test('a hanging spring is never squashed, and with an object on it always stretched a little', () => {
    expect(settings({ stretch: -0.3 }).stretch).toBe(0.05)
    expect(settings({ stretch: 0 }).stretch).toBe(0.05)
    expect(settings({ stretch: 0, picture: 'one' }).stretch).toBe(0.05)
    expect(settings({ stretch: -0.3, orientation: 'horizontal' }).stretch).toBe(-0.3)
    expect(settings({ stretch: 0, orientation: 'horizontal' }).stretch).toBe(0)
    // Three positions' amplitude can still be 0.
    expect(settings({ stretch: 0, picture: 'positions' }).stretch).toBe(0)
  })

  test('Three positions has one spring and an amplitude with no sign, at most half the natural length on a floor', () => {
    expect(settings({ picture: 'positions', springs: '3p' }).springs).toBe('1')
    expect(settings({ picture: 'positions', orientation: 'horizontal', stretch: -0.3 }).stretch).toBe(0.3)
    expect(settings({ picture: 'positions', orientation: 'horizontal', stretch: 0.9 }).stretch).toBe(0.5)
    expect(settings({ picture: 'positions', stretch: 0.9 }).stretch).toBe(0.9)
  })

  test('slotted masses only hang', () => {
    expect(settings({ object: 'masses', orientation: 'horizontal' }).object).toBe('block')
    expect(settings({ object: 'masses' }).object).toBe('masses')
  })

  test('the stretch is kept to the hundredth, from −50% to 100%', () => {
    expect(settings({ orientation: 'horizontal', stretch: -2 }).stretch).toBe(-0.5)
    expect(settings({ stretch: 3 }).stretch).toBe(1)
    expect(settings({ stretch: 0.333333 }).stretch).toBe(0.33)
  })

  test('a link holds only what differs from the default, and reads back the same', () => {
    const s = settings({ orientation: 'horizontal', stretch: -0.25, springs: '2p', coils: 'loops' })
    const query = springSettings.toQuery(s)
    expect(query).toBe('orientation=horizontal&springs=2p&stretch=-0.25&coils=loops')
    expect(springSettings.fromParams(new URLSearchParams(query))).toEqual(s)
  })
})

describe('Before and after, hanging (the default)', () => {
  const f = fig()
  const natural = 140

  test('draws the spring at its natural length with a hook, and stretched with the block on it', () => {
    expect(f.ends).toHaveLength(2)
    expect(f.ends[0].y).toBe(CEILING_Y + natural)
    expect(f.ends[1].y).toBe(CEILING_Y + natural * 1.4)
    expect(f.rings).toHaveLength(1)
    expect(f.objects).toEqual([{ kind: 'block', at: { x: f.ends[1].x, y: f.ends[1].y + 56 } }])
  })

  test('one hatched ceiling over both', () => {
    expect(f.supports).toHaveLength(1)
    const { line } = f.supports[0]
    expect(line.y1).toBe(CEILING_Y)
    expect(line.x1).toBeLessThan(f.ends[0].x)
    expect(line.x2).toBeGreaterThan(f.ends[1].x)
  })

  test('a dashed line at the natural length runs across both, and the extension is marked from it to the stretched end', () => {
    expect(f.dashed).toHaveLength(1)
    expect(f.dashed[0].y1).toBe(f.ends[0].y)
    expect(f.dashed[0].x1).toBeLessThan(f.ends[0].x)
    expect(f.dashed[0].x2).toBeGreaterThan(f.ends[1].x)
    expect(f.dimensions).toEqual([{ x1: f.dimensions[0].x1, y1: f.ends[0].y, x2: f.dimensions[0].x1, y2: f.ends[1].y }])
    expect(f.labels.map((l) => l.label.text)).toEqual(['k', 'k', 'm', 'x'])
  })

  test('the stretched coil is redrawn, not scaled: the same turns and width, only farther apart', () => {
    const [before, after] = f.coils.map(pointsOf)
    expect(after).toHaveLength(before.length)
    const across = (points: { x: number }[]) => Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x))
    expect(across(before)).toBeCloseTo(COIL_WIDTH)
    expect(across(after)).toBeCloseTo(COIL_WIDTH)
    expect(before.length).toBe(4 + 2 * turnsFor(natural))
  })

  test('no extension mark or natural length line on a spring that isn’t stretched, in one picture', () => {
    const one = fig({ picture: 'one', orientation: 'horizontal', stretch: 0 })
    expect(one.dimensions).toEqual([])
    expect(one.dashed).toEqual([])
  })
})

describe('series and parallel', () => {
  test('springs in series are joined end to end, each a share of the length, with a dot at each join', () => {
    const f = fig({ springs: '3s' })
    expect(f.coils).toHaveLength(6)
    expect(f.joins).toHaveLength(4)
    expect(f.joins.slice(2).map((j) => j.y)).toEqual([CEILING_Y + (140 * 1.4) / 3, CEILING_Y + ((140 * 1.4) / 3) * 2].map((n) => Math.round(n * 100) / 100))
    expect(f.labels.filter((l) => l.label.text.startsWith('k')).map((l) => l.label.text)).toEqual(['k_1', 'k_2', 'k_3', 'k_1', 'k_2', 'k_3'])
  })

  test('springs in parallel run side by side to a bar, with the object on its middle', () => {
    const f = fig({ springs: '2p' })
    expect(f.coils).toHaveLength(4)
    expect(f.bars).toHaveLength(2)
    const bar = f.bars[1]
    expect((bar.x1 + bar.x2) / 2).toBeCloseTo(f.ends[1].x)
    expect(f.wires.at(-1)).toEqual({ x1: f.ends[1].x, y1: bar.y1, x2: f.ends[1].x, y2: f.ends[1].y })
  })

  test('on a floor, parallel springs one above another all clear the floor', () => {
    const f = fig({ orientation: 'horizontal', springs: '3p', object: 'ball' })
    const floors = f.supports.filter((s) => s.line.y1 === s.line.y2).map((s) => s.line.y1)
    for (const d of f.coils) {
      const ys = pointsOf(d).map((p) => p.y)
      expect(floors.some((floor) => Math.max(...ys) < floor && Math.max(...ys) > floor - 140)).toBe(true)
    }
  })
})

describe('crowding', () => {
  test('in series, a spring’s label moves off the natural length’s dashed line', () => {
    for (const orientation of ['hanging', 'horizontal'] as const)
      for (const picture of ['one', 'beforeAfter'] as const) {
        const f = fig({ orientation, picture, springs: '3s', stretch: 1, lengthMark: true })
        const line = f.dashed[0]
        for (const l of f.labels.filter((l) => /^k/.test(l.label.text))) {
          // The dashed line is level when hanging, upright on a floor.
          const off = orientation === 'hanging' ? Math.abs(l.at.y - line.y1) : Math.abs(l.at.x - line.x1)
          expect(off, `${orientation} ${picture} ${l.label.text}`).toBeGreaterThanOrEqual(14)
        }
      }
  })

  test('the applied force’s label keeps off the natural length’s line, however squashed', () => {
    for (const stretch of [-0.5, -0.45, -0.4, -0.2]) {
      const f = fig({ orientation: 'horizontal', picture: 'one', stretch, appliedForce: true })
      const naturalX = 50 + 200
      const label = f.labels.find((l) => l.tone === 'vector')!
      expect(Math.abs(label.at.x - naturalX), String(stretch)).toBeGreaterThanOrEqual(10)
    }
  })

  test('a hanging spring pulled on by an applied force has no equilibrium line, which would be in the wrong place', () => {
    const pulled = fig({ picture: 'one', appliedForce: true, equilibriumLine: true, extensionMark: false })
    expect(pulled.dashed).toEqual([])
    expect(fig({ picture: 'one', equilibriumLine: true, extensionMark: false }).dashed).toHaveLength(1)
    // On a floor the line is at the natural length, so it stays.
    expect(fig({ orientation: 'horizontal', picture: 'one', appliedForce: true, equilibriumLine: true, extensionMark: false }).dashed).toHaveLength(1)
  })
})

describe('horizontal', () => {
  test('a squashed spring brings the object toward the wall, and the applied force pushes it there', () => {
    const f = fig({ orientation: 'horizontal', picture: 'one', stretch: -0.3, appliedForce: true })
    expect(f.ends[0].x).toBe(50 + 200 * 0.7)
    expect(f.vectors).toHaveLength(1)
    const v = f.vectors[0].v
    expect(v.x2).toBeLessThan(v.x1)
    expect(v.y1).toBe(v.y2)
  })

  test('Before and after is two rows, each with its own wall and floor, and one dashed line at the natural end through both', () => {
    const f = fig({ orientation: 'horizontal' })
    expect(f.supports).toHaveLength(4)
    expect(f.objects).toHaveLength(2)
    expect(f.dashed).toHaveLength(1)
    expect(f.dashed[0].x1).toBe(250)
    expect(f.dashed[0].y2).toBeGreaterThan(f.ends[1].y)
  })

  test('parallel springs meet the object square on, level with its middle, whatever the object and number', () => {
    for (const springs of ['2p', '3p'] as const)
      for (const object of ['ball', 'block'] as const) {
        const f = fig({ orientation: 'horizontal', picture: 'one', springs, object })
        const o = f.objects[0]
        const middle = { x: o.at.x, y: o.at.y - (object === 'ball' ? 26 : 28) }
        const link = f.wires.at(-1)!
        const bar = f.bars[0]
        expect(link.y1).toBe(middle.y)
        expect(link.y2).toBe(middle.y)
        expect(link.x1).toBe(bar.x1)
        expect(Math.min(bar.y1, bar.y2)).toBeLessThan(middle.y)
        expect(Math.max(bar.y1, bar.y2)).toBeGreaterThan(middle.y)
        expect(link.x2).toBeCloseTo(o.at.x - (object === 'ball' ? 26 : 28))
      }
  })

  test('a ball touches the free end where the spring meets its edge', () => {
    const f = fig({ orientation: 'horizontal', picture: 'one', object: 'ball' })
    const ball = f.objects[0]
    const centre = { x: ball.at.x, y: ball.at.y - 26 }
    expect(Math.hypot(f.ends[0].x - centre.x, f.ends[0].y - centre.y)).toBeCloseTo(26, 1)
  })
})

describe('Three positions', () => {
  test('hanging, the copies are at +A, equilibrium and −A about the stretched rest position, with the line at the middle one', () => {
    const f = fig({ picture: 'positions', stretch: 0.3, equilibriumLine: true })
    const natural = 110
    expect(f.ends.map((e) => e.y)).toEqual([0.2, 0.5, 0.8].map((e) => Math.round((CEILING_Y + natural * (1 + e)) * 100) / 100))
    expect(HANGING_EQUILIBRIUM).toBe(0.5)
    expect(f.dashed).toEqual([{ x1: 20, y1: f.ends[1].y, x2: 620, y2: f.ends[1].y }])
    expect(f.labels.filter((l) => l.label.text.startsWith('x =')).map((l) => l.label.text)).toEqual(['x = +A', 'x = 0', 'x = −A'])
    // The middle copy's name says x = 0, so the line has no label of its own, unless the names are off.
    const unnamed = fig({ picture: 'positions', equilibriumLine: true, amplitudeLabel: { mode: 'none', text: 'A' } })
    expect(unnamed.labels.filter((l) => l.label.text.startsWith('x =')).map((l) => l.label.text)).toEqual(['x = 0'])
  })

  test('the acceleration at each end points back to equilibrium, and the velocity is only at equilibrium', () => {
    const f = fig({ picture: 'positions' })
    const [top, middle, bottom] = f.vectors
    expect([top.kind, middle.kind, bottom.kind]).toEqual(['acceleration', 'velocity', 'acceleration'])
    expect(top.v.y2).toBeGreaterThan(top.v.y1)
    expect(bottom.v.y2).toBeLessThan(bottom.v.y1)
    expect(middle.v.y2).toBeGreaterThan(middle.v.y1)
    const toward = fig({ picture: 'positions', moving: 'toward' }).vectors[1].v
    expect(toward.y2).toBeLessThan(toward.y1)
  })

  test('on a floor, −A is squashed and pushed out, +A stretched and pulled back', () => {
    const f = fig({ orientation: 'horizontal', picture: 'positions', stretch: 0.5 })
    expect(f.ends.map((e) => e.x)).toEqual([50 + 115, 50 + 230, 50 + 345])
    const [squashed, , stretched] = f.vectors
    expect(squashed.v.x2).toBeGreaterThan(squashed.v.x1)
    expect(stretched.v.x2).toBeLessThan(stretched.v.x1)
  })

  test('only the arrows asked for', () => {
    expect(fig({ picture: 'positions', motionArrows: 'none' }).vectors).toEqual([])
    expect(fig({ picture: 'positions', motionArrows: 'velocity' }).vectors.map((v) => v.kind)).toEqual(['velocity'])
    expect(fig({ picture: 'positions', motionArrows: 'acceleration' }).vectors.map((v) => v.kind)).toEqual(['acceleration', 'acceleration'])
  })
})

describe('every figure', () => {
  test('stays inside its box, whatever the settings', () => {
    for (const orientation of ORIENTATIONS)
      for (const picture of PICTURES)
        for (const springs of SPRINGS)
          for (const object of OBJECTS)
            for (const coils of COIL_STYLES)
              for (const stretch of [-0.5, 0, 0.4, 1]) {
                const s = settings({ orientation, picture, springs, object, coils, stretch, lengthMark: true, equilibriumLine: true, appliedForce: true, motionArrows: MOTION_ARROWS[3] })
                const f = buildSpring(s)
                const where = JSON.stringify({ orientation, picture, springs, object, coils, stretch })
                const points = [
                  ...f.coils.flatMap(pointsOf),
                  ...f.objects.map((o) => o.at),
                  ...[...f.dimensions, ...f.dashed, ...f.vectors.map((v) => v.v)].flatMap((s) => [
                    { x: s.x1, y: s.y1 },
                    { x: s.x2, y: s.y2 },
                  ]),
                  ...f.labels.map((l) => l.at),
                ]
                const outside = points.filter((p) => p.x < 0 || p.x > f.width || p.y < 0 || p.y > f.height)
                expect(outside, where).toEqual([])
                expect(describeFigure(s)).not.toContain('undefined')
              }
  })

  test('is described in words', () => {
    expect(describeFigure(springSettings.defaults)).toBe(
      'a spring hanging from a ceiling, drawn twice: at its natural length with nothing on it, and stretched by 40% of its natural length with a block on it, with the extension marked',
    )
  })
})
