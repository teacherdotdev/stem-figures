// The science of a one-substance phase diagram, with no drawing: the
// substances and where their values come from, the units, and the three
// phase boundaries as curves through a diagram's places (its triple point,
// its critical point and the corner the sublimation curve starts from), with
// where the 1 atm line meets them and which phase is at any place.
//
// The places are in whatever the diagram is drawn in: the teacher's own
// temperatures and pressures on a grid, or blocks of a schematic figure for
// a diagram not to scale (./figure.ts makes both).

export type Point = { x: number; y: number }

/** 1 atm, in pascals (exact, by definition). */
export const ATM = 101325
/** 0 °C, in kelvin (exact, by definition). */
export const ZERO_C = 273.15

export const T_UNITS = ['C', 'K'] as const
export type TUnit = (typeof T_UNITS)[number]
export const P_UNITS = ['atm', 'kPa'] as const
export type PUnit = (typeof P_UNITS)[number]
export const T_UNIT_TEXT: Record<TUnit, string> = { C: '°C', K: 'K' }
export const P_UNIT_TEXT: Record<PUnit, string> = { atm: 'atm', kPa: 'kPa' }

/** A temperature in kelvin, in the unit chosen. */
export const fromKelvin = (k: number, unit: TUnit) => (unit === 'K' ? k : k - ZERO_C)
/** A temperature in the unit chosen, in kelvin. */
export const toKelvin = (t: number, unit: TUnit) => (unit === 'K' ? t : t + ZERO_C)
/** A pressure in pascals, in the unit chosen. */
export const fromPascal = (pa: number, unit: PUnit) => (unit === 'atm' ? pa / ATM : pa / 1000)
/** A pressure in the unit chosen, in pascals. */
export const toPascal = (p: number, unit: PUnit) => (unit === 'atm' ? p * ATM : p * 1000)
/** 1 atm in the unit chosen: 1, or 101.325 kPa. */
export const atmIn = (unit: PUnit) => fromPascal(ATM, unit)

export type SubstanceId = 'water' | 'co2' | 'nitrogen' | 'oxygen' | 'argon' | 'methane' | 'ammonia'

export interface Substance {
  id: SubstanceId
  name: string
  /** The triple and critical points, in K and Pa. */
  triple: { T: number; P: number }
  critical: { T: number; P: number }
  /**
   * What happens at 1 atm, in K: the normal boiling point, and the normal
   * melting point where it has been read from a source; or, with the triple
   * point above 1 atm, the temperature the solid sublimes at.
   */
  nbp?: number
  nmp?: number
  sublimes?: number
  /** Which way the fusion line leans: left only where the solid is less dense than the liquid. */
  fusion: 'left' | 'right'
  /** The reference equation of state the triple and critical points are from. */
  source: string
}

/**
 * The substances a diagram can be drawn for.
 *
 * Every number was read on 2026-11-22 from the NIST Chemistry WebBook's
 * Thermophysical Properties of Fluid Systems (webbook.nist.gov/chemistry/fluid),
 * which works them out from the reference equation of state named:
 *   - critical: its "Critical temperature" and "Critical pressure"
 *   - triple: the saturation table's first temperature, the triple point,
 *     and the pressure there (the same as CoolProp's fluid pages list, but
 *     for ammonia: see there; water's is IAPWS's defined 611.657 Pa)
 *   - nbp, sublimes: its "Normal boiling point", the saturation (for carbon
 *     dioxide, sublimation) temperature at 1.01325 bar
 * Water's nmp is the normal-pressure melting temperature of ice Ih in IAPWS
 * R14-08(2011), 273.152 519 K.
 *
 * The other six have no nmp: no source read gives one to better than 0.1 K.
 * Their fusion lines are so steep that at 1 atm each melts within a few
 * hundredths of a kelvin of its triple point's temperature, so the melting
 * point's value is never written for them (see ./figure.ts).
 *
 * phase.test.ts lists the 1 atm values: one added or changed here fails it
 * until it is checked against a source and changed there too.
 */
