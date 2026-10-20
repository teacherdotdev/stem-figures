import { describe, expect, it } from 'vitest'
import {
  LIQUID_GAP, SCATTER_GAP, SOLID_GAP, arrange, edgeDistance2, insideRegion, pour, regionArea, scatter, scatterIn, stack, type Region,
} from './layout'
import { discBounds, particleDiscs, type Disc, type Look, type ParticleKind } from './particles'
import { seededRandom } from './random'

const white: Look = { size: 's', shade: 'white', charge: '' }
const kinds: ParticleKind[] = [
  { count: 6, shape: 'single', look: { size: 'l', shade: 'light', charge: '-' }, outer: white },
  { count: 6, shape: 'single', look: { size: 's', shade: 'white', charge: '+' }, outer: white },
]

describe('seeded random numbers', () => {
  it('repeat for the same seed and differ for another', () => {
    const a = seededRandom(5)
    const b = seededRandom(5)
    const first = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(first)
    expect(seededRandom(6)()).not.toBe(first[0])
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true)
  })
})

describe('scattering particles in the box', () => {
  it('draws the same layout for the same seed', () => {
    expect(scatter(kinds, 300, 300, 11)).toEqual(scatter(kinds, 300, 300, 11))
    expect(scatter(kinds, 300, 300, 11)).not.toEqual(scatter(kinds, 300, 300, 12))
  })

  it('places every particle, apart from each other and the box edge', () => {
    const { discs, missing } = scatter(kinds, 300, 300, 3)
    expect(missing).toBe(0)
    expect(discs).toHaveLength(12)
    for (const d of discs) {
      expect(d.x - d.r).toBeGreaterThanOrEqual(SCATTER_GAP)
      expect(d.y - d.r).toBeGreaterThanOrEqual(SCATTER_GAP)
      expect(d.x + d.r).toBeLessThanOrEqual(300 - SCATTER_GAP)
      expect(d.y + d.r).toBeLessThanOrEqual(300 - SCATTER_GAP)
    }
    for (const [i, a] of discs.entries()) {
      for (const b of discs.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r + SCATTER_GAP)
    }
  })

  it('counts the particles that find no room', () => {
    const crowd: ParticleKind[] = [{ count: 60, shape: 'single', look: { size: 'xl', shade: 'gray', charge: '' }, outer: white }]
    const { discs, missing } = scatter(crowd, 300, 300, 1)
    expect(missing).toBeGreaterThan(0)
    expect(discs.length + missing).toBe(60)
  })

  it('rounds positions to thousandths, so every browser and the server place the same', () => {
    const joined: ParticleKind[] = [{ count: 8, shape: 'bent', look: { size: 'm', shade: 'gray', charge: '' }, outer: { size: 's', shade: 'white', charge: '' } }]
    for (const d of scatter(joined, 300, 300, 4).discs) {
      expect(Math.round(d.x * 1000) / 1000).toBe(d.x)
      expect(Math.round(d.y * 1000) / 1000).toBe(d.y)
    }
  })

  it('stops trying a kind once one of it finds no room, still counting the rest', () => {
    const crowd: ParticleKind[] = Array.from({ length: 4 }, () => ({
      count: 60,
      shape: 'cross' as const,
      look: { size: 'xl' as const, shade: 'gray' as const, charge: '' as const },
      outer: { size: 'xl' as const, shade: 'white' as const, charge: '' as const },
    }))
    const started = performance.now()
    const { discs, missing } = scatter(crowd, 300, 300, 1)
    expect(performance.now() - started).toBeLessThan(250)
    expect(discs.length / 5 + missing).toBe(240)
  })

  it('draws nothing for a kind with a count of 0', () => {
    expect(scatter([{ ...kinds[0], count: 0 }], 300, 300, 1)).toEqual({ discs: [], missing: 0 })
  })
})

