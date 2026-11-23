import { describe, expect, it } from 'vitest'
import { CELL } from '$shared/graph/grid'
import { answerLines, buildRateLaw, dataOf, dataText, fitExact, fitFrom0, fitNear, labelOf, scatterProblem, timeAxis, timeProblem, type Panel } from './figure'
import { concentration } from './kinetics'
import { axisTitles, kForOrder, rateLawSettings } from './settings'

const settings = (query: string) => rateLawSettings.fromParams(new URLSearchParams(query))
const build = (query: string) => buildRateLaw(settings(query))
const problemsOf = (query: string) => Object.values(build(query).problems).filter(Boolean)

/** A panel's axis ranges, read back from its layout: [from, to] for x and y. */
function rangesOf(p: Panel) {
  const xs = p.layout.numbers.filter((n) => n.anchor === 'middle' || n.y > p.layout.grid.y + p.layout.grid.h).map((n) => Number(n.text.replace('−', '-')))
  return { blocksX: p.layout.vLines.length - 1, blocksY: p.layout.hLines.length - 1, lastX: Math.max(...xs) }
}

/** Where a value sits up a panel's grid, given the y-axis's numbers. */
function yNumbers(p: Panel) {
  return p.layout.numbers.filter((n) => n.anchor === 'end' && n.y < p.layout.grid.y + p.layout.grid.h + 6).map((n) => Number(n.text.replace('−', '-')))
}

/** The points of a drawn path. */
const pathPoints = (d: string) => d.slice(1).split('L').map((pair) => pair.split(',').map(Number))

/** How far a path strays from the straight line between its ends, in drawing units. */
function bend(d: string) {
  const pts = pathPoints(d)
  const [x0, y0] = pts[0]
  const [x1, y1] = pts.at(-1)!
  return Math.max(...pts.map(([x, y]) => Math.abs(y - (y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)))))
}

describe('fitting an axis', () => {
  it('fits close to a number of squares, in round steps from a round start', () => {
    expect(fitNear(0, 115.1, 6)).toEqual({ start: 0, step: 20, blocks: 6 })
    expect(fitNear(0, 115.1, 10)).toEqual({ start: 0, step: 10, blocks: 12 })
    expect(fitNear(0, 1, 8)).toEqual({ start: 0, step: 0.1, blocks: 10 })
    expect(fitNear(0, 450, 10)).toEqual({ start: 0, step: 50, blocks: 9 })
    expect(fitNear(-2.4, 0, 8)).toEqual({ start: -2.5, step: 0.25, blocks: 10 })
  })

  it('fits exactly a number of squares, from the bottom or down from the top', () => {
    expect(fitExact(0, 1, 6)).toEqual({ start: 0, step: 0.2, blocks: 6 })
    expect(fitExact(0, 10, 6)).toEqual({ start: 0, step: 2, blocks: 6 })
    expect(fitExact(-2.4, 0, 6, 'high')).toEqual({ start: -3, step: 0.5, blocks: 6 })
    // [A]₀ = 0.05 M: ln[A] from −3.0 down to −5.4.
    expect(fitExact(-5.39, -2.996, 6, 'high')).toEqual({ start: -5.5, step: 0.5, blocks: 6 })
    for (const [low, high] of [[0, 0.0013], [0, 37], [-7.2, -4.6], [0, 99999], [3.2, 3.9]]) {
      for (const from of ['low', 'high'] as const) {
        const r = fitExact(low, high, 6, from)
        expect(r.blocks).toBe(6)
        expect(r.start).toBeLessThanOrEqual(low + 1e-9)
        expect(r.start + 6 * r.step).toBeGreaterThanOrEqual(high - 1e-9)
        // The step under it wouldn't have covered it: more than half the grid is used.
        expect(high - low).toBeGreaterThan(r.step * 6 * 0.3)
      }
    }
  })
})

