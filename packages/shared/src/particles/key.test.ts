import { describe, expect, it } from 'vitest'
import { KEY_PAD, NAME_GAP, SCRIPT, keyLabel, keyLayout, spansWidth, textSpans, textWidth } from './key'
import { DEFAULT_OUTER, RADIUS, discBounds, particleDiscs, type ParticleKind } from './particles'

const alone = { shape: 'single', outer: DEFAULT_OUTER } as const
const anion: ParticleKind = { count: 4, ...alone, look: { size: 'l', shade: 'light', charge: '-' }, name: 'Any negative ion' }
const cation: ParticleKind = { count: 0, ...alone, look: { size: 's', shade: 'white', charge: '+' }, name: 'Na⁺' }
const big: ParticleKind = { count: 2, ...alone, look: { size: 'xl', shade: 'black', charge: '' }, name: 'Ar' }

describe('estimating text width', () => {
  it('allows about 0.55 of the font size per character', () => {
    expect(textWidth('abcd', 10)).toBeCloseTo(22)
    expect(textWidth('', 16)).toBe(0)
  })

  it('counts a subscript or superscript as one character', () => {
    expect(textWidth('H₂O', 10)).toBeCloseTo(textWidth('abc', 10))
  })
})

describe('key text with subscripts and superscripts', () => {
  it('draws plain text as one piece, as wide as it always was', () => {
    expect(textSpans('Any negative ion', 16)).toEqual([{ text: 'Any negative ion', size: 16, dy: 0 }])
    expect(spansWidth(textSpans('Na⁺ ion', 16))).toBe(textWidth('Na⁺ ion', 16))
  })

  it('sets subscripts and superscripts smaller, lowered and raised, and comes back to the line', () => {
    const spans = textSpans('SO_4^{2-} ion', 10)
    expect(spans.map((s) => [s.text, s.size])).toEqual([
      ['SO', 10],
      ['4', 10 * SCRIPT],
      ['2−', 10 * SCRIPT],
      [' ion', 10],
    ])
    expect(spans[1].dy).toBeGreaterThan(0)
    expect(spans[2].dy).toBeLessThan(0)
    expect(spans.reduce((y, s) => y + s.dy, 0)).toBeCloseTo(0)
  })

  it('measures each piece at its own size', () => {
    const spans = textSpans('H_2O', 16)
    expect(spansWidth(spans)).toBeCloseTo(textWidth('HO', 16) + textWidth('2', 16 * SCRIPT))
    expect(spansWidth(spans)).toBeLessThan(textWidth('H_2O', 16))
  })
})

describe('the bounds of a drawing', () => {
  it('reach to the edge of every disc', () => {
    const discs = [
      { x: 0, y: 0, r: 10, size: 'm', shade: 'white', charge: '' },
      { x: 25, y: -5, r: 6, size: 'xs', shade: 'white', charge: '' },
    ] as const
    expect(discBounds([...discs])).toEqual({ left: -10, right: 31, top: -11, bottom: 10 })
  })
})

