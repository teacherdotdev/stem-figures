import { describe, expect, it } from 'vitest'
import { readAxes } from './axes'
import { clipPath, layoutGrid } from './grid'
import type { GridSettings } from './axes'

const box = { x0: 0, x1: 10, y0: 0, y1: 10 }

describe('clipPath', () => {
  it('keeps a line that stays on the grid', () => {
    expect(clipPath([{ x: 1, y: 1 }, { x: 5, y: 5 }, { x: 9, y: 2 }], box)).toEqual([[{ x: 1, y: 1 }, { x: 5, y: 5 }, { x: 9, y: 2 }]])
  })

  it('cuts a line where it leaves the grid, and starts again where it comes back', () => {
    const runs = clipPath([{ x: 1, y: 5 }, { x: 3, y: 15 }, { x: 5, y: 5 }], box)
    expect(runs).toHaveLength(2)
    expect(runs[0].at(-1)).toEqual({ x: 2, y: 10 })
    expect(runs[1][0]).toEqual({ x: 4, y: 10 })
  })

  it('drops a line that is never on the grid', () => {
    expect(clipPath([{ x: -5, y: -5 }, { x: -1, y: -2 }], box)).toEqual([])
  })
})

describe('layoutGrid', () => {
  const s: GridSettings = {
    xEvery: 1, yEvery: 1, title: '', titleMode: 'none', xTitle: '', xTitleMode: 'none', yTitle: '', yTitleMode: 'none',
    xLabel: 'x', xLabelMode: 'text', yLabel: 'y', yLabelMode: 'text',
    xStartCap: 'none', xEndCap: 'none', yStartCap: 'none', yEndCap: 'none', minor: 0, labelSize: 'medium',
  }
  const axes = readAxes({ xFrom: '0', xTo: '50', xStep: '5', yFrom: '0', yTo: '14', yStep: '1' })

  it('places the graph’s corners on the grid’s corners', () => {
    const { px, grid } = layoutGrid(s, axes)
    const near = (v: number) => expect.closeTo(v, 9)
    expect(px({ x: 0, y: 0 })).toEqual({ x: near(grid.x), y: near(grid.y + grid.h) })
    expect(px({ x: 50, y: 14 })).toEqual({ x: near(grid.x + grid.w), y: near(grid.y) })
  })

  it('keeps the axes along the edges when asked, even with 0 on the grid', () => {
    const below = readAxes({ xFrom: '0', xTo: '20', xStep: '1', yFrom: '-20', yTo: '120', yStep: '10' })
    const crossing = layoutGrid(s, below)
    const edges = layoutGrid(s, below, { edges: true })
    expect(crossing.xAxis.y).toBeLessThan(crossing.grid.y + crossing.grid.h)
    expect(edges.xAxis.y).toBe(edges.grid.y + edges.grid.h)
    expect(edges.numbers.filter((n) => n.text === '0')).toHaveLength(2)
  })

  it('keeps room for a generator’s own labels, moving the axis titles out past it', () => {
    const titled = { ...s, xTitle: 'Sport', xTitleMode: 'text' as const, yTitle: 'Votes', yTitleMode: 'text' as const }
    const plain = layoutGrid(titled, axes)
    const roomy = layoutGrid(titled, axes, { room: { x: 40, y: 60 } })
    expect(roomy.height - plain.height).toBeCloseTo(40, 9)
    expect(roomy.width - plain.width).toBeCloseTo(60, 9)
    const side = (g: typeof plain, rotate: boolean) => g.labels.find((l) => l.kind === 'side' && !!l.rotate === rotate)!
    expect(side(roomy, false).y - roomy.grid.y - roomy.grid.h).toBeCloseTo(side(plain, false).y - plain.grid.y - plain.grid.h + 40, 9)
    expect(roomy.grid.x - side(roomy, true).x).toBeCloseTo(plain.grid.x - side(plain, true).x + 60, 9)
  })

  it('is unchanged without room', () => {
    expect(layoutGrid(s, axes, { room: {} })).toEqual(expect.objectContaining({ width: layoutGrid(s, axes).width, height: layoutGrid(s, axes).height }))
  })

  it('reads plain numbers, and says what to fix', () => {
    expect(axes.x).toMatchObject({ start: 0, step: 5, blocks: 10 })
    expect(readAxes({ xFrom: 'a', xTo: '5', xStep: '1', yFrom: '0', yTo: '1', yStep: '0' }).problems).toMatchObject({
      xFrom: 'Type a number, like 0, −5 or 2.5.',
      yStep: 'Count by a number bigger than 0.',
    })
  })
})