describe('fitting the time axis of graphs in a row', () => {
  it('takes 5 to 8 squares from 0, ending nearest the data', () => {
    expect(fitFrom0(115.1, 5, 8, 6)).toEqual({ start: 0, step: 20, blocks: 6 })
    expect(fitFrom0(90, 5, 8, 6)).toEqual({ start: 0, step: 20, blocks: 5 })
    expect(fitFrom0(450, 5, 8, 6)).toEqual({ start: 0, step: 100, blocks: 5 })
    // ln 10 / 0.003 = 768 s: 8 squares of 100, not 4 of 200.
    expect(fitFrom0(767.5, 5, 8, 6)).toEqual({ start: 0, step: 100, blocks: 8 })
    expect(timeAxis(settings('a0=0.05&k=0.003'))).toEqual({ start: 0, step: 100, blocks: 8 })
    for (const high of [0.0013, 1, 37, 99, 101, 333, 5000, 77777]) {
      const r = fitFrom0(high, 5, 8, 6)
      expect(r.blocks, String(high)).toBeGreaterThanOrEqual(5)
      expect(r.blocks, String(high)).toBeLessThanOrEqual(8)
      expect(r.blocks * r.step).toBeGreaterThanOrEqual(high)
    }
  })
})

describe('rate law graphs', () => {
  it('draws [A], ln[A] and 1/[A] against time side by side, each 6 squares tall on one time axis', () => {
    const g = build('')
    expect(g.panels.map((p) => p.plot)).toEqual(['conc', 'ln', 'inv'])
    for (const p of g.panels) {
      expect(rangesOf(p)).toMatchObject({ blocksX: 6, blocksY: 6, lastX: 120 })
      expect(p.paths).toHaveLength(1)
      expect(p.points).toHaveLength(0)
      expect(p.layout.labels.find((l) => !l.rotate)?.text).toBe('Time (s)')
    }
    expect(g.panels.map((p) => p.layout.labels.find((l) => l.rotate)?.text)).toEqual(['[A] (M)', 'ln[A]', '1/[A] (M⁻¹)'])
    // Side by side, not overlapping, tops level.
    expect(g.panels[1].at.x).toBeGreaterThanOrEqual(g.panels[0].at.x + g.panels[0].layout.width)
    expect(g.panels[2].at.x).toBeGreaterThanOrEqual(g.panels[1].at.x + g.panels[1].layout.width)
    expect(new Set(g.panels.map((p) => p.at.y + p.layout.grid.y)).size).toBe(1)
    expect(g.width).toBeGreaterThanOrEqual(g.panels[2].at.x + g.panels[2].layout.width - 0.01)
    expect(g.table).toBeNull()
    expect(problemsOf('')).toEqual([])
  })

  it('draws one graph alone, about 10 squares by 8', () => {
    for (const graphs of ['conc', 'ln', 'inv']) {
      const g = build(`graphs=${graphs}`)
      expect(g.panels.map((p) => p.plot)).toEqual([graphs])
      const r = rangesOf(g.panels[0])
      expect(r.blocksX).toBeGreaterThanOrEqual(8)
      expect(r.blocksX).toBeLessThanOrEqual(13)
      expect(r.blocksY).toBeGreaterThanOrEqual(6)
      expect(r.blocksY).toBeLessThanOrEqual(11)
    }
  })

  it('draws only the right graph as a straight line, for each order', () => {
    const straight = { '0': 'conc', '1': 'ln', '2': 'inv' }
    for (const order of ['0', '1', '2'] as const) {
      for (const p of build(`order=${order}`).panels) {
        const off = bend(p.paths[0])
        if (p.plot === straight[order]) expect(off, `order ${order} ${p.plot}`).toBeLessThan(0.02)
        else expect(off, `order ${order} ${p.plot}`).toBeGreaterThan(8)
      }
    }
  })

  it('runs the time axis until a tenth of [A]₀ is left, rounded up', () => {
    // 0.9[A]₀/k = 90 s, ln 10/k = 115 s, 9/(k[A]₀) = 450 s.
    expect(timeAxis(settings('order=0&k=0.01&graphs=conc'))).toEqual({ start: 0, step: 10, blocks: 9 })
    expect(timeAxis(settings('graphs=conc'))).toEqual({ start: 0, step: 10, blocks: 12 })
    expect(timeAxis(settings('order=2&graphs=conc'))).toEqual({ start: 0, step: 50, blocks: 9 })
    for (const query of ['order=0&k=0.013', 'k=3.3', 'order=2&a0=0.07&k=41', 'order=0&a0=100&k=0.000001', 'order=2&a0=0.001&k=1000000']) {
      for (const graphs of ['all', 'conc']) {
        const s = settings(`${query}&graphs=${graphs}`)
        const axis = timeAxis(s)
        const until = axis.blocks * axis.step
        expect(concentration(Number(s.order) as 0 | 1 | 2, s.a0, s.k, until), query).toBeLessThanOrEqual(s.a0 * 0.1 * (1 + 1e-9))
        // Only, at the far ends of k, a word about the long numbers along the time axis.
        const { time, ...problems } = buildRateLaw(s).problems
        expect(Object.values(problems).filter(Boolean), query).toEqual([])
        expect(time === null || /long numbers/.test(time), query).toBe(true)
      }
    }
  })

  it('suggests another time unit or k when the time axis numbers are long', () => {
    expect(timeProblem(settings(''))).toBeNull()
    expect(timeProblem(settings('order=2&a0=0.001&k=1000000'))).toBeNull() // up to 0.009 s
    // 2.3 × 10⁶ s for k = 10⁻⁶ s⁻¹: hours would do, or a larger k.
    expect(timeProblem(settings('k=0.000001'))).toBe('The times along the axis are long numbers (up to 2500000 s). For tidier numbers, choose a longer time unit, or a larger k.')
    expect(timeProblem(settings('k=0.000001&timeUnit=h'))).toMatch(/choose a larger k\.$/)
    expect(timeProblem(settings('k=1000000'))).toMatch(/up to 0\.0000025 s\)\. For tidier numbers, choose a smaller k\.$/)
    expect(timeProblem(settings('k=1000000&timeUnit=min'))).toMatch(/a shorter time unit, or a smaller k\.$/)
  })

  it('starts the [A] curve at [A]₀ on the y-axis and keeps every curve on its grid', () => {
    for (const query of ['', 'order=0&k=0.01', 'order=2', 'a0=0.05', 'order=2&a0=0.05&k=3', 'order=0&a0=2.5&k=0.4', 'graphs=conc', 'graphs=ln&a0=0.05', 'graphs=inv&order=2']) {
      const g = build(query)
      for (const p of g.panels) {
        const area = p.layout.grid
        for (const [x, y] of p.paths.flatMap(pathPoints)) {
          expect(x, query).toBeGreaterThanOrEqual(area.x - 0.01)
          expect(x, query).toBeLessThanOrEqual(area.x + area.w + 0.01)
          expect(y, query).toBeGreaterThanOrEqual(area.y - 0.01)
          expect(y, query).toBeLessThanOrEqual(area.y + area.h + 0.01)
        }
        // It starts on the y-axis, and uses more than a third of the grid's height.
        const pts = p.paths.flatMap(pathPoints)
        expect(pts[0][0], query).toBeCloseTo(area.x, 1)
        const ys = pts.map(([, y]) => y)
        expect(Math.max(...ys) - Math.min(...ys), `${query} ${p.plot}`).toBeGreaterThan(area.h / 3)
      }
    }
  })

  it('numbers ln[A] below zero in steps of 0.5 or 1, as for [A]₀ = 0.05 M', () => {
    const p = build('a0=0.05').panels[1]
    expect(yNumbers(p).sort((a, b) => a - b)).toEqual([-5.5, -5, -4.5, -4, -3.5, -3, -2.5])
    // Its axes stay along the left and bottom edges.
    expect(p.layout.xAxis.y).toBeCloseTo(p.layout.grid.y + p.layout.grid.h, 6)
    expect(p.layout.yAxis.x).toBeCloseTo(p.layout.grid.x, 6)
    const one = build('a0=0.05&graphs=ln').panels[0]
    const numbers = yNumbers(one)
    for (const n of numbers) expect(Math.abs(n * 4 - Math.round(n * 4))).toBeLessThan(1e-9)
    expect(Math.min(...numbers)).toBeLessThanOrEqual(Math.log(0.005))
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(Math.log(0.05))
  })

  it('stops a zero-order reaction’s line where [A] reaches 0, and draws nothing after it', () => {
    // [A]₀/k = 90.9 s on a time axis fitted to 100 s.
    const s = settings('order=0&k=0.011')
    expect(timeAxis(s)).toEqual({ start: 0, step: 20, blocks: 5 })
    const g = buildRateLaw(s)
    const endX = (p: Panel) => p.layout.grid.x + (1 / 0.011 / 20) * CELL
    for (const p of g.panels) {
      const xs = p.paths.flatMap(pathPoints).map(([x]) => x)
      expect(Math.max(...xs)).toBeLessThanOrEqual(endX(p) + 0.01)
    }
    const conc = g.panels[0]
    const last = pathPoints(conc.paths[0]).at(-1)!
    expect(last[0]).toBeCloseTo(endX(conc), 1)
    expect(last[1]).toBeCloseTo(conc.layout.grid.y + conc.layout.grid.h, 1)
    // No data past the end either.
    expect(Math.max(...dataOf(settings('order=0&k=0.011&points=1&count=10')).map((p) => p.t))).toBeLessThanOrEqual(1 / 0.011)
  })

  it('never says the order on the figure', () => {
    for (const order of ['0', '1', '2']) {
      const s = settings(`order=${order}&table=all&guides=2`)
      const g = buildRateLaw(s)
      const words = [labelOf(s), ...g.panels.flatMap((p) => [p.label, ...p.layout.labels.map((l) => l.text), ...p.guideLabels.map((l) => l.text ?? '')]), ...g.table!.rows.map((r) => r.head)]
      for (const w of words) expect(w).not.toMatch(/order|zero|first|second|rate/i)
    }
    expect(labelOf(settings(''))).toBe('Graphs of [A], ln[A] and 1/[A] against time')
    expect(labelOf(settings('graphs=inv&species=NO2'))).toBe('Graph of 1/[NO₂] against time')
    expect(labelOf(settings('titleMode=text&title=Run 3'))).toBe('Run 3: graphs of [A], ln[A] and 1/[A] against time')
    // The data table, which can't be read from the picture, is read out.
    expect(labelOf(settings('table=conc&count=5'))).toBe(
      'Graphs of [A], ln[A] and 1/[A] against time. Data table. Time (s): 0, 30, 60, 90, 120. [A] (M): 1.00, 0.549, 0.301, 0.165, 0.0907',
    )
    expect(labelOf(settings('table=all&count=5&graphs=ln'))).toMatch(/^Graph of ln\[A\] against time\. Data table\. Time \(s\): .*\. ln\[A\]: 0\.000, −0\.600, .*\. 1\/\[A\] \(M⁻¹\): 1\.00, /)
  })
})

