import { describe, expect, it } from 'vitest'
import { plainText, textRuns } from './keyText'

describe('subscripts and superscripts in key text', () => {
  it('reads one character after _ or ^, or everything in braces', () => {
    expect(textRuns('H_2O molecule')).toEqual([
      { text: 'H', shift: null },
      { text: '2', shift: 'sub' },
      { text: 'O molecule', shift: null },
    ])
    expect(textRuns('C_{12}H_{22}O_{11}').map((r) => r.text)).toEqual(['C', '12', 'H', '22', 'O', '11'])
  })

  it('raises a charge with a true minus sign, after a subscript', () => {
    expect(textRuns('SO_4^{2-} ion')).toEqual([
      { text: 'SO', shift: null },
      { text: '4', shift: 'sub' },
      { text: '2−', shift: 'super' },
      { text: ' ion', shift: null },
    ])
    expect(textRuns('Na^+')).toEqual([
      { text: 'Na', shift: null },
      { text: '+', shift: 'super' },
    ])
  })

  it('leaves plain text, and text already in subscript characters, as one run', () => {
    expect(textRuns('CCl₄ molecule')).toEqual([{ text: 'CCl₄ molecule', shift: null }])
    expect(textRuns('Any negative ion')).toEqual([{ text: 'Any negative ion', shift: null }])
    expect(textRuns('')).toEqual([])
  })

  it('keeps a _ or ^ with nothing after it, and reads an unclosed brace to the end', () => {
    expect(textRuns('x_')).toEqual([{ text: 'x_', shift: null }])
    expect(textRuns('Fe^{3+')).toEqual([
      { text: 'Fe', shift: null },
      { text: '3+', shift: 'super' },
    ])
  })

  it('writes it out in plain characters for screen readers and answer keys', () => {
    expect(plainText('SO_4^{2-} ion')).toBe('SO₄²⁻ ion')
    expect(plainText('H_2O and Ca^{2+}')).toBe('H₂O and Ca²⁺')
    expect(plainText('NH_4^+')).toBe('NH₄⁺')
    expect(plainText('Cl⁻ ion')).toBe('Cl⁻ ion')
  })
})
