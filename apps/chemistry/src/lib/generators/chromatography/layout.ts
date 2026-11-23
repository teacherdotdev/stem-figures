// Where everything in a Chromatography figure goes, in pixels: the paper
// (and, set up, the beaker and glass rod around it) once or twice, the
// samples' lanes across it, each spot's height, the measurement arrows and
// the part labels. Kept apart from the drawing so it can be tested.

import { textWidth } from '$shared/graph/labels'
import { answerLines, sampleName, type ChromatographySettings } from './settings'
import type { InkColor } from './inks'

/** Pixels per centimeter of paper. */
export const PX = 26
const ORIGIN_CM = 1.5 // the origin line above the paper's bottom edge
const TOP_CM = 1.2 // paper left above the solvent front
const WATER_CM = 0.6 // how far the paper dips into the solvent: always below the origin line
const LANE = 52 // a lane without measurements
const SPOT_X = 20 // a spot's middle from its lane's left, with measurements
const COLUMN = 45 // each measurement arrow and its label
const FRONT_MARGIN = 64 // the paper's left margin holding the solvent front's arrow
const MARGIN = 18
const ROD_R = 5
const ROD_OVERHANG = 16
const BEAKER_GAP = 24 // between the paper and the beaker's walls
const BEAKER_FLOOR = 12 // under the paper
const WALL = 2
const PANEL_GAP = 56
const CAPTION_H = 30
const LABEL_GAP = 28 // between the figure and the part labels' words
const LABEL_FONT = 13
const LABEL_LINE = 19
/** the samples' names under the origin line */
export const NAME_FONT = 13
const NAME_GAP = 8 // between two samples' names
const NAME_EDGE = 8 // between a name and the paper's edge
/** the answer key's size and the sheet's padding round the figure, as the figure frame draws them */
const KEY_FONT = 18
const FRAME_PAD = 16
/** Text widths, measured as bold Arial so they're never short. */
const widthOf = (text: string, size: number) => textWidth(text, size)

export type Stage = 'before' | 'after'

export interface SpotAt {
  color: InkColor
  distance: number
  /** its middle, from the paper's top */
  y: number
  /** where its measurement arrow runs up from the origin line, or null for none */
  arrowX: number | null
}

export interface Lane {
  name: string
  /** the spots' middle, from the paper's left */
  x: number
  spots: SpotAt[]
}

export interface Panel {
  stage: Stage
  /** the paper's top left in the figure */
  paperX: number
  paperY: number
  /** set up: the beaker's inside, the solvent's surface and the rod, in the figure */
  beaker: { left: number; right: number; rim: number; bottom: number } | null
  waterY: number | null
  rodY: number
  /** the panel's left and right edges in the figure, for its caption */
  left: number
  right: number
}

export interface PartLabel {
  text: string
  /** the point it names */
  x: number
  y: number
  /** its words' left baseline middle */
  textY: number
}

export interface ChromatogramLayout {
  paperW: number
  paperH: number
  originY: number
  frontY: number
  /** the solvent front's arrow, from the paper's left, or null without measurements */
  frontArrowX: number | null
  lanes: Lane[]
  panels: Panel[]
  labels: PartLabel[]
  labelX: number
  captions: boolean
  width: number
  height: number
}

/** Spread words wanted at `ys` so no two are closer than `gap`, keeping their order. */
export function spread(ys: number[], gap: number): number[] {
  const out = [...ys]
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + gap)
  // pull the whole run back up by half of how far it was pushed down, so it stays centered on what it names
  const pushed = out.length ? out[out.length - 1] - ys[ys.length - 1] : 0
  if (pushed > 0) {
    const lift = pushed / 2
    for (let i = 0; i < out.length; i++) out[i] -= lift
    for (let i = out.length - 2; i >= 0; i--) out[i] = Math.min(out[i], out[i + 1] - gap)
  }
  return out
}

