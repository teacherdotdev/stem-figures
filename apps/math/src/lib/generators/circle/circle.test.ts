import { describe, expect, test } from 'vitest'
import { buildGeometry, type Geometry } from './geometry.js'
import { angleStyle, buildCircle } from './layout.js'
import { findFaces } from './faces.js'
import { circleMeasures } from './measures.js'
import {
  ARC_DEFAULTS, DEFAULT_SETTINGS, cleanSettings, freeDir, freshNames, newJoin, newTangent, settingsFromParams, settingsToQuery, type Line, type Settings,
} from './settings.js'

const params = (q: string) => settingsFromParams(new URLSearchParams(q))
const figure = (points: [string, number][], lines: Line[], extra: Partial<Settings> = {}): Settings =>
  cleanSettings({ ...DEFAULT_SETTINGS, points: points.map(([id, dir]) => ({ id, name: id.toUpperCase(), dir: String(dir) })), lines, angles: {}, ...extra })
const angleAt = (g: Geometry, node: string) => g.corners.find((c) => c.node.key === node)!.angles
const nodeAt = (g: Geometry, key: string) => g.nodes.find((n) => n.key === key)!.at
const dist = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1])

describe('the page address', () => {
  test('the opening figure has a bare address', () => {
    expect(settingsToQuery(cleanSettings(DEFAULT_SETTINGS))).toBe('')
  })

  test('a link comes back the same', () => {
    const q = new URLSearchParams([
      ['centerDot', '0'],
      ['radius', '4.5'],
      ['unit', 'in'],
      ['pt', 'p1|name=P|dir=15'],
      ['pt', 'p4|name=Q%E2%80%B2|dir=200'],
      ['l', 'l1|a=p1|runA=1|capA=triangle|style=dashed|label=measure|ticks=2|b=p4'],
      ['l', 'l3|kind=tangent|a=p4|runB=0|capA=circle|label=text|text=t'],
      ['l', 'l4|a=o|label=text|text=r|arrows=1|flip=1|b=p1'],
      ['a', 'o@l4+~l1-|label=measure|mark=2'],
      ['arc', 'p1~p4|label=degrees|ticks=1|draw=red'],
      ['arc', 'p4~p1|draw=hidden'],
      ['f', 'l1+l4+p1~p4|fill=3'],
      ['m', 'l1:a1|name=E'],
    ]).toString()
    expect(settingsToQuery(params(q))).toBe(q)
  })

  test('a figure with no lines or angles says so', () => {
    const s = cleanSettings({ ...DEFAULT_SETTINGS, lines: [], angles: {} })
    expect(params(settingsToQuery(s))).toEqual(s)
  })

  test('what belongs to a point or line that isn’t there is dropped', () => {
    const s = params('a=o@l9%2B~l1%2B|label=measure&arc=p1~p9|label=degrees&m=l9:a1|name=E&a=nonsense|label=measure')
    expect([s.angles, s.arcs, s.marks]).toEqual([{}, {}, {}])
  })

  test('a line needs its points, and a tangent a point on the circle', () => {
    const s = cleanSettings({ ...DEFAULT_SETTINGS, lines: [newJoin('l1', 'o', 'p9'), newTangent('l2', 'o'), newJoin('l3', 'p1', 'p1'), newTangent('l4', 'p1')] })
    expect(s.lines.map((l) => l.id)).toEqual(['l4'])
  })
})

