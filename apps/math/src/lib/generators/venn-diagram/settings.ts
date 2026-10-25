// Every choice the teacher makes, with its default. The page address carries
// any non-default values so a Venn diagram can be bookmarked or shared.
//
// What's in each region is kept as typed: a number or some math per region
// (r_ab=5), or, in elements mode, each set's members as a list ("1-20",
// "2, 4, 6"). readVenn() works out what they mean: which regions the diagram
// has, what goes in each, the counts for the readout, and anything the
// teacher should fix.

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'
import { fmt } from '$shared/graph/numbering'
import { FILLS, type Fill } from '$lib/stats/fills'
import { readValue } from '$lib/stats/table'

export { fmt }

/** What's written in each region: one number, the elements themselves, or a letter or expression. */
export const MODES = { numbers: 'Numbers', elements: 'Elements', text: 'Text' } as const
export const SET_COUNTS = [1, 2, 3] as const
/** How two sets are drawn: overlapping, apart (mutually exclusive), or B inside A (a subset). */
export const ARRANGEMENTS = { overlap: 'Overlapping', separate: 'Separate', subset: 'B inside A' } as const
/** The universal set's name in the top left corner. */
export const UNIVERSES = { U: 'U', xi: 'ξ', S: 'S', epsilon: 'ε', word: 'Word', none: 'None' } as const
export const UNIVERSE_SYMBOLS: Partial<Record<Universe, string>> = { xi: 'ξ', U: 'U', S: 'S', epsilon: 'ε' }
/** What an empty region shows, in numbers and text modes. */
export const EMPTIES = { none: 'Nothing', line: 'A blank line' } as const
/** The fills a shaded region can take: the tints, gray and the patterns (not white or black). */
export const SHADES = ['blue', 'red', 'green', 'orange', 'purple', 'gray', 'hatch', 'backhatch', 'cross', 'dots'] as const satisfies readonly Fill[]

export type Mode = keyof typeof MODES
export type SetCount = (typeof SET_COUNTS)[number]
export type Arrangement = keyof typeof ARRANGEMENTS
export type Universe = keyof typeof UNIVERSES
export type Empty = keyof typeof EMPTIES
export type Shade = (typeof SHADES)[number]

/**
 * A region, by the sets it's inside: 'a' is in A only (of the sets drawn),
 * 'ab' in A and B but not C, 'out' in none of them.
 */
export const REGION_KEYS = ['a', 'b', 'ab', 'c', 'ac', 'bc', 'abc', 'out'] as const
export type RegionKey = (typeof REGION_KEYS)[number]
export const LETTERS = ['A', 'B', 'C'] as const

export type Settings = {
  mode: Mode
  sets: SetCount
  arrangement: Arrangement
  nameA: string
  nameB: string
  nameC: string
  universe: Universe
  universeWord: string
  /** what's typed in each region, in numbers and text modes; regions left empty aren't kept */
  values: Partial<Record<RegionKey, string>>
  /** in elements mode: the universal set's members, and each set's, as typed */
  universeList: string
  listA: string
  listB: string
  listC: string
  /** the regions shaded, in REGION_KEYS order */
  shaded: RegionKey[]
  shade: Shade
  empty: Empty
  labelSize: LabelSize
}
/** Settings as they may arrive: from a form, a link, or a preset stored by an older version. */
export type RawSettings = Record<string, any>

export const DEFAULT_SETTINGS: Settings = {
  mode: 'numbers',
  sets: 2,
  arrangement: 'overlap',
  nameA: 'A',
  nameB: 'B',
  nameC: 'C',
  universe: 'U',
  universeWord: '',
  values: {},
  universeList: '',
  listA: '',
  listB: '',
  listC: '',
  shaded: [],
  shade: 'blue',
  empty: 'none',
  labelSize: 'medium',
}

const LISTS = ['values', 'shaded'] as const
type Scalar = Exclude<keyof Settings, (typeof LISTS)[number]>
const SCALARS = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).filter((k): k is Scalar => !(LISTS as readonly string[]).includes(k))

