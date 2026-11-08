import { expect, it } from 'vitest'
import { tileViewport } from './tileViewport'

it('discards the large workspace offset and keeps a small margin', () => {
  expect(tileViewport([{ x: 300, y: 400, width: 400, height: 300 }])).toEqual({ x: 288, y: 388, width: 424, height: 324 })
})
it('includes labels extending outside the edit targets in every direction', () => {
  expect(tileViewport([
    { x: 0, y: 0, width: 300, height: 200 },
    { x: -90, y: -30, width: 450, height: 280 },
  ])).toEqual({ x: -102, y: -42, width: 474, height: 304 })
})
it('shrinks after outer branches are removed', () => {
  const loop = { x: 100, y: 200, width: 400, height: 300 }
  expect(tileViewport([loop]).height).toBeLessThan(tileViewport([loop, { x: 100, y: -100, width: 100, height: 100 }]).height)
})