describe('angles in a circle', () => {
  test('the inscribed angle is half the central angle on the same arc', () => {
    for (const [a, b, c] of [[210, 330, 100], [0, 90, 200], [10, 300, 340], [250, 280, 40]]) {
      const s = figure([['p1', a], ['p2', b], ['p3', c]], [newJoin('l1', 'o', 'p1'), newJoin('l2', 'o', 'p2'), newJoin('l3', 'p3', 'p1'), newJoin('l4', 'p3', 'p2')])
      const g = buildGeometry(s)
      const inscribed = angleAt(g, 'p3')
      expect(inscribed).toHaveLength(1)
      // The central angle on the arc away from C, counterclockwise from A round to B: reflex when that arc is more than half the circle.
      const central = angleAt(g, 'o').find((x) => x.key === 'o@l1+~l2+')!
      const arc = (b - a + 360) % 360
      expect(central.measure).toBeCloseTo(arc, 9)
      expect(inscribed[0].measure).toBeCloseTo(central.measure / 2, 9)
    }
  })

  test('a triangle on a diameter gets its right-angle square on its own', () => {
    for (const c of [70, 123, 250]) {
      const s = figure([['p1', 0], ['p2', 180], ['p3', c]], [newJoin('l1', 'p1', 'p2'), newJoin('l2', 'p3', 'p1'), newJoin('l3', 'p3', 'p2')])
      const f = buildCircle(s)
      const at = f.angles.filter((a) => a.node === 'p3')
      expect(at).toHaveLength(1)
      expect(at[0].right).toBe(true)
      expect(angleStyle(s, at[0].key, at[0].auto).mark).toBe('right')
      expect(f.squares).toHaveLength(1)
      expect(s.lines[0] && buildGeometry(s).lines[0].kind).toBe('diameter')
    }
  })

  test('a tangent is square to the radius where it touches, and one square comes on its own', () => {
    const s = figure([['p1', 40]], [newJoin('l1', 'o', 'p1'), newTangent('l2', 'p1')])
    const f = buildCircle(s)
    const at = f.angles.filter((a) => a.node === 'p1')
    expect(at.map((a) => a.measure)).toEqual([90, 90].map((v) => expect.closeTo(v, 9)))
    expect(at.map((a) => a.auto)).toEqual([true, false])
    expect(f.squares).toHaveLength(1)
    // Taken off by the teacher, it stays off, and the other angle doesn't take it.
    const off = { ...s, angles: { [at[0].key]: { label: 'none' as const, text: '', mark: 'none' as const, shade: 0 } } }
    expect(buildCircle(cleanSettings(off)).squares).toHaveLength(0)
  })

  test('where a radius crosses a chord square to it, one square comes on its own', () => {
    const s = figure([['p1', 220], ['p2', 320], ['p3', 270]], [newJoin('l1', 'p1', 'p2'), newJoin('l2', 'o', 'p3')])
    const f = buildCircle(s)
    expect(f.angles.filter((a) => a.node === 'l1.l2' && a.right)).toHaveLength(4)
    expect(f.squares).toHaveLength(1)
  })

  test('the angle between a tangent and a chord equals the inscribed angle in the alternate segment', () => {
    const s = figure(
      [['p1', 270], ['p2', 30], ['p3', 140]],
      [newTangent('l1', 'p1'), newJoin('l2', 'p1', 'p2'), newJoin('l3', 'p1', 'p3'), newJoin('l4', 'p2', 'p3')],
    )
    const g = buildGeometry(s)
    const tangentChord = angleAt(g, 'p1').find((a) => a.key === 'p1@l1+~l2+')!
    const atC = angleAt(g, 'p3')
    expect(atC).toHaveLength(1)
    expect(tangentChord.measure).toBeCloseTo(atC[0].measure, 9)
  })
})

