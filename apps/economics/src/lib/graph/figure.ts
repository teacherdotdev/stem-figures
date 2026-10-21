// An economics figure: one graph, or two side by side (the market and the
// firm in perfect competition, two countries' production possibilities),
// their grids lined up at the top so a dashed line can run across from one
// to the other at the same height, as the market price runs across to the
// firm's. Side by side, the chart title goes over them all, and their axis
// words and captions line up underneath.

import { round, type Point } from '$shared/graph/grid'
import type { Segment } from '$shared/graph/labels'
import { buildPanel, shows, type PanelLayout, type PanelSpec } from './panel'

const GAP = 28 // between panels

/** A dashed line from a point on one panel across to one on another, in each one's graph units. */
export type Connector = { from: { panel: number; at: Point }; to: { panel: number; at: Point } }

export function buildFigure(specs: PanelSpec[], connectors: Connector[] = []) {
  // One chart title, over the first panel to make room for it, then moved to the middle of them all.
  const title = specs.length > 1 ? specs.find((s) => shows(s.title))?.title : undefined
  if (title) specs = specs.map((s, k) => ({ ...s, title: k === 0 ? title : undefined }))
  let laid = specs.map(buildPanel)
  // The x-axis's words under their ends, then the captions, as low as the lowest one's.
  if (laid.length > 1) {
    const word = Math.max(...laid.map((p) => p.floors.word))
    laid = specs.map((s, k) => (laid[k].floors.word < word - 0.5 ? buildPanel({ ...s, floor: { word } }) : laid[k]))
    const caption = Math.max(...laid.map((p) => p.floors.caption))
    laid = specs.map((s, k) => (laid[k].floors.caption < caption - 0.5 ? buildPanel({ ...s, floor: { word, caption } }) : laid[k]))
  }
  // Line the grids up at the top: each moved down to the lowest one's top.
  const top = Math.max(...laid.map((p) => p.top))
  let x = 0
  const panels: (PanelLayout & { at: Point })[] = laid.map((p, k) => {
    const at = { x: round(x), y: round(top - p.top) }
    x += p.width + (k < laid.length - 1 ? GAP : 0)
    return { ...p, at }
  })
  const width = round(x)
  if (title) {
    const p = panels[0]
    const by = width / 2 - p.at.x - (p.grid.x + p.grid.w / 2)
    p.big = p.big.map((l) => (l.y < p.grid.y ? { ...l, x: round(l.x + by) } : l))
    p.blanks = p.blanks.map((b) => (b.y1 < p.grid.y ? { ...b, x1: round(b.x1 + by), x2: round(b.x2 + by) } : b))
  }
  const height = round(Math.max(...panels.map((p) => p.at.y + p.height)))
  const onFigure = (panel: number, at: Point): Point => {
    const p = panels[panel]
    const q = p.px(at)
    return { x: q.x + p.at.x, y: q.y + p.at.y }
  }
  const lines: Segment[] = connectors.map((c) => {
    const a = onFigure(c.from.panel, c.from.at)
    const b = onFigure(c.to.panel, c.to.at)
    return { x1: round(a.x), y1: round(a.y), x2: round(b.x), y2: round(b.y) }
  })
  return { width, height, panels, connectors: lines }
}

export type FigureLayout = ReturnType<typeof buildFigure>
