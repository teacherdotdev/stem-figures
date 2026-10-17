// The whole figure for a set of settings, worked out as plain numbers for
// OsmosisFigure.svelte to draw: each picture of the scene (the start, the
// result, both, or a three-up), the particles scattered in it, the arrows
// across its membrane, the words over and under it, the part labels down
// its left, and the key. The answer key's lines and the figure's description
// come from here too.

import { keyLayout, spansWidth, textSpans, type KeyLayout, type Span } from '$shared/particles/key'
import { plainText } from '$shared/particles/keyText'
import { regionArea, scatterIn, type Region } from '$shared/particles/layout'
import { DEFAULT_OUTER, RADIUS, type Disc, type Look, type ParticleKind } from '$shared/particles/particles'
import { column } from '../cell-diagram/labels'
import type { Pt } from '../cell-diagram/shapes'
import {
  OUTCOME_WORDS, amount, opposite, panelsOf, soluteFlow, waterFlow, type Flow, type Outcome, type Panel, type Tonicity,
} from './model'
import { PANEL_H, PANEL_W, sceneShape, type Crossing, type PartKey, type SceneShape } from './scenes'
import { isCell, membraneName, solutesOf, twoSided, type OsmosisSettings, type Scene, type SoluteSettings } from './settings'

/** Space kept between particles, and between them and every edge. */
export const PARTICLE_GAP = 3
/** Water's disc, and how much room each one fills on a side with no solute. */
export const WATER_LOOK: Look = { size: 'xs', shade: 'white', charge: '' }
export const WATER_ROOM = 950
/** The most solute particles on the busiest side, more or less. */
export const BUSIEST = 24

const FONT = 14
const WORD_FONT = 17
const ARROW_FONT = 13
const ROW = 18
const KEY_GAP = 28
const BOTH_GAP = 84
const THREE_GAP = 30
const LABEL_GAP = 10

export type Phase = 'start' | 'result'

/** A line of words, as pieces to draw with their subscripts. */
export interface Words {
  x: number
  y: number
  spans: Span[]
  size: number
  anchor: 'start' | 'middle' | 'end'
  bold?: boolean
  /** a blank line to write on instead, from x1 to x2 */
  blank?: { x1: number; x2: number }
}

export interface Arrow {
  from: Pt
  to: Pt
  kind: 'water' | 'solute'
  /** a dashed box for students to draw the arrow in */
  blank?: boolean
}

/** One picture of the scene, placed in the figure at (x, y). */
export interface Picture {
  x: number
  y: number
  phase: Phase
  panel: Panel
  shape: SceneShape
  water: Disc[]
  solutes: Disc[]
  arrows: Arrow[]
  words: Words[]
}

export interface Leader {
  from: Pt
  to: Pt
}

export interface OsmosisFigure {
  width: number
  height: number
  pictures: Picture[]
  /** the arrow from the start to the result */
  between?: { from: Pt; to: Pt }
  labels: Words[]
  leaders: Leader[]
  key?: { x: number; y: number; layout: KeyLayout; water: boolean }
  /** how much one solute particle stands for, in a space the size of the inside */
  scale: number
  /** solute particles that found no room, over every picture */
  missing: number
}

// Words -----------------------------------------------------------------------

/** About how wide a line of words is drawn, with its subscripts. */
export const wordsWidth = (text: string, size: number) => spansWidth(textSpans(text, size))

const words = (text: string, x: number, y: number, size: number, anchor: Words['anchor'] = 'middle', bold = false): Words => ({
  x, y, spans: textSpans(text, size), size, anchor, bold,
})

/** A blank line for students, as wide as `width`, centred on x (or starting there). */
function blank(x: number, y: number, width: number, anchor: Words['anchor'] = 'middle'): Words {
  const x1 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x
  return { x, y, spans: [], size: FONT, anchor, blank: { x1, x2: x1 + width } }
}

/** A solute's name for the key and labels: what the teacher typed, or "Solute 2". */
export const soluteName = (x: SoluteSettings) => x.name.trim() || `Solute ${x.index + 1}`

