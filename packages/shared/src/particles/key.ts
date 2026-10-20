// The key beside the box: a bordered list headed "Key", one line per particle
// kind drawn exactly as in the box and followed by the name the teacher
// typed, with an optional note line at the bottom. Names and the note can
// have subscripts and superscripts (./keyText.ts). See Chemistry's
// CONTEXT.md "Key".

import { plainText, textRuns } from './keyText'
import { describeParticle, discBounds, particleDiscs, type Disc, type ParticleKind } from './particles'

/** Space inside the key's border. */
export const KEY_PAD = 12
/** Space between the drawings and the names. */
export const NAME_GAP = 12

const FONT_SIZE = 16
const HEADING_SIZE = 17
const NOTE_SIZE = 14
/** Height kept for a line of text: the heading, a name or the note. */
const TEXT_H = 20
const LINE_GAP = 10

/** About how wide text is set in Arial. The server can't measure text, so
 *  the key is sized from this: roughly 0.55 of the font size per character. */
export const textWidth = (text: string, fontSize: number) => 0.55 * fontSize * [...text].length

/** A subscript's or superscript's size as a share of its text's. */
export const SCRIPT = 0.7
/** How far a subscript drops and a superscript rises, as a share of the
 *  text's size. */
const SHIFT = { sub: 0.3, super: -0.4 }

/** A piece of key text as drawn: its size, and how far it moves up or down
 *  from the piece before (back to the line after a subscript, say). */
export interface Span {
  text: string
  size: number
  dy: number
}

/** Key text as pieces to draw at `size`. Plain text is one piece. */
export function textSpans(text: string, size: number): Span[] {
  let offset = 0
  return textRuns(text).map((run) => {
    const target = run.shift ? SHIFT[run.shift] * size : 0
    const dy = target - offset
    offset = target
    return { text: run.text, size: run.shift ? size * SCRIPT : size, dy }
  })
}

/** About how wide pieces of text are, each at its own size. */
export const spansWidth = (spans: Span[]) => spans.reduce((w, s) => w + textWidth(s.text, s.size), 0)

export interface KeyLine {
  name: string
  spans: Span[]
  /** the kind's discs, placed in the key */
  discs: Disc[]
  nameX: number
  nameY: number
}

export interface KeyLayout {
  width: number
  height: number
  headingY: number
  fontSize: number
  headingSize: number
  noteSize: number
  lines: KeyLine[]
  note?: { text: string; spans: Span[]; x: number; y: number }
}

/** The key laid out from (0, 0). Each drawing is centered in a column as
 *  wide as the widest one, and on its name, which all start after it. Text
 *  y values are the middle of the line. */
export function keyLayout(kinds: ParticleKind[], note: string): KeyLayout {
  const drawings = kinds.map((kind) => {
    const discs = particleDiscs(kind)
    return { kind, discs, bounds: discBounds(discs) }
  })
  const drawW = Math.max(...drawings.map(({ bounds: b }) => b.right - b.left))
  const nameX = KEY_PAD + drawW + NAME_GAP

  const headingY = KEY_PAD + TEXT_H / 2
  let y = KEY_PAD + TEXT_H + LINE_GAP
  const lines = drawings.map(({ kind, discs, bounds: b }) => {
    const lineH = Math.max(b.bottom - b.top, TEXT_H)
    const middle = y + lineH / 2
    const dx = KEY_PAD + drawW / 2 - (b.left + b.right) / 2
    const dy = middle - (b.top + b.bottom) / 2
    y += lineH + LINE_GAP
    const name = kind.name ?? ''
    return { name, spans: textSpans(name, FONT_SIZE), discs: discs.map((d) => ({ ...d, x: d.x + dx, y: d.y + dy })), nameX, nameY: middle }
  })

  const noteText = note.trim()
  let noteLine: KeyLayout['note']
  if (noteText) {
    noteLine = { text: noteText, spans: textSpans(noteText, NOTE_SIZE), x: KEY_PAD, y: y + TEXT_H / 2 }
    y += TEXT_H + LINE_GAP
  }

  const content = Math.max(
    textWidth('Key', HEADING_SIZE),
    drawW + NAME_GAP + Math.max(...lines.map((l) => spansWidth(l.spans))),
    noteLine ? spansWidth(noteLine.spans) : 0,
  )
  return {
    width: Math.ceil(2 * KEY_PAD + content),
    height: y - LINE_GAP + KEY_PAD,
    headingY,
    fontSize: FONT_SIZE,
    headingSize: HEADING_SIZE,
    noteSize: NOTE_SIZE,
    lines,
    note: noteLine,
  }
}

/** The key as read by a screen reader, e.g. "Key: large light gray − ion,
 *  “Any negative ion”; small white + ion. H₂O molecules are not shown",
 *  starting with `lead`. */
export function keyLabel(kinds: ParticleKind[], note: string, lead = 'Key') {
  const lines = kinds.map((k) => `${describeParticle(k)}${k.name ? `, “${plainText(k.name)}”` : ''}`)
  return `${lead}: ${lines.join('; ')}${note.trim() ? `. ${plainText(note.trim())}` : ''}`
}
