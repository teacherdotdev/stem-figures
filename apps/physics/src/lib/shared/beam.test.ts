import { describe, expect, test } from 'vitest'
import { FULCRUM_GROUND, FULCRUM_SLOPE, MARK_ROW, WITNESS_PAST, beamRect, cable, distanceMarks, forceOnBeam, fulcrum, hangingObject, hingeAt } from './beam'

describe('beamRect', () => {
  test('is a level bar around the line between its ends, whichever end comes first', () => {
    const rect = { x: 80, y: 193, width: 480, height: 14 }
    expect(beamRect({ x: 80, y: 200 }, { x: 560, y: 200 }, 14)).toEqual(rect)
    expect(beamRect({ x: 560, y: 200 }, { x: 80, y: 200 }, 14)).toEqual(rect)
  })
})

describe('fulcrum', () => {
  const f = fulcrum({ x: 300, y: 206 }, 54)

  test('is a triangle with its apex where it was put and its base level, the height below', () => {
    const [apex, left, right] = f.triangle
    expect(apex).toEqual({ x: 300, y: 206 })
    expect(f.apex).toEqual(apex)
    expect(left.y).toBe(260)
    expect(right.y).toBe(260)
    expect(apex.x - left.x).toBeCloseTo(54 * FULCRUM_SLOPE, 2)
    expect(right.x - apex.x).toBeCloseTo(54 * FULCRUM_SLOPE, 2)
  })

  test('stands on a hatched ground line a little wider than its base', () => {
    const [, left, right] = f.triangle
    expect(f.ground.line.y1).toBe(260)
    expect(f.ground.line.x1).toBeCloseTo(left.x - FULCRUM_GROUND, 2)
    expect(f.ground.line.x2).toBeCloseTo(right.x + FULCRUM_GROUND, 2)
    expect(f.ground.hatches.length).toBeGreaterThan(3)
    for (const h of f.ground.hatches) expect(Math.max(h.y1, h.y2)).toBeGreaterThan(260)
  })

  test('can stand anywhere along a beam', () => {
    expect(fulcrum({ x: 110, y: 206 }, 54).triangle[0].x).toBe(110)
    expect(fulcrum({ x: 512.5, y: 100 }, 30).ground.line.y1).toBe(130)
  })
})

describe('forceOnBeam', () => {
  const beam = beamRect({ x: 80, y: 200 }, { x: 560, y: 200 }, 14)

  test('a force down onto the top ends on it', () => {
    expect(forceOnBeam(beam, 120, 'down', 90)).toEqual({ x1: 120, y1: 103, x2: 120, y2: 193 })
  })

  test('a force up from the top starts on it', () => {
    expect(forceOnBeam(beam, 120, 'up', 90)).toEqual({ x1: 120, y1: 193, x2: 120, y2: 103 })
  })

  test('on the underside, a force up ends on it and a force down starts on it', () => {
    expect(forceOnBeam(beam, 300, 'up', 50, 'bottom')).toEqual({ x1: 300, y1: 257, x2: 300, y2: 207 })
    expect(forceOnBeam(beam, 300, 'down', 50, 'bottom')).toEqual({ x1: 300, y1: 207, x2: 300, y2: 257 })
  })

  test('never lies inside the beam', () => {
    for (const side of ['top', 'bottom'] as const)
      for (const direction of ['up', 'down'] as const) {
        const v = forceOnBeam(beam, 200, direction, 60, side)
        const [near, far] = [Math.min(v.y1, v.y2), Math.max(v.y1, v.y2)]
        expect(far <= beam.y || near >= beam.y + beam.height).toBe(true)
        expect(far - near).toBe(60)
      }
  })
})

