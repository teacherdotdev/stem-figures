import { describe, expect, it } from 'vitest'
import {
  RADIUS,
  afterCount,
  atomKinds,
  chargeText,
  describeKind,
  kindName,
  particleDiscs,
  tidyAtomNames,
  tidyKinds,
  type Look,
  type ParticleKind,
} from './particles'

const white: Look = { size: 's', shade: 'white', charge: '' }
const ion: ParticleKind = { count: 4, shape: 'single', look: { size: 'l', shade: 'light', charge: '-' }, outer: white }
const water: ParticleKind = { count: 3, shape: 'bent', look: { size: 'm', shade: 'gray', charge: '' }, outer: white }

describe('particle kinds from the address or storage', () => {
  it('keeps valid kinds as they are', () => {
    expect(tidyKinds([ion, water])).toEqual([ion, water])
  })

  it('fills in what it does not understand', () => {
    expect(tidyKinds([{ count: 'x', shape: 'blob', look: { size: 'huge', shade: 'pink', charge: '9+' }, outer: 'x' }])).toEqual([
      { count: 1, shape: 'single', look: { size: 'm', shade: 'white', charge: '' }, outer: white },
    ])
  })

  it('opens an old kind with only a count and a look as the same lone disc', () => {
    const old = { count: 4, look: { size: 'l', shade: 'light', charge: '-' } }
    expect(tidyKinds([old])).toEqual([ion])
    expect(particleDiscs(tidyKinds([old])![0])).toEqual([{ size: 'l', shade: 'light', charge: '-', x: 0, y: 0, r: RADIUS.l }])
  })

  it('rounds and limits counts to 0–60', () => {
    expect(tidyKinds([{ ...ion, count: 2.6 }])![0].count).toBe(3)
    expect(tidyKinds([{ ...ion, count: -3 }])![0].count).toBe(0)
    expect(tidyKinds([{ ...ion, count: 500 }])![0].count).toBe(60)
  })

  it('keeps at most four kinds, and rejects anything that is not a list', () => {
    expect(tidyKinds(Array(6).fill(ion))).toHaveLength(4)
    expect(tidyKinds([])).toBeUndefined()
    expect(tidyKinds({ count: 1 })).toBeUndefined()
    expect(tidyKinds(['x', ion])).toEqual([ion])
  })

  it('keeps a key name, clipped to 40 characters', () => {
    expect(tidyKinds([{ ...ion, name: 'Any negative ion' }])![0].name).toBe('Any negative ion')
    expect(tidyKinds([{ ...ion, name: 'x'.repeat(50) }])![0].name).toBe('x'.repeat(40))
  })

  it('keeps an after count only once one is given, rounded and limited like a count', () => {
    expect(tidyKinds([ion])![0]).not.toHaveProperty('after')
    expect(tidyKinds([{ ...ion, after: 'x' }])![0]).not.toHaveProperty('after')
    expect(tidyKinds([{ ...ion, after: 2.4 }])![0].after).toBe(2)
    expect(tidyKinds([{ ...ion, after: 90 }])![0].after).toBe(60)
    expect(tidyKinds([{ ...ion, after: 0 }])![0].after).toBe(0)
    expect(afterCount(ion)).toBe(4)
    expect(afterCount({ ...ion, after: 0 })).toBe(0)
  })

  it('leaves out an empty or unusable key name, so kinds without one are unchanged', () => {
    for (const name of ['', '   ', 7, null]) expect(tidyKinds([{ ...ion, name }])).toEqual([ion])
    expect(JSON.stringify(tidyKinds([ion]))).toBe(JSON.stringify([ion]))
  })
})

