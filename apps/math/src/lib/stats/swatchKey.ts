// A key naming what each fill stands for: a filled square, then its name.
// On the right of a figure the entries stack down; below it they run across
// in rows as wide as the figure allows. Positions are from the key's own top
// left; the figure moves it into place. ($shared/graph/labels.ts has a key for
// curves, whose samples are lines rather than swatches.)

import { textWidth } from '$shared/graph/labels'
import type { Fill } from './fills'

export type KeyEntry = { text: string; fill: Fill }
export type KeyItem = KeyEntry & { x: number; y: number; size: number; tx: number; ty: number }
export type KeyLayout = { width: number; height: number; items: KeyItem[] }

/** The key's entries laid out at font size `fs`; `maxWidth` wraps a key below a figure. */
export function layoutSwatchKey(entries: KeyEntry[], fs: number, at: 'right' | 'below', maxWidth = Infinity): KeyLayout {
  const size = Math.round(fs * 1.05)
  const gap = fs * 0.5 // between a swatch and its name
  const rowH = Math.max(size, fs) + fs * 0.55
  const across = fs * 1.6 // between entries in a row
  const items: KeyItem[] = []
  let x = 0
  let y = 0
  let width = 0
  for (const e of entries) {
    const w = size + gap + textWidth(e.text, fs)
    if (at === 'below' && x > 0 && x + w > maxWidth) {
      x = 0
      y += rowH
    }
    items.push({ ...e, x, y, size, tx: x + size + gap, ty: y + size / 2 + fs * 0.36 })
    width = Math.max(width, x + w)
    if (at === 'below') x += w + across
    else y += rowH
  }
  const rows = at === 'below' ? (entries.length ? y / rowH + 1 : 0) : entries.length
  return { width, height: rows ? rows * rowH - (rowH - size) : 0, items }
}
