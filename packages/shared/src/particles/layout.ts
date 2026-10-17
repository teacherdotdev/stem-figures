// Where the particles go in the box, for each state: scattered at random
// without touching for a gas, settled close together at the bottom for a
// liquid, or packed in rows at the bottom for a solid. The randomness comes
// only from a seed kept in the settings, so a link redraws the same figure
// and the server draws what the browser will (Chemistry's ADR 0002).

import { discBounds, particleDiscs, type Disc, type ParticleKind } from './particles'
import { seededRandom } from './random'

/** How the particles in a box are arranged: spread out (scattered, as every
 *  box was before states), close and jumbled, or in rows. */
export const STATES = ['gas', 'liquid', 'solid'] as const
export type State = (typeof STATES)[number]

/** Space kept between separate particles, and between them and the box. */
export const SCATTER_GAP = 7
const TRIES = 400

/** Browsers may differ in the last digit of sin, cos and hypot, which could
 *  tip a close call the other way and move every particle after it. Rounding
 *  to thousandths, and comparing squared distances (plain arithmetic, the
 *  same everywhere), keeps the server and every browser in step. */
const round = (n: number) => Math.round(n * 1000) / 1000

/** How far a particle's discs reach from its middle. */
const reach = (kind: ParticleKind) => round(Math.max(...particleDiscs(kind).map((d) => Math.hypot(d.x, d.y) + d.r)))

/** Every particle placed at random in a `width` × `height` box and turned at
 *  random, at least SCATTER_GAP from every other and from the edge. Bigger
 *  particles go first, since they're the hardest to fit; any that find no
 *  room are left out and counted in `missing`, and once one of a kind finds
 *  none the rest of that kind aren't tried. */
export function scatter(kinds: ParticleKind[], width: number, height: number, seed: number) {
  const random = seededRandom(seed)
  const wanted = kinds.flatMap((kind, order) => {
    const r = reach(kind)
    return Array.from({ length: kind.count }, () => ({ kind, order, reach: r }))
  })
  wanted.sort((a, b) => b.reach - a.reach || a.order - b.order)

  const discs: Disc[] = []
  const full = new Set<number>()
  let missing = 0
  for (const { kind, order, reach: r } of wanted) {
    const margin = r + SCATTER_GAP
    const room = !full.has(order) && width >= 2 * margin && height >= 2 * margin
    let found: Disc[] | undefined
    for (let i = 0; room && i < TRIES && !found; i++) {
      const angle = random() * 2 * Math.PI
      const x = margin + random() * (width - 2 * margin)
      const y = margin + random() * (height - 2 * margin)
      const candidate = particleDiscs(kind, angle).map((d) => ({ ...d, x: round(d.x + x), y: round(d.y + y) }))
      const clear = candidate.every((c) =>
        discs.every((o) => (c.x - o.x) ** 2 + (c.y - o.y) ** 2 >= (c.r + o.r + SCATTER_GAP) ** 2),
      )
      if (clear) found = candidate
    }
    if (found) discs.push(...found)
    else {
      missing++
      full.add(order)
    }
  }
  return { discs, missing }
}

/** Every particle of the kinds, one entry each, in an order shuffled by
 *  `random`, so a mixture is mixed. */
function shuffled(kinds: ParticleKind[], random: () => number) {
  const all = kinds.flatMap((kind, order) => Array.from({ length: kind.count }, () => ({ kind, order })))
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  return all
}

/** Space kept between particles in a liquid, and between them and the box. */
export const LIQUID_GAP = 2
/** How many places each particle in a liquid tries before taking the lowest. */
const DROPS = 16

/** Every particle dropped into a `width` × `height` box one at a time, in a
 *  random order and turned at random, coming to rest on the floor or on the
 *  first particle below it, LIQUID_GAP from everything; of a few random
 *  places across the box, it takes the lowest. So particles settle close
 *  together but jumbled at the bottom, as in a liquid. Any that would stick
 *  out of the top are left out and counted in `missing`, and once one of a
 *  kind has no room the rest of that kind aren't tried. */
