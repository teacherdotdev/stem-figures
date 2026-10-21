import { describe, expect, it } from 'vitest'
import { textBox } from '$shared/graph/labels'
import { runsWidth } from '$shared/graph/runs'
import { overlaps } from '$lib/graph/testing'
import { buildAdAs } from './figure'
import { AS_SHAPES, LABEL_KEYS, SHIFTS, STARTS, adAsSettings, type AdAsSettings } from './settings'
import { SETUPS, settingsFor } from './setups'

const build = (over: Partial<AdAsSettings> = {}) => buildAdAs(adAsSettings.tidy({ ...adAsSettings.defaults, ...over }))
const panel = (over: Partial<AdAsSettings> = {}) => build(over).figure.panels[0]
const texts = (over: Partial<AdAsSettings>) => panel(over).labels.map((l) => l.runs?.map((r) => r.text).join('') ?? '')

type Panel = ReturnType<typeof panel>
type Pt = { x: number; y: number }
/** Each curve drawn, as the segments of its path. */
const curveSegments = (p: Panel) =>
  p.curves.flatMap((c) =>
    c.paths.flatMap((d) => {
      const pts = [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({ x: +m[1], y: +m[2] }))
      return pts.slice(1).map((q, k) => [pts[k], q] as [Pt, Pt])
    }),
  )
/** Whether two segments cross, short of their ends. */
function cross([a, b]: [Pt, Pt], [c, d]: [Pt, Pt]) {
  const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x)
  if (!den) return false
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den
  return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999
}
/** How near a segment comes to a label's box, sampled along it. */
function gapTo([a, b]: [Pt, Pt], box: { x0: number; y0: number; x1: number; y1: number }) {
  let gap = Infinity
  for (let t = 0; t <= 1; t += 0.01) {
    const x = a.x + (b.x - a.x) * t
    const y = a.y + (b.y - a.y) * t
    gap = Math.min(gap, Math.hypot(Math.max(box.x0 - x, 0, x - box.x1), Math.max(box.y0 - y, 0, y - box.y1)))
  }
  return gap
}
/** The equilibrium names (E, E₁, E₂) that come within 3 of a curve or a guide. */
function crowdedNames(p: Panel) {
  const lines = [...curveSegments(p), ...p.guides.map((g) => [{ x: g.x1, y: g.y1 }, { x: g.x2, y: g.y2 }] as [Pt, Pt])]
  return p.labels
    .filter((l) => l.runs && /^E\d?$/.test(l.runs.map((r) => r.text).join('')))
    .filter((l) => lines.some((s) => gapTo(s, textBox(l, runsWidth(l.runs!, p.labelFs), p.labelFs)) < 3))
    .map((l) => l.runs!.map((r) => r.text).join(''))
}

