import { describe, expect, test } from 'vitest'
import { crosses, labelBox, overlaps } from '$lib/shared/layout'
import type { Point } from '$lib/shared/vector'
import { CONICAL, GROUND_UNIT, HEIGHT, NET, TOP, VERTICAL, WIDTH, contactOf, buildCircular, describe as describeFigure, radiusLabelOf, type CircularFigure, type FigureVector } from './circular'
import { AROUND, HELD, POINTS, circularSettings, pointsOf, type CircularSettings } from './settings'

const fig = (s: Partial<CircularSettings>) => buildCircular({ ...circularSettings.defaults, ...s })
const text = (t: string) => ({ mode: 'text' as const, text: t })

const length = (v: FigureVector) => Math.hypot(v.v.x2 - v.v.x1, v.v.y2 - v.v.y1)
/** A vector's direction on the page, as a unit vector (y down). */
const way = (v: FigureVector): Point => ({ x: (v.v.x2 - v.v.x1) / length(v), y: (v.v.y2 - v.v.y1) / length(v) })
const of = (f: CircularFigure, kind: FigureVector['kind']) => f.vectors.filter((v) => v.kind === kind)
/** The unit vector from an object toward the centre of its circle. */
const inward = (f: CircularFigure, object: number): Point => {
  const at = f.objects[object].at
  const d = Math.hypot(f.centre.x - at.x, f.centre.y - at.y)
  return { x: (f.centre.x - at.x) / d, y: (f.centre.y - at.y) / d }
}
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y
/** Counterclockwise on the page (where y points down) is a negative cross product. */
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x

/** Every label drawn, with its box. */
const labels = (f: CircularFigure) =>
  [...f.vectors.map((v) => ({ label: v.label, at: v.labelAt })), ...f.notes.map((n) => ({ label: n.label, at: n.at }))]
    .filter((l) => l.label.mode !== 'none' && l.label.text !== '')
    .map((l) => ({ ...l, box: labelBox(l.at, l.label) }))

function expectOnFigure(f: CircularFigure) {
  for (const p of f.extent) {
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.x).toBeLessThanOrEqual(WIDTH)
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.y).toBeLessThanOrEqual(HEIGHT)
  }
}

function expectNoLabelOnAnother(f: CircularFigure) {
  const all = labels(f)
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) expect(overlaps(all[i].box, all[j].box), `${all[i].label.text} on ${all[j].label.text}`).toBe(false)
}