const text = (v: unknown, fallback: string) => (v === undefined || v === null ? fallback : String(v))
const oneOf = <T extends string>(names: Record<T, string>, v: any, fallback: T): T => (typeof v === 'string' && v in names ? (v as T) : fallback)

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  const values: Partial<Record<RegionKey, string>> = {}
  const raw = s.values && typeof s.values === 'object' ? s.values : {}
  for (const k of REGION_KEYS) {
    const v = text(raw[k], '')
    if (v.trim()) values[k] = v
  }
  const shaded = Array.isArray(s.shaded) ? s.shaded : []
  return {
    mode: oneOf(MODES, s.mode, d.mode),
    sets: (SET_COUNTS as readonly number[]).includes(Number(s.sets)) ? (Number(s.sets) as SetCount) : d.sets,
    arrangement: oneOf(ARRANGEMENTS, s.arrangement, d.arrangement),
    nameA: text(s.nameA, d.nameA),
    nameB: text(s.nameB, d.nameB),
    nameC: text(s.nameC, d.nameC),
    universe: oneOf(UNIVERSES, s.universe, d.universe),
    universeWord: text(s.universeWord, d.universeWord),
    values,
    universeList: text(s.universeList, d.universeList),
    listA: text(s.listA, d.listA),
    listB: text(s.listB, d.listB),
    listC: text(s.listC, d.listC),
    shaded: REGION_KEYS.filter((k) => shaded.includes(k)),
    shade: (SHADES as readonly string[]).includes(s.shade) ? s.shade : d.shade,
    empty: oneOf(EMPTIES, s.empty, d.empty),
    labelSize: cleanLabelSize(s.labelSize),
  }
}

export function settingsToQuery(s: Settings): string {
  const params = new URLSearchParams()
  for (const key of SCALARS) {
    const v = s[key]
    if (v === DEFAULT_SETTINGS[key] || v === null || v === undefined) continue
    params.set(key, String(v))
  }
  // One r_<region>= for each region with something typed, and the shaded ones in one list.
  for (const k of REGION_KEYS) if (s.values[k]?.trim()) params.set(`r_${k}`, s.values[k]!)
  if (s.shaded.length) params.set('shaded', s.shaded.join('|'))
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const s: RawSettings = {
    values: Object.fromEntries(REGION_KEYS.filter((k) => params.has(`r_${k}`)).map((k) => [k, params.get(`r_${k}`)])),
    shaded: (params.get('shaded') ?? '').split('|'),
  }
  for (const key of SCALARS) if (params.has(key)) s[key] = params.get(key)
  return cleanSettings(s)
}

// ---------------------------------------------------------------------------
// What the settings mean.

/** The sets' bits in a region's mask: A is 1, B 2, C 4. */
export const maskOf = (key: RegionKey) => (key === 'out' ? 0 : [...key].reduce((m, c) => m | (1 << (c.charCodeAt(0) - 97)), 0))
export const keyOf = (mask: number): RegionKey => (mask ? ([...'abc'].filter((_, i) => mask & (1 << i)).join('') as RegionKey) : 'out')

/** The regions a diagram has, in the order they're listed: two sets' left to right, three sets' by how many sets they're in. */
export function regionsOf(sets: SetCount, arrangement: Arrangement): RegionKey[] {
  if (sets === 1) return ['a', 'out']
  if (sets === 3) return ['a', 'b', 'c', 'ab', 'ac', 'bc', 'abc', 'out']
  if (arrangement === 'separate') return ['a', 'b', 'out']
  if (arrangement === 'subset') return ['a', 'ab', 'out']
  return ['a', 'ab', 'b', 'out']
}

/** Each set's name as typed, or its letter where it's empty, for the settings and readout. */
export const setNames = (s: Settings) => [s.nameA, s.nameB, s.nameC].map((n, i) => n.trim() || LETTERS[i])

/** A region named in plain words: "A only", "A and B", "Neither". */
export function regionName(s: Settings, key: RegionKey): string {
  const [A, B, C] = setNames(s)
  const named = [A, B, C]
  const inside = [...(key === 'out' ? '' : key)].map((c) => named[c.charCodeAt(0) - 97])
  if (s.sets === 1) return key === 'out' ? `Not in ${A}` : A
  if (s.sets === 2 && s.arrangement === 'subset') return key === 'a' ? `${A}, not ${B}` : key === 'ab' ? B : `Not in ${A}`
  if (key === 'out') return s.sets === 3 ? 'None of them' : 'Neither'
  if (s.sets === 2 && s.arrangement === 'separate') return inside[0]
  if (inside.length === 1) return `${inside[0]} only`
  if (inside.length === 2) return s.sets === 3 ? `${inside[0]} and ${inside[1]} only` : `${inside[0]} and ${inside[1]}`
  return `${A}, ${B} and ${C}`
}

/** The universal set's symbol as written on the figure, '' for none. */
export function universeText(s: Settings): string {
  if (s.universe === 'word') return s.universeWord.trim()
  return UNIVERSE_SYMBOLS[s.universe] ?? ''
}

export const MAX_ELEMENTS = 80 // in the whole diagram
const MAX_RANGE = 200 // numbers in one typed range, like 1-20

/** One element: as it's written, and the key it's matched by (case and leading zeros aside). */
export type Element = { text: string; key: string }

