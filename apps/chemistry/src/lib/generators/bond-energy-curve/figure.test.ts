import { describe as group, expect, it } from 'vitest'
import { readAxes } from '$shared/graph/axes'
import { CELL } from '$shared/graph/grid'
import { textBox, textWidth } from '$shared/graph/labels'
import { answerLines, buildCurve, describe, fittedAxes } from './figure'
import { energyAt } from './morse'
import { bondSettings, drawnBonds, type BondSettings } from './settings'

const settings = (query: string) => bondSettings.fromParams(new URLSearchParams(query))
const build = (query: string) => buildCurve(settings(query))
const fitted = (query: string) => {
  const s = settings(query)
  return bondSettings.tidy({ ...s, ...fittedAxes(s) })
}

/** Where a point of the graph is on the drawing, worked out from the axes alone. */
function pxOf(s: BondSettings) {
  const g = buildCurve(s)
  const { x, y } = readAxes(g.gridSettings)
  return (r: number, e: number) => ({
    x: g.grid.x + ((r - x.start) / x.step) * CELL,
    y: g.grid.y + g.grid.h - ((e - y.start) / y.step) * CELL,
  })
}

/** The box a written label takes up, as the figure places it. */
const labelBox = (fs: number, l: { x: number; y: number; anchor: 'start' | 'middle' | 'end'; text?: string }) =>
  textBox(l, l.text === undefined ? 70 : textWidth(l.text, fs) * 1.06 + 2, fs)

/** The points of a drawn path: "M1,2L3,4". */
const pointsOf = (d: string) => d.slice(1).split('L').map((p) => p.split(',').map(Number) as [number, number])