describe('Top view', () => {
  test('the first screen has one object with its velocity and acceleration', () => {
    const f = fig({})
    expect(f.objects).toHaveLength(1)
    expect(f.vectors.map((v) => v.kind)).toEqual(['velocity', 'acceleration'])
  })

  test('positions are evenly spaced on the circle from the start angle, the way the object goes round', () => {
    for (const direction of ['ccw', 'cw'] as const) {
      const f = fig({ positions: 4, startAngle: 30, direction })
      expect(f.objects).toHaveLength(4)
      f.objects.forEach((o, i) => {
        expect(Math.hypot(o.at.x - TOP.centre.x, o.at.y - TOP.centre.y)).toBeCloseTo(TOP.r, 1)
        const a = ((30 + (direction === 'ccw' ? 1 : -1) * i * 90) * Math.PI) / 180
        expect(o.at.x).toBeCloseTo(TOP.centre.x + TOP.r * Math.cos(a), 1)
        expect(o.at.y).toBeCloseTo(TOP.centre.y - TOP.r * Math.sin(a), 1)
      })
    }
  })

  test('every velocity is along the tangent, the way the object goes round', () => {
    for (const direction of ['ccw', 'cw'] as const) {
      const f = fig({ positions: 5, startAngle: 10, direction })
      for (const v of of(f, 'velocity')) {
        const toCentre = inward(f, v.object)
        expect(dot(way(v), toCentre)).toBeCloseTo(0, 3)
        // Going counterclockwise, the centre is on the object's left.
        expect(Math.sign(cross(way(v), toCentre))).toBe(direction === 'ccw' ? -1 : 1)
      }
    }
  })

  test('every acceleration and inward force points at the centre', () => {
    const f = fig({ positions: 6, inwardForce: true, direction: 'cw' })
    const toward = [...of(f, 'acceleration'), ...of(f, 'inward')]
    expect(toward).toHaveLength(12)
    for (const v of toward) expect(dot(way(v), inward(f, v.object))).toBeCloseTo(1, 3)
  })

  test('motion is uniform: every velocity is one length, and every inward arrow another', () => {
    const f = fig({ positions: 8, inwardForce: true })
    for (const v of of(f, 'velocity')) expect(length(v)).toBeCloseTo(TOP.velocity, 1)
    for (const v of [...of(f, 'acceleration'), ...of(f, 'inward')]) expect(length(v)).toBeCloseTo(TOP.inward, 1)
  })

  test('acceleration and the inward force are drawn side by side, not on each other', () => {
    const f = fig({ inwardForce: true })
    const [a] = of(f, 'acceleration')
    const [force] = of(f, 'inward')
    expect(Math.hypot(a.v.x1 - force.v.x1, a.v.y1 - force.v.y1)).toBeCloseTo(16, 1)
    expect(dot(way(a), way(force))).toBeCloseTo(1, 3)
  })

  test('a second object on a turntable is halfway out, with arrows half as long and numbered labels', () => {
    const f = fig({ around: 'turntable', inner: true, inwardForce: true, radius: 'radius', startAngle: 60 })
    expect(f.objects).toHaveLength(2)
    const [outer, second] = f.objects
    const r = (p: Point) => Math.hypot(p.x - TOP.centre.x, p.y - TOP.centre.y)
    expect(r(second.at)).toBeCloseTo(r(outer.at) / 2, 1)
    // On the same radius.
    expect(dot(inward(f, 0), inward(f, 1))).toBeCloseTo(1, 3)
    for (const kind of ['velocity', 'acceleration', 'inward'] as const) {
      const [one, two] = of(f, kind)
      expect(length(two)).toBeCloseTo(length(one) / 2, 1)
      expect(dot(way(one), way(two))).toBeCloseTo(1, 3)
    }
    expect(of(f, 'velocity').map((v) => v.label.text)).toEqual(['v_1', 'v_2'])
    expect(of(f, 'acceleration').map((v) => v.label.text)).toEqual(['a_{c1}', 'a_{c2}'])
    expect(f.notes.map((n) => n.label.text)).toEqual(expect.arrayContaining(['r_1', 'r_2']))
    // r_1 is measured beside the line through both objects, from level with the centre to level with the outer one.
    expect(f.dimensions).toHaveLength(1)
    const [m] = f.dimensions
    expect(Math.hypot(m.x2 - m.x1, m.y2 - m.y1)).toBeCloseTo(r(outer.at), 1)
    const along = inward(f, 0)
    expect(Math.abs(((m.x2 - m.x1) * along.x + (m.y2 - m.y1) * along.y) / r(outer.at))).toBeCloseTo(1, 3)
    // Off the line, on the side away from where the objects are heading, clear of the second object.
    expect(Math.hypot(m.x1 - TOP.centre.x, m.y1 - TOP.centre.y)).toBeGreaterThan(20)
    const [v2] = of(f, 'velocity').slice(1)
    expect(dot({ x: m.x1 - TOP.centre.x, y: m.y1 - TOP.centre.y }, way(v2))).toBeLessThan(0)
    // Without a second object, the radius is just the labelled line.
    expect(fig({ around: 'turntable', radius: 'radius' }).dimensions).toHaveLength(0)
    // The outer object's inward arrows stop before the second object.
    const [a] = of(f, 'acceleration')
    expect(r({ x: a.v.x2, y: a.v.y2 })).toBeGreaterThan(r(second.at) + 13)
  })

  test('a second object is only drawn on a turntable', () => {
    expect(fig({ around: 'string', inner: true }).objects).toHaveLength(1)
  })

  test('on a road the object is a block, turned along the road', () => {
    const f = fig({ around: 'road', object: 'ball', startAngle: 30 })
    expect(f.objects[0].kind).toBe('block')
    expect(f.objects[0].turn).toBe(-30)
  })

  test('past four positions only the first one has labels on its vectors', () => {
    const four = fig({ positions: 4 })
    expect(four.vectors.filter((v) => v.label.mode === 'text')).toHaveLength(8)
    const five = fig({ positions: 5 })
    expect(five.vectors.filter((v) => v.label.mode === 'text').map((v) => v.object)).toEqual([0, 0])
  })

  test('letters go round the way the object does', () => {
    const f = fig({ positions: 3, startAngle: 90, direction: 'cw', pointLabels: true })
    const letters = f.notes.filter((n) => /^[A-C]$/.test(n.label.text))
    expect(letters.map((n) => n.label.text)).toEqual(['A', 'B', 'C'])
    // A is above the top position; B, the next one clockwise, is on the right.
    expect(letters[0].at.y).toBeLessThan(TOP.centre.y - TOP.r)
    expect(letters[1].at.x).toBeGreaterThan(TOP.centre.x)
  })

  test('a diameter crosses the whole circle through its centre, clear of every object, and is labelled d', () => {
    for (const positions of [1, 2, 3, 4, 8]) {
      const f = fig({ positions, radius: 'diameter' })
      expect(f.dimensions).toHaveLength(1)
      const m = f.dimensions[0]
      expect(Math.hypot(m.x2 - m.x1, m.y2 - m.y1)).toBeCloseTo(2 * TOP.r, 1)
      expect((m.x1 + m.x2) / 2).toBeCloseTo(TOP.centre.x, 1)
      expect((m.y1 + m.y2) / 2).toBeCloseTo(TOP.centre.y, 1)
      for (const o of f.objects) for (const end of [{ x: m.x1, y: m.y1 }, { x: m.x2, y: m.y2 }]) expect(Math.hypot(o.at.x - end.x, o.at.y - end.y)).toBeGreaterThan(40)
    }
    expect(radiusLabelOf({ radius: 'diameter', radiusLabel: text('r') }).text).toBe('d')
    expect(radiusLabelOf({ radius: 'diameter', radiusLabel: text('D') }).text).toBe('D')
    expect(radiusLabelOf({ radius: 'radius', radiusLabel: text('r') }).text).toBe('r')
  })

  test('vector notation is put on vectors only', () => {
    const f = fig({ notation: 'arrow', radius: 'radius' })
    expect(f.vectors.map((v) => v.label.text)).toEqual(['\\vec{v}', '\\vec{a}_c'])
    expect(f.notes.map((n) => n.label.text)).toContain('r')
  })

  test.each([1, 4, 8])('with %i positions, everything stays on the figure and no label lands on another', (positions) => {
    for (const around of AROUND) {
      const f = fig({ positions, around, inwardForce: true, pointLabels: true, radius: 'radius', angularSpeed: true, angleMark: true, inner: true, objectLabel: text('m') })
      expectOnFigure(f)
      expectNoLabelOnAnother(f)
    }
  })

  test('with everything on, at every count, start and way round, no label lands on another or on an arrow', () => {
    for (const around of AROUND)
      for (const positions of [1, 3, 4, 5, 8])
        for (let startAngle = 15; startAngle < 360; startAngle += 30)
          for (const direction of ['ccw', 'cw'] as const)
            for (const radius of ['radius', 'diameter'] as const) {
              const f = fig({ around, positions, startAngle, direction, radius, inner: true, inwardForce: true, angularSpeed: true, angleMark: true, pointLabels: true, objectLabel: text('m'), notation: 'arrow' })
              const name = `${around} ${positions} ${startAngle} ${direction} ${radius}`
              const all = labels(f)
              for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(overlaps(all[i].box, all[j].box), `${name}: ${all[i].label.text} on ${all[j].label.text}`).toBe(false)
              for (const l of all) for (const v of f.vectors) expect(crosses(v.v, l.box), `${name}: ${l.label.text} on an arrow`).toBe(false)
            }
  }, 30_000)

  test('every start angle keeps the figure on the page', () => {
    for (let startAngle = 0; startAngle < 360; startAngle += 15) {
      for (const direction of ['ccw', 'cw'] as const) {
        const f = fig({ startAngle, direction, positions: 3, pointLabels: true, radius: 'diameter', angularSpeed: true, angleMark: true, around: 'turntable', inner: true })
        expectOnFigure(f)
        expectNoLabelOnAnother(f)
      }
    }
  })
})

