import { describe, expect, it } from 'vitest'
import { keyLayout } from '$shared/particles/key'
import { DEFAULT_OUTER, type ParticleKind } from '$shared/particles/particles'
import { KEY_GAP, figureLayout } from './figureLayout'
import { BOX_SIDE } from './settings'

const alone = { shape: 'single', outer: DEFAULT_OUTER } as const
const anion: ParticleKind = { count: 4, ...alone, look: { size: 'l', shade: 'light', charge: '-' }, name: 'Any negative ion' }
const cation: ParticleKind = { count: 0, ...alone, look: { size: 's', shade: 'white', charge: '+' }, name: 'Na⁺' }

describe('the figure for each show setting', () => {
  const key = keyLayout([anion, cation], '')

  it('box only is the square box', () => {
    expect(figureLayout('box', key)).toEqual({ width: BOX_SIDE, height: BOX_SIDE, box: { x: 0, y: 0 }, key: undefined })
  })

  it('key only is just the key', () => {
    expect(figureLayout('key', key)).toEqual({ width: key.width, height: key.height, box: undefined, key: { x: 0, y: 0 } })
  })

  it('box and key puts the key to the right, vertically centered on the box', () => {
    const f = figureLayout('both', key)
    expect(f.width).toBe(BOX_SIDE + KEY_GAP + key.width)
    expect(f.height).toBe(BOX_SIDE)
    expect(f.box).toEqual({ x: 0, y: 0 })
    expect(f.key).toEqual({ x: BOX_SIDE + KEY_GAP, y: (BOX_SIDE - key.height) / 2 })
  })

  it('fits a lattice’s box of its own size beside the key', () => {
    const f = figureLayout('both', key, { width: 120, height: 400 })
    expect(f).toEqual({ width: 120 + KEY_GAP + key.width, height: 400, box: { x: 0, y: 0 }, key: { x: 120 + KEY_GAP, y: (400 - key.height) / 2 } })
    expect(figureLayout('box', key, { width: 120, height: 80 })).toMatchObject({ width: 120, height: 80 })
  })

  it('grows to hold a key taller than the box, keeping them centered on each other', () => {
    const tall = { ...key, height: BOX_SIDE + 100 }
    const f = figureLayout('both', tall)
    expect(f.height).toBe(BOX_SIDE + 100)
    expect(f.box).toEqual({ x: 0, y: 50 })
    expect(f.key!.y).toBe(0)
  })
})
