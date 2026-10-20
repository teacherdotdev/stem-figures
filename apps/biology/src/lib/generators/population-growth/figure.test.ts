import { describe, expect, it } from 'vitest'
import { crosses, textWidth } from '$shared/graph/labels'
import { buildPopulation, numberBox, type Panel } from './figure'
import { fitAxes, niceRange } from './fit'
import { MODELS } from './growth'
import { GRAPH_IDS, populationSettings, type PopulationSettings } from './settings'
import { SETUPS, settingsFor } from './setups'

const read = (query: string) => populationSettings.fromParams(new URLSearchParams(query))
/** Settings from a query, with the axes fitted the way the page fits them. */
const fitted = (query: string) => {
  const s = read(query)
  return { ...s, ...fitAxes(s) } as PopulationSettings
}
const build = (query: string) => buildPopulation(fitted(query))

const overlap = (a: { x0: number; y0: number; x1: number; y1: number }, b: typeof a) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
/** The space a label takes as drawn: its letters, descenders and white outline. */
const boxOf = (l: Panel['labels'][number], fs: number) => {
  const w = l.text ? textWidth(l.text, fs) : l.blank ? Math.hypot(l.blank.x2 - l.blank.x1, l.blank.y2 - l.blank.y1) : 0
  if (l.rotate) {
    // Turned to read upward: hung from its end, or standing on its start.
    const y0 = l.anchor === 'start' ? l.y - w : l.y
    return { x0: l.x - fs * 0.78, y0, x1: l.x + fs * 0.3, y1: y0 + w }
  }
  const x0 = l.anchor === 'start' ? l.x : l.anchor === 'end' ? l.x - w : l.x - w / 2
  return { x0, y0: l.y - fs * 0.78, x1: x0 + w, y1: l.y + fs * 0.3 }
}
/** The straight pieces of a drawn path ("M1,2L3,4…"). */
const segmentsOf = (d: string) => {
  const pts = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
  return pts.slice(1).map((b, k) => ({ x1: pts[k].x, y1: pts[k].y, x2: b.x, y2: b.y }))
}

describe('round axis ranges', () => {
  it('counts in 1s, 2s, 2.5s (as 25s) and 5s, close to the squares wanted', () => {
    expect(niceRange(0, 20, 20)).toMatchObject({ from: '0', to: '20', step: '1' })
    expect(niceRange(0, 1100, 10)).toMatchObject({ to: '1100', step: '100' })
    expect(niceRange(0, 0.58, 10)).toMatchObject({ to: '0.6', step: '0.05' })
    expect(niceRange(-130, 260, 8)).toMatchObject({ from: '-150', step: '50' })
  })
})

