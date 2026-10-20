import { describe, expect, test } from 'vitest'
import { buildMotion } from '../motion-graphs/figure'
import { letterOf, motionOf, positionAt, velocityAt } from '../motion-graphs/motion'
import { motionSettings, newSegment, type Segment } from '../motion-graphs/settings'
import { buildMap, mapAnswer, xOf, type MotionMapLayout } from './map'
import { graphLink, mapFromLink, mapLink, mapSettings, type MapSettings } from './settings'

const from = (query: string) => buildMap(mapSettings.fromParams(new URLSearchParams(query)))
const make = (over: Partial<MapSettings> = {}) => buildMap({ ...mapSettings.defaults, ...over })
const seg = (kind: Segment['kind'], speed: number, duration: number, dir: Segment['dir'] = 'forward') => newSegment({ kind, speed, duration, dir })

/** No two dots on one line closer than their diameter. */
function overlapping(f: MotionMapLayout) {
  return f.dots.some((a, i) => f.dots.some((b, j) => j > i && a.y === b.y && Math.abs(a.x - b.x) < 2 * f.r))
}

const THERE_AND_BACK = [seg('faster', 4, 2), seg('forward', 4, 3), seg('slower', 0, 2), seg('faster', 4, 2, 'back'), seg('slower', 0, 2)]

describe('the settings', () => {
  test('start from the Motion Graph’s cart, every second, with arrows', () => {
    expect(mapSettings.defaults.segments).toEqual(motionSettings.defaults.segments)
    expect(mapSettings.defaults.start).toBe(motionSettings.defaults.start)
    expect(mapSettings.defaults.dt).toBe('1')
    expect(mapSettings.toQuery(mapSettings.defaults)).toBe('')
  })

  test('write the segments and start the way the Motion Graph does', () => {
    const shared = { segments: [seg('faster', 6, 6, 'back'), seg('rest', 0, 2)], start: -5 }
    const map = mapSettings.toQuery({ ...mapSettings.defaults, ...shared })
    const graph = motionSettings.toQuery({ ...motionSettings.defaults, ...shared })
    expect(map).toBe(graph)
  })

  test('hand the motion to /motion-graphs and back, unchanged', () => {
    const s = { ...mapSettings.defaults, ...{ segments: THERE_AND_BACK, start: 3, dt: '0.5' as const, labels: 'times' as const } }
    const link = graphLink(s)
    expect(link.startsWith('/motion-graphs?')).toBe(true)
    // Only the motion goes along: the map's own settings stay behind.
    expect(link).not.toContain('dt=')
    const graph = motionSettings.fromParams(new URLSearchParams(link.split('?')[1]))
    expect(graph.segments).toEqual(s.segments)
    expect(graph.start).toBe(3)
    const back = mapLink(graph)
    expect(back.startsWith('/motion-map?')).toBe(true)
    const map = mapSettings.fromParams(new URLSearchParams(back.split('?')[1]))
    expect(map.segments).toEqual(s.segments)
    expect(map.start).toBe(3)
  })

  test('link with no query at all for the default motion', () => {
    expect(graphLink(mapSettings.defaults)).toBe('/motion-graphs')
    expect(mapLink(motionSettings.defaults)).toBe('/motion-map')
  })
})

describe('starting from a pasted motion graph link', () => {
  const graph = { ...motionSettings.defaults, segments: THERE_AND_BACK, start: -4, graphs: 'all' as const }
  const pasted = `https://physicsfigures.com/motion-graphs?${motionSettings.toQuery(graph)}`

  test('takes the graph’s segments and start, and nothing else', () => {
    expect(mapFromLink(pasted)).toEqual({ ...mapSettings.defaults, segments: THERE_AND_BACK, start: -4 })
  })

  test('takes links from any address, with or without https:// or spaces around them', () => {
    const query = pasted.split('?')[1]
    for (const link of [`  ${pasted}\n`, `physicsfigures.com/motion-graphs?${query}`, `http://localhost:10000/motion-graphs/?${query}`]) {
      expect(mapFromLink(link)?.segments, link).toEqual(THERE_AND_BACK)
    }
  })

  test('reads a link with no settings as the default motion, and takes motion map links too', () => {
    expect(mapFromLink('https://physicsfigures.com/motion-graphs')).toEqual(mapSettings.defaults)
    const map = mapLink({ segments: THERE_AND_BACK, start: 2 })
    expect(mapFromLink(`https://physicsfigures.com${map}`)?.start).toBe(2)
  })

  test('turns away anything else', () => {
    for (const text of ['hello', 'https://physicsfigures.com/projectile-motion?angle=30', 'https://physicsfigures.com/motion-graphs/examples/cart', 'not a link at all']) {
      expect(mapFromLink(text), text).toBeNull()
    }
  })
})

