// A food web, as the page address writes it: one short line of organisms,
// each followed by what it eats, e.g.
//
//   grass;rabbit=grass;grasshopper=grass;frog=grasshopper;hawk=frog,rabbit
//
// An organism is `key[.picture][~mark][!blank][:name][=food,food…]`:
// - key: its own short id in this web, a-z, 0-9 and hyphens. A key that is
//   one of the bundled organisms (organisms/manifest.ts) is drawn with that
//   picture and name unless it says otherwise.
// - .picture: a bundled organism's id, an uploaded picture's reference
//   (u- and 12 hex digits, see images.ts), or `none` for a name in a box.
// - ~mark: `d` makes it a decomposer, `c` keeps it a consumer (an earthworm
//   eaten by a bird, say), and 2 to 6 puts a consumer at that level.
// - !blank: `n` leaves its name blank, `p` its picture, `b` both.
// - :name: the name it is drawn with, when not its picture's.
// - =food: what it eats, by key. Arrows go from each food to its eater,
//   the way energy flows.
//
// Decomposers break down every organism's dead matter, so what they eat
// isn't written. A web is kept acyclic: a link that would make something eat itself, however indirectly,
// is dropped.

import { ORGANISM_BY_ID, type Role } from './organisms/manifest'

/** The most organisms in one web, decomposers included. */
export const MAX_ORGANISMS = 14
/** The longest food chain drawn, and the most energy pyramid levels. */
export const MAX_CHAIN = 6
export const MAX_NAME = 30
export const MAX_LEVEL = 6

export type Blank = '' | 'n' | 'p' | 'b'
/** A decomposer, kept a consumer, or a consumer's level, as the teacher marked it. */
export type Mark = '' | 'd' | 'c' | 2 | 3 | 4 | 5 | 6

export interface Entry {
  key: string
  /** a bundled organism's id, an upload's reference, or 'none' */
  picture: string
  /** '' for its key's name */
  name: string
  mark: Mark
  blank: Blank
  eats: string[]
}

export type Web = Entry[]

const KEY = /^[a-z0-9][a-z0-9-]{0,23}$/
export const UPLOAD = /^u-[0-9a-f]{12}$/

/** A key made from typed text: lower case, hyphens between words. */
export const slug = (text: string) =>
  text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24).replace(/-+$/, '')

/** A key not yet in the web, from `base`: rabbit, rabbit-2, rabbit-3… */
export function freshKey(web: Web, base: string) {
  const root = slug(base) || 'organism'
  const taken = new Set(web.map((e) => e.key))
  if (!taken.has(root)) return root
  for (let n = 2; ; n++) {
    const key = `${root.slice(0, 21)}-${n}`
    if (!taken.has(key)) return key
  }
}