export function pour(kinds: ParticleKind[], width: number, height: number, seed: number) {
  const random = seededRandom(seed)
  const discs: Disc[] = []
  const full = new Set<number>()
  let missing = 0
  for (const { kind, order } of shuffled(kinds, random)) {
    let found: Disc[] | undefined
    let lowest = -Infinity
    for (let i = 0; !full.has(order) && i < DROPS; i++) {
      const shape = particleDiscs(kind, random() * 2 * Math.PI).map((d) => ({ ...d, x: round(d.x), y: round(d.y) }))
      const b = discBounds(shape)
      const across = width - 2 * LIQUID_GAP - (b.right - b.left)
      if (across < 0) continue
      const x = round(LIQUID_GAP - b.left + random() * across)
      // falling from above, it stops at the floor or the first disc it meets
      let y = height - LIQUID_GAP - b.bottom
      for (const c of shape) {
        for (const o of discs) {
          const touch = c.r + o.r + LIQUID_GAP
          const dx = c.x + x - o.x
          if (Math.abs(dx) < touch) y = Math.min(y, o.y - Math.sqrt(touch ** 2 - dx ** 2) - c.y)
        }
      }
      // rounded down, so rounding never brings two discs closer
      y = Math.floor(y * 1000) / 1000
      if (y + b.top >= LIQUID_GAP && y > lowest) {
        lowest = y
        found = shape.map((d) => ({ ...d, x: round(d.x + x), y: round(d.y + y) }))
      }
    }
    if (found) discs.push(...found)
    else {
      missing++
      full.add(order)
    }
  }
  return { discs, missing }
}

/** Space between neighbors in a solid's rows, and between them and the box. */
export const SOLID_GAP = 2

/** Every particle in rows at the bottom of a `width` × `height` box, as in a
 *  solid: all turned the same way, each in a cell as big as the biggest
 *  particle, with rows filled from the bottom up and centered across the
 *  box. Which particle goes where is shuffled by the seed. Particles beyond
 *  the box's last full row are left out and counted in `missing`. */
export function stack(kinds: ParticleKind[], width: number, height: number, seed: number) {
  const all = shuffled(kinds, seededRandom(seed))
  if (!all.length) return { discs: [], missing: 0 }
  const drawn = kinds.filter((k) => k.count).map((k) => discBounds(particleDiscs(k)))
  const cellW = Math.max(...drawn.map((b) => b.right - b.left)) + SOLID_GAP
  const cellH = Math.max(...drawn.map((b) => b.bottom - b.top)) + SOLID_GAP
  const perRow = Math.max(0, Math.floor((width - SOLID_GAP) / cellW))
  const room = perRow * Math.max(0, Math.floor((height - SOLID_GAP) / cellH))
  const placed = all.slice(0, room)

  const discs: Disc[] = []
  placed.forEach(({ kind }, i) => {
    const row = Math.floor(i / perRow)
    const inRow = Math.min(perRow, placed.length - row * perRow)
    const left = (width - inRow * cellW) / 2
    const own = particleDiscs(kind)
    const b = discBounds(own)
    // each particle centered in its cell
    const cx = left + ((i % perRow) + 0.5) * cellW
    const cy = height - SOLID_GAP / 2 - (row + 0.5) * cellH
    discs.push(...own.map((d) => ({ ...d, x: round(d.x + cx - (b.left + b.right) / 2), y: round(d.y + cy - (b.top + b.bottom) / 2) })))
  })
  return { discs, missing: all.length - placed.length }
}

/** The particles in a box for its state, and how many didn't fit. */
export function arrange(state: State, kinds: ParticleKind[], width: number, height: number, seed: number) {
  if (state === 'liquid') return pour(kinds, width, height, seed)
  if (state === 'solid') return stack(kinds, width, height, seed)
  return scatter(kinds, width, height, seed)
}
