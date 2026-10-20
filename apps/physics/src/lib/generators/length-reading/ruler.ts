// A ruler's scale, what counts as a reading on it, and where things sit on
// the drawing: a flat ruler with its marks along the top edge, numbered from
// 0 a little in from its left end, and an object lying along that edge.

export const SYSTEMS = ['metric', 'imperial'] as const
export type System = (typeof SYSTEMS)[number]

export const SYSTEM_NAMES: Record<System, string> = { metric: 'Metric (cm)', imperial: 'Imperial (in)' }
export const UNITS: Record<System, string> = { metric: 'cm', imperial: 'in' }

/** The common sizes: pocket, school and desk rulers, a long classroom
 *  ruler, and a meter stick; in inches, about the same lengths. */
export const CM_SIZES = ['15', '20', '30', '50', '100'] as const
export type CmSize = (typeof CM_SIZES)[number]
export const INCH_SIZES = ['6', '8', '12', '20'] as const
export type InchSize = (typeof INCH_SIZES)[number]

/** A metric ruler's smallest marks. */
export const METRIC_MARKS = ['ten', 'five', 'cm', 'half', 'mm'] as const
export type MetricMarks = (typeof METRIC_MARKS)[number]
export const METRIC_MARK_NAMES: Record<MetricMarks, string> = { ten: '10 cm', five: '5 cm', cm: '1 cm', half: '0.5 cm', mm: '1 mm' }
const METRIC_MINOR: Record<MetricMarks, number> = { ten: 10, five: 5, cm: 1, half: 0.5, mm: 0.1 }

/** Marks 5 or 10 cm apart, numbered every 10 cm, are for the long rulers. */
export const marksFit = (marks: MetricMarks, cm: CmSize) => METRIC_MINOR[marks] < 5 || Number(cm) >= 50

/** An imperial ruler's marks per inch. */
export const IMPERIAL_MARKS = ['1', '2', '4', '8', '16'] as const
export type ImperialMarks = (typeof IMPERIAL_MARKS)[number]

/** How far a metric reading goes: one estimated digit past the smallest
 *  mark, as in the other reading figures, or to the nearest mark. Imperial
 *  readings are always to the nearest mark, as a fraction. */
export const READS = ['estimate', 'mark'] as const
export type Read = (typeof READS)[number]
export const READ_NAMES: Record<Read, string> = { estimate: 'One estimated digit', mark: 'Nearest mark' }

export interface RulerChoice {
  system: System
  cm: CmSize
  inches: InchSize
  metricMarks: MetricMarks
  imperialMarks: ImperialMarks
  read: Read
}

export interface RulerScale {
  system: System
  /** the scale's length from 0, in cm or inches */
  size: number
  /** the distance between the smallest marks */
  minor: number
  /** the distance between numbered marks */
  numbered: number
  /** what a reading is rounded to */
  step: number
  /** decimal places in a metric reading; an imperial one is a fraction */
  decimals: number
}

export function rulerScale(c: RulerChoice): RulerScale {
  if (c.system === 'imperial') {
    const minor = 1 / Number(c.imperialMarks)
    return { system: c.system, size: Number(c.inches), minor, numbered: 1, step: minor, decimals: 0 }
  }
  const minor = METRIC_MINOR[c.metricMarks]
  const estimate = c.read === 'estimate'
  // The estimated digit is the next decimal place down: 1 cm and 0.5 cm
  // marks are both estimated to 0.1 cm, 1 mm marks to 0.01, and 5 cm and
  // 10 cm marks to 1 cm.
  const step = estimate ? 10 ** (Math.ceil(Math.log10(minor) - 1e-9) - 1) : minor
  const decimals = Math.max(0, Math.round(-Math.log10(step) + 0.3))
  return { system: c.system, size: Number(c.cm), minor, numbered: minor < 5 ? 1 : 10, step, decimals }
}

/** The shortest object worth measuring. */
export const shortest = (scale: RulerScale) => Math.max(scale.step, scale.system === 'metric' ? 0.5 : 0.25)