group('a bond energy curve', () => {
  it('draws the made-up Bond X on axes that fit it, with no key for one curve', () => {
    const s = settings('')
    const g = buildCurve(s)
    expect(g.curves).toHaveLength(1)
    expect(g.curves[0].paths).toHaveLength(1)
    expect(g.keyEntries).toHaveLength(0)
    expect(g.guides).toHaveLength(0)
    expect(g.words).toHaveLength(0)
    expect(g.dots).toHaveLength(0)
    expect(Object.values(g.problems).filter(Boolean)).toEqual([])
    expect([s.xTitle, s.yTitle]).toEqual(['Internuclear distance (pm)', 'Potential energy (kJ/mol)'])
    expect(drawnBonds(s)).toEqual([{ slot: 0, name: 'Bond X', pm: 150, length: 150, energy: 300 }])
    // The first screen's axes are the ones Fit gives.
    expect(fittedAxes(s)).toEqual({ xFrom: s.xFrom, xTo: s.xTo, xStep: s.xStep, xEvery: s.xEvery, yFrom: s.yFrom, yTo: s.yTo, yStep: s.yStep, yEvery: s.yEvery })
  })

  it('puts each curve’s lowest drawn point at the typed length and minus the typed energy', () => {
    const queries = [
      '',
      'length1=74&energy1=436',
      'length1=267&energy1=151',
      'count=3&name1=X–X&name2=X=X&name3=X≡X&length2=130&energy2=550&length3=115&energy3=800',
      'length1=143&energy1=347&lengthUnit=angstrom',
      'length1=109.7&energy1=945.3&lengthUnit=nm',
      'length1=10&energy1=1',
      'length1=1000&energy1=2000',
    ]
    for (const q of queries) {
      const s = fitted(q)
      const g = buildCurve(s)
      const at = pxOf(s)
      expect(Object.values(g.problems).filter(Boolean), q).toEqual([])
      for (const [k, b] of drawnBonds(s).entries()) {
        const want = at(b.length, -b.energy)
        const pts = g.curves[k].paths.flatMap(pointsOf)
        // The minimum itself is a point of the drawn line, and nothing drawn is lower (a larger y) than it.
        const round = (v: number) => Math.round(v * 100) / 100
        expect(pts, `${q}: bond ${k + 1}’s minimum`).toContainEqual([round(want.x), round(want.y)])
        expect(Math.max(...pts.map((p) => p[1])), `${q}: bond ${k + 1}’s energy`).toBe(round(want.y))
        // Either side of it the line climbs: the wall on the left, the rise on the right.
        const i = pts.findIndex((p) => p[0] === round(want.x) && p[1] === round(want.y))
        expect(pts[0][1]).toBeLessThan(pts[i][1] - CELL)
        expect(pts.at(-1)![1]).toBeLessThan(pts[i][1] - CELL / 2)
        expect(g.minima[k]).toEqual({ index: k, on: true, x: expect.closeTo(want.x, 9), y: expect.closeTo(want.y, 9) })
      }
    }
  })

  it('keeps every curve on the grid: in at the top of the wall, out at the end of the distance axis, below the zero line', () => {
    for (const q of ['', 'count=3', 'length1=74&energy1=436', 'length1=300&energy1=40&lengthUnit=nm']) {
      const s = fitted(q)
      const g = buildCurve(s)
      const at = pxOf(s)
      const { x, y } = readAxes(s)
      const right = x.start + x.blocks * x.step
      for (const [k, b] of drawnBonds(s).entries()) {
        expect(g.curves[k].paths).toHaveLength(1)
        const pts = pointsOf(g.curves[k].paths[0])
        for (const [px, py] of pts) {
          expect(px).toBeGreaterThanOrEqual(g.grid.x - 0.01)
          expect(px).toBeLessThanOrEqual(g.grid.x + g.grid.w + 0.01)
          expect(py).toBeGreaterThanOrEqual(g.grid.y - 0.01)
          expect(py).toBeLessThanOrEqual(g.grid.y + g.grid.h + 0.01)
        }
        // It comes in through the top edge, cut there, not short of it.
        expect(pts[0][1]).toBeCloseTo(g.grid.y, 2)
        // And ends at the right edge, at the curve's own height, all but on the zero line and never above it.
        const end = pts.at(-1)!
        expect(end[0]).toBeCloseTo(g.grid.x + g.grid.w, 2)
        expect(end[1]).toBeCloseTo(at(right, energyAt(right, b.length, b.energy)).y, 2)
        expect(end[1]).toBeGreaterThanOrEqual(g.zero!.y1)
        expect(energyAt(right, b.length, b.energy)).toBeLessThan(0)
        expect(y.start).toBeLessThan(-b.energy)
      }
    }
  })

  it('draws the zero line across the grid, on a gridline', () => {
    for (const q of ['', 'count=2', 'length1=74&energy1=436', 'energy1=1999', 'energy1=7']) {
      const s = fitted(q)
      const g = buildCurve(s)
      expect(g.zero).toEqual({ x1: g.grid.x, x2: g.grid.x + g.grid.w, y1: pxOf(s)(0, 0).y, y2: pxOf(s)(0, 0).y })
      expect(g.hLines.some((y) => Math.abs(y - g.zero!.y1) < 1e-6), q).toBe(true)
    }
    // With no 0 on the energy axis there's no line.
    expect(build('yTo=-25').zero).toBeNull()
  })

  it('fits the axes in round steps: about three bond lengths across, just below the deepest well to a quarter of it above 0', () => {
    const axesOf = (q: string) => fittedAxes(settings(q))
    expect(axesOf('')).toEqual({ xFrom: '0', xTo: '450', xStep: '25', xEvery: 2, yFrom: '-325', yTo: '75', yStep: '25', yEvery: 2 })
    expect(axesOf('length1=74&energy1=436')).toEqual({ xFrom: '0', xTo: '240', xStep: '20', xEvery: 2, yFrom: '-500', yTo: '150', yStep: '50', yEvery: 2 })
    expect(axesOf('count=2')).toMatchObject({ xTo: '450', xStep: '25', yFrom: '-550', yTo: '150', yStep: '50' })
    expect(axesOf('count=3')).toMatchObject({ xTo: '600', xStep: '50', yFrom: '-550', yTo: '150', yStep: '50' })
    // Å and nm count in decimals.
    expect(axesOf('lengthUnit=angstrom')).toMatchObject({ xFrom: '0', xTo: '4.5', xStep: '0.25', xEvery: 2 })
    expect(axesOf('lengthUnit=nm')).toMatchObject({ xFrom: '0', xTo: '0.45', xStep: '0.025', xEvery: 2 })
    expect(axesOf('length1=74&lengthUnit=angstrom')).toMatchObject({ xTo: '2.4', xStep: '0.2' })
    expect(axesOf('length1=74&lengthUnit=nm')).toMatchObject({ xTo: '0.24', xStep: '0.02' })
    for (const length of [10, 37, 74, 99, 121, 154, 267, 500, 1000]) {
      for (const energy of [1, 7, 60, 151, 347, 436, 945, 2000]) {
        for (const unit of ['pm', 'angstrom', 'nm']) {
          const q = `length1=${length}&energy1=${energy}&lengthUnit=${unit}`
          const s = fitted(q)
          const { x, y, problems } = readAxes(s)
          expect(Object.values(problems).filter(Boolean), q).toEqual([])
          expect(Object.values(buildCurve(s).problems).filter(Boolean), q).toEqual([])
          const b = drawnBonds(s)[0]
          const right = x.start + x.blocks * x.step
          const top = y.start + y.blocks * y.step
          expect(x.start).toBe(0)
          expect(right / b.length, q).toBeGreaterThanOrEqual(3 - 1e-9)
          expect(right / b.length, q).toBeLessThan(3.6)
          expect(x.blocks, q).toBeGreaterThanOrEqual(8)
          expect(x.blocks, q).toBeLessThanOrEqual(18)
          expect(y.blocks, q).toBeGreaterThanOrEqual(7)
          expect(y.blocks, q).toBeLessThanOrEqual(16)
          // Room under the well, a quarter of its depth or a little more above 0, and 0 on a line.
          expect((-energy - y.start) / y.step, q).toBeGreaterThanOrEqual(0.75 - 1e-9)
          expect(top / energy, q).toBeGreaterThanOrEqual(0.25 - 1e-9)
          expect(top / energy, q).toBeLessThan(0.45)
          expect(Math.abs(y.start / y.step - Math.round(y.start / y.step)), q).toBeLessThan(1e-9)
          // The numbers along the bottom are plain ones, free of float noise.
          for (const text of [s.xTo, s.xStep, s.yFrom, s.yTo, s.yStep]) expect(text.length, `${q}: ${text}`).toBeLessThanOrEqual(6)
        }
      }
    }
  })

  it('numbers the axes in the unit shown, decimals and all', () => {
    const texts = (q: string) => buildCurve(fitted(q)).numbers.map((n) => n.text)
    expect(texts('')).toEqual(expect.arrayContaining(['0', '50', '150', '450', '−300', '50']))
    expect(texts('lengthUnit=angstrom')).toEqual(expect.arrayContaining(['0.5', '1.5', '4.5']))
    expect(texts('lengthUnit=nm')).toEqual(expect.arrayContaining(['0.05', '0.15', '0.45']))
    expect(texts('lengthUnit=nm').every((t) => t.length <= 4)).toBe(true)
  })

  it('titles the axes with the units shown, unless the teacher typed their own', () => {
    expect(settings('lengthUnit=angstrom&unit=kj-mol-1')).toMatchObject({ xTitle: 'Internuclear distance (Å)', yTitle: 'Potential energy (kJ mol⁻¹)' })
    expect(settings('lengthUnit=nm')).toMatchObject({ xTitle: 'Internuclear distance (nm)' })
    expect(settings('axes=shape')).toMatchObject({ xTitle: 'Internuclear distance', yTitle: 'Potential energy' })
    expect(settings('lengthUnit=nm&xTitle=Bond+distance&yTitle=Energy')).toMatchObject({ xTitle: 'Bond distance', yTitle: 'Energy' })
    // And they're drawn, guide labels or not.
    expect(build('guides=1&titleMode=text&title=Bond+X').labels.map((l) => l.text)).toEqual(['Bond X', 'Internuclear distance (pm)', 'Potential energy (kJ/mol)'])
    expect(build('axes=shape&regions=words').labels.map((l) => l.text)).toEqual(['Internuclear distance', 'Potential energy'])
  })

  it('runs guide lines from each minimum across to the energy axis and down to the distance axis', () => {
    const s = fitted('count=2&guides=1')
    const g = buildCurve(s)
    const at = pxOf(s)
    expect(g.guides).toHaveLength(4)
    for (const [k, b] of drawnBonds(s).entries()) {
      const min = at(b.length, -b.energy)
      const [across, down] = g.guides.slice(2 * k, 2 * k + 2)
      expect(across).toEqual({ x1: expect.closeTo(min.x, 9), y1: expect.closeTo(min.y, 9), x2: g.yAxis.x, y2: expect.closeTo(min.y, 9) })
      expect(down).toEqual({ x1: expect.closeTo(min.x, 9), y1: expect.closeTo(min.y, 9), x2: expect.closeTo(min.x, 9), y2: g.xAxis.y })
    }
    // The lengths left to right, then the energies top to bottom, each in its curve's ink.
    expect(g.words.map((l) => l.text)).toEqual(['120 pm', '150 pm', '−300 kJ/mol', '−500 kJ/mol'])
    expect(g.words.map((l) => l.color)).toEqual([g.curves[1].color, g.curves[0].color, g.curves[0].color, g.curves[1].color])
    expect(g.words.every((l) => !l.back)).toBe(true)
    expect(g.problems.crowded).toBeUndefined()
    expect(build('guides=0').guides).toHaveLength(0)
  })

  it('labels the guide lines with values, words, blank lines or nothing, in the units shown', () => {
    expect(build('guides=1').words.map((l) => l.text)).toEqual(['150 pm', '−300 kJ/mol'])
    expect(build('guides=1&lengthUnit=angstrom&unit=kj-mol-1&xTo=4.5&xStep=0.25').words.map((l) => l.text)).toEqual(['1.5 Å', '−300 kJ mol⁻¹'])
    expect(build('guides=1&lengthUnit=nm&xTo=0.45&xStep=0.025').words.map((l) => l.text)).toEqual(['0.15 nm', '−300 kJ/mol'])
    expect(build('guides=1&guideLabels=words').words.map((l) => l.text)).toEqual(['Bond length', 'Bond energy'])
    expect(build('guides=1&guideLabels=blank').words.map((l) => !!l.blank && !l.text)).toEqual([true, true])
    expect(build('guides=1&guideLabels=none').words).toHaveLength(0)
    // Labels alone, with the guide lines off, aren't drawn.
    expect(build('guideLabels=words').words).toHaveLength(0)
  })

  it('draws one guide line where two lie along each other, and keeps their labels apart', () => {
    // The same length: one line down, the longer; two across.
    const sameLength = buildCurve(fitted('count=2&guides=1&length2=150'))
    expect(sameLength.guides.filter((l) => l.x1 === l.x2)).toHaveLength(1)
    expect(sameLength.guides.filter((l) => l.y1 === l.y2)).toHaveLength(2)
    const down = sameLength.guides.find((l) => l.x1 === l.x2)!
    expect(down.y1).toBeCloseTo(Math.min(...sameLength.minima.map((m) => m.y)), 9)
    // The same energy: one line across, the longer.
    const sameEnergy = buildCurve(fitted('count=2&guides=1&energy2=300'))
    expect(sameEnergy.guides.filter((l) => l.y1 === l.y2)).toHaveLength(1)
    expect(sameEnergy.guides.find((l) => l.y1 === l.y2)!.x1).toBeCloseTo(Math.max(...sameEnergy.minima.map((m) => m.x)), 9)
    // The same bond twice: one of each.
    expect(buildCurve(fitted('count=2&guides=1&length2=150&energy2=300')).guides).toHaveLength(2)
    for (const g of [sameLength, sameEnergy, buildCurve(fitted('count=3&guides=1&length2=140&length3=160&energy2=320&energy3=280'))]) {
      expect(new Set(g.words.map((l) => `${l.x},${l.y},${l.anchor}`)).size).toBe(g.words.length)
    }
    // A shared line has one label, in the axes' ink.
    expect(sameLength.words.map((l) => [l.text, l.color])).toEqual([['150 pm', undefined], ['−300 kJ/mol', sameLength.curves[0].color], ['−500 kJ/mol', sameLength.curves[1].color]])
    expect(sameEnergy.words.map((l) => [l.text, l.color])).toEqual([['120 pm', sameEnergy.curves[1].color], ['150 pm', sameEnergy.curves[0].color], ['−300 kJ/mol', undefined]])
  })

  it('writes a length on its own guide line, on a white patch, where there’s no room beside it, and never one label over another', () => {
    const g = buildCurve(fitted('count=3&guides=1&length1=160&length2=130&energy2=550&length3=100&energy3=800'))
    const onLine = g.words.filter((l) => l.back)
    expect(onLine.map((l) => [l.text, l.anchor])).toEqual([['100 pm', 'middle']])
    expect(onLine[0].x).toBeCloseTo(g.minima[2].x, 9)
    expect(onLine[0].back!.x0).toBeLessThan(onLine[0].x)
    expect(onLine[0].back!.x1).toBeGreaterThan(onLine[0].x)
    const queries = [
      'count=3&guides=1&length1=160&length2=130&energy2=550&length3=100&energy3=800',
      'count=3&guides=1&length2=130&energy2=550&length3=115&energy3=800',
      'count=3&guides=1&length2=140&length3=160&energy2=320&energy3=280',
      'count=3&guides=1&guideLabels=words&length2=140&length3=160&energy2=320&energy3=280',
      'count=2&guides=1&length2=150&energy2=310',
      'count=3&guides=1&labelSize=large&length2=130&energy2=550&length3=115&energy3=800',
    ]
    for (const q of queries) {
      const g = buildCurve(fitted(q))
      const boxes = g.words.map((l) => labelBox(g.labelFs, l))
      for (const [i, a] of boxes.entries()) {
        for (const b of boxes.slice(i + 1)) {
          const overlap = a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
          expect(overlap, `${q}: ${JSON.stringify([a, b])}`).toBe(false)
        }
      }
    }
    // Minimums all but on top of each other leave no room, and the page says so.
    expect(buildCurve(fitted('count=3&guides=1&length2=140&length3=160&energy2=320&energy3=280')).problems.crowded).toContain('crowded')
    expect(buildCurve(fitted('count=3&guides=0&length2=140&length3=160&energy2=320&energy3=280')).problems.crowded).toBeUndefined()
    expect(buildCurve(fitted('count=2&guides=1')).problems.crowded).toBeUndefined()
  })

  it('puts a dot on each minimum', () => {
    const s = fitted('count=3&dots=1')
    const g = buildCurve(s)
    const at = pxOf(s)
    expect(g.dots.map((d) => [d.x, d.y])).toEqual(drawnBonds(s).map((b) => [expect.closeTo(at(b.length, -b.energy).x, 9), expect.closeTo(at(b.length, -b.energy).y, 9)]))
    expect(new Set(g.dots.map((d) => d.color)).size).toBe(3)
  })

  it('tells up to three curves apart by their dashes, in color or black, with a key', () => {
    const g = buildCurve(fitted('count=3'))
    expect(g.curves.map((c) => c.dash)).toEqual([undefined, '12 7', '3 5'])
    expect(new Set(g.curves.map((c) => c.color)).size).toBe(3)
    expect(g.keyEntries.map((k) => k.text.text)).toEqual(['Bond X', 'Bond Y', 'Bond Z'])
    expect(build('count=3').height).toBeGreaterThan(build('').height)
    const bw = buildCurve(fitted('count=3&color=0'))
    expect(new Set(bw.curves.map((c) => c.color)).size).toBe(1)
    expect(bw.curves.map((c) => c.dash)).toEqual([undefined, '12 7', '3 5'])
  })

  it('names the bonds as typed, and an unnamed one by its number', () => {
    const s = settings('count=3&name1=H–H&name2=&name3=+C≡C+')
    expect(drawnBonds(s).map((b) => b.name)).toEqual(['H–H', 'Bond 2', 'C≡C'])
    expect(buildCurve(s).keyEntries.map((k) => k.text.text)).toEqual(['H–H', 'Bond 2', 'C≡C'])
    expect(describe(s)).toBe('Potential energy against internuclear distance for H–H, Bond 2 and C≡C')
    expect(describe(settings('titleMode=text&title=Two+bonds'))).toBe('Two bonds')
  })

  it('keeps hidden names out of the key and the screen reader’s description, and in the answer key', () => {
    const s = settings('count=3&names=0&name1=H–H&name2=O=O&name3=N≡N')
    const g = buildCurve(s)
    expect(g.keyEntries.map((k) => k.text.text)).toEqual(['Bond A', 'Bond B', 'Bond C'])
    expect(describe(s)).toBe('Potential energy against internuclear distance for Bond A, Bond B and Bond C')
    expect(JSON.stringify([g.keyEntries, g.words, g.numbers, describe(s)])).not.toMatch(/H–H|O=O|N≡N/)
    expect(answerLines(s)).toEqual([
      'Bond A is H–H: bond length 150 pm, bond energy 300 kJ/mol',
      'Bond B is O=O: bond length 120 pm, bond energy 500 kJ/mol',
      'Bond C is N≡N: bond length 200 pm, bond energy 200 kJ/mol',
    ])
    // One bond is always named: hiding names is offered only with more than one.
    expect(describe(settings('names=0&name1=H–H'))).toBe('Potential energy against internuclear distance for H–H')
    expect(answerLines(settings('names=0&name1=H–H'))).toEqual(['H–H: bond length 150 pm, bond energy 300 kJ/mol'])
  })

  it('gives each bond’s length and energy in the answer key, in the units shown', () => {
    expect(answerLines(settings(''))).toEqual(['Bond X: bond length 150 pm, bond energy 300 kJ/mol'])
    expect(answerLines(settings('count=2&lengthUnit=angstrom&unit=kj-mol-1'))).toEqual([
      'Bond X: bond length 1.5 Å, bond energy 300 kJ mol⁻¹',
      'Bond Y: bond length 1.2 Å, bond energy 500 kJ mol⁻¹',
    ])
    expect(answerLines(settings('lengthUnit=nm&length1=74&energy1=436'))).toEqual(['Bond X: bond length 0.074 nm, bond energy 436 kJ/mol'])
  })

  it('writes Repulsion beside the wall and Attraction along the rise, for one curve only', () => {
    const s = fitted('regions=words')
    const g = buildCurve(s)
    const at = pxOf(s)
    const min = at(150, -300)
    expect(g.words.map((l) => l.text)).toEqual(['Repulsion', 'Attraction'])
    const [repulsion, attraction] = g.words
    // Left of the minimum and right of it.
    expect(repulsion.anchor).toBe('end')
    expect(repulsion.x).toBeLessThan(min.x)
    expect(attraction.x).toBeGreaterThan(min.x)
    expect(buildCurve(fitted('regions=blank')).words.map((l) => !!l.blank && !l.text)).toEqual([true, true])
    expect(buildCurve(fitted('regions=none')).words).toHaveLength(0)
    expect(buildCurve(fitted('regions=words&count=2')).words).toHaveLength(0)
  })

  it('says when a minimum is off the grid, and Fit brings it back', () => {
    const s = settings('count=2')
    const g = buildCurve(s)
    expect(g.problems.fit).toBe('Bond Y’s minimum (120 pm, −500 kJ/mol) is off the grid. Fit the axes to bring it on.')
    expect(g.minima.map((m) => m.on)).toEqual([true, false])
    expect(buildCurve(bondSettings.tidy({ ...s, ...fittedAxes(s) })).problems.fit).toBeUndefined()
    expect(build('length1=500&energy1=900').problems.fit).toContain('Bond X’s minimum (500 pm, −900 kJ/mol) is off the grid')
    expect(build('count=3&energy1=400&length3=700').problems.fit).toContain('Bond X’s minimum (150 pm, −400 kJ/mol), Bond Y’s minimum (120 pm, −500 kJ/mol) and Bond Z’s minimum (700 pm, −200 kJ/mol) are off the grid')
    // An off-grid minimum gets no guide lines, dot or labels.
    const off = build('count=2&guides=1&dots=1')
    expect(off.guides).toHaveLength(2)
    expect(off.dots).toHaveLength(1)
    expect(off.words).toHaveLength(2)
  })

  it('says when a shallow well beside a deep one is too squashed to read', () => {
    const g = buildCurve(fitted('count=2&energy1=1000&energy2=150'))
    expect(g.problems.fit).toBeUndefined()
    expect(g.problems.shallow).toContain('Bond Y’s well is under 2 blocks deep')
    // Fit gives a lone bond, or bonds of like depth, plenty of blocks.
    expect(buildCurve(fitted('energy1=1')).problems.shallow).toBeUndefined()
    expect(buildCurve(fitted('count=3')).problems.shallow).toBeUndefined()
  })

  it('draws shape only with no numbers or gridlines, fitted to the curves, keeping the 0 on the energy axis', () => {
    const s = settings('axes=shape&length1=74&energy1=436&xTo=3&yFrom=5')
    const g = buildCurve(s)
    expect(g.numbers.map((n) => n.text)).toEqual(['0'])
    expect(g.numbers[0].y).toBeCloseTo(g.zero!.y1 + g.fs * 0.35, 9)
    expect(g.numbers[0].x).toBeLessThan(g.yAxis.x)
    expect([g.vLines, g.hLines, g.minorV, g.minorH]).toEqual([[], [], [], []])
    expect(g.gridlines).toBe('none')
    // Whatever range was typed, the curve is on the grid.
    expect(Object.values(g.problems).filter(Boolean)).toEqual([])
    expect(g.minima[0].on).toBe(true)
    const { xFrom, xTo, xStep, yFrom, yTo, yStep } = fittedAxes(s)
    expect(g.gridSettings).toMatchObject({ xFrom, xTo, xStep, yFrom, yTo, yStep, xEvery: 0, yEvery: 0 })
    // The 0 has room left of the axis, clear of the y-axis title.
    expect(g.numbers[0].x - g.fs * 0.6).toBeGreaterThan(14 + g.fs * 1.2)
  })

  it('draws gridlines light unless told otherwise, and none as ticks without minor lines', () => {
    expect(build('').gridlines).toBe('light')
    expect(build('gridlines=bold&minor=2')).toMatchObject({ gridlines: 'bold' })
    expect(build('gridlines=bold&minor=2').minorH.length).toBeGreaterThan(0)
    expect(build('gridlines=none&minor=2').minorH).toHaveLength(0)
  })
})
