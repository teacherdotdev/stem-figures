import { describe, expect, test } from 'vitest'
import {
  added,
  coasterSettings,
  heightTyped,
  moved,
  newPoint,
  removed,
  type CoasterSettings,
  type TrackPoint,
} from './settings'
import { MARK_ROOM, buildTrack, curveAt, describe as describeTrack, lengthRuns, slopes, type TrackFigure } from './track'

const text = (t: string) => ({ mode: 'text', text: t }) as const
const none = (t = '') => ({ mode: 'none', text: t }) as const
const LETTERS = 'ABCDEFGH'
/** Points at these heights, lettered, each with its height marked. */
const points = (heights: number[], more: Partial<TrackPoint>[] = []): TrackPoint[] =>
  heights.map((h, i) => newPoint(h, LETTERS[i], more[i]))
const make = (over: Partial<CoasterSettings> = {}) => buildTrack({ ...coasterSettings.defaults, ...over })
const track = (heights: number[], over: Partial<CoasterSettings> = {}) => make({ points: points(heights), ...over })

const ALTERNATING = [0, 100, 0, 100, 0, 100, 0, 100]

function expectInside(f: TrackFigure) {
  for (const p of f.extent) {
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.x).toBeLessThanOrEqual(f.width)
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.y).toBeLessThanOrEqual(f.height)
  }
}

describe('the curve', () => {
  test('passes through every point', () => {
    for (const heights of [[40, 10, 25, 5], [30, 0], ALTERNATING, [10, 20, 20, 60, 5]]) {
      const f = track(heights)
      f.points.forEach((p) => expect(curveAt(f.knots, p.at.x).y).toBeCloseTo(p.at.y, 1))
    }
  })

  test('heights are to scale with each other, the tallest filling the room above the ground', () => {
    const f = track([40, 10, 25, 5])
    const up = f.points.map((p) => f.groundY - p.at.y)
    expect(up[1] / up[0]).toBeCloseTo(10 / 40, 2)
    expect(up[2] / up[0]).toBeCloseTo(25 / 40, 2)
    expect(up[0]).toBeGreaterThan(f.height * 0.6)
  })

  test('points are evenly spaced from left to right', () => {
    const xs = track([40, 10, 25, 5, 30], { object: 'none' }).points.map((p) => p.at.x)
    const gaps = xs.slice(1).map((x, i) => x - xs[i])
    gaps.forEach((g) => expect(g).toBeCloseTo(gaps[0], 1))
  })

  test('between two points it stays between their heights, so no hill is taller than typed', () => {
    for (const heights of [[40, 10, 25, 5], ALTERNATING, [0, 5, 100, 95, 0], [50, 49, 0, 1, 80]]) {
      const f = track(heights, { object: 'none' })
      f.points.slice(1).forEach((b, i) => {
        const a = f.points[i]
        for (let k = 0; k <= 40; k++) {
          const y = curveAt(f.knots, a.at.x + ((b.at.x - a.at.x) * k) / 40).y
          expect(y).toBeGreaterThanOrEqual(Math.min(a.at.y, b.at.y) - 0.01)
          expect(y).toBeLessThanOrEqual(Math.max(a.at.y, b.at.y) + 0.01)
        }
      })
    }
  })

  test('is level at hills, dips and both ends, and slopes at a point partway down', () => {
    const f = track([40, 10, 25, 5], { object: 'none' })
    f.points.forEach((p) => expect(curveAt(f.knots, p.at.x).slope).toBeCloseTo(0, 6))
    const down = track([40, 25, 10, 0], { object: 'none' })
    expect(curveAt(down.knots, down.points[1].at.x).slope).toBeGreaterThan(0.1) // down the page, to the right
    expect(curveAt(down.knots, down.points[0].at.x).slope).toBe(0)
    expect(curveAt(down.knots, down.points[3].at.x).slope).toBe(0)
  })

  test('between a higher and a lower neighbour the slope is the harmonic mean of the slopes either side', () => {
    expect(slopes([0, 1, 2], [0, 1, 3])[1]).toBeCloseTo(2 / (1 / 1 + 1 / 2), 6)
    expect(slopes([0, 1, 2], [0, 1, 0])).toEqual([0, 0, 0])
  })

  test('equal heights make a truly level stretch', () => {
    const f = track([30, 10, 10, 20], { object: 'none' })
    const [b, c] = [f.points[1].at, f.points[2].at]
    for (let k = 0; k <= 20; k++) expect(curveAt(f.knots, b.x + ((c.x - b.x) * k) / 20).y).toBeCloseTo(b.y, 6)
  })

  test('is one path, a cubic Bézier for each gap', () => {
    const f = track([40, 10, 25, 5], { object: 'none' })
    expect(f.path.match(/M/g)).toHaveLength(1)
    expect(f.path.match(/C/g)).toHaveLength(3)
  })
})

