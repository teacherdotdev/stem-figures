import { describe, expect, it } from 'vitest'
import { readAxes } from '$shared/graph/axes'
import { textWidth, type Box } from '$shared/graph/labels'
import { answerLines, buildEquilibrium, fittedAxes, labelOf, sig } from './figure'
import { REACTION_IDS } from './reactions'
import { equilibriumSettings, setupFields, stressesOf, type EquilibriumSettings } from './settings'

const make = (over: Partial<EquilibriumSettings> = {}) => equilibriumSettings.tidy({ ...equilibriumSettings.defaults, ...over })
/** Settings with the axes fitted, as the page fits them when a reaction is picked or a stress added. */
const fitted = (over: Partial<EquilibriumSettings> = {}) => {
  const s = make(over)
  return make({ ...s, ...fittedAxes(s) })
}
const overlap = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
/** The points of a path "M1,2L3,4". */
const points = (d: string) => d.slice(1).split('L').map((p) => p.split(',').map(Number))
const THREE = { count: 3 } as const

describe('settings', () => {
  it('start as ammonia settling with no stress, on axes fitted to it', () => {
    const s = equilibriumSettings.defaults
    expect([s.reaction, s.start1, s.start2, s.start3, s.k, s.count]).toEqual(['ammonia', 1, 3, 0, 0.5, 0])
    expect(fittedAxes(s)).toEqual({ xFrom: s.xFrom, xTo: s.xTo, xStep: s.xStep, xEvery: s.xEvery, yFrom: s.yFrom, yTo: s.yTo, yStep: s.yStep, yEvery: s.yEvery })
    expect([s.xTitle, s.yTitle]).toEqual(['Time (min)', 'Concentration (mol/L)'])
    expect(equilibriumSettings.toQuery(s)).toBe('')
  })

  it('write each stress’s words until the teacher types theirs, and nothing when they’re emptied', () => {
    expect(stressesOf(make(THREE)).map((d) => d.text)).toEqual(['N_2 added', 'Volume halved', 'Temperature raised'])
    expect(stressesOf(make({ count: 1, s1Kind: 'remove', s1Species: 3 }))[0].text).toBe('NH_3 removed')
    expect(stressesOf(make({ count: 1, s1Kind: 'volume', s1Amount: 2 }))[0].text).toBe('Volume doubled')
    expect(stressesOf(make({ count: 1, s1Kind: 'volume', s1Amount: 3 }))[0].text).toBe('Volume increased')
    expect(stressesOf(make({ count: 1, s1Kind: 'lower' }))[0].text).toBe('Temperature lowered')
    expect(stressesOf(make({ ...setupFields('fescn'), count: 2, s1Kind: 'volume', s1Amount: 2 })).map((d) => d.text)).toEqual(['Water added', 'Water evaporated'])
    expect(stressesOf(make({ ...setupFields('fescn'), count: 1 }))[0].text).toBe('Fe^{3+} added')
    expect(stressesOf(make({ count: 1, s1Text: 'More nitrogen' }))[0].text).toBe('More nitrogen')
    expect(stressesOf(make({ count: 1, s1Text: '' }))[0].text).toBe('')
    // the address keeps an emptied one empty
    const back = equilibriumSettings.fromParams(new URLSearchParams(equilibriumSettings.toQuery(make({ count: 1, s1Text: '' }))))
    expect(back.s1Text).toBe('')
  })

  it('keep a stress’s species within the reaction, and its amount within what the kind allows', () => {
    expect(make({ ...setupFields('n2o4'), count: 1, s1Species: 3 }).s1Species).toBe(2)
    expect(stressesOf(make({ count: 1, s1Kind: 'volume', s1Amount: 50 }))[0].amount).toBe(10)
    // K changes 2 times whether it's written 2 or 0.5: the reaction's heat says which way
    expect(stressesOf(make({ count: 1, s1Kind: 'raise', s1Amount: 0.5 }))[0].amount).toBe(2)
    expect(stressesOf(make({ count: 1, s1Kind: 'lower', s1Amount: 4 }))[0].amount).toBe(4)
  })

  it('take stresses in order of time', () => {
    expect(stressesOf(make({ count: 3, s1At: 20, s2At: 5, s3At: 10 })).map((d) => d.slot)).toEqual([1, 2, 0])
  })
})