describe('scattering particles into any region', () => {
  /** A circle as a polygon of many short sides, like a cell's outline. */
  const circle = (cx: number, cy: number, r: number, sides = 48): Region =>
    Array.from({ length: sides }, (_, i) => ({ x: cx + r * Math.cos((2 * Math.PI * i) / sides), y: cy + r * Math.sin((2 * Math.PI * i) / sides) }))
  /** An L shape, so a disc can't just be kept inside the region's bounds. */
  const ell: Region = [
    { x: 0, y: 0 }, { x: 120, y: 0 }, { x: 120, y: 200 }, { x: 300, y: 200 }, { x: 300, y: 300 }, { x: 0, y: 300 },
  ]
  const square: Region = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 300 }, { x: 0, y: 300 }]

  /** Every disc inside the region, at least the gap from its edge, and apart from the others. */
  function expectPlaced(discs: Disc[], region: Region, gap = SCATTER_GAP) {
    for (const d of discs) {
      expect(insideRegion(d, region)).toBe(true)
      expect(Math.sqrt(edgeDistance2(d, region))).toBeGreaterThanOrEqual(d.r + gap - 1e-9)
    }
    for (const [i, a] of discs.entries()) {
      for (const b of discs.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r + gap - 1e-9)
    }
  }

  it('tells inside from outside, and how far a point is from the edge', () => {
    expect(insideRegion({ x: 50, y: 250 }, ell)).toBe(true)
    expect(insideRegion({ x: 200, y: 100 }, ell)).toBe(false)
    expect(edgeDistance2({ x: 50, y: 250 }, ell)).toBe(50 ** 2)
    expect(edgeDistance2({ x: 110, y: 100 }, ell)).toBe(10 ** 2)
    expect(regionArea(ell)).toBe(120 * 200 + 300 * 100)
    expect(regionArea([...ell].reverse())).toBe(regionArea(ell))
  })

  it('keeps every disc inside its region and the gap from its edge, apart from the others', () => {
    for (const seed of [1, 2, 3]) {
      const inCircle = scatterIn(kinds, circle(150, 150, 110), seed)
      expect(inCircle.missing).toBe(0)
      expect(inCircle.discs).toHaveLength(12)
      expectPlaced(inCircle.discs, circle(150, 150, 110))
      const inEll = scatterIn(kinds, ell, seed)
      expect(inEll.missing).toBe(0)
      expectPlaced(inEll.discs, ell)
    }
  })

  it('keeps joined particles whole inside the region', () => {
    const water: ParticleKind = { count: 6, shape: 'bent', look: { size: 'm', shade: 'gray', charge: '' }, outer: white }
    const { discs, missing } = scatterIn([water], ell, 5)
    expect(missing).toBe(0)
    expect(discs).toHaveLength(18)
    for (const d of discs) {
      expect(insideRegion(d, ell)).toBe(true)
      expect(Math.sqrt(edgeDistance2(d, ell))).toBeGreaterThanOrEqual(d.r + SCATTER_GAP - 1e-9)
    }
  })

  it('stays out of holes, like a cell in the solution around it', () => {
    const cell = circle(150, 150, 80)
    const { discs, missing } = scatterIn(kinds, square, 7, { holes: [cell] })
    expect(missing).toBe(0)
    expectPlaced(discs, square)
    for (const d of discs) {
      expect(insideRegion(d, cell)).toBe(false)
      expect(Math.sqrt(edgeDistance2(d, cell))).toBeGreaterThanOrEqual(d.r + SCATTER_GAP - 1e-9)
    }
  })

  it('keeps clear of discs already placed, so smaller ones can be scattered round them after', () => {
    const first = scatterIn(kinds, square, 2)
    const tiny: ParticleKind[] = [{ count: 50, shape: 'single', look: { size: 'xs', shade: 'white', charge: '' }, outer: white }]
    const then = scatterIn(tiny, square, 3, { placed: first.discs })
    expect(then.discs).toHaveLength(50)
    expectPlaced([...first.discs, ...then.discs], square)
  })

  it('keeps the gap it is given', () => {
    const many: ParticleKind[] = [{ count: 40, shape: 'single', look: { size: 'xs', shade: 'white', charge: '' }, outer: white }]
    const { discs } = scatterIn(many, circle(100, 100, 90), 3, { gap: 2 })
    expect(discs).toHaveLength(40)
    expectPlaced(discs, circle(100, 100, 90), 2)
  })

  it('draws the same layout for the same seed, rounded to thousandths, and another for another seed', () => {
    const a = scatterIn(kinds, circle(150, 150, 110), 11)
    expect(scatterIn(kinds, circle(150, 150, 110), 11)).toEqual(a)
    expect(scatterIn(kinds, circle(150, 150, 110), 12)).not.toEqual(a)
    for (const d of a.discs) {
      expect(Math.round(d.x * 1000) / 1000).toBe(d.x)
      expect(Math.round(d.y * 1000) / 1000).toBe(d.y)
    }
  })

  it('counts the particles that find no room, and gives up on a region too small for any', () => {
    const crowd: ParticleKind[] = [{ count: 60, shape: 'single', look: { size: 'xl', shade: 'gray', charge: '' }, outer: white }]
    const { discs, missing } = scatterIn(crowd, circle(150, 150, 100), 1)
    expect(missing).toBeGreaterThan(0)
    expect(discs.length + missing).toBe(60)
    expect(scatterIn(kinds, circle(10, 10, 8), 1)).toEqual({ discs: [], missing: 12 })
    expect(scatterIn(kinds, [], 1)).toEqual({ discs: [], missing: 12 })
  })
})

