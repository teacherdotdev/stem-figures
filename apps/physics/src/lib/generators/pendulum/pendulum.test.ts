import { describe, expect, test } from 'vitest'
import { labelBox, overlaps } from '$lib/shared/layout'
import { boxAround, segmentHits } from '$lib/shared/overlap'
import type { Point } from '$lib/shared/vector'
import { BOB_R, HEIGHT, LENGTH, MIN_SHOWN, MIN_SHOWN_ACROSS, SHORT_HEIGHT, WEIGHT, WIDTH, buildPendulum, weightOf, describe as describeFigure, type FigureVector, type PendulumFigure } from './pendulum'
import { FORCES, MAX_ANGLE, MIN_ANGLE, MIN_SWING_ANGLE, PICTURES, SIDES, pendulumSettings, type PendulumSettings } from './settings'

const settings = (s: Partial<PendulumSettings>) => pendulumSettings.tidy({ ...pendulumSettings.defaults, ...s })
const fig = (s: Partial<PendulumSettings>) => buildPendulum(settings(s))
const everything: Partial<PendulumSettings> = { arc: true, angleMark: true, heightMark: true, pointLabels: true, velocity: true }

const length = (v: FigureVector) => Math.hypot(v.v.x2 - v.v.x1, v.v.y2 - v.v.y1)
const way = (v: FigureVector): Point => ({ x: (v.v.x2 - v.v.x1) / length(v), y: (v.v.y2 - v.v.y1) / length(v) })
const of = (f: PendulumFigure, kind: FigureVector['kind']) => f.vectors.find((v) => v.kind === kind)!
const release = (f: PendulumFigure) => f.bobs.find((b) => b.role === 'release')!.at
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y

/** Every label drawn, with its box. */
const labels = (f: PendulumFigure) =>
  [...f.vectors.map((v) => ({ label: v.label, at: v.labelAt })), ...f.notes.map((n) => ({ label: n.label, at: n.at }))]
    .filter((l) => l.label.mode !== 'none' && l.label.text !== '')
    .map((l) => ({ ...l, box: labelBox(l.at, l.label) }))

function expectOnFigure(f: PendulumFigure) {
  for (const p of f.extent) {
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.x).toBeLessThanOrEqual(WIDTH)
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.y).toBeLessThanOrEqual(HEIGHT)
  }
}

function expectNoLabelOnAnother(f: PendulumFigure) {
  const all = labels(f)
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) expect(overlaps(all[i].box, all[j].box), `${all[i].label.text} on ${all[j].label.text}`).toBe(false)
}

/** No label on a string, a bob or an arrow. */
function expectLabelsClear(f: PendulumFigure) {
  const strings = f.bobs.map((b) => ({ x1: f.pivot.x, y1: f.pivot.y, x2: b.at.x, y2: b.at.y }))
  const arrows = f.vectors.map((v) => v.v)
  for (const l of labels(f)) {
    const box = boxAround(l.at, l.box.w / 2 - 2, l.box.h / 2 - 2)
    for (const s of [...strings, ...arrows]) expect(segmentHits(box, s), `${l.label.text} on a line`).toBe(false)
    for (const b of f.bobs) {
      expect(segmentHits(box, { x1: b.at.x - BOB_R, y1: b.at.y, x2: b.at.x + BOB_R, y2: b.at.y }), `${l.label.text} on a bob`).toBe(false)
      expect(segmentHits(box, { x1: b.at.x, y1: b.at.y - BOB_R, x2: b.at.x, y2: b.at.y + BOB_R }), `${l.label.text} on a bob`).toBe(false)
    }
  }
}

describe('settings', () => {
  test('the first screen is the Swing at 30° to the right, with its path, angle, length and height', () => {
    const s = pendulumSettings.defaults
    expect([s.picture, s.angle, s.side, s.arc, s.angleMark, s.heightMark, s.pointLabels]).toEqual(['swing', 30, 'right', true, true, true, false])
    expect(s.lengthLabel).toEqual({ mode: 'text', text: 'L' })
  })

  test('angles are whole degrees from 5° to 75°, and at least 15° in the Swing', () => {
    expect(settings({ picture: 'one', angle: 2 }).angle).toBe(MIN_ANGLE)
    expect(settings({ picture: 'one', angle: 90 }).angle).toBe(MAX_ANGLE)
    expect(settings({ picture: 'one', angle: 22.6 }).angle).toBe(23)
    expect(settings({ picture: 'swing', angle: 5 }).angle).toBe(MIN_SWING_ANGLE)
    expect(pendulumSettings.fromParams(new URLSearchParams('angle=8')).angle).toBe(MIN_SWING_ANGLE)
    expect(pendulumSettings.fromParams(new URLSearchParams('picture=one&angle=8')).angle).toBe(8)
  })

  test('the address carries only what differs, and reads back the same', () => {
    expect(pendulumSettings.toQuery(pendulumSettings.defaults)).toBe('')
    const s = settings({ picture: 'one', angle: 25, forces: 'components', weightLabel: { mode: 'text', text: 'F_g' }, bobLabel: { mode: 'none', text: 'm' } })
    const back = pendulumSettings.fromParams(new URLSearchParams(pendulumSettings.toQuery(s)))
    expect(pendulumSettings.keyOf(back)).toBe(pendulumSettings.keyOf(s))
  })
})

