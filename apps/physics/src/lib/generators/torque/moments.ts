// The physics of a Torque figure, with no drawing: each load's force and
// torque, the totals, the forces at two supports, the cable's tension and the
// wall's force, the value that would balance a load, and the answer lines the
// settings panel and the example pages show.
//
// Places are along the beam from its left end, and torques are measured
// clockwise as drawn unmirrored: a force down to the right of the pivot turns
// the beam clockwise. Mirrored, the figure is flipped left to right, so every
// clockwise is counterclockwise and every left is right; the answer lines say
// it as drawn.

import { onBeam, type TorqueSettings } from './settings'

type Sums = Pick<
  TorqueSettings,
  'support' | 'length' | 'lengthUnit' | 'pivot' | 'supportA' | 'supportB' | 'loads' | 'unit' | 'g' | 'beamWeight' | 'cable' | 'cableAt' | 'cableAngle' | 'mirror'
>

/** One force on the beam: where it acts and how big it is, in N, down positive (a force up is negative). */
export interface BeamForce {
  /** the load's place in the list, or 'beam' for the beam's own weight */
  of: number | 'beam'
  /** where it acts, from the left end, kept on the beam */
  x: number
  /** in N, down positive */
  down: number
  /** was the load's place past the beam's end? */
  clamped: boolean
}

/** A value in the settings' unit as a weight in N: a mass in kg or g times g. */
export function weightOf(value: number, s: Pick<Sums, 'unit' | 'g'>): number {
  if (s.unit === 'N') return value
  return (s.unit === 'g' ? value / 1000 : value) * Number(s.g)
}

/** A weight in N as a value in the settings' unit. */
export const valueOf = (weight: number, s: Pick<Sums, 'unit' | 'g'>) =>
  s.unit === 'N' ? weight : s.unit === 'kg' ? weight / Number(s.g) : (weight / Number(s.g)) * 1000

/** Every force on the beam from its loads and its own weight, in list order with the beam's last. */
export function forcesOf(s: Sums): BeamForce[] {
  const out: BeamForce[] = s.loads.map((l, i) => ({
    of: i,
    x: onBeam(l.position, s.length),
    down: (l.kind === 'up' ? -1 : 1) * weightOf(l.value, s),
    clamped: l.position > s.length,
  }))
  if (s.beamWeight > 0) out.push({ of: 'beam', x: s.length / 2, down: weightOf(s.beamWeight, s), clamped: false })
  return out
}

/**
 * Is a net torque small enough to call balanced? Values are set to the
 * hundredth, so a load rounded to balance the beam can be off by half a
 * hundredth of its value: `tolerance` is the most torque that leaves.
 */
export const isBalanced = (cw: number, ccw: number, tolerance = 0) => Math.abs(cw - ccw) <= tolerance + 1e-9

export interface PivotSums {
  /** each force's torque about the pivot, clockwise positive */
  torques: { force: BeamForce; arm: number; torque: number }[]
  clockwise: number
  counterclockwise: number
  /** clockwise minus counterclockwise */
  net: number
  balanced: boolean
  /** the pivot's force on the beam, up positive: the forces down, less the forces up */
  pivotForce: number
}

/** Torques about the pivot, unmirrored. */
export function pivotSums(s: Sums): PivotSums {
  const p = onBeam(s.pivot, s.length)
  const torques = forcesOf(s).map((force) => ({ force, arm: force.x - p, torque: force.down * (force.x - p) }))
  const clockwise = torques.reduce((t, q) => t + Math.max(0, q.torque), 0)
  const counterclockwise = torques.reduce((t, q) => t + Math.max(0, -q.torque), 0)
  const pivotForce = forcesOf(s).reduce((t, f) => t + f.down, 0)
  // Half a hundredth of each value, at its arm: what rounding the values to the hundredth can leave.
  const tolerance = torques.reduce((t, q) => t + Math.abs(q.arm) * weightOf(0.005, s), 0)
  return { torques, clockwise, counterclockwise, net: clockwise - counterclockwise, balanced: isBalanced(clockwise, counterclockwise, tolerance), pivotForce }
}

