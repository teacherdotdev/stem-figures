import { describe, expect, it } from 'vitest'
import { compactAxis, mapWirePath } from './compactLayout'

describe('compact circuit spacing', () => {
  it('shortens wire-only runs while reserving space for component leads', () => {
    const map = compactAxis(0, 0, 400, [{ start: 100, end: 150, size: 38 }, { start: 150, end: 200, size: 38 }])
    expect(map(100) - map(0)).toBe(28)
    expect(map(200) - map(100)).toBe(76)
    expect(map(400) - map(0)).toBeLessThan(400)
    expect(map(150) - map(100)).toBeGreaterThanOrEqual(38)
  })
  it('expands label intervals without reversing or collapsing neighbouring tiles', () => {
    const map = compactAxis(0, -100, 300, [{ start: 0, end: 100, size: 180 }])
    expect(map(100) - map(0)).toBeGreaterThanOrEqual(180)
    const positions = Array.from({ length: 81 }, (_, i) => map(i * 5 - 100))
    expect(positions.every((n, i) => i === 0 || n > positions[i - 1])).toBe(true)
  })
  it('keeps shared wire endpoints identical through turns and branches', () => {
    const x = compactAxis(0, 0, 200, [])
    const y = compactAxis(0, -100, 200, [])
    expect(mapWirePath('M0 0 H100 V100 Q100 102 102 102 H200', x, y)).toBe(`M${x(0)} ${y(0)} H${x(100)} V${y(100)} Q${x(100)} ${y(102)} ${x(102)} ${y(102)} H${x(200)}`)
    expect(mapWirePath('M100 0 V-100', x, y)).toBe(`M${x(100)} ${y(0)} V${y(-100)}`)
  })
})
