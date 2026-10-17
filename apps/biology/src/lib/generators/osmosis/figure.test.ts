import { describe, expect, it } from 'vitest'
import { edgeDistance2, insideRegion, regionArea } from '$shared/particles/layout'
import type { Disc } from '$shared/particles/particles'
import { PARTICLE_GAP, WATER_ROOM, answerLines, buildOsmosis, describe as describeFigure, niceAbove, waterCount, type Picture } from './figure'
import { sceneShape } from './scenes'
import { SCENES, osmosisSettings } from './settings'

const settingsOf = (query: string) => osmosisSettings.fromParams(new URLSearchParams(query))
const build = (query: string) => buildOsmosis(settingsOf(query))
const text = (p: Picture) => p.words.map((w) => w.spans.map((s) => s.text).join(''))

/** Which side of a picture a disc is in: 0 inside (or side A), 1 outside (or side B). */
function sideOf(p: Picture, d: Disc) {
  const inPart = (parts: typeof p.shape.inside) => parts.some((part) => insideRegion(d, part.region) && !part.holes.some((h) => insideRegion(d, h)))
  return inPart(p.shape.inside) ? 0 : inPart(p.shape.outside) ? 1 : -1
}
const count = (p: Picture, discs: Disc[], side: number) => discs.filter((d) => sideOf(p, d) === side).length
const area = (parts: Picture['shape']['inside']) => parts.reduce((sum, x) => sum + regionArea(x.region) - x.holes.reduce((a, h) => a + regionArea(h), 0), 0)

const AP_BAG = 'scene=bag&view=both&on1=0&on2=1&in2=15&out2=0&on3=1&in3=3&out3=0'

describe('the particles', () => {
  it('are drawn in proportion to the concentrations', () => {
    const f = build('scene=beaker&view=start&in1=10&out1=5&size1=s')
    const [p] = f.pictures
    const [a, b] = [count(p, p.solutes, 0), count(p, p.solutes, 1)]
    expect(a).toBeGreaterThan(b)
    expect(a / b).toBeCloseTo(2, 0)
    expect(a).toBeLessThanOrEqual(24)
  })

  it('are as crowded on each side for the same concentration, whatever its size', () => {
    const [p] = build('view=start&in1=1&out1=1&size1=s').pictures
    const density = (side: number) => count(p, p.solutes, side) / area(side ? p.shape.outside : p.shape.inside)
    expect(density(1) / density(0)).toBeGreaterThan(0.75)
    expect(density(1) / density(0)).toBeLessThan(1.33)
  })

  it('stand for a round amount each', () => {
    expect([0.13, 0.2, 0.21, 0.26, 0.6, 3].map(niceAbove)).toEqual([0.2, 0.2, 0.25, 0.5, 1, 5])
    expect(build('in1=0.9').scale).toBe(0.25)
  })

  it('show any solute that is there with at least one particle', () => {
    const [p] = build('scene=plant&view=start&in1=0.5&out1=40&size1=s').pictures
    expect(count(p, p.solutes, 0)).toBe(1)
  })

  it('put water in the room the solutes leave, so the side with more solute has less water', () => {
    expect(waterCount(10 * WATER_ROOM, 3)).toBe(7)
    expect(waterCount(10 * WATER_ROOM, 30)).toBe(0)
    const [p] = build('scene=beaker&view=start&in1=10&out1=0&size1=s').pictures
    expect(count(p, p.water, 0)).toBeLessThan(count(p, p.water, 1))
    expect(build('scene=beaker&view=start&water=0').pictures[0].water).toEqual([])
  })

  it('stay inside their own side, clear of its edges and of each other', () => {
    for (const scene of SCENES) {
      for (const view of ['start', 'result']) {
        const f = build(`scene=${scene}&view=${view}&in1=4&out1=1&size1=s&on2=1&cross2=1&in2=2&out2=0&size2=m`)
        for (const p of f.pictures) {
          const all = [...p.solutes, ...p.water]
          for (const d of all) {
            const side = sideOf(p, d)
            expect(side, `${scene} ${view}`).toBeGreaterThanOrEqual(0)
            const part = (side ? p.shape.outside : p.shape.inside).find((x) => insideRegion(d, x.region))!
            expect(Math.sqrt(edgeDistance2(d, part.region))).toBeGreaterThanOrEqual(d.r + PARTICLE_GAP - 0.01)
          }
          for (const [i, a] of all.entries()) {
            for (const b of all.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r + PARTICLE_GAP - 0.01)
          }
        }
      }
    }
  })

  it('give the same figure for the same seed, from the address as from settings, and another for another seed', () => {
    const s = settingsOf(AP_BAG)
    const again = osmosisSettings.fromParams(new URLSearchParams(osmosisSettings.toQuery(s)))
    expect(buildOsmosis(again)).toEqual(buildOsmosis(s))
    expect(buildOsmosis({ ...s, seed: 2 }).pictures[0].water).not.toEqual(buildOsmosis(s).pictures[0].water)
    for (const d of buildOsmosis(s).pictures.flatMap((p) => [...p.solutes, ...p.water])) {
      expect(Math.round(d.x * 1000) / 1000).toBe(d.x)
      expect(Math.round(d.y * 1000) / 1000).toBe(d.y)
    }
  })

  it('of a solute that can cross are evened out in the result, and the others keep their counts', () => {
    const [start, end] = build(AP_BAG).pictures
    const glucose = (p: Picture, side: number) => p.solutes.filter((d) => d.size === 's' && sideOf(p, d) === side).length
    const starch = (p: Picture, side: number) => p.solutes.filter((d) => d.size === 'l' && sideOf(p, d) === side).length
    expect(glucose(start, 1)).toBe(0)
    expect(glucose(end, 1)).toBeGreaterThan(0)
    expect(glucose(end, 0) + glucose(end, 1)).toBe(glucose(start, 0))
    const density = (side: number) => glucose(end, side) / area(side ? end.shape.outside : end.shape.inside)
    expect(Math.abs(density(0) - density(1)) / density(1)).toBeLessThan(0.6)
    expect([starch(end, 0), starch(end, 1)]).toEqual([starch(start, 0), starch(start, 1)])
  })
})

