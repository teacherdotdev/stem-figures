import { describe, expect, it } from 'vitest'
import { RADIUS } from '$shared/particles/particles'
import { keyLayout } from '$shared/particles/key'
import { ARROW_GAP, ARROW_PAD, arrowLayout, boxesSize, figureLayout } from './figureLayout'
import { BOX_SIDE, boxContents, keyKinds, particleSettings } from './settings'

describe('key settings in the address', () => {
  it('are left out of the address at their defaults', () => {
    expect(particleSettings.toQuery(particleSettings.defaults)).toBe('')
  })

  it('an old link without key settings opens unchanged, with the box only', () => {
    const kinds = [{ count: 3, shape: 'single', look: { size: 'm', shade: 'gray', charge: '' }, outer: { size: 's', shade: 'white', charge: '' } }]
    const old = new URLSearchParams('particles=' + JSON.stringify(kinds) + '&seed=9')
    const s = particleSettings.fromParams(old)
    expect(s.show).toBe('box')
    expect(s.keyNote).toBe('')
    expect(s.particles).toEqual(kinds)
    expect(particleSettings.toQuery(s)).toBe(old.toString())
  })

  it('travel in the address', () => {
    const d = particleSettings.defaults
    const s = { ...d, show: 'both' as const, keyNote: 'H₂O molecules are not shown', particles: [{ ...d.particles[0], name: 'Cl⁻' }, d.particles[1]] }
    expect(particleSettings.fromParams(new URLSearchParams(particleSettings.toQuery(s)))).toEqual(s)
  })

  it('clip the note to 80 characters', () => {
    expect(particleSettings.fromParams(new URLSearchParams('keyNote=' + 'x'.repeat(100))).keyNote).toHaveLength(80)
  })
})

describe('what the box holds', () => {
  const d = particleSettings.defaults

  it('scattered: the fixed square with the particle kinds', () => {
    const box = boxContents(d)
    expect(box).toMatchObject({ width: BOX_SIDE, height: BOX_SIDE, border: 'single', kinds: d.particles })
    expect(box.discs).toHaveLength(8)
  })

  it('a liquid or solid: the same fixed square, its particles arranged for the state', () => {
    for (const state of ['liquid', 'solid'] as const) {
      const box = boxContents({ ...d, state })
      expect(box).toMatchObject({ width: BOX_SIDE, height: BOX_SIDE, border: 'single', kinds: d.particles })
      expect(box.discs).toHaveLength(8)
      expect(box.discs).not.toEqual(boxContents(d).discs)
    }
  })

  it('a state travels in the address, and an address without one is a gas', () => {
    const s = { ...d, state: 'liquid' as const }
    expect(particleSettings.toQuery(s)).toBe('state=liquid')
    expect(particleSettings.fromParams(new URLSearchParams('state=liquid'))).toEqual(s)
    expect(particleSettings.fromParams(new URLSearchParams('seed=4')).state).toBe('gas')
  })

  it('a lattice: a box that just fits the grid, with no border unless one is added', () => {
    const s = { ...d, layout: 'lattice' as const, pattern: 'pure' as const, rows: 2, columns: 3 }
    const box = boxContents(s)
    const r = RADIUS[s.main.size]
    expect(box).toMatchObject({ width: 6 * r, height: 4 * r, border: 'none' })
    expect(box.discs).toHaveLength(6)
    const bordered = boxContents({ ...s, latticeBorder: 'single' })
    expect(bordered.width).toBeGreaterThan(box.width)
    expect(bordered.discs[0].x).toBeGreaterThan(box.discs[0].x)
  })

  it('a lattice keeps the scattered particles for when the teacher switches back', () => {
    const s = particleSettings.fromParams(new URLSearchParams(particleSettings.toQuery({ ...d, layout: 'lattice' })))
    expect(s.particles).toEqual(d.particles)
  })

  it('a lattice’s key lists its one or two atoms or ions, with their names', () => {
    const lattice = { ...d, layout: 'lattice' as const, mainName: 'Cl⁻ ion', secondName: 'Na⁺ ion' }
    expect(boxContents({ ...lattice, pattern: 'pure' }).kinds.map((k) => [k.look, k.name])).toEqual([[d.main, 'Cl⁻ ion']])
    expect(boxContents({ ...lattice, pattern: 'alternate' }).kinds.map((k) => [k.look, k.name])).toEqual([
      [d.main, 'Cl⁻ ion'],
      [d.second, 'Na⁺ ion'],
    ])
  })

  it('leaves the second kind out of the key when none of it is drawn', () => {
    const lattice = { ...d, layout: 'lattice' as const }
    expect(boxContents({ ...lattice, pattern: 'substitute', secondCount: 0 }).kinds).toHaveLength(1)
    expect(boxContents({ ...lattice, pattern: 'interstitial', rows: 1, secondCount: 3 }).kinds).toHaveLength(1)
    expect(boxContents({ ...lattice, pattern: 'alternate', rows: 1, columns: 1 }).kinds).toHaveLength(1)
    expect(boxContents({ ...lattice, pattern: 'substitute', secondCount: 2 }).kinds).toHaveLength(2)
  })

  it('counts second atoms beyond the lattice’s room', () => {
    const s = { ...d, layout: 'lattice' as const, pattern: 'interstitial' as const, rows: 2, columns: 2, secondCount: 3 }
    expect(boxContents(s).missing).toBe(2)
  })
})