describe('the dots', () => {
  const KINDS: [string, Segment[]][] = [
    ['constant velocity', [seg('forward', 3, 6)]],
    ['constant velocity back', [seg('back', 2, 5)]],
    ['speeding up', [seg('faster', 6, 6)]],
    ['slowing down', [seg('forward', 5, 1), seg('slower', 0, 5)]],
    ['at rest', [seg('rest', 0, 3), seg('forward', 2, 3)]],
    ['there and back', THERE_AND_BACK],
  ]

  test.each(KINDS)('sit at positionAt(kΔt), to the pixel: %s', (_, segments) => {
    for (const dt of ['0.5', '1', '2'] as const) {
      const f = make({ segments, start: 4, dt })
      const m = motionOf(segments, 4)
      for (const p of f.samples) {
        const dot = f.dots.find((d) => d.k0 <= p.k && p.k <= d.k1)!
        expect(Math.abs(dot.x - xOf(f, positionAt(m, p.k * Number(dt))))).toBeLessThan(0.5)
      }
      expect(f.samples).toHaveLength(Math.floor(m.end / Number(dt)) + 1)
    }
  })

  test('are evenly spaced at a constant velocity', () => {
    const f = make({ segments: [seg('forward', 3, 6)] })
    const gaps = f.dots.slice(1).map((d, i) => d.x - f.dots[i].x)
    for (const g of gaps) expect(g).toBeCloseTo(3 * f.ppm, 1)
  })

  test('change spacing by aΔt² from one gap to the next, speeding up or slowing down', () => {
    for (const [segments, a] of [
      [[seg('faster', 6, 6)], 1],
      [[seg('forward', 6, 1), seg('slower', 0, 4)], -1.5],
    ] as const) {
      for (const dt of ['0.5', '1'] as const) {
        const f = make({ segments: [...segments], dt })
        const step = Number(dt)
        const p = motionOf([...segments], 0).pieces.at(-1)!
        const inside = f.dots.filter((d) => d.t0 >= p.t0 - 1e-9 && d.t1 <= p.t1 + 1e-9 && d.t0 === d.t1)
        const gaps = inside.slice(1).map((d, i) => d.x - inside[i].x)
        for (let i = 1; i < gaps.length; i++) expect(gaps[i] - gaps[i - 1]).toBeCloseTo(a * step * step * f.ppm, 1)
      }
    }
  })

  test('never overlap in the examples', () => {
    for (const segments of KINDS.map(([, s]) => s)) expect(overlapping(make({ segments }))).toBe(false)
    expect(overlapping(make())).toBe(false)
    expect(make().overlap).toBe(false)
  })

  test('are flagged when there are too many to draw apart', () => {
    expect(make({ segments: [seg('forward', 10, 60)], dt: '0.5' }).overlap).toBe(true)
  })
})

describe('at rest', () => {
  test('one dot per stop, labeled with its time range', () => {
    const f = make({ labels: 'times' })
    const stop = f.dots.at(-1)!
    expect([stop.t0, stop.t1]).toEqual([12, 15])
    expect(stop.v).toBe(0)
    expect(f.dots).toHaveLength(13)
    expect(f.labels.map((l) => l.text)).toContain('12–15 s')
    expect(f.labels[0].text).toBe('t = 0 s')
  })

  test('a stop in the middle, and one at the start, are each one dot', () => {
    const f = make({ segments: [seg('rest', 0, 3), seg('forward', 2, 2), seg('rest', 0, 2), seg('forward', 2, 1)], labels: 'times' })
    const still = f.dots.filter((d) => d.t1 > d.t0)
    expect(still.map((d) => [d.t0, d.t1])).toEqual([
      [0, 3],
      [5, 7],
    ])
    expect(f.labels.map((l) => l.text)).toEqual(['t = 0–3 s', '4 s', '5–7 s', '8 s'])
  })
})

