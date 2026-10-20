// A caliper: its three sliding scales, how a reading is made of the
// main scale and the one sliding scale mark that lines up, and where every part of
// the drawn caliper sits.

import { objectShape, type Instrument, type JawObject } from './instrument'

/** Least counts in mm, as the address writes them. */
export const LEAST_COUNTS = ['0.1', '0.05', '0.02'] as const
export type LeastCount = (typeof LEAST_COUNTS)[number]

/** The main scale reads from 0 to this many mm. */
export const CALIPER_RANGE = 150
/** The largest zero error either way, in mm. */
export const CALIPER_MAX_ZERO = 0.5

export interface CaliperScale extends Instrument {
  /** marks after the zero, up to the last */
  divisions: number
  /** mm from the sliding scale's zero to its last mark */
  length: number
  /** mm between sliding scale marks */
  spacing: number
  /** divisions between the sliding scale's numbers, each 0.1 mm: 0, 1, 2… 10 */
  numberEvery: number
  /** drawing units per mm in the close-up of the whole sliding scale */
  strip: number
  /** drawing units per mm in the detail of where the marks line up, for a
   *  sliding scale too fine to tell its lined-up mark from its neighbours in the
   *  strip; 0 for none */
  detail: number
}

// Each sliding scale fits n divisions in n × g − 1 mm, g being 1 or 2, so each is
// one least count short of g mm: 10 in 9 mm, 20 in 39 mm, 50 in 49 mm.
// A mark next to the lined-up one is a least count off: in the strip that is
// 2.2 drawing units on the 0.1 mm sliding scale, but under one on the others, so
// they get a detail where it is 3.5 or 3.2, several times a mark's width.
const SCALES: Record<LeastCount, { divisions: number; length: number; decimals: number; strip: number; detail: number }> = {
  '0.1': { divisions: 10, length: 9, decimals: 1, strip: 22, detail: 0 },
  '0.05': { divisions: 20, length: 39, decimals: 2, strip: 18, detail: 70 },
  '0.02': { divisions: 50, length: 49, decimals: 2, strip: 16, detail: 160 },
}

export function caliperScale(lc: LeastCount): CaliperScale {
  const v = SCALES[lc]
  const leastCount = Number(lc)
  return {
    ...v,
    leastCount,
    range: CALIPER_RANGE,
    maxZero: CALIPER_MAX_ZERO,
    spacing: v.length / v.divisions,
    numberEvery: Math.round(0.1 / leastCount),
  }
}

/** The main scale runs past the range far enough for the sliding scale's last mark at a full-range reading. */
export const mainScaleEnd = (v: CaliperScale) => Math.ceil((CALIPER_RANGE + v.length) / 10) * 10

/** How a reading is read: the main-scale mark just left of the sliding scale's
 *  zero, and the sliding scale mark `k` lining up with a main-scale mark, worth k
 *  least counts. */
export function readingOf(v: CaliperScale, reading: number) {
  const main = Math.floor(reading + 1e-9)
  const k = Math.round((reading - main) / v.leastCount)
  return { main, k }
}

/** Every sliding scale mark, from the zero at the reading: its place on the main
 *  scale in mm, its number (each 0.1 mm) and whether it is long. */
export function slideMarks(v: CaliperScale, reading: number) {
  return Array.from({ length: v.divisions + 1 }, (_, i) => {
    const numbered = i % v.numberEvery === 0
    return { i, at: reading + i * v.spacing, number: numbered ? String(i / v.numberEvery) : undefined }
  })
}

/** Drawing units per mm. */
export const PX = 4

// In mm across: the fixed jaw's measuring face is FACE from the left end, and
// the main scale's zero ZERO_IN past it. The slider's jaw face is its left
// end, with the sliding scale's zero ZERO_IN along from it, so with the jaws closed
// the two zeros meet. It runs TAIL past the sliding scale's last mark, for the
// thumb rest.
const FACE = 22
const ZERO_IN = 5
const TAIL = 15
// In mm down: the inside jaws' tips, the head and slider, the beam, the edge
// where the main scale meets the sliding scale, and the outside jaws' tips.
const Y = { tip: 0, top: 11, beamTop: 14, window: 15.5, edge: 26, beamBottom: 30, bottom: 37, jawTip: 78 }
const OBJECT = { cy: 57, depth: 24, wire: { above: 40, below: 40 } }

/** Where everything sits on a caliper whose jaws are `gap` mm apart and whose
 *  sliding scale zero is at `reading` mm (the two differ by the zero error), in
 *  drawing units. */
