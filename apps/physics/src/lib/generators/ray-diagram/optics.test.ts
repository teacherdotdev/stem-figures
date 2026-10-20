import { describe, expect, it } from 'vitest'
import { answerLines, cmText, imageOf, magnificationText, principalRays, signedFocal, type Element } from './optics'

const close = (a: number, b: number, places = 9) => expect(a).toBeCloseTo(b, places)

describe('the thin lens and mirror equation', () => {
  it('puts a converging lens’s images where 1/f = 1/d_o + 1/d_i says', () => {
    const cases = [
      [20, 20, -1],
      [30, 15, -0.5],
      [15, 30, -2],
      [5, -10, 2],
    ]
    for (const [d, di, m] of cases) {
      const image = imageOf('converging', 10, d, 1)!
      close(image.distance, di)
      close(image.magnification, m)
      expect(image.real).toBe(di > 0)
    }
  })

  it('gives a diverging lens and a convex mirror a virtual, upright, smaller image between the element and F', () => {
    for (const e of ['diverging', 'convex'] as Element[]) {
      for (const d of [0.5, 3, 10, 15, 20, 45, 100, 300]) {
        const image = imageOf(e, 10, d, 1)!
        expect(image.real, `${e} at ${d}`).toBe(false)
        expect(image.magnification).toBeGreaterThan(0)
        expect(image.magnification).toBeLessThan(1)
        expect(-image.distance).toBeGreaterThan(0)
        expect(-image.distance).toBeLessThan(10)
      }
    }
  })

  it('images an object at a concave mirror’s C at C, and one inside F behind the mirror', () => {
    const atC = imageOf('concave', 10, 20, 2)!
    close(atC.distance, 20)
    close(atC.x, -20)
    close(atC.height, -2)
    const inside = imageOf('concave', 10, 5, 1)!
    expect(inside.real).toBe(false)
    close(inside.distance, -10)
    // behind the mirror, on the right
    close(inside.x, 10)
    close(inside.magnification, 2)
  })

  it('puts a plane mirror’s image as far behind as the object is in front, the same size', () => {
    for (const d of [3, 15, 120]) {
      const image = imageOf('plane', 10, d, 4)!
      close(image.distance, -d)
      close(image.x, d)
      close(image.magnification, 1)
      close(image.height, 4)
    }
  })

  it('has no image for an object at F, and the answer key says so', () => {
    expect(imageOf('converging', 10, 10, 1)).toBeNull()
    expect(imageOf('concave', 12.5, 12.5, 1)).toBeNull()
    expect(answerLines('converging', 10, 10)).toEqual(['No image (at infinity): the rays leave parallel'])
    // A diverging lens or convex mirror always has an image.
    expect(imageOf('diverging', 10, 10, 1)).not.toBeNull()
  })

  it('takes real as positive', () => {
    expect(signedFocal('converging', 10)).toBe(10)
    expect(signedFocal('diverging', 10)).toBe(-10)
    expect(signedFocal('concave', 10)).toBe(10)
    expect(signedFocal('convex', 10)).toBe(-10)
    expect(signedFocal('plane', 10)).toBe(Infinity)
  })
})

describe('the answer key', () => {
  it('gives the image distance, magnification and words', () => {
    expect(answerLines('converging', 10, 30)).toEqual(['Image distance: 15 cm, magnification: −0.5', 'Real, inverted, diminished, on the far side of the lens'])
    expect(answerLines('converging', 10, 20)[1]).toBe('Real, inverted, same size, on the far side of the lens')
    expect(answerLines('converging', 10, 5)).toEqual(['Image distance: −10 cm, magnification: +2', 'Virtual, upright, magnified, on the same side as the object'])
    expect(answerLines('diverging', 10, 20)).toEqual(['Image distance: −6.7 cm, magnification: +0.33', 'Virtual, upright, diminished, on the same side as the object'])
    expect(answerLines('concave', 10, 15)).toEqual(['Image distance: 30 cm, magnification: −2', 'Real, inverted, magnified, in front of the mirror'])
    expect(answerLines('plane', 10, 15)).toEqual(['Image distance: −15 cm, magnification: +1', 'Virtual, upright, same size, behind the mirror'])
  })

  it('writes numbers tidily', () => {
    expect(cmText(16.6667)).toBe('16.7 cm')
    expect(cmText(-0.04)).toBe('0 cm')
    expect(magnificationText(-0.6667)).toBe('−0.67')
    expect(magnificationText(1)).toBe('+1')
  })
})

describe('principal rays', () => {
  /** Does the line through `a` along `dir` pass through `p`? */
  const onLine = (a: { x: number; y: number }, dir: { x: number; y: number }, p: { x: number; y: number }) =>
    Math.abs((p.x - a.x) * dir.y - (p.y - a.y) * dir.x) / Math.hypot(dir.x, dir.y) < 1e-9

  it('leave every lens and mirror through (or as if from) the image tip', () => {
    for (const e of ['converging', 'diverging', 'concave', 'convex', 'plane'] as Element[]) {
      for (const d of [4, 7, 15, 20, 25, 30, 60]) {
        for (const h of [3, -2]) {
          const image = imageOf(e, 10, d, h)
          if (!image) continue
          for (const r of principalRays(e, 10, d, h)) expect(onLine(r.hit, r.dir, { x: image.x, y: image.height }), `${e} ${d} ${h} ${r.id}`).toBe(true)
        }
      }
    }
  })

  it('reflect at equal angles at a mirror’s vertex', () => {
    for (const e of ['concave', 'convex', 'plane'] as Element[]) {
      const r = principalRays(e, 10, 25, 4).find((r) => r.id === 'vertex')!
      const incoming = { x: r.hit.x - r.from.x, y: r.hit.y - r.from.y }
      // The normal at the vertex is the axis: the ray comes in at an angle to
      // it below, and goes out at the same angle the other side of it.
      const angleIn = Math.atan2(-incoming.y, incoming.x)
      const angleOut = Math.atan2(-r.dir.y, -r.dir.x)
      expect(angleIn).toBeGreaterThan(0)
      close(angleOut, angleIn)
    }
  })

  it('send a parallel ray through F′ and a ray through F out parallel', () => {
    const rays = principalRays('converging', 10, 30, 4)
    const parallel = rays.find((r) => r.id === 'parallel')!
    expect(parallel.hit).toEqual({ x: 0, y: 4 })
    expect(onLine(parallel.hit, parallel.dir, { x: 10, y: 0 })).toBe(true)
    const focal = rays.find((r) => r.id === 'focal')!
    expect(onLine(focal.from, { x: focal.hit.x - focal.from.x, y: focal.hit.y - focal.from.y }, { x: -10, y: 0 })).toBe(true)
    expect(focal.dir.y).toBe(0)
  })

  it('leave out a ray that would never reach the lens or mirror', () => {
    expect(principalRays('converging', 10, 10, 2).map((r) => r.id)).toEqual(['parallel', 'center'])
    expect(principalRays('concave', 10, 20, 2).map((r) => r.id)).toEqual(['parallel', 'focal', 'vertex'])
  })
})