export interface TwoSums {
  a: number
  b: number
  /** the supports' forces up on the beam, in N */
  forceA: number
  forceB: number
  /** are the two supports at the same place, so the forces can't be found? */
  together: boolean
  /** the support whose force comes out negative, if one does: the beam would tip about the other */
  negative: 'A' | 'B' | null
}

/**
 * The forces at two supports: torques about A give B's force, and the forces
 * up equal the forces down for A's.
 */
export function twoSums(s: Sums): TwoSums {
  const a = onBeam(s.supportA, s.length)
  const b = onBeam(s.supportB, s.length)
  const forces = forcesOf(s)
  const total = forces.reduce((t, f) => t + f.down, 0)
  if (Math.abs(b - a) < 1e-9) return { a, b, forceA: NaN, forceB: NaN, together: true, negative: null }
  const forceB = forces.reduce((t, f) => t + f.down * (f.x - a), 0) / (b - a)
  const forceA = total - forceB
  const tiny = 1e-9 * Math.max(1, Math.abs(total))
  return { a, b, forceA, forceB, together: false, negative: forceA < -tiny ? 'A' : forceB < -tiny ? 'B' : null }
}

export interface WallSums {
  /** the torque of every force about the wall's end, clockwise positive (unmirrored) */
  moment: number
  /** the forces down, less the forces up */
  total: number
  /** with a cable: its tension, in N (NaN when the cable meets the beam at the wall) */
  tension: number
  /** the wall's force on the beam: along it, away from the wall, and up */
  along: number
  up: number
  /** with a cable: does it have to push (a negative tension), or meet the beam at the wall? */
  cableProblem: 'push' | 'atWall' | null
}

/**
 * A beam held at a wall at its left end. With a cable at `cableAngle` to the
 * beam, torques about the wall give T = Σ(W d) ÷ (d_c sin θ); the wall's
 * force is T cos θ along the beam and the rest of the weight up. With no
 * cable the wall holds it all: the total force up, and a torque against the
 * loads' moment.
 */
export function wallSums(s: Sums): WallSums {
  const forces = forcesOf(s)
  const moment = forces.reduce((t, f) => t + f.down * f.x, 0)
  const total = forces.reduce((t, f) => t + f.down, 0)
  if (!s.cable) return { moment, total, tension: NaN, along: 0, up: total, cableProblem: null }
  const c = onBeam(s.cableAt, s.length)
  const a = (s.cableAngle * Math.PI) / 180
  if (c < 1e-9) return { moment, total, tension: NaN, along: NaN, up: NaN, cableProblem: 'atWall' }
  const tension = moment / (c * Math.sin(a))
  return {
    moment,
    total,
    tension,
    along: tension * Math.cos(a),
    up: total - tension * Math.sin(a),
    cableProblem: tension < -1e-9 * Math.max(1, Math.abs(total)) ? 'push' : null,
  }
}

/**
 * The value (in the settings' unit) that load `i` would need for the beam to
 * balance on its pivot, or null when no value would: a load at the pivot, or
 * one that would have to be negative. Rounded to hundredths, as settings are.
 */
export function balancingValue(s: Sums, i: number): number | null {
  if (s.support !== 'pivot' || !s.loads[i]) return null
  const { torques } = pivotSums(s)
  const own = torques.find((t) => t.force.of === i)!
  if (Math.abs(own.arm) < 1e-9) return null
  const others = torques.filter((t) => t.force.of !== i).reduce((t, q) => t + q.torque, 0)
  // own: sign × weight × arm = −others
  const sign = s.loads[i].kind === 'up' ? -1 : 1
  const weight = -others / (sign * own.arm)
  if (weight < -1e-9) return null
  const value = Math.round(valueOf(Math.max(0, weight), s) * 100) / 100
  return value > 99999 ? null : value
}

