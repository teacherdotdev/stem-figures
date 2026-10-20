// Where the box and key sit in the figure for each Show setting, and the
// arrow between a before box and its after box. The key itself is laid out
// by $shared/particles/key.

import { spansWidth, textSpans, type Span } from '$shared/particles/key'
import { BOX_SIDE, type BoxContents, type Show } from './settings'

/** Space between the box and the key. */
export const KEY_GAP = 24

/** The least space between a before box and its after box, for the arrow. */
export const ARROW_GAP = 72
/** Space between the arrow's ends, or its label's, and the boxes. */
export const ARROW_PAD = 14
const ARROW_LABEL_SIZE = 15

export interface ArrowLayout {
  /** the space between the boxes */
  gap: number
  /** the label over the arrow, with subscripts and superscripts like key names */
  spans: Span[]
  labelSize: number
}

/** The arrow between a before box and its after box: the usual gap, or one
 *  wide enough for its label. */
export function arrowLayout(label: string): ArrowLayout {
  const spans = textSpans(label.trim(), ARROW_LABEL_SIZE)
  return { gap: Math.max(ARROW_GAP, Math.ceil(spansWidth(spans)) + 2 * ARROW_PAD), spans, labelSize: ARROW_LABEL_SIZE }
}

/** The size of what the figure shows for its box: the box, or both boxes
 *  with `gap` between them for the arrow. */
export const boxesSize = (box: BoxContents, gap = ARROW_GAP) => ({ width: box.after ? 2 * box.width + gap : box.width, height: box.height })

type Place = { x: number; y: number }

export interface FigureLayout {
  width: number
  height: number
  /** where the box's top left corner goes, when it's shown */
  box?: Place
  /** where the key's top left corner goes, when it's shown */
  key?: Place
}

type Size = { width: number; height: number }

/** The figure's size and where the box and key go in it for a Show
 *  setting. With both, the key is to the right of the box and the two are
 *  centered on each other; whichever is taller sets the height. The box is
 *  the scattered square unless a lattice's box is given. */
export function figureLayout(show: Show, key: Size, box: Size = { width: BOX_SIDE, height: BOX_SIDE }): FigureLayout {
  if (show === 'box') return { width: box.width, height: box.height, box: { x: 0, y: 0 } }
  if (show === 'key') return { width: key.width, height: key.height, key: { x: 0, y: 0 } }
  const height = Math.max(box.height, key.height)
  return {
    width: box.width + KEY_GAP + key.width,
    height,
    box: { x: 0, y: (height - box.height) / 2 },
    key: { x: box.width + KEY_GAP, y: (height - key.height) / 2 },
  }
}