describe('AD–AS model', () => {
  it('meets AD, SRAS and LRAS at one point in long-run equilibrium', () => {
    const g = build()
    expect(g.equilibrium!.x).toBeCloseTo(5)
    expect(g.equilibrium!.y).toBeCloseTo(5)
    expect(g.yf.before).toBeCloseTo(5)
    expect(g.gap).toBeNull()
    // Output at full employment is written once, as Y_f.
    expect(texts({})).toEqual(expect.arrayContaining(['AD', 'SRAS', 'LRAS', 'E', 'PLe', 'Yf', 'Price Level', 'Real GDP']))
    expect(texts({})).not.toContain('Ye')
    expect(g.figure.panels[0].braces).toHaveLength(0)
  })

  it('starts short of or past full employment, with the gap braced under the axis', () => {
    const r = build({ start: 'recession' })
    expect(r.gap!.kind).toBe('recession')
    expect(r.gap!.output).toBeLessThan(r.gap!.potential)
    expect(texts({ start: 'recession' })).toEqual(expect.arrayContaining(['Recessionary gap', 'Ye', 'Yf']))
    const i = build({ start: 'inflation' })
    expect(i.gap!.kind).toBe('inflation')
    expect(i.gap!.output).toBeGreaterThan(i.gap!.potential)
    expect(texts({ start: 'inflation' })).toContain('Inflationary gap')
    // The brace sits under the values at the x-axis.
    const p = panel({ start: 'recession' })
    expect(p.braces).toHaveLength(1)
    const yf = p.labels.find((l) => l.runs?.map((x) => x.text).join('') === 'Yf')!
    const gap = p.labels.find((l) => l.runs?.[0].text === 'Recessionary gap')!
    expect(gap.y).toBeGreaterThan(yf.y)
    expect(texts({ start: 'recession', brace: false })).not.toContain('Recessionary gap')
  })

  it('closes a recessionary gap with expansionary policy: output to Y_f, price level up', () => {
    const g = build({ start: 'recession', adShift: 'full' })
    expect(g.equilibrium!.x).toBeCloseTo(g.yf.after)
    expect(g.equilibrium!.y).toBeGreaterThan(g.e1!.y)
    // The gap braced is the one it started with.
    expect(g.gap!.kind).toBe('recession')
    expect(texts({ start: 'recession', adShift: 'full' })).toEqual(expect.arrayContaining(['AD1', 'AD2', 'E1', 'E2', 'PL1', 'PL2', 'Y1', 'Yf']))
  })

  it('self-adjusts from a recessionary gap: SRAS right, output to Y_f, price level down', () => {
    const g = build({ start: 'recession', srasShift: 'full' })
    expect(g.equilibrium!.x).toBeCloseTo(g.yf.after)
    expect(g.equilibrium!.y).toBeLessThan(g.e1!.y)
    expect(texts({ start: 'recession', srasShift: 'full' })).toEqual(expect.arrayContaining(['SRAS1', 'SRAS2']))
  })

  it('makes stagflation from a negative supply shock: price level up, output down, a recessionary gap', () => {
    const g = build({ srasShift: 'left' })
    expect(g.equilibrium!.y).toBeGreaterThan(5)
    expect(g.equilibrium!.x).toBeLessThan(5)
    expect(g.gap!.kind).toBe('recession')
  })

  it('grows: LRAS right to a new Y_f, with SRAS following it there', () => {
    const g = build({ lrasShift: 'right', srasShift: 'full' })
    expect(g.yf.after).toBeGreaterThan(g.yf.before)
    expect(g.equilibrium!.x).toBeCloseTo(g.yf.after)
    expect(g.gap).toBeNull()
    expect(texts({ lrasShift: 'right', srasShift: 'full' })).toEqual(expect.arrayContaining(['LRAS1', 'LRAS2', 'Yf1', 'Yf2']))
    expect(panel({ lrasShift: 'right', arrows: 3 }).arrows).toHaveLength(3)
  })

  it('draws shift arrows crossing no other curve, fewer of them where there is room for fewer', () => {
    for (const setup of SETUPS) {
      const p = buildAdAs(settingsFor(setup, adAsSettings.defaults, adAsSettings.defaults)).figure.panels[0]
      const crossing = p.arrows.filter((a) => curveSegments(p).some((s) => cross([{ x: a.x1, y: a.y1 }, { x: a.x2, y: a.y2 }], s)))
      expect([setup.id, crossing]).toEqual([setup.id, []])
    }
    // SRAS following LRAS right has room for one arrow left of both LRAS lines.
    const growth = panel({ lrasShift: 'right', srasShift: 'full' })
    expect(growth.arrows.filter((a) => a.color === growth.curves[2].color)).toHaveLength(1)
  })

  it('puts each equilibrium name clear of the curves and guides through its point', { timeout: 30000 }, () => {
    for (const setup of SETUPS) {
      for (const labelSize of ['small', 'medium', 'large'] as const) {
        const s = settingsFor(setup, adAsSettings.defaults, { ...adAsSettings.defaults, labelSize })
        expect([setup.id, labelSize, crowdedNames(buildAdAs(s).figure.panels[0])]).toEqual([setup.id, labelSize, []])
      }
    }
    for (const asShape of AS_SHAPES) {
      for (const start of STARTS) {
        for (const adShift of SHIFTS) {
          for (const srasShift of SHIFTS) {
            expect([asShape, start, adShift, srasShift, crowdedNames(panel({ asShape, start, adShift, srasShift }))]).toEqual([asShape, start, adShift, srasShift, []])
          }
        }
      }
    }
  })

  it('turns the three-range curve vertical at full employment, with no LRAS line of its own', () => {
    const g = build({ asShape: 'three', start: 'recession' })
    // A dashed guide down from where it turns vertical, to Y_f.
    const p = g.figure.panels[0]
    const yf = p.px({ x: g.yf.before, y: 0 }).x
    expect(p.guides.some((l) => l.x1 === l.x2 && Math.abs(l.x1 - yf) < 0.5)).toBe(true)
    expect(p.curves).toHaveLength(2)
    expect(texts({ asShape: 'three', start: 'recession' })).not.toContain('LRAS')
    // A cost shock raises its flat range and leaves its vertical range at full employment: price level up, output down.
    const shock = build({ asShape: 'three', srasShift: 'left' })
    expect(shock.equilibrium!.y).toBeGreaterThan(shock.e1!.y)
    expect(shock.equilibrium!.x).toBeLessThan(shock.e1!.x)
    // Growth moves its vertical range out with full employment, and output with it.
    const growth = build({ asShape: 'three', lrasShift: 'right', srasShift: 'full' })
    expect(growth.equilibrium!.x).toBeCloseTo(growth.yf.after)
    expect(growth.gap).toBeNull()
    // Output can't pass full employment, so it starts with no inflationary gap.
    expect(build({ asShape: 'three', start: 'inflation' }).gap).toBeNull()
  })

  it('shifts the whole three-range curve', () => {
    const a = build({ asShape: 'three', start: 'recession' })
    const b = build({ asShape: 'three', start: 'recession', srasShift: 'right' })
    expect(a.gap!.kind).toBe('recession')
    expect(b.equilibrium!.x).toBeGreaterThan(a.equilibrium!.x)
    expect(b.equilibrium!.y).toBeLessThan(a.equilibrium!.y)
    // Flat at a low price level: more demand there raises the price level far less than near full employment.
    const low = build({ asShape: 'three', start: 'recession', gapSize: 'large', adShift: 'right', adSize: 'small' })
    const high = build({ asShape: 'three', adShift: 'right', adSize: 'small' })
    expect(low.equilibrium!.y - low.e1!.y).toBeLessThan((high.equilibrium!.y - high.e1!.y) / 2)
    expect(low.equilibrium!.x - low.e1!.x).toBeGreaterThan(2 * (high.equilibrium!.x - high.e1!.x))
  })

  it("shifts a numbered graph to a row of the schedule, so the values are the schedule's own and add up", () => {
    const num = { look: 'numeric', lrasLabel: 'Potential GDP', asLabel: 'AS' } as const
    expect(build({ ...num, adShift: 'right' }).equilibrium).toEqual({ x: expect.closeTo(9300), y: expect.closeTo(100) })
    expect(build({ ...num, adShift: 'left' }).equilibrium).toEqual({ x: expect.closeTo(8000), y: expect.closeTo(80) })
    expect(build({ ...num, srasShift: 'left' }).equilibrium).toEqual({ x: expect.closeTo(8200), y: expect.closeTo(100) })
    expect(build({ ...num, adShift: 'right' }).readout.at(-1)).toBe('Recessionary gap of 200: real GDP 9,300, potential 9,500')
    // No dot of the schedule's left touching an equilibrium's.
    const p = panel({ ...num, adShift: 'right' })
    const e2 = p.px({ x: 9300, y: 100 })
    expect(p.dots.filter((d) => Math.hypot(d.x - e2.x, d.y - e2.y) < 11)).toHaveLength(1)
  })

  it('names each curve on a numbered graph past the dot at its end', () => {
    const p = panel({ look: 'numeric', asLabel: 'AS' })
    const ad = p.labels.find((l) => l.runs?.map((r) => r.text).join('') === 'AD')!
    expect(ad.x).toBeGreaterThan(p.px({ x: 10000, y: 70 }).x + 4)
  })

  it('solves the numbered example at price level 90 and real GDP 8,800, with its callout', () => {
    const g = build({ look: 'numeric', callout: true })
    expect(g.equilibrium!.x).toBeCloseTo(8800)
    expect(g.equilibrium!.y).toBeCloseTo(90)
    expect(g.callout.text).toBe('price level = 90, real GDP = 8,800')
    expect(g.readout[0]).toBe('Equilibrium: price level 90, real GDP 8,800')
    expect(g.gap).toEqual({ kind: 'recession', output: expect.closeTo(8800), potential: 9500 })
    // Written on two lines, with a leader to the point.
    const p = g.figure.panels[0]
    expect(p.leaders).toHaveLength(1)
    expect(texts({ look: 'numeric', callout: true })).toEqual(expect.arrayContaining(['price level = 90,', 'real GDP = 8,800']))
    // Straight from row to row, too.
    expect(build({ look: 'numeric', smooth: false }).equilibrium).toEqual({ x: 8800, y: 90 })
  })

  it('names both ends of the gap braced, even with no guides', () => {
    const numbered = SETUPS.find((s) => s.id === 'numbered')!
    const p = buildAdAs(settingsFor(numbered, adAsSettings.defaults, adAsSettings.defaults)).figure.panels[0]
    const at = (t: string) => p.labels.find((l) => l.runs?.map((r) => r.text).join('') === t)
    expect(p.guides).toHaveLength(0)
    expect(p.braces).toHaveLength(1)
    // Yₑ at 8,800 and Y_f at 9,500, the brace's ends.
    expect(at('Ye')!.x).toBeCloseTo(p.px({ x: 8800, y: 60 }).x, 0)
    expect(at('Yf')!.x).toBeCloseTo(p.px({ x: 9500, y: 60 }).x, 0)
    // With no guides and no brace, output at equilibrium isn't written.
    expect(texts({ look: 'numeric', guides: false, brace: false })).not.toContain('Ye')
  })

  it('writes a typed callout, or names the equilibrium on a schematic graph', () => {
    expect(build({ callout: true }).callout.text).toBe('Long-run equilibrium')
    expect(build({ callout: true, start: 'recession' }).callout.text).toBe('Short-run equilibrium')
    expect(build({ callout: true, calloutLabel: 'Here' }).callout.text).toBe('Here')
    expect(texts({ callout: true, calloutLabel: 'Here' })).toContain('Here')
  })

  it('writes the callout in the open, clear of every curve, with an arrow long enough to read', () => {
    const cases: Partial<AdAsSettings>[] = [
      {}, { start: 'recession' }, { start: 'recession', adShift: 'full' }, { start: 'inflation', adShift: 'full', ink: 'bw' },
      { start: 'recession', calloutLabelMode: 'blank' }, { asShape: 'three', start: 'recession', asLabel: 'AS', labelSize: 'large' }, { lrasShift: 'right', srasShift: 'full' },
    ]
    for (const c of cases) {
      const p = panel({ ...c, callout: true })
      const words = p.labels.filter((l) => l.runs && /equilibrium/.test(l.runs.map((r) => r.text).join('')))
      const boxes = c.calloutLabelMode === 'blank' ? [] : words.map((l) => textBox(l, runsWidth(l.runs!, p.labelFs), p.labelFs))
      expect([c, boxes.filter((b) => curveSegments(p).some((seg) => gapTo(seg, b) < 3)).length]).toEqual([c, 0])
      const [leader] = p.leaders
      expect(Math.hypot(leader.x2 - leader.x1, leader.y2 - leader.y1)).toBeGreaterThan(14)
    }
  })

  it('writes the names of LRAS over their own lines, at one height', () => {
    for (const over of [{ lrasShift: 'right', srasShift: 'full' }, { lrasShift: 'left', srasShift: 'full' }, { lrasShift: 'right', srasShift: 'full', lrasLabel: 'Potential GDP' }] as const) {
      const p = panel(over)
      const names = p.labels.filter((l) => l.runs && /^(LRAS|Potential GDP)\d$/.test(l.runs.map((r) => r.text).join('')))
      expect(names).toHaveLength(2)
      expect(names[0].y).toBeCloseTo(names[1].y)
      // Each over its own line: LRAS₁ at Y_f₁, LRAS₂ at Y_f₂, nearer its own than the other.
      const g = build(over)
      for (const [k, yf] of [g.yf.before, g.yf.after].entries()) {
        const l = names.find((n) => n.runs!.map((r) => r.text).join('').endsWith(String(k + 1)))!
        const w = runsWidth(l.runs!, p.labelFs)
        const mid = l.anchor === 'middle' ? l.x : l.anchor === 'end' ? l.x - w / 2 : l.x + w / 2
        const own = p.px({ x: yf, y: 0 }).x
        const other = p.px({ x: k ? g.yf.before : g.yf.after, y: 0 }).x
        expect(Math.abs(mid - own)).toBeLessThan(Math.abs(mid - other))
      }
    }
    // Blank lines too, as on the worksheet.
    const blanks = panel({ lrasShift: 'right', srasShift: 'full', lrasLabelMode: 'blank' }).labels.filter((l) => l.blank && l.blank.y1 < 60)
    expect(blanks).toHaveLength(2)
  })

  it('never braces a gap too narrow to name: output a shift leaves near full employment is put on it or a little off', () => {
    for (const adSize of ['small', 'medium', 'large'] as const) {
      for (const start of STARTS) {
        for (const adShift of ['left', 'right'] as const) {
          const g = build({ start, adShift, adSize })
          if (g.gap) expect([start, adShift, adSize, Math.abs(g.gap.output - g.gap.potential)]).toEqual([start, adShift, adSize, expect.toSatisfy((d: number) => d >= 0.99)])
        }
      }
    }
    // Large enough to close the gap: closed.
    expect(build({ start: 'recession', adShift: 'right', adSize: 'large' }).equilibrium!.x).toBeCloseTo(6.5)
  })

  it('keeps each equilibrium name near its dot', () => {
    for (const setup of SETUPS) {
      for (const labelSize of ['small', 'medium', 'large'] as const) {
        const g = buildAdAs(settingsFor(setup, adAsSettings.defaults, { ...adAsSettings.defaults, labelSize }))
        const p = g.figure.panels[0]
        for (const [e, name] of [[g.e1, g.e1 === g.equilibrium ? 'E' : 'E1'], [g.equilibrium, 'E2']] as const) {
          const l = p.labels.find((x) => x.runs?.map((r) => r.text).join('') === name)
          if (!l || !e) continue
          const b = textBox(l, runsWidth(l.runs!, p.labelFs), p.labelFs)
          const d = p.px(e)
          const gap = Math.hypot(Math.max(b.x0 - d.x, 0, d.x - b.x1), Math.max(b.y0 - d.y, 0, d.y - b.y1))
          expect([setup.id, labelSize, name, gap < p.labelFs * 2.2]).toEqual([setup.id, labelSize, name, true])
        }
      }
    }
  })

  it('keeps shift arrows off the dashed guides and apart from each other', () => {
    for (const setup of SETUPS) {
      const p = buildAdAs(settingsFor(setup, adAsSettings.defaults, adAsSettings.defaults)).figure.panels[0]
      for (const a of p.arrows) {
        // The head clear of every guide.
        const near = p.guides.filter((l) => gapTo([{ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }], { x0: a.x2, x1: a.x2, y0: a.y2, y1: a.y2 }) < 4)
        expect([setup.id, near]).toEqual([setup.id, []])
        // Not running on from another, where the two would read as one.
        const runsOn = p.arrows.filter((b) => b !== a && Math.abs(b.y1 - a.y1) < 12 && Math.min(Math.abs(b.x1 - a.x2), Math.abs(b.x2 - a.x1)) < 30)
        expect([setup.id, runsOn]).toEqual([setup.id, []])
      }
    }
  })

  it('says what a shift to full employment does when output is already there', () => {
    expect(build({ adShift: 'full' }).notes).toEqual(['Output is already at full employment, so AD stays where it is.'])
    expect(build({}).label).toBe('AD–AS graph: long-run equilibrium at full employment')
  })

  it('warns when it cannot draw what is asked', () => {
    expect(build({ look: 'numeric', schedule: '1,5,3' }).notes[0]).toMatch(/at least two rows/)
    expect(build({ look: 'numeric', potential: 50000, fit: false }).notes.join(' ')).toMatch(/Potential GDP is off/)
    expect(build({ start: 'recession', lras: false }).notes.join(' ')).toMatch(/LRAS is hidden/)
    expect(build({ look: 'numeric', fit: false, yFrom: '60', yTo: '85', yStep: '5' }).notes.join(' ')).toMatch(/cross off the graph/)
  })

  it('draws every label as a blank line when asked', () => {
    const blanks = Object.fromEntries(LABEL_KEYS.map((k) => [`${k}Mode`, 'blank']))
    expect(panel({ start: 'recession', adShift: 'full', ...blanks }).labels.every((l) => l.blank || (l.runs && ['Price Level', 'Real GDP'].includes(l.runs[0].text)))).toBe(true)
  })

  it('never overlaps two labels, in any setup or combination of start and shifts', { timeout: 30000 }, () => {
    for (const setup of SETUPS) {
      for (const labelSize of ['small', 'medium', 'large'] as const) {
        const s = settingsFor(setup, adAsSettings.defaults, { ...adAsSettings.defaults, labelSize })
        expect([setup.id, labelSize, overlaps(buildAdAs({ ...s, callout: true }).figure)]).toEqual([setup.id, labelSize, []])
      }
    }
    for (const asShape of AS_SHAPES) {
      for (const start of STARTS) {
        for (const adShift of SHIFTS) {
          for (const srasShift of SHIFTS) {
            const f = build({ asShape, start, adShift, srasShift }).figure
            expect([asShape, start, adShift, srasShift, overlaps(f)]).toEqual([asShape, start, adShift, srasShift, []])
          }
        }
      }
    }
  })

  it('keeps the defaults out of the address, and reads back what it wrote', () => {
    expect(adAsSettings.toQuery(adAsSettings.defaults)).toBe('')
    const s = adAsSettings.tidy({ ...adAsSettings.defaults, start: 'recession', adShift: 'full', lrasShift: 'right', adLabel: 'AD_{new}', look: 'numeric', callout: true })
    expect(adAsSettings.fromParams(new URLSearchParams(adAsSettings.toQuery(s)))).toEqual(s)
  })
})
