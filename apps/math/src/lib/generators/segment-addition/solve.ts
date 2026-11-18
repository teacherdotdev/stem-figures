// Works out a segment addition figure the way a student would: every label is
// a number or an expression in one letter (2x + 3, x/2 − 1, 3(x − 2)), the
// parts inside a span add up to the span's label, and parts with the same
// congruence ticks are equal. That gives equations in the letter; the first
// one that has the letter in it is solved, and the rest checked against it.
//
// It only reads linear expressions. Anything else (x², √x, two letters)
// leaves the figure unsolved, and the panel says why.

import { partName, spanName, type Settings } from './settings.js'

/** a·x + b, where x is the one letter in use (or none). */
export type Linear = { a: number; b: number; letter: string | null }

const EPS = 1e-9

/** Reads typed math like "2x+3", "x/2-1", "3(x-2)", "(1/2)x" or "12" as a·x + b, or null if it isn't linear in one letter. */
export function readLinear(text: string): Linear | null {
  const src = String(text ?? '').replace(/−/g, '-').replace(/[·×]/g, '*').replace(/\s+/g, '')
  if (!src) return null
  let i = 0
  let letter: string | null = null
  const peek = () => src[i]

  type L = { a: number; b: number }
  const add = (p: L, q: L, k = 1): L => ({ a: p.a + k * q.a, b: p.b + k * q.b })
  const mul = (p: L, q: L): L | null => (Math.abs(p.a) > EPS && Math.abs(q.a) > EPS ? null : { a: p.a * q.b + q.a * p.b, b: p.b * q.b })

  function expr(): L | null {
    let sign = 1
    if (peek() === '+' || peek() === '-') sign = src[i++] === '-' ? -1 : 1
    let t = term()
    if (!t) return null
    let out: L = { a: sign * t.a, b: sign * t.b }
    while (peek() === '+' || peek() === '-') {
      const k = src[i++] === '-' ? -1 : 1
      t = term()
      if (!t) return null
      out = add(out, t, k)
    }
    return out
  }
  function term(): L | null {
    let out = factor()
    if (!out) return null
    for (;;) {
      if (peek() === '*') {
        i++
        const f = factor()
        if (!f) return null
        out = mul(out, f)
      } else if (peek() === '/') {
        i++
        const f = factor()
        if (!f || Math.abs(f.a) > EPS || Math.abs(f.b) < EPS) return null
        out = { a: out.a / f.b, b: out.b / f.b }
      } else if (peek() !== undefined && /[0-9.(\p{L}]/u.test(peek())) {
        // Written side by side: 2x, 3(x-1), (1/2)x.
        const f = factor()
        if (!f) return null
        out = mul(out, f)
      } else return out
      if (!out) return null
    }
  }
  function factor(): L | null {
    const c = peek()
    if (c === undefined) return null
    if (c === '(') {
      i++
      const inner = expr()
      if (!inner || peek() !== ')') return null
      i++
      return inner
    }
    if (/[0-9.]/.test(c)) {
      const m = /^\d*\.?\d+|^\d+\./.exec(src.slice(i))
      if (!m) return null
      i += m[0].length
      return { a: 0, b: Number(m[0]) }
    }
    if (/\p{L}/u.test(c) && c !== 'π') {
      if (letter && letter !== c) return null
      letter = c
      i++
      return { a: 1, b: 0 }
    }
    return null
  }

  const out = expr()
  if (!out || i !== src.length) return null
  return { ...out, letter: Math.abs(out.a) > EPS ? letter : null }
}

const round = (v: number) => {
  const r = Math.round(v * 1000) / 1000
  return Object.is(r, -0) ? 0 : r
}
/** A number as it's written in the panel: 7, 2.5, −3. */
export const show = (v: number) => String(round(v)).replace('-', '−')

export type Solved = {
  /** The letter and its value, when there's one to solve for. */
  letter: string | null
  value: number | null
  /** Each part's length, worked out, or null where it can't be. */
  parts: (number | null)[]
  spans: (number | null)[]
  /** What the figure says, as equations, like "AB + BC = AC". */
  equations: string[]
  /** Why it can't be solved or doesn't add up, if it can't or doesn't. */
  problem: string
}

/** Solves the figure's labels for their letter and every length. */
export function solve(s: Settings): Solved {
  const given = (label: string, mode: string) => (mode === 'text' ? label.trim() : '')
  const partText = s.parts.map((p) => given(p.label, p.mode))
  const spanText = s.spans.map((sp) => given(sp.label, sp.mode))
  const read = (t: string) => (t ? readLinear(t) : null)
  const parts = partText.map(read)
  const spans = spanText.map(read)

  // A blank part with a span over just it is as long as the span says.
  s.spans.forEach((sp, k) => {
    if (sp.to - sp.from === 1 && !partText[sp.from] && spans[k]) parts[sp.from] = spans[k]
  })

  const unread = [...partText.filter((t, k) => t && !parts[k]), ...spanText.filter((t, k) => t && !spans[k])]
  const letters = new Set([...parts, ...spans].map((l) => l?.letter).filter(Boolean))
  const out: Solved = { letter: null, value: null, parts: s.parts.map(() => null), spans: s.spans.map(() => null), equations: [], problem: '' }

  // The equations: each span is the sum of its parts, and parts with the same ticks are equal.
  type Eq = { a: number; b: number; text: string }
  const eqs: Eq[] = []
  s.spans.forEach((sp, k) => {
    const names = s.parts.slice(sp.from, sp.to).map((_, j) => partName(s, sp.from + j))
    // A span over one part says nothing new to write, but its label still counts.
    if (names.length > 1) out.equations.push(`${names.join(' + ')} = ${spanName(s, sp)}`)
    const inside = parts.slice(sp.from, sp.to)
    if (!spans[k] || inside.some((p) => !p)) return
    const sum = inside.reduce((t, p) => ({ a: t.a + p!.a, b: t.b + p!.b }), { a: 0, b: 0 })
    eqs.push({ a: sum.a - spans[k]!.a, b: sum.b - spans[k]!.b, text: `${names.join(' + ')} = ${spanName(s, sp)}` })
  })
  for (const ticks of [1, 2, 3]) {
    const same = s.parts.map((p, k) => (p.ticks === ticks ? k : -1)).filter((k) => k >= 0)
    if (same.length < 2) continue
    out.equations.push(same.map((k) => partName(s, k)).join(' = '))
    for (const k of same.slice(1)) {
      const [p, q] = [parts[same[0]], parts[k]]
      if (p && q) eqs.push({ a: p.a - q.a, b: p.b - q.b, text: `${partName(s, same[0])} = ${partName(s, k)}` })
    }
  }

  if (letters.size > 1) {
    out.problem = `The labels use more than one letter (${[...letters].join(', ')}), so they can’t be solved.`
    return out
  }
  const letter = ([...letters][0] as string | undefined) ?? null
  out.letter = letter
  let value = 0
  if (letter) {
    const first = eqs.find((e) => Math.abs(e.a) > EPS)
    if (!first) {
      if (unread.length) out.problem = `“${unread[0]}” isn’t a number or an expression like 2x + 3, so it can’t be solved.`
      else out.problem = eqs.length ? `The equations cancel ${letter} out, so it can’t be solved.` : `Add a span or matching ticks to give an equation to solve for ${letter}.`
      return out
    }
    value = -first.b / first.a
    out.value = round(value)
  }
  const at = (l: Linear | null) => (l ? round(l.a * value + l.b) : null)
  out.parts = parts.map(at)
  out.spans = spans.map(at)
  // Lengths left blank follow from the rest: a span from its parts, a part from its span and the others, equal ticks.
  for (let pass = 0; pass < 4; pass++) {
    s.spans.forEach((sp, k) => {
      const inside = out.parts.slice(sp.from, sp.to)
      const missing = inside.filter((v) => v === null).length
      if (out.spans[k] === null && !missing) out.spans[k] = round(inside.reduce<number>((t, v) => t + v!, 0))
      else if (out.spans[k] !== null && missing === 1) {
        const j = sp.from + inside.indexOf(null)
        if (!parts[j] && !partText[j]) out.parts[j] = round(out.spans[k]! - inside.reduce<number>((t, v) => t + (v ?? 0), 0))
      }
    })
    for (const ticks of [1, 2, 3]) {
      const same = s.parts.map((p, k) => (p.ticks === ticks ? k : -1)).filter((k) => k >= 0)
      const known = same.map((k) => out.parts[k]).find((v) => v !== null)
      if (known !== undefined) for (const k of same) if (out.parts[k] === null && !partText[k]) out.parts[k] = known
    }
  }
  const off = eqs.find((e) => Math.abs(e.a * value + e.b) > 1e-6)
  if (off) out.problem = letter ? `With ${letter} = ${show(value)}, ${off.text} doesn’t hold.` : `${off.text} doesn’t hold with these lengths.`
  else if (unread.length) out.problem = `“${unread[0]}” isn’t a number or an expression like 2x + 3, so it’s left out.`
  else {
    const k = out.parts.findIndex((v) => v !== null && v <= 0)
    if (k >= 0) out.problem = `${partName(s, k)} would be ${show(out.parts[k]!)}, and a length has to be more than 0.`
  }
  return out
}