const TONICITY_WORDS: Record<Tonicity, string> = { hypertonic: 'Hypertonic', hypotonic: 'Hypotonic', isotonic: 'Isotonic' }

/** What each side is called under the picture. */
function sideNames(scene: Scene): [string, string] {
  if (isCell(scene)) return ['Inside the cell', 'Outside']
  if (scene === 'bag') return ['In the bag', 'In the beaker']
  return ['Side A', 'Side B']
}

/** Each side's solutes as printed: "0.9% NaCl", or "Pure water" when none. */
function concentrationLines(panel: Panel, side: 'inside' | 'outside', unit: OsmosisSettings['unit']) {
  const present = panel.solutes.filter((x) => x[side] > 0)
  return present.length ? present.map((x) => `${amount(x[side], unit)} ${soluteName(x)}`) : ['Pure water']
}

// Particles --------------------------------------------------------------------

const NICE = [1, 2, 2.5, 5]

/** The most of a side the solute particles take up, with the space round
 *  them, so there's room to scatter them and water between. */
export const FILL = 0.35

/** The smallest round amount (1, 2, 2.5 or 5 times a power of ten) that is
 *  at least `want`. */
export function niceAbove(want: number) {
  if (!(want > 0)) return 1
  let power = 10 ** Math.floor(Math.log10(want))
  for (;;) {
    for (const k of NICE) if (k * power >= want * (1 - 1e-9)) return k * power
    power *= 10
  }
}

/** How much one particle stands for, in a space `ref` big: a round amount
 *  that puts no more than BUSIEST on any side, and keeps the solutes to
 *  FILL of it. Each side is its area and its solutes' concentrations and
 *  disc radii. */
export function particleScale(sides: { area: number; solutes: { amount: number; r: number }[] }[], ref: number) {
  const want = Math.max(
    0,
    ...sides.map((side) => {
      const count = side.solutes.reduce((sum, x) => sum + x.amount, 0) * (side.area / ref) / BUSIEST
      const room = side.solutes.reduce((sum, x) => sum + x.amount * Math.PI * (x.r + PARTICLE_GAP + 0.5) ** 2, 0) / (FILL * ref)
      return Math.max(count, room)
    }),
  )
  return niceAbove(want)
}

/** A part's area, less its holes. */
const partArea = (p: SceneShape['inside'][number]) => regionArea(p.region) - p.holes.reduce((sum, h) => sum + regionArea(h), 0)
const areaOf = (parts: SceneShape['inside']) => parts.reduce((sum, p) => sum + partArea(p), 0)

/** `total` split across parts by their areas, largest remainders first. */
function split(total: number, areas: number[]) {
  const whole = areas.reduce((a, b) => a + b, 0)
  if (!whole) return areas.map(() => 0)
  const exact = areas.map((a) => (total * a) / whole)
  const counts = exact.map(Math.floor)
  const order = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r || a.i - b.i)
  for (let k = 0; k < total - counts.reduce((a, b) => a + b, 0); k++) counts[order[k].i]++
  return counts
}

/** How many of each solute are drawn on each side. They're drawn as dense
 *  as their concentration: `scale` per particle in a space the size of the
 *  inside at the start (`ref`). Solutes that can't cross keep their counts in
 *  the result; those that can are shared out so both sides end equally dense. */
export function soluteCounts(panel: Panel, start: SceneShape, end: SceneShape, phase: Phase, scale: number, ref: number) {
  const startIn = areaOf(start.inside)
  const startOut = areaOf(start.outside)
  // Any solute there at all gets at least one particle.
  const count = (amount: number, area: number) => (amount > 0 ? Math.max(1, Math.round(((amount / scale) * area) / ref)) : 0)
  return panel.solutes.map((x) => {
    const inside = count(x.inside, startIn)
    const outside = count(x.outside, startOut)
    if (phase === 'start' || !x.cross) return { inside, outside }
    const endIn = areaOf(end.inside)
    const endOut = areaOf(end.outside)
    const total = inside + outside
    const evenIn = Math.round((total * endIn) / (endIn + endOut))
    return { inside: evenIn, outside: total - evenIn }
  })
}