export function caliperLayout(v: CaliperScale, reading: number, gap: number, object: JawObject = 'none', labeled = false) {
  const x = (mm: number) => mm * PX
  const sliderLength = ZERO_IN + v.length + TAIL
  /** the beam reaches past the slider at a full-range reading */
  const beamEnd = FACE + CALIPER_RANGE + CALIPER_MAX_ZERO + sliderLength + 4
  const slider = FACE + gap
  const shapeAt = (down: number) =>
    objectShape(object, x(FACE), x(slider), down + OBJECT.cy * PX, OBJECT.depth * PX, { above: OBJECT.wire.above * PX, below: OBJECT.wire.below * PX })
  // A ball wider than the jaws are long reaches above them, behind the beam:
  // the caliper moves down to make room.
  const down = Math.max(0, 2 - shapeAt(0).top)
  const y = (mm: number) => down + mm * PX
  const shape = shapeAt(down)
  const below = Math.max(y(Y.jawTip), object === 'none' ? 0 : shape.bottom)
  const labelY = below + 22
  return {
    width: x(beamEnd + gap),
    height: labeled && object !== 'none' ? labelY + 6 : Math.max(below, y(Y.jawTip)) + 4,
    /** x of a main-scale value in mm */
    xOf: (mm: number) => x(FACE + ZERO_IN + mm),
    y: Object.fromEntries(Object.entries(Y).map(([k, v]) => [k, y(v)])) as Record<keyof typeof Y, number>,
    /** the fixed jaw's face, and the head left of it */
    face: x(FACE),
    /** the slider: its jaw face (its left end) and its right end */
    slider: { left: x(slider), right: x(slider + sliderLength) },
    /** the lock screw on top of the slider */
    screw: x(slider + ZERO_IN + v.length * 0.5),
    /** the beam's right end, and the depth rod's end, out as far as the jaws are apart */
    beamEnd: x(beamEnd),
    rodEnd: x(beamEnd + gap),
    /** the sliding scale's zero */
    slideZero: x(FACE + ZERO_IN + reading),
    object: shape,
    labelAt: { x: x(FACE + gap / 2), y: labelY },
  }
}

export type CaliperLayout = ReturnType<typeof caliperLayout>

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const DETAIL_WIDTH = 880

/** The sizes of the scales' marks and numbers at `zoom`, in drawing units.
 *  Inside a close-up they grow more gently than the drawing, and stop
 *  growing, so the strip stays a strip and lines stay thin enough to show a
 *  mark a fraction of a unit off. */
export function scaleSizes(zoom: number) {
  const seen = (base: number, power: number, most: number) => Math.min(base * zoom ** power, Math.max(base, most)) / zoom
  return {
    major: seen(4.2 * PX, 0.6, 34),
    medium: seen(3 * PX, 0.6, 26),
    minor: seen(2.1 * PX, 0.6, 19),
    long: seen(4 * PX, 0.6, 32),
    short: seen(2.5 * PX, 0.6, 22),
    thick: seen(1.1, 0.4, 1.5),
    thin: seen(0.8, 0.4, 1),
    mainFont: seen(12, 0.4, 22),
    slideFont: seen(10.5, 0.4, 19),
    stampFont: seen(8, 0.4, 14),
    gap: seen(3.6, 0.4, 6),
    pad: seen(4, 0.4, 12),
  }
}

/** The band of the scales a close-up at `zoom` shows, from x0 to x1: the
 *  main scale's numbers down to the sliding scale's. */
function band(at: CaliperLayout, zoom: number, x0: number, x1: number): Rect {
  const z = scaleSizes(zoom)
  const top = at.y.edge - z.major - z.gap - 0.75 * z.mainFont - z.pad
  const bottom = at.y.edge + z.long + z.gap + 0.75 * z.slideFont + z.pad
  return { x: x0, y: top, width: x1 - x0, height: bottom - top }
}

/** The close-up strip's region of the caliper: the main and sliding scales
 *  from a little before the sliding scale's zero to a little past its last mark
 *  (and the least count printed after it), inside the slider's window so its
 *  ends stay out of the way, in drawing units. */
export function stripSource(v: CaliperScale, at: CaliperLayout, reading: number, printed: boolean): Rect {
  // An edge falling on a main-scale number moves off it, so no number is cut in half.
  const nearNumber = (edge: number) => {
    const n = Math.round(edge / 10) * 10
    return Math.abs(edge - n) < 1.5 ? n : null
  }
  let left = reading - 3
  const l = nearNumber(left)
  if (l !== null) left = l < reading - 1.6 ? l + 1.4 : l - 1.4
  let right = reading + v.length + (printed ? 12 : 4)
  const r = nearNumber(right)
  if (r !== null) right = r - 1.4
  return band(at, v.strip / PX, at.xOf(left), at.xOf(right))
}

/** The detail's region: 880 units wide once enlarged, enough for at least
 *  one of the sliding scale's numbers, around where the marks line up, though not
 *  centred on it, so its middle doesn't give the answer away. Null for a
 *  sliding scale that needs none. */
export function detailSource(v: CaliperScale, at: CaliperLayout, reading: number): Rect | null {
  if (!v.detail) return null
  const width = DETAIL_WIDTH / v.detail
  const { main, k } = readingOf(v, reading)
  const shift = (((k * 37 + Math.abs(main) * 11) % 7) - 3) / 10
  const middle = reading + k * v.spacing + shift * width
  return band(at, v.detail / PX, at.xOf(middle - width / 2), at.xOf(middle + width / 2))
}
