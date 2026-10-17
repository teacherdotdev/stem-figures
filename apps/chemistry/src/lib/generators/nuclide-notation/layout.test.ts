import { describe, expect, it } from 'vitest'
import { layoutHyphen, layoutNuclide, textWidth, type NuclideParts, type Placed, type PlacedBlank, type PlacedText } from './layout'

const look = { font: 'sans', size: 80 } as const
const parts = (mass: string | null, z: string | null, symbol: string, charge = ''): NuclideParts => ({
  mass: mass === null ? null : { text: mass },
  z: z === null ? null : { text: z },
  symbol: { text: symbol },
  charge: charge ? { text: charge } : null,
})
const text = (p: Placed | undefined) => p as PlacedText
const box = (p: Placed | undefined) => p as PlacedBlank
/** Where a text's ink starts and ends, from its anchor and estimated width. */
const extent = (p: PlacedText, font: 'sans' | 'serif' = 'sans') => {
  const w = textWidth(p.text, p.size, font)
  const start = p.anchor === 'end' ? p.x - w : p.anchor === 'middle' ? p.x - w / 2 : p.x
  return { start, end: start + w }
}

describe('a nuclide symbol’s layout', () => {
  it('ends the mass and atomic numbers at the symbol’s left edge', () => {
    const l = layoutNuclide(parts('235', '92', 'U'), look)
    const mass = text(l.mass)
    const z = text(l.z)
    expect([mass.anchor, z.anchor]).toEqual(['end', 'end'])
    expect(mass.x).toBe(z.x)
    expect(mass.x).toBeLessThan(l.symbolX)
    expect(l.symbolX - mass.x).toBeLessThan(0.1 * look.size)
    expect(text(l.symbol)).toMatchObject({ x: l.symbolX, anchor: 'start' })
  })

  it('puts the mass number above the symbol’s middle and the atomic number below it', () => {
    const l = layoutNuclide(parts('14', '6', 'C'), look)
    expect(text(l.mass).y).toBeLessThan(l.baseline - 0.3 * look.size)
    expect(text(l.z).y).toBeGreaterThan(l.baseline)
    expect(text(l.mass).size).toBeLessThan(text(l.symbol).size)
  })

  it('lets the wider of the two numbers set the figure’s left side', () => {
    const narrow = layoutNuclide(parts('1', '1', 'H'), look)
    const wideMass = layoutNuclide(parts('235', '1', 'H'), look)
    const wideZ = layoutNuclide(parts('1', '235', 'H'), look)
    expect(wideMass.symbolX).toBeGreaterThan(narrow.symbolX)
    expect(wideZ.symbolX).toBe(wideMass.symbolX)
    // the wider number's left end is just inside the figure
    expect(extent(text(wideMass.mass)).start).toBeGreaterThan(0)
    expect(extent(text(wideMass.mass)).start).toBeLessThan(0.05 * look.size)
  })

  it('fits a two-letter symbol and a three-digit mass number inside the figure', () => {
    for (const font of ['sans', 'serif'] as const) {
      const l = layoutNuclide(parts('254', '102', 'No', '3+'), { font, size: 80 })
      for (const p of [l.mass, l.z, l.symbol].map(text)) {
        const { start, end } = extent(p, font)
        expect(start, `${font} ${p.text}`).toBeGreaterThanOrEqual(0)
        expect(end, `${font} ${p.text}`).toBeLessThanOrEqual(l.width)
      }
      // the charge after the symbol, inside the figure too
      const charge = text(l.charge)
      expect(charge.x).toBeGreaterThanOrEqual(extent(text(l.symbol), font).end)
      expect(extent(charge, font).end).toBeLessThanOrEqual(l.width)
      expect(l.height).toBeGreaterThan(l.baseline)
    }
  })

  it('leaves room for a negative bottom number’s sign', () => {
    const beta = layoutNuclide(parts('0', '−1', 'e'), look)
    const z = text(beta.z)
    expect(extent(z).start).toBeGreaterThan(0)
    // wider than a one-digit number, so the column is wider
    expect(beta.symbolX).toBeGreaterThan(layoutNuclide(parts('0', '1', 'e'), look).symbolX)
  })

  it('is the same height whatever is left off, so a row of them lines up', () => {
    const full = layoutNuclide(parts('37', '17', 'Cl', '−'), look)
    const bare = layoutNuclide({ mass: null, z: null, symbol: { text: 'Cl' }, charge: null }, look)
    expect([bare.height, bare.baseline]).toEqual([full.height, full.baseline])
    expect(bare.symbolX).toBeLessThan(full.symbolX)
  })

  it('draws a blank the same size whatever it stands for', () => {
    const a = layoutNuclide({ ...parts('14', '6', 'C'), z: 'blank' }, look)
    const b = layoutNuclide({ ...parts('14', '92', 'U'), z: 'blank' }, look)
    expect(box(a.z).width).toBe(box(b.z).width)
    expect(box(a.z).kind).toBe('blank')
    // and ending at the symbol's left edge, as the numbers do
    expect(box(a.z).x + box(a.z).width).toBeCloseTo(text(a.mass).x, 9)
  })

  it('keeps the mass number’s and atomic number’s blanks apart', () => {
    const l = layoutNuclide({ mass: 'blank', z: 'blank', symbol: 'blank', charge: 'blank' }, look)
    const [mass, z, symbol, charge] = [l.mass, l.z, l.symbol, l.charge].map(box)
    expect(mass.y + mass.height).toBeLessThan(z.y)
    expect(mass.y).toBeGreaterThanOrEqual(0)
    expect(z.y + z.height).toBeLessThanOrEqual(l.height)
    expect(symbol.x).toBe(l.symbolX)
    expect(charge.x).toBeGreaterThan(symbol.x + symbol.width)
    expect(charge.x + charge.width).toBeLessThanOrEqual(l.width)
  })
})

describe('hyphen notation’s layout', () => {
  it('writes the name and mass number as one text', () => {
    const l = layoutHyphen({ text: 'carbon' }, { text: '14' }, 40, 'sans', true)
    expect(l.pieces).toEqual([expect.objectContaining({ kind: 'text', text: 'carbon-14', anchor: 'start' })])
  })

  it('anchors the text to a blank after it, so they never overlap', () => {
    const l = layoutHyphen({ text: 'oxygen' }, 'blank', 40, 'sans', true)
    const [name, blank] = l.pieces as [PlacedText, PlacedBlank]
    expect(name).toMatchObject({ text: 'oxygen-', anchor: 'end' })
    expect(name.x).toBeLessThan(blank.x)
    expect(blank.x + blank.width).toBeLessThan(l.width)
  })

  it('makes a name’s blank wider than a symbol’s', () => {
    const wide = layoutHyphen('blank', { text: '14' }, 40, 'sans', true)
    const narrow = layoutHyphen('blank', { text: '14' }, 40, 'sans', false)
    expect((wide.pieces[0] as PlacedBlank).width).toBeGreaterThan((narrow.pieces[0] as PlacedBlank).width)
    expect(wide.pieces[1]).toMatchObject({ text: '-14', anchor: 'start' })
  })
})