/** How many water particles fill a part: its room, less one for each solute
 *  particle in it, so a side with more solute has fewer. */
export const waterCount = (area: number, solutes: number) => Math.max(0, Math.round(area / WATER_ROOM - solutes))

const kindOf = (look: Look, count: number, name?: string): ParticleKind => ({
  count, shape: 'single', look: { ...look }, outer: { ...DEFAULT_OUTER }, ...(name ? { name } : {}),
})

/** A rectangle round a line from a to b, `pad` out on every side. */
function around(a: Pt, b: Pt, pad: number): Region {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const ux = (b[0] - a[0]) / len
  const uy = (b[1] - a[1]) / len
  const [nx, ny] = [-uy * pad, ux * pad]
  const [ex, ey] = [ux * pad, uy * pad]
  return [
    { x: a[0] - ex + nx, y: a[1] - ey + ny },
    { x: b[0] + ex + nx, y: b[1] + ey + ny },
    { x: b[0] + ex - nx, y: b[1] + ey - ny },
    { x: a[0] - ex - nx, y: a[1] - ey - ny },
  ]
}

const box = (x0: number, y0: number, x1: number, y1: number): Region => [
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
]

// Arrows ------------------------------------------------------------------------

/** How far apart the two arrows of an isotonic pair are. */
const PAIR = 8

function arrowsAt(c: Crossing, flow: Flow): [Pt, Pt][] {
  if (flow === 'in') return [[c.outer, c.inner]]
  if (flow === 'out') return [[c.inner, c.outer]]
  // equal both ways: one each way, side by side
  const len = Math.hypot(c.outer[0] - c.inner[0], c.outer[1] - c.inner[1]) || 1
  const nx = (-(c.outer[1] - c.inner[1]) / len) * PAIR
  const ny = ((c.outer[0] - c.inner[0]) / len) * PAIR
  const shift = (p: Pt, k: number): Pt => [p[0] + nx * k, p[1] + ny * k]
  return [[shift(c.inner, -1), shift(c.outer, -1)], [shift(c.outer, 1), shift(c.inner, 1)]]
}

/** A label beside an arrow, on the part of it outside the membrane, so it
 *  stays clear of the outline it crosses: over a level arrow, beside an
 *  upright one. */
function arrowLabel(c: Crossing, text: string): Words {
  const mx = (c.inner[0] + c.outer[0]) / 2
  const my = (c.inner[1] + c.outer[1]) / 2
  const level = Math.abs(c.outer[0] - c.inner[0]) >= Math.abs(c.outer[1] - c.inner[1])
  if (!level) return words(text, mx + 12, (c.outer[1] + my) / 2 + 4, ARROW_FONT, 'start')
  const right = c.outer[0] > mx
  return words(text, mx + (right ? 4 : -4), my - PAIR - 9, ARROW_FONT, right ? 'start' : 'end')
}

/** The box a line of words takes up, for keeping particles out of it. */
function wordsBox(w: Words): Region {
  const width = w.blank ? w.blank.x2 - w.blank.x1 : spansWidth(w.spans)
  const x0 = w.blank ? w.blank.x1 : w.anchor === 'middle' ? w.x - width / 2 : w.anchor === 'end' ? w.x - width : w.x
  return box(x0 - 3, w.y - w.size, x0 + width + 3, w.y + 5)
}

// The figure ----------------------------------------------------------------------

/** The pictures the view shows, each a panel at its start or result. */
function picturesOf(s: OsmosisSettings, panels: Panel[]): { panel: Panel; phase: Phase }[] {
  if (s.view === 'three') return panels.map((panel) => ({ panel, phase: s.threeShows }))
  const [panel] = panels
  if (s.view === 'both') return [{ panel, phase: 'start' }, { panel, phase: 'result' }]
  return [{ panel, phase: s.view }]
}

const shapeOf = (scene: Scene, panel: Panel, phase: Phase) =>
  sceneShape(scene, phase === 'start' ? 'start' : panel.outcome, panel.strength)