describe('the arrows', () => {
  test('are proportional to |v|, on one scale, and point the way it moves', () => {
    for (const segments of [[seg('faster', 6, 6)], THERE_AND_BACK, mapSettings.defaults.segments]) {
      const f = make({ segments })
      const m = motionOf(segments, 0)
      for (const a of f.arrows) {
        const d = f.dots[a.dot]
        const v = velocityAt(m, d.t0)
        expect(a.v.x1).toBeCloseTo(d.x, 1)
        expect(Math.abs(a.v.x2 - a.v.x1 - v * f.arrowScale)).toBeLessThan(0.5)
        expect(Math.sign(a.v.x2 - a.v.x1)).toBe(Math.sign(v))
      }
      // Ratios match: twice the speed, twice the length.
      const pairs = f.arrows.map((a) => ({ len: Math.abs(a.v.x2 - a.v.x1), v: Math.abs(f.dots[a.dot].v) }))
      for (const p of pairs) for (const q of pairs) expect(Math.abs(p.len * q.v - q.len * p.v) / q.v).toBeLessThan(0.5)
    }
  })

  test('take the later segment’s velocity at a segment end', () => {
    const f = make({ segments: [seg('forward', 4, 3), seg('back', 2, 3)] })
    const turn = f.dots.find((d) => d.t0 === 3)!
    expect(turn.v).toBe(-2)
  })

  test('none at rest, and none at all with dots only', () => {
    const f = make()
    const still = f.dots.filter((d) => d.v === 0).map((d) => f.dots.indexOf(d))
    expect(still.length).toBeGreaterThan(0)
    for (const a of f.arrows) expect(still).not.toContain(a.dot)
    expect(make({ dotsOnly: true }).arrows).toEqual([])
    expect(make({ dotsOnly: true, acceleration: true }).accMarks).toEqual([])
  })

  test('the fastest is about 0.8 of the widest spacing, when nothing slows to a stop', () => {
    const f = make({ segments: [seg('forward', 3, 4), seg('back', 3, 4)] })
    const gaps = f.dots.slice(1).flatMap((d, i) => (d.run === f.dots[i].run ? [Math.abs(d.x - f.dots[i].x)] : []))
    const widest = Math.max(...gaps)
    const longest = Math.max(...f.arrows.map((a) => Math.abs(a.v.x2 - a.v.x1)))
    expect(longest / widest).toBeCloseTo(0.8, 2)
  })

  test('never reach the next dot', () => {
    for (const segments of [mapSettings.defaults.segments, THERE_AND_BACK, [seg('faster', 6, 6)], [seg('forward', 5, 1), seg('slower', 0, 5)]]) {
      const f = make({ segments })
      for (const a of f.arrows) {
        const d = f.dots[a.dot]
        const ahead = f.dots.filter((o) => o.run === d.run && (o.x - d.x) * Math.sign(d.v) > 0.5)
        if (!ahead.length) continue
        const next = Math.min(...ahead.map((o) => Math.abs(o.x - d.x)))
        expect(Math.abs(a.v.x2 - a.v.x1)).toBeLessThan(next)
      }
    }
  })
})

describe('the runs', () => {
  test('a motion that turns back starts a new run, on a line above, and no two dots overlap', () => {
    const f = make({ segments: THERE_AND_BACK })
    const runs = [...new Set(f.dots.map((d) => d.run))]
    expect(runs).toEqual([0, 1])
    const y = (run: number) => f.dots.find((d) => d.run === run)!.y
    expect(y(1)).toBeLessThan(y(0))
    for (const run of runs) expect(new Set(f.dots.filter((d) => d.run === run).map((d) => d.y)).size).toBe(1)
    // Out on the first run, back on the second.
    expect(f.dots.filter((d) => d.run === 0).every((d) => d.v >= 0)).toBe(true)
    expect(f.dots.filter((d) => d.run === 1).every((d) => d.v <= 0)).toBe(true)
    expect(overlapping(f)).toBe(false)
  })

  test('there and back and there again is three runs, with room between them', () => {
    const f = make({ segments: [seg('forward', 3, 4), seg('back', 3, 4), seg('forward', 3, 4)], labels: 'times', acceleration: true })
    const ys = [0, 1, 2].map((run) => f.dots.find((d) => d.run === run)!.y)
    expect(ys[1]).toBeLessThan(ys[0])
    expect(ys[2]).toBeLessThan(ys[1])
    // A row's arrows and acceleration marks clear the labels under the row above.
    for (const run of [0, 1]) {
      const labelsAbove = f.labels.filter((l) => Math.abs(l.y - (ys[run + 1] + 20)) < 30)
      const topOfRun = Math.min(...f.accMarks.map((a) => a.labelAt.y).filter((y) => y < ys[run] && y > ys[run + 1]))
      for (const l of labelsAbove) expect(l.y).toBeLessThan(topOfRun)
    }
  })

  test('stay one run while it carries on the same way, through a stop', () => {
    const f = make({ segments: [seg('forward', 2, 2), seg('rest', 0, 2), seg('forward', 2, 2)] })
    expect(new Set(f.dots.map((d) => d.run))).toEqual(new Set([0]))
  })
})