export const SUBSTANCES: Substance[] = [
  {
    id: 'water', name: 'Water', fusion: 'left',
    triple: { T: 273.16, P: 611.657 }, // IAPWS-95; the WebBook's table gives 611.654 Pa at 273.16 K
    critical: { T: 647.096, P: 22.064e6 },
    nmp: 273.1525, // IAPWS R14-08(2011): 273.152 519 K, 0.00 °C
    nbp: 373.1243, // WebBook: 373.1243 K, 99.97 °C
    source: 'Wagner & Pruß 2002 (IAPWS-95)',
  },
  {
    id: 'co2', name: 'Carbon dioxide', fusion: 'right',
    triple: { T: 216.592, P: 517964 },
    critical: { T: 304.1282, P: 7.3773e6 },
    sublimes: 194.686, // WebBook: 194.686 K, −78.46 °C
    source: 'Span & Wagner 1996',
  },
  {
    id: 'nitrogen', name: 'Nitrogen', fusion: 'right',
    triple: { T: 63.151, P: 12519.8 },
    critical: { T: 126.192, P: 3.3958e6 },
    nbp: 77.355, // WebBook: 77.355 K, −195.80 °C
    source: 'Span et al. 2000',
  },
  {
    id: 'oxygen', name: 'Oxygen', fusion: 'right',
    triple: { T: 54.361, P: 146.278 },
    critical: { T: 154.581, P: 5.043e6 },
    nbp: 90.1878, // WebBook: 90.1878 K, −182.96 °C
    source: 'Schmidt & Wagner 1985',
  },
  {
    id: 'argon', name: 'Argon', fusion: 'right',
    triple: { T: 83.8058, P: 68890.9 },
    critical: { T: 150.687, P: 4.863e6 },
    nbp: 87.302, // WebBook: 87.302 K, −185.85 °C
    source: 'Tegeler, Span & Wagner 1999',
  },
  {
    id: 'methane', name: 'Methane', fusion: 'right',
    triple: { T: 90.6941, P: 11696.1 },
    critical: { T: 190.564, P: 4.5992e6 },
    nbp: 111.667, // WebBook: 111.667 K, −161.48 °C
    source: 'Setzmann & Wagner 1991',
  },
  {
    id: 'ammonia', name: 'Ammonia', fusion: 'right',
    // WebBook (and the 2023 paper's own range): 195.49 K, 6053.39 Pa. CoolProp's
    // page gives 195.495 K and 6055.81 Pa; the WebBook's are used here.
    triple: { T: 195.49, P: 6053.39 },
    critical: { T: 405.56, P: 11.3634e6 },
    nbp: 239.832, // WebBook: 239.832 K, −33.32 °C
    source: 'Gao, Wu, Bell & Lemmon 2020',
  },
]

export const findSubstance = (id: string) => SUBSTANCES.find((x) => x.id === id)

// The diagram -----------------------------------------------------------------

/**
 * A diagram's places: its triple and critical points, the corner the
 * sublimation curve rises from (the graph's bottom left), where the fusion
 * line reaches the top of the graph, and how sharply the two curves bend.
 */
export interface Shape {
  triple: Point
  critical: Point
  corner: Point
  /** The top of the graph, and where the fusion line meets it. */
  top: number
  fusionTopX: number
  /** How sharply the vaporization and sublimation curves bend upward (see `curveY`). */
  kVap: number
  kSub: number
}

/** The sharpest bend a vaporization curve is given; past it the curve is an elbow. */
export const MAX_K = 8

/**
 * How far up a curve is, 0 to 1, when it is `s` of the way along its
 * temperatures, 0 to 1: rising ever more steeply, as vapor pressure does.
 * (e^(k·s) − 1) / (e^k − 1); a straight line as k goes to 0.
 */
export const rise = (s: number, k: number) => (Math.abs(k) < 1e-9 ? s : Math.expm1(k * s) / Math.expm1(k))
/** How far along its temperatures a curve is when it is `f` of the way up: `rise` backwards. */
export const run = (f: number, k: number) => (Math.abs(k) < 1e-9 ? f : Math.log1p(f * Math.expm1(k)) / k)
/** A curve's slope where it starts and where it ends, as multiples of the straight line's. */
const slopeAtStart = (k: number) => (Math.abs(k) < 1e-9 ? 1 : k / Math.expm1(k))
const slopeAtEnd = (k: number) => (Math.abs(k) < 1e-9 ? 1 : (k * Math.exp(k)) / Math.expm1(k))

/** A point on a curve from a to b, `s` of the way along. */
const curveAt = (a: Point, b: Point, k: number, s: number): Point => ({ x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * rise(s, k) })
const sample = (a: Point, b: Point, k: number, n: number) => Array.from({ length: n + 1 }, (_, i) => curveAt(a, b, k, i / n))

/** The vaporization curve: from the triple point to the critical point, where it stops. */
export const vaporization = (d: Shape, n = 60) => sample(d.triple, d.critical, d.kVap, n)
/** The sublimation curve: from the graph's corner up to the triple point. */
export const sublimation = (d: Shape, n = 40) => sample(d.corner, d.triple, d.kSub, n)
/** The fusion line: straight from the triple point to the top of the graph. */
export const fusion = (d: Shape): Point[] => [d.triple, { x: d.fusionTopX, y: d.top }]

