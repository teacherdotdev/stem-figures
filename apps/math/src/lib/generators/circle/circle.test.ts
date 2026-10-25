import { describe, expect, test } from 'vitest'
import { exampleDetails } from '$lib/examples/details.server'
import { EXAMPLES } from '$lib/examples/examples'
import { buildGeometry, type Geometry } from './geometry.js'
import { angleStyle, buildCircle } from './layout.js'
import { findFaces } from './faces.js'
import { circleMeasures } from './measures.js'
import {
  ARC_DEFAULTS, DEFAULT_SETTINGS, cleanSettings, freeDir, freshNames, midKey, newJoin, newTangent, newTangentFrom, settingsFromParams, settingsToQuery, touchKey,
  type Line, type Settings,
} from './settings.js'

const params = (q: string) => settingsFromParams(new URLSearchParams(q))
/** Points by id and direction, and for one off the circle, its distance from the center. */
const figure = (points: ([string, number] | [string, number, number])[], lines: Line[], extra: Partial<Settings> = {}): Settings =>
  cleanSettings({
    ...DEFAULT_SETTINGS,
    points: points.map(([id, dir, dist = 1]) => ({ id, name: id.toUpperCase(), dir: String(dir), dist: String(dist) })),
    lines,
    angles: {},
    ...extra,
  })
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
      ['pt', 'p5|name=P|dir=-30|dist=2.5'],
      ['l', 'l1|a=p1|runA=1|capA=triangle|style=dashed|label=measure|ticks=2|b=p4'],
      ['l', 'l3|kind=tangent|a=p4|runB=0|capA=circle|label=text|text=t'],
      ['l', 'l4|a=o|label=text|text=r|arrows=1|flip=1|b=p1'],
      ['l', 'l6|kind=from|a=p5|runB=1|side=right'],
      ['l', 'l7|a=o|b=l6%3At'],
      ['a', 'o@l4+~l1-|label=measure|mark=2'],
      ['arc', 'p1~p4|label=degrees|ticks=1|draw=red'],
      ['arc', 'p4~p1|draw=hidden'],
      ['f', 'l1+l4+p1~p4|fill=3'],
      ['m', 'l1:a1|name=E'],
      ['m', 'l6:t|name=T'],
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

