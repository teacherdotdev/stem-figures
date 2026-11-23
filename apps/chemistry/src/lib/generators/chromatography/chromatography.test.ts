import { describe, expect, it } from 'vitest'
import { render } from 'svelte/server'
import ChromatographyFigure from './ChromatographyFigure.svelte'
import { INK_HEX, mixedHex, nextSampleName, rfText, typedFront } from './inks'
import { textWidth } from '$shared/graph/labels'
import { NAME_FONT, PX, chromatogramLayout, spread } from './layout'
import { answerLines, sampleName, chromatographySettings as def } from './settings'

const settings = (query: string) => def.fromParams(new URLSearchParams(query))

describe('Chromatography settings', () => {
  it('reads and writes the samples in the address', () => {
    const s = settings('samples=X:red-3.2,blue-6_Red:red-3.2')
    expect(s.samples).toEqual([
      { name: 'X', spots: [{ color: 'red', distance: 3.2 }, { color: 'blue', distance: 6 }] },
      { name: 'Red', spots: [{ color: 'red', distance: 3.2 }] },
    ])
    expect(settings(def.toQuery(s))).toEqual(s)
  })

  it('keeps the defaults for samples it can’t read', () => {
    for (const bad of ['', 'A', 'A:teal-3', 'A:blue-x', 'A:', 'A:blue-1_B:'])
      expect(settings(`samples=${encodeURIComponent(bad)}`).samples, bad).toEqual(def.defaults.samples)
  })

  it('keeps every spot at or below the solvent front', () => {
    const s = settings('front=5&samples=A:blue-7.3,red-0')
    expect(s.samples[0].spots.map((p) => p.distance)).toEqual([5, 0])
  })

  it('gives each spot’s Rf in the answer key', () => {
    expect(answerLines(def.defaults)[0]).toBe('A: blue Rf = 0.70, yellow Rf = 0.30')
    expect(rfText(4.4, 8)).toBe('0.55')
  })
})

describe('typing in the settings', () => {
  it('takes a solvent front only once it’s in range while typing, and clamps it after', () => {
    expect(typedFront(1, false)).toBeUndefined() // the 1 of 12
    expect(typedFront(12, false)).toBe(12)
    expect(typedFront(4.56, false)).toBe(4.6)
    expect(typedFront(1, true)).toBe(4)
    expect(typedFront(40, true)).toBe(15)
    expect(typedFront(NaN, true)).toBeUndefined()
  })

  it('names a new ink with the first letter no ink has', () => {
    expect(nextSampleName(['A', 'C'])).toBe('B')
    expect(nextSampleName(['A', 'B', 'C'])).toBe('D')
    expect(nextSampleName(['X', 'Red'])).toBe('A')
  })
})

describe('mixing an ink before it separates', () => {
  it('is the one color of a one-color ink', () => {
    expect(mixedHex([{ color: 'red', distance: 3 }])).toBe(INK_HEX.red)
  })

  it('darkens as dyes are added, like paint', () => {
    const lightness = (hex: string) => [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0)
    const green = mixedHex([{ color: 'blue', distance: 5 }, { color: 'yellow', distance: 2 }])
    const black = mixedHex([{ color: 'blue', distance: 5 }, { color: 'yellow', distance: 2 }, { color: 'red', distance: 4 }])
    expect(lightness(green)).toBeLessThan(lightness(INK_HEX.blue))
    expect(lightness(black)).toBeLessThan(lightness(green))
  })
})