describe('titles', () => {
  it('follow the species and units, digits lowered', () => {
    expect(axisTitles(settings('species=N2O5&concUnit=mol/L&timeUnit=min'))).toEqual({
      time: 'Time (min)', conc: '[N₂O₅] (mol/L)', ln: 'ln[N₂O₅]', inv: '1/[N₂O₅] (L/mol)',
    })
    expect(axisTitles(settings('concUnit=mol dm⁻³')).inv).toBe('1/[A] (dm³ mol⁻¹)')
    expect(axisTitles(settings('species=')).conc).toBe('[A] (M)')
  })

  it('are the teacher’s own words when typed, a blank line or nothing', () => {
    const g = build('lnTitle=Natural log of concentration&concTitleMode=blank&invTitleMode=none&timeTitle=t / s')
    const yTitle = (i: number) => g.panels[i].layout.labels.find((l) => l.rotate)?.text
    expect([yTitle(0), yTitle(1), yTitle(2)]).toEqual([undefined, 'Natural log of concentration', undefined])
    expect(g.panels[0].layout.blanks).toHaveLength(1)
    expect(g.panels[2].layout.blanks).toHaveLength(0)
    expect(g.panels[0].layout.labels.find((l) => !l.rotate)?.text).toBe('t / s')
  })

  it('puts a chart title across the top, moving the graphs down', () => {
    const plain = build('')
    const g = build('titleMode=text&title=Decomposition of N₂O₅')
    expect(g.chartTitle?.text).toBe('Decomposition of N₂O₅')
    expect(g.panels[0].at.y).toBeGreaterThan(plain.panels[0].at.y)
    expect(g.height).toBeGreaterThan(plain.height)
    expect(build('titleMode=blank').chartBlank).not.toBeNull()
    // Text mode with nothing typed is no title.
    expect(build('titleMode=text').height).toBe(plain.height)
  })
})

