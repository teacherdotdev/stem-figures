// What can be tested of uploads without a browser: the sizes they're cut
// down to and their references. Drawing them onto a canvas and exporting a
// figure with one are tested in a real browser by
// scripts/test-food-web-uploads.mjs.

import { describe, expect, it } from 'vitest'
import { fitWithin, keyOf, MAX_SIDE } from './images'

describe('uploaded pictures', () => {
  it('are cut down to fit within 300 px, keeping their shape', () => {
    expect(fitWithin(1200, 800)).toEqual({ width: 300, height: 200 })
    expect(fitWithin(800, 1200)).toEqual({ width: 200, height: 300 })
    expect(fitWithin(4000, 4000)).toEqual({ width: 300, height: 300 })
    expect(fitWithin(120, 90)).toEqual({ width: 120, height: 90 })
    expect(fitWithin(5000, 3)).toEqual({ width: 300, height: 1 })
    // An SVG with no size of its own is drawn at the largest size.
    expect(fitWithin(0, 0)).toEqual({ width: MAX_SIDE, height: MAX_SIDE })
    for (const [w, h] of [[301, 2], [999, 1000], [3000, 2999], [1, 1]]) {
      const fit = fitWithin(w, h)
      expect(Math.max(fit.width, fit.height)).toBeLessThanOrEqual(MAX_SIDE)
    }
  })

  it('get equal references for equal bytes, and different ones otherwise', async () => {
    const a = new TextEncoder().encode('<svg>one</svg>')
    const b = new TextEncoder().encode('<svg>one</svg>')
    const c = new TextEncoder().encode('<svg>two</svg>')
    expect(await keyOf(a)).toBe(await keyOf(b))
    expect(await keyOf(a)).not.toBe(await keyOf(c))
    expect(await keyOf(a)).toMatch(/^u-[0-9a-f]{12}$/)
  })
})