// Writing numbers.

/** A number written out in full, never as 1e-7. */
function plain(n: number): string {
  const written = String(n)
  if (!written.includes('e')) return written
  const fixed = n.toFixed(20)
  return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed
}

/** A number as typed or multiplied out, without the stray digits sums leave behind. */
export const exact = (n: number) => plain(Number(n.toPrecision(12)) || 0).replace(/^-/, '−')

/** A worked-out number: as it is when it has 4 significant figures or fewer, otherwise to 3. */
export function num(n: number): string {
  const e = exact(n)
  return e.replace(/^−?0\.0*/, '').replace(/[.−]/g, '').replace(/0+$/, '').length <= 4 ? e : plain(Number(n.toPrecision(3))).replace(/^-/, '−')
}

/** "=" when `num` writes the number exactly, "≈" when it rounds it. */
export const is = (n: number) => (num(n) === exact(n) ? '=' : '≈')

const torqueUnit = (s: Pick<Sums, 'lengthUnit'>) => `N·${s.lengthUnit}`

/** A load's value as its label shows it when nothing is typed: "6 N", "2 kg". */
export const valueText = (value: number, s: Pick<Sums, 'unit'>) => `${exact(value)} ${s.unit}`

/** A distance as a distance mark shows it: "0.2 m". */
export const distanceText = (d: number, s: Pick<Sums, 'lengthUnit'>) => `${exact(Math.abs(d))} ${s.lengthUnit}`

/** Where distance marks are measured from: the pivot, support A or the wall's end. */
export const referenceOf = (s: Pick<Sums, 'support' | 'pivot' | 'supportA' | 'length'>) =>
  s.support === 'pivot' ? onBeam(s.pivot, s.length) : s.support === 'two' ? onBeam(s.supportA, s.length) : 0

/** Load `i`'s distance as its mark shows it when nothing is typed. */
export const loadDistanceText = (s: Sums, i: number) => distanceText(onBeam(s.loads[i].position, s.length) - referenceOf(s), s)

/** Which way a torque turns the beam as drawn: clockwise positive unmirrored. */
export const turning = (torque: number, mirror: boolean) => ((torque > 0) !== mirror ? 'clockwise' : 'counterclockwise')

/** Which side of a point another is on, as drawn. */
export const sideOf = (x: number, from: number, mirror: boolean) => ((x < from) !== mirror ? 'left' : 'right')

/** The end the places are measured from, as drawn. */
export const startEnd = (mirror: boolean) => (mirror ? 'right' : 'left')

/** Where load `i` is, as its row says it: "0.3 m from the left end · 0.2 m left of the pivot". */
export function whereText(s: Sums, i: number): string {
  const l = s.loads[i]
  const x = onBeam(l.position, s.length)
  const from = `${distanceText(x, s)} from the ${startEnd(s.mirror)} end`
  const ref = s.support === 'pivot' ? { at: onBeam(s.pivot, s.length), name: 'the pivot' } : s.support === 'two' ? { at: onBeam(s.supportA, s.length), name: 'A' } : null
  if (!ref) return from
  const d = x - ref.at
  return `${from} · ${Math.abs(d) < 1e-9 ? `at ${ref.name}` : `${distanceText(d, s)} ${sideOf(x, ref.at, s.mirror)} of ${ref.name}`}`
}

/** What a force is called in the working: "Load 1", or "the beam's weight". */
const nameOf = (f: BeamForce) => (f.of === 'beam' ? 'Beam' : `Load ${f.of + 1}`)

/** The answer lines start by turning masses into weights. */
function weightLines(s: Sums, forces: BeamForce[]): string[] {
  if (s.unit === 'N') return []
  const value = (f: BeamForce) => (f.of === 'beam' ? s.beamWeight : s.loads[f.of].value)
  return [
    `Weight = mass × g, with g = ${s.g} N/kg: ` +
      forces.map((f) => `${nameOf(f)} ${valueText(value(f), s)} → ${num(Math.abs(f.down))} N`).join(', '),
  ]
}