describe('a population growth figure', () => {
  it('has defaults whose axes are already fitted', () => {
    const s = populationSettings.defaults
    expect(fitAxes(s)).toMatchObject({ xFrom: s.xFrom, xTo: s.xTo, xStep: s.xStep, yFrom: s.yFrom, yTo: s.yTo, yStep: s.yStep, xEvery: s.xEvery, yEvery: s.yEvery })
  })

  it('draws the default logistic curve with its carrying capacity labeled', () => {
    const g = build('')
    expect(g.panels).toHaveLength(1)
    const [p] = g.panels
    expect(p.curves).toHaveLength(1)
    expect(p.refs).toHaveLength(1)
    expect(p.labels.map((l) => l.text)).toEqual(['Carrying capacity (K)'])
  })

  it('draws both curves, the exponential one dashed, each labeled', () => {
    const [p] = build('model=both').panels
    expect(p.curves.map((c) => !!c.dash)).toEqual([false, true])
    expect(p.labels.map((l) => l.text)).toEqual(['Carrying capacity (K)', 'Logistic growth', 'Exponential growth'])
  })

  it('stacks two graphs on the same x-axis, the title only on the bottom one', () => {
    const g = build('graphs=size-rate')
    expect(g.panels).toHaveLength(2)
    const [a, b] = g.panels
    expect(a.at.x + a.layout.grid.x).toBe(b.at.x + b.layout.grid.x)
    expect(b.at.y).toBeGreaterThanOrEqual(a.at.y + a.layout.height)
    expect(a.layout.labels.map((l) => l.text)).not.toContain('Time (years)')
    expect(b.layout.labels.map((l) => l.text)).toContain('Time (years)')
  })

  it('marks the inflection point at K/2, and the growth rate’s peak below it', () => {
    const g = build('graphs=size-rate&inflection=1')
    const [a, b] = g.panels
    expect(a.dots).toHaveLength(1)
    expect(b.dots).toHaveLength(1)
    expect(a.at.x + a.dots[0].x).toBeCloseTo(b.at.x + b.dots[0].x, 6)
    expect(a.labels.map((l) => l.text)).toContain('Inflection point (N = K/2)')
    expect(b.labels.map((l) => l.text)).toContain('Fastest growth (N = K/2)')
  })

  it('brackets the phases above the graph and runs their edges down it', () => {
    const g = build('phases=1')
    expect(g.brackets).toHaveLength(3)
    expect(g.bandLabels.map((l) => l.text)).toEqual(['Lag phase', 'Exponential phase', 'Stationary phase'])
    expect(g.panels[0].edges).toHaveLength(2)
    // Blank, a phase is a line for students to write on.
    expect(build('phases=1&statLabelMode=blank').bandLabels[2].blank).toBeDefined()
  })

  it('graphs the rates against N as the equations: a hump and a falling line', () => {
    const g = build('graphs=rate-percapita-n&kLine=1')
    expect(g.panels.map((p) => p.view)).toEqual(['rate', 'percapita'])
    // K is up the graph, against N.
    for (const p of g.panels) expect(p.refs[0].x1).toBe(p.refs[0].x2)
  })

  it('puts census points on the curve, and lists them in a table', () => {
    const g = build('census=1&censusEvery=2&table=1')
    expect(g.panels[0].points).toHaveLength(11)
    expect(g.table?.rows).toHaveLength(22)
    expect(g.width).toBeGreaterThan(g.table!.x)
  })

  it('leaves the axes blank for students to draw on', () => {
    const [p] = build('curve=0').panels
    expect(p.curves).toEqual([])
    expect(p.refs).toHaveLength(1)
  })

  it('says what can’t make a curve, and draws none', () => {
    const g = build('n0=0.0001&model=crash&k=0.0001')
    expect(g.problems.k).toBeTruthy()
    expect(g.panels[0].curves).toEqual([])
  })

  it('keeps every label inside its grid, off the numbers, lines, curves and other labels', () => {
    // Every default setup, and every model on every kind of graph, with
    // everything marked, at medium and large labels.
    const cases: [string, PopulationSettings][] = SETUPS.map((setup) => [setup.id, settingsFor(setup, populationSettings.defaults, populationSettings.defaults)])
    for (const model of MODELS)
      for (const graphs of GRAPH_IDS) cases.push([`${model} ${graphs}`, { ...populationSettings.defaults, model, graphs }])
    for (const [name, base] of cases) {
      for (const labelSize of ['medium', 'large'] as const) {
        const all = populationSettings.tidy({ ...base, inflection: true, phases: true, kLine: true, labelSize })
        const g = buildPopulation(populationSettings.tidy({ ...all, ...fitAxes(all) }))
        for (const p of g.panels) {
          const where = `${name}, ${labelSize}, ${p.view}`
          const boxes = p.labels.map((l) => boxOf(l, g.labelFs))
          const { x, y, w, h } = p.layout.grid
          const numbers = p.layout.numbers.map((n) => numberBox(n, g.fs))
          const lines = [...p.refs, ...p.curves.flatMap((c) => segmentsOf(c.d))]
          boxes.forEach((b, i) => {
            const what = `${where}: “${p.labels[i].text ?? 'blank'}”`
            expect(b.x0 >= x + 2 && b.x1 <= x + w - 2 && b.y0 >= y + 2 && b.y1 <= y + h - 2, `${what} inside the grid`).toBe(true)
            for (const n of numbers) expect(overlap(b, n), `${what} off the numbers`).toBe(false)
            for (const l of lines) expect(crosses(l, b), `${what} off the lines`).toBe(false)
            for (const other of boxes.slice(i + 1)) expect(overlap(b, other), `${what} off the other labels`).toBe(false)
          })
        }
      }
    }
  })

  it('keeps every curve inside its grid', () => {
    for (const q of ['model=exponential&yTo=500', 'model=both', 'model=overshoot&graphs=rate', 'model=crash&graphs=percapita-n']) {
      const g = buildPopulation(fitted(q))
      for (const p of g.panels) {
        const d = p.curves.map((c) => c.d).join(' ')
        expect(d, q).not.toBe('')
        const nums = d.match(/-?[\d.]+/g)!.map(Number)
        const xs = nums.filter((_, i) => i % 2 === 0)
        const ys = nums.filter((_, i) => i % 2 === 1)
        const { x, y, w, h } = p.layout.grid
        expect(Math.min(...xs)).toBeGreaterThanOrEqual(x - 0.01)
        expect(Math.max(...xs)).toBeLessThanOrEqual(x + w + 0.01)
        expect(Math.min(...ys)).toBeGreaterThanOrEqual(y - 0.01)
        expect(Math.max(...ys)).toBeLessThanOrEqual(y + h + 0.01)
      }
    }
  })
})