describe('a key of each atom', () => {
  const gray: Look = { size: 'l', shade: 'gray', charge: '' }
  const black: Look = { size: 'm', shade: 'black', charge: '' }
  const looks = (kinds: ParticleKind[]) => kinds.map((k) => k.look)
  // H₂O, H₂ and CO₂ (black C between two gray O, the same gray as water's O)
  const hydrogen: ParticleKind = { count: 2, shape: 'pair', look: white, outer: white }
  const co2: ParticleKind = { count: 4, shape: 'line', look: black, outer: gray }
  const h2o: ParticleKind = { ...water, look: gray }

  it('lists each different atom once, a center before its outer atoms', () => {
    expect(looks(atomKinds([h2o], []))).toEqual([gray, white])
    expect(looks(atomKinds([h2o, hydrogen, co2], []))).toEqual([gray, white, black])
  })

  it('lists them as lone atoms, drawn alone in the key', () => {
    for (const atom of atomKinds([co2], [])) expect(particleDiscs(atom)).toHaveLength(1)
  })

  it('lists the atoms of a kind with a count of 0 too, and a lone kind’s look only', () => {
    expect(looks(atomKinds([{ ...co2, count: 0 }, ion], []))).toEqual([black, gray, ion.look])
  })

  it('takes each atom’s name from the name given for its look', () => {
    const names = [
      { look: white, name: 'H atom' },
      { look: gray, name: 'O atom' },
      { look: { ...gray, shade: 'dark' as const }, name: 'Not drawn' },
    ]
    expect(atomKinds([h2o, co2], names).map((a) => a.name)).toEqual(['O atom', 'H atom', undefined])
  })

  it('tidies names from the address: one per look, never empty, clipped to 40 characters', () => {
    expect(tidyAtomNames('x')).toBeUndefined()
    expect(
      tidyAtomNames([
        { look: gray, name: 'O' },
        { look: gray, name: 'Also O' },
        { look: white, name: '  ' },
        { look: 'x', name: 'H' },
        { look: { shade: 'black' }, name: 'y'.repeat(50) },
      ]),
    ).toEqual([
      { look: gray, name: 'O' },
      { look: { size: 'm', shade: 'black', charge: '' }, name: 'y'.repeat(40) },
    ])
  })
})

describe('naming and labeling', () => {
  it('a lone kind with a charge is an ion, without one an atom', () => {
    expect(kindName(ion)).toBe('Ion')
    expect(kindName({ ...ion, look: { ...ion.look, charge: '' } })).toBe('Atom')
    // a lone kind's outer look isn't drawn, so its charge doesn't count
    expect(kindName({ ...ion, look: { ...ion.look, charge: '' }, outer: { ...white, charge: '+' } })).toBe('Atom')
  })

  it('a joined kind is a molecule, or an ion cluster when any of it is charged', () => {
    expect(kindName(water)).toBe('Molecule')
    expect(kindName({ ...water, look: { ...water.look, charge: '2+' } })).toBe('Ion cluster')
    expect(kindName({ ...water, outer: { ...white, charge: '-' } })).toBe('Ion cluster')
  })

  it('describes each kind in plain words', () => {
    expect(describeKind(ion)).toBe('4 large light gray − ions')
    expect(describeKind({ ...ion, count: 1, look: { ...ion.look, charge: '' } })).toBe('1 large light gray atom')
    expect(describeKind(water)).toBe('3 bent molecules (medium gray with 2 small white)')
    expect(describeKind({ ...water, count: 1, shape: 'pair' })).toBe('1 molecule (medium gray and small white)')
    expect(describeKind({ ...water, shape: 'cross', look: { size: 's', shade: 'black', charge: '' } })).toBe(
      '3 molecules (small black with 4 small white)',
    )
    const cluster: ParticleKind = { count: 2, shape: 'line', look: { size: 's', shade: 'gray', charge: '2+' }, outer: { size: 'l', shade: 'light', charge: '-' } }
    expect(describeKind(cluster)).toBe('2 linear ion clusters (small gray 2+ with 2 large light gray −)')
  })

  it('writes charges with a true minus sign', () => {
    expect(chargeText('2-')).toBe('2−')
    expect(chargeText('+')).toBe('+')
    expect(chargeText('')).toBe('')
  })
})