describe('Vertical circle', () => {
  const vertical = (s: Partial<CircularSettings>) => fig({ setup: 'vertical', ...s })
  const forcesOn = (f: CircularFigure, object: number) => f.vectors.filter((v) => v.object === object && v.kind !== 'velocity')
  const net = (f: CircularFigure, object: number): Point =>
    forcesOn(f, object).reduce((sum, v) => ({ x: sum.x + v.v.x2 - v.v.x1, y: sum.y + v.v.y2 - v.v.y1 }), { x: 0, y: 0 })

  test('no letter or object label lands on an arrow, even below the bottom position where gravity points out', () => {
    for (const held of HELD)
      for (const direction of ['ccw', 'cw'] as const) {
        const f = vertical({ held, direction, points: 'all', pointLabels: true, objectLabel: text('m') })
        for (const n of f.notes) for (const v of f.vectors) expect(crosses(v.v, labelBox(n.at, n.label)), `${held} ${direction} ${n.label.text}`).toBe(false)
      }
  })

  test('a hill is always the top and a dip the bottom', () => {
    expect(pointsOf({ held: 'hill', points: 'all' })).toEqual(['top'])
    expect(pointsOf({ held: 'dip', points: 'top' })).toEqual(['bottom'])
    expect(pointsOf({ held: 'loop', points: 'all' })).toEqual(['top', 'side', 'bottom'])
  })

  test('gravity is one length everywhere and points straight down', () => {
    for (const held of HELD) {
      const f = vertical({ held, points: 'all' })
      const unit = held === 'hill' || held === 'dip' ? GROUND_UNIT : VERTICAL.unit
      for (const g of of(f, 'gravity')) {
        expect(length(g)).toBeCloseTo(unit, 1)
        expect(way(g)).toEqual({ x: 0, y: 1 })
      }
    }
  })

  test('the tension or normal force is shorter than gravity at the top and longer at the bottom', () => {
    for (const held of ['string', 'loop'] as const) {
      const f = vertical({ held, points: 'all' })
      const kind = held === 'string' ? 'tension' : 'normal'
      const sizes = of(f, kind).map((v) => Math.round((length(v) / VERTICAL.unit) * 100) / 100)
      expect(sizes).toEqual([contactOf(held, 'top'), contactOf(held, 'side'), contactOf(held, 'bottom')])
      expect(sizes[0]).toBeLessThan(1)
      expect(sizes[2]).toBeGreaterThan(1)
      // Each pulls or pushes toward the centre.
      for (const v of of(f, kind)) expect(dot(way(v), inward(f, v.object))).toBeCloseTo(1, 3)
    }
  })

  test('the speed is steady, so the net force toward the centre is the same at the top, the side and the bottom', () => {
    for (const held of ['string', 'loop'] as const) {
      for (const direction of ['ccw', 'cw'] as const) {
        const f = vertical({ held, points: 'all', direction })
        const inwardNet = f.objects.map((_, i) => dot(net(f, i), inward(f, i)))
        for (const n of inwardNet) expect(n).toBeCloseTo(NET.circle * VERTICAL.unit, 1)
      }
    }
  })

  test('a hill and a dip of the same radius at the same speed have the same net force, gravity minus the normal force or the other way round', () => {
    const hill = vertical({ held: 'hill' })
    const dip = vertical({ held: 'dip' })
    expect(dot(net(hill, 0), inward(hill, 0))).toBeCloseTo(NET.ground * GROUND_UNIT, 1)
    expect(dot(net(dip, 0), inward(dip, 0))).toBeCloseTo(NET.ground * GROUND_UNIT, 1)
  })

  test('the tension at the bottom stops short of the centre', () => {
    const f = vertical({ held: 'string', points: 'bottom' })
    const [t] = of(f, 'tension')
    expect(t.v.y2).toBeGreaterThan(f.centre.y + 5)
  })

  test('at the top and the bottom the net force points to the centre', () => {
    for (const held of ['string', 'loop'] as const) {
      const f = vertical({ held, points: 'topBottom' })
      f.objects.forEach((_, i) => {
        const n = net(f, i)
        expect(Math.hypot(n.x, n.y)).toBeGreaterThan(20)
        expect(dot(n, inward(f, i)) / Math.hypot(n.x, n.y)).toBeCloseTo(1, 3)
      })
    }
  })

  test('at the side the net force along the radius points to the centre, and gravity is the only force along the tangent', () => {
    const f = vertical({ held: 'string', points: 'side' })
    const n = net(f, 0)
    expect(dot(n, inward(f, 0))).toBeCloseTo(NET.circle * VERTICAL.unit, 1)
    expect(n.y).toBeCloseTo(VERTICAL.unit, 1)
  })

  test('over a hill the normal force is up and shorter than gravity, so the net force points down to the centre', () => {
    const f = vertical({ held: 'hill' })
    expect(f.centre.y).toBeGreaterThan(f.objects[0].at.y)
    const [normal] = of(f, 'normal')
    expect(way(normal)).toEqual({ x: 0, y: -1 })
    expect(length(normal)).toBeLessThan(GROUND_UNIT)
    const n = net(f, 0)
    expect(dot(n, inward(f, 0)) / Math.hypot(n.x, n.y)).toBeCloseTo(1, 3)
  })

  test('in a dip the normal force is up and longer than gravity, so the net force points up to the centre', () => {
    const f = vertical({ held: 'dip' })
    expect(f.centre.y).toBeLessThan(f.objects[0].at.y)
    const [normal] = of(f, 'normal')
    expect(way(normal)).toEqual({ x: 0, y: -1 })
    expect(length(normal)).toBeGreaterThan(GROUND_UNIT)
    const n = net(f, 0)
    expect(dot(n, inward(f, 0)) / Math.hypot(n.x, n.y)).toBeCloseTo(1, 3)
  })

  test('the acceleration is drawn beside the object, never on it, and points toward the centre', () => {
    for (const held of HELD) {
      for (const direction of ['ccw', 'cw'] as const) {
        const f = vertical({ held, points: 'all', direction })
        const accelerations = of(f, 'acceleration')
        expect(accelerations).toHaveLength(f.objects.length)
        accelerations.forEach((a, i) => {
          expect(a.object).toBe(-1)
          expect(dot(way(a), inward(f, i))).toBeCloseTo(1, 3)
          // On the side the object came from.
          const [v] = f.vectors.filter((x) => x.kind === 'velocity' && x.object === i)
          expect(dot({ x: a.v.x1 - f.objects[i].at.x, y: a.v.y1 - f.objects[i].at.y }, way(v))).toBeLessThan(0)
        })
      }
    }
  })

  test('velocity is along the tangent, the way the object goes round', () => {
    const f = vertical({ points: 'all', direction: 'ccw' })
    // Counterclockwise: left over the top, up the right side, right along the bottom.
    expect(of(f, 'velocity').map(way)).toEqual([
      { x: -1, y: 0 },
      { x: 0, y: -1 },
      { x: 1, y: 0 },
    ])
  })

  test('two arrows pointing the same way from one object are side by side', () => {
    // At the top both forces point down; going clockwise at the side, velocity and gravity both do.
    for (const f of [vertical({ points: 'top' }), vertical({ points: 'side', direction: 'cw', forces: true })]) {
      const down = f.vectors.filter((v) => v.object === 0 && way(v).y === 1)
      expect(down).toHaveLength(2)
      expect(Math.abs(down[0].v.x1 - down[1].v.x1)).toBeCloseTo(16, 1)
    }
  })

  test('letters start at the top and follow the object round', () => {
    const lettered = (direction: 'ccw' | 'cw') => {
      const f = vertical({ points: 'all', direction, pointLabels: true })
      const where = (n: { at: Point }) => (n.at.y < 80 ? 'top' : n.at.y > 290 ? 'bottom' : 'side')
      return f.notes.filter((n) => /^[A-C]$/.test(n.label.text)).map((n) => `${n.label.text} ${where(n)}`)
    }
    expect(lettered('cw')).toEqual(['A top', 'B side', 'C bottom'])
    expect(lettered('ccw')).toEqual(['A top', 'B bottom', 'C side'])
  })

  test('every way of holding it, at every point, stays on the figure with no label on another', () => {
    for (const held of HELD) {
      for (const points of POINTS) {
        for (const direction of ['ccw', 'cw'] as const) {
          for (const radius of ['radius', 'diameter'] as const) {
            const f = vertical({ held, points, direction, radius, pointLabels: true, objectLabel: text('m'), notation: 'arrow' })
            expectOnFigure(f)
            expectNoLabelOnAnother(f)
          }
        }
      }
    }
  })
})

