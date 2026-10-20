import { describe, expect, it } from 'vitest'
import { editAfterClick, editItems, itemAt } from './editing'
import { readEdits, writeEdits, type EditTarget } from './edits'
import { EDITED_LINE, buildFigure } from './figure'
import { INK, MARK_COLORS } from './marks'
import { change, dotCrossSettings, type DotCrossSettings } from './settings'

const d = dotCrossSettings.defaults
const fromQuery = (query: string) => dotCrossSettings.fromParams(new URLSearchParams(query))
const figure = (query: string) => buildFigure(fromQuery(query))
/** The settings after clicking each target in turn, as the page does. */
function click(s: DotCrossSettings, ...targets: EditTarget[]) {
  let out = s
  for (const t of targets) out = { ...out, edits: editAfterClick(out, buildFigure(out), t) }
  return out
}
const electron = (index: number): EditTarget => ({ kind: 'electron', index })
const symbol = (index: number): EditTarget => ({ kind: 'symbol', index })
const charge = (index: number): EditTarget => ({ kind: 'charge', index })

// Water's figure lists H, H, O and eight electrons; 5 is the first H's
// shared electron (a cross), 0 one of O's lone electrons (a dot).
const H_CROSS = 5
const O_DOT = 0

describe('edits in the address', () => {
  it('leave the address alone when there are none', () => {
    expect(dotCrossSettings.toQuery(d)).toBe('')
    expect(d.edits).toBe('')
  })

  it('travel intact, written the one way', () => {
    const s = { ...d, formula: 'NaCl', edits: 'e3x_e15n_s1_c0b' }
    const query = dotCrossSettings.toQuery(s)
    expect(query).toBe('formula=NaCl&edits=e3x_e15n_s1_c0b')
    expect(fromQuery(query)).toEqual(s)
    expect(fromQuery('edits=c0b_s1_e15n_e3x').edits).toBe('e3x_e15n_s1_c0b')
    expect(dotCrossSettings.tidy({ ...d, edits: 's1_e3x' }).edits).toBe('e3x_s1')
  })

  it('skip what they don’t understand, a later edit of one item winning', () => {
    expect(fromQuery('edits=e3q_x1_s_e4o_e4s_c2z_s1b').edits).toBe('e4s')
    expect(fromQuery('edits=nonsense').edits).toBe('')
    expect(writeEdits(readEdits('e1d_e1n'))).toBe('e1n')
  })
})

describe('clicking an electron', () => {
  it('goes dot, cross, open circle, open square, none, and back to a dot', () => {
    let s = fromQuery('formula=H2O')
    const seen = [buildFigure(s).marks[O_DOT].kind]
    for (let i = 0; i < 5; i++) {
      s = click(s, electron(O_DOT))
      seen.push(buildFigure(s).marks[O_DOT].kind)
    }
    expect(seen).toEqual(['dot', 'cross', 'circle', 'square', null, 'dot'])
    expect(s.edits).toBe('')
  })

  it('starts from the mark drawn: a cross next becomes an open circle', () => {
    const s = click(fromQuery('formula=H2O'), electron(H_CROSS))
    expect(s.edits).toBe(`e${H_CROSS}o`)
    expect(buildFigure(s).marks[H_CROSS].kind).toBe('circle')
  })

  it('leaves an electron edited away in the list, drawn as nothing', () => {
    const f = figure('formula=NaCl&edits=e15n')
    expect(f.marks).toHaveLength(16)
    expect(f.marks[15].kind).toBeNull()
    expect(f.marks.filter((m) => m.kind).length).toBe(15)
  })
})

