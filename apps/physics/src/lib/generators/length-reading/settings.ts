// Length Reading's settings, as they appear in the page address. The ruler's
// come first, as they always have; a caliper or micrometer reading is what
// its scales show, and with a zero error its jaws are that much closer
// together than the reading says.

import { figureTextFields } from '$shared/figureText'
import { MAGNIFIER_VIEWS } from '$shared/magnify'
import { bool, choice, defineSettings, number, text } from '$shared/settings'
import { CALIPER_MAX_ZERO, CALIPER_RANGE, LEAST_COUNTS, caliperScale, readingOf as caliperReadingOf } from './caliper'
import { JAW_OBJECTS, JAW_OBJECT_NAMES, answerLines as instrumentAnswer, corrected, mmText, roundTo, tidyReading, tidyZero, type Instrument } from './instrument'
import { MICROMETER, micrometerScale, readingOf as micrometerReadingOf } from './micrometer'
import { OBJECTS, objectName } from './objectKinds'
import {
  CM_SIZES, IMPERIAL_MARKS, INCH_SIZES, METRIC_MARKS, READS, SYSTEMS, UNITS, formatLength, marksFit, rulerName, rulerScale, shortest, snap,
} from './ruler'

/** What the length is read from. */
export const INSTRUMENTS = ['ruler', 'caliper', 'micrometer'] as const
export type LengthInstrument = (typeof INSTRUMENTS)[number]
export const INSTRUMENT_NAMES: Record<LengthInstrument, string> = { ruler: 'Ruler', caliper: 'Caliper', micrometer: 'Micrometer' }

/** A magnifier on each end of the object that isn't lined up with 0. */
export const LENGTH_VIEWS = ['both', 'whole'] as const
export type LengthView = (typeof LENGTH_VIEWS)[number]
export const LENGTH_VIEW_NAMES: Record<LengthView, string> = { both: 'Ruler and magnifiers', whole: 'Ruler only' }

export const lengthSettings = defineSettings(
  {
    system: choice(SYSTEMS, 'metric'),
    cm: choice(CM_SIZES, '15'),
    inches: choice(INCH_SIZES, '6'),
    metricMarks: choice(METRIC_MARKS, 'mm'),
    imperialMarks: choice(IMPERIAL_MARKS, '8'),
    read: choice(READS, 'estimate'),
    object: choice(OBJECTS, 'cylinder'),
    marbles: number({ min: 1, max: 5, fallback: 3 }),
    /** dashed lines from the object's ends down to the ruler, for a round
     *  one whose ends are above where it touches */
    guides: bool(false),
    /** the object's length, in the ruler's cm or inches */
    length: number({ min: 0, max: 100, fallback: 4.37 }),
    /** where its left end is on the ruler; 0 lines it up with the 0 mark */
    start: number({ min: 0, max: 100, fallback: 0 }),
    view: choice(LENGTH_VIEWS, 'both'),
    span: number({ min: 1, max: 6, fallback: 3 }),
    instrument: choice(INSTRUMENTS, 'ruler'),
    /** the caliper's least count, in mm */
    leastCount: choice(LEAST_COUNTS, '0.05'),
    /** where the caliper's sliding scale has its zero on the main scale, in mm */
    caliper: number({ min: 0, max: CALIPER_RANGE, fallback: 23.45 }),
    /** what the caliper reads with its jaws closed, in mm */
    caliperZero: number({ min: -CALIPER_MAX_ZERO, max: CALIPER_MAX_ZERO, fallback: 0 }),
    /** where the micrometer's thimble edge is on the sleeve, in mm */
    micrometer: number({ min: 0, max: MICROMETER.range, fallback: 7.38 }),
    /** the micrometer read to its marks, 0.01 mm, or one estimated digit past them, 0.001 mm */
    micrometerRead: choice(READS, 'estimate'),
    /** what the micrometer reads closed, in mm */
    micrometerZero: number({ min: -MICROMETER.maxZero, max: MICROMETER.maxZero, fallback: 0 }),
    /** with a zero error, draw the caliper or micrometer closed beside it too */
    closed: bool(true),
    /** what the caliper's or micrometer's jaws hold */
    jaws: choice(JAW_OBJECTS, 'block'),
    jawsLabel: text('', 12),
    /** the least count printed on the caliper's slider or the micrometer's frame, as real ones are */
    printed: bool(true),
    /** the caliper or micrometer with its close-up, the close-up alone, or the instrument alone */
    closeUp: choice(MAGNIFIER_VIEWS, 'both'),
    ...figureTextFields(),
  },
  (settings) => {
    // 5 cm and 10 cm marks on a short ruler become 1 cm ones.
    const s = marksFit(settings.metricMarks, settings.cm) ? settings : { ...settings, metricMarks: 'cm' as const }
    const scale = rulerScale(s)
    const length = snap(scale, s.length, shortest(scale))
    const start = snap(scale, s.start, 0, scale.size - length)
    const c = caliperScale(s.leastCount)
    const caliperZero = tidyZero(c, s.caliperZero)
    const m = micrometerScale(s.micrometerRead)
    const micrometerZero = tidyZero(m, s.micrometerZero)
    return {
      ...s,
      length,
      start,
      marbles: Math.round(s.marbles),
      span: Math.round(s.span),
      caliperZero,
      caliper: tidyReading(c, caliperZero, s.caliper),
      micrometerZero,
      micrometer: tidyReading(m, micrometerZero, s.micrometer),
    }
  },
)