export function buildOsmosis(s: OsmosisSettings): OsmosisFigure {
  const panels = panelsOf(s)
  const shown = picturesOf(s, panels)
  const sides2 = twoSided(s.scene)
  const unit = s.unit

  // What each picture carries: arrows on all but a result shown beside its start.
  const arrowsOn = (phase: Phase) => !(s.view === 'both' && phase === 'result')
  // The tonicity words and concentrations describe the start, so a result
  // shown beside its start leaves them to the start.
  const wordsOn = arrowsOn

  // Rows over and under the drawings, the same for every picture so they line up.
  const membraneTop = sides2 && s.membraneMode !== 'none'
  const memRow = membraneTop ? 26 : 0
  const tonRow = s.tonicityMode !== 'none' || s.view === 'three' ? 28 : 0
  const noteRow =
    s.waterArrows !== 'none' && shown.some((p) => arrowsOn(p.phase) && p.panel.tonicity === 'isotonic') ? 22 : 0
  const stateRow = s.stateMode !== 'none' && shown.some((p) => p.phase === 'result') ? 26 : 0
  const concLines = Math.max(
    1,
    ...shown.flatMap((p) => [concentrationLines(p.panel, 'inside', unit).length, concentrationLines(p.panel, 'outside', unit).length]),
  )
  const concRow = s.concMode !== 'none' ? 8 + ROW * (1 + concLines) : 0
  const drawY = memRow + tonRow

  // Part labels down the left of the first picture, for a cell or the bag.
  const shapes = shown.map((p) => shapeOf(s.scene, p.panel, p.phase))
  const labelOf = (key: PartKey) =>
    key === 'membrane' ? (s.membraneMode === 'none' ? undefined : { mode: s.membraneMode, text: membraneName(s) })
    : s.partsMode === 'none' ? undefined
    : { mode: s.partsMode, text: key === 'wall' ? 'Cell wall' : 'Vacuole' }
  const partLabels = sides2
    ? []
    : shapes[0].anchors.flatMap((a) => {
        const l = labelOf(a.key)
        return l ? [{ ...a, ...l }] : []
      })
  const BLANK_W = 90
  const columnW = partLabels.length
    ? Math.ceil(Math.max(...partLabels.map((l) => (l.mode === 'blank' ? BLANK_W : wordsWidth(l.text, FONT))))) + LABEL_GAP + 18
    : 0

  // Where each picture goes across the figure.
  const gap = s.view === 'both' ? BOTH_GAP : THREE_GAP
  const xs = shown.map((_, i) => columnW + i * (PANEL_W + gap))
  const picturesW = xs[xs.length - 1] + PANEL_W

  // How much a particle stands for: every picture's start, drawn as dense as its concentrations.
  const startShapes = shown.map((p) => shapeOf(s.scene, p.panel, 'start'))
  const ref = areaOf(startShapes[0].inside)
  const scale = particleScale(
    shown.flatMap((p, i) =>
      (['inside', 'outside'] as const).map((side) => ({
        area: areaOf(startShapes[i][side]),
        solutes: p.panel.solutes.map((x) => ({ amount: x[side], r: RADIUS[x.look.size] })),
      })),
    ),
    ref,
  )
  const [nameIn, nameOut] = sideNames(s.scene)

  let missing = 0
  const leaders: Leader[] = []
  const labels: Words[] = []

  // The part labels' column, placed against the first picture's drawing.
  const placed = column(
    partLabels.map((l) => ({ key: l, anchor: [xs[0] + l.at[0], drawY + l.at[1]] as Pt, height: 22 })),
    columnW - LABEL_GAP,
    drawY + 12,
    drawY + PANEL_H - 12,
    10,
  )
  for (const p of placed) {
    const l = p.key
    const right = columnW - LABEL_GAP - 6
    labels.push(l.mode === 'blank' ? blank(right, p.y + 4, BLANK_W, 'end') : words(l.text, right, p.y + 5, FONT, 'end'))
    leaders.push({ from: [columnW - LABEL_GAP, p.y], to: p.anchor })
  }

  const pictures = shown.map(({ panel, phase }, i): Picture => {
    const shape = shapes[i]
    const x = xs[i]
    const y = drawY
    const pictureWords: Words[] = []
    const holes: Region[] = []

    // Arrows across the membrane: water's, then each solute that can cross.
    const arrows: Arrow[] = []
    if (arrowsOn(phase)) {
      const flow = waterFlow(panel.tonicity)
      const crossings = sides2 ? shape.crossings.slice(0, 1) : shape.crossings.slice(0, 2)
      if (s.waterArrows !== 'none') {
        crossings.forEach((c, k) => {
          for (const [from, to] of arrowsAt(c, flow)) {
            arrows.push({ from, to, kind: 'water', blank: s.waterArrows === 'blank' })
            holes.push(around(from, to, 7))
          }
          if (s.waterArrows === 'show' && k === crossings.length - 1) {
            const w = arrowLabel(c, 'H_2O')
            pictureWords.push(w)
            holes.push(wordsBox(w))
          }
        })
      }
      if (s.soluteArrows !== 'none') {
        panel.solutes
          .filter((x) => soluteFlow(x) !== 'none')
          .forEach((x, k) => {
            const c = shape.crossings[2 + k]
            if (!c) return
            const [[from, to]] = arrowsAt(c, soluteFlow(x))
            arrows.push({ from, to, kind: 'solute', blank: s.soluteArrows === 'blank' })
            holes.push(around(from, to, 7))
            if (s.soluteArrows === 'show') {
              const w = arrowLabel(c, soluteName(x))
              pictureWords.push(w)
              holes.push(wordsBox(w))
            }
          })
      }
    }

    // The particles, scattered side by side through each part.
    const start = startShapes[i]
    const counts = soluteCounts(panel, start, shape, phase, scale, ref)
    const water: Disc[] = []
    const solutes: Disc[] = []
    const fill = (parts: SceneShape['inside'], side: 'inside' | 'outside', sideIndex: number) => {
      const perPart = counts.map((c) => split(c[side], parts.map(partArea)))
      parts.forEach((part, k) => {
        const kinds = panel.solutes.map((x, j) => kindOf(x.look, perPart[j][k]))
        const soluteTotal = kinds.reduce((sum, kind) => sum + kind.count, 0)
        // A three-up's cell keeps its particles wherever a shuffle puts it.
        const seed = s.seed + 7919 * (panel.slot ?? i) + 104729 * (2 * k + sideIndex)
        const options = { holes: [...part.holes, ...holes], gap: PARTICLE_GAP }
        const placed = scatterIn(kinds, part.region, seed, options)
        solutes.push(...placed.discs)
        missing += placed.missing
        // Then water, in the room the solutes leave.
        if (s.water) {
          const wet = scatterIn([kindOf(WATER_LOOK, waterCount(partArea(part), soluteTotal))], part.region, seed + 1, { ...options, placed: placed.discs })
          water.push(...wet.discs)
        }
      })
    }
    fill(shape.inside, 'inside', 0)
    fill(shape.outside, 'outside', 1)

    // The words over the picture: its letter in a three-up, then the tonicity.
    const top = memRow
    if (panel.letter) pictureWords.push(words(panel.letter, 4, top + 18 - drawY, 18, 'start', true))
    if (wordsOn(phase) && s.tonicityMode !== 'none') {
      if (sides2) {
        const t = [opposite(panel.tonicity), panel.tonicity]
        shape.sideX.forEach((sx, k) =>
          pictureWords.push(
            s.tonicityMode === 'blank' ? blank(sx, top + 19 - drawY, 96) : words(TONICITY_WORDS[t[k]], sx, top + 19 - drawY, WORD_FONT, 'middle', true),
          ),
        )
      } else {
        const text = `${TONICITY_WORDS[panel.tonicity]} solution`
        pictureWords.push(
          s.tonicityMode === 'blank' ? blank(PANEL_W / 2, top + 19 - drawY, 130) : words(text, PANEL_W / 2, top + 19 - drawY, WORD_FONT, 'middle', true),
        )
      }
    }
    // The membrane's label over a beaker or U-tube, on the first picture.
    if (membraneTop && i === 0 && shape.membraneTop) {
      const [mx, my] = shape.membraneTop
      const ly = 16 - drawY
      pictureWords.push(s.membraneMode === 'blank' ? blank(mx, ly, 150) : words(membraneName(s), mx, ly, FONT))
      leaders.push({ from: [x + mx, y + ly + 6], to: [x + mx, y + my] })
    }

    // Under the picture: no net movement, the result, then the concentrations.
    let under = PANEL_H
    if (noteRow) {
      if (arrowsOn(phase) && panel.tonicity === 'isotonic') pictureWords.push(words('No net movement', PANEL_W / 2, under + 16, FONT))
      under += noteRow
    }
    if (stateRow) {
      if (phase === 'result') {
        pictureWords.push(
          s.stateMode === 'blank' ? blank(PANEL_W / 2, under + 18, 130) : words(OUTCOME_WORDS[panel.outcome], PANEL_W / 2, under + 18, 16, 'middle', true),
        )
      }
      under += stateRow
    }
    if (concRow && wordsOn(phase)) {
      ;(['inside', 'outside'] as const).forEach((side, k) => {
        const sx = shape.sideX[k]
        pictureWords.push(words(k ? nameOut : nameIn, sx, under + 8 + ROW - 4, FONT, 'middle', true))
        const lines = concentrationLines(panel, side, unit)
        lines.forEach((line, j) => {
          const ly = under + 8 + ROW * (j + 2) - 4
          if (s.concMode === 'blank') {
            const present = panel.solutes.filter((x) => x[side] > 0)
            const name = present[j] ? ` ${soluteName(present[j])}` : ''
            const nameW = name ? wordsWidth(name, FONT) : 0
            const left = sx - (56 + nameW) / 2
            pictureWords.push(blank(left, ly, 56, 'start'))
            if (name) pictureWords.push(words(name, left + 56, ly, FONT, 'start'))
          } else pictureWords.push(words(line, sx, ly, FONT))
        })
      })
    }

    return { x, y, phase, panel, shape, water, solutes, arrows, words: pictureWords }
  })

  const drawH = drawY + PANEL_H + noteRow + stateRow + concRow

  // The key, to the right, centred on the drawings.
  let key: OsmosisFigure['key']
  const keyKinds = [
    ...(s.water ? [kindOf(WATER_LOOK, 0, 'Water')] : []),
    ...solutesOf(s).map((x) => kindOf(x.look, 0, soluteName(x))),
  ]
  let width = picturesW
  if (s.key && keyKinds.length) {
    const layout = keyLayout(keyKinds, '')
    key = { x: picturesW + KEY_GAP, y: Math.max(0, drawY + PANEL_H / 2 - layout.height / 2), layout, water: s.water }
    width = key.x + layout.width
  }

  return {
    width,
    height: Math.max(drawH, key ? key.y + key.layout.height : 0),
    pictures,
    between: s.view === 'both' ? { from: [xs[0] + PANEL_W + 16, drawY + PANEL_H / 2], to: [xs[1] - 16, drawY + PANEL_H / 2] } : undefined,
    labels,
    leaders,
    key,
    scale,
    missing,
  }
}