describe('lattice settings in the address', () => {
  it('round rows and columns to whole numbers from 1 to 12', () => {
    const s = particleSettings.fromParams(new URLSearchParams('rows=3.6&columns=40'))
    expect([s.rows, s.columns]).toEqual([4, 12])
  })

  it('tidy the two looks like any other', () => {
    const main = JSON.stringify({ size: 'xl', shade: 'dark', charge: '2+' })
    const s = particleSettings.fromParams(new URLSearchParams(`main=${encodeURIComponent(main)}&second=nonsense`))
    expect(s.main).toEqual({ size: 'xl', shade: 'dark', charge: '2+' })
    expect(s.second).toEqual(particleSettings.defaults.second)
  })

  it('fill what a look leaves out from that look’s own default', () => {
    const s = particleSettings.fromParams(new URLSearchParams(`main=${encodeURIComponent('{"shade":"black"}')}`))
    expect(s.main).toEqual({ ...particleSettings.defaults.main, shade: 'black' })
  })
})

describe('a key that lists each atom', () => {
  const d = particleSettings.defaults
  const gray = { size: 'l', shade: 'gray', charge: '' } as const
  const white = { size: 's', shade: 'white', charge: '' } as const
  const water = { count: 5, shape: 'bent', look: gray, outer: white, name: 'H₂O molecule' } as const
  const s = { ...d, particles: [water], keyList: 'atoms' as const, atomNames: [{ look: white, name: 'H atom' }] }

  it('lists the atoms instead of the kinds, with their own names', () => {
    expect(keyKinds(s, boxContents(s)).map((k) => [k.look, k.name])).toEqual([
      [gray, undefined],
      [white, 'H atom'],
    ])
    expect(keyKinds({ ...s, keyList: 'particles' }, boxContents(s)).map((k) => k.name)).toEqual(['H₂O molecule'])
  })

  it('leaves the box as it is', () => {
    expect(boxContents(s)).toEqual(boxContents({ ...s, keyList: 'particles' }))
  })

  it('doesn’t change a lattice’s key, which lists its atoms already', () => {
    const lattice = { ...s, layout: 'lattice' as const }
    expect(keyKinds(lattice, boxContents(lattice))).toEqual(boxContents(lattice).kinds)
  })

  it('travels in the address', () => {
    expect(particleSettings.fromParams(new URLSearchParams(particleSettings.toQuery(s)))).toEqual(s)
  })
})

