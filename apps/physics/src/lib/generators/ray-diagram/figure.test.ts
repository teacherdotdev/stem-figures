import { describe, expect, it } from 'vitest'
import type { Point, Segment } from '$lib/shared/vector'
import { CAP, buildRayFigure, clip, rulerSteps } from './figure'
import { ELEMENTS, imageOf, type Element } from './optics'
import { raySettings, type RaySettings } from './settings'

const figure = (query: string) => buildRayFigure(raySettings.fromParams(new URLSearchParams(query)))
const with_ = (over: Partial<RaySettings>) => buildRayFigure({ ...raySettings.defaults, ...over })

/** How far a point is from a segment. */
function distance(p: Point, v: Segment) {
  const dx = v.x2 - v.x1
  const dy = v.y2 - v.y1
  const t = Math.max(0, Math.min(1, ((p.x - v.x1) * dx + (p.y - v.y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p.x - (v.x1 + t * dx), p.y - (v.y1 + t * dy))
}

const inside = (p: Point, f: ReturnType<typeof buildRayFigure>) =>
  p.x >= f.frame.x - 0.01 && p.x <= f.frame.x + f.frame.w + 0.01 && p.y >= f.frame.y - 0.01 && p.y <= f.frame.y + f.frame.h + 0.01

describe('the ray diagram figure', () => {
  it('draws every principal ray, or its dashed line back, through the image tip', () => {
    let checked = 0
    for (const element of ELEMENTS) {
      for (const distance_ of [4, 6, 8, 13, 15, 20, 25, 30, 45]) {
        for (const inverted of [false, true]) {
          const f = with_({ element, distance: distance_, inverted })
          if (!f.image) continue
          for (const ray of f.rays) {
            const near = Math.min(...[...ray.solid, ...ray.dashed].map((v) => distance(f.image!.tip, v)))
            expect(near, `${element} at ${distance_}${inverted ? ' inverted' : ''}: ${ray.id}`).toBeLessThan(0.5)
            checked++
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(200)
  })

  it('reflects the vertex ray at equal angles', () => {
    for (const element of ['concave', 'convex', 'plane'] as Element[]) {
      const ray = with_({ element, distance: 25 }).rays.find((r) => r.id === 'vertex')!
      const [incoming, outgoing] = ray.solid
      const a = Math.atan2(incoming.y2 - incoming.y1, incoming.x2 - incoming.x1)
      const b = Math.atan2(outgoing.y2 - outgoing.y1, outgoing.x2 - outgoing.x1)
      // In along the axis's angle a, out at π − a: mirrored in the vertical mirror line.
      expect(Math.abs(Math.cos(b) + Math.cos(a))).toBeLessThan(1e-3)
      expect(Math.abs(Math.sin(b) - Math.sin(a))).toBeLessThan(1e-3)
    }
  })

  it('holds the image up to CAP focal lengths away, and clips the rays beyond', () => {
    // f = 10: an object at 12 cm images at 60 cm, the cap, and one at 8.5 cm at −56.7 cm; at 11 cm, at 110 cm.
    for (const d of [12, 13, 15, 20, 7, 8.5]) {
      const f = with_({ distance: d })
      expect(Math.abs(imageOf('converging', 10, d, 1)!.x)).toBeLessThanOrEqual(CAP * 10 + 1e-9)
      expect(f.image, `object at ${d}`).not.toBeNull()
      expect(inside(f.image!.tip, f)).toBe(true)
      expect(inside(f.image!.base, f)).toBe(true)
    }
    for (const [element, d] of [['converging', 11], ['converging', 9.5], ['concave', 10.5], ['concave', 9.6]] as [Element, number][]) {
      const f = with_({ element, distance: d })
      expect(f.image, `${element} at ${d}`).toBeNull()
      expect(f.imageTip).toBeNull()
      expect(f.rays.length).toBeGreaterThan(0)
      for (const ray of f.rays) for (const v of [...ray.solid, ...ray.dashed]) {
        expect(inside({ x: v.x1, y: v.y1 }, f) && inside({ x: v.x2, y: v.y2 }, f), `${element} at ${d}: ${ray.id}`).toBe(true)
      }
    }
  })

  it('draws no image for an object at F, its rays leaving parallel', () => {
    const f = with_({ distance: 10 })
    expect(f.image).toBeNull()
    expect(f.rays.map((r) => r.id)).toEqual(['parallel', 'center'])
    const [a, b] = f.rays.map((r) => r.solid[1])
    expect((a.y2 - a.y1) / (a.x2 - a.x1)).toBeCloseTo((b.y2 - b.y1) / (b.x2 - b.x1), 3)
  })

  it('shows the setup, the rays, or the rays and the image, laid out alike', () => {
    const setup = figure('shown=setup&doMark=1&diMark=1&hoMark=1&hiMark=1')
    const rays = figure('shown=rays&doMark=1&diMark=1&hoMark=1&hiMark=1')
    const complete = figure('doMark=1&diMark=1&hoMark=1&hiMark=1')
    expect(setup.rays).toEqual([])
    expect(setup.image).toBeNull()
    expect(rays.rays.length).toBe(3)
    expect(rays.image).toBeNull()
    expect(complete.image).not.toBeNull()
    // the image's marks only with the image
    expect(setup.marks.map((m) => m.id).sort()).toEqual(['do', 'ho'])
    expect(complete.marks.map((m) => m.id).sort()).toEqual(['di', 'do', 'hi', 'ho'])
    // the same frame, the same object and labels where they were
    for (const f of [setup, rays]) {
      expect(f.frame).toEqual(complete.frame)
      expect(f.object).toEqual(complete.object)
      expect(f.points).toEqual(complete.points)
      expect(f.objectLabelAt).toEqual(complete.objectLabelAt)
    }
  })

  it('draws a virtual image’s rays dashed back to it, and only when it is shown', () => {
    const complete = with_({ distance: 5 })
    expect(complete.image!.real).toBe(false)
    expect(complete.rays.every((r) => r.dashed.length > 0)).toBe(true)
    const rays = with_({ distance: 5, shown: 'rays' })
    // Only the focal ray's line back from F to the tip: nothing that runs to the image.
    expect(rays.rays.flatMap((r) => r.dashed).length).toBe(1)
  })

  it('draws only the rays turned on, of the ones each element has', () => {
    expect(with_({ element: 'concave' }).rays.map((r) => r.id)).toEqual(['parallel', 'focal', 'center', 'vertex'])
    expect(with_({ element: 'plane', distance: 15 }).rays.map((r) => r.id)).toEqual(['vertex', 'upper'])
    expect(with_({ focalRay: false, centerRay: false }).rays.map((r) => r.id)).toEqual(['parallel'])
  })

  it('reaches the lens or mirror past every ray that meets it', () => {
    for (const element of ELEMENTS) {
      for (const d of [6, 15, 25]) {
        const f = with_({ element, distance: d })
        for (const ray of f.rays) {
          const hit = ray.solid[0]
          if (Math.abs(hit.x2 - f.center.x) > 0.5) continue
          expect(hit.y2).toBeGreaterThanOrEqual(f.center.y - f.up - 0.01)
          expect(hit.y2).toBeLessThanOrEqual(f.center.y + f.down + 0.01)
        }
      }
    }
  })

  it('numbers a cm scale from the lens, with readable steps', () => {
    const f = figure('scale=1')
    const zero = f.ruler!.numbers.find((n) => n.text === '0')!
    expect(zero.x).toBeCloseTo(f.center.x, 1)
    const { major } = rulerSteps(f.k)
    const ten = f.ruler!.numbers.find((n) => n.text === String(major) && n.x > zero.x)!
    expect(ten.x - zero.x).toBeCloseTo(major * f.k, 1)
    expect(rulerSteps(12)).toEqual({ major: 5, minor: 1 })
    expect(rulerSteps(3)).toEqual({ major: 20, minor: 5 })
    expect(rulerSteps(40)).toEqual({ major: 1, minor: 0.2 })
  })

  it('clips a segment to a box', () => {
    const box = { x: 0, y: 0, w: 10, h: 10 }
    expect(clip({ x: -5, y: 5 }, { x: 15, y: 5 }, box)).toEqual({ x1: 0, y1: 5, x2: 10, y2: 5 })
    expect(clip({ x: -5, y: -5 }, { x: -1, y: 20 }, box)).toBeNull()
  })
})

describe('ray diagram settings', () => {
  it('round-trip each Shown setting through the page address', () => {
    for (const shown of ['setup', 'rays', 'complete'] as const) {
      const s = { ...raySettings.defaults, shown }
      expect(raySettings.fromParams(new URLSearchParams(raySettings.toQuery(s))).shown).toBe(shown)
    }
  })

  it('round-trip each label mode through the page address', () => {
    for (const mode of ['text', 'blank', 'none'] as const) {
      const s = { ...raySettings.defaults, fBackLabel: { mode, text: 'F′' }, imageLabel: { mode, text: 'I' }, diLabel: { mode, text: 'd_i' } }
      const back = raySettings.fromParams(new URLSearchParams(raySettings.toQuery(s)))
      expect(back.fBackLabel).toEqual(s.fBackLabel)
      expect(back.imageLabel).toEqual(s.imageLabel)
      expect(raySettings.keyOf(back)).toBe(raySettings.keyOf(s))
      // Text typed in, as written.
      const typed = { ...raySettings.defaults, diLabel: { mode: 'text' as const, text: 'v' } }
      expect(raySettings.fromParams(new URLSearchParams(raySettings.toQuery(typed))).diLabel).toEqual(typed.diLabel)
    }
  })

  it('keep the defaults out of the address, and tidy what comes in', () => {
    expect(raySettings.toQuery(raySettings.defaults)).toBe('')
    const s = raySettings.fromParams(new URLSearchParams('element=lamp&focalLength=0&distance=12.3456&height=500'))
    expect(s.element).toBe('converging')
    expect(s.focalLength).toBe(1)
    expect(s.distance).toBe(12.35)
    expect(s.height).toBe(100)
  })
})