describe('data points and the table', () => {
  it('plots the points on every graph, on the curve when there is no scatter', () => {
    const g = build('points=1')
    for (const p of g.panels) {
      expect(p.points).toHaveLength(8)
      const curve = pathPoints(p.paths[0])
      for (const q of p.points) {
        const near = Math.min(...curve.map(([x, y]) => Math.hypot(x - q.x, y - q.y)))
        // Rounding to three significant figures moves them less than a pixel or so.
        expect(near).toBeLessThan(1.5)
      }
    }
  })

  it('leaves only the points, or empty grids, without the curve', () => {
    const g = build('curve=0&points=1&count=6')
    for (const p of g.panels) {
      expect(p.paths).toHaveLength(0)
      expect(p.points).toHaveLength(6)
    }
    for (const p of build('curve=0&table=conc').panels) expect([p.paths.length, p.points.length]).toEqual([0, 0])
  })

  it('keeps scattered points on the grid, and the default seed’s data pointing to the right order', () => {
    for (const order of ['0', '1', '2'] as const) {
      for (const noise of ['1', '2', '5']) {
        const query = `order=${order}&points=1&noise=${noise}&curve=0`
        const s = settings(query)
        const g = buildRateLaw(s)
        const data = dataOf(s)
        for (const p of g.panels) expect(p.points.length, query).toBe(data.filter((d) => d[p.plot] !== null).length)
        expect(g.problems.scatter, query).toBeNull()
      }
    }
  })

  it('warns when scatter makes another graph’s points straighter', () => {
    // Data from a second-order reaction, read as a first-order one's.
    const s = settings('points=1&noise=5')
    const wrong = dataOf(settings('order=2&points=1'))
    expect(scatterProblem(s, wrong)).toMatch(/1\/\[A\] points lie closer to a straight line than the ln\[A\] points.*New data/)
    expect(scatterProblem(s, dataOf(s))).toBeNull()
    // With no scatter, or no data on the figure, there's nothing to warn about.
    expect(scatterProblem(settings('points=1'), wrong)).toBeNull()
    expect(scatterProblem(settings('noise=5'), wrong)).toBeNull()
  })

  it('runs long enough that 5% scatter doesn’t hide the order, whatever the seed', () => {
    for (const order of ['0', '1', '2']) {
      for (let seed = 1; seed <= 200; seed++) {
        const query = `order=${order}&points=1&noise=5&count=5&seed=${seed}`
        expect(build(query).problems.scatter, query).toBeNull()
      }
    }
  })

  it('lists the data under the graphs, time across the top', () => {
    const g = build('table=conc')
    expect(g.table!.rows.map((r) => r.head)).toEqual(['Time (s)', '[A] (M)'])
    expect(g.table!.rows[0].cells).toEqual(['0', '15', '30', '45', '60', '75', '90', '105'])
    expect(g.table!.rows[1].cells).toEqual(['1.00', '0.741', '0.549', '0.407', '0.301', '0.223', '0.165', '0.122'])
    const bottom = Math.max(...g.panels.map((p) => p.at.y + p.layout.height))
    expect(g.table!.y).toBeGreaterThanOrEqual(bottom)
    expect(g.height).toBeGreaterThan(g.table!.y + g.table!.h)
    expect(g.table!.x).toBeGreaterThanOrEqual(0)
    expect(g.table!.x + g.table!.w).toBeLessThanOrEqual(g.width)

    const all = build('table=all&species=H2O2&count=5')
    expect(all.table!.rows.map((r) => r.head)).toEqual(['Time (s)', '[H₂O₂] (M)', 'ln[H₂O₂]', '1/[H₂O₂] (M⁻¹)'])
    // ln[A] to three decimal places, as many as [A]'s significant figures.
    expect(all.table!.rows[2].cells).toEqual(['0.000', '−0.600', '−1.201', '−1.802', '−2.400'])
    expect(all.table!.rows[3].cells[0]).toBe('1.00')
    for (const r of all.table!.rows) expect(r.cells).toHaveLength(5)
  })

  it('widens the figure for a table wider than one graph, and centers the graph over it', () => {
    const g = build('graphs=ln&table=all&count=10&species=N2O5&concUnit=mol dm⁻³')
    const p = g.panels[0]
    expect(g.table!.w).toBeGreaterThan(p.layout.width)
    expect(g.width).toBeGreaterThanOrEqual(g.table!.w)
    expect(p.at.x + p.layout.width / 2).toBeCloseTo(g.width / 2, 0)
  })

  it('stops a zero-order reaction’s data when a tenth of [A]₀ is left, so none read [A] = 0', () => {
    // [A]₀/k = 80 s on an axis to 80 s: the data stop by 72 s, 0.9[A]₀/k.
    const g = build('order=0&k=0.0125&table=all&count=5&graphs=conc')
    expect(g.table!.rows[0].cells).toEqual(['0', '18', '36', '54', '72'])
    expect(g.table!.rows[1].cells.at(-1)).toBe('0.100')
    expect(g.table!.rows.flatMap((r) => r.cells)).not.toContain('–')
  })

  it('keeps a zero-order reaction’s ln[A] and 1/[A] axes fitted to a tenth of [A]₀, with every point on them', () => {
    // These once ran a point at [A] = 0.04 or 0.0101 M up to 1/[A] = 25 or 99.
    for (const query of ['order=0&count=9', 'order=0&count=7', 'order=0&k=0.011&count=10&noise=5', 'order=0&k=0.011&count=10']) {
      const g = build(`${query}&points=1&table=all`)
      const [, ln, inv] = g.panels
      expect(Math.max(...yNumbers(inv)), query).toBeLessThanOrEqual(12)
      expect(Math.min(...yNumbers(ln)), query).toBeGreaterThanOrEqual(-3)
      for (const p of g.panels) expect(p.points, `${query} ${p.plot}`).toHaveLength(g.data.length)
    }
  })

  it('copies the same values as tab-separated text', () => {
    const lines = dataText(settings('count=5')).split('\n')
    expect(lines).toHaveLength(4)
    expect(lines[0]).toBe('Time (s)\t0\t30\t60\t90\t120')
    expect(lines[1].split('\t')).toEqual(['[A] (M)', '1.00', '0.549', '0.301', '0.165', '0.0907'])
  })
})