export function chromatogramLayout(s: ChromatographySettings): ChromatogramLayout {
  const measure = s.measurements
  const paperH = (ORIGIN_CM + s.front + TOP_CM) * PX
  const originY = paperH - ORIGIN_CM * PX
  const frontY = originY - s.front * PX

  // Lanes across the paper. With measurements, each spot that moved has a
  // column of its own to the right of the spots, nearest first, so no two
  // labels share a place. A lane is moved along if its name would run into
  // the name before it, or off the paper.
  let x = measure ? FRONT_MARGIN : MARGIN
  let lastName: { x: number; half: number } | undefined
  const lanes: Lane[] = s.samples.map((sample, i) => {
    const moved = [...sample.spots.keys()].filter((j) => sample.spots[j].distance > 0).sort((a, b) => sample.spots[a].distance - sample.spots[b].distance)
    const half = widthOf(sampleName(sample, i), NAME_FONT) / 2
    const offset = measure ? SPOT_X : Math.max(LANE, 2 * half + NAME_GAP) / 2
    const need = lastName ? lastName.x + lastName.half + NAME_GAP + half : NAME_EDGE + half
    x += Math.max(0, need - (x + offset))
    const width = measure ? Math.max(LANE, SPOT_X + 14 + moved.length * COLUMN) : 2 * offset
    const spotX = x + offset
    lastName = { x: spotX, half }
    const lane: Lane = {
      name: sampleName(sample, i),
      x: spotX,
      spots: sample.spots.map((p, j) => ({
        color: p.color,
        distance: p.distance,
        y: originY - p.distance * PX,
        arrowX: measure && moved.includes(j) ? spotX + 20 + moved.indexOf(j) * COLUMN : null,
      })),
    }
    x += width
    return lane
  })
  const paperW = Math.max(x + MARGIN, lastName ? lastName.x + lastName.half + NAME_EDGE : 0, 96)

  // The papers, set up in beakers or alone, side by side.
  const stages: Stage[] = s.show === 'both' ? ['before', 'after'] : ['after']
  const panelW = s.setup ? paperW + 2 * (BEAKER_GAP + WALL + ROD_OVERHANG) : paperW
  const panels: Panel[] = stages.map((stage, i) => {
    const left = i * (panelW + PANEL_GAP)
    if (!s.setup) return { stage, paperX: left, paperY: 0, beaker: null, waterY: null, rodY: 0, left, right: left + paperW }
    const rodY = ROD_R + 1
    const paperX = left + ROD_OVERHANG + WALL + BEAKER_GAP
    const paperY = rodY
    const beaker = { left: paperX - BEAKER_GAP, right: paperX + paperW + BEAKER_GAP, rim: rodY + ROD_R, bottom: paperY + paperH + BEAKER_FLOOR }
    return { stage, paperX, paperY, beaker, waterY: paperY + paperH - WATER_CM * PX, rodY, left, right: left + panelW }
  })
  const drawingH = s.setup ? panels[0].beaker!.bottom + WALL : paperH
  const drawingW = panels[panels.length - 1].right

  // Part labels to the right, naming the last paper's parts.
  const last = panels[panels.length - 1]
  const edge = last.paperX + paperW
  const wanted: Omit<PartLabel, 'textY'>[] = []
  if (s.labels) {
    if (last.beaker) wanted.push({ text: 'Glass rod', x: last.beaker.right + WALL + ROD_OVERHANG / 2, y: last.rodY })
    wanted.push({ text: 'Chromatography paper', x: edge - 6, y: last.paperY + (frontY - 14) / 2 + 6 })
    if (last.stage === 'after') wanted.push({ text: 'Solvent front', x: edge - 4, y: last.paperY + frontY })
    wanted.push({ text: 'Pencil line (origin)', x: edge - 4, y: last.paperY + originY })
    if (last.beaker && last.waterY !== null) {
      wanted.push({ text: `${s.solvent.trim() || 'Solvent'} (solvent)`, x: last.beaker.right - 8, y: (last.waterY + last.beaker.bottom) / 2 })
      wanted.push({ text: 'Beaker', x: last.beaker.right + WALL / 2, y: last.beaker.rim + (last.waterY - last.beaker.rim) * 0.82 })
    }
  }
  wanted.sort((a, b) => a.y - b.y)
  const textYs = spread(wanted.map((w) => w.y), LABEL_LINE)
  const labels = wanted.map((w, i) => ({ ...w, textY: textYs[i] }))
  const labelX = drawingW + LABEL_GAP
  const labelW = Math.max(0, ...labels.map((l) => widthOf(l.text, LABEL_FONT))) + 4
  const top = Math.min(0, ...textYs.map((y) => y - 12))
  const bottom = Math.max(drawingH + (stages.length > 1 ? CAPTION_H : 0), ...textYs.map((y) => y + 6))

  // Wide enough for the answer key under it (the frame adds its padding),
  // with the drawing centered over it.
  const drawnW = labels.length ? labelX + labelW : drawingW
  const keyW = s.answerKey ? Math.max(0, ...answerLines(s).map((line) => widthOf(line, KEY_FONT))) - 2 * FRAME_PAD + 8 : 0
  const width = Math.max(drawnW, keyW)
  const dx = (width - drawnW) / 2

  return {
    paperW,
    paperH,
    originY,
    frontY,
    frontArrowX: measure ? 18 : null,
    lanes,
    panels: panels.map((p) => shiftPanel(p, dx, -top)),
    labels: labels.map((l) => ({ ...l, x: l.x + dx, y: l.y - top, textY: l.textY - top })),
    labelX: labelX + dx,
    captions: stages.length > 1,
    width,
    height: bottom - top,
  }
}

function shiftPanel(p: Panel, dx: number, dy: number): Panel {
  return {
    ...p,
    paperX: p.paperX + dx,
    left: p.left + dx,
    right: p.right + dx,
    paperY: p.paperY + dy,
    rodY: p.rodY + dy,
    waterY: p.waterY === null ? null : p.waterY + dy,
    beaker: p.beaker && { left: p.beaker.left + dx, right: p.beaker.right + dx, rim: p.beaker.rim + dy, bottom: p.beaker.bottom + dy },
  }
}

/** The bottom of the drawing, under which a two-paper figure's captions go. */
export const captionY = (l: ChromatogramLayout) =>
  Math.max(...l.panels.map((p) => (p.beaker ? p.beaker.bottom + WALL : p.paperY + l.paperH))) + 22