describe('chords and lines', () => {
  test('intersecting chords: AE·EB = CE·ED', () => {
    for (const dirs of [[20, 200, 100, 300], [10, 150, 80, 250], [45, 190, 120, 340]]) {
      const s = figure([['p1', dirs[0]], ['p2', dirs[1]], ['p3', dirs[2]], ['p4', dirs[3]]], [newJoin('l1', 'p1', 'p2'), newJoin('l2', 'p3', 'p4')])
      const g = buildGeometry(s)
      const e = nodeAt(g, 'l1.l2')
      const [A, B, C, D] = ['p1', 'p2', 'p3', 'p4'].map((k) => nodeAt(g, k))
      expect(dist(A, e) * dist(e, B)).toBeCloseTo(dist(C, e) * dist(e, D), 9)
      expect(angleAt(g, 'l1.l2')).toHaveLength(4)
    }
  })

  test('a run-on end goes through the circle, meeting it where a point can be named', () => {
    const s = figure([['p1', 30]], [{ ...newJoin('l1', 'p1', 'o'), runB: true }])
    const g = buildGeometry(s)
    const meet = g.nodes.find((n) => n.key === 'l1:b1')!
    expect(meet.at[0]).toBeCloseTo(-Math.cos(Math.PI / 6), 9)
    expect(meet.at[1]).toBeCloseTo(-0.5, 9)
    expect(g.lines[0].hi).toBeGreaterThan(2)
    // And it splits the circle into two half circles.
    expect(g.arcs.map((a) => a.sweep)).toEqual([180, 180].map((v) => expect.closeTo(v, 9)))
  })

  test('lines are named by their kind', () => {
    const s = figure(
      [['p1', 0], ['p2', 180], ['p3', 60], ['p4', 100]],
      [newJoin('l1', 'p1', 'p2'), newJoin('l2', 'o', 'p3'), newJoin('l3', 'p3', 'p4'), { ...newJoin('l4', 'p1', 'p4'), runA: true, runB: true }, newTangent('l5', 'p2')],
    )
    expect(buildGeometry(s).lines.map((l) => l.kind)).toEqual(['diameter', 'radius', 'chord', 'secant', 'tangent'])
  })
})

describe('arcs', () => {
  test('the arcs always add up to 360°', () => {
    for (const dirs of [[0], [10, 20], [350, 10, 100, 200], [0, 72, 144, 216, 288]]) {
      const s = figure(dirs.map((d, i) => [`p${i + 1}`, d] as [string, number]), [])
      const arcs = buildGeometry(s).arcs
      expect(arcs).toHaveLength(dirs.length)
      expect(arcs.reduce((t, a) => t + a.sweep, 0)).toBeCloseTo(360, 9)
    }
  })

  test('an arc is named by the places it runs between, counterclockwise', () => {
    const s = figure([['p1', 300], ['p2', 30]], [])
    expect(buildGeometry(s).arcs.map((a) => [a.key, Math.round(a.sweep)])).toEqual([['p2~p1', 270], ['p1~p2', 90]])
  })
})

describe('labels stay with their parts', () => {
  const base = figure([['p1', 210], ['p2', 330], ['p3', 100]], [newJoin('l1', 'o', 'p1'), newJoin('l2', 'o', 'p2'), newJoin('l3', 'p3', 'p1'), newJoin('l4', 'p3', 'p2')], {
    angles: { 'o@l1+~l2+': { label: 'measure', text: '', mark: '1', shade: 0 } },
    arcs: { 'p1~p2': { ...ARC_DEFAULTS, label: 'degrees' } },
  })
  const labelParts = (s: Settings) => buildCircle(s).labels.map((l) => l.part).filter((p) => !p.startsWith('pt:')).sort()

  test('through dragging a point', () => {
    const moved = { ...base, points: base.points.map((p) => (p.id === 'p2' ? { ...p, dir: '300' } : p)) }
    expect(labelParts(moved)).toEqual(labelParts(base))
  })

  test('through adding a point and a line elsewhere', () => {
    const more = cleanSettings({ ...base, points: [...base.points, { id: 'p4', name: 'D', dir: '160' }], lines: [...base.lines, newJoin('l5', 'p3', 'p4')] })
    expect(labelParts(more)).toEqual(labelParts(base))
  })

  test('and are dropped with their point', () => {
    const fewer = cleanSettings({ ...base, points: base.points.filter((p) => p.id !== 'p2') })
    expect(Object.keys(fewer.angles)).toEqual([])
    expect(Object.keys(fewer.arcs)).toEqual([])
  })
})

describe('helpers', () => {
  test('a new point goes in the widest gap, with the next free name', () => {
    expect(freeDir([])).toBe(90)
    expect(freeDir(DEFAULT_SETTINGS.points)).toBe(35)
    expect(freshNames(DEFAULT_SETTINGS, 2)).toEqual(['D', 'E'])
  })
})