const isPicture = (p: string) => p === 'none' || UPLOAD.test(p) || ORGANISM_BY_ID.has(p)
/** A key's own picture: the bundled organism of that id, or none. */
export const defaultPicture = (key: string) => (ORGANISM_BY_ID.has(key) ? key : 'none')
/** A key's own name: the bundled organism's, or the key in words. */
export function defaultName(key: string) {
  const known = ORGANISM_BY_ID.get(key)
  if (known) return known.name
  const words = key.replace(/-\d+$/, '').replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
export const nameOf = (e: Entry) => e.name || defaultName(e.key)
const cleanName = (text: string) => text.replace(/[;=\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim()

/** Where an organism sits: decomposers in a column of their own, anything
 *  else by what it eats. */
export function roleOf(e: Entry): Role {
  if (e.mark === 'd') return 'decomposer'
  if (ORGANISM_BY_ID.get(e.picture)?.role === 'decomposer' && e.mark !== 'c') return 'decomposer'
  return e.eats.length ? 'consumer' : 'producer'
}

/** The web written out, each part only where it isn't the default. */
export function formatWeb(web: Web): string {
  return web
    .map((e) => {
      let out = e.key
      if (e.picture !== defaultPicture(e.key)) out += `.${e.picture}`
      if (e.mark !== '') out += `~${e.mark}`
      if (e.blank) out += `!${e.blank}`
      if (e.name && e.name !== defaultName(e.key)) out += `:${e.name}`
      if (e.eats.length) out += `=${e.eats.join(',')}`
      return out
    })
    .join(';')
}

/** A web read from the address, tidied (see tidyWeb), or undefined for
 *  text with no organisms in it. */
export function parseWeb(text: string): Web | undefined {
  const web: Web = []
  for (const part of text.split(';')) {
    const eq = part.indexOf('=')
    const head = eq < 0 ? part : part.slice(0, eq)
    const eats = eq < 0 ? [] : part.slice(eq + 1).split(',').map((k) => slug(k)).filter(Boolean)
    const colon = head.indexOf(':')
    const meta = colon < 0 ? head : head.slice(0, colon)
    const name = colon < 0 ? '' : cleanName(head.slice(colon + 1))
    const m = meta.trim().match(/^([^.~!]*)(?:\.([^~!]*))?(?:~([^!]*))?(?:!(.*))?$/)
    if (!m) continue
    const key = slug(m[1])
    if (!key) continue
    const picture = m[2] !== undefined && isPicture(m[2].trim().toLowerCase()) ? m[2].trim().toLowerCase() : defaultPicture(key)
    const markText = (m[3] ?? '').trim().toLowerCase()
    const mark: Mark = markText === 'd' || markText === 'c' ? markText : /^[2-6]$/.test(markText) ? (Number(markText) as Mark) : ''
    const blankText = (m[4] ?? '').trim().toLowerCase()
    const blank: Blank = blankText === 'n' || blankText === 'p' || blankText === 'b' ? blankText : ''
    web.push({ key, picture, name, mark, blank, eats })
  }
  const tidy = tidyWeb(web)
  return tidy.length ? tidy : undefined
}

/** A web made safe to draw: at most MAX_ORGANISMS, keys unique and
 *  well-formed, each food a different organism in the web, nothing written for what eats nothing, a level
 *  only on a consumer, and no link that would close a cycle (dropped in the
 *  order written). */
export function tidyWeb(web: Web): Web {
  const seen = new Set<string>()
  const kept: Web = []
  for (const e of web) {
    if (kept.length >= MAX_ORGANISMS) break
    if (!KEY.test(e.key) || seen.has(e.key)) continue
    seen.add(e.key)
    const name = cleanName(e.name)
    kept.push({
      ...e,
      picture: isPicture(e.picture) ? e.picture : defaultPicture(e.key),
      name: name === defaultName(e.key) ? '' : name,
      eats: [...new Set(e.eats)],
    })
  }
  const byKey = new Map(kept.map((e) => [e.key, e]))
  const out: Web = kept.map((e) => ({ ...e, eats: [] as string[] }))
  const outByKey = new Map(out.map((e) => [e.key, e]))
  for (const e of kept) {
    const role = roleOf(e)
    const into = outByKey.get(e.key)!
    if (role === 'decomposer') continue
    for (const food of e.eats) {
      const f = byKey.get(food)
      if (!f || food === e.key) continue
      if (wouldCycle(out, e.key, food)) continue
      into.eats.push(food)
    }
  }
  for (const e of out) {
    const role = roleOf(e)
    if (typeof e.mark === 'number' && role !== 'consumer') e.mark = ''
    if (e.mark === 'c' && ORGANISM_BY_ID.get(e.picture)?.role !== 'decomposer') e.mark = ''
  }
  return out
}

/** Whether `eater` eating `food` would close a cycle: whether energy
 *  already flows from `eater` to `food`. */
export function wouldCycle(web: Web, eater: string, food: string): boolean {
  if (eater === food) return true
  const eatersOf = new Map<string, string[]>()
  for (const e of web) for (const f of e.eats) eatersOf.set(f, [...(eatersOf.get(f) ?? []), e.key])
  const stack = [eater]
  const seen = new Set<string>()
  while (stack.length) {
    const k = stack.pop()!
    if (k === food) return true
    if (seen.has(k)) continue
    seen.add(k)
    stack.push(...(eatersOf.get(k) ?? []))
  }
  return false
}

/** Whether any organism eats itself, however indirectly. */
export function hasCycle(web: Web): boolean {
  const byKey = new Map(web.map((e) => [e.key, e]))
  const state = new Map<string, 'open' | 'done'>()
  const visit = (k: string): boolean => {
    if (state.get(k) === 'done') return false
    if (state.get(k) === 'open') return true
    state.set(k, 'open')
    for (const f of byKey.get(k)?.eats ?? []) if (visit(f)) return true
    state.set(k, 'done')
    return false
  }
  return web.some((e) => visit(e.key))
}

export interface Placed {
  entry: Entry
  role: Role
  /** its trophic level: 1 for producers, and for a consumer one more than
   *  its highest food, or as marked; null for a decomposer, which has a
   *  column of its own */
  level: number | null
}

/** Every organism's role and trophic level. A cyclic web has none (tidyWeb
 *  never makes one). Something eating a decomposer counts it as level 1. */
export function levelsOf(web: Web): Map<string, Placed> {
  if (hasCycle(web)) throw new Error('A food web cannot have a cycle')
  const byKey = new Map(web.map((e) => [e.key, e]))
  const out = new Map<string, Placed>()
  const visit = (e: Entry): Placed => {
    const done = out.get(e.key)
    if (done) return done
    const role = roleOf(e)
    let level: number | null = null
    if (role === 'producer') level = 1
    else if (role === 'consumer') {
      const foods = e.eats.map((k) => byKey.get(k)).filter((f): f is Entry => !!f).map((f) => visit(f))
      level = typeof e.mark === 'number' ? e.mark : Math.min(MAX_LEVEL, 1 + Math.max(...foods.map((p) => p.level ?? 1)))
    }
    const placed = { entry: e, role, level }
    out.set(e.key, placed)
    return placed
  }
  for (const e of web) visit(e)
  return out
}

/** The organisms of a chain as written: keys in the web only, without
 *  repeats, at most MAX_CHAIN. */
export function writtenChain(web: Web, text: string): string[] {
  const keys = new Set(web.map((e) => e.key))
  return [...new Set(text.split(',').map((k) => slug(k)).filter((k) => keys.has(k)))].slice(0, MAX_CHAIN)
}

/** The chain drawn: the one written, or with fewer than two, the web's longest. */
export function chainOf(web: Web, text: string): string[] {
  const chain = writtenChain(web, text)
  return chain.length >= 2 ? chain : longestChain(web)
}

/** The web's longest food chain from a producer, first in the order
 *  written where several tie. */
export function longestChain(web: Web): string[] {
  const placed = levelsOf(web)
  const byKey = new Map(web.map((e) => [e.key, e]))
  const memo = new Map<string, string[]>()
  const longestTo = (k: string): string[] => {
    const hit = memo.get(k)
    if (hit) return hit
    let best: string[] = []
    for (const f of byKey.get(k)?.eats ?? []) {
      if (placed.get(f)?.role === 'decomposer') continue
      const c = longestTo(f)
      if (c.length > best.length) best = c
    }
    const chain = [...best, k]
    memo.set(k, chain)
    return chain
  }
  let best: string[] = []
  for (const e of web) {
    if (placed.get(e.key)?.role === 'decomposer') continue
    const c = longestTo(e.key)
    if (c.length > best.length) best = c
  }
  return best.slice(-MAX_CHAIN)
}

/** Whether `eater` eats `food` in the web. */
export const eats = (web: Web, eater: string, food: string) => !!web.find((e) => e.key === eater)?.eats.includes(food)

// ---- Changes from the settings panel ------------------------------------

/** The web with one organism changed, tidied again. */
export const updateOrganism = (web: Web, key: string, over: Partial<Entry>): Web =>
  tidyWeb(web.map((e) => (e.key === key ? { ...e, ...over } : e)))

/** The web without an organism, and nothing eating it. */
export const removeOrganism = (web: Web, key: string): Web =>
  tidyWeb(web.filter((e) => e.key !== key).map((e) => ({ ...e, eats: e.eats.filter((k) => k !== key) })))

/** The web with `eater` eating `food` or not, unless that would close a cycle. */
export function setEats(web: Web, eater: string, food: string, on: boolean): Web {
  if (on && wouldCycle(web, eater, food)) return web
  return updateOrganism(web, eater, {
    eats: on ? [...web.find((e) => e.key === eater)!.eats, food] : web.find((e) => e.key === eater)!.eats.filter((k) => k !== food),
  })
}