describe('scattering joined particles', () => {
  const joined = (shape: ParticleKind['shape']): ParticleKind => ({
    count: 8,
    shape,
    look: { size: 'm', shade: 'black', charge: '' },
    outer: { size: 's', shade: 'white', charge: '-' },
  })
  const EPSILON = 1e-9

  for (const shape of ['pair', 'bent', 'line', 'triangle', 'cross'] as const) {
    it(`keeps turned ${shape} particles apart and inside the box`, () => {
      const kind = joined(shape)
      const { discs, missing } = scatter([kind], 300, 300, 7)
      expect(missing).toBe(0)
      // each particle's discs come together, outer ones first and the center last
      const size = particleDiscs(kind).length
      const particles = Array.from({ length: kind.count }, (_, i) => discs.slice(i * size, (i + 1) * size))
      for (const d of discs) {
        expect(d.x - d.r).toBeGreaterThanOrEqual(SCATTER_GAP - EPSILON)
        expect(d.y - d.r).toBeGreaterThanOrEqual(SCATTER_GAP - EPSILON)
        expect(d.x + d.r).toBeLessThanOrEqual(300 - SCATTER_GAP + EPSILON)
        expect(d.y + d.r).toBeLessThanOrEqual(300 - SCATTER_GAP + EPSILON)
      }
      for (const [i, a] of particles.entries()) {
        for (const b of particles.slice(i + 1)) {
          for (const p of a) for (const q of b) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(p.r + q.r + SCATTER_GAP)
        }
      }
      // each is turned its own way, so the first outer disc points somewhere different
      const directions = particles.map((p) => {
        const [outer, center] = [p[0], p[p.length - 1]]
        return Math.round(Math.atan2(outer.y - center.y, outer.x - center.x) * 100)
      })
      expect(new Set(directions).size).toBeGreaterThan(1)
    })
  }
})

/** A layout's discs cut back into particles, `sizes` discs each in turn. */
function particlesOf(discs: Disc[], kinds: ParticleKind[]) {
  const out: Disc[][] = []
  let i = 0
  while (i < discs.length) {
    // a particle's center is drawn last, so its discs end at the first disc of a kind's center look
    const kind = kinds.find((k) => {
      const own = particleDiscs(k)
      return discs.slice(i, i + own.length).every((d, j) => d.r === own[j].r && d.shade === own[j].shade)
    })!
    const n = particleDiscs(kind).length
    out.push(discs.slice(i, i + n))
    i += n
  }
  return out
}

const EPSILON = 1e-6
const water: ParticleKind = { count: 20, shape: 'bent', look: { size: 'm', shade: 'gray', charge: '' }, outer: white }
const argon: ParticleKind = { count: 10, shape: 'single', look: { size: 'l', shade: 'dark', charge: '' }, outer: white }

function expectApartAndInside(discs: Disc[], kinds: ParticleKind[], gap: number) {
  for (const d of discs) {
    expect(d.x - d.r).toBeGreaterThanOrEqual(gap - EPSILON)
    expect(d.y - d.r).toBeGreaterThanOrEqual(gap - EPSILON)
    expect(d.x + d.r).toBeLessThanOrEqual(300 - gap + EPSILON)
    expect(d.y + d.r).toBeLessThanOrEqual(300 - gap + EPSILON)
  }
  const particles = particlesOf(discs, kinds)
  for (const [i, a] of particles.entries()) {
    for (const b of particles.slice(i + 1)) {
      for (const p of a) for (const q of b) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(p.r + q.r + gap - EPSILON)
    }
  }
  return particles
}