describe('Chromatography layout', () => {
  it('draws each spot its distance above the origin line, to scale', () => {
    const l = chromatogramLayout(def.defaults)
    expect(l.originY - l.frontY).toBe(8 * PX)
    expect(l.originY - l.lanes[0].spots[0].y).toBeCloseTo(5.6 * PX)
  })

  it('keeps the solvent below the origin line', () => {
    for (const show of ['after', 'both'] as const) {
      const l = chromatogramLayout({ ...def.defaults, show })
      for (const p of l.panels) expect(p.waterY!).toBeGreaterThan(p.paperY + l.originY)
    }
  })

  it('shows a second paper, before, only when asked', () => {
    expect(chromatogramLayout(def.defaults).panels.map((p) => p.stage)).toEqual(['after'])
    expect(chromatogramLayout({ ...def.defaults, show: 'both' }).panels.map((p) => p.stage)).toEqual(['before', 'after'])
  })

  it('draws the paper alone without the setup', () => {
    const l = chromatogramLayout({ ...def.defaults, setup: false })
    expect(l.panels[0].beaker).toBeNull()
    expect(l.width).toBe(l.paperW)
  })

  it('gives each measurement its own column, and none to a spot that stayed put', () => {
    const s = settings('measurements=1&samples=A:blue-5,red-0,yellow-2')
    const l = chromatogramLayout(s)
    const [blue, red, yellow] = l.lanes[0].spots
    expect(red.arrowX).toBeNull()
    expect(yellow.arrowX!).toBeLessThan(blue.arrowX!)
    expect(l.frontArrowX).not.toBeNull()
    expect(chromatogramLayout(def.defaults).lanes[0].spots.every((p) => p.arrowX === null)).toBe(true)
  })

  it('spaces part labels so their words don’t overlap', () => {
    const l = chromatogramLayout({ ...def.defaults, labels: true })
    expect(l.labels.map((p) => p.text)).toContain('Water (solvent)')
    for (let i = 1; i < l.labels.length; i++) expect(l.labels[i].textY - l.labels[i - 1].textY).toBeGreaterThanOrEqual(18.99)
    expect(spread([10, 12, 14], 10)).toEqual([2, 12, 22])
  })

  it('calls the rod the paper hangs from a glass rod', () => {
    const texts = chromatogramLayout({ ...def.defaults, labels: true }).labels.map((p) => p.text)
    expect(texts).toContain('Glass rod')
    expect(texts).not.toContain('Lid')
  })

  it('makes room for a long solvent name in the part labels', () => {
    const solvent = 'Ethanol and water 1 to 1'
    const l = chromatogramLayout({ ...def.defaults, labels: true, solvent })
    expect(l.width).toBeGreaterThanOrEqual(l.labelX + textWidth(`${solvent} (solvent)`, 13))
  })

  it('is wide enough for its answer key, with the drawing centered over it', () => {
    const l = chromatogramLayout({ ...def.defaults, answerKey: true })
    const widest = Math.max(...answerLines(def.defaults).map((line) => textWidth(line, 18)))
    expect(l.width + 2 * 16).toBeGreaterThanOrEqual(widest)
    const p = l.panels[0]
    expect(p.left + p.right).toBeCloseTo(l.width, 6)
    expect(chromatogramLayout(def.defaults).width).toBe(chromatogramLayout({ ...def.defaults, answerKey: false }).width)
  })

  it('keeps the samples’ names apart and on the paper', () => {
    for (const measurements of [false, true]) {
      const s = settings(`measurements=${measurements ? 1 : 0}&setup=0&samples=Unknown+ink:red-2_Food+dye+1:blue-3_:green-4_B:red-1`)
      const l = chromatogramLayout(s)
      const boxes = l.lanes.map((lane, i) => {
        const half = textWidth(sampleName(s.samples[i], i), NAME_FONT) / 2
        return [lane.x - half, lane.x + half]
      })
      expect(boxes[0][0]).toBeGreaterThanOrEqual(0)
      expect(boxes[boxes.length - 1][1]).toBeLessThanOrEqual(l.paperW)
      for (let i = 1; i < boxes.length; i++) expect(boxes[i][0], `${measurements} ${i}`).toBeGreaterThan(boxes[i - 1][1])
    }
    // short names keep the usual lanes
    expect(chromatogramLayout(def.defaults).lanes.map((lane) => lane.x)).toEqual([44, 96, 148])
  })
})

describe('Chromatography figure', () => {
  it('draws a short measurement with its arrows pointing in from outside, never upside down', () => {
    const s = settings('measurements=1&front=15&samples=A:red-0.1,blue-0.3,green-6')
    const { body } = render(ChromatographyFigure, { props: { settings: s } })
    const lines = [...body.matchAll(/<line x1="([\d.-]+)" x2="([\d.-]+)" y1="([\d.-]+)" y2="([\d.-]+)"/g)].map((m) => m.slice(1).map(Number))
    const upright = lines.filter(([x1, x2]) => x1 === x2)
    expect(upright.length).toBeGreaterThanOrEqual(4)
    for (const [, , y1, y2] of upright) expect(y1).toBeLessThan(y2)
    expect(body).toContain('0.1 cm')
  })
})