describe('the key', () => {
  it('has one line per kind, including kinds with a count of 0', () => {
    const key = keyLayout([anion, cation], '')
    expect(key.lines.map((l) => l.name)).toEqual(['Any negative ion', 'Na⁺'])
  })

  it('draws each kind exactly as in the box: the same discs, only moved', () => {
    const key = keyLayout([anion, big], '')
    for (const [i, kind] of [anion, big].entries()) {
      const drawn = key.lines[i].discs
      const own = particleDiscs(kind)
      expect(drawn).toHaveLength(own.length)
      const dx = drawn[0].x - own[0].x
      const dy = drawn[0].y - own[0].y
      drawn.forEach((d, j) => expect(d).toEqual({ ...own[j], x: own[j].x + dx, y: own[j].y + dy }))
      expect(drawn[0].r).toBe(RADIUS[kind.look.size])
    }
  })

  it('draws a molecule whole, and sizes its line and name column from it', () => {
    const ccl4: ParticleKind = { count: 3, shape: 'cross', look: { size: 'xs', shade: 'black', charge: '' }, outer: { size: 'm', shade: 'white', charge: '' }, name: 'CCl₄ molecule' }
    const [line] = keyLayout([ccl4, cation], '').lines
    expect(line.discs).toHaveLength(5)
    const drawn = discBounds(line.discs)
    const own = discBounds(particleDiscs(ccl4))
    expect(drawn.right - drawn.left).toBeCloseTo(own.right - own.left)
    expect(line.nameX).toBeCloseTo(KEY_PAD + (own.right - own.left) + NAME_GAP)
  })

  it('puts every name in one column after the widest drawing', () => {
    const key = keyLayout([anion, big, cation], '')
    const widest = 2 * RADIUS.xl
    for (const line of key.lines) expect(line.nameX).toBe(KEY_PAD + widest + NAME_GAP)
  })

  it('centers each drawing in its column and on its name', () => {
    const key = keyLayout([big, cation], '')
    const middle = KEY_PAD + RADIUS.xl
    for (const line of key.lines) {
      const b = discBounds(line.discs)
      expect((b.left + b.right) / 2).toBeCloseTo(middle)
      expect((b.top + b.bottom) / 2).toBeCloseTo(line.nameY)
    }
  })

  it('stacks the lines under the heading without overlapping, inside the border', () => {
    const key = keyLayout([anion, big, cation], '')
    let above = key.headingY
    for (const line of key.lines) {
      const b = discBounds(line.discs)
      expect(b.top).toBeGreaterThan(above)
      above = b.bottom
    }
    expect(above).toBeLessThanOrEqual(key.height - KEY_PAD)
  })

  it('is wide enough for the longest name', () => {
    const long: ParticleKind = { ...anion, name: 'A very long name for a particle kind' }
    const short = keyLayout([anion], '')
    const wide = keyLayout([long], '')
    expect(wide.width).toBeGreaterThan(short.width)
    expect(wide.width).toBeGreaterThanOrEqual(wide.lines[0].nameX + textWidth(long.name!, wide.fontSize) + KEY_PAD)
  })

  it('adds the note as a line at the bottom, and makes room for it', () => {
    const without = keyLayout([anion], '')
    const withNote = keyLayout([anion], 'H₂O molecules are not shown, nor are any other molecules at all')
    expect(without.note).toBeUndefined()
    expect(withNote.note!.text).toBe('H₂O molecules are not shown, nor are any other molecules at all')
    expect(withNote.height).toBeGreaterThan(without.height)
    expect(withNote.note!.y).toBeGreaterThan(discBounds(withNote.lines[0].discs).bottom)
    expect(withNote.width).toBeGreaterThanOrEqual(KEY_PAD + textWidth(withNote.note!.text, withNote.noteSize) + KEY_PAD)
  })

  it('is sized from the names and note as drawn, not as typed', () => {
    const typed: ParticleKind = { ...anion, name: 'SO_4^{2-} ion and C_{12}H_{22}O_{11}' }
    const key = keyLayout([typed], 'NH_4^+ is not shown')
    expect(key.lines[0].spans.map((s) => s.text).join('')).toBe('SO42− ion and C12H22O11')
    expect(key.width).toBe(Math.ceil(key.lines[0].nameX + spansWidth(key.lines[0].spans) + KEY_PAD))
    expect(key.width).toBeLessThan(key.lines[0].nameX + textWidth(typed.name!, key.fontSize) + KEY_PAD)
    expect(key.note!.spans.map((s) => s.text)).toEqual(['NH', '4', '+', ' is not shown'])
  })

  it('ignores a note of only spaces', () => {
    expect(keyLayout([anion], '   ').note).toBeUndefined()
  })
})

describe('the key for screen readers', () => {
  it('lists each kind with its name, then the note', () => {
    expect(keyLabel([anion, { ...cation, name: undefined }], 'Water is not shown')).toBe(
      'Key: large light gray − ion, “Any negative ion”; small white + ion. Water is not shown',
    )
  })

  it('describes a molecule whole, not just its center', () => {
    const water: ParticleKind = { count: 3, shape: 'bent', look: { size: 'm', shade: 'gray', charge: '' }, outer: { size: 's', shade: 'white', charge: '' }, name: 'H₂O' }
    expect(keyLabel([water], '')).toBe('Key: bent molecule (medium gray with 2 small white), “H₂O”')
  })

  it('writes subscripts and superscripts as characters', () => {
    expect(keyLabel([{ ...anion, name: 'SO_4^{2-} ion' }], 'H_2O is not shown')).toBe('Key: large light gray − ion, “SO₄²⁻ ion”. H₂O is not shown')
  })

  it('can start with other words, for a figure of only the key', () => {
    expect(keyLabel([anion], '', 'A particle diagram key')).toBe('A particle diagram key: large light gray − ion, “Any negative ion”')
  })
})