// The answer key and description ----------------------------------------------------

const OUTCOME_SENTENCES: Record<Outcome, string> = {
  crenated: 'the cell loses water and shrinks (crenates)',
  normal: 'the cell stays the same size',
  swollen: 'the cell gains water and swells',
  burst: 'the cell gains water, swells and bursts (lyses)',
  plasmolyzed: 'the cell loses water and its membrane pulls away from the wall (plasmolysis)',
  flaccid: 'the cell stays flaccid',
  turgid: 'the cell gains water and becomes turgid',
  'rises-a': 'the level rises on side A',
  level: 'the levels stay the same',
  'rises-b': 'the level rises on side B',
  swells: 'the bag gains water and swells',
  same: 'the bag stays the same size',
  shrinks: 'the bag loses water and shrinks',
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Which side is hypertonic, in words. */
function tonicityLine(scene: Scene, t: Tonicity) {
  if (twoSided(scene)) {
    return t === 'isotonic' ? 'Side A and side B are isotonic' : t === 'hypertonic' ? 'Side B is hypertonic to side A' : 'Side A is hypertonic to side B'
  }
  const [inner, outer] = scene === 'bag' ? ['the bag', 'The beaker'] : ['the cell', 'The solution']
  return `${outer} is ${t} to ${inner}`
}

/** Where water goes, in words. */
function waterLine(scene: Scene, t: Tonicity) {
  const flow = waterFlow(t)
  if (flow === 'none') return 'No net water movement'
  if (twoSided(scene)) return `Net water movement from side ${flow === 'in' ? 'B to side A' : 'A to side B'}`
  const inner = scene === 'bag' ? 'the bag' : 'the cell'
  return `Net water movement ${flow === 'in' ? 'into' : 'out of'} ${inner}`
}

/** Where each solute that can cross goes, in words. */
function soluteLines(scene: Scene, panel: Panel) {
  return panel.solutes.flatMap((x) => {
    const flow = soluteFlow(x)
    if (flow === 'none') return []
    const name = plainText(soluteName(x))
    if (twoSided(scene)) return [`${name} moves from side ${flow === 'in' ? 'B to side A' : 'A to side B'} until equal`]
    const inner = scene === 'bag' ? 'the bag' : 'the cell'
    return [`${capital(name)} moves ${flow === 'in' ? 'into' : 'out of'} ${inner} until equal`]
  })
}

/** The answer key: which side is hypertonic, which way water and any solute
 *  that can cross move, and what happens. A three-up gets a line per cell. */
export function answerLines(s: OsmosisSettings): string[] {
  const panels = panelsOf(s)
  if (s.view === 'three' && panels.length > 1) {
    return panels.map((p) => {
      const flow = waterFlow(p.tonicity)
      const water = flow === 'none' ? 'no net water movement' : `water moves ${flow === 'in' ? 'in' : 'out'}`
      return `${p.letter}: ${p.tonicity}, ${water}, ${OUTCOME_SENTENCES[p.outcome]}`
    })
  }
  const [p] = panels
  return [tonicityLine(s.scene, p.tonicity), waterLine(s.scene, p.tonicity), ...soluteLines(s.scene, p), capital(OUTCOME_SENTENCES[p.outcome])]
}

const SCENE_WORDS: Record<Scene, string> = {
  blood: 'a red blood cell in a solution',
  plant: 'a plant cell in a solution',
  beaker: 'a beaker split by a selectively permeable membrane',
  utube: 'a U-tube with a selectively permeable membrane at the bottom',
  bag: 'a dialysis-tubing bag in a beaker',
}

/** What the figure shows, for screen readers. */
export function describe(s: OsmosisSettings) {
  if (s.titleMode === 'text' && s.title.trim()) return s.title.trim()
  const panels = panelsOf(s)
  const [nameIn, nameOut] = sideNames(s.scene)
  const side = (p: Panel, which: 'inside' | 'outside') =>
    concentrationLines(p, which, s.unit).map((l) => (l === 'Pure water' ? 'pure water' : plainText(l))).join(', ')
  const sides = (p: Panel) => `${nameIn.toLowerCase()}: ${side(p, 'inside')}; ${nameOut.toLowerCase()}: ${side(p, 'outside')}`
  if (s.view === 'three' && panels.length > 1) {
    return `An osmosis figure: the same ${s.scene === 'blood' ? 'red blood cell' : 'plant cell'} in three solutions. ${panels
      .map((p) => `${p.letter}: ${p.tonicity}, ${OUTCOME_SENTENCES[p.outcome]}`)
      .join('. ')}`
  }
  const [p] = panels
  const view = s.view === 'both' ? ', before and after' : s.view === 'result' ? ', after osmosis' : ''
  return `An osmosis figure: ${SCENE_WORDS[s.scene]}${view}. ${capital(sides(p))}. ${answerLines(s).join('. ')}`
}