describe('the loop', () => {
  const looped = (over: Partial<CoasterSettings> = {}) => track([40, 0, 0, 10], { loopAt: 2, ...over })

  test('touches the track at its point, which is at its bottom, and the track is level under it', () => {
    for (const heights of [
      [40, 0, 0, 10],
      [60, 20, 20, 0],
      [50, 10, 30],
    ]) {
      const f = track(heights, { loopAt: 2 })
      const { center, r } = f.loop!
      const p = f.points[1].at
      expect(center.x).toBeCloseTo(p.x, 1)
      expect(center.y + r).toBeCloseTo(p.y, 1)
      for (const x of [center.x - r, center.x, center.x + r]) {
        expect(curveAt(f.knots, x).y).toBeCloseTo(p.y, 1)
        expect(curveAt(f.knots, x).slope).toBeCloseTo(0, 6)
      }
    }
  })

  test('its radius is to scale with the heights', () => {
    const f = looped({ loopRadius: 10 })
    expect(f.loop!.r / (f.groundY - f.points[0].at.y)).toBeCloseTo(10 / 40, 2)
    expect(f.loopCapped).toBe(false)
  })

  test('stays in the figure, however big, at any point', () => {
    for (const loopRadius of [2, 8, 25, 50]) {
      for (const loopAt of [1, 2, 4]) {
        const f = looped({
          loopRadius,
          loopAt,
          loopTopLabel: text('T'),
          objectOnLoop: true,
          velocity: 'forward',
        })
        expectInside(f)
        expect(f.loop!.center.y - f.loop!.r).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('with no room for it, it is drawn smaller and says so', () => {
    const f = track([10, 5, 0, 0, 5, 10, 5, 0], { loopAt: 3, loopRadius: 50 })
    expect(f.loopCapped).toBe(true)
    const xs = f.points.map((p) => p.at.x)
    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(43.9)
    expectInside(f)
  })

  test('a loop at a point the track no longer has is no loop', () => {
    expect(track([40, 0], { loopAt: 5 }).loop).toBeNull()
  })

  test('an object at its top hangs upside down inside it, and forward is to the left there', () => {
    const f = looped({ objectOnLoop: true, velocity: 'forward' })
    const { center, r } = f.loop!
    expect(f.object!.tilt).toBe(180)
    // The cart's body (its bottom 1.4 wheel radii up from its wheels' bottoms) is inside the loop, its wheels on it.
    const o = f.object!
    const lift = o.height * 0.19 * 1.4
    const body = o.corners.map((c, i) => (i < 2 ? { x: c.x, y: c.y + lift } : c))
    for (const c of body) expect(Math.hypot(c.x - center.x, c.y - center.y)).toBeLessThanOrEqual(r + 0.5)
    expect(f.object!.at.y).toBeLessThan(center.y)
    expect(f.velocity!.x2).toBeLessThan(f.velocity!.x1)
    // Every point keeps its dot, since the object is at none of them.
    expect(f.points.every((p) => p.dot)).toBe(true)
  })
})

describe('everything drawn is inside the figure', () => {
  const everything = { velocity: 'forward', loopTopLabel: text('T') } as const
  test('for 2 points, 8 points, all heights 0, and heights 0 and 100 alternating', () => {
    for (const heights of [
      [30, 0],
      [0, 30],
      [50, 20, 40, 15, 30, 10, 20, 0],
      [0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      ALTERNATING,
      [...ALTERNATING].reverse(),
    ]) {
      for (const object of ['cart', 'ball', 'block', 'none'] as const) {
        for (const objectAt of [1, 2, heights.length]) {
          for (const rough of [false, true]) {
            const pts = points(
              heights,
              heights.map(() => ({ rough })),
            )
            expectInside(
              make({
                ...everything,
                points: pts,
                object,
                objectAt,
                objectSize: 1.2,
              }),
            )
            expectInside(
              make({
                ...everything,
                points: pts,
                object,
                objectAt,
                loopAt: 2,
                objectOnLoop: objectAt === 2,
              }),
            )
          }
        }
      }
    }
  }, 30_000)

  test('room taken while fitting is given back: no empty band under the ground', () => {
    // Three hills down to the ground, whose labels at the dips first ran off the bottom.
    const f = track([45, 0, 35, 0, 25, 0])
    expect(f.groundY).toBe(track([40, 10, 25, 5]).groundY)
    expectInside(f)
  })

  test('with long labels at 8 points, and no two labels on top of each other', () => {
    const pts = [50, 20, 40, 15, 30, 10, 20, 5].map((h, i) =>
      newPoint(h, `PE_${i + 1}`, { heightLabel: text(`h_${i + 1} = ${h} m`) }),
    )
    const f = make({ points: pts })
    expectInside(f)
    const boxes = f.labels.map((l) => ({
      ...l.at,
      w: l.label.text.length * 6,
      h: 20,
    }))
    boxes.forEach((a, i) =>
      boxes.slice(i + 1).forEach((b) => expect(Math.abs(a.x - b.x) < 10 && Math.abs(a.y - b.y) < 10).toBe(false)),
    )
  })
})

describe('the object', () => {
  test('a cart rests with both wheels on the track, tilted with it', () => {
    for (const objectAt of [1, 2, 3, 4]) {
      const f = track([40, 25, 10, 0], { objectAt })
      const o = f.object!
      const t = (o.tilt * Math.PI) / 180
      for (const side of [-1, 1]) {
        const wheel = {
          x: o.at.x + Math.cos(t) * side * 0.3 * o.width,
          y: o.at.y + Math.sin(t) * side * 0.3 * o.width,
        }
        expect(curveAt(f.knots, wheel.x).y).toBeCloseTo(wheel.y, 0)
      }
    }
    expect(track([40, 25, 10, 0], { objectAt: 2 }).object!.tilt).toBeGreaterThan(10)
  })

  test('at the first or last point it stands level, all of it on the track', () => {
    for (const objectAt of [1, 4]) {
      for (const object of ['cart', 'ball', 'block'] as const) {
        const f = track([40, 10, 25, 5], { objectAt, object, objectSize: 1 })
        const o = f.object!
        expect(o.tilt).toBeCloseTo(0, 6)
        expect(o.at.y).toBeCloseTo(f.points[objectAt - 1].at.y, 1)
        expect(o.at.x - o.width / 2).toBeGreaterThanOrEqual(f.knots[0].x)
        expect(o.at.x + o.width / 2).toBeLessThanOrEqual(f.knots.at(-1)!.x)
      }
    }
  })

  test('its point has no dot, and the point’s label is above it', () => {
    const f = track([40, 10, 25, 5], { objectAt: 3 })
    expect(f.points.map((p) => p.dot)).toEqual([true, true, false, true])
    const label = f.labels.find((l) => l.kind === 'point' && l.point === 2)!
    expect(label.at.y).toBeLessThan(f.object!.at.y - f.object!.height)
  })

  test('is drawn smaller where the track bends too tightly under it, but never below the smallest size', () => {
    const tight = make({
      points: points(ALTERNATING),
      objectAt: 3,
      objectSize: 1.2,
    }).object!
    expect(tight.size).toBeLessThan(1.2)
    expect(tight.size).toBeGreaterThanOrEqual(0.3)
    expect(track([40, 25, 10, 0], { objectAt: 2, objectSize: 1.2 }).object!.size).toBe(1.2)
  })

  test('velocity points along the track from the object, forward or back', () => {
    const f = track([40, 25, 10, 0], { objectAt: 2, velocity: 'forward' })
    const b = track([40, 25, 10, 0], { objectAt: 2, velocity: 'back' })
    expect(f.velocity!.x2).toBeGreaterThan(f.velocity!.x1)
    expect(f.velocity!.y2).toBeGreaterThan(f.velocity!.y1) // down the slope
    expect(b.velocity!.x2).toBeLessThan(b.velocity!.x1)
    expect(track([40, 25, 10, 0], { object: 'none', velocity: 'forward' }).velocity).toBeNull()
  })
})

describe('marks', () => {
  test('a height mark runs from the ground straight up to its point; height 0 and none have no mark', () => {
    const pts = points([40, 0, 25, 5])
    pts[2].heightLabel = none()
    const f = make({ points: pts })
    expect(f.heightMarks.map((m) => m !== null)).toEqual([true, false, false, true])
    const m = f.heightMarks[3]!
    expect(m.x1).toBe(f.points[3].at.x)
    expect(m.x2).toBe(m.x1)
    expect(m.y1).toBe(f.groundY)
    expect(m.y2).toBeGreaterThan(f.points[3].at.y)
    expect(m.y2).toBeLessThan(f.points[3].at.y + 8)
  })

  test('a length mark spans its rough stretch, sits below the ground and crosses no height mark', () => {
    for (const heights of [
      [30, 0, 0, 12],
      [30, 20, 10, 12],
    ]) {
      const f = make({ points: points(heights, [{}, { rough: true }]) })
      expect(f.lengthMarks).toHaveLength(1)
      const { m } = f.lengthMarks[0]
      expect(m.x1).toBe(f.points[1].at.x)
      expect(m.x2).toBe(f.points[2].at.x)
      expect(m.y1).toBe(m.y2) // always horizontal
      expect(m.y1).toBe(f.groundY + 26)
      for (const h of f.heightMarks) if (h) expect(Math.max(h.y1, h.y2)).toBeLessThan(m.y1)
      // A line comes down to each end of it, from the ground, or from the track where no height mark does.
      expect(f.extensions.map((e) => e.x1)).toEqual([m.x1, m.x2])
      f.extensions.forEach((e, i) => {
        expect(e.y2).toBeGreaterThan(m.y1)
        expect(e.y1).toBeCloseTo(f.heightMarks[i + 1] ? f.groundY : f.points[i + 1].at.y + 3, 1)
      })
      expect(f.labels.find((l) => l.kind === 'length')!.at.y).toBeGreaterThan(m.y1)
      expectInside(f)
    }
  })

  test('the figure keeps room under the ground only when a length mark is shown', () => {
    const plain = track([30, 0, 0, 12])
    const marked = make({
      points: points([30, 0, 0, 12], [{}, { rough: true }]),
    })
    const unmarked = make({
      points: points([30, 0, 0, 12], [{}, { rough: true, lengthLabel: none('d') }]),
      roughLabel: none(),
    })
    expect(plain.groundY - marked.groundY).toBe(MARK_ROOM)
    expect(unmarked.groundY).toBe(plain.groundY)
    expect(unmarked.lengthMarks).toHaveLength(0)
    expect(unmarked.hatches.length).toBeGreaterThan(5)
  })

  test('two rough stretches side by side get a mark each, end to end, sharing the line between them', () => {
    const f = make({
      points: points([30, 0, 0, 0, 12], [{}, { rough: true }, { rough: true, lengthLabel: text('12 m') }]),
    })
    expect(f.lengthMarks.map((m) => [m.from, m.to])).toEqual([
      [1, 2],
      [2, 3],
    ])
    expect(f.lengthMarks[0].m.x2).toBe(f.lengthMarks[1].m.x1)
    expect(f.lengthMarks[0].m.y1).toBe(f.lengthMarks[1].m.y1)
    expect(f.extensions).toHaveLength(3)
  })

  test('a rough stretch with no label joins the mark before it', () => {
    const f = make({
      points: points(
        [30, 0, 0, 0, 12],
        [{}, { rough: true }, { rough: true, lengthLabel: none('d') }, { rough: true, lengthLabel: none('d') }],
      ),
    })
    expect(f.lengthMarks.map((m) => [m.from, m.to])).toEqual([[1, 4]])
    expect(f.lengthMarks[0].m.x2).toBe(f.points[4].at.x)
    expect(f.labels.filter((l) => l.kind === 'length')).toHaveLength(1)
  })

  test('a run whose first stretch has no label has no mark until a stretch with one', () => {
    const s = {
      ...coasterSettings.defaults,
      points: points(
        [30, 0, 0, 0],
        [
          { rough: true, lengthLabel: none('d') },
          { rough: true, lengthLabel: none('d') },
        ],
      ),
    }
    expect(lengthRuns(s)).toEqual([])
    s.points[1].lengthLabel = text('d')
    expect(lengthRuns(s).map((r) => [r.from, r.to])).toEqual([[1, 2]])
  })

  test('the last point’s rough switch does nothing: no stretch follows it', () => {
    const f = make({ points: points([30, 0], [{}, { rough: true }]) })
    expect(f.hatches).toHaveLength(0)
    expect(f.lengthMarks).toHaveLength(0)
  })

  test('hatching runs along the underside of the curve, unbroken through the point between two rough stretches', () => {
    const f = make({
      points: points([30, 10, 0, 12], [{ rough: true }, { rough: true }]),
      object: 'none',
    })
    for (const h of f.hatches) {
      expect(curveAt(f.knots, h.x1).y).toBeCloseTo(h.y1, 0)
      expect(h.y2).toBeGreaterThan(curveAt(f.knots, h.x2).y) // its end is below the track
    }
    const gaps = f.hatches.slice(1).map((h, i) => Math.hypot(h.x1 - f.hatches[i].x1, h.y1 - f.hatches[i].y1))
    expect(Math.max(...gaps)).toBeLessThan(15)
    expect(f.hatches[0].x1).toBeLessThan(f.points[1].at.x)
    expect(f.hatches.at(-1)!.x1).toBeGreaterThan(f.points[1].at.x)
  })

  test('the ground can be switched off, and the marks stay where they are', () => {
    const pts = points([30, 0, 0, 12], [{}, { rough: true }])
    const on = make({ points: pts })
    const off = make({ points: pts, ground: false })
    expect(off.ground).toBeNull()
    expect(off.lengthMarks).toEqual(on.lengthMarks)
    expect(off.heightMarks).toEqual(on.heightMarks)
    // With no height mark at a raised point, the line down to the length mark starts at the track.
    const raised = make({
      points: points([30, 10, 10, 12], [{}, { rough: true, heightLabel: none() }]),
      ground: false,
    })
    expect(raised.extensions[0].y1).toBeCloseTo(raised.points[1].at.y + 3, 1)
  })
})

describe('labels', () => {
  test('a point with no label has no dot and only shapes the track', () => {
    const pts = points([40, 10, 25, 5])
    pts[1].label = none('B')
    const f = make({ points: pts, object: 'none' })
    expect(f.points.map((p) => p.dot)).toEqual([true, false, true, true])
    expect(f.labels.filter((l) => l.kind === 'point').map((l) => l.point)).toEqual([0, 2, 3])
  })

  test('a point’s label starts just above the track', () => {
    const f = track([40, 10, 25, 5], { object: 'none' })
    f.labels
      .filter((l) => l.kind === 'point')
      .forEach((l) => {
        const p = f.points[l.point!].at
        expect(l.at.y).toBeLessThan(p.y)
        expect(Math.hypot(l.at.x - p.x, l.at.y - p.y)).toBeLessThan(40)
      })
  })

  test('a height’s label is beside its mark, or on it when there’s no room', () => {
    const f = track([40, 10, 25, 5])
    f.labels
      .filter((l) => l.kind === 'height')
      .forEach((l) => {
        const m = f.heightMarks[l.point!]!
        expect(l.at.x).toBeGreaterThan(m.x1)
        expect(l.at.x - m.x1).toBeLessThan(40)
      })
    const crowded = track(ALTERNATING, { object: 'none' })
    expect(crowded.labels.filter((l) => l.kind === 'height')).toHaveLength(4)
    crowded.labels
      .filter((l) => l.kind === 'height')
      .forEach((l) => expect(Math.abs(l.at.x - crowded.heightMarks[l.point!]!.x1)).toBeLessThan(45))
  })

  test('the rough label is under the first rough stretch, or over it when a length mark is in the way', () => {
    const pts = points([30, 20, 10, 0], [{ rough: true, lengthLabel: none('d') }, {}, { rough: true }])
    const f = make({ points: pts, object: 'none' })
    const l = f.labels.find((l) => l.kind === 'rough')!
    expect(l.at.x).toBeGreaterThan(f.points[0].at.x)
    expect(l.at.x).toBeLessThan(f.points[1].at.x)
    expect(l.at.y).toBeGreaterThan(curveAt(f.knots, l.at.x).y)
    const level = make({
      points: points([30, 0, 0, 12], [{}, { rough: true }]),
    })
    const over = level.labels.find((l) => l.kind === 'rough')!
    expect(over.at.y).toBeLessThan(level.groundY)
  })
})

describe('settings', () => {
  const { toQuery, fromParams, defaults } = coasterSettings
  const round = (s: CoasterSettings) => fromParams(new URLSearchParams(toQuery(s)))

  test('the defaults make an empty address', () => {
    expect(toQuery(defaults)).toBe('')
    expect(round(defaults)).toEqual(defaults)
  })

  test('survive toQuery and fromParams', () => {
    const s: CoasterSettings = {
      ...defaults,
      points: [
        newPoint(60, 'PE_g', { heightLabel: text('h') }),
        // A hidden label's text isn't in the address, so it comes back as the row's default.
        newPoint(0, 'B', {
          label: none('A'),
          rough: true,
          lengthLabel: text('12 m'),
        }),
        newPoint(0, 'KE = 0, v = 0', {
          heightLabel: { mode: 'blank', text: '0 m' },
          rough: true,
          lengthLabel: none('d'),
        }),
        newPoint(12.5, 'D; end'),
      ],
      loopAt: 2,
      loopRadius: 12.5,
      radiusLabel: text('12.5 m'),
      loopTopLabel: text('T'),
      object: 'ball',
      objectSize: 0.9,
      objectLabel: text('2 kg'),
      objectAt: 3,
      objectOnLoop: true,
      velocity: 'back',
      velocityLabel: text('v_0'),
      roughLabel: text('mu_k = 0.2'),
      ground: false,
      mirror: true,
      color: true,
    }
    expect(round(s)).toEqual(s)
  })

  test('the loop and the object are kept on the track, however the settings come in', () => {
    expect(fromParams(new URLSearchParams('loopAt=8&objectAt=7'))).toMatchObject({ loopAt: 0, objectAt: 4 })
    expect(coasterSettings.clean({ ...defaults, points: points([40, 0]), loopAt: 3, objectAt: 5 })).toMatchObject({ loopAt: 0, objectAt: 2 })
    expect(coasterSettings.clean({ ...defaults, loopAt: 4, objectAt: 4 })).toMatchObject({ loopAt: 4, objectAt: 4 })
  })

  test('a track has 2 to 8 points, with heights from 0 to 100', () => {
    expect(coasterSettings.clean({ points: [] }).points).toHaveLength(2)
    expect(
      coasterSettings.clean({
        points: Array.from({ length: 12 }, () => newPoint(5, 'A')),
      }).points,
    ).toHaveLength(8)
    expect(
      coasterSettings.clean({ points: [newPoint(250, 'A'), newPoint(-5, 'B')] }).points.map((p) => p.height),
    ).toEqual([100, 0])
  })
})

describe('relabelling', () => {
  const list = (pts: TrackPoint[], loopAt = 0, objectAt = 1) => ({
    points: pts,
    loopAt,
    objectAt,
  })
  const letters = (pts: TrackPoint[]) => pts.map((p) => p.label.text)

  test('letters still in order are re-lettered when a point is added, moved or removed', () => {
    expect(letters(added(list(points([40, 10, 25]))).points)).toEqual(['A', 'B', 'C', 'D'])
    expect(letters(removed(list(points([40, 10, 25])), 0).points)).toEqual(['A', 'B'])
    const swapped = moved(list(points([40, 10, 25])), 0, 1).points
    expect(letters(swapped)).toEqual(['A', 'B', 'C'])
    expect(swapped.map((p) => p.height)).toEqual([10, 40, 25])
  })

  test('keeps typed labels', () => {
    const typed = () => {
      const pts = points([40, 10, 25])
      pts[1].label.text = 'PE_g'
      return pts
    }
    expect(letters(added(list(typed())).points)).toEqual(['A', 'PE_g', 'C', 'D'])
    expect(letters(removed(list(typed()), 0).points)).toEqual(['PE_g', 'C'])
    expect(letters(moved(list(typed()), 1, 1).points)).toEqual(['A', 'C', 'PE_g'])
  })

  test('a new point is level with the last, with its height marked', () => {
    const p = added(list(points([40, 10]))).points[2]
    expect(p.height).toBe(10)
    expect(p.heightLabel).toEqual(text('10 m'))
    expect(added(list(points(ALTERNATING))).points).toHaveLength(8)
    expect(removed(list(points([40, 10])), 0).points).toHaveLength(2)
  })

  test('a height mark still showing its height follows the height; one the teacher typed is kept', () => {
    const [a, b, c] = points([40, 10, 25])
    heightTyped(a, 55)
    expect(a).toMatchObject({ height: 55, heightLabel: text('55 m') })
    b.heightLabel.text = 'h'
    heightTyped(b, 20)
    expect(b).toMatchObject({ height: 20, heightLabel: text('h') })
    heightTyped(c, 250)
    expect(c.heightLabel.text).toBe('100 m')
    expect(coasterSettings.clean({ points: [a, b, c] }).points[2].height).toBe(100)
  })

  test('a height mark keeps following through a height typed past 100, to 3 decimals, or cleared on the way', () => {
    const [a, b, c] = points([40, 10, 25])
    heightTyped(a, 400)
    heightTyped(a, 40)
    expect(a).toMatchObject({ height: 40, heightLabel: text('40 m') })
    heightTyped(b, 12.345)
    expect(b.heightLabel.text).toBe(`${coasterSettings.clean({ points: [b, c] }).points[0].height} m`)
    heightTyped(b, 20)
    expect(b.heightLabel).toEqual(text('20 m'))
    // Backspacing 25 to 2, to nothing, then typing 3.
    heightTyped(c, 2)
    heightTyped(c, null)
    expect(c.heightLabel).toEqual(text('2 m'))
    heightTyped(c, 3)
    expect(c).toMatchObject({ height: 3, heightLabel: text('3 m') })
    // A typed mark is kept, even through an empty field.
    c.heightLabel.text = 'h'
    heightTyped(c, null)
    heightTyped(c, 7)
    expect(c.heightLabel).toEqual(text('h'))
  })

  test('a point added while the last height is empty starts at 0, marked 0 m', () => {
    const pts = points([40, 10])
    heightTyped(pts[1], null)
    const p = added(list(pts)).points[2]
    expect(p).toMatchObject({ height: 0, heightLabel: text('0 m') })
  })

  test('the loop and the object follow their point', () => {
    expect(moved(list(points([40, 0, 25]), 2, 1), 1, 1)).toMatchObject({
      loopAt: 3,
      objectAt: 1,
    })
    expect(moved(list(points([40, 0, 25]), 2, 3), 1, 1)).toMatchObject({
      loopAt: 3,
      objectAt: 2,
    })
    expect(removed(list(points([40, 0, 25]), 3, 3), 0)).toMatchObject({
      loopAt: 2,
      objectAt: 2,
    })
    expect(removed(list(points([40, 0, 25]), 2, 2), 1)).toMatchObject({
      loopAt: 0,
      objectAt: 2,
    })
  })
})

describe('the words for screen readers', () => {
  test('read the labels drawn, never the heights behind them', () => {
    const s = {
      ...coasterSettings.defaults,
      points: [newPoint(50, 'A', { heightLabel: text('h') }), newPoint(0, 'B', { heightLabel: none('0 m') }), newPoint(0, 'D', { heightLabel: none('0 m') })],
      loopAt: 2,
      loopRadius: 15,
      loopTopLabel: text('C'),
    }
    const words = describeTrack(s)
    expect(words).not.toMatch(/50|15/)
    expect(words).toContain('A, the start, height marked h')
    expect(words).toContain('A loop stands at B, its radius marked R, its top labeled C.')
    expect(words).toContain('A cart labeled m is at A.')
  })

  test('name a blank line, the rough stretch with its labels, and the velocity', () => {
    const words = describeTrack({
      ...coasterSettings.defaults,
      points: [newPoint(30, 'A', { heightLabel: { mode: 'blank', text: '30 m' } }), newPoint(0, 'B', { rough: true }), newPoint(0, 'C')],
      object: 'block',
      objectAt: 2,
      velocity: 'forward',
    })
    expect(words).toContain('height marked a blank line')
    expect(words).toContain('The track from B to C is rough, labeled μ_k, its length marked d.')
    expect(words).toContain('A block labeled m is at B, moving forward along the track with velocity v.')
    expect(words).not.toMatch(/30/)
  })

  test('say which way the track runs when mirrored, and the shapes of its points', () => {
    const words = describeTrack({ ...coasterSettings.defaults, mirror: true })
    expect(words).toMatch(/^A roller coaster track through four points, right to left: A, the start, height marked 40 m; B, a dip/)
    expect(words).toContain('C, a hilltop')
  })
})