describe('points off the circle', () => {
  const P = (dist: number, dir = 0): [string, number, number] => ['p9', dir, dist]

  test('two tangents from a point are the same length, and square to the radius where they touch', () => {
    for (const [dist, dir] of [[2, 0], [1.5, 120], [3.25, 250]]) {
      const s = figure([P(dist, dir)], [newTangentFrom('l1', 'p9', 'left'), newTangentFrom('l2', 'p9', 'right'), newJoin('l3', 'o', touchKey('l1')), newJoin('l4', 'o', touchKey('l2'))])
      const g = buildGeometry(s)
      const [t1, t2] = g.lines
      expect(t1.length).toBeCloseTo(t2.length, 9)
      expect(t1.length).toBeCloseTo(Math.sqrt(dist * dist - 1), 9)
      for (const key of [touchKey('l1'), touchKey('l2')]) {
        const at = angleAt(g, key)
        expect(at.some((a) => Math.abs(a.measure - 90) < 1e-9)).toBe(true)
        expect(Math.hypot(...nodeAt(g, key))).toBeCloseTo(1, 9)
      }
      expect(g.lines.map((l) => l.kind)).toEqual(['tangent', 'tangent', 'radius', 'radius'])
    }
  })

  test('two secants from a point: PA·PB = PC·PD, from the drawn geometry', () => {
    for (const [dist, a, c] of [[2, 20, -15], [3, 10, 350], [1.75, 40, 330]]) {
      // From P through the near points A and C (closer round than where a tangent would touch), on through the circle to where each meets it again.
      const s = figure([P(dist), ['p1', a], ['p2', c]], [{ ...newJoin('l1', 'p9', 'p1'), runB: true }, { ...newJoin('l2', 'p9', 'p2'), runB: true }])
      const g = buildGeometry(s)
      const [Pt, A, C] = ['p9', 'p1', 'p2'].map((k) => nodeAt(g, k))
      const [B, D] = ['l1:b1', 'l2:b1'].map((k) => nodeAt(g, k))
      expect(dist && Math.hypot(...B)).toBeCloseTo(1, 9)
      const [pa, pb, pc, pd] = [A, B, C, D].map((x) => Math.hypot(x[0] - Pt[0], x[1] - Pt[1]))
      expect(pa * pb).toBeCloseTo(pc * pd, 9)
      // Which is also the tangent's length squared.
      expect(pa * pb).toBeCloseTo(dist * dist - 1, 9)
      expect(g.lines.map((l) => l.kind)).toEqual(['secant', 'secant'])
    }
  })

  test('a line from outside through the center meets the circle on both sides of it', () => {
    const g = buildGeometry(figure([P(2.5, 30)], [{ ...newJoin('l1', 'p9', 'o'), runB: true }]))
    expect(g.nodes.filter((n) => n.kind === 'meet').map((n) => n.key)).toEqual(['l1:m1', 'l1:b1'])
    expect(g.lines[0].kind).toBe('secant')
    expect(buildGeometry(figure([P(2.5, 30)], [newJoin('l1', 'p9', 'o')])).lines[0].kind).toBe('segment')
  })

  test('the area between two tangents and the circle', () => {
    const dist = 2
    const s = figure([P(dist)], [newTangentFrom('l1', 'p9', 'left'), newTangentFrom('l2', 'p9', 'right')])
    const faces = findFaces(buildGeometry(s))
    const turn = Math.acos(1 / dist)
    // The kite O-T-P-T, less the sector between the touch points.
    const outside = faces.find((f) => f.key.includes('l1'))!
    expect(outside.area).toBeCloseTo(Math.sqrt(dist * dist - 1) - turn, 9)
    const [, , shaded] = circleMeasures(cleanSettings({ ...s, faces: { [outside.key]: 1 }, radius: '1', round: 2 }), faces, () => 'P')
    expect(shaded.values.at(-1)).toBe('area 1.73 − 0.33π cm² ≈ 0.68 cm²')
    // And the circle, untouched inside.
    expect(faces.filter((f) => f !== outside).reduce((t, f) => t + f.area, 0)).toBeCloseTo(Math.PI, 9)
  })

  test('no tangents from inside the circle, and a join to a touch point needs its tangent', () => {
    expect(buildGeometry(figure([P(0.5)], [newTangentFrom('l1', 'p9', 'left')])).lines).toEqual([])
    const s = cleanSettings({ ...figure([P(2)], []), lines: [newJoin('l2', 'o', touchKey('l1'))] })
    expect(s.lines).toEqual([])
  })
})

