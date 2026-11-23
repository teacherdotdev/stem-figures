import { describe, expect, test } from 'vitest'
import { CEILING_Y, HATCH_SPACING, ceiling, ceilingHatches, ground, groundHatches, wall } from './support'

describe('ceiling', () => {
  test('is a level line where it was asked for, at the usual height unless told', () => {
    expect(ceiling(210, 430).line).toEqual({ x1: 210, y1: CEILING_Y, x2: 430, y2: CEILING_Y })
    expect(ceiling(20, 90, 120).line).toEqual({ x1: 20, y1: 120, x2: 90, y2: 120 })
  })

  test('its hatches start on the line and lean up to the right, inside its width', () => {
    const { line, hatches } = ceiling(210, 430)
    expect(hatches).toHaveLength(16)
    expect(hatches[0]).toEqual({ x1: 214, y1: 34, x2: 222, y2: 24 })
    expect(hatches[1].x1 - hatches[0].x1).toBe(HATCH_SPACING)
    for (const h of hatches) {
      expect(h.y1).toBe(line.y1)
      expect(h.y2).toBeLessThan(line.y1)
      expect(h.x1).toBeGreaterThan(line.x1)
      expect(h.x2).toBeLessThan(line.x2)
    }
  })

  test('a wider ceiling has more hatches, and one too narrow has none', () => {
    expect(ceiling(0, 400).hatches.length).toBeGreaterThan(ceiling(0, 200).hatches.length)
    expect(ceiling(0, 10).hatches).toHaveLength(0)
  })

  test('hatches the line it is given', () => {
    const line = { x1: 50, y1: 60, x2: 150, y2: 60 }
    expect(ceilingHatches(line)).toEqual(ceiling(50, 150, 60).hatches)
  })
})

describe('ground', () => {
  test('is a level line where it was asked for', () => {
    expect(ground(30, 610, 390).line).toEqual({ x1: 30, y1: 390, x2: 610, y2: 390 })
  })

  test('its hatches start on the line and lean down to the left', () => {
    const { line, hatches } = ground(30, 610, 390)
    expect(hatches).toHaveLength(45)
    expect(hatches[0]).toEqual({ x1: 41.2, y1: 390, x2: 34, y2: 399 })
    expect(hatches[1].x1 - hatches[0].x1).toBeCloseTo(HATCH_SPACING)
    for (const h of hatches) {
      expect(h.y1).toBe(line.y1)
      expect(h.y2).toBeGreaterThan(line.y1)
      expect(h.x2).toBeLessThan(h.x1)
      expect(h.x2).toBeGreaterThan(line.x1)
      expect(h.x2).toBeLessThan(line.x2)
    }
  })

  test('hatches the line it is given, at any place', () => {
    const line = { x1: 100.5, y1: 200, x2: 160, y2: 200 }
    expect(groundHatches(line)).toEqual(ground(100.5, 160, 200).hatches)
    expect(groundHatches(line).map((h) => h.x2)).toEqual([104.5, 117.5, 130.5, 143.5, 156.5])
  })
})

describe('wall', () => {
  test('is an upright line with hatches on its solid side, starting on the line', () => {
    const w = wall(90, 20, 200)
    expect(w.line).toEqual({ x1: 90, y1: 20, x2: 90, y2: 200 })
    expect(w.hatches.length).toBe(Math.ceil((200 - 20 - 4) / HATCH_SPACING))
    for (const h of w.hatches) {
      expect(h.x1).toBe(90)
      expect(h.x2).toBeLessThan(90)
      expect(h.y2).toBeGreaterThan(h.y1)
      expect(h.y1).toBeLessThan(200)
    }
    for (const h of wall(90, 20, 200, 'right').hatches) expect(h.x2).toBeGreaterThan(90)
  })
})
