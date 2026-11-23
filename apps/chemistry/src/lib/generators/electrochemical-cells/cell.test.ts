import { describe, expect, test } from 'vitest'
import { METALS, cellOf, ionCharge, potentialText, reactionsOf } from './cell'
import { answerLine, answerLines, cellSettings, cellVoltage, tidyVoltage } from './settings'

const fromQuery = (q: string) => cellSettings.fromParams(new URLSearchParams(q))

describe('cellOf', () => {
  test('the metal with the lower reduction potential is the anode, on either side', () => {
    expect(cellOf('Zn', 'Cu')).toEqual({ anode: 'left', cathode: 'right', voltage: 1.1 })
    expect(cellOf('Cu', 'Zn')).toEqual({ anode: 'right', cathode: 'left', voltage: 1.1 })
  })

  test('E°cell is E°cathode − E°anode, always positive', () => {
    expect(cellOf('Mg', 'Ag').voltage).toBe(3.17)
    expect(cellOf('Ag', 'Al').voltage).toBe(2.46)
    expect(cellOf('Cu', 'Ag').voltage).toBe(0.46)
    for (const a of METALS) for (const b of METALS) if (a !== b) expect(cellOf(a, b).voltage).toBeGreaterThan(0)
  })
})

describe('reactions', () => {
  test('ion charges are read from the superscripts', () => {
    expect(ionCharge('Ag⁺')).toBe(1)
    expect(ionCharge('Zn²⁺')).toBe(2)
    expect(ionCharge('Al³⁺')).toBe(3)
  })

  test('half-reactions at the anode and cathode, and the overall reaction with the electrons cancelled', () => {
    expect(reactionsOf('Zn', 'Cu')).toEqual({
      oxidation: 'Zn(s) → Zn²⁺(aq) + 2e⁻',
      reduction: 'Cu²⁺(aq) + 2e⁻ → Cu(s)',
      overall: 'Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s)',
    })
    expect(reactionsOf('Ag', 'Al')).toEqual({
      oxidation: 'Al(s) → Al³⁺(aq) + 3e⁻',
      reduction: 'Ag⁺(aq) + e⁻ → Ag(s)',
      overall: 'Al(s) + 3Ag⁺(aq) → Al³⁺(aq) + 3Ag(s)',
    })
    expect(reactionsOf('Al', 'Zn').overall).toBe('2Al(s) + 3Zn²⁺(aq) → 2Al³⁺(aq) + 3Zn(s)')
  })

  test('potentials are written with a true minus sign', () => {
    expect(potentialText(-0.76)).toBe('−0.76')
    expect(potentialText(0.8)).toBe('0.80')
  })
})

describe('settings', () => {
  test('the same metal on both sides makes no cell: right becomes Cu, or Zn if both are Cu', () => {
    expect(fromQuery('left=Zn&right=Zn')).toMatchObject({ left: 'Zn', right: 'Cu' })
    expect(fromQuery('left=Cu&right=Cu')).toMatchObject({ left: 'Cu', right: 'Zn' })
    expect(cellSettings.tidy({ left: 'Ag', right: 'Ag' })).toMatchObject({ left: 'Ag', right: 'Cu' })
  })

  test('a typed E°cell is kept from 0 to 9.99 V, to 0.01 V', () => {
    expect(tidyVoltage(-3)).toBe(0)
    expect(tidyVoltage(50)).toBe(9.99)
    expect(tidyVoltage(1.234)).toBe(1.23)
    expect(tidyVoltage(NaN)).toBe(0)
    expect(cellVoltage(fromQuery('reading=typed&voltage=-2'))).toBe(0)
    expect(cellVoltage(fromQuery('reading=typed&voltage=12'))).toBe(9.99)
    expect(cellVoltage(fromQuery('reading=typed&voltage='))).toBe(1.1)
    // An empty box (null) becomes the fallback once tidied, as the figure shows it.
    expect(cellVoltage(cellSettings.tidy({ reading: 'typed', voltage: null }))).toBe(1.1)
  })

  test('the answer key: anode, cathode and E°cell, then the half-reactions and the overall reaction', () => {
    const s = fromQuery('left=Cu&right=Zn')
    expect(answerLine(s)).toBe('Anode: Zn (−) · Cathode: Cu (+) · E°cell = 1.10 V')
    expect(answerLines(s)).toEqual([
      'Anode: Zn (−) · Cathode: Cu (+) · E°cell = 1.10 V',
      'Anode (oxidation): Zn(s) → Zn²⁺(aq) + 2e⁻',
      'Cathode (reduction): Cu²⁺(aq) + 2e⁻ → Cu(s)',
      'Overall: Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s)',
    ])
    expect(answerLine(fromQuery('reading=typed&voltage=1.08'))).toBe('Anode: Zn (−) · Cathode: Cu (+) · E°cell = 1.08 V')
  })

  test('settings round-trip through the page address', () => {
    const s = fromQuery('left=Ag&right=Al&meter=dial&reading=typed&voltage=2.5&electrodes=1&electronFlow=1&labels=0')
    expect(fromQuery(cellSettings.toQuery(s))).toEqual(s)
  })
})