/** The pressure on the vaporization curve at a temperature between the triple and critical points. */
export const vaporPressure = (d: Shape, x: number) => curveAt(d.triple, d.critical, d.kVap, (x - d.triple.x) / (d.critical.x - d.triple.x)).y
/** The pressure on the sublimation curve at a temperature up to the triple point's. */
export const sublimationPressure = (d: Shape, x: number) => curveAt(d.corner, d.triple, d.kSub, (x - d.corner.x) / (d.triple.x - d.corner.x)).y
/** The temperature on the fusion line at a pressure from the triple point's up. */
export const meltingAt = (d: Shape, y: number) => d.triple.x + ((d.fusionTopX - d.triple.x) * (y - d.triple.y)) / (d.top - d.triple.y)

/**
 * How sharply a vaporization curve has to bend to pass through a boiling
 * point: `s` of the way along its temperatures when `f` of the way up its
 * pressures. Null when no curve bending upward does (the point is on or
 * above the straight line); MAX_K when it would take a sharper bend.
 */
export function bendThrough(s: number, f: number): number | null {
  if (!(s > 0 && s < 1 && f > 0 && f < 1) || f >= s) return null
  if (rise(s, MAX_K) > f) return MAX_K
  let [lo, hi] = [0, MAX_K]
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (rise(s, mid) > f) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/**
 * A sublimation curve's bend: raised until it arrives at the triple point
 * steeper than the vaporization curve leaves it, since subliming takes more
 * heat than boiling. The boundary has a corner there.
 */
export function sublimationBend(d: Omit<Shape, 'kSub'>, steeper = 1.5): number {
  const leaves = ((d.critical.y - d.triple.y) / (d.critical.x - d.triple.x)) * slopeAtStart(d.kVap)
  const straight = (d.triple.y - d.corner.y) / (d.triple.x - d.corner.x)
  if (!(straight > 0) || !Number.isFinite(leaves)) return 2
  let k = 1.5
  while (k < 12 && straight * slopeAtEnd(k) < leaves * steeper) k += 0.25
  return k
}

/** Where the two curves leave and arrive at the triple point, as slopes. */
export const slopesAtTriple = (d: Shape) => ({
  vaporization: ((d.critical.y - d.triple.y) / (d.critical.x - d.triple.x)) * slopeAtStart(d.kVap),
  sublimation: ((d.triple.y - d.corner.y) / (d.triple.x - d.corner.x)) * slopeAtEnd(d.kSub),
})

export type Boundary = 'fusion' | 'vaporization' | 'sublimation'

/**
 * Where a line across the diagram at one pressure (1 atm) meets the
 * boundaries, left to right: the fusion line and the vaporization curve
 * above the triple point's pressure, the sublimation curve alone below it.
 */
export function crossings(d: Shape, y: number): { boundary: Boundary; x: number; y: number }[] {
  const out: { boundary: Boundary; x: number; y: number }[] = []
  if (y > d.corner.y && y < d.triple.y) {
    const s = run((y - d.corner.y) / (d.triple.y - d.corner.y), d.kSub)
    out.push({ boundary: 'sublimation', x: d.corner.x + (d.triple.x - d.corner.x) * s, y })
  }
  if (y > d.triple.y && y <= d.top) out.push({ boundary: 'fusion', x: meltingAt(d, y), y })
  if (y > d.triple.y && y < d.critical.y) {
    const s = run((y - d.triple.y) / (d.critical.y - d.triple.y), d.kVap)
    out.push({ boundary: 'vaporization', x: d.triple.x + (d.critical.x - d.triple.x) * s, y })
  }
  return out.sort((a, b) => a.x - b.x)
}

export type Phase = 'solid' | 'liquid' | 'gas' | 'supercritical'

/**
 * The phase at a temperature and pressure of the diagram: solid left of the
 * sublimation curve and fusion line, liquid between the fusion line and the
 * vaporization curve, gas below and right, and a supercritical fluid hotter
 * and at higher pressure than the critical point.
 */
export function phaseAt(d: Shape, x: number, y: number): Phase {
  if (y >= d.triple.y) {
    if (x < meltingAt(d, y)) return 'solid'
    if (x > d.critical.x) return y > d.critical.y ? 'supercritical' : 'gas'
    if (x <= d.triple.x) return 'liquid'
    return y > vaporPressure(d, x) ? 'liquid' : 'gas'
  }
  return x < d.triple.x && y > sublimationPressure(d, x) ? 'solid' : 'gas'
}