describe('the bobs', () => {
  test('one bob, on the string, θ from the vertical on its side', () => {
    for (const side of SIDES) {
      const f = fig({ picture: 'one', angle: 40, side })
      expect(f.bobs).toHaveLength(1)
      const b = release(f)
      expect(Math.hypot(b.x - f.pivot.x, b.y - f.pivot.y)).toBeCloseTo(LENGTH, 1)
      expect((Math.atan2(Math.abs(b.x - f.pivot.x), b.y - f.pivot.y) * 180) / Math.PI).toBeCloseTo(40, 1)
      expect(Math.sign(b.x - f.pivot.x)).toBe(side === 'right' ? 1 : -1)
    }
  })

  test('the Swing: released on its side, at the bottom, and at the same height on the far side, those two lighter', () => {
    for (const side of SIDES) {
      const f = fig({ side, angle: 35 })
      const [bottom, far, rel] = ['bottom', 'far', 'release'].map((r) => f.bobs.find((b) => b.role === r)!)
      expect(rel.ghost).toBe(false)
      expect(bottom.ghost && far.ghost).toBe(true)
      expect(bottom.at).toEqual(f.lowest)
      expect(bottom.at.x).toBe(f.pivot.x)
      expect(far.at.y).toBeCloseTo(rel.at.y, 1)
      expect(far.at.x - f.pivot.x).toBeCloseTo(-(rel.at.x - f.pivot.x), 1)
      expect(Math.sign(rel.at.x - f.pivot.x)).toBe(side === 'right' ? 1 : -1)
    }
  })

  test('the Swing bobs stand apart at its smallest angle', () => {
    const f = fig({ angle: MIN_SWING_ANGLE })
    const [a, b] = [f.bobs[0].at, f.bobs[2].at]
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(2 * BOB_R + 20)
  })
})

describe('forces on One bob', () => {
  test('the Swing has none, and One bob none until asked', () => {
    expect(fig({ forces: 'components' }).vectors).toHaveLength(0)
    expect(fig({ picture: 'one' }).vectors).toHaveLength(0)
  })

  test('tension toward the pivot, as long as mg cos θ; weight straight down', () => {
    for (const side of SIDES) {
      const f = fig({ picture: 'one', side, angle: 30, forces: 'tensionWeight' })
      expect(f.vectors.map((v) => v.kind)).toEqual(['tension', 'weight'])
      const t = of(f, 'tension')
      const b = release(f)
      const toPivot = { x: (f.pivot.x - b.x) / LENGTH, y: (f.pivot.y - b.y) / LENGTH }
      expect(dot(way(t), toPivot)).toBeCloseTo(1, 3)
      expect(length(t)).toBeCloseTo(WEIGHT * Math.cos(Math.PI / 6), 1)
      expect(way(of(f, 'weight'))).toEqual({ x: 0, y: 1 })
      expect(length(of(f, 'weight'))).toBeCloseTo(WEIGHT, 1)
    }
  })

  test('at every angle each force shows past the bob, and the tension stays mg cos θ of weight', () => {
    for (let angle = MIN_ANGLE; angle <= MAX_ANGLE; angle += 5) {
      const f = fig({ picture: 'one', angle, forces: 'components' })
      for (const v of f.vectors) expect(length(v), `${v.kind} at ${angle}°`).toBeGreaterThanOrEqual(BOB_R + (v.kind === 'across' ? MIN_SHOWN_ACROSS : MIN_SHOWN) - 0.01)
      const cos = Math.cos((angle * Math.PI) / 180)
      expect(length(of(f, 'tension')) / length(of(f, 'weight'))).toBeCloseTo(cos, 3)
      expect(length(of(f, 'along')) / length(of(f, 'weight'))).toBeCloseTo(cos, 3)
      expect(length(of(f, 'weight'))).toBeCloseTo(weightOf(angle), 1)
    }
    expect(weightOf(30)).toBe(WEIGHT)
    expect(weightOf(75)).toBeGreaterThan(WEIGHT)
  })

  test('mg sin θ too short to show is drawn longer, without its guide', () => {
    const f = fig({ picture: 'one', angle: 5, forces: 'components' })
    expect(length(of(f, 'across'))).toBeCloseTo(BOB_R + MIN_SHOWN_ACROSS, 1)
    expect(f.guides).toHaveLength(1)
  })

  test('the bob’s label stays on its side away from the vertical', () => {
    for (const side of SIDES)
      for (const forces of FORCES)
        for (const angle of [5, 25, 50, 75]) {
          const f = fig({ picture: 'one', side, angle, forces })
          const m = f.notes.find((n) => n.label.text === 'm')!
          expect(Math.sign(m.at.x - release(f).x), `${side} ${forces} ${angle}°`).toBe(side === 'right' ? 1 : -1)
        }
  })

  test('the components add up to weight: along the string, away from the pivot, and along the path, toward the bottom', () => {
    for (const side of SIDES) {
      const f = fig({ picture: 'one', side, angle: 25, forces: 'components' })
      const [w, along, across] = [of(f, 'weight'), of(f, 'along'), of(f, 'across')]
      expect(along.v.x2 - along.v.x1 + across.v.x2 - across.v.x1).toBeCloseTo(w.v.x2 - w.v.x1, 1)
      expect(along.v.y2 - along.v.y1 + across.v.y2 - across.v.y1).toBeCloseTo(w.v.y2 - w.v.y1, 1)
      expect(dot(way(along), way(across))).toBeCloseTo(0, 3)
      // Along the path toward the bottom: toward the vertical, and down.
      const b = release(f)
      expect(Math.sign(way(across).x)).toBe(Math.sign(f.pivot.x - b.x))
      expect(way(across).y).toBeGreaterThan(0)
      expect(f.guides).toHaveLength(2)
      expect(along.label.text).toBe('mg cos theta')
    }
  })
})