describe('Swap and color with edits', () => {
  it('still trades an edited dot for a cross, and the other way round', () => {
    expect(figure(`formula=H2O&edits=e${H_CROSS}d`).marks[H_CROSS].kind).toBe('dot')
    expect(figure(`formula=H2O&edits=e${H_CROSS}d&swap=1`).marks[H_CROSS].kind).toBe('cross')
    expect(figure(`formula=H2O&edits=e${O_DOT}x&swap=1`).marks[O_DOT].kind).toBe('dot')
    expect(figure(`formula=H2O&edits=e${O_DOT}o&swap=1`).marks[O_DOT].kind).toBe('circle')
  })

  it('cycles what’s drawn when swapped: a cross (O’s, swapped) next becomes an open circle', () => {
    let s = fromQuery('formula=H2O&swap=1')
    expect(buildFigure(s).marks[O_DOT].kind).toBe('cross')
    const seen: (string | null)[] = []
    for (let i = 0; i < 5; i++) {
      s = click(s, electron(O_DOT))
      seen.push(buildFigure(s).marks[O_DOT].kind)
    }
    expect(seen).toEqual(['circle', 'square', null, 'dot', 'cross'])
    expect(s.edits).toBe('')
  })

  it('colors an edited mark as the atom with that mark, or black when none has it', () => {
    const dot = figure(`formula=H2O&color=1&edits=e${H_CROSS}d`).marks[H_CROSS]
    expect(dot.color).toBe(MARK_COLORS.dot)
    expect(figure(`formula=H2O&color=1&swap=1&edits=e${H_CROSS}d`).marks[H_CROSS].color).toBe(MARK_COLORS.cross)
    // water has no open circles, so an electron edited to one is black
    expect(figure(`formula=H2O&color=1&edits=e${H_CROSS}o`).marks[H_CROSS].color).toBe(INK)
    // an atom on its own has no crosses
    expect(figure('formula=Na&color=1&edits=e0x').marks[0].color).toBe(INK)
    // methanol's O has open circles
    expect(figure('formula=CH3OH&color=1&edits=e0o').marks[0].color).toBe(MARK_COLORS.circle)
    // and black stays black without color
    expect(figure(`formula=H2O&edits=e${H_CROSS}d`).marks[H_CROSS].color).toBe(INK)
  })
})

describe('symbols and charges', () => {
  it('blank a symbol when clicked, and show it again', () => {
    const s = click(fromQuery('formula=H2O'), symbol(2))
    expect(s.edits).toBe('s2')
    expect(buildFigure(s).symbols.map((t) => t.blank)).toEqual([false, false, true])
    expect(click(s, symbol(2)).edits).toBe('')
  })

  it('cycle a charge shown, blank box, left off', () => {
    let s = fromQuery('formula=MgCl2')
    const seen: unknown[] = []
    for (let i = 0; i < 3; i++) {
      s = click(s, charge(1))
      const b = buildFigure(s).brackets[1]
      seen.push([b.mode, b.charge?.blank])
    }
    expect(seen).toEqual([
      ['blank', true],
      ['none', undefined],
      ['show', false],
    ])
    expect(s.edits).toBe('')
    // from the charges setting: blank goes on to left off
    expect(click(fromQuery('formula=MgCl2&charges=blank'), charge(0)).edits).toBe('c0n')
  })

  it('keep a charge left off where it would be, so it can be clicked back', () => {
    const f = figure('formula=Na%2B&edits=c0n')
    expect(f.brackets[0].charge).toBeUndefined()
    expect(editItems(f).find((it) => it.key === 'c0')).toBeDefined()
  })
})

describe('when edits are cleared', () => {
  it('clears them with the formula, the molecule picked, the layout or the shells', () => {
    for (const [key, value] of [
      ['formula', 'NaCl'],
      ['which', 'ethanol'],
      ['layout', 'numbered'],
      ['shells', 'all'],
      ['atomShells', 'outer'],
    ] as const) {
      const s = { ...d, edits: 'e1x_s0' }
      change(s, key, value)
      expect(s.edits, key).toBe('')
    }
  })

  it('keeps them through Swap, color, the title and the rest', () => {
    for (const [key, value] of [
      ['swap', true],
      ['color', true],
      ['blank', true],
      ['charges', 'none'],
      ['title', 'Find the mistake'],
      ['answerKey', true],
    ] as const) {
      const s = { ...d, edits: 'e1x_s0' }
      change(s, key, value)
      expect(s.edits, key).toBe('e1x_s0')
    }
    const same = { ...d, edits: 'e1x' }
    change(same, 'formula', d.formula)
    expect(same.edits).toBe('e1x')
  })

  it('ignores edits to items the figure doesn’t have', () => {
    const f = figure('formula=H2O&edits=e99n_s9_c0b')
    expect(f.edits).toBe(0)
    expect(f.edited).toBe(false)
    expect(f.label).toBe(figure('formula=H2O').label)
    expect(f.marks.every((m) => m.kind)).toBe(true)
    expect(figure('formula=CO&edits=e1n_s0').marks).toEqual([])
  })
})

