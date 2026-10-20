// Checks for figure tests: where every label on a figure is, as a box, and
// whether any two overlap.

import { textBox, type Box } from '$shared/graph/labels'
import { runsWidth } from '$shared/graph/runs'
import type { FigureLayout } from './figure'

/** Every written label on a figure, as a box on the drawing. */
export function labelBoxes(f: FigureLayout): (Box & { text: string })[] {
  return f.panels.flatMap((p) =>
    p.labels.map((l) => {
      const w = l.runs ? runsWidth(l.runs, p.labelFs) : Math.abs((l.blank?.x2 ?? 0) - (l.blank?.x1 ?? 0))
      const b = textBox(l, w, p.labelFs)
      return { x0: b.x0 + p.at.x, x1: b.x1 + p.at.x, y0: b.y0 + p.at.y, y1: b.y1 + p.at.y, text: l.runs?.map((r) => r.text).join('') ?? '____' }
    }),
  )
}

/** The pairs of labels that overlap, by their text. */
export function overlaps(f: FigureLayout) {
  const boxes = labelBoxes(f)
  const out: string[] = []
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      if (a.x0 < b.x1 - 0.5 && b.x0 < a.x1 - 0.5 && a.y0 < b.y1 - 0.5 && b.y0 < a.y1 - 0.5) out.push(`${a.text} / ${b.text}`)
    }
  }
  return out
}
