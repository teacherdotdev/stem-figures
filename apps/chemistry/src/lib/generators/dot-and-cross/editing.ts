// What the teacher can click in a dot-and-cross figure to edit it (see
// edits.ts): every electron unless they're blank, every element symbol and
// every ion's charge, each kept clickable when it's been edited away so it
// can be clicked back. Each has the box it's drawn in and a name for
// keyboard and screen reader users.

import { clickEdits, type Clicked, type EditTarget } from './edits'
import { BLANK_CHARGE, type DotCrossFigure } from './figure'
import { MARK_KINDS, MARK_NAMES } from './marks'
import type { DotCrossSettings } from './settings'
import { CHARGE_FONT, MARK, SYMBOL_FONT, textWidth } from './shells'

export interface EditItem {
  target: EditTarget
  /** a key that stays the same while the figure is redrawn */
  key: string
  /** the middle of what's drawn, and half its width and height */
  x: number
  y: number
  halfW: number
  halfH: number
  /** "electron 3, dot, on O" */
  label: string
}

const CHARGE_WORDS = { show: 'shown', blank: 'a blank box', none: 'left off' }

/** Everything clickable: the symbols, then the charges, then the electrons. */
export function editItems(f: DotCrossFigure): EditItem[] {
  if (!f.read.ok) return []
  const items: EditItem[] = []
  f.symbols.forEach((t, i) => {
    items.push({
      target: { kind: 'symbol', index: i },
      key: `s${i}`,
      x: t.x,
      y: t.y,
      halfW: textWidth(t.text, SYMBOL_FONT) / 2 + 2,
      halfH: SYMBOL_FONT * 0.45,
      label: `symbol ${t.text}, ${t.blank ? 'blank' : 'shown'}`,
    })
  })
  f.brackets.forEach((b, i) => {
    const w = b.mode === 'show' ? textWidth(b.chargeText, CHARGE_FONT) : BLANK_CHARGE
    const on = f.symbols.find((t) => t.x === b.x && t.y === b.y)
    items.push({
      target: { kind: 'charge', index: i },
      key: `c${i}`,
      x: b.chargeAt.x + w / 2,
      y: b.chargeAt.y - 6,
      halfW: w / 2 + 1,
      halfH: 11,
      label: `charge ${b.chargeText.replace('−', 'minus')}${on ? ` on ${on.text}` : ''}, ${CHARGE_WORDS[b.mode]}`,
    })
  })
  f.marks.forEach((m, i) => {
    let near = f.symbols[0]
    for (const t of f.symbols) if (Math.hypot(t.x - m.x, t.y - m.y) < Math.hypot(near.x - m.x, near.y - m.y)) near = t
    items.push({
      target: { kind: 'electron', index: i },
      key: `e${i}`,
      x: m.x,
      y: m.y,
      halfW: MARK + 1,
      halfH: MARK + 1,
      label: `electron ${i + 1}, ${m.kind ? MARK_NAMES[m.kind][0] : 'not drawn'}${near ? `, on ${near.text}` : ''}`,
    })
  })
  return items
}

/** The edits after clicking `target` in figure `f`, drawn from settings `s`. */
export function editAfterClick(s: DotCrossSettings, f: DotCrossFigure, target: EditTarget): string {
  const now: Clicked = {}
  if (target.kind === 'electron') {
    const m = f.marks[target.index]
    if (!m) return s.edits
    now.electron = { drawn: m.kind ?? 'gone', own: MARK_KINDS[m.owner] }
  } else if (target.kind === 'charge') {
    const b = f.brackets[target.index]
    if (!b) return s.edits
    now.charge = { drawn: b.mode, setting: s.charges }
  } else if (!f.symbols[target.index]) return s.edits
  return clickEdits(s.edits, target, now, s.swap)
}

/** The item a point picks: of those whose hit area (what's drawn, grown to
 *  at least `reach` each way from its middle) holds the point, the one
 *  drawn nearest it. */
export function itemAt(items: EditItem[], x: number, y: number, reach: number): EditItem | undefined {
  let best: EditItem | undefined
  let bestD = Infinity
  for (const it of items) {
    const dx = Math.abs(x - it.x)
    const dy = Math.abs(y - it.y)
    if (dx > Math.max(it.halfW, reach) || dy > Math.max(it.halfH, reach)) continue
    // distance to what's drawn, then to its middle, to choose between items it's inside
    const d = Math.hypot(Math.max(0, dx - it.halfW), Math.max(0, dy - it.halfH)) * 1000 + Math.hypot(dx, dy)
    if (d < bestD) [best, bestD] = [it, d]
  }
  return best
}