export type LengthSettings = typeof lengthSettings.defaults

/** The object's right end on the ruler. */
export const endOf = (s: LengthSettings) => snap(rulerScale(s), s.start + s.length)

/** A reading with its unit, e.g. "4.37 cm" or "3 3/8 in". */
export const lengthText = (s: LengthSettings, value: number) => `${formatLength(rulerScale(s), value)} ${UNITS[s.system]}`

/** The caliper's or micrometer's scales, reading and zero error. */
export function gauge(s: LengthSettings): { instrument: Instrument; reading: number; zero: number } {
  if (s.instrument === 'micrometer') return { instrument: micrometerScale(s.micrometerRead), reading: s.micrometer, zero: s.micrometerZero }
  return { instrument: caliperScale(s.leastCount), reading: s.caliper, zero: s.caliperZero }
}

/** The answer key: for the ruler just the length when the object starts at
 *  0, e.g. "Length: 4.37 cm", and both ends' readings when it doesn't; for a
 *  caliper or micrometer the reading, then the zero error and the corrected
 *  reading on a second line when there is one. */
export function answerLine(s: LengthSettings) {
  if (s.instrument !== 'ruler') {
    const g = gauge(s)
    return instrumentAnswer(g.instrument, g.reading, g.zero)
  }
  const length = `Length: ${lengthText(s, s.length)}`
  if (!s.start) return length
  return `Left end: ${lengthText(s, s.start)} · Right end: ${lengthText(s, endOf(s))} · ${length}`
}

/** How a caliper or micrometer reading is made up, for an answer key that
 *  shows the working, e.g. "Reading: main scale 23 mm + sliding scale mark 9
 *  × 0.05 mm = 23.45 mm", then the zero error and the corrected reading. */
export function workingLines(s: LengthSettings) {
  if (s.instrument === 'ruler') return answerLine(s).split(' · ')
  const { instrument: i, reading, zero } = gauge(s)
  const line = (r: number, signed: boolean) => {
    const result = mmText(r, i.decimals, signed)
    if (s.instrument === 'micrometer') {
      const { sleeve, thimble } = micrometerReadingOf(r)
      // Closed below zero, the thimble's 0 has turned past the datum line.
      const above = roundTo(50 - thimble, 1)
      if (r < 0) return `the thimble’s 0 is ${above} marks above the datum line, so −${above} × 0.01 mm = ${result}`
      const read = Number.isInteger(thimble) ? `thimble mark ${thimble}` : `thimble ${thimble} marks`
      return `sleeve ${mmText(sleeve, 1)} + ${read} × 0.01 mm = ${result}`
    }
    const c = caliperScale(s.leastCount)
    const { main, k } = caliperReadingOf(c, r)
    // Closed below zero, the sliding scale's zero is left of the main
    // scale's, and its mark k lines up n − k marks short of where it would at zero.
    if (r < 0) return `sliding scale mark ${k} lines up, so −(${c.divisions} − ${k}) × ${c.leastCount} mm = ${result}`
    return `main scale ${main} mm + sliding scale mark ${k} × ${c.leastCount} mm = ${result}`
  }
  const lines = [`Reading: ${line(reading, false)}`]
  if (zero) {
    lines.push(`Zero error (${s.instrument === 'caliper' ? 'jaws closed' : 'closed'}): ${line(zero, true)}`)
    lines.push(`Corrected reading: ${mmText(reading, i.decimals)} − (${mmText(zero, i.decimals, true)}) = ${mmText(corrected(i, reading, zero), i.decimals)}`)
  }
  return lines
}

/** The figure described for a screen reader. */
export const figureLabel = (s: LengthSettings) => {
  if (s.instrument !== 'ruler') {
    const { instrument: i, reading, zero } = gauge(s)
    const what = s.instrument === 'caliper' ? `A caliper with a ${s.leastCount} mm least count` : 'A micrometer'
    const held = s.jaws === 'none' ? '' : `, holding a ${JAW_OBJECT_NAMES[s.jaws].toLowerCase()}`
    const twin = zero && s.closed ? `, below the same ${s.instrument} closed, reading ${mmText(zero, i.decimals)}` : ''
    return `${what} reading ${mmText(reading, i.decimals)}${held}${twin}`
  }
  const thing = s.object === 'marbles' ? `a row of ${s.marbles === 1 ? 'one marble' : `${s.marbles} marbles`}` : objectName(s.object, s.marbles)
  return `A ${rulerName(rulerScale(s))}, with ${thing} lying along it from ${lengthText(s, s.start)} to ${lengthText(s, endOf(s))}`
}
