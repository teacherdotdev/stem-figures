import { describe, expect, it } from 'vitest'
import { textBox, textWidth, type Box } from './labels'
import { buildEnzyme, readoutOf, runsOf, spread, type Label } from './figure'
import { enzymeSettings } from './settings'

const settingsOf = (query: string) => enzymeSettings.fromParams(new URLSearchParams(query))
const build = (query: string) => buildEnzyme(settingsOf(query))
const THREE_PH = 'graph=ph&xTitle=pH&enzyme1=pepsin&show2=1&enzyme2=amylase&show3=1&enzyme3=trypsin'
const INHIBITORS = 'graph=substrate&xTitle=Substrate+concentration&show2=1&show3=1'

/** The x of each point a path passes through. */
const pathXs = (d: string) => [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => Number(m[1]))
const pathYs = (d: string) => [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => Number(m[2]))

/** The box a label takes up on the figure. */
function boxOf(l: Label, fs: number): Box {
  if (l.blank) return { x0: l.blank.x1, y0: l.y - fs, x1: l.blank.x2, y1: l.y + 2 }
  const w = l.runs!.reduce((sum, r) => sum + textWidth(r.text, r.sub ? fs * 0.7 : fs), 0)
  return textBox(l, w, fs)
}
const overlap = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
const labelText = (l: Label) => l.runs?.map((r) => r.text).join('') ?? '_'

describe('an enzyme activity graph', () => {
  it('starts as a human enzyme against temperature, its optimum marked, with no numbers or key', () => {
    const g = build('')
    expect(g.curves.map((c) => c.name)).toEqual(['Human enzyme'])
    expect(g.numbers).toEqual([])
    expect(g.vLines).toEqual([])
    expect(g.keyEntries).toEqual([])
    expect(g.labels.map((l) => l.text)).toEqual(['Temperature (°C)', 'Rate of reaction'])
    expect(g.range).toEqual({ from: 0, to: 60 })
    expect(g.dots).toHaveLength(1)
    expect(g.markLabels.map(labelText)).toEqual(['Optimum'])
  })

  it('puts the optimum’s dot on the curve’s peak, with a dashed line down to the x-axis', () => {
    const g = build('')
    const [p] = g.dots
    // 37 °C on an axis from 0 to 60.
    expect(p.x).toBeCloseTo(g.grid.x + (37 / 60) * g.grid.w, 6)
    expect(Math.min(...g.curves[0].paths.flatMap(pathYs))).toBeCloseTo(p.y, 0)
    expect(g.guides).toEqual([{ x1: p.x, y1: p.y, x2: p.x, y2: g.grid.y + g.grid.h }])
  })

  it('ends a temperature curve where the enzyme denatures, marked if wanted', () => {
    const g = build('markDen=1')
    const xs = g.curves[0].paths.flatMap(pathXs)
    expect(Math.max(...xs)).toBeLessThan(g.grid.x + g.grid.w * (52 / 60))
    const stop = g.dots[1]
    expect(stop.y).toBe(g.grid.y + g.grid.h)
    expect(stop.x).toBeCloseTo(Math.max(...xs), 0)
    expect(g.markLabels.map(labelText)).toEqual(['Optimum', 'Denatured'])
  })

  it('fits the temperature axis to every curve drawn', () => {
    expect(build('show2=1').range).toEqual({ from: 0, to: 110 })
    expect(build('enzyme1=unknown&tOpt1=20&tWidth1=5').range).toEqual({ from: 0, to: 30 })
  })

  it('compares pepsin, amylase and trypsin against pH, dashed apart and named in a key', () => {
    const g = build(THREE_PH)
    expect(g.curves.map((c) => [c.name, c.dash])).toEqual([['Pepsin', undefined], ['Salivary amylase', '12 7'], ['Trypsin', '3 5']])
    expect(g.keyEntries.map((k) => k.text.text)).toEqual(['Pepsin', 'Salivary amylase', 'Trypsin'])
    expect(g.range).toEqual({ from: 0, to: 12 })
    // Each optimum marked once, at pH 2, 7 and 8.
    expect(g.dots.map((d) => Math.round(((d.x - g.grid.x) / g.grid.w) * 12 * 10) / 10)).toEqual([2, 7, 8])
    const title = g.labels.find((l) => l.text === 'pH')!
    for (const k of g.keyEntries) expect(k.sample.y1).toBeGreaterThan(title.y)
    expect(g.height).toBeGreaterThan(g.keyEntries[0].text.y)
  })

  it('keeps labels off each other, inside the grid', () => {
    for (const query of [THREE_PH + '&markDen=1', 'show2=1&markDen=1', INHIBITORS + '&markKm=1']) {
      const g = build(query)
      const boxes = [...g.markLabels, ...g.sideLabels].map((l) => boxOf(l, g.labelFs))
      for (const [k, a] of boxes.entries()) for (const b of boxes.slice(k + 1)) expect(overlap(a, b), query).toBe(false)
      for (const b of g.markLabels.map((l) => boxOf(l, g.labelFs))) {
        expect(b.x0, query).toBeGreaterThanOrEqual(g.grid.x)
        expect(b.x1, query).toBeLessThanOrEqual(g.grid.x + g.grid.w)
        expect(b.y0, query).toBeGreaterThanOrEqual(g.grid.y)
      }
    }
  })

  it('names unknown enzymes A, B and C, and draws them from their own optimum', () => {
    const g = build('graph=ph&enzyme1=unknown&pOpt1=4&pWidth1=2&show2=1&enzyme2=unknown&pOpt2=9&pWidth2=2')
    expect(g.curves.map((c) => c.name)).toEqual(['Enzyme A', 'Enzyme B'])
    expect(g.range).toEqual({ from: 1, to: 12 })
    expect(build('name1=Lipase').curves[0].name).toBe('Lipase')
  })

  it('draws an enzyme with a competitive and a non-competitive inhibitor', () => {
    const g = build(INHIBITORS)
    expect(g.curves.map((c) => c.name)).toEqual(['No inhibitor', 'Competitive inhibitor', 'Non-competitive inhibitor'])
    // Two Vmax lines: the enzyme's own (shared with the competitive inhibitor) and the non-competitive one's, 2.5 times lower.
    expect(g.lines).toHaveLength(2)
    const axisY = g.grid.y + g.grid.h
    const [top, low] = g.lines.map((l) => axisY - l.y1)
    expect(top / low).toBeCloseTo(2.5, 6)
    expect(g.sideLabels.map(labelText)).toEqual(['Vmax', 'Vmax'])
  })

  it('marks ½Vmax and Km at the axes, Km raised by a competitive inhibitor and kept by a non-competitive one', () => {
    const g = build(INHIBITORS + '&markVmax=0&markKm=1')
    // Dots at Km (1) for the enzyme and the non-competitive inhibitor, and 2.5 for the competitive one.
    const at = g.dots.map((d) => Math.round(((d.x - g.grid.x) / g.grid.w) * 10 * 100) / 100)
    expect(at).toEqual([1, 2.5, 1])
    expect(g.sideLabels.filter((l) => l.anchor === 'middle').map(labelText)).toEqual(['Km', 'Km'])
    expect(g.sideLabels.filter((l) => l.anchor === 'end').map(labelText)).toEqual(['½Vmax', '½Vmax'])
    // Km's labels sit under the x-axis, ½Vmax's left of the y-axis.
    for (const l of g.sideLabels) {
      if (l.anchor === 'middle') expect(l.y).toBeGreaterThan(g.grid.y + g.grid.h)
      else expect(l.x).toBeLessThan(g.grid.x)
    }
  })

  it('leaves marks as blank lines for students, or off', () => {
    const blank = build('graph=substrate&markKm=1&vmaxLabelMode=blank&halfLabelMode=blank&kmLabelMode=none')
    expect(blank.sideLabels).toHaveLength(2)
    expect(blank.sideLabels.every((l) => l.blank && !l.runs)).toBe(true)
    expect(build('optLabelMode=blank').markLabels[0].blank).toBeDefined()
    const none = build('optLabelMode=none')
    expect(none.markLabels).toEqual([])
    expect(none.dots).toHaveLength(1)
  })

  it('draws blank axes when no curve is shown', () => {
    const g = build('show1=0&markDen=1')
    expect(g.curves).toEqual([])
    expect(g.dots).toEqual([])
    expect(g.markLabels).toEqual([])
  })

  it('draws gridlines only when asked', () => {
    const g = build('gridlines=1&minor=2')
    expect(g.vLines).toHaveLength(16)
    expect(g.hLines).toHaveLength(11)
    expect(g.minorV.length).toBeGreaterThan(0)
    expect(g.vLines[0]).toBe(g.grid.x)
  })

  it('makes room for the chart title and the labels at the y-axis', () => {
    const plain = build('graph=substrate&markVmax=0')
    const marked = build('graph=substrate&title=Effect+of+substrate&titleMode=text')
    expect(marked.grid.x).toBeGreaterThan(plain.grid.x)
    expect(marked.grid.y).toBeGreaterThan(plain.grid.y)
    expect(marked.labels.find((l) => l.kind === 'title')?.text).toBe('Effect of substrate')
  })
})

