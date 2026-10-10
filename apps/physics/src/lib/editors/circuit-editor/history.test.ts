import { describe, expect, it } from 'vitest'
import { commit, HISTORY_LIMIT, redo, replace, settle, startHistory, undo } from './history'

describe('undo and redo', () => {
  it('undoes each change in turn, and redoes them', () => {
    let h = commit(commit(startHistory('empty'), 'cell'), 'cell and resistor')
    h = undo(h)
    expect(h.present).toBe('cell')
    h = undo(h)
    expect(h.present).toBe('empty')
    expect(undo(h)).toBe(h)
    h = redo(redo(h))
    expect(h.present).toBe('cell and resistor')
    expect(redo(h)).toBe(h)
  })

  it('forgets what was undone once something new is drawn', () => {
    const h = commit(undo(commit(startHistory('a'), 'b')), 'c')
    expect(h.future).toEqual([])
    expect(undo(h).present).toBe('a')
  })

  it('makes a whole drag one step, back to where it began', () => {
    let h = startHistory('here')
    h = replace(h, 'a bit along')
    h = replace(h, 'there')
    h = settle(h, 'here')
    expect(h.present).toBe('there')
    expect(undo(h).present).toBe('here')
  })

  it(`keeps the last ${HISTORY_LIMIT} steps`, () => {
    let h = startHistory(0)
    for (let i = 1; i <= HISTORY_LIMIT + 20; i++) h = commit(h, i)
    expect(h.past).toHaveLength(HISTORY_LIMIT)
    expect(h.past[0]).toBe(20)
  })
})
