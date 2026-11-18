import { describe, expect, test } from 'vitest'
import { CUBE_NETS, foldCube, shapesOf, type Cell } from './cubes.js'
import { areaOf, tabsFor, unfold, type Face } from './layout.js'
import { cleanSettings, settingsFromParams, settingsToQuery, type Settings } from './settings.js'
import { readNet } from './solve.js'

const settings = (q: string) => settingsFromParams(new URLSearchParams(q))
const solved = (s: Settings) => {
  const read = readNet(s)
  if (!read.values) throw new Error(`${settingsToQuery(s)} makes no shape: ${read.problem ?? JSON.stringify(read.problems)}`)
  return { ...read, values: read.values }
}

/** Every free hexomino: six squares joined edge to edge, each once up to turning and flipping. */
function hexominoes(): Cell[][] {
  let shapes: Cell[][] = [[[0, 0]]]
  for (let size = 1; size < 6; size++) {
    const next = new Map<string, Cell[]>()
    for (const cells of shapes) {
      for (const [c, r] of cells) {
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const cell: Cell = [c + dc, r + dr]
          if (cells.some(([x, y]) => x === cell[0] && y === cell[1])) continue
          const grown = [...cells, cell]
          const key = shapesOf(grown).sort()[0]
          if (!next.has(key)) next.set(key, grown)
        }
      }
    }
    shapes = [...next.values()]
  }
  return shapes
}

describe('cube nets', () => {
  test('each of the 11 folds into a cube', () => {
    for (const cells of CUBE_NETS) expect(foldCube(cells)).not.toBeNull()
  })

  test('no two are the same net turned or flipped', () => {
    const keys = CUBE_NETS.map((cells) => shapesOf(cells).sort()[0])
    expect(new Set(keys).size).toBe(11)
  })

  test('they are all the hexominoes that fold into a cube', () => {
    const all = hexominoes()
    expect(all.length).toBe(35)
    const folding = all.filter((cells) => foldCube(cells)).map((cells) => shapesOf(cells).sort()[0])
    expect(new Set(folding)).toEqual(new Set(CUBE_NETS.map((cells) => shapesOf(cells).sort()[0])))
  })

  test('a row of six doesn’t fold', () => {
    expect(foldCube([0, 1, 2, 3, 4, 5].map((c) => [c, 0] as Cell))).toBeNull()
  })
})

/** The nets checked for folding, overlaps and area. */
const NETS = [
  ...CUBE_NETS.map((_, i) => `shape=cube&cubeNet=${i + 1}`),
  '',
  'length=8&width=8&height=2',
  'base=right&triBase=6&triHeight=8&height=12',
  'base=isosceles&triBase=6&triHeight=4&height=10',
  'base=isosceles&triBase=10&triHeight=1&height=3',
  ...[3, 4, 5, 6, 7, 8].map((n) => `base=regular&sides=${n}&side=4&height=9`),
  'shape=pyramid&length=6&width=6&height=4',
  'shape=pyramid&length=10&width=4&height=&slant=6',
  'shape=pyramid&length=2&width=2&height=20',
  ...[3, 5, 6, 8].map((n) => `shape=pyramid&base=regular&sides=${n}&side=4&height=5`),
  'shape=cylinder&radius=3&height=10',
  'shape=cylinder&radius=10&height=1',
  'shape=cylinder&radius=6&diameter=1&height=4',
  'shape=cone&radius=3&slant=5',
  'shape=cone&radius=4&height=1',
  'shape=cone&radius=1&height=&slant=10',
]

/** The shape's surface area, from its measures. */
function surfaceArea(s: Settings) {
  const read = solved(s)
  const v = read.values
  const { form } = read
  if (form.shape === 'cube') return 6 * v.side ** 2
  const r = s.diameter ? v.radius / 2 : v.radius
  if (form.shape === 'cylinder') return 2 * Math.PI * r * r + 2 * Math.PI * r * v.height
  if (form.shape === 'cone') return Math.PI * r * r + Math.PI * r * v.slant
  const [base, perimeter] =
    form.base === 'rectangle' ? [v.length * v.width, 2 * (v.length + v.width)]
    : form.base === 'regular' ? [(form.sides * v.side * v.apothem) / 2, form.sides * v.side]
    : [(v.triBase * v.triHeight) / 2, form.base === 'right' ? v.triBase + v.triHeight + v.hyp : v.triBase + 2 * v.hyp]
  if (form.shape === 'prism') return 2 * base + perimeter * v.height
  return form.base === 'regular' ? base + (perimeter * v.slant) / 2 : base + v.length * v.slant + v.width * v.slantW
}