describe('guide lines', () => {
  it('run from [A]₀/2, [A]₀/4 and [A]₀/8 to the curve and down, on the [A] graph only', () => {
    const g = build('guides=3')
    const [conc, ln, inv] = g.panels
    expect(conc.guides).toHaveLength(6)
    expect(ln.guides).toHaveLength(0)
    expect(inv.guides).toHaveLength(0)
    const area = conc.layout.grid
    // On a 0 to 1.2 M by 0 to 120 s grid: the first corner at 34.7 s, 0.5 M.
    expect(conc.guides[0]).toMatchObject({ x1: area.x, x2: Number((area.x + (34.657 / 20) * CELL).toFixed(2)) })
    expect(conc.guides[0].y1).toBeCloseTo(area.y + area.h - (0.5 / 0.2) * CELL, 1)
    expect(conc.guides[1].y2).toBeCloseTo(area.y + area.h, 1)
    expect(conc.guideLabels.map((l) => l.text)).toEqual(['34.7 s', '69.3 s', '104 s'])
    expect(g.problems.guides ?? null).toBeNull()
    expect(build('guides=3&graphs=ln').panels[0].guides).toHaveLength(0)
  })

  it('fit for every order: three half-lives are over before a tenth is left', () => {
    for (const query of ['order=0&k=0.01', '', 'order=2', 'order=2&a0=0.3&k=1.7&graphs=conc', 'order=0&a0=4&k=0.3&graphs=conc']) {
      const g = build(`${query}&guides=3`)
      expect(g.panels[0].guides, query).toHaveLength(6)
      expect(g.problems.guides ?? null, query).toBeNull()
    }
    expect(build('order=0&k=0.01&guides=3&graphs=conc').panels[0].guideLabels.map((l) => l.text)).toEqual(['50 s', '75 s', '87.5 s'])
    expect(build('order=2&guides=3&graphs=conc').panels[0].guideLabels.map((l) => l.text)).toEqual(['50 s', '150 s', '350 s'])
  })

  it('are labeled with times, half-lives, blank lines or nothing, inside the grid and apart', () => {
    expect(build('guides=2&guideLabels=halves&graphs=conc').panels[0].guideLabels.map((l) => l.text)).toEqual(['1 half-life', '2 half-lives'])
    const blank = build('guides=2&guideLabels=blank&graphs=conc').panels[0].guideLabels
    expect(blank.every((l) => l.blank && !l.text)).toBe(true)
    // Each label right of its own line where there's room, not between two.
    const right = build('graphs=conc&order=2&guides=3').panels[0]
    right.guideLabels.forEach((l, i) => expect(l.anchor, String(i)).toBe('start'))
    expect(build('guides=2&guideLabels=none').panels[0].guideLabels).toHaveLength(0)
    for (const query of ['guides=3&graphs=conc', 'guides=3', 'order=0&k=0.01&guides=3&graphs=conc', 'order=2&guides=3&timeUnit=min']) {
      const p = build(query).panels[0]
      const area = p.layout.grid
      for (const l of p.guideLabels) {
        expect(l.x, query).toBeGreaterThan(area.x)
        expect(l.x, query).toBeLessThan(area.x + area.w)
        expect(l.y, query).toBeGreaterThan(area.y)
        expect(l.y, query).toBeLessThan(area.y + area.h)
      }
    }
  })
})

