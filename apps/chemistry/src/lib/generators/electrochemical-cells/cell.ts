// The metals an electrochemical cell can be made of, each in a 1 M solution
// of its own ion, and the cell two of them make: the one with the lower
// standard reduction potential is the anode.

export const METALS = ['Mg', 'Al', 'Zn', 'Fe', 'Ni', 'Pb', 'Cu', 'Ag'] as const
export type Metal = (typeof METALS)[number]

interface MetalInfo {
  name: string
  ion: string
  /** standard reduction potential of its ion, in volts */
  potential: number
  /** the strip's color */
  color: string
  /** the solution's tint */
  solution: string
}

export const METAL_INFO: Record<Metal, MetalInfo> = {
  Mg: { name: 'magnesium', ion: 'Mg²⁺', potential: -2.37, color: '#c3c7cb', solution: '#eef3f8' },
  Al: { name: 'aluminum', ion: 'Al³⁺', potential: -1.66, color: '#ccd1d6', solution: '#eef3f8' },
  Zn: { name: 'zinc', ion: 'Zn²⁺', potential: -0.76, color: '#a7afb8', solution: '#eef3f8' },
  Fe: { name: 'iron', ion: 'Fe²⁺', potential: -0.44, color: '#7c8187', solution: '#e8f4e2' },
  Ni: { name: 'nickel', ion: 'Ni²⁺', potential: -0.25, color: '#a8a698', solution: '#dff2df' },
  Pb: { name: 'lead', ion: 'Pb²⁺', potential: -0.13, color: '#6d7480', solution: '#eef3f8' },
  Cu: { name: 'copper', ion: 'Cu²⁺', potential: 0.34, color: '#c47a42', solution: '#d6e9fb' },
  Ag: { name: 'silver', ion: 'Ag⁺', potential: 0.8, color: '#d7dbe0', solution: '#eef3f8' },
}

export type Side = 'left' | 'right'

export interface Cell {
  anode: Side
  cathode: Side
  /** E°cell in volts, rounded to 0.01 */
  voltage: number
}

/** The cell two different metals make. */
export function cellOf(left: Metal, right: Metal): Cell {
  const anode: Side = METAL_INFO[left].potential < METAL_INFO[right].potential ? 'left' : 'right'
  const voltage = Math.round(Math.abs(METAL_INFO[right].potential - METAL_INFO[left].potential) * 100) / 100
  return { anode, cathode: anode === 'left' ? 'right' : 'left', voltage }
}

/** The solution's label, e.g. "Cu²⁺(aq)". */
export const solutionLabel = (m: Metal) => `${METAL_INFO[m].ion}(aq)`

/** The voltage as a meter shows it, e.g. "1.10". */
export const voltageText = (v: number) => v.toFixed(2)

/** A potential with a true minus sign, e.g. "−0.76". */
export const potentialText = (v: number) => (v < 0 ? `−${(-v).toFixed(2)}` : v.toFixed(2))

/** An ion's charge from its superscripts, e.g. 2 for "Cu²⁺". */
export function ionCharge(ion: string) {
  const digits = '⁰¹²³⁴⁵⁶⁷⁸⁹'
  const n = [...ion].map((c) => digits.indexOf(c)).filter((d) => d >= 0)
  return n.length ? Number(n.join('')) : 1
}

export interface Reactions {
  /** e.g. "Zn(s) → Zn²⁺(aq) + 2e⁻" */
  oxidation: string
  /** e.g. "Cu²⁺(aq) + 2e⁻ → Cu(s)" */
  reduction: string
  /** each half-reaction scaled so the electrons cancel, e.g. "2Al(s) + 3Zn²⁺(aq) → 2Al³⁺(aq) + 3Zn(s)" */
  overall: string
}

/** The half-reactions at the anode and cathode, and the overall reaction, balanced. */
export function reactionsOf(left: Metal, right: Metal): Reactions {
  const cell = cellOf(left, right)
  const sides = { left, right }
  const [anode, cathode] = [sides[cell.anode], sides[cell.cathode]]
  const [a, c] = [METAL_INFO[anode], METAL_INFO[cathode]]
  const [na, nc] = [ionCharge(a.ion), ionCharge(c.ion)]
  const electrons = (n: number) => `${n === 1 ? '' : n}e⁻`
  const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x)
  const lcm = (na * nc) / gcd(na, nc)
  const times = (k: number, what: string) => `${k === 1 ? '' : k}${what}`
  const [ka, kc] = [lcm / na, lcm / nc]
  return {
    oxidation: `${anode}(s) → ${a.ion}(aq) + ${electrons(na)}`,
    reduction: `${c.ion}(aq) + ${electrons(nc)} → ${cathode}(s)`,
    overall: `${times(ka, anode)}(s) + ${times(kc, c.ion)}(aq) → ${times(ka, a.ion)}(aq) + ${times(kc, cathode)}(s)`,
  }
}