/**
 * A list as typed: "1-20", "2, 4, 6, 8", "red, blue", "ice cream; cake", or
 * numbers and words with spaces between. Ranges of whole numbers ("1-20",
 * "1–20", "1 to 20") are counted out. A repeat is kept, as another copy
 * (36 = 2, 2, 3, 3 for prime factors).
 */
export function parseList(typed: string): { elements: Element[]; tooLong: boolean } {
  const t = typed.replace(/(-?\d+)\s*(?:to|–|—|-)\s*(-?\d+)/g, '$1~$2')
  const parts = (/[,;\n]/.test(t) ? t.split(/[,;\n]+/) : t.split(/\s+/)).map((p) => p.trim()).filter(Boolean)
  const elements: Element[] = []
  let tooLong = false
  for (const p of parts) {
    const range = /^(-?\d+)~(-?\d+)$/.exec(p)
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])]
      if (b >= a && b - a < MAX_RANGE) {
        for (let v = a; v <= b; v++) elements.push({ text: String(v), key: String(v) })
        continue
      }
      if (b - a >= MAX_RANGE) {
        tooLong = true
        continue
      }
    }
    const plain = p.replace(/~/g, '–')
    const n = readValue(plain).value
    elements.push({ text: plain, key: n === null ? plain.toLowerCase() : String(n) })
  }
  return { elements, tooLong }
}

/** Counts of each element in a list, by key. */
function tally(list: Element[]) {
  const m = new Map<string, number>()
  for (const e of list) m.set(e.key, (m.get(e.key) ?? 0) + 1)
  return m
}