describe('distanceMarks from the pivot', () => {
  const pivot = { x: 300, y: 260 }

  test('points either side of the pivot share one row', () => {
    const m = distanceMarks([{ x: 110, y: 206 }, { x: 530, y: 206 }], 285, 'fromPivot', { pivot })
    expect(m.rows).toBe(1)
    expect(m.marks.map((k) => k.line)).toEqual([
      { x1: 110, y1: 285, x2: 300, y2: 285 },
      { x1: 300, y1: 285, x2: 530, y2: 285 },
    ])
    expect(m.marks.map((k) => k.between)).toEqual([[0, -1], [-1, 1]])
    expect(m.marks[0].middle).toEqual({ x: 205, y: 285 })
    expect(m.bottom).toBe(285)
  })

  test('points on the same side get a row each, the nearer one nearer the beam', () => {
    const m = distanceMarks([{ x: 560, y: 206 }, { x: 212, y: 206 }], 285, 'fromPivot', { pivot: { x: 140, y: 260 } })
    expect(m.rows).toBe(2)
    // In the order the points were given.
    expect(m.marks.map((k) => k.between[1])).toEqual([0, 1])
    expect(m.marks[0].row).toBe(1)
    expect(m.marks[1].row).toBe(0)
    expect(m.marks[0].line).toEqual({ x1: 140, y1: 285 + MARK_ROW, x2: 560, y2: 285 + MARK_ROW })
    expect(m.marks[1].line).toEqual({ x1: 140, y1: 285, x2: 212, y2: 285 })
    expect(m.bottom).toBe(285 + MARK_ROW)
  })

  test('rows are as far apart as asked', () => {
    const m = distanceMarks([{ x: 200, y: 0 }, { x: 300, y: 0 }, { x: 400, y: 0 }], 50, 'fromPivot', { pivot: { x: 100, y: 0 }, rowGap: 25 })
    expect(m.marks.map((k) => k.line.y1)).toEqual([50, 75, 100])
  })

  test('each witness line drops from its point to just past its own dimension line, the pivot’s to the lowest', () => {
    const m = distanceMarks([{ x: 560, y: 206 }, { x: 212, y: 206 }], 285, 'fromPivot', { pivot: { x: 140, y: 260 } })
    const at = (x: number) => m.witnesses.find((w) => w.x1 === x)!
    expect(m.witnesses).toHaveLength(3)
    expect(at(212)).toEqual({ x1: 212, y1: 206, x2: 212, y2: 285 + WITNESS_PAST })
    expect(at(560)).toEqual({ x1: 560, y1: 206, x2: 560, y2: 285 + MARK_ROW + WITNESS_PAST })
    expect(at(140)).toEqual({ x1: 140, y1: 260, x2: 140, y2: 285 + MARK_ROW + WITNESS_PAST })
  })

  test('no dimension line overlaps another, and no witness line crosses one it doesn’t end on', () => {
    const points = [60, 130, 250, 390, 420, 600].map((x) => ({ x, y: 206 }))
    const m = distanceMarks(points, 285, 'fromPivot', { pivot })
    expect(m.marks).toHaveLength(6)
    for (const a of m.marks)
      for (const b of m.marks) {
        if (a === b || a.row !== b.row) continue
        expect(Math.min(a.line.x2, b.line.x2) - Math.max(a.line.x1, b.line.x1)).toBeLessThanOrEqual(0)
      }
    for (const w of m.witnesses)
      for (const k of m.marks) {
        const inside = w.x1 > k.line.x1 + 0.01 && w.x1 < k.line.x2 - 0.01
        expect(inside && w.y1 < k.line.y1 && w.y2 > k.line.y1).toBe(false)
      }
  })

  test('a point at the pivot gets no mark, and no points means no marks', () => {
    const m = distanceMarks([{ x: 300, y: 206 }, { x: 400, y: 206 }], 285, 'fromPivot', { pivot })
    expect(m.marks.map((k) => k.between)).toEqual([[-1, 1]])
    const none = distanceMarks([], 285, 'fromPivot', { pivot })
    expect(none).toEqual({ marks: [], witnesses: [], rows: 0, bottom: 285 })
  })

  test('needs a pivot', () => {
    expect(() => distanceMarks([{ x: 1, y: 1 }], 285, 'fromPivot')).toThrow()
  })
})

describe('distanceMarks chained', () => {
  test('measures from each point to the next along the beam, in one row, whatever order they come in', () => {
    const m = distanceMarks([{ x: 400, y: 206 }, { x: 100, y: 206 }, { x: 250, y: 260 }], 285, 'chained')
    expect(m.rows).toBe(1)
    expect(m.marks.map((k) => k.line)).toEqual([
      { x1: 100, y1: 285, x2: 250, y2: 285 },
      { x1: 250, y1: 285, x2: 400, y2: 285 },
    ])
    expect(m.marks.map((k) => k.between)).toEqual([[1, 2], [2, 0]])
    expect(m.witnesses).toHaveLength(3)
    expect(m.witnesses.find((w) => w.x1 === 250)).toEqual({ x1: 250, y1: 260, x2: 250, y2: 285 + WITNESS_PAST })
  })

  test('two points at the same place have no mark between them', () => {
    const m = distanceMarks([{ x: 100, y: 0 }, { x: 100, y: 0 }, { x: 300, y: 0 }], 50, 'chained')
    expect(m.marks).toHaveLength(1)
    expect(m.marks[0].line).toEqual({ x1: 100, y1: 50, x2: 300, y2: 50 })
  })

  test('one point alone has nothing to measure', () => {
    expect(distanceMarks([{ x: 100, y: 0 }], 50, 'chained')).toEqual({ marks: [], witnesses: [], rows: 0, bottom: 50 })
  })
})

describe('for a beam with loads at a wall', () => {
  const beam = { x: 100, y: 200, width: 400, height: 12 }

  test('distance marks can stack upward, with witness lines rising past them', () => {
    const m = distanceMarks([{ x: 200, y: 200 }, { x: 300, y: 200 }], 180, 'fromPivot', { pivot: { x: 100, y: 200 }, rowGap: 30, upward: true })
    expect(m.marks.map((k) => k.line.y1).sort()).toEqual([150, 180])
    expect(m.bottom).toBe(150)
    for (const w of m.witnesses) expect(w.y2).toBeLessThan(w.y1)
    expect(Math.min(...m.witnesses.map((w) => w.y2))).toBe(150 - WITNESS_PAST)
  })

  test('a hanging object hangs on its string from the underside', () => {
    const h = hangingObject(beam, 250, 24, 56)
    expect(h.string).toEqual({ x1: 250, y1: 212, x2: 250, y2: 236 })
    expect(h.at).toEqual({ x: 250, y: 292 })
    expect([h.top, h.bottom]).toEqual([236, 292])
  })

  test('the hinge is on the beam’s middle line at the wall', () => {
    expect(hingeAt(beam, 100)).toEqual({ x: 100, y: 206 })
  })

  test('a cable rises from the beam’s top to the wall at its angle, with its arc between them', () => {
    const c = cable(beam, 500, 100, 30)
    expect(c.line.x1).toBe(500)
    expect(c.line.y1).toBe(200)
    expect(c.line.x2).toBe(100)
    expect(c.line.y2).toBeCloseTo(200 - 400 * Math.tan(Math.PI / 6), 1)
    expect(c.arc.from).toEqual({ x: 466, y: 200 })
    expect(c.arc.to.x).toBeCloseTo(500 - 34 * Math.cos(Math.PI / 6), 1)
    expect(c.arc.sweep).toBe(1)
    expect(c.labelAt.x).toBeLessThan(500)
    expect(c.labelAt.y).toBeLessThan(200)
  })
})