describe('midpoints', () => {
  const chord = (extra: Line[] = [], marks: Record<string, string> = {}) =>
    figure([['p1', 200], ['p2', 340]], [{ ...newJoin('l1', 'p1', 'p2'), ticks: 1 }, ...extra], { marks })

  test('a line from the center to a chord’s midpoint is square to it, with one square on its own', () => {
    for (const [a, b] of [[200, 340], [10, 130], [90, 300]]) {
      const s = figure([['p1', a], ['p2', b]], [newJoin('l1', 'p1', 'p2'), newJoin('l2', 'o', midKey('l1'))])
      const f = buildCircle(s)
      const at = f.angles.filter((x) => x.node === midKey('l1'))
      expect(at.map((x) => x.measure)).toEqual([90, 90].map((v) => expect.closeTo(v, 9)))
      expect(f.squares).toHaveLength(1)
      // And it halves the chord.
      const g = buildGeometry(s)
      const [A, B, M] = ['p1', 'p2', midKey('l1')].map((k) => nodeAt(g, k))
      expect(dist(A, M)).toBeCloseTo(dist(M, B), 9)
    }
  })

  test('a midpoint is a place only once it’s joined or named, and the chord’s ticks then go on each half', () => {
    expect(buildGeometry(chord()).nodes.some((n) => n.kind === 'mid')).toBe(false)
    expect(buildCircle(chord()).ticks).toHaveLength(1)
    // Still offered, to click.
    expect(buildCircle(chord()).handles.some((h) => h.key === midKey('l1'))).toBe(true)
    expect(buildCircle(chord([], { [midKey('l1')]: 'M' })).ticks).toHaveLength(2)
    expect(buildCircle(chord([newJoin('l2', 'o', midKey('l1'))])).ticks).toHaveLength(2)
  })

  test('a chord’s parallel arrows move off its midpoint, onto one half, beside the ticks there', () => {
    const marked = (ticks: number, marks: Record<string, string> = {}) =>
      buildCircle(figure([['p1', 200], ['p2', 340]], [{ ...newJoin('l1', 'p1', 'p2'), ticks, arrows: 2 }], { marks }))
    const tip = (a: [number, number][]) => a[1]
    const before = marked(0)
    const M = before.handles.find((h) => h.key === midKey('l1'))!.at
    expect(before.arrows.some((a) => dist(tip(a), M) < 8)).toBe(true)
    expect(marked(0, { [midKey('l1')]: 'M' }).arrows.every((a) => dist(tip(a), M) > 15)).toBe(true)
    const f = marked(1, { [midKey('l1')]: 'M' })
    expect(f.arrows).toHaveLength(2)
    for (const a of f.arrows) expect(dist(tip(a), M)).toBeGreaterThan(15)
    // Clear of the ticks on their half, too.
    for (const a of f.arrows) for (const [p, q] of f.ticks) expect(dist(tip(a), [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2])).toBeGreaterThan(4)
  })

  test('a midpoint comes back from the page address, and goes with its line', () => {
    const s = chord([newJoin('l2', 'o', midKey('l1'))], { [midKey('l1')]: 'M' })
    expect(params(settingsToQuery(s))).toEqual(s)
    const gone = cleanSettings({ ...s, lines: s.lines.filter((l) => l.id !== 'l1') })
    expect([gone.lines, gone.marks]).toEqual([[], {}])
  })

  test('the areas still fill the circle', () => {
    const s = chord([newJoin('l2', 'o', midKey('l1')), newJoin('l3', 'o', 'p1')])
    expect(findFaces(buildGeometry(s)).reduce((t, f) => t + f.area, 0)).toBeCloseTo(Math.PI, 9)
  })
})

describe('examples', () => {
  // Every example is a starter: "Start from an example" loads its settings.
  const answers: Record<string, string[]> = {
    'central-angle-and-inscribed-angle-on-the-same-arc': ['x = 60°'],
    'parts-of-a-circle-radius-diameter-chord-tangent-secant': ['Diameter AB · Radius OC · Chord DE · Tangent at F · Secant GH'],
    'shaded-sector-with-radius-central-angle-and-arc-length': ['Shaded OAB: 100°, arc 3.3π cm ≈ 10.5 cm, area 10π cm² ≈ 31.4 cm²'],
    'shaded-segment-of-a-circle-cut-off-by-a-chord': ['Shaded AB: 140°, arc 4.7π cm ≈ 14.7 cm, area 14π − 11.6 cm² ≈ 32.4 cm²'],
    'angles-in-the-same-segment-circle-theorem': ['x = 70°'],
    'angle-in-a-semicircle-triangle-on-a-diameter': ['x = 35°'],
    'cyclic-quadrilateral-opposite-angles': ['x = 85°'],
    'tangent-and-radius-angle-x': ['x = 90°'],
    'two-tangents-from-an-external-point': ['x = 60°'],
    'alternate-segment-theorem-tangent-and-chord': ['x = 60°'],
    'intersecting-chords-angle-and-intercepted-arcs': ['x = 100°'],
    'two-secants-from-an-external-point': ['x = 60°'],
    'regular-hexagon-inscribed-in-a-circle': ['x = 6 cm'],
  }

  test('there are thirteen, each drawn as written, with its answer key', () => {
    const examples = EXAMPLES.filter((e) => e.generator === 'circle')
    expect(examples.map((e) => e.slug)).toEqual(Object.keys(answers))
    for (const e of examples) expect([e.slug, exampleDetails(e).answer?.lines]).toEqual([e.slug, answers[e.slug]])
  })
})