const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`)

/**
 * The elements sorted into regions. Each copy of an element is placed by the
 * sets that have that many copies of it: with A = 2, 2, 3 and B = 2, 3, 5,
 * one 2 and the 3 are in both, the other 2 in A only. With ξ empty, the
 * universal set is the sets' own elements, so nothing is outside them.
 */
export function sortElements(s: Settings): { regions: Partial<Record<RegionKey, string[]>>; counts: Record<string, number>; problem: string | null } {
  const names = setNames(s)
  const xi = parseList(s.universeList)
  const lists = [s.listA, s.listB, s.listC].slice(0, s.sets).map(parseList)
  const symbol = universeText(s) || 'the universal set'
  let problem: string | null = null
  if (xi.tooLong || lists.some((l) => l.tooLong)) problem = `A range can count out at most ${MAX_RANGE} numbers.`

  // Every element in the order it first appears: ξ's order, then the sets'.
  const textOf = new Map<string, string>()
  for (const e of [...xi.elements, ...lists.flatMap((l) => l.elements)]) if (!textOf.has(e.key)) textOf.set(e.key, e.text)
  const inXi = tally(xi.elements)
  const inSets = lists.map((l) => tally(l.elements))
  const given = xi.elements.length > 0

  const regions: Partial<Record<RegionKey, string[]>> = {}
  const allowed = regionsOf(s.sets, s.arrangement)
  for (const [key, text] of textOf) {
    const copies = inSets.map((t) => t.get(key) ?? 0)
    const most = Math.max(0, ...copies)
    if (!problem && given) {
      const i = copies.findIndex((c) => c > (inXi.get(key) ?? 0))
      if (i >= 0 && !inXi.has(key)) problem = `${text} is in ${names[i]} but not in ${symbol}. Add it to ${symbol}, or take it out of ${names[i]}.`
      else if (i >= 0) problem = `${text} is in ${names[i]} ${times(copies[i])} but in ${symbol} ${times(inXi.get(key)!)}.`
    }
    const total = given ? Math.max(inXi.get(key) ?? 0, most) : most
    for (let k = 0; k < total; k++) {
      const mask = copies.reduce((m, c, i) => (c > k ? m | (1 << i) : m), 0)
      const region = keyOf(mask)
      if (!allowed.includes(region) && !problem) {
        problem =
          s.arrangement === 'subset'
            ? `${text} is in ${names[1]} but not in ${names[0]}, and ${names[1]} is drawn inside ${names[0]}.`
            : `${text} is in both ${names[0]} and ${names[1]}, but they’re drawn apart. Choose Overlapping, or take ${text} out of one.`
      }
      ;(regions[region] ??= []).push(text)
    }
  }
  const counts = Object.fromEntries(REGION_KEYS.map((k) => [k, regions[k]?.length ?? 0]))
  const count = Object.values(counts).reduce((a, b) => a + b, 0)
  if (!problem && count > MAX_ELEMENTS) problem = `That’s ${count} elements. ${MAX_ELEMENTS} at most fit in one diagram.`
  return { regions, counts, problem }
}

/** One line of the readout: "n(A ∩ B) = 5". */
export type ReadoutLine = { label: string; value: string }

/**
 * What the settings mean: the regions drawn, what's written in each (as
 * typed, or the elements), the counts as numbers (null where a region's count
 * isn't known), and messages for the settings panel.
 */
/** Text split at its commas (not those inside brackets, as in (1, 2)): "red flesh, mushy, savory" is three things. */
export function splitAtCommas(typed: string): string[] {
  const out: string[] = []
  let depth = 0
  let from = 0
  for (let i = 0; i <= typed.length; i++) {
    const ch = typed[i]
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1)
    else if (i === typed.length || (ch === ',' && !depth)) {
      const piece = typed.slice(from, i).trim()
      if (piece) out.push(piece)
      from = i + 1
    }
  }
  return out
}

export function readVenn(s: Settings) {
  const keys = regionsOf(s.sets, s.arrangement)
  const contents: Partial<Record<RegionKey, string[]>> = {}
  const counts: Partial<Record<RegionKey, number | null>> = {}
  const problems: { values: Partial<Record<RegionKey, string>>; elements: string | null } = { values: {}, elements: null }
  let members: Partial<Record<RegionKey, string[]>> | null = null

  if (s.mode === 'elements') {
    const sorted = sortElements(s)
    problems.elements = sorted.problem
    members = sorted.regions
    for (const k of keys) {
      contents[k] = sorted.regions[k] ?? []
      counts[k] = sorted.counts[k]
    }
  } else {
    for (const k of keys) {
      const typed = s.values[k]?.trim() ?? ''
      contents[k] = s.mode === 'text' ? splitAtCommas(typed) : typed ? [typed] : []
      if (s.mode !== 'numbers') continue
      const v = readValue(typed)
      if (v.bad) problems.values[k] = `“${v.bad}” isn’t a number. Choose Text at the top to write letters or fractions.`
      else if (v.value !== null && v.value < 0) problems.values[k] = 'A region can’t hold less than 0.'
      counts[k] = v.value !== null && v.value >= 0 ? v.value : null
    }
  }
  return { keys, contents, counts: s.mode === 'text' ? null : counts, members, problems, readout: readout(s, keys, s.mode === 'text' ? null : counts, members) }
}

/**
 * The readout's numbers: n(ξ), each set, where they meet, and their unions,
 * each the sum of its regions (left out while any of those is unknown); then,
 * in elements mode, each region's members.
 */
function readout(s: Settings, keys: RegionKey[], counts: Partial<Record<RegionKey, number | null>> | null, members: Partial<Record<RegionKey, string[]>> | null) {
  if (!counts) return { counts: [] as ReadoutLine[], members: [] as ReadoutLine[] }
  const names = setNames(s).slice(0, s.sets)
  const xi = universeText(s) || 'ξ'
  /** The sum over the regions a mask test picks, or null if one isn't known. */
  const sum = (pick: (mask: number) => boolean) => {
    let t = 0
    for (const k of keys) {
      if (!pick(maskOf(k))) continue
      const c = counts[k]
      if (c === null || c === undefined) return null
      t += c
    }
    return t
  }
  const lines: { label: string; pick: (m: number) => boolean }[] = [{ label: `n(${xi})`, pick: () => true }]
  names.forEach((n, i) => lines.push({ label: `n(${n})`, pick: (m) => !!(m & (1 << i)) }))
  const pairs = s.sets === 3 ? [[0, 1], [0, 2], [1, 2]] : s.sets === 2 ? [[0, 1]] : []
  for (const [i, j] of pairs) lines.push({ label: `n(${names[i]} ∩ ${names[j]})`, pick: (m) => !!(m & (1 << i)) && !!(m & (1 << j)) })
  if (s.sets === 3) lines.push({ label: `n(${names.join(' ∩ ')})`, pick: (m) => m === 7 })
  for (const [i, j] of pairs) lines.push({ label: `n(${names[i]} ∪ ${names[j]})`, pick: (m) => !!(m & ((1 << i) | (1 << j))) })
  if (s.sets === 3) lines.push({ label: `n(${names.join(' ∪ ')})`, pick: (m) => m !== 0 })

  const out: ReadoutLine[] = []
  for (const l of lines) {
    const v = sum(l.pick)
    if (v !== null) out.push({ label: l.label, value: fmt(v) })
  }
  const memberLines = members
    ? keys.map((k) => ({ label: regionName(s, k), value: members[k]?.length ? members[k]!.join(', ') : '–' }))
    : []
  return { counts: out, members: memberLines }
}

/** The shades by name, for the settings panel. */
export const SHADE_NAMES = Object.fromEntries(SHADES.map((f) => [f, FILLS[f]])) as Record<Shade, string>