describe('the fitted axes', () => {
  it('hold every line of every setup, with and without stresses, with nothing to say', () => {
    for (const id of REACTION_IDS) {
      for (const count of [0, 1, 3]) {
        const s = fitted({ ...setupFields(id), count })
        const g = buildEquilibrium(s)
        expect(g.notes, `${id} ${count}`).toEqual([])
        const axes = readAxes(s)
        expect(Object.values(axes.problems).filter(Boolean), `${id} ${count}`).toEqual([])
        expect(axes.x.blocks, `${id} ${count}`).toBeLessThanOrEqual(22)
        expect(axes.y.blocks, `${id} ${count}`).toBeLessThanOrEqual(22)
        for (const c of g.curves) {
          expect(c.paths, `${id} ${count}`).toHaveLength(1)
          const pts = points(c.paths[0])
          // from the y-axis to the right edge, never off the grid
          expect(pts[0][0]).toBeCloseTo(g.grid.x, 1)
          expect(pts.at(-1)![0]).toBeCloseTo(g.grid.x + g.grid.w, 1)
          for (const [x, y] of pts) {
            expect(x).toBeGreaterThanOrEqual(g.grid.x - 0.01)
            expect(y).toBeGreaterThanOrEqual(g.grid.y - 0.01)
            expect(y).toBeLessThanOrEqual(g.grid.y + g.grid.h + 0.01)
          }
        }
      }
    }
  })

  it('fit small concentrations and quick reactions, never ending an axis at 0', () => {
    for (const over of [
      { ...setupFields('fescn'), start1: 0.002, start2: 0.002, start3: 0, k: 200 },
      { ...setupFields('fescn'), start1: 0.0005, start2: 0.0005, start3: 0, k: 1000 },
      { established: 0.002 },
      { start1: 0, start2: 0, start3: 0 },
    ]) {
      const s = fitted(over)
      expect(Object.values(readAxes(s).problems).filter(Boolean), JSON.stringify(over)).toEqual([])
      expect(Number(s.xTo)).toBeGreaterThan(0)
      expect(Number(s.yTo)).toBeGreaterThan(0)
      expect(buildEquilibrium(s).notes.filter((n) => !n.startsWith('Nothing can react')), JSON.stringify(over)).toEqual([])
    }
    expect(fitted({ ...setupFields('fescn'), start1: 0.002, start2: 0.002, start3: 0, k: 200 }).yTo).toBe('0.0024')
  })

    it('number the top of each axis', () => {
    for (const id of REACTION_IDS) {
      const s = fitted({ ...setupFields(id), count: 3 })
      const axes = readAxes(s)
      expect(axes.x.blocks % s.xEvery, id).toBe(0)
      expect(axes.y.blocks % s.yEvery, id).toBe(0)
    }
  })
})