describe('the Swing', () => {
  test('velocity only on the bottom bob, along the path toward the far side', () => {
    for (const side of SIDES) {
      const f = fig({ side, velocity: true })
      expect(f.vectors.map((v) => v.kind)).toEqual(['velocity'])
      const v = of(f, 'velocity')
      expect({ x: v.v.x1, y: v.v.y1 }).toEqual(f.lowest)
      expect(way(v)).toEqual({ x: side === 'right' ? -1 : 1, y: 0 })
    }
  })

  test('the height mark is on the far side, from the release height to the lowest point', () => {
    for (const side of SIDES) {
      const f = fig({ side, angle: 40 })
      const m = f.heightMark!
      const far = f.bobs.find((b) => b.role === 'far')!.at
      expect(m.top).toBeCloseTo(release(f).y, 1)
      expect(m.bottom).toBeCloseTo(f.lowest.y, 1)
      expect(Math.abs(m.x - f.pivot.x)).toBeGreaterThan(Math.abs(far.x - f.pivot.x) + BOB_R)
      expect(Math.sign(m.x - f.pivot.x)).toBe(side === 'right' ? -1 : 1)
      expect(m.outside).toBe(false)
    }
  })

  test('a short height has its heads outside', () => {
    const f = fig({ angle: 15 })
    expect(f.heightMark!.bottom - f.heightMark!.top).toBeLessThan(SHORT_HEIGHT)
    expect(f.heightMark!.outside).toBe(true)
  })

  test('letters A, B, C go by the release, bottom and far bobs', () => {
    const f = fig({ pointLabels: true })
    const letters = f.notes.filter((n) => !n.italic)
    expect(letters.map((n) => n.label.text)).toEqual(['A', 'B', 'C'])
    const near = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.y - q.y)
    const at = (role: string) => f.bobs.find((b) => b.role === role)!.at
    ;['release', 'bottom', 'far'].forEach((role, i) => {
      const own = near(letters[i].at, at(role))
      for (const other of ['release', 'bottom', 'far']) if (other !== role) expect(own).toBeLessThan(near(letters[i].at, at(other)))
    })
  })
})

describe('every figure', () => {
  const angles = [MIN_ANGLE, 15, 30, 45, 60, MAX_ANGLE]
  const cases: Partial<PendulumSettings>[] = []
  for (const picture of PICTURES)
    for (const side of SIDES)
      for (const angle of angles)
        for (const forces of picture === 'one' ? FORCES : (['none'] as const)) cases.push({ ...everything, picture, side, angle, forces })

  test('fits the box', () => {
    for (const c of cases) expectOnFigure(fig(c))
  })

  test('no label lands on another', () => {
    for (const c of cases) expectNoLabelOnAnother(fig(c))
  })

  test('no label lands on a string, a bob or an arrow', () => {
    for (const c of cases) expectLabelsClear(fig(c))
  })

  test('blank labels take their room, and labels that are off draw nothing', () => {
    const blank = { mode: 'blank' as const, text: '' }
    const f = fig({ ...everything, angleLabel: blank, lengthLabel: blank, heightLabel: blank, bobLabel: blank, labelA: blank, labelB: blank, labelC: blank })
    expectOnFigure(f)
    expectNoLabelOnAnother(f)
    const none = { mode: 'none' as const, text: '' }
    expect(labels(fig({ angleLabel: none, lengthLabel: none, heightLabel: none, bobLabel: none }))).toHaveLength(0)
  })

  test('says what it shows', () => {
    expect(describeFigure(settings({}))).toContain('released 30° to the right')
    expect(describeFigure(settings({ picture: 'one', side: 'left', forces: 'components' }))).toContain('components')
  })
})