describe('the particles of a liquid', () => {
  const kinds = [water, argon]

  it('draw the same for the same seed', () => {
    expect(pour(kinds, 300, 300, 4)).toEqual(pour(kinds, 300, 300, 4))
    expect(pour(kinds, 300, 300, 4)).not.toEqual(pour(kinds, 300, 300, 5))
  })

  for (const seed of [1, 2, 3, 4, 5]) {
    it(`never overlap and stay inside the box (seed ${seed})`, () => {
      const { discs, missing } = pour(kinds, 300, 300, seed)
      expect(missing).toBe(0)
      expect(particlesOf(discs, kinds)).toHaveLength(30)
      expectApartAndInside(discs, kinds, LIQUID_GAP)
    })
  }

  it('settle close together at the bottom: each rests on the floor or on another', () => {
    const { discs } = pour(kinds, 300, 300, 2)
    const particles = particlesOf(discs, kinds)
    for (const [i, p] of particles.entries()) {
      const onFloor = p.some((d) => d.y + d.r >= 300 - LIQUID_GAP - 0.01)
      const onOther = particles.some((o, j) => j !== i && p.some((c) => o.some((d) => Math.hypot(c.x - d.x, c.y - d.y) <= c.r + d.r + LIQUID_GAP + 0.01)))
      expect(onFloor || onOther).toBe(true)
    }
    // five large atoms fit along the floor, no more than two deep
    const few = pour([{ ...argon, count: 5 }], 300, 300, 2).discs
    expect(Math.min(...few.map((d) => d.y - d.r))).toBeGreaterThan(300 - 2 * (40 + LIQUID_GAP) - LIQUID_GAP - EPSILON)
  })

  it('mixes the kinds rather than layering them', () => {
    const { discs } = pour(kinds, 300, 300, 3)
    const bottom = discs.filter((d) => d.y + d.r >= 300 - LIQUID_GAP - 0.01)
    expect(new Set(bottom.map((d) => d.shade)).size).toBeGreaterThan(1)
  })

  it('gives up quickly on a box far too full', () => {
    const crowd: ParticleKind[] = Array.from({ length: 4 }, () => ({ ...water, count: 60, shape: 'cross' as const, look: { ...water.look, size: 'xl' as const } }))
    const started = performance.now()
    const { discs, missing } = pour(crowd, 300, 300, 1)
    expect(performance.now() - started).toBeLessThan(250)
    expect(discs.length / 5 + missing).toBe(240)
  })

  it('leaves out what would stick out of the top, and stops trying that kind', () => {
    const crowd: ParticleKind[] = [{ ...argon, count: 60, look: { ...argon.look, size: 'xl' } }]
    const { discs, missing } = pour(crowd, 300, 300, 1)
    expect(missing).toBeGreaterThan(0)
    expect(discs.length + missing).toBe(60)
    expectApartAndInside(discs, crowd, LIQUID_GAP)
  })
})

describe('the particles of a solid', () => {
  const kinds = [{ ...water, count: 14 }]

  it('sit in rows from the bottom up, all turned the same way', () => {
    const { discs, missing } = stack(kinds, 300, 300, 1)
    expect(missing).toBe(0)
    const particles = expectApartAndInside(discs, kinds, SOLID_GAP)
    expect(particles).toHaveLength(14)
    const own = particleDiscs(kinds[0])
    for (const p of particles) p.forEach((d, j) => expect(d.y - p[0].y).toBeCloseTo(own[j].y - own[0].y))
    const rows = [...new Set(particles.map((p) => p.at(-1)!.y))].sort((a, b) => b - a)
    expect(rows.length).toBeLessThan(particles.length)
    expect(Math.max(...discs.map((d) => d.y + d.r))).toBeCloseTo(300 - SOLID_GAP)
    // full rows below, the last one centered
    const width = discBounds(own).right - discBounds(own).left + SOLID_GAP
    const perRow = Math.floor((300 - SOLID_GAP) / width)
    const top = particles.filter((p) => p.at(-1)!.y === rows.at(-1))
    expect(top).toHaveLength(14 - perRow * (rows.length - 1))
    const middle = top.reduce((x, p) => x + p.at(-1)!.x, 0) / top.length
    expect(middle).toBeCloseTo(150)
  })

  it('shuffles which kind goes where by the seed', () => {
    const two = [water, argon]
    expect(stack(two, 300, 300, 1)).toEqual(stack(two, 300, 300, 1))
    expect(stack(two, 300, 300, 1).discs).not.toEqual(stack(two, 300, 300, 2).discs)
  })

  it('leaves out particles beyond the last row that fits', () => {
    const crowd: ParticleKind[] = [{ ...argon, count: 60 }]
    const { discs, missing } = stack(crowd, 300, 300, 1)
    // 42-pixel cells: 7 rows of 7
    expect(discs).toHaveLength(49)
    expect(missing).toBe(11)
  })

  it('is empty for no particles', () => {
    expect(stack([{ ...water, count: 0 }], 300, 300, 1)).toEqual({ discs: [], missing: 0 })
  })
})

describe('arranging a box by its state', () => {
  it('scatters a gas exactly as boxes always were', () => {
    expect(arrange('gas', kinds, 300, 300, 9)).toEqual(scatter(kinds, 300, 300, 9))
    expect(arrange('liquid', kinds, 300, 300, 9)).toEqual(pour(kinds, 300, 300, 9))
    expect(arrange('solid', kinds, 300, 300, 9)).toEqual(stack(kinds, 300, 300, 9))
  })
})