describe('before and after boxes', () => {
  const d = particleSettings.defaults
  const white = { size: 's', shade: 'white', charge: '' } as const
  const gray = { size: 'm', shade: 'gray', charge: '' } as const
  // 2 H₂ + O₂ → 2 H₂O, with an O₂ left over
  const particles = [
    { count: 4, after: 0, shape: 'pair', look: white, outer: white },
    { count: 3, after: 1, shape: 'pair', look: gray, outer: gray },
    { count: 0, after: 4, shape: 'bent', look: gray, outer: white },
  ] as const
  const s = { ...d, boxes: 'two' as const, particles: particles.map((k) => ({ ...k })), show: 'both' as const }

  it('draws each kind’s before count in the first box and its after count in the second', () => {
    const box = boxContents(s)
    expect(box.discs).toHaveLength(4 * 2 + 3 * 2)
    expect(box.after!.discs).toHaveLength(1 * 2 + 4 * 3)
    expect(box.after!.kinds.map((k) => k.count)).toEqual([0, 1, 4])
    expect([box.missing, box.after!.missing]).toEqual([0, 0])
  })

  it('keeps both boxes the fixed square, with the arrow’s gap between', () => {
    const box = boxContents(s)
    expect([box.width, box.height]).toEqual([BOX_SIDE, BOX_SIDE])
    expect(boxesSize(box)).toEqual({ width: 2 * BOX_SIDE + ARROW_GAP, height: BOX_SIDE })
    expect(boxesSize(boxContents(d))).toEqual({ width: BOX_SIDE, height: BOX_SIDE })
    for (const disc of box.after!.discs) {
      expect(disc.x - disc.r).toBeGreaterThan(0)
      expect(disc.x + disc.r).toBeLessThan(BOX_SIDE)
    }
  })

  it('puts one key for both to the right of the after box', () => {
    const box = boxContents(s)
    const key = keyLayout(keyKinds(s, box), '')
    expect(key.lines).toHaveLength(3)
    expect(figureLayout('both', key, boxesSize(box)).key!.x).toBeGreaterThan(2 * BOX_SIDE + ARROW_GAP)
  })

  it('arranges the after box on its own, in its own state', () => {
    const same = { ...s, particles: s.particles.map((k) => ({ ...k, after: k.count })) }
    expect(boxContents(same).after!.discs).not.toEqual(boxContents(same).discs)
    const frozen = boxContents({ ...s, afterState: 'solid' })
    expect(frozen.discs).toEqual(boxContents(s).discs)
    expect(frozen.after!.discs).not.toEqual(boxContents(s).after!.discs)
  })

  it('has as many after as before until an after count is set, for a change of state', () => {
    const change = { ...d, boxes: 'two' as const, afterState: 'solid' as const }
    expect(boxContents(change).after!.discs).toHaveLength(boxContents(change).discs.length)
  })

  it('counts what doesn’t fit in the after box', () => {
    const crowd = { ...s, particles: [{ ...s.particles[0], after: 60, look: { ...white, size: 'xl' as const }, outer: { ...white, size: 'xl' as const } }] }
    expect(boxContents(crowd).after!.missing).toBeGreaterThan(0)
  })

  it('has no arrow label until one is typed, and keeps the arrow’s usual gap', () => {
    expect(d.arrowLabel).toBe('')
    expect(particleSettings.toQuery(s)).not.toContain('arrowLabel')
    expect(arrowLayout('').spans).toEqual([])
    expect(arrowLayout('   ').gap).toBe(ARROW_GAP)
  })

  it('labels the arrow with short text, subscripts and superscripts as in key names', () => {
    const heat = arrowLayout('heat')
    expect(heat.gap).toBe(ARROW_GAP)
    expect(heat.spans.map((sp) => sp.text)).toEqual(['heat'])
    expect(arrowLayout('+ O_2').spans.map((sp) => sp.text)).toEqual(['+ O', '2'])
  })

  it('widens the gap for a long label, so it never runs onto the boxes', () => {
    const long = arrowLayout('cooled to −20 °C slowly')
    expect(long.gap).toBeGreaterThan(ARROW_GAP)
    expect(long.gap).toBeGreaterThanOrEqual(2 * ARROW_PAD + long.spans.reduce((w, sp) => w + 0.55 * sp.size * [...sp.text].length, 0))
    expect(boxesSize(boxContents(s), long.gap).width).toBe(2 * BOX_SIDE + long.gap)
  })

  it('keeps the arrow label in the address, clipped to 24 characters', () => {
    const t = { ...s, arrowLabel: 'heat' }
    expect(particleSettings.toQuery(t)).toContain('arrowLabel=heat')
    expect(particleSettings.fromParams(new URLSearchParams(particleSettings.toQuery(t)))).toEqual(t)
    expect(particleSettings.fromParams(new URLSearchParams('arrowLabel=' + 'x'.repeat(40))).arrowLabel).toHaveLength(24)
  })

  it('doesn’t apply to a lattice', () => {
    expect(boxContents({ ...s, layout: 'lattice' }).after).toBeUndefined()
  })

  it('travel in the address, and an address without them is one box', () => {
    const t = { ...s, afterState: 'liquid' as const }
    expect(particleSettings.fromParams(new URLSearchParams(particleSettings.toQuery(t)))).toEqual(t)
    expect(boxContents(particleSettings.fromParams(new URLSearchParams('seed=5'))).after).toBeUndefined()
  })
})