describe('with the electrons blank', () => {
  it('draws no electrons and offers none to click, but symbols and charges still change', () => {
    const f = figure('formula=NaCl&blank=1&edits=e15n_s0_c1b')
    expect(f.marks).toEqual([])
    expect(editItems(f).some((it) => it.target.kind === 'electron')).toBe(false)
    expect(f.symbols[0].blank).toBe(true)
    expect(f.brackets[1].mode).toBe('blank')
    // the electron edit still counts, to be reset, but changes nothing drawn
    expect(f.edits).toBe(3)
    const only = figure('formula=NaCl&blank=1&edits=e15n&answerKey=1')
    expect(only.edited).toBe(false)
    expect(only.answer).not.toContain(EDITED_LINE)
  })
})

describe('the words with edits', () => {
  it('count the marks as drawn', () => {
    const label = figure('formula=NaCl&edits=e15n').label
    expect(label).toContain('changed by hand')
    expect(label).toContain('electrons drawn as 7 dots and 8 crosses')
    expect(figure(`formula=H2O&edits=e${H_CROSS}o`).label).toContain('electrons drawn as 6 dots, 1 cross and 1 open circle')
  })

  it('don’t name a blank symbol, nor the molecule', () => {
    const label = figure('formula=H2O&edits=s2').label
    expect(label).not.toMatch(/\bO\b|water|H₂O/)
    expect(label).toContain('symbols 2 H, and 1 symbol left blank')
  })

  it('say how each charge is drawn', () => {
    expect(figure('formula=MgCl2&edits=c0b_c2n').label).toContain('charge 2+, 1 blank box for a charge and 1 charge left off')
  })

  it('add a line to the answer key, which still gives the correct diagram', () => {
    const f = figure('formula=NaCl&edits=e15n&answerKey=1')
    expect(f.answer).toEqual(['Na loses 1 electron to Cl.', 'Na⁺ 2,8; Cl⁻ 2,8,8', EDITED_LINE])
    expect(f.label).toContain(EDITED_LINE)
    // printed over more than one line, so it doesn't widen the figure much
    expect(f.keyLines.length).toBeGreaterThan(f.answer.length)
    expect(f.keyLines.join(' ')).toContain(EDITED_LINE)
    expect(figure('formula=NaCl&answerKey=1').answer).not.toContain(EDITED_LINE)
    expect(figure('formula=NaCl&edits=e15n').answer).toEqual([])
  })
})

describe('click targets', () => {
  it('name each item for keyboard and screen reader users', () => {
    const labels = editItems(figure('formula=H2O&edits=e7n')).map((it) => it.label)
    expect(labels).toContain('symbol O, shown')
    expect(labels).toContain(`electron ${H_CROSS + 1}, cross, on H`)
    expect(labels).toContain('electron 1, dot, on O')
    expect(labels).toContain('electron 8, not drawn, on H')
    expect(editItems(figure('formula=Mg+2%2B')).map((it) => it.label)).toContain('charge 2+ on Mg, shown')
  })

  it('pick the item drawn nearest the point among those in reach', () => {
    const f = figure('formula=H2O')
    const items = editItems(f)
    const [a, b] = [f.marks[0], f.marks[1]]
    // a pair 10 units apart: each side of the middle picks its own electron
    expect(itemAt(items, a.x + 1, a.y, 12)?.key).toBe('e0')
    expect(itemAt(items, b.x - 1, b.y, 12)?.key).toBe('e1')
    const o = f.symbols[2]
    expect(itemAt(items, o.x + 3, o.y, 12)?.key).toBe('s2')
    expect(itemAt(items, o.x, o.y - 30, 12)).toBeUndefined()
  })
})
