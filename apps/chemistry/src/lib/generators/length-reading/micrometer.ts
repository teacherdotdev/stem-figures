// A micrometer screw gauge: how a reading is made of the sleeve and the
// thimble, where the thimble's marks show as it turns, and where every part
// of the drawn micrometer sits.

import { objectShape, type Instrument, type JawObject } from './instrument'

/** The spindle moves half a mm a turn, and the thimble has 50 marks round it, 0.01 mm each. */
export const PITCH = 0.5
export const DIVISIONS = 50

export const MICROMETER: Instrument = { leastCount: 0.01, decimals: 2, range: 25, maxZero: 0.05 }

/** How a reading is read: the last sleeve mark showing, to the half mm, and
 *  the thimble mark on the datum line, worth 0.01 mm each. Closed below zero
 *  the sleeve's last mark is −0.5: the thimble's zero has turned past the
 *  datum line. */
export function readingOf(reading: number) {
  const sleeve = Math.floor(reading / PITCH + 1e-9) * PITCH
  const thimble = Math.round((reading - sleeve) / MICROMETER.leastCount)
  return { sleeve, thimble }
}

/** The thimble's marks seen side on, turned so `reading` is on the datum
 *  line: each one's angle round from the datum (positive is up, toward the
 *  bigger numbers, as on a real thimble), for the front half only. A mark's
 *  height on the drawing is the thimble's radius times sin(angle), so they
 *  bunch toward the top and bottom edges. */
export function thimbleMarks(reading: number, limit = (85 * Math.PI) / 180) {
  const turned = (((reading % PITCH) + PITCH) % PITCH) / MICROMETER.leastCount
  return Array.from({ length: DIVISIONS }, (_, j) => {
    let turns = (j - turned) / DIVISIONS
    turns -= Math.round(turns)
    return { j, angle: turns * 2 * Math.PI }
  }).filter((m) => Math.abs(m.angle) <= limit)
}

/** Drawing units per mm. */
export const PX = 6

// In mm along the axis, from the anvil's face: the frame's left arm, the
// hub its right arm ends in, the sleeve's zero mark, and the thimble's
// parts from its edge. Across, from the axis: the radii and the frame.
export const AT = {
  armOuter: -17,
  armInner: -7,
  hubInner: 28,
  hubOuter: 40,
  sleeveZero: 43,
  anvilR: 3.4,
  spindleR: 3.4,
  sleeveR: 4.6,
  thimbleR: 8.5,
  gripR: 8.9,
  scaleEnd: 15,
  gripEnd: 27,
  ratchetStart: 29,
  ratchetEnd: 41,
  ratchetR: 5.6,
  frameTop: -9,
  throat: 24,
  bottom: 40,
  lever: -16.5,
}
const OBJECT = { depth: 14, wire: { above: 16, below: 15 } }
const LEFT = AT.armOuter - 1
const RIGHT = AT.sleeveZero + MICROMETER.range + MICROMETER.maxZero + AT.ratchetEnd + 1

/** Where everything sits on a micrometer whose spindle is `gap` mm from the
 *  anvil and whose thimble edge is at `reading` mm on the sleeve (the two
 *  differ by the zero error), in drawing units. */
export function micrometerLayout(reading: number, gap: number, object: JawObject = 'none', labeled = false) {
  const base = objectShape(object, 0, gap, 0, OBJECT.depth, OBJECT.wire)
  const labelY = Math.min(base.top, AT.frameTop) - 3.5
  const top = Math.min(AT.lever - 0.5, object !== 'none' ? base.top - 1 : 0, labeled && object !== 'none' ? labelY - 3.5 : 0)
  const x = (mm: number) => (mm - LEFT) * PX
  const y = (mm: number) => (mm - top) * PX
  return {
    width: (RIGHT - LEFT) * PX,
    height: y(AT.bottom + 1),
    x,
    y,
    /** the thimble's edge, on the sleeve at the reading */
    edge: x(AT.sleeveZero + reading),
    /** the spindle's face */
    face: x(gap),
    /** a sleeve value in mm */
    xOf: (mm: number) => x(AT.sleeveZero + mm),
    object: objectShape(object, x(0), x(gap), y(0), OBJECT.depth * PX, { above: OBJECT.wire.above * PX, below: OBJECT.wire.below * PX }),
    labelAt: { x: x(gap / 2), y: y(labelY) },
  }
}

export type MicrometerLayout = ReturnType<typeof micrometerLayout>

/** The magnifier's circle: round the thimble's edge on the datum line,
 *  showing the sleeve's marks before it and the thimble's numbers. */
export const magnifierSource = (at: MicrometerLayout) => ({ x: at.edge + 0.6 * PX, y: at.y(0), r: 10.5 * PX })