/** A force's size in the working: "6 N". */
const newtons = (f: BeamForce) => `${num(Math.abs(f.down))} N`

/**
 * The working, line by line: for a pivot each torque and the totals; for two
 * supports the forces at A and B; at a wall the tension and the wall's force,
 * or with no cable the wall's force and torque. Every direction is as drawn.
 */
export function answerLines(s: Sums): string[] {
  const forces = forcesOf(s)
  const tu = torqueUnit(s)
  const lines = weightLines(s, forces)
  if (!forces.length) return [...lines, 'Nothing is on the beam, so it balances.']

  if (s.support === 'pivot') {
    const sums = pivotSums(s)
    for (const { force, arm, torque } of sums.torques) {
      const what = force.of === 'beam' ? 'Beam (at its middle)' : `Load ${force.of + 1}${force.down < 0 ? ' (up)' : ''}`
      lines.push(
        Math.abs(arm) < 1e-9
          ? `${what}: at the pivot, no torque`
          : Math.abs(torque) < 1e-9
            ? `${what}: ${newtons(force)} × ${distanceText(arm, s)} = 0 N·${s.lengthUnit}, no torque`
          : `${what}: ${newtons(force)} × ${distanceText(arm, s)} = ${num(Math.abs(torque))} ${tu} ${turning(torque, s.mirror)}`,
      )
    }
    const [cw, ccw] = s.mirror ? [sums.counterclockwise, sums.clockwise] : [sums.clockwise, sums.counterclockwise]
    lines.push(`Clockwise ${num(cw)} ${tu}, counterclockwise ${num(ccw)} ${tu}`)
    lines.push(
      sums.balanced
        ? `Balanced: the clockwise and counterclockwise torques are equal`
        : `Not balanced: net torque ${num(Math.abs(sums.net))} ${tu} ${turning(sums.net, s.mirror)}`,
    )
    if (sums.balanced) lines.push(`Force at the pivot ${is(sums.pivotForce)} ${num(Math.abs(sums.pivotForce))} N ${sums.pivotForce >= 0 ? 'up' : 'down'}`)
    return lines
  }

  if (s.support === 'two') {
    const t = twoSums(s)
    if (t.together) return [...lines, 'The two supports are at the same place, so the forces on them can’t be found.']
    const span = Math.abs(t.b - t.a)
    const toward = Math.sign(t.b - t.a)
    const terms = forces.filter((f) => Math.abs(f.x - t.a) > 1e-9).map((f) => ({ f, arm: (f.x - t.a) * toward }))
    const sum = terms.reduce((n, q) => n + q.f.down * q.arm, 0)
    const expr = terms
      .map(({ f, arm }, k) => `${f.down * arm < 0 ? (k ? '− ' : '−') : k ? '+ ' : ''}${newtons(f)} × ${distanceText(arm, s)}`)
      .join(' ')
    lines.push(`Torques about A: F_B × ${distanceText(span, s)} = ${expr || '0'} = ${num(sum)} ${tu}`)
    lines.push(`F_B = ${num(sum)} ${tu} ÷ ${distanceText(span, s)} ${is(t.forceB)} ${num(t.forceB)} N`)
    const total = forces.reduce((n, f) => n + f.down, 0)
    lines.push(`Forces up = forces down: F_A = ${num(total)} N − ${num(t.forceB)} N ${is(t.forceA)} ${num(t.forceA)} N`)
    if (t.negative) lines.push(`F_${t.negative} comes out negative: the beam would tip about ${t.negative === 'A' ? 'B' : 'A'}`)
    return lines
  }

  const w = wallSums(s)
  const end = startEnd(s.mirror)
  if (!s.cable) {
    lines.push(
      w.up >= -1e-9
        ? `Wall’s force up = forces down ${is(w.up)} ${num(w.up)} N`
        : `Wall’s force down = forces up − forces down ${is(w.up)} ${num(-w.up)} N`,
    )
    const terms = forces
      .filter((f) => f.x > 1e-9)
      .map((f, k) => `${f.down < 0 ? (k ? '− ' : '−') : k ? '+ ' : ''}${newtons(f)} × ${distanceText(f.x, s)}`)
    lines.push(
      `Torque the wall supplies = ${terms.join(' ') || '0'} ${is(w.moment)} ${num(Math.abs(w.moment))} ${tu}${Math.abs(w.moment) > 1e-9 ? ` ${turning(-w.moment, s.mirror)}` : ''}`,
    )
    return lines
  }
  if (w.cableProblem === 'atWall') return [...lines, 'The cable meets the beam at the wall, so it can’t hold the beam up.']
  const c = onBeam(s.cableAt, s.length)
  const terms = forces
    .filter((f) => f.x > 1e-9)
    .map((f, k) => `${f.down < 0 ? (k ? '− ' : '−') : k ? '+ ' : ''}${newtons(f)} × ${distanceText(f.x, s)}`)
  const sin = `sin ${s.cableAngle}°`
  lines.push(`Torques about the wall (the ${end} end): T × ${sin} × ${distanceText(c, s)} = ${terms.join(' ') || '0'} ${is(w.moment)} ${num(w.moment)} ${tu}`)
  lines.push(`T = ${num(w.moment)} ${tu} ÷ (${distanceText(c, s)} × ${sin}) ${is(w.tension)} ${num(w.tension)} N`)
  if (w.cableProblem === 'push') return [...lines, 'T comes out negative: a cable can only pull, so it can’t hold this beam.']
  lines.push(`Wall’s force along the beam = T cos ${s.cableAngle}° ${is(w.along)} ${num(w.along)} N, away from the wall`)
  lines.push(
    `Wall’s force up = forces down − T ${sin} = ${num(w.total)} N − ${num(w.tension * Math.sin((s.cableAngle * Math.PI) / 180))} N ${is(w.up)} ${num(Math.abs(w.up))} N ${w.up >= -1e-9 ? 'up' : 'down'}`,
  )
  return lines
}