describe('joined particles as drawn', () => {
  const kind = (shape: ParticleKind['shape'], center: Look['size'], outer: Look['size']): ParticleKind => ({
    count: 1,
    shape,
    look: { size: center, shade: 'gray', charge: '' },
    outer: { size: outer, shade: 'white', charge: '' },
  })
  const degrees = (d: { x: number; y: number }) => (Math.atan2(d.y, d.x) * 180) / Math.PI

  it('draws the outer discs first and the center last, on top', () => {
    const discs = particleDiscs(kind('cross', 'm', 's'))
    expect(discs).toHaveLength(5)
    expect(discs.at(-1)).toMatchObject({ x: 0, y: 0, r: RADIUS.m, shade: 'gray' })
    expect(discs.slice(0, 4).every((d) => d.shade === 'white' && d.r === RADIUS.s)).toBe(true)
  })

  it('has as many outer discs as the shape says', () => {
    expect(particleDiscs(kind('single', 'm', 's'))).toHaveLength(1)
    expect(particleDiscs(kind('pair', 'm', 's'))).toHaveLength(2)
    expect(particleDiscs(kind('bent', 'm', 's'))).toHaveLength(3)
    expect(particleDiscs(kind('line', 'm', 's'))).toHaveLength(3)
    expect(particleDiscs(kind('triangle', 'm', 's'))).toHaveLength(4)
  })

  it('points the outer discs the way the shape goes', () => {
    const directions = (shape: ParticleKind['shape']) => particleDiscs(kind(shape, 'm', 's')).slice(0, -1).map(degrees)
    expect(directions('pair').map(Math.round)).toEqual([0])
    // bent opens downward, as H₂O is usually drawn
    expect(directions('bent').map((a) => Math.round(a * 100) / 100)).toEqual([37.75, 142.25])
    expect(directions('line').map((a) => Math.round(Math.abs(a)))).toEqual([0, 180])
    expect(directions('triangle').map(Math.round)).toEqual([-90, 30, 150])
    expect(directions('cross').map((a) => Math.round((a + 360) % 360))).toEqual([0, 90, 180, 270])
  })

  it('sets outer discs touching the center with a slight overlap', () => {
    // M center (15) with S outer (10): 15 + 10 − 0.2 × 10
    for (const d of particleDiscs(kind('cross', 'm', 's')).slice(0, -1)) expect(Math.hypot(d.x, d.y)).toBeCloseTo(23)
    // L with L: 20 + 20 − 0.2 × 20
    const [outer] = particleDiscs(kind('pair', 'l', 'l'))
    expect(Math.hypot(outer.x, outer.y)).toBeCloseTo(36)
  })

  it('pushes big outer discs around a small center apart so they barely overlap each other', () => {
    const discs = particleDiscs(kind('cross', 'xs', 'xl')).slice(0, -1)
    // touching the center alone would put them 6 + 26 − 1.2 = 30.8 out
    expect(Math.hypot(discs[0].x, discs[0].y)).toBeGreaterThan(30.8)
    for (const [i, a] of discs.entries()) {
      const b = discs[(i + 1) % discs.length]
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(1.8 * RADIUS.xl - 1e-9)
    }
  })

  it('turns the whole particle by the angle but keeps each disc as it is', () => {
    const k: ParticleKind = { ...kind('triangle', 'm', 's'), outer: { size: 's', shade: 'white', charge: '-' } }
    const still = particleDiscs(k)
    const turned = particleDiscs(k, Math.PI / 2)
    for (const [i, d] of turned.entries()) {
      expect(d.x).toBeCloseTo(-still[i].y)
      expect(d.y).toBeCloseTo(still[i].x)
      expect(d).toMatchObject({ r: still[i].r, charge: still[i].charge, shade: still[i].shade })
    }
  })
})