describe('letters', () => {
  test('at the segment ends match the Motion Graph’s, on the dots at those times', () => {
    for (const segments of [mapSettings.defaults.segments, THERE_AND_BACK]) {
      const f = make({ segments, labels: 'ends' })
      const graph = buildMotion({ ...motionSettings.defaults, segments, letters: true })
      const graphLetters = graph.panels[0].letters.map((l) => l.text)
      // A dot at rest across two ends reads D–E. (Labels come run by run, so sorted.)
      const mapLetters = f.labels.flatMap((l) => {
        const [a, b = a] = l.text.split('–')
        return Array.from({ length: b.charCodeAt(0) - a.charCodeAt(0) + 1 }, (_, i) => String.fromCharCode(a.charCodeAt(0) + i))
      })
      expect(mapLetters.sort()).toEqual(graphLetters)
      const m = motionOf(segments, 0)
      const ends = [...m.pieces.map((p) => p.t0), m.end]
      for (const l of f.labels) {
        const i = l.text.charCodeAt(0) - 65
        const dot = f.dots.find((d) => d.t0 <= ends[i] + 1e-9 && ends[i] <= d.t1 + 1e-9)!
        expect(Math.abs(dot.x - xOf(f, positionAt(m, ends[i])))).toBeLessThan(0.5)
        expect(letterOf(i)).toBe(l.text[0])
      }
    }
  })

  test('on every dot run A, B, C… one per dot', () => {
    const f = make({ labels: 'letters' })
    expect(f.labels.map((l) => l.text)).toEqual(f.dots.map((_, i) => letterOf(i)))
  })
})

describe('durations off the Δt grid', () => {
  test('still sample exactly, and are flagged for the settings panel', () => {
    const segments = [seg('faster', 3, 2.5), seg('slower', 0, 1.7)]
    const f = make({ segments, labels: 'ends' })
    const m = motionOf(segments, 0)
    expect(f.samples.map((p) => p.t)).toEqual([0, 1, 2, 3, 4])
    for (const p of f.samples) expect(p.x).toBeCloseTo(positionAt(m, p.t), 9)
    expect(f.offGrid).toEqual([2.5, 4.2])
    // Only A has a dot; B and C fall between dots.
    expect(f.labels.map((l) => l.text)).toEqual(['A'])
    expect(make({ segments, dt: '0.5' }).offGrid).toEqual([4.2])
    expect(make().offGrid).toEqual([])
  })
})

describe('the number line', () => {
  test('is fitted to the motion in round steps, numbered unless hidden', () => {
    const f = make()
    expect(f.range).toEqual({ from: 0, to: 35, step: 5 })
    expect(f.numbers.map((n) => n.text)).toEqual(['0', '5', '10', '15', '20', '25', '30', '35'])
    const bare = make({ numbers: false })
    expect(bare.numbers).toEqual([])
    expect(bare.ticks).toEqual([])
  })

  test('takes in negative positions, and 0 for the origin', () => {
    const f = make({ segments: [seg('back', 3, 4)], start: 30 })
    expect(f.range.from).toBeLessThanOrEqual(18)
    expect(f.range.from).toBeGreaterThan(0)
    const o = make({ segments: [seg('back', 3, 4)], start: 30, origin: true })
    expect(o.range.from).toBe(0)
    expect(o.origin!.x1).toBeCloseTo(xOf(o, 0), 1)
    expect(from('start=-10&segments=back,2,3').numbers[0].text).toBe('−16')
  })
})

describe('the total displacement and answer key', () => {
  test('an arrow under the line from where it starts to where it ends', () => {
    const f = make({ displacement: true, segments: THERE_AND_BACK })
    const m = motionOf(THERE_AND_BACK, 0)
    expect(f.displacement!.v.x1).toBeCloseTo(xOf(f, 0), 1)
    expect(f.displacement!.v.x2).toBeCloseTo(xOf(f, m.pieces.at(-1)!.x1), 1)
    expect(f.displacement!.v.y1).toBeGreaterThan(f.line.y1)
    expect(make({ displacement: true, segments: [seg('forward', 2, 2), seg('back', 2, 2)] }).displacement).toBeNull()
  })

  test('lists each segment, then the displacement and distance traveled', () => {
    expect(mapAnswer({ segments: THERE_AND_BACK, start: 0 }).slice(-2)).toEqual(['Total displacement: 12 m', 'Distance traveled: 28 m'])
    expect(mapAnswer(mapSettings.defaults)[0]).toBe('A to B (0–4 s): speeding up from 0 to 4 m/s, a = 1 m/s²; 0 m to 8 m')
  })
})

describe('acceleration', () => {
  test('one mark per segment, pointing the way a points, or a = 0', () => {
    const f = make({ acceleration: true, segments: THERE_AND_BACK })
    expect(f.accMarks.map((a) => a.piece).sort()).toEqual([0, 1, 2, 3, 4])
    const way = (j: number) => {
      const a = f.accMarks.find((k) => k.piece === j)!.arrow
      return a ? Math.sign(a.x2 - a.x1) : 0
    }
    expect([0, 1, 2, 3, 4].map(way)).toEqual([1, 0, -1, -1, 1])
    // Each above its own run's dots.
    const backRun = f.dots.find((d) => d.run === 1)!.y
    expect(f.accMarks.find((k) => k.piece === 3)!.labelAt.y).toBeLessThan(backRun)
  })
})