describe('enclosed areas', () => {
  const areas = (s: Settings) => findFaces(buildGeometry(s))
  const keys = (s: Settings) => areas(s).map((f) => f.key).sort()
  const total = (s: Settings) => areas(s).reduce((t, f) => t + f.area, 0)

  test('with no lines the whole circle is one area', () => {
    expect(keys(figure([], []))).toEqual(['c'])
    expect(keys(figure([['p1', 30]], []))).toEqual(['p1~p1'])
    expect(areas(figure([['p1', 30]], []))[0].area).toBeCloseTo(Math.PI, 9)
  })

  test('a chord makes two segments, and two radii a sector and the rest', () => {
    const chord = figure([['p1', 0], ['p2', 120]], [newJoin('l1', 'p1', 'p2')])
    expect(keys(chord)).toEqual(['l1+p1~p2', 'l1+p2~p1'])
    const segment = areas(chord).find((f) => f.key === 'l1+p1~p2')!
    expect(segment.area).toBeCloseTo(Math.PI / 3 - 0.5 * Math.sin((120 * Math.PI) / 180), 9)
    expect(segment.arcs).toEqual([expect.closeTo(120, 9)])
    const sector = figure([['p1', 0], ['p2', 120]], [newJoin('l1', 'o', 'p1'), newJoin('l2', 'o', 'p2')])
    expect(keys(sector)).toEqual(['l1+l2+p1~p2', 'l1+l2+p2~p1'])
    expect(areas(sector).find((f) => f.key === 'l1+l2+p1~p2')!.area).toBeCloseTo(Math.PI / 3, 9)
  })

  test('the areas always fill the circle exactly', () => {
    const figures = [
      figure([['p1', 210], ['p2', 330], ['p3', 100]], [newJoin('l1', 'o', 'p1'), newJoin('l2', 'o', 'p2'), newJoin('l3', 'p3', 'p1'), newJoin('l4', 'p3', 'p2')]),
      figure([['p1', 20], ['p2', 200], ['p3', 100], ['p4', 300]], [newJoin('l1', 'p1', 'p2'), newJoin('l2', 'p3', 'p4')]),
      figure([['p1', 0], ['p2', 180], ['p3', 60]], [newJoin('l1', 'p1', 'p2'), newJoin('l2', 'p3', 'p1'), newJoin('l3', 'p3', 'p2'), newJoin('l4', 'o', 'p3')]),
      // A diameter and a radius along it, and a run-on through the circle, still split it cleanly.
      figure([['p1', 0], ['p2', 180], ['p3', 90]], [newJoin('l1', 'p1', 'p2'), newJoin('l2', 'o', 'p1'), { ...newJoin('l3', 'p3', 'o'), runB: true }]),
    ]
    for (const s of figures) expect(total(s)).toBeCloseTo(Math.PI, 9)
    // Two crossing chords make four areas.
    expect(areas(figures[1])).toHaveLength(4)
  })

  test('a tangent and loose ends close nothing off', () => {
    const s = figure([['p1', 90], ['p2', 200]], [newTangent('l1', 'p1'), newJoin('l2', 'o', 'p2')])
    expect(keys(s)).toEqual(['p1~p2+p2~p1'])
    expect(total(s)).toBeCloseTo(Math.PI, 9)
  })

  test('an area keeps its key while its points move', () => {
    const at = (c: number) => keys(figure([['p1', 210], ['p2', 330], ['p3', c]], [newJoin('l1', 'o', 'p1'), newJoin('l2', 'o', 'p2'), newJoin('l3', 'p3', 'p1'), newJoin('l4', 'p3', 'p2')]))
    expect(at(80)).toEqual(at(110))
  })

  test('a shaded area is drawn, and its shading comes back from the page address', () => {
    const s = figure([['p1', 0], ['p2', 120]], [newJoin('l1', 'p1', 'p2')], { faces: { 'l1+p1~p2': 2 } })
    expect(buildCircle(s).regions).toHaveLength(1)
    expect(params(settingsToQuery(s)).faces).toEqual({ 'l1+p1~p2': 2 })
    expect(params('f=l9%2Bp1~p2|fill=2&f=nonsense|fill=1').faces).toEqual({})
  })
})