/** A face as convex pieces, for checking overlaps. */
function pieces(f: Face): [number, number][][] {
  if (f.kind === 'poly') return [f.pts]
  if (f.kind === 'circle') return [Array.from({ length: 48 }, (_, i) => [f.c[0] + f.r * Math.cos((i * Math.PI) / 24), f.c[1] + f.r * Math.sin((i * Math.PI) / 24)])]
  const steps = 48
  const rim = Array.from({ length: steps + 1 }, (_, i) => {
    const a = f.from + ((f.to - f.from) * i) / steps
    return [f.apex[0] + f.r * Math.cos(a), f.apex[1] + f.r * Math.sin(a)] as [number, number]
  })
  return rim.slice(1).map((p, i) => [f.apex, rim[i], p])
}
function overlap(A: [number, number][], B: [number, number][]) {
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const [p, q] = [poly[i], poly[(i + 1) % poly.length]]
      const axis = [p[1] - q[1], q[0] - p[0]]
      const l = Math.hypot(axis[0], axis[1])
      const pa = A.map((x) => (x[0] * axis[0] + x[1] * axis[1]) / l)
      const pb = B.map((x) => (x[0] * axis[0] + x[1] * axis[1]) / l)
      if (Math.max(...pa) <= Math.min(...pb) + 1e-6 || Math.max(...pb) <= Math.min(...pa) + 1e-6) return false
    }
  }
  return true
}

describe.each(NETS)('net %s', (q) => {
  const s = settings(q)
  const read = solved(s)
  const net = unfold(s, read)

  test('its faces add up to the surface area', () => {
    const total = net.faces.reduce((t, f) => t + areaOf(f), 0)
    expect(total).toBeCloseTo(surfaceArea(s), 6)
  })

  test('no two faces overlap', () => {
    net.faces.forEach((f, i) =>
      net.faces.slice(i + 1).forEach((g) => {
        for (const a of pieces(f)) for (const b of pieces(g)) expect(overlap(a, b)).toBe(false)
      }),
    )
  })

  test('every edge of the shape is on the net twice, the same length both times', () => {
    const byKey = new Map<string, number[]>()
    for (const e of net.edges) byKey.set(e.key, [...(byKey.get(e.key) ?? []), Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1])])
    for (const [key, lengths] of byKey) {
      // A cylinder's rectangle's long sides are glued to its circles instead.
      if (key === 'top|top' || key === 'bottom|bottom') continue
      expect(lengths.length, key).toBe(2)
      expect(lengths[0]).toBeCloseTo(lengths[1], 9)
    }
  })

  test('its faces are joined: every face but one is folded onto another', () => {
    const folds = net.edges.filter((e) => e.fold)
    const joined = new Set([0])
    let grew = true
    while (grew) {
      grew = false
      for (const e of folds) {
        const partner = folds.find((o) => o !== e && o.key === e.key && o.face !== e.face)
        if (partner && joined.has(e.face) && !joined.has(partner.face)) {
          joined.add(partner.face)
          grew = true
        }
      }
    }
    // Circles touch their rectangle or sector at a point, and are joined there.
    const round = net.faces.filter((f) => f.kind === 'circle').length
    expect(joined.size + round).toBe(net.faces.length)
  })

  test('its glue tabs don’t lie over a face or each other', () => {
    const tabs = tabsFor(net, 1)
    // A circle's teeth start on its rim, so they're checked against the other faces only.
    const onRim = (t: [number, number][], f: Face) => f.kind === 'circle' && [t[0], t[3]].every((p) => Math.abs(Math.hypot(p[0] - f.c[0], p[1] - f.c[1]) - f.r) < 1e-6)
    tabs.forEach((t, i) => {
      for (const face of net.faces) if (!onRim(t, face)) for (const f of pieces(face)) expect(overlapsBeyondEdge(t, f)).toBe(false)
      tabs.slice(i + 1).forEach((u) => expect(overlap(t, u)).toBe(false))
    })
  })
})

/** A tab overlaps a face by more than its own base edge (a tooth's chord dips into its circle). */
function overlapsBeyondEdge(tab: [number, number][], face: [number, number][]) {
  const [a, b, c, d] = tab
  const pull = (p: [number, number], q: [number, number]): [number, number] => [p[0] + (q[0] - p[0]) * 0.1, p[1] + (q[1] - p[1]) * 0.1]
  return overlap([pull(a, b), b, c, pull(d, c)], face)
}

describe('settings', () => {
  test('a cube net out of range falls back to the cross', () => {
    expect(cleanSettings({ cubeNet: 12 }).cubeNet).toBe(1)
  })
  test('a pyramid can’t have a triangle base', () => {
    expect(settings('shape=pyramid&base=right').base).toBe('rectangle')
  })
  test('the address keeps only what changed', () => {
    expect(settingsToQuery(settings('shape=cube&cubeNet=4'))).toBe('shape=cube&cubeNet=4')
  })
})

describe('reading the measures', () => {
  test('a cube needs its edge', () => {
    expect(readNet(settings('shape=cube&side=')).problem).toBe('Give the edge.')
  })
  test('a pyramid’s slant heights are worked out from its height', () => {
    const v = solved(settings('shape=pyramid&length=8&width=6&height=4')).values
    expect(v.slant).toBeCloseTo(5)
    expect(v.slantW).toBeCloseTo(Math.hypot(4, 4))
  })
  test('a cone’s sector angle', () => {
    expect(solved(settings('shape=cone&radius=3&slant=5')).values.angle).toBeCloseTo(216)
  })
  test('a cylinder’s circumference', () => {
    expect(solved(settings('shape=cylinder&radius=3')).values.circ).toBeCloseTo(6 * Math.PI)
  })
})