describe('Conical pendulum', () => {
  const conical = (s: Partial<CircularSettings>) => fig({ setup: 'conical', ...s })

  test.each([15, 30, 60])('at %i° the tension’s vertical part is as long as gravity', (angle) => {
    const f = conical({ angle, components: true })
    const [tension] = of(f, 'tension')
    const [gravity] = of(f, 'gravity')
    const theta = (angle * Math.PI) / 180
    expect(length(gravity)).toBeCloseTo(CONICAL.gravity, 1)
    expect(length(tension) * Math.cos(theta)).toBeCloseTo(length(gravity), 1)
    // Drawn that way too: the tension rises as far as gravity falls.
    expect(tension.v.y1 - tension.v.y2).toBeCloseTo(gravity.v.y2 - gravity.v.y1, 1)
    // Its components add up to it, and the horizontal one points at the axis.
    const [x] = of(f, 'x')
    const [y] = of(f, 'y')
    expect(x.v.x2 - x.v.x1).toBeCloseTo(tension.v.x2 - tension.v.x1, 1)
    expect(y.v.y2 - y.v.y1).toBeCloseTo(tension.v.y2 - tension.v.y1, 1)
    expect(dot(way(x), inward(f, 0))).toBeCloseTo(1, 3)
  })

  test('the horizontal component always shows: too short to come out from under the bob, it is drawn from the vertical one’s tip to the tension’s', () => {
    for (let angle = 15; angle <= 60; angle++) {
      for (const object of ['ball', 'block'] as const) {
        const f = conical({ angle, object, components: true })
        const bob = f.objects[0].at
        const [x] = of(f, 'x')
        const [y] = of(f, 'y')
        const [tension] = of(f, 'tension')
        const fromBob = x.v.x1 === bob.x && x.v.y1 === bob.y
        if (fromBob) expect(length(x), `${angle} ${object}`).toBeGreaterThanOrEqual(14 + 18 - 0.5)
        else {
          expect(x.v.x1).toBeCloseTo(y.v.x2, 1)
          expect(x.v.y1).toBeCloseTo(y.v.y2, 1)
          expect(x.v.x2).toBeCloseTo(tension.v.x2, 1)
          expect(x.v.y2).toBeCloseTo(tension.v.y2, 1)
          expect(f.guides).toHaveLength(0)
        }
      }
    }
    expect(of(conical({ angle: 15, components: true }), 'x')[0].v.y1).toBeLessThan(conical({ angle: 15 }).objects[0].at.y)
    expect(conical({ angle: 40, components: true }).guides).toHaveLength(2)
  })

  test('the string is at the angle from the vertical, and the tension runs along it to the pivot', () => {
    const f = conical({ angle: 40 })
    const bob = f.objects[0].at
    const along = { x: CONICAL.pivot.x - bob.x, y: CONICAL.pivot.y - bob.y }
    expect((Math.atan2(-along.x, -along.y) * 180) / Math.PI).toBeCloseTo(40, 1)
    expect(Math.hypot(along.x, along.y)).toBeCloseTo(CONICAL.length, 1)
    const [tension] = of(f, 'tension')
    expect(dot(way(tension), along) / Math.hypot(along.x, along.y)).toBeCloseTo(1, 3)
  })

  test('the path goes through the bob, level with it, under the pivot', () => {
    const f = conical({ angle: 25 })
    expect(f.centre.x).toBe(CONICAL.pivot.x)
    expect(f.centre.y).toBe(f.objects[0].at.y)
    expect(f.radius).toBeCloseTo(f.objects[0].at.x - CONICAL.pivot.x, 1)
  })

  test('the velocity is a dot or a cross beside the bob, and the acceleration points at the axis', () => {
    expect(conical({}).symbol?.way).toBe('out')
    expect(conical({ velocityInto: 'in' }).symbol?.way).toBe('in')
    expect(conical({ velocity: false }).symbol).toBeNull()
    const f = conical({})
    const [a] = of(f, 'acceleration')
    expect(way(a)).toEqual({ x: -1, y: 0 })
    expect(a.object).toBe(-1)
  })

  test('it hangs from a hatched ceiling', () => {
    const f = conical({})
    expect(f.support!.line.y1).toBe(CONICAL.pivot.y)
    expect(f.support!.hatches.length).toBeGreaterThan(5)
  })

  test('components are only drawn with the forces', () => {
    expect(of(conical({ forces: false, components: true }), 'x')).toHaveLength(0)
    expect(conical({ forces: false, components: true }).guides).toHaveLength(0)
    expect(conical({ components: true }).guides).toHaveLength(2)
  })

  test('at every angle, with everything on, it all stays on the figure and no label lands on another', () => {
    for (let angle = 15; angle <= 60; angle += 5) {
      const f = conical({ angle, components: true, radius: 'radius', objectLabel: text('m'), notation: 'arrow' })
      expectOnFigure(f)
      expectNoLabelOnAnother(f)
    }
  })
})