describe('the arrows', () => {
  const water = (p: Picture) => p.arrows.filter((a) => a.kind === 'water')

  it('send water out of a cell in a hypertonic solution, and in from a hypotonic one', () => {
    const [out] = build('view=start&in1=0.9&out1=5').pictures
    const [into] = build('view=start&in1=0.9&out1=0').pictures
    const cx = out.shape.drawing.kind === 'blood' ? 160 : 0
    // every water arrow points away from the cell's middle, or toward it
    for (const a of water(out)) expect(Math.abs(a.to[0] - cx)).toBeGreaterThan(Math.abs(a.from[0] - cx))
    for (const a of water(into)) expect(Math.abs(a.to[0] - cx)).toBeLessThan(Math.abs(a.from[0] - cx))
    expect(water(out)).toHaveLength(2)
  })

  it('send water across the membrane toward the hypertonic side of a U-tube', () => {
    const [p] = build('scene=utube&view=start&in1=0&out1=10').pictures
    const [a] = water(p)
    expect(a.to[0]).toBeGreaterThan(a.from[0])
    expect(text(p)).toEqual(expect.arrayContaining(['Hypotonic', 'Hypertonic']))
  })

  it('go both ways, with no net movement, when isotonic', () => {
    const [p] = build('scene=beaker&view=start&in1=5&out1=5').pictures
    const [a, b] = water(p)
    expect(Math.sign(a.to[0] - a.from[0])).toBe(-Math.sign(b.to[0] - b.from[0]))
    expect(text(p)).toContain('No net movement')
    expect(answerLines(settingsOf('scene=beaker&view=start&in1=5&out1=5'))).toContain('No net water movement')
  })

  it('send a solute that can cross from higher to lower, and none for one that can’t', () => {
    const [p] = build(AP_BAG).pictures
    const solutes = p.arrows.filter((a) => a.kind === 'solute')
    expect(solutes).toHaveLength(1)
    // glucose leaves the bag: its arrow points out of the bag
    expect(Math.abs(solutes[0].to[0] - 160)).toBeGreaterThan(Math.abs(solutes[0].from[0] - 160))
    expect(text(p)).toContain('glucose')
  })

  it('are left off the result beside its start, and can be blank boxes', () => {
    const [start, end] = build('view=both').pictures
    expect(start.arrows.length).toBeGreaterThan(0)
    expect(end.arrows).toEqual([])
    expect(build('view=start&waterArrows=blank').pictures[0].arrows.every((a) => a.blank)).toBe(true)
    expect(build('view=start&waterArrows=none').pictures[0].arrows).toEqual([])
  })
})