describe('measures', () => {
  const values = (s: Settings) => circleMeasures(s, findFaces(buildGeometry(s)), (f) => f.corners.join(''))
  const shaded = (lines: Line[], face: string, radius = '6') =>
    figure([['p1', 0], ['p2', 120]], lines, { radius, round: 2, faces: { [face]: 1 } })

  test('the circle’s circumference and area, in π and as decimals', () => {
    const m = values(shaded([], 'x'))
    expect(m).toEqual([
      { name: 'Circumference', values: ['12π cm ≈ 37.7 cm'] },
      { name: 'Area', values: ['36π cm² ≈ 113.1 cm²'] },
    ])
  })

  test('a sector: its angle, arc and area', () => {
    const [, , sector] = values(shaded([newJoin('l1', 'o', 'p1'), newJoin('l2', 'o', 'p2')], 'l1+l2+p1~p2'))
    expect(sector.values).toEqual(['120°', 'arc 4π cm ≈ 12.57 cm', 'area 12π cm² ≈ 37.7 cm²'])
  })

  test('a segment: the sector less the triangle', () => {
    const [, , segment] = values(shaded([newJoin('l1', 'p1', 'p2')], 'l1+p1~p2'))
    expect(segment.values).toEqual(['120°', 'arc 4π cm ≈ 12.57 cm', 'area 12π − 15.59 cm² ≈ 22.11 cm²'])
    const [, , major] = values(shaded([newJoin('l1', 'p1', 'p2')], 'l1+p2~p1'))
    expect(major.values).toEqual(['240°', 'arc 8π cm ≈ 25.13 cm', 'area 24π + 15.59 cm² ≈ 90.99 cm²'])
  })

  test('an area with no arc is just a number', () => {
    const s = figure([['p1', 0], ['p2', 120], ['p3', 240]], [newJoin('l1', 'p1', 'p2'), newJoin('l2', 'p2', 'p3'), newJoin('l3', 'p3', 'p1')], { faces: { 'l1+l2+l3': 1 } })
    expect(values(s)[2].values).toEqual(['area 46.8 cm²'])
  })

  test('no measures without a radius', () => {
    expect(values(shaded([], 'x', 'x'))).toEqual([])
  })
})

describe('moving and hiding', () => {
  test('a line’s label can go on the other side of it', () => {
    const chord = (flip: boolean) => figure([['p1', 0], ['p2', 120]], [{ ...newJoin('l1', 'p1', 'p2'), label: 'text', text: 'x', flip }])
    const at = (flip: boolean) => buildCircle(chord(flip)).labels.find((l) => l.part === 'line:l1')!
    // The chord's middle is up and to the right of the center: its label goes outside, and flipped, inside.
    const [out, back] = [at(false), at(true)]
    const mid = [(130 + 130 * Math.cos((2 * Math.PI) / 3)) / 2, -(130 * Math.sin((2 * Math.PI) / 3)) / 2]
    expect(Math.hypot(out.cx, out.cy)).toBeGreaterThan(Math.hypot(mid[0], mid[1]))
    expect(Math.hypot(back.cx, back.cy)).toBeLessThan(Math.hypot(mid[0], mid[1]))
  })

  test('a hidden arc leaves the rest of the circle drawn', () => {
    const s = figure([['p1', 0], ['p2', 120], ['p3', 240]], [], { arcs: { 'p1~p2': { ...ARC_DEFAULTS, draw: 'hidden' } } })
    const f = buildCircle(s)
    expect(f.hidden).toHaveLength(1)
    expect(f.circle).toHaveLength(2)
    expect(buildCircle(figure([['p1', 0]], [])).circle).toBeNull()
  })
})