describe('the readout', () => {
  it('says where each enzyme works', () => {
    expect(readoutOf(settingsOf(''))).toEqual(['Human enzyme: works best at 37 °C, and has denatured by 47 °C'])
    expect(readoutOf(settingsOf(THREE_PH))[0]).toBe('Pepsin: works best at pH 2, and between pH 0 and 4.5')
    expect(readoutOf(settingsOf(INHIBITORS))).toEqual([
      'No inhibitor: Vmax and Km of the enzyme on its own',
      'Competitive inhibitor: the same Vmax, and Km 2.5 times higher',
      'Non-competitive inhibitor: Vmax 2.5 times lower, and the same Km',
    ])
  })
})

describe('label text', () => {
  it('lowers the max of Vmax and the m of Km', () => {
    expect(runsOf('½Vmax', 10).map((r) => [r.text, !!r.sub, r.dy])).toEqual([['½V', false, 0], ['max', true, 2.2]])
    expect(runsOf('Km (low)', 10).map((r) => [r.text, r.dy])).toEqual([['K', 0], ['m', 2.2], [' (low)', -2.2]])
    expect(runsOf('Optimum', 10)).toEqual([{ text: 'Optimum', dy: 0 }])
  })

  it('moves labels along an axis apart just enough', () => {
    const out = spread([{ at: 10, half: 5 }, { at: 0, half: 5 }, { at: 40, half: 5 }], 2)
    expect(out.map((o) => o.at)).toEqual([0, 12, 40])
  })
})

describe('the settings', () => {
  it('leave defaults out of the address, and read back what they wrote', () => {
    expect(enzymeSettings.toQuery(enzymeSettings.defaults)).toBe('')
    const s = settingsOf(THREE_PH + '&enzyme3=unknown&pOpt3=9.5&markDen=1&name2=Amylase')
    expect(enzymeSettings.fromParams(new URLSearchParams(enzymeSettings.toQuery(s)))).toEqual(s)
  })
})