describe('the figure', () => {
  it('draws a line for each species: solid, dashed and dotted, in color or all black', () => {
    const g = buildEquilibrium(make())
    expect(g.curves.map((c) => c.dash)).toEqual([undefined, '12 7', '3 5'])
    expect(new Set(g.curves.map((c) => c.color)).size).toBe(3)
    expect(new Set(buildEquilibrium(make({ color: false })).curves.map((c) => c.color)).size).toBe(1)
    expect(buildEquilibrium(fitted(setupFields('n2o4'))).curves).toHaveLength(2)
  })

  it('draws a jump at a stress as a vertical piece of the same line', () => {
    const s = fitted({ count: 1 })
    const g = buildEquilibrium(s)
    const mark = g.marks[0]
    const n2 = points(g.curves[0].paths[0])
    const at = n2.filter(([x]) => Math.abs(x - mark.line.x1) < 0.006)
    expect(at.length).toBe(2)
    // up the page: 0.5 mol/L added, at 0.2 mol/L to a 32-unit block
    expect(at[0][1] - at[1][1]).toBeCloseTo((0.5 / 0.2) * 32, 0)
    // the others bend there, with no jump
    for (const c of g.curves.slice(1)) {
      const there = points(c.paths[0]).filter(([x]) => Math.abs(x - mark.line.x1) < 0.006)
      expect(Math.abs(there[0][1] - there.at(-1)![1])).toBeLessThan(0.01)
    }
  })

  it('puts each formula beside its line, on the grid, touching no other formula', () => {
    for (const id of REACTION_IDS) {
      for (const labelSize of ['small', 'medium', 'large'] as const) {
        for (const count of [0, 3]) {
          const g = buildEquilibrium(fitted({ ...setupFields(id), count, labelSize }))
          expect(g.formulas).toHaveLength(g.curves.length)
          g.formulas.forEach((a, i) => {
            expect(a.box.x0, `${id} ${labelSize}`).toBeGreaterThanOrEqual(g.grid.x)
            expect(a.box.x1, `${id} ${labelSize}`).toBeLessThanOrEqual(g.grid.x + g.grid.w)
            expect(a.box.y0, `${id} ${labelSize}`).toBeGreaterThanOrEqual(g.grid.y)
            expect(a.box.y1, `${id} ${labelSize}`).toBeLessThanOrEqual(g.grid.y + g.grid.h)
            for (const b of g.formulas.slice(i + 1)) expect(overlap(a.box, b.box), `${id} ${labelSize} ${count}: ${a.text} on ${b.text}`).toBe(false)
            // …nor a stress's dashed line
            for (const m of g.marks) expect(m.line.x1 > a.box.x0 && m.line.x1 < a.box.x1, `${id} ${labelSize}: ${a.text} on a stress`).toBe(false)
          })
        }
      }
    }
    expect(buildEquilibrium(make({ speciesLabels: false })).formulas).toEqual([])
    expect(buildEquilibrium(make()).formulas.map((l) => l.text)).toEqual(['N₂', 'H₂', 'NH₃'])
  })

  it('writes each stress’s words above the grid, over its dashed line, clear of the others', () => {
    for (const labelSize of ['small', 'medium', 'large'] as const) {
      const g = buildEquilibrium(fitted({ ...THREE, labelSize }))
      expect(g.marks).toHaveLength(3)
      const boxes = g.marks.map((m) => {
        const w = m.spans.reduce((sum, sp) => sum + textWidth(sp.text, sp.size), 0)
        const x0 = m.anchor === 'middle' ? m.x - w / 2 : m.x
        return { x0, x1: x0 + w, y0: m.y - g.labelFs * 0.8, y1: m.y + g.labelFs * 0.3 }
      })
      boxes.forEach((a, i) => {
        expect(a.y1, labelSize).toBeLessThanOrEqual(g.grid.y)
        expect(a.y0, labelSize).toBeGreaterThanOrEqual(0)
        expect(a.x0, labelSize).toBeGreaterThanOrEqual(0)
        expect(a.x1, labelSize).toBeLessThanOrEqual(g.width)
        for (const b of boxes.slice(i + 1)) expect(overlap(a, b), labelSize).toBe(false)
        // no other stress's line runs through the words
        g.marks.forEach((m, j) => {
          if (j !== i) expect(m.line.x1 > a.x0 - 2 && m.line.x1 < a.x1 + 2 && m.line.y2 < a.y1, labelSize).toBe(false)
        })
      })
      for (const m of g.marks) {
        expect(m.line.y1).toBeCloseTo(g.grid.y + g.grid.h)
        expect(m.line.y2).toBeLessThanOrEqual(g.grid.y)
      }
    }
  })

  it('stacks the words of stresses close together, the earlier ones higher', () => {
    const g = buildEquilibrium(make({ count: 3, s1At: 3, s2At: 4, s3At: 5 }))
    expect(g.marks.map((m) => m.anchor)).toEqual(['start', 'start', 'start'])
    expect(g.marks[0].y).toBeLessThan(g.marks[1].y)
    expect(g.marks[1].y).toBeLessThan(g.marks[2].y)
    // and the grid moves down to make room, the chart title staying at the top
    const plain = buildEquilibrium(make())
    expect(g.grid.y).toBeGreaterThan(plain.grid.y)
    const titled = buildEquilibrium(make({ count: 1, titleMode: 'text', title: 'Haber process' }))
    expect(titled.labels.find((l) => l.kind === 'title')!.y).toBe(buildEquilibrium(make({ titleMode: 'text', title: 'Haber process' })).labels.find((l) => l.kind === 'title')!.y)
    expect(titled.height - titled.grid.y - titled.grid.h).toBeCloseTo(plain.height - plain.grid.y - plain.grid.h)
  })

  it('leaves a stress’s line without words when they’re emptied', () => {
    const g = buildEquilibrium(fitted({ count: 1, s1Text: '' }))
    expect(g.marks[0].spans).toEqual([])
    expect(g.grid.y).toBe(buildEquilibrium(make()).grid.y)
  })

  it('says what’s wrong when a stress can’t be drawn as set', () => {
    const notes = (over: Partial<EquilibriumSettings>) => buildEquilibrium(make(over)).notes
    expect(notes({ count: 1, s1At: 2 })).toEqual(['The stress comes at time 2, before the system has settled. Move it later, or make equilibrium establish sooner.'])
    expect(notes({ count: 1, s1At: 7.5 })).toEqual(['The time axis ends at 8, before the system has settled. Make it longer, or fit the axes.'])
    expect(notes({ count: 1, s1At: 30 })).toEqual(['The stress is at time 30, past the end of the time axis (8).'])
    expect(notes({ count: 1, s1At: 0 })).toEqual(['The stress needs a time after 0.'])
    expect(notes({ xTo: '2' })).toEqual(['The time axis ends at 2, before the system has settled. Make it longer, or fit the axes.'])
    expect(notes({ yTo: '2' })).toEqual(['A line reaches 3 mol/L, above the top of the y-axis (2).'])
    expect(notes({ start2: 0 })).toEqual(['Nothing can react from these starting concentrations: a reactant and a product are both at 0.'])
    const removed = notes({ count: 1, s1Kind: 'remove', s1Species: 3, s1Amount: 5, xTo: '16', xStep: '1' })
    expect(removed[0]).toBe('The stress removes 5 mol/L of NH₃, but only 0.972 mol/L is there, so all of it goes.')
    expect(notes({ count: 2, s1At: 6, s2At: 7, xTo: '16', xStep: '1', yTo: '8', yStep: '0.5' })[0]).toMatch(/^Stress 2 comes at time 7, before/)
    // two stresses at once act together: the second isn't early
    expect(notes({ count: 2, s1At: 8, s2At: 8, s2Kind: 'volume', xTo: '16', xStep: '1', yTo: '4' })).toEqual([])
  })
})