describe('describe', () => {
  test('says what each setup shows', () => {
    const say = (s: Partial<CircularSettings>) => describeFigure({ ...circularSettings.defaults, ...s })
    expect(say({})).toBe('Circular motion seen from above: a ball at one position on a dashed circle, going counterclockwise, with its velocity and centripetal acceleration vectors')
    expect(say({ setup: 'vertical', held: 'hill' })).toBe('A ball at the top of a hill, moving to the left, with gravity and the normal force, its velocity and its centripetal acceleration')
    expect(say({ setup: 'conical', velocity: false, acceleration: false, forces: false })).toBe(
      'A conical pendulum: a ball on a string from a ceiling, 30° from the vertical, going round a level circle',
    )
  })

  test('says which way a side view goes round', () => {
    const say = (s: Partial<CircularSettings>) => describeFigure({ ...circularSettings.defaults, setup: 'vertical', velocity: false, acceleration: false, forces: false, ...s })
    expect(say({ direction: 'cw' })).toBe('A ball on a string going clockwise round a vertical circle, drawn at the top and bottom')
    expect(say({ held: 'loop', points: 'side' })).toBe('A ball going counterclockwise round inside a vertical loop, drawn at the side')
    expect(say({ held: 'hill', direction: 'cw' })).toBe('A ball at the top of a hill, moving to the right')
    expect(say({ held: 'dip' })).toBe('A ball at the bottom of a dip, moving to the right')
    expect(say({ held: 'dip', direction: 'cw' })).toBe('A ball at the bottom of a dip, moving to the left')
  })

  test('names the marks', () => {
    const say = (s: Partial<CircularSettings>) => describeFigure({ ...circularSettings.defaults, velocity: false, acceleration: false, ...s })
    expect(say({ radius: 'radius', angularSpeed: true, angleMark: true, pointLabels: true })).toBe(
      "Circular motion seen from above: a ball at one position on a dashed circle, going counterclockwise. Marked: the radius to the first position, the angular speed, as a curved arrow round the center, the first position's angle, 45° counterclockwise from the right and the positions lettered A, B, C in the order the object reaches them",
    )
    expect(say({ around: 'turntable', inner: true, radius: 'radius' })).toContain('Marked: the radius of each object')
    expect(say({ radius: 'diameter' })).toContain('Marked: the diameter')
    // No angle to mark at 0°.
    expect(say({ angleMark: true, startAngle: 0 })).not.toContain('Marked')
    expect(say({ setup: 'vertical', held: 'hill', radius: 'radius', pointLabels: true, forces: false })).toBe(
      'A ball at the top of a hill, moving to the left. Marked: the radius of the curve, down to its center',
    )
    expect(say({ setup: 'vertical', radius: 'diameter', pointLabels: true, forces: false })).toContain('Marked: the diameter and the positions lettered')
    expect(say({ setup: 'conical', radius: 'radius', forces: false })).toContain("Marked: the circle's radius")
  })
})

describe('settings', () => {
  test('a figure comes back from its page address', () => {
    const s = { ...circularSettings.defaults, setup: 'conical' as const, angle: 50, components: true, tensionLabel: text('F_T'), notation: 'bold' as const }
    expect(circularSettings.fromParams(new URLSearchParams(circularSettings.toQuery(s)))).toEqual(s)
    expect(circularSettings.toQuery(circularSettings.defaults)).toBe('')
  })
})