describe('crowded guide line labels', () => {
  it('are said on the page, with what to do', () => {
    expect(build('guides=3&graphs=conc').problems.labels ?? null).toBeNull()
    expect(build('guides=2').problems.labels ?? null).toBeNull()
    expect(build('guides=3&guideLabels=halves').problems.labels).toMatch(/graph this small.*Show the \[A\] graph alone/)
    expect(build('guides=3&guideLabels=none').problems.labels ?? null).toBeNull()
  })
})

describe('the answer key', () => {
  it('says the order, the laws, k with its unit, the straight graph and the half-life', () => {
    expect(answerLines(settings(''))).toEqual([
      'First order: rate = k[A]',
      'Integrated rate law: ln[A] = ln[A]₀ − kt',
      'k = 0.02 s⁻¹',
      'Straight graph: ln[A] against time, slope −k = −0.02 s⁻¹, y-intercept ln[A]₀ = 0.000',
      'Half-life: 34.7 s (the same every time)',
    ])
    expect(answerLines(settings('order=0&k=0.01&a0=0.8&timeUnit=min'))).toEqual([
      'Zero order: rate = k',
      'Integrated rate law: [A] = [A]₀ − kt',
      'k = 0.01 M min⁻¹',
      'Straight graph: [A] against time, slope −k = −0.01 M min⁻¹, y-intercept [A]₀ = 0.800 M',
      'First half-life: 40 min (each one half as long as the last)',
    ])
    expect(answerLines(settings('order=2&a0=0.5&species=NO2&concUnit=mol/L'))).toEqual([
      'Second order: rate = k[NO₂]²',
      'Integrated rate law: 1/[NO₂] = 1/[NO₂]₀ + kt',
      'k = 0.02 L mol⁻¹ s⁻¹',
      'Straight graph: 1/[NO₂] against time, slope k = 0.02 L mol⁻¹ s⁻¹, y-intercept 1/[NO₂]₀ = 2.00 L/mol',
      'First half-life: 100 s (each one twice as long as the last)',
    ])
  })

  it('gives each marked half-life’s time and what is left', () => {
    expect(answerLines(settings('order=2&guides=3')).slice(5)).toEqual([
      'After 1 half-life (50 s): 0.500 M',
      'After 2 half-lives (150 s): 0.250 M',
      'After 3 half-lives (350 s): 0.125 M',
    ])
  })

  it('gives r² of each graph’s points, the straight one’s nearest 1, and says the scatter', () => {
    const lines = answerLines(settings('points=1'))
    const r2 = lines.find((l) => l.startsWith('r²'))!
    const [conc, ln, inv] = [...r2.matchAll(/ (\d\.\d{4})/g)].map((m) => Number(m[1]))
    expect(ln).toBe(1)
    expect(conc).toBeLessThan(0.99)
    expect(inv).toBeLessThan(0.99)
    expect(lines.some((l) => /scattered/.test(l))).toBe(false)
    expect(answerLines(settings('table=conc&noise=2')).at(-1)).toBe('Each [A] in the data is scattered by about 2%')
    expect(answerLines(settings('')).some((l) => l.startsWith('r²'))).toBe(false)
  })
})

