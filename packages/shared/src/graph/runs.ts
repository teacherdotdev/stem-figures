// A label's text in runs, its subscripts lowered and smaller, for labels
// like S₁, PR₂ and D_R that Unicode can't write (there's no subscript
// capital R). `_x` lowers the one letter after it, `_{xy}` everything in the
// braces, the way Physics' labelRuns reads them; there are no superscripts
// or commands. Started as Enzyme Activity's runs for Vmax and Km, which
// still finds those words itself and uses `levelled` and `runsWidth` here.

import { round } from './grid'
import { textWidth } from './labels'

/** A stretch of a label's text, `sub` if lowered; `dy` moves it down from the run before. */
export type Run = { text: string; sub?: boolean; dy: number }

/** A subscript's size, of the label's. */
export const SUB = 0.7

/** How far a subscript sits below the baseline, of the label's size. */
const DROP = 0.22

/** The text's stretches, each lowered or not: "PR_{2}" → PR, 2 (lowered). */
export function partsOf(text: string): { text: string; sub?: boolean }[] {
  const parts: { text: string; sub?: boolean }[] = []
  const add = (t: string, sub: boolean) => {
    if (!t) return
    const last = parts.at(-1)
    if (last && !!last.sub === sub) last.text += t
    else parts.push(sub ? { text: t, sub: true } : { text: t })
  }
  const chars = [...text]
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '_' && i + 1 < chars.length) {
      if (chars[i + 1] === '{') {
        const close = chars.indexOf('}', i + 2)
        if (close > 0) {
          add(chars.slice(i + 2, close).join(''), true)
          i = close
          continue
        }
      } else {
        add(chars[++i], true)
        continue
      }
    }
    add(chars[i], false)
  }
  return parts
}

/** Stretches of text placed one after another: each lowered one moves down, and the next back up. */
export function levelled(parts: { text: string; sub?: boolean }[], fs: number): Run[] {
  let level = 0
  return parts
    .filter((r) => r.text)
    .map((r) => {
      const to = r.sub ? fs * DROP : 0
      const dy = round(to - level)
      level = to
      return { ...r, dy }
    })
}

/** A label's runs at size `fs`: "S_1" → S, then 1 lowered and smaller. */
export const runsOf = (text: string, fs: number): Run[] => levelled(partsOf(text), fs)

/** How wide runs are in bold Arial at size `fs`. */
export const runsWidth = (runs: Pick<Run, 'text' | 'sub'>[], fs: number) =>
  runs.reduce((w, r) => w + textWidth(r.text, r.sub ? fs * SUB : fs), 0)

const SUBSCRIPTS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
}

/**
 * A label as plain text, for screen readers and file names: its subscripts
 * in Unicode where every letter has one (S₁, Pₑ), and otherwise written
 * after the rest (D_R → "D R").
 */
export function plainOf(text: string) {
  return partsOf(text)
    .map((p) => (!p.sub ? p.text : [...p.text].every((c) => SUBSCRIPTS[c]) ? [...p.text].map((c) => SUBSCRIPTS[c]).join('') : ` ${p.text}`))
    .join('')
}
