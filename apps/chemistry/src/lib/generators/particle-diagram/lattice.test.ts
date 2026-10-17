import { describe, expect, it } from 'vitest'
import { lattice, latticeRoom, type LatticeOptions } from './lattice'
import { RADIUS, type Look } from '$shared/particles/particles'

const big: Look = { size: 'l', shade: 'light', charge: '-' }
const small: Look = { size: 's', shade: 'white', charge: '+' }
const options = (o: Partial<LatticeOptions>): LatticeOptions => ({
  pattern: 'pure',
  rows: 3,
  columns: 4,
  spacing: 'touching',
  main: big,
  second: small,
  secondCount: 0,
  seed: 1,
  ...o,
})

const closest = (discs: { x: number; y: number; r: number }[]) => {
  let gap = Infinity
  for (const [i, a] of discs.entries()) for (const b of discs.slice(i + 1)) gap = Math.min(gap, Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r)
  return gap
}

describe('lattices', () => {
  it('one kind: every site the main atom, touching its neighbors', () => {
    const { discs, width, height } = lattice(options({}))
    expect(discs).toHaveLength(12)
    expect(discs.every((d) => d.size === 'l')).toBe(true)
    expect(closest(discs)).toBeCloseTo(0)
    expect(width).toBeCloseTo(4 * 2 * RADIUS.l)
    expect(height).toBeCloseTo(3 * 2 * RADIUS.l)
  })

  it('alternating: a checkerboard where the closest pairs just meet', () => {
    const { discs } = lattice(options({ pattern: 'alternate' }))
    expect(discs.filter((d) => d.size === 's')).toHaveLength(6)
    expect(discs[0].size).toBe('l')
    expect(discs[1].size).toBe('s')
    expect(closest(discs)).toBeCloseTo(0)
  })

  it('alternating with a tiny second ion: the big ones touch across the diagonal', () => {
    const { discs } = lattice(options({ pattern: 'alternate', second: { ...small, size: 'xs' } }))
    expect(closest(discs)).toBeCloseTo(0)
    expect(closest(discs.filter((d) => d.size === 'l'))).toBeCloseTo(0)
  })

  it('substitutional: the asked-for number of sites swapped, picked by the seed', () => {
    const a = lattice(options({ pattern: 'substitute', secondCount: 3 }))
    expect(a.discs).toHaveLength(12)
    expect(a.discs.filter((d) => d.size === 's')).toHaveLength(3)
    expect(lattice(options({ pattern: 'substitute', secondCount: 3 }))).toEqual(a)
    const others = [2, 3, 4, 5].map((seed) => lattice(options({ pattern: 'substitute', secondCount: 3, seed })))
    expect(others.some((o) => JSON.stringify(o) !== JSON.stringify(a))).toBe(true)
  })

  it('interstitial: small atoms in the gaps between four, never overlapping', () => {
    const { discs, missing } = lattice(options({ pattern: 'interstitial', secondCount: 4, second: { ...small, size: 'xs' } }))
    expect(discs).toHaveLength(16)
    expect(missing).toBe(0)
    expect(closest(discs)).toBeGreaterThanOrEqual(-1e-9)
  })

  it('interstitial: the edge only makes room for the main atoms, since gap atoms are always inside', () => {
    const { width } = lattice(options({ pattern: 'interstitial', secondCount: 2, main: { ...big, size: 'xs' }, second: { ...small, size: 'xl' } }))
    const pitch = Math.SQRT2 * (RADIUS.xs + RADIUS.xl)
    expect(width).toBeCloseTo(2 * RADIUS.xs + 3 * pitch)
  })

  it('interstitial atoms too big for the gaps push the lattice apart', () => {
    const { discs } = lattice(options({ pattern: 'interstitial', secondCount: 6, second: { ...small, size: 'm' } }))
    expect(closest(discs)).toBeCloseTo(0)
  })

  it('counts the second atoms asked for beyond the room there is', () => {
    expect(latticeRoom(options({ pattern: 'substitute' }))).toBe(12)
    expect(latticeRoom(options({ pattern: 'interstitial' }))).toBe(6)
    expect(lattice(options({ pattern: 'interstitial', secondCount: 10 })).missing).toBe(4)
    expect(lattice(options({ pattern: 'alternate', secondCount: 50 })).missing).toBe(0)
  })

  it('spaced lattices leave an even gap between neighbors', () => {
    const { discs } = lattice(options({ spacing: 'spaced' }))
    expect(closest(discs)).toBeGreaterThan(5)
  })

  it('draws a single row or column', () => {
    expect(lattice(options({ rows: 1, columns: 1 })).discs).toHaveLength(1)
    expect(lattice(options({ pattern: 'interstitial', rows: 1, secondCount: 3 })).discs).toHaveLength(4)
  })
})
