// The names and note the teacher types for the key, with subscripts and
// superscripts written the same way typed and in the page address: H_2O,
// SO_4^{2-}, Na^+. A subscript is _ and one character or _{…}, a superscript
// ^ and one character or ^{…}, and a superscript's hyphen is a true minus
// sign. Physics labels are written the same way, in its own copy.

export interface Run {
  text: string
  shift: 'sub' | 'super' | null
}

/** Key text as runs of plain, lowered and raised text. */
export function textRuns(text: string): Run[] {
  const chars = [...text]
  const runs: Run[] = []
  const add = (t: string, shift: Run['shift']) => {
    const last = runs.at(-1)
    if (last && last.shift === shift) last.text += t
    else if (t) runs.push({ text: t, shift })
  }
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    // a _ or ^ with nothing after it is just itself
    if ((char !== '_' && char !== '^') || i === chars.length - 1) {
      add(char, null)
      continue
    }
    let inner: string
    if (chars[i + 1] === '{') {
      const close = chars.indexOf('}', i + 2)
      const end = close < 0 ? chars.length : close
      inner = chars.slice(i + 2, end).join('')
      i = end
    } else inner = chars[++i]
    if (char === '_') add(inner, 'sub')
    else add(inner.replaceAll('-', '−'), 'super')
  }
  return runs
}

const SUBSCRIPTS: Record<string, string> = { '+': '₊', '-': '₋', '−': '₋', '(': '₍', ')': '₎' }
const SUPERSCRIPTS: Record<string, string> = { '+': '⁺', '-': '⁻', '−': '⁻', '(': '⁽', ')': '⁾' }
for (let d = 0; d <= 9; d++) {
  SUBSCRIPTS[d] = String.fromCodePoint(0x2080 + d)
  SUPERSCRIPTS[d] = '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]
}

/** Key text written out in plain characters, for screen readers and answer
 *  keys: "SO_4^{2-}" is "SO₄²⁻". Letters with no such character stay as
 *  they are. */
export const plainText = (text: string) =>
  textRuns(text)
    .map((run) => {
      if (!run.shift) return run.text
      const script = run.shift === 'sub' ? SUBSCRIPTS : SUPERSCRIPTS
      return [...run.text].map((c) => script[c] ?? c).join('')
    })
    .join('')
