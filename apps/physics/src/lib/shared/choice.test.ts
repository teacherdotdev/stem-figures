import { describe, expect, test } from 'vitest'
import { radioKeys, radioTabIndex } from './Choice.svelte'

const values = ['a', 'b', 'c'] as const

/** A key press on a radio in a group of three, with what it chose and which radio got focus. */
function press(key: string, value: string) {
  const focused: number[] = []
  const radios = values.map((_, i) => ({ focus: () => focused.push(i) }))
  let prevented = false
  let chosen: string | null = null
  const e = {
    key,
    preventDefault: () => (prevented = true),
    currentTarget: { closest: () => ({ querySelectorAll: () => radios }) },
  } as unknown as KeyboardEvent
  radioKeys(e, values, value as (typeof values)[number], (v) => (chosen = v))
  return { chosen, focused, prevented }
}

describe('radio keys', () => {
  test('arrows choose the next or the one before, wrapping round, and move focus to it', () => {
    expect(press('ArrowRight', 'a')).toEqual({ chosen: 'b', focused: [1], prevented: true })
    expect(press('ArrowDown', 'c')).toEqual({ chosen: 'a', focused: [0], prevented: true })
    expect(press('ArrowLeft', 'a')).toEqual({ chosen: 'c', focused: [2], prevented: true })
    expect(press('ArrowUp', 'b')).toEqual({ chosen: 'a', focused: [0], prevented: true })
  })

  test('Home and End choose the first and the last', () => {
    expect(press('Home', 'c').chosen).toBe('a')
    expect(press('End', 'a').chosen).toBe('c')
  })

  test('other keys, like Tab and Space, are left alone', () => {
    expect(press('Tab', 'a')).toEqual({ chosen: null, focused: [], prevented: false })
    expect(press(' ', 'a')).toEqual({ chosen: null, focused: [], prevented: false })
  })

  test('only the chosen radio is a tab stop, or the first when none is chosen', () => {
    expect(values.map((v) => radioTabIndex(values, 'b', v))).toEqual([-1, 0, -1])
    expect(values.map((v) => radioTabIndex<string>(values, 'z', v))).toEqual([0, -1, -1])
  })
})
