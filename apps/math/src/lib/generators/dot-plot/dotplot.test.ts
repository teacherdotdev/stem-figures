import { describe, expect, test } from 'vitest'
import { buildPlot, LINE } from './dotplot.js'
import { cleanSettings } from './settings.js'

const plot = (s: Record<string, unknown>) => buildPlot(cleanSettings(s))

describe('laying out a dot plot', () => {
  test('one mark per value, stacked up over its tick', () => {
    const g = plot({ data: '1, 2, 2, 3, 3, 3' })
    expect(g.marks).toHaveLength(6)
    const tickX = g.ticks.map((t) => t.x)
    for (const m of g.marks) expect(tickX).toContainEqual(m.x)
    const over3 = g.marks.filter((m) => m.x === g.ticks[3].x).map((m) => m.y)
    expect(over3).toHaveLength(3)
    // Bottom up, evenly, above the line and its ticks.
    expect(over3[0]).toBeGreaterThan(over3[1])
    expect(over3[0] - over3[1]).toBeCloseTo(over3[1] - over3[2])
    expect(over3[0] + g.mark / 2).toBeLessThan(g.ticks[0].y1)
  })

  test('marks never overlap in their column', () => {
    const g = plot({ data: '5 '.repeat(40) })
    const ys = g.marks.map((m) => m.y)
    expect(ys[0] - ys[1]).toBeGreaterThan(g.mark)
  })

  test('a tall column shrinks the marks instead of growing past bounds', () => {
    const short = plot({ data: '1, 2, 2' })
    const tall = plot({ data: '1, ' + '2, '.repeat(60) })
    expect(tall.mark).toBeLessThan(short.mark)
    expect(tall.marks.at(-1)!.y).toBeGreaterThan(0)
    expect(tall.height - short.height).toBeLessThan(400)
  })

  test('marks fit between close ticks', () => {
    const g = plot({ data: '1, 2', from: '0', to: '100', step: '1' })
    expect(g.mark).toBeLessThanOrEqual((LINE / 100) * 0.8 + 3)
  })

  test('the line is the same width with or without data', () => {
    expect(plot({}).axis.x2 - plot({}).axis.x1).toBe(plot({ data: '1, 2, 3' }).axis.x2 - plot({ data: '1, 2, 3' }).axis.x1)
    expect(plot({}).marks).toEqual([])
  })

  test('a value between ticks is drawn where it falls', () => {
    const g = plot({ data: '2.5', from: '0', to: '10', step: '1' })
    expect(g.marks[0].x).toBeCloseTo((g.ticks[2].x + g.ticks[3].x) / 2)
  })

  test('fractions are numbered as fractions', () => {
    const g = plot({ data: '1/4, 1/2, 1/2, 3/4' })
    expect(g.numbers.map((n) => (n.den ? `${n.num}/${n.den}` : n.text))).toEqual(['0', '1/4', '1/2', '3/4', '1'])
  })

  test('says what it shows for screen readers', () => {
    expect(plot({ data: '1, 2, 2', mark: 'x' }).description).toBe('A number line from 0 to 4, with 1 X over 1, 2 X’s over 2.')
  })
})