describe('the answer key', () => {
  it('starts with K, marked as an example value, and the equilibrium first reached', () => {
    expect(answerLines(make())).toEqual([
      'K = 0.5 (an example value, not measured)',
      'Equilibrium first reached: [N₂] = 0.514, [H₂] = 1.54, [NH₃] = 0.972 mol/L',
    ])
    expect(answerLines(make(setupFields('abc')))[0]).toBe('K = 5 (a made-up reaction)')
    // the teacher's own K is still not called measured: the page can't know
    expect(answerLines(make({ k: 0.06 }))[0]).toBe('K = 0.06 (an example value, not measured)')
  })

  it('gives each stress’s shift and new equilibrium, and the new K after a temperature change', () => {
    const lines = answerLines(make(THREE))
    expect(lines).toHaveLength(5)
    expect(lines[2]).toMatch(/^At time 8, N₂ added \(0\.5 mol\/L\): shifts right, toward the products\. New equilibrium: \[N₂\] = /)
    expect(lines[3]).toMatch(/^At time 16, volume × 0\.5 \(every concentration × 2\): shifts right, toward the products \(the side with fewer moles of gas\)\. New equilibrium: /)
    expect(lines[4]).toMatch(/^At time 24, temperature raised: K falls to 0\.25, shifts left, toward the reactants\. New equilibrium: /)
  })

  it('gives concentrations that make the K it says', () => {
    const numbers = (line: string) => [...line.matchAll(/= ([\d.]+)/g)].map((m) => Number(m[1]))
    const [, first, added] = answerLines(make({ count: 1 }))
    for (const line of [first, added]) {
      const [n2, h2, nh3] = numbers(line)
      expect(nh3 ** 2 / (n2 * h2 ** 3)).toBeCloseTo(0.5, 1)
    }
  })

  it('knows which way each reaction’s heat sends K', () => {
    const k = (over: Partial<EquilibriumSettings>) => answerLines(make({ count: 1, s1Kind: 'raise', ...over }))[2]
    expect(k({})).toContain('K falls to 0.25, shifts left')
    expect(k({ s1Kind: 'lower' })).toContain('K rises to 1, shifts right')
    expect(k(setupFields('n2o4'))).toContain('K rises to 0.4, shifts right')
    expect(k({ ...setupFields('pcl5'), s1Kind: 'lower' })).toContain('K falls to 0.25, shifts left')
    expect(k({ ...setupFields('abc') })).toContain('K falls to 2.5, shifts left')
    expect(k({ ...setupFields('abc'), heat: 'endothermic' })).toContain('K rises to 10, shifts right')
    expect(k({ ...setupFields('abc'), heat: 'endothermic', s1Amount: 4 })).toContain('K rises to 20')
  })

  it('says a volume change doesn’t shift equal moles, and which side the others go to', () => {
    const v = (over: Partial<EquilibriumSettings>) => answerLines(make({ count: 1, s1Kind: 'volume', ...over }))[2]
    expect(v(setupFields('hi'))).toMatch(/: no shift \(the same moles of gas on both sides\)\. Concentrations stay at \[H₂\] = /)
    expect(v(setupFields('n2o4'))).toContain('shifts left, toward the reactants (the side with fewer moles of gas)')
    expect(v({ ...setupFields('n2o4'), s1Amount: 2 })).toContain('volume × 2 (every concentration × 0.5): shifts right, toward the products (the side with more moles of gas)')
    expect(v({ ...setupFields('fescn'), s1Amount: 2 })).toContain('volume × 2 (water added, every concentration × 0.5): shifts left, toward the reactants (the side with more dissolved particles)')
  })

  it('says how much a removal took when there was less than asked for', () => {
    const lines = answerLines(make({ count: 1, s1Kind: 'remove', s1Species: 3, s1Amount: 5 }))
    expect(lines[2]).toMatch(/^At time 8, all the NH₃ removed \(0\.972 mol\/L\): shifts right/)
    expect(answerLines(make({ count: 1, s1Kind: 'remove', s1Species: 3, s1Amount: 0.3 }))[2]).toMatch(/^At time 8, NH₃ removed \(0\.3 mol\/L\): /)
  })

  it('gives two stresses at the same moment one shift, under the later one', () => {
    const lines = answerLines(make({ count: 2, s1At: 8, s2At: 8, s2Kind: 'volume' }))
    expect(lines).toHaveLength(4)
    expect(lines[2]).toBe('At time 8, N₂ added (0.5 mol/L), at the same moment as the next stress.')
    expect(lines[3]).toMatch(/^At time 8, volume × 0\.5 \(every concentration × 2\): shifts right, toward the products/)
  })

    it('writes numbers to three significant figures', () => {
    expect([sig(0.51413), sig(1.5424), sig(12.345), sig(0.25), sig(2)]).toEqual(['0.514', '1.54', '12.3', '0.25', '2'])
  })
})

describe('the screen reader label', () => {
  it('names the reaction and each stress, but not a stress whose words were emptied', () => {
    expect(labelOf(make())).toBe('Equilibrium graph of N₂ + 3H₂ ⇌ 2NH₃: concentration against time')
    expect(labelOf(make({ count: 2, s2Text: '' }))).toBe('Equilibrium graph of N₂ + 3H₂ ⇌ 2NH₃: concentration against time, with N₂ added at time 8 and a stress at time 16')
    expect(labelOf(make({ titleMode: 'text', title: 'Haber process' }))).toBe('Haber process')
  })
})