/** `value` rounded to what the ruler reads, and kept between `min` and `max`. */
export function snap(scale: RulerScale, value: number, min = 0, max = scale.size) {
  const clamped = Math.min(max, Math.max(min, value))
  const steps = Math.round(clamped / scale.step + 1e-9)
  // Back inside the range when rounding pushed it over.
  const n = steps * scale.step > max + 1e-9 ? steps - 1 : steps * scale.step < min - 1e-9 ? steps + 1 : steps
  return Number((n * scale.step).toFixed(6))
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/** A reading as written: "4.37" in cm; "3 3/8", "1/4" or "6" in inches. */
export function formatLength(scale: RulerScale, value: number) {
  if (scale.system === 'metric') return value.toFixed(scale.decimals)
  const n = Math.round(1 / scale.step)
  const parts = Math.round(value * n)
  const whole = Math.floor(parts / n)
  const rest = parts % n
  if (!rest) return String(whole)
  const d = gcd(rest, n)
  const fraction = `${rest / d}/${n / d}`
  return whole ? `${whole} ${fraction}` : fraction
}

/** The number in what a teacher types: a decimal, or in inches also a
 *  fraction or mixed number such as "27/8", "3 3/8" or "3-3/8". */
export function parseLength(text: string): number | undefined {
  const t = text.trim()
  const decimal = /^\d*\.?\d+$|^\d+\.$/
  if (decimal.test(t)) return Number(t)
  const m = /^(?:(\d+)(?:\s+|\s*-\s*|\s*\+\s*))?(\d+)\s*\/\s*(\d+)$/.exec(t)
  if (!m || Number(m[3]) === 0) return undefined
  return Number(m[1] ?? 0) + Number(m[2]) / Number(m[3])
}

/** A length the teacher might set: between a sixth and two thirds of the ruler. */
export function randomLength(scale: RulerScale, random: () => number = Math.random) {
  const [low, high] = [Math.max(shortest(scale), scale.size / 6), (scale.size * 2) / 3]
  return snap(scale, low + random() * (high - low))
}

export interface Tick {
  value: number
  /** 0 for a numbered mark, then 1, 2… for ever shorter marks */
  level: number
  label?: string
}

/** Every mark on the ruler: numbered each cm or inch (each 10 cm among
 *  5 cm and 10 cm marks), with a medium mark at each half centimeter among
 *  millimeters, and inch marks shortening from halves down to sixteenths. */
export function rulerTicks(scale: RulerScale): Tick[] {
  const perNumber = Math.round(scale.numbered / scale.minor)
  const count = Math.round(scale.size / scale.minor)
  const ticks: Tick[] = []
  for (let i = 0; i <= count; i++) {
    const value = Number((i * scale.minor).toFixed(6))
    const j = i % perNumber
    if (!j) {
      ticks.push({ value, level: 0, label: String(value) })
      continue
    }
    const level =
      scale.system === 'imperial' ? Math.round(Math.log2(perNumber / gcd(j, perNumber))) : perNumber === 10 && j !== 5 ? 2 : 1
    ticks.push({ value, level })
  }
  return ticks
}

/** Drawing units per centimeter, the same on rulers up to 30 cm or 12 in,
 *  so a longer one makes a wider figure and an object is the same size on
 *  any. Longer rulers are drawn no wider than that, so a meter stick's
 *  magnifiers aren't lost beside it. */
export const PER_CM = 32
const WIDEST = 1000

/** The ruler in its own units: its top left corner at (0, 0), marked along
 *  its top edge. */
export function rulerGeometry(scale: RulerScale) {
  const cm = scale.size * (scale.system === 'imperial' ? CM_PER_INCH : 1)
  const perUnit = (Math.min(PER_CM, WIDEST / cm) * cm) / scale.size
  // Where numbered marks are closer than a centimeter apart, as on a long
  // ruler marked each cm, the marks are shorter and the ruler narrower, so a
  // magnifier a few marks across still reaches the numbers under them.
  const tight = Math.min(1, (scale.numbered * perUnit) / PER_CM)
  /** unmarked ruler before 0 and past the last mark */
  const end = 22
  const height = 84 * Math.max(0.6, tight)
  const tickHeights = scale.system === 'imperial' ? [0.36, 0.28, 0.22, 0.16, 0.11] : [0.36, 0.26, 0.17]
  return {
    perUnit,
    end,
    height,
    width: 2 * end + scale.size * perUnit,
    xOf: (v: number) => end + v * perUnit,
    tickHeight: (level: number) => 84 * tight * tickHeights[Math.min(level, tickHeights.length - 1)],
  }
}

export type RulerGeometry = ReturnType<typeof rulerGeometry>

/** What a figure's ruler is called, e.g. "15 cm ruler marked in millimeters",
 *  "100 cm ruler marked every 10 cm" or "6 in ruler marked in eighths of an
 *  inch". */
export function rulerName(scale: RulerScale) {
  const inch: Record<string, string> = { 1: 'inches', 2: 'half inches', 4: 'quarter inches', 8: 'eighths of an inch', 16: 'sixteenths of an inch' }
  const cm: Record<string, string> = { 1: 'centimeters', 2: 'half centimeters', 10: 'millimeters' }
  const marks =
    scale.minor >= 5 ? `every ${scale.minor} cm` : `in ${(scale.system === 'imperial' ? inch : cm)[Math.round(1 / scale.minor)]}`
  return `${scale.size} ${UNITS[scale.system]} ruler marked ${marks}`
}

/** The ruler of the other system nearest in length: the shortest one that
 *  still reaches `needed` (in that system's units), else the longest. */
export function nearestSize<S extends string>(sizes: readonly S[], needed: number): S {
  return sizes.find((s) => Number(s) >= needed - 1e-9) ?? sizes[sizes.length - 1]
}

export const CM_PER_INCH = 2.54