describe('the result', () => {
  it('draws each cell’s shape and says what happened', () => {
    expect(build('view=result&out1=5').pictures[0].shape.drawing.kind).toBe('blood')
    expect(text(build('view=result&out1=5').pictures[0])).toContain('Shrinks (crenated)')
    expect(text(build('view=result&out1=0&burst=1').pictures[0])).toContain('Bursts (lysed)')
    expect(text(build('scene=plant&view=result&in1=3&out1=20').pictures[0])).toContain('Plasmolyzed')
    expect(text(build('scene=plant&view=result&in1=3&out1=0').pictures[0])).toContain('Turgid')
  })

  it('raises the U-tube’s level on the hypertonic side', () => {
    const level = (q: string) => {
      const p = build(`scene=utube&view=result&${q}`).pictures[0]
      return [p.shape.inside, p.shape.outside].map((parts) => Math.min(...parts[0].region.map((pt) => pt.y)))
    }
    const [a, b] = level('in1=0&out1=10')
    expect(b).toBeLessThan(a)
    const [a2, b2] = level('in1=10&out1=0')
    expect(a2).toBeLessThan(b2)
    const [a3, b3] = level('in1=5&out1=5')
    expect(a3).toBe(b3)
  })

  it('shrinks a crenated cell, swells a swollen one, and swells the bag', () => {
    const inside = (scene: Parameters<typeof sceneShape>[0], outcome: Parameters<typeof sceneShape>[1]) => regionArea(sceneShape(scene, outcome).inside[0].region)
    expect(inside('blood', 'crenated')).toBeLessThan(inside('blood', 'start'))
    expect(inside('blood', 'swollen')).toBeGreaterThan(inside('blood', 'start'))
    expect(inside('plant', 'plasmolyzed')).toBeLessThan(inside('plant', 'start'))
    expect(inside('bag', 'swells')).toBeGreaterThan(inside('bag', 'start'))
    expect(inside('bag', 'shrinks')).toBeLessThan(inside('bag', 'start'))
  })
})

describe('a three-up', () => {
  it('shows the same cell in three solutions, lettered, results by default', () => {
    const f = build('in1=0.9')
    expect(f.pictures.map((p) => p.panel.outcome)).toEqual(['swollen', 'normal', 'crenated'])
    expect(f.pictures.map((p) => p.phase)).toEqual(['result', 'result', 'result'])
    expect(f.pictures.map((p) => text(p).find((t) => /^[ABC]$/.test(t)))).toEqual(['A', 'B', 'C'])
  })

  it('shuffled, only reorders the same three cells', () => {
    const inOrder = build('in1=0.9').pictures
    const shuffled = build('in1=0.9&order=shuffled&orderSeed=3').pictures
    expect(shuffled.map((p) => p.panel.outcome)).not.toEqual(inOrder.map((p) => p.panel.outcome))
    for (const p of shuffled) {
      const same = inOrder.find((q) => q.panel.outcome === p.panel.outcome)!
      expect(p.solutes).toEqual(same.solutes)
      expect(p.water).toEqual(same.water)
    }
  })

  it('has an answer line for each cell, in its order', () => {
    expect(answerLines(settingsOf('in1=0.9'))).toEqual([
      'A: hypotonic, water moves in, the cell gains water and swells',
      'B: isotonic, no net water movement, the cell stays the same size',
      'C: hypertonic, water moves out, the cell loses water and shrinks (crenates)',
    ])
  })
})

describe('the words', () => {
  it('give the answer key for one scene: tonicity, water, solutes and the result', () => {
    expect(answerLines(settingsOf(AP_BAG))).toEqual([
      'The beaker is hypotonic to the bag',
      'Net water movement into the bag',
      'Glucose moves out of the bag until equal',
      'The bag gains water and swells',
    ])
    expect(answerLines(settingsOf('scene=utube&view=both&in1=10&out1=0&name1=sucrose'))[0]).toBe('Side A is hypertonic to side B')
  })

  it('print each side’s concentrations under the start', () => {
    const [p] = build('view=start&in1=0.9&out1=0').pictures
    expect(text(p)).toEqual(expect.arrayContaining(['Inside the cell', '0.9% NaCl', 'Outside', 'Pure water', 'Hypotonic solution']))
    expect(text(build('view=start&unit=mM&in1=300&out1=300').pictures[0])).toContain('300 mM NaCl')
  })

  it('can leave the tonicity and concentrations blank, or off', () => {
    const [p] = build('view=start&tonicityMode=blank&concMode=blank').pictures
    expect(text(p)).not.toContain('Hypertonic solution')
    expect(p.words.filter((w) => w.blank).length).toBeGreaterThanOrEqual(3)
    const [q] = build('view=start&tonicityMode=none&concMode=none&membraneMode=none&waterArrows=none&soluteArrows=none').pictures
    expect(q.words).toEqual([])
  })

  it('labels a plant cell’s parts down the left, without crossing', () => {
    const f = build('scene=plant&view=start&partsMode=text')
    expect(f.labels.map((l) => l.spans.map((s) => s.text).join(''))).toEqual(['Cell wall', 'Vacuole', 'Cell membrane'])
    const ys = f.leaders.map((l) => l.from[1])
    expect([...ys].sort((a, b) => a - b)).toEqual(ys)
  })

  it('describes the figure for screen readers', () => {
    expect(describeFigure(settingsOf('in1=0.9'))).toMatch(/^An osmosis figure: the same red blood cell in three solutions/)
    expect(describeFigure(settingsOf(AP_BAG))).toContain('In the bag: 15% glucose, 3% starch; in the beaker: pure water.')
    expect(describeFigure(settingsOf('view=start&in1=0.9&out1=5'))).toContain('Inside the cell: 0.9% NaCl; outside: 5% NaCl.')
  })
})