describe('sketch graphs', () => {
  it('have no numbers, and with no gridlines only arrowed axes', () => {
    const g = build('numbers=0')
    for (const p of g.panels) {
      expect(p.layout.numbers).toHaveLength(0)
      expect(p.layout.vLines.length).toBe(7)
    }
    const bare = build('numbers=0&gridlines=0')
    for (const p of bare.panels) {
      expect(p.layout.vLines).toHaveLength(0)
      expect(p.gridlines).toBe('none')
      expect([p.grid.xEndCap, p.grid.yEndCap]).toEqual(['triangle', 'triangle'])
      expect(p.paths).toHaveLength(1)
    }
    // Numbers without gridlines keep a tick at each number.
    expect(build('gridlines=0').panels[0].layout.vLines.length).toBe(7)
  })

  it('numbers every other line along the time axis when the numbers are wide', () => {
    const p = build('').panels[0]
    const along = p.layout.numbers.filter((n) => n.y > p.layout.grid.y + p.layout.grid.h).map((n) => n.text)
    expect(along).toEqual(['0', '40', '80', '120'])
  })
})

describe('the settings', () => {
  it('round-trip through the address', () => {
    const s = settings('order=2&a0=0.25&k=1.5&graphs=inv&points=1&noise=5&seed=42&table=all&guides=2&species=NO2&concUnit=mol/L&timeUnit=min&numbers=0&color=0')
    expect(rateLawSettings.fromParams(new URLSearchParams(rateLawSettings.toQuery(s)))).toEqual(s)
    expect(rateLawSettings.toQuery(rateLawSettings.defaults)).toBe('')
  })

  it('keeps [A]₀, k, the count and the guide lines in range', () => {
    const s = settings('a0=5000&k=0&count=40&guides=9&order=3')
    expect([s.a0, s.k, s.count, s.guides, s.order]).toEqual([100, 1e-6, 10, 3, '1'])
  })
})

describe('changing the order', () => {
  it('sets k to keep the first half-life, and says when k’s range can’t', () => {
    // 34.7 s: k = [A]₀/2t½ = 0.0144 M s⁻¹ for zero order, 1/(t½[A]₀) = 0.0289 M⁻¹ s⁻¹ for second.
    expect(kForOrder(settings(''), 0)).toEqual({ k: 0.0144, kept: true })
    expect(kForOrder(settings(''), 2)).toEqual({ k: 0.0289, kept: true })
    // t½ = 1/(10⁻⁶ × 0.001) = 10⁹ s would need k = 5 × 10⁻¹³ M s⁻¹ for zero order.
    expect(kForOrder(settings('order=2&a0=0.001&k=0.000001'), 0)).toEqual({ k: 1e-6, kept: false })
    expect(kForOrder(settings('order=0&a0=0.001&k=1000000'), 2)).toEqual({ k: 1e6, kept: false })
  })
})
