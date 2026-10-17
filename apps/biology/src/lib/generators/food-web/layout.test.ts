import { describe, expect, it } from 'vitest'
import { crossings, extentOf, layoutChain, layoutWeb, orderRows, type Layout, type Pt } from './layout'
import { GRASSLAND } from './settings'
import { SETUPS } from './setups'
import { levelsOf, parseWeb, type Web } from './web'

const web = (text: string) => parseWeb(text)!
const OPTIONS = { labelSize: 'medium', decomposers: true, levelLabels: 'none', wording: 'consumers' } as const
const WEBS = SETUPS.map((s) => s.settings.web!)
// Webs with arrows that skip rows, and a wide one, to make the routing work.
const HARD = [
  'grass;flower;berries;oak;rabbit=grass;mouse=grass,berries;deer=grass,oak;caterpillar=oak;songbird=caterpillar;snake=mouse,songbird;fox=rabbit,mouse,grass;hawk=snake,rabbit,mouse,grass;bear=deer,berries,fox;mushroom',
  'grass;a.rabbit=grass;b.mouse=grass;c.deer=grass;d.cow=grass;e.squirrel=grass;top.hawk=grass,a,b,c,d,e',
  'grass;rabbit=grass;fox~2=rabbit,grass;wolf=fox,grass;bear=wolf,grass,rabbit',
]

/** Points along an arrow's path, finely, from its d (M, L, Q and C only). */
function pathPoints(d: string): Pt[] {
  const out: Pt[] = []
  let at: Pt = { x: 0, y: 0 }
  for (const [, cmd, args] of d.matchAll(/([MLQC])([^MLQC]*)/g)) {
    const n = args.trim().split(/[ ,]+/).map(Number)
    if (cmd === 'M') { at = { x: n[0], y: n[1] }; out.push(at); continue }
    for (let i = 1; i <= 40; i++) {
      const t = i / 40, u = 1 - t
      if (cmd === 'L') out.push({ x: at.x + (n[0] - at.x) * t, y: at.y + (n[1] - at.y) * t })
      else if (cmd === 'Q') out.push({ x: u * u * at.x + 2 * u * t * n[0] + t * t * n[2], y: u * u * at.y + 2 * u * t * n[1] + t * t * n[3] })
      else out.push({
        x: u ** 3 * at.x + 3 * u * u * t * n[0] + 3 * u * t * t * n[2] + t ** 3 * n[4],
        y: u ** 3 * at.y + 3 * u * u * t * n[1] + 3 * u * t * t * n[3] + t ** 3 * n[5],
      })
    }
    at = { x: n.at(-2)!, y: n.at(-1)! }
  }
  return out
}

/** Arrows passing through a box they don't start or end at. */
function collisions(l: Layout) {
  const hits: string[] = []
  for (const a of l.arrows) {
    for (const n of l.nodes) {
      if (n.key === a.from || n.key === a.to) continue
      const r = extentOf(n)
      if (pathPoints(a.d).some((p) => p.x > r.x && p.x < r.x + r.width && p.y > r.y && p.y < r.y + r.height)) hits.push(`${a.from}→${a.to} through ${n.key}`)
    }
  }
  return hits
}

const rowsOf = (l: Layout, w: Web) => {
  const placed = levelsOf(w)
  return [...new Set(l.nodes.map((n) => placed.get(n.key)!.level))]
}

