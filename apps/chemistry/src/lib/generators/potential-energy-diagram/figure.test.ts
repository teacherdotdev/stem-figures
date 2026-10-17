import { describe, expect, it } from 'vitest'
import { crosses, type Box, type Segment } from '$shared/graph/labels'
import { LABEL_SIZES, type LabelSize } from '$shared/labelSize'
import { answerLines, buildDiagram, checkLevels, describe as describeFigure, fittedAxes } from './figure'
import { energySettings, type EnergySettings } from './settings'
import { SETUPS, settingsFor } from './setups'

const settingsOf = (query: string) => energySettings.fromParams(new URLSearchParams(query))
const build = (query: string) => buildDiagram(settingsOf(query))
const text = (l: ReturnType<typeof build>['words'][number]) => l.rows.map((r) => r.map((sp) => sp.text).join('')).join(' ')
const texts = (g: ReturnType<typeof build>) => g.words.map(text)

/** The segments of a path drawn as "M1,2L3,4…". */
function segmentsOf(d: string): Segment[] {
  const pts = [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
  return pts.slice(1).map((q, k) => ({ x1: pts[k].x, y1: pts[k].y, x2: q.x, y2: q.y }))
}
const overlap = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
const shrink = (b: Box, by: number): Box => ({ x0: b.x0 + by, y0: b.y0 + by, x1: b.x1 - by, y1: b.y1 - by })

/** Every way a label is in the way of something: another label, a curve, a level's line or an arrow, or off the grid. */
function clashes(g: ReturnType<typeof build>): string[] {
  const out: string[] = []
  const lines: [string, Segment][] = [
    ...g.curves.flatMap((c) => c.paths.flatMap(segmentsOf).map((sg) => [`curve ${c.index}`, sg] as [string, Segment])),
    ...g.bars.map((b) => ['level line', b] as [string, Segment]),
    ...g.arrows.map((a) => [`${a.key} arrow`, a.line] as [string, Segment]),
  ]
  const area = { x0: g.grid.x, y0: g.grid.y, x1: g.grid.x + g.grid.w, y1: g.grid.y + g.grid.h }
  g.words.forEach((l, i) => {
    const b = shrink(l.box, 1)
    const name = text(l) || 'blank'
    if (b.x0 < area.x0 || b.x1 > area.x1 || b.y0 < area.y0 || b.y1 > area.y1) out.push(`${name} is off the grid`)
    for (const [what, sg] of lines) if (crosses(sg, b)) out.push(`${name} crosses the ${what}`)
    g.words.slice(i + 1).forEach((m) => overlap(b, shrink(m.box, 1)) && out.push(`${name} overlaps ${text(m) || 'blank'}`))
  })
  return [...new Set(out)]
}

describe('a potential energy diagram', () => {
  it('draws the default exothermic profile, its Ea and ΔH arrows and every level labeled', () => {
    const g = build('')
    expect(g.curves).toHaveLength(1)
    expect(g.arrows.map((a) => a.key)).toEqual(['ea', 'dh'])
    expect(texts(g)).toEqual(expect.arrayContaining(['Ea', 'ΔH', 'Reactants', 'Transition state', 'Products']))
    expect(g.keyEntries).toHaveLength(0)
    expect(g.problems.fit).toBeUndefined()
  })

  it('points the Ea arrow up from the reactants to the peak, and ΔH from the reactants to the products', () => {
    const g = build('bothHeads=0')
    const [ea, dh] = g.arrows
    // Up the page is smaller y: Ea ends higher than it starts, ΔH (exothermic) lower.
    expect(ea.line.y2).toBeLessThan(ea.line.y1)
    expect(dh.line.y2).toBeGreaterThan(dh.line.y1)
    expect(ea.heads).toEqual({ start: false, end: true })
    expect(build('bothHeads=1').arrows[0].heads).toEqual({ start: true, end: true })
  })

  it('ends each arrowhead’s tip on its level: the peak, and the products’ line', () => {
    const g = build('')
    const peak = Math.min(...segmentsOf(g.curves[0].paths[0]).map((sg) => sg.y1))
    const [ea, dh] = g.arrows
    // The line stops short by the arrowhead's reach past it (2.6).
    expect(ea.line.y2 - 2.6).toBeCloseTo(peak, 1)
    const products = segmentsOf(g.curves[0].paths[0]).at(-1)!.y2
    expect(dh.line.y2 + 2.6).toBeCloseTo(products, 1)
  })

  it('draws dashed lines carrying the reactants across to the Ea and ΔH arrows, and none when turned off', () => {
    const g = build('')
    expect(g.guides).toHaveLength(1)
    expect(g.guides[0].x2).toBeCloseTo(g.arrows[1].line.x1, 6)
    expect(build('guides=0').guides).toHaveLength(0)
  })

  it('labels an arrow with its value, a true minus and the unit', () => {
    expect(texts(build('eaLabel=value&dhLabel=value'))).toEqual(expect.arrayContaining(['Ea = 100 kJ/mol', 'ΔH = −30 kJ/mol']))
    expect(texts(build('levels=20_150_80&dhLabel=value&unit=kj-mol-1&yTo=180'))).toContain('ΔH = +60 kJ mol⁻¹')
  })

  it('letters (or numbers) the arrows marked for a question, and leaves blank lines', () => {
    expect(texts(build('eaLabel=mark&dhLabel=mark'))).toEqual(expect.arrayContaining(['A', 'B']))
    expect(texts(build('eaLabel=mark&dhLabel=mark&marks=numbers'))).toEqual(expect.arrayContaining(['1', '2']))
    const g = build('dhLabel=blank')
    expect(g.words.filter((l) => l.blank)).toHaveLength(1)
    expect(texts(g)).not.toContain('ΔH')
  })

  it('adds a dashed catalysed path and its Ea arrow, with a key naming both', () => {
    const g = build('catalyst=1&catTs=100')
    expect(g.curves.map((c) => !!c.dash)).toEqual([false, true])
    expect(g.arrows.map((a) => a.key)).toEqual(['ea', 'catEa', 'dh'])
    expect(g.keyEntries.map((k) => k.text.text)).toEqual(['Uncatalysed', 'Catalysed'])
    expect(texts(g)).toEqual(expect.arrayContaining(['Ea (uncatalysed)', 'Ea (catalysed)']))
    const enzyme = build('catalyst=1&catTs=90&uncatName=Without+enzyme&catName=With+enzyme')
    expect(enzyme.keyEntries.map((k) => k.text.text)).toEqual(['Without enzyme', 'With enzyme'])
    expect(texts(enzyme)).toEqual(expect.arrayContaining(['Ea (with enzyme)']))
  })

  it('draws a mechanism’s Ea arrows, one per step, and numbers its transition states and intermediates', () => {
    const g = build('levels=30_110_60_130_50_90_-20&yFrom=-40&yTo=160')
    expect(g.arrows.filter((a) => a.key === 'ea')).toHaveLength(3)
    expect(texts(g)).toEqual(expect.arrayContaining(['Ea1', 'Ea2', 'Ea3', 'Transition state 1', 'Transition state 3', 'Intermediate 1', 'Intermediate 2']))
  })

  it('writes the teacher’s own level labels, with subscripts, or blank lines, or none', () => {
    const g = build('reactantsLabel=N_2+%2B+3H_2&productsLabel=2NH_3&tsLabelMode=blank&intLabelMode=none')
    const n2 = g.words.find((l) => text(l) === 'N2 + 3H2')!
    expect(n2.rows[0].map((sp) => sp.text)).toEqual(['N', '2', ' + 3H', '2'])
    expect(texts(g)).toContain('2NH3')
    expect(texts(g)).not.toContain('Transition state')
    expect(g.words.filter((l) => l.blank)).toHaveLength(1)
    expect(texts(build('reactantsLabelMode=none'))).not.toContain('Reactants')
  })

  it('draws no curve as a level diagram: the reactants’ and products’ lines and the ΔH arrow between them', () => {
    const g = build('style=levels&catalyst=1')
    expect(g.curves).toHaveLength(0)
    expect(g.bars).toHaveLength(2)
    expect(g.arrows.map((a) => a.key)).toEqual(['dh'])
    expect(g.keyEntries).toHaveLength(0)
    expect(texts(g).sort()).toEqual(['Products', 'Reactants', 'ΔH'])
    expect(g.guides).toHaveLength(2)
  })

  it('leaves out the numbers and gridlines when shape only', () => {
    const g = build('axes=shape')
    expect(g.numbers).toHaveLength(0)
    expect(g.hLines).toHaveLength(0)
    expect(g.gridlines).toBe('none')
    expect(build('').hLines.length).toBeGreaterThan(0)
    // The reaction coordinate is never numbered, nor lined.
    expect(build('').vLines).toHaveLength(0)
  })

  it('says when the diagram runs off the energy axis, and fits the axis to it', () => {
    const s = settingsOf('levels=50_300_20')
    expect(buildDiagram(s).problems.fit).toContain('past the energy axis')
    expect(buildDiagram({ ...s, ...fittedAxes(s) }).problems.fit).toBeUndefined()
    expect(fittedAxes(settingsOf(''))).toEqual({ yFrom: '0', yTo: '180', yStep: '20', yEvery: 1 })
    expect(fittedAxes(settingsOf('levels=-400_-250_-480'))).toMatchObject({ yFrom: '-500', yTo: '-200' })
  })
})

describe('the checks', () => {
  it('says when a transition state isn’t above the levels either side of it', () => {
    expect(checkLevels(settingsOf('levels=50_40_20')).level1).toContain('higher than the reactants (50)')
    expect(checkLevels(settingsOf('levels=40_120_70_60_10')).level3).toContain('higher than the intermediate (70) and the products (10)')
    expect(checkLevels(settingsOf(''))).toEqual({})
  })

  it('says when an intermediate isn’t below the transition states either side', () => {
    expect(checkLevels(settingsOf('levels=40_120_130_150_10')).level2).toContain('lower than the transition state 1 (120)')
  })

  it('says when the catalysed peak is above the uncatalysed one, or below the reactants or products', () => {
    expect(checkLevels(settingsOf('catalyst=1&catTs=160')).catTs).toContain('lower than the uncatalysed one (150)')
    expect(checkLevels(settingsOf('catalyst=1&catTs=40')).catTs).toContain('higher than the reactants (50)')
    expect(checkLevels(settingsOf('catalyst=1&catTs=100')).catTs).toBeUndefined()
  })
})

describe('the answer key and the screen-reader label', () => {
  it('gives ΔH with its sign, exothermic or endothermic, and the forward and reverse Ea', () => {
    expect(answerLines(settingsOf(''))).toEqual(['ΔH = −30 kJ/mol: exothermic', 'Eₐ (forward) = 100 kJ/mol', 'Eₐ (reverse) = 130 kJ/mol'])
    expect(answerLines(settingsOf('levels=20_150_80'))[0]).toBe('ΔH = +60 kJ/mol: endothermic')
  })

  it('gives the catalysed Ea, both lower by the same amount', () => {
    expect(answerLines(settingsOf('catalyst=1&catTs=100')).at(-1)).toBe(
      'Eₐ (catalysed) = 50 kJ/mol forward, 80 kJ/mol reverse: both 50 kJ/mol lower than uncatalysed; ΔH is the same',
    )
  })

  it('gives each step and intermediate of a mechanism, and the rate-determining step when it’s clear cut', () => {
    expect(answerLines(settingsOf('levels=40_120_70_100_10'))).toEqual([
      'ΔH = −30 kJ/mol: exothermic',
      'Step 1: Eₐ = 80 kJ/mol (reverse 50 kJ/mol)',
      'Intermediate at 70 kJ/mol',
      'Step 2: Eₐ = 30 kJ/mol (reverse 90 kJ/mol)',
      'Rate-determining step: step 1, with the highest activation energy',
    ])
    expect(answerLines(settingsOf('levels=30_100_80_120_0')).join(' ')).not.toContain('Rate-determining')
  })

  it('never gives a value left blank, lettered or as a symbol in the screen-reader label', () => {
    for (const label of ['symbol', 'mark', 'blank', 'none']) {
      const s = settingsOf(`eaLabel=${label}&dhLabel=${label}&revEaArrow=1&revEaLabel=${label}&catalyst=1&catEaLabel=${label}`)
      const said = describeFigure(s)
      for (const v of ['100', '30', '130', '50', '80']) expect(said, `${label}: ${said}`).not.toContain(v)
      expect(said).not.toMatch(/exothermic|endothermic/)
      // The answer key still has them.
      expect(answerLines(s).join(' ')).toContain('−30')
    }
    expect(describeFigure(settingsOf('dhLabel=value'))).toContain('ΔH = −30 kJ/mol')
  })
})

describe('the labels and arrows', () => {
  const sizes = Object.keys(LABEL_SIZES) as LabelSize[]
  for (const setup of SETUPS) {
    for (const labelSize of sizes) {
      it(`touch nothing in the ${setup.name.toLowerCase()} setup, ${labelSize}`, () => {
        const s = settingsFor(setup, energySettings.defaults, { ...energySettings.defaults, labelSize })
        expect(clashes(buildDiagram(s))).toEqual([])
      })
    }
  }

  const variants: [string, string][] = [
    ['every arrow with its value', 'eaLabel=value&dhLabel=value&revEaArrow=1&revEaLabel=value'],
    ['a catalyst, every arrow with its value', 'catalyst=1&catTs=100&eaLabel=value&catEaLabel=value&dhLabel=value'],
    ['an endothermic reaction with its reverse Ea', 'levels=20_150_80&revEaArrow=1&yTo=180'],
    ['three steps', 'levels=30_110_60_130_50_90_-20&yFrom=-40&yTo=160&yStep=20'],
    ['a level diagram with ΔH’s value', 'style=levels&dhLabel=value'],
    ['arrows lettered and blank', 'eaLabel=mark&dhLabel=blank&revEaArrow=1&revEaLabel=mark'],
  ]
  for (const [name, query] of variants) {
    for (const labelSize of sizes) {
      it(`touch nothing with ${name}, ${labelSize}`, () => {
        const s: EnergySettings = settingsOf(`${query}&labelSize=${labelSize}`)
        expect(clashes(buildDiagram({ ...s, ...fittedAxes(s) }))).toEqual([])
      })
    }
  }
})