describe('running on to meet another line', () => {
  test('two tangents run on to where they cross', () => {
    // Tangents at 60° and 300° cross 2 radii out, to the right of the center.
    const s = figure([['p1', 60], ['p2', 300]], [{ ...newTangent('l1', 'p1'), toA: 'l2' }, { ...newTangent('l2', 'p2'), toB: 'l1' }], { marks: { 'l1.l2': 'P' } })
    const g = buildGeometry(s)
    const P = nodeAt(g, 'l1.l2')
    expect(P[0]).toBeCloseTo(2, 9)
    expect(P[1]).toBeCloseTo(0, 9)
    // They end there, the same length from where they touch, at 60° to each other.
    const [A, B] = ['p1', 'p2'].map((k) => nodeAt(g, k))
    expect(dist(A, P)).toBeCloseTo(dist(B, P), 9)
    expect(angleAt(g, 'l1.l2').map((a) => a.measure)).toEqual([expect.closeTo(60, 9)])
    expect(params(settingsToQuery(s))).toEqual(s)
  })

  test('an end only runs on to meet a line ahead of it, that’s still there', () => {
    // Tangents at 0° and 180° are parallel: they never meet, so the end runs its usual length.
    const s = figure([['p1', 0], ['p2', 180]], [{ ...newTangent('l1', 'p1'), toB: 'l2' }, newTangent('l2', 'p2')])
    expect(buildGeometry(s).lines[0].hi).toBeCloseTo(0.9, 9)
    expect(cleanSettings({ ...s, lines: [s.lines[0]] }).lines[0].toB).toBe('')
  })
})

describe('angle labels', () => {
  const central = (sweep: number) => {
    const s = figure([['p1', 0], ['p2', sweep]], [newJoin('l1', 'o', 'p1'), newJoin('l2', 'o', 'p2')], { angles: {} })
    const key = buildGeometry(s).corners.find((c) => c.node.key === 'o')!.angles.find((a) => a.measure < 180)!.key
    const f = buildCircle(cleanSettings({ ...s, angles: { [key]: { label: 'measure', text: '', mark: 'none', shade: 0 } } }))
    const l = f.labels.find((x) => x.part === `angle:${key}`)!
    return { l, from: dist([l.cx, l.cy], f.handles.find((h) => h.key === 'o')!.at) }
  }

  test('a narrow angle’s label gets smaller and stays by its corner', () => {
    const wide = central(60)
    for (const sweep of [5, 12, 25]) {
      const { l, from } = central(sweep)
      expect(from).toBeLessThan(60)
      expect(l.box.w).toBeLessThan(wide.l.box.w)
    }
  })
})

describe('names', () => {
  test('the center’s name keeps off a chord running close by it', () => {
    for (const dirs of [[0, 16, 190], [10, 170, 190, 350]]) {
      const pts = dirs.map((d, i) => [`p${i + 1}`, d] as [string, number])
      const lines = pts.map(([id], i) => newJoin(`l${i + 1}`, id, pts[(i + 1) % pts.length][0])).slice(0, dirs.length === 3 ? 2 : 4)
      const f = buildCircle(figure(pts, lines.length === 2 ? [newJoin('l1', 'p3', 'p1'), newJoin('l2', 'p3', 'p2')] : lines))
      const l = f.labels.find((x) => x.part === 'pt:o')!
      const [hw, hh] = [l.box.w / 2, (l.box.asc + l.box.desc) / 2]
      for (const g of f.segments)
        for (let k = 0; k <= 200; k++) {
          const [x, y] = [g.from[0] + ((g.to[0] - g.from[0]) * k) / 200, g.from[1] + ((g.to[1] - g.from[1]) * k) / 200]
          expect(Math.abs(x - l.cx) < hw && Math.abs(y - l.cy) < hh).toBe(false)
        }
    }
  })
})
