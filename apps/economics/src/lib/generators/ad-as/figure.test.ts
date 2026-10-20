import { describe, expect, it } from 'vitest'
import { overlaps } from '$lib/graph/testing'
import { buildAdAs } from './figure'
import { AS_SHAPES, LABEL_KEYS, SHIFTS, STARTS, adAsSettings, type AdAsSettings } from './settings'
import { SETUPS, settingsFor } from './setups'

const build = (over: Partial<AdAsSettings> = {}) => buildAdAs(adAsSettings.tidy({ ...adAsSettings.defaults, ...over }))
const panel = (over: Partial<AdAsSettings> = {}) => build(over).figure.panels[0]
const texts = (over: Partial<AdAsSettings>) => panel(over).labels.map((l) => l.runs?.map((r) => r.text).join('') ?? '')

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
    expect(g.readout.join(' ')).toMatch(/Recessionary gap closed/)
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
    expect(g.readout.join(' ')).toMatch(/Price level rises; real GDP falls/)
  })

  it('grows: LRAS right to a new Y_f, with SRAS following it there', () => {
    const g = build({ lrasShift: 'right', srasShift: 'full' })
    expect(g.yf.after).toBeGreaterThan(g.yf.before)
    expect(g.equilibrium!.x).toBeCloseTo(g.yf.after)
    expect(g.gap).toBeNull()
    expect(texts({ lrasShift: 'right', srasShift: 'full' })).toEqual(expect.arrayContaining(['LRAS1', 'LRAS2', 'Yf1', 'Yf2']))
    expect(panel({ lrasShift: 'right', arrows: 3 }).arrows).toHaveLength(3)
  })

  it('shifts the whole three-range curve sideways', () => {
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

  it('writes a typed callout, or names the equilibrium on a schematic graph', () => {
    expect(build({ callout: true }).callout.text).toBe('Long-run equilibrium')
    expect(build({ callout: true, start: 'recession' }).callout.text).toBe('Short-run equilibrium')
    expect(build({ callout: true, calloutLabel: 'Here' }).callout.text).toBe('Here')
    expect(texts({ callout: true, calloutLabel: 'Here' })).toContain('Here')
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

  it('never overlaps two labels, in any setup or combination of start and shifts', () => {
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