describe('a food web’s layout', () => {
  it('draws every arrow from the eaten to the eater, the way energy flows', () => {
    const w = web(GRASSLAND)
    const l = layoutWeb(w, OPTIONS)
    const links = l.arrows.filter((a) => a.from).map((a) => `${a.from}→${a.to}`).sort()
    expect(links).toEqual(w.flatMap((e) => e.eats.map((f) => `${f}→${e.key}`)).sort())
    const byKey = new Map(l.nodes.map((n) => [n.key, n]))
    for (const a of l.arrows.filter((a) => a.from)) {
      // It starts at the top of the eaten and ends at the bottom of the eater, above it.
      const from = byKey.get(a.from)!, to = byKey.get(a.to)!
      const start = pathPoints(a.d)[0]
      expect(Math.abs(start.y - from.top)).toBeLessThan(6)
      expect(Math.abs(a.tip.y - (to.top + to.height))).toBeLessThan(6)
      expect(a.angle).toBeLessThan(0) // pointing up
    }
    // Dead matter goes to the decomposers: dashed, pointing at them.
    const dead = l.arrows.filter((a) => a.dashed)
    expect(dead.map((a) => a.to)).toEqual(['mushroom'])
  })

  it('puts producers along the bottom and top predators at the top', () => {
    const l = layoutWeb(web(GRASSLAND), OPTIONS)
    const top = (k: string) => l.nodes.find((n) => n.key === k)!.top
    expect(top('hawk')).toBeLessThan(top('snake'))
    expect(top('snake')).toBeLessThan(top('frog'))
    expect(top('frog')).toBeLessThan(top('rabbit'))
    expect(top('rabbit')).toBeLessThan(top('grass'))
    // Decomposers in a column on the right.
    const mushroom = l.nodes.find((n) => n.key === 'mushroom')!
    expect(mushroom.x).toBeGreaterThan(Math.max(...l.nodes.filter((n) => n.key !== 'mushroom').map((n) => n.x + n.width / 2)))
  })

  it('never passes an arrow through an organism', () => {
    for (const text of [...WEBS, ...HARD]) {
      for (const labelSize of ['small', 'medium', 'large'] as const) {
        expect(collisions(layoutWeb(web(text), { ...OPTIONS, labelSize, levelLabels: 'text' })), text).toEqual([])
      }
    }
  })

  it('never crosses more arrows than the order the web was written in', () => {
    for (const text of [...WEBS, ...HARD]) {
      const w = web(text)
      const placed = levelsOf(w)
      const ranked = w.filter((e) => placed.get(e.key)!.level !== null)
      const levels = [...new Set(ranked.map((e) => placed.get(e.key)!.level!))].sort((a, b) => b - a)
      const given = levels.map((lv) => ranked.filter((e) => placed.get(e.key)!.level === lv).map((e) => e.key))
      const edges = ranked.flatMap((e) => e.eats.map((f) => [f, e.key] as [string, string]))
      expect(crossings(orderRows(given, edges), edges)).toBeLessThanOrEqual(crossings(given, edges))
    }
  })

  it('cuts crossings where it can', () => {
    // Written in the worst order: each eater above the other's food.
    const rows = [['fox', 'owl'], ['mouse', 'rabbit']]
    const edges: [string, string][] = [['rabbit', 'fox'], ['mouse', 'owl']]
    expect(crossings(rows, edges)).toBe(1)
    expect(crossings(orderRows(rows, edges), edges)).toBe(0)
  })

  it('always lays out the same web the same way', () => {
    for (const text of [...WEBS, ...HARD]) {
      expect(JSON.stringify(layoutWeb(web(text), OPTIONS))).toBe(JSON.stringify(layoutWeb(web(text), OPTIONS)))
    }
  })

  it('keeps rows by level, the omnivore where the teacher put it', () => {
    const w = web('grass;rabbit=grass;fox~2=rabbit,grass;wolf=fox')
    const l = layoutWeb(w, OPTIONS)
    const fox = l.nodes.find((n) => n.key === 'fox')!, rabbit = l.nodes.find((n) => n.key === 'rabbit')!
    expect(fox.top).toBe(rabbit.top)
    expect(rowsOf(l, w)).toHaveLength(3)
    // The rabbit to fox arrow arcs over the row, not through anything.
    expect(collisions(l)).toEqual([])
  })

  it('leaves decomposers off when asked', () => {
    const l = layoutWeb(web(GRASSLAND), { ...OPTIONS, decomposers: false })
    expect(l.nodes.map((n) => n.key)).not.toContain('mushroom')
    expect(l.arrows.some((a) => a.dashed)).toBe(false)
  })
})

describe('a food chain’s layout', () => {
  it('runs left to right, or bottom to top, an arrow from each to the next', () => {
    const w = web(GRASSLAND)
    const keys = ['grass', 'grasshopper', 'frog', 'snake', 'hawk']
    const right = layoutChain(w, keys, 'right', OPTIONS)
    expect(right.nodes.map((n) => n.key)).toEqual(keys)
    expect(right.nodes.every((n, i) => i === 0 || n.x > right.nodes[i - 1].x)).toBe(true)
    expect(right.arrows.map((a) => `${a.from}→${a.to}`)).toEqual(['grass→grasshopper', 'grasshopper→frog', 'frog→snake', 'snake→hawk'])
    expect(right.arrows.every((a) => a.angle === 0)).toBe(true)
    const up = layoutChain(w, keys, 'up', OPTIONS)
    expect(up.nodes.every((n, i) => i === 0 || n.top < up.nodes[i - 1].top)).toBe(true)
    expect(up.arrows.every((a) => a.angle === -90)).toBe(true)
    expect(collisions(right)).toEqual([])
    expect(collisions(up)).toEqual([])
  })

  it('labels each organism’s level, in either wording', () => {
    const w = web(GRASSLAND)
    const keys = ['grass', 'grasshopper', 'frog', 'snake']
    expect(layoutChain(w, keys, 'right', { ...OPTIONS, levelLabels: 'text' }).labels.map((l) => l.text)).toEqual([
      'Producer', 'Primary consumer', 'Secondary consumer', 'Tertiary consumer',
    ])
    expect(layoutChain(w, keys, 'up', { ...OPTIONS, levelLabels: 'text', wording: 'diet' }).labels.map((l) => l.text)).toEqual([
      'Producer', 'Herbivore', 'Carnivore', 'Carnivore',
    ])
  })
})
