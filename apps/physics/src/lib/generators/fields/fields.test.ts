import { describe, expect, test } from 'vitest'
import { crosses } from '$lib/shared/field'
import { CHARGE_R, HEIGHT, WIDTH, buildFields, chargeField } from './fields'
import { fieldSettings, SETUPS, type FieldSettings } from './settings'

const fig = (s: Partial<FieldSettings>) => buildFields({ ...fieldSettings.defaults, ...s })
const near = (p: { x: number; y: number }, c: { x: number; y: number }, r = CHARGE_R + 1.5) => Math.hypot(p.x - c.x, p.y - c.y) <= r
const offFigure = (p: { x: number; y: number }) => p.x < 0 || p.x > WIDTH || p.y < 0 || p.y > HEIGHT

describe('chargeField', () => {
  test('points away from a + charge and toward a − charge', () => {
    const [ex] = chargeField([{ x: 0, y: 0, q: 1 }])(10, 0)
    expect(ex).toBeGreaterThan(0)
    const [fx] = chargeField([{ x: 0, y: 0, q: -1 }])(10, 0)
    expect(fx).toBeLessThan(0)
  })
})

describe('opposite charges', () => {
  const f = fig({ setup: 'opposite' })
  const [plus, minus] = f.charges

  test('every line runs from the + charge, or comes in from off the figure, and ends at the − charge or runs off it', () => {
    for (const line of f.lines) {
      const first = line.points[0]
      const last = line.points.at(-1)!
      expect(near(first, plus) || offFigure(first)).toBe(true)
      expect(near(last, minus) || offFigure(last)).toBe(true)
    }
  })

  test('the 12 lines leaving + are each drawn once, plus those coming in to − from outside', () => {
    const fromPlus = f.lines.filter((l) => near(l.points[0], plus))
    expect(fromPlus).toHaveLength(12)
    const toMinusFromOutside = f.lines.filter((l) => !near(l.points[0], plus))
    // The line straight out of the − side, at least, comes in from outside.
    expect(toMinusFromOutside.length).toBeGreaterThanOrEqual(1)
    expect(toMinusFromOutside.length).toBeLessThan(12)
  })

  test('no two lines cross', () => {
    for (let i = 0; i < f.lines.length; i++)
      for (let j = i + 1; j < f.lines.length; j++) expect(crosses(f.lines[i].points, f.lines[j].points)).toBe(false)
  })

  test('every line has one arrowhead on the figure', () => {
    for (const line of f.lines) {
      expect(line.arrows).toHaveLength(1)
      expect(offFigure(line.arrows[0])).toBe(false)
    }
  })
})

describe('like charges', () => {
  test('lines leave two + charges and none reaches the other charge', () => {
    const f = fig({ setup: 'like', sign: '+' })
    expect(f.lines).toHaveLength(24)
    for (const line of f.lines) expect(offFigure(line.points.at(-1)!)).toBe(true)
  })

  test('lines come in to two − charges, pointing in', () => {
    const f = fig({ setup: 'like', sign: '-' })
    for (const line of f.lines) {
      expect(offFigure(line.points[0])).toBe(true)
      expect(f.charges.some((c) => near(line.points.at(-1)!, c))).toBe(true)
    }
    // Its arrow points toward the charge it comes in to.
    const a = f.lines[0].arrows[0]
    const c = f.charges.find((ch) => near(f.lines[0].points.at(-1)!, ch))!
    const toward = (Math.atan2(c.y - a.y, c.x - a.x) * 180) / Math.PI
    expect(Math.abs(((a.angle - toward + 540) % 360) - 180)).toBeLessThan(30)
  })
})

describe('one charge', () => {
  test('straight lines, out from + and in to −', () => {
    const out = fig({ setup: 'charge', sign: '+' })
    const right = out.lines[0] // the line straight to the right
    expect(right.points.at(-1)!.y).toBeCloseTo(HEIGHT / 2, 3)
    expect(right.arrows[0].angle).toBeCloseTo(0, 3)
    const into = fig({ setup: 'charge', sign: '-' })
    expect(Math.abs(into.lines[0].arrows[0].angle)).toBeCloseTo(180, 3)
  })
})

describe('the wire', () => {
  test('current out of the page: counterclockwise on screen, so leftward over the top', () => {
    const f = fig({ setup: 'wire', current: 'out' })
    const [top, bottom] = f.lines[0].arrows
    expect(top.y).toBeLessThan(HEIGHT / 2)
    expect(top.angle).toBe(180)
    expect(bottom.angle).toBe(0)
  })

  test('current into the page: clockwise', () => {
    const f = fig({ setup: 'wire', current: 'in' })
    expect(f.lines[0].arrows[0].angle).toBe(0)
  })

  test('circles get further apart further out, and fit on the figure', () => {
    const f = fig({ setup: 'wire', lines: 'more' })
    const radii = f.lines.map((l) => HEIGHT / 2 - Math.min(...l.points.map((p) => p.y)))
    for (let i = 2; i < radii.length; i++) expect(radii[i] - radii[i - 1]).toBeGreaterThan(radii[i - 1] - radii[i - 2])
    expect(radii.at(-1)!).toBeLessThan(HEIGHT / 2 - 10)
  })
})

describe('plates', () => {
  test('straight lines down from the + plate to the − plate', () => {
    const f = fig({ setup: 'plates' })
    expect(f.lines).toHaveLength(7)
    for (const line of f.lines) {
      expect(line.points[0].x).toBe(line.points[1].x)
      expect(line.points[0].y).toBeLessThan(line.points[1].y)
      expect(line.arrows[0].angle).toBe(90)
    }
  })
})

test('every setup and density builds, and more means more lines', () => {
  for (const setup of SETUPS) {
    const fewer = fig({ setup, lines: 'fewer' }).lines.length
    const more = fig({ setup, lines: 'more' }).lines.length
    expect(fewer).toBeGreaterThan(0)
    expect(more).toBeGreaterThan(fewer)
  }
})

test('the directory preview has its own id, so its clip path is not another preview’s', async () => {
  const { readFileSync, readdirSync, existsSync } = await import('node:fs')
  const { join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const dir = fileURLToPath(new URL('..', import.meta.url))
  const idOf = (name: string) => readFileSync(join(dir, name, 'Preview.svelte'), 'utf8').match(/\bid="([^"]+)"/)?.[1]
  const ours = idOf('fields')
  // Every other figure that draws a clip path names it after its id, as Fields does.
  const others = readdirSync(dir)
    .filter((name) => name !== 'fields' && existsSync(join(dir, name, 'Preview.svelte')))
    .filter((name) => readdirSync(join(dir, name)).some((f) => f.endsWith('.svelte') && readFileSync(join(dir, name, f), 'utf8').includes('-clip"')))
    .map(idOf)
  expect(ours).toBeTruthy()
  expect(others).not.toContain(ours)
})