/** The answer in a few words, for the panel's status: "Balanced", "Net torque 0.6 N·m clockwise", "F_A = 4.5 N, F_B = 4.5 N". */
export function verdict(s: Sums): { text: string; warning: boolean } {
  if (!forcesOf(s).length) return { text: 'Nothing on the beam', warning: false }
  const tu = torqueUnit(s)
  if (s.support === 'pivot') {
    const p = pivotSums(s)
    return p.balanced ? { text: 'Balanced', warning: false } : { text: `Net torque ${num(Math.abs(p.net))} ${tu} ${turning(p.net, s.mirror)}`, warning: false }
  }
  if (s.support === 'two') {
    const t = twoSums(s)
    if (t.together) return { text: 'The two supports are at the same place. Move one.', warning: true }
    if (t.negative) return { text: `F_${t.negative} comes out negative (${num(t.negative === 'A' ? t.forceA : t.forceB)} N): the beam would tip about ${t.negative === 'A' ? 'B' : 'A'}.`, warning: true }
    return { text: `F_A ${is(t.forceA)} ${num(t.forceA)} N, F_B ${is(t.forceB)} ${num(t.forceB)} N`, warning: false }
  }
  const w = wallSums(s)
  if (!s.cable) return { text: `Wall: ${num(Math.abs(w.up))} N ${w.up >= -1e-9 ? 'up' : 'down'} and ${num(Math.abs(w.moment))} ${tu} of torque`, warning: false }
  if (w.cableProblem === 'atWall') return { text: 'The cable meets the beam at the wall, so it can’t hold it up. Move it along the beam.', warning: true }
  if (w.cableProblem === 'push') return { text: 'The tension comes out negative: a cable can only pull, so it can’t hold this beam.', warning: true }
  return { text: `T ${is(w.tension)} ${num(w.tension)} N`, warning: false }
}
