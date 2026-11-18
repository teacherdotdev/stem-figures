// Every choice the teacher makes, with its default. The page address carries
// any non-default values so a tree diagram can be bookmarked or shared.
//
// A tree diagram is a list of stages, each with its outcomes typed once: every
// node of a stage branches into the same outcomes (see CONTEXT.md). A stage's
// probabilities are one row, used under every node (the same on every branch),
// or one row per node before it, for dependent events. Probabilities are kept
// as typed and written as typed; one left empty is a blank. readTree() works
// out what it all means: every node and path, each path's probability, and
// anything the teacher should fix.
//
// A label is known by a key: its kind's letter, then the node's outcome indices
// from the start (o0-1 is the outcome name at the node reached by the first
// outcome, then the second; p0-1 the probability on the branch to it; n and q a
// path's name and probability in the outcome column). Clicked blanks are kept
// as keys, so they stay with their label as long as it's there.

import { cleanLabelSize, type LabelSize } from '$shared/labelSize'

export const MAX_STAGES = 4
export const MIN_OUTCOMES = 2
export const MAX_OUTCOMES = 6
export const MAX_PATHS = 36
/** Top to bottom fits fewer paths across a page. */
export const MAX_PATHS_DOWN = 12

export const DIRECTIONS = { right: 'Left to right', down: 'Top to bottom' } as const
export const SHOWS = { show: 'Show', blank: 'Blank', hide: 'Hide' } as const
export const PATH_STYLES = { comma: 'H, T', joined: 'HT' } as const

export type Direction = keyof typeof DIRECTIONS
export type Show = keyof typeof SHOWS
export type PathStyle = keyof typeof PATH_STYLES

export type Stage = {
  /** the stage's title, like 1st draw, written over it when stage titles are on */
  title: string
  /** each outcome's name, like H and T */
  outcomes: string[]
  /** one probability row used under every node (false: one row per node before it) */
  same: boolean
  /** probabilities as typed: one row per node before this stage (just one while `same`), one per outcome */
  probs: string[][]
}

export type Settings = {
  stages: Stage[]
  direction: Direction
  /** written at the start of the tree; empty for none */
  start: string
  stageTitles: boolean
  pathStyle: PathStyle
  showOutcomes: Show
  showProbs: Show
  showNames: Show
  showPathProbs: Show
  /** labels clicked into blanks on the figure, by key */
  blanks: string[]
  labelSize: LabelSize
}
/** Settings as they may arrive: from a form, a link, or a preset stored by an older version. */
export type RawSettings = Record<string, any>

const coin = (): Stage => ({ title: '', outcomes: ['H', 'T'], same: true, probs: [['0.5', '0.5']] })

export const DEFAULT_SETTINGS: Settings = {
  stages: [coin(), coin()],
  direction: 'right',
  start: '',
  stageTitles: false,
  pathStyle: 'comma',
  showOutcomes: 'show',
  showProbs: 'show',
  showNames: 'show',
  showPathProbs: 'show',
  blanks: [],
  labelSize: 'medium',
}

type Scalar = Exclude<keyof Settings, 'stages' | 'blanks'>
const SCALARS = (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).filter((k): k is Scalar => k !== 'stages' && k !== 'blanks')

const text = (v: unknown, fallback: string) => (v === undefined || v === null ? fallback : String(v))
const oneOf = <T extends string>(names: Record<T, string>, v: any, fallback: T): T => (typeof v === 'string' && v in names ? (v as T) : fallback)
const bool = (v: unknown, fallback: boolean) => (v === undefined || v === null ? fallback : v === true || v === '1' || v === 'true')
// "|" and ";" split lists in the page address. Text is kept as typed (spaces
// too, so a name can be typed a word at a time) and trimmed where it's used.
const tidy = (v: unknown) => text(v, '').replace(/[|;]/g, '')

// ——— The tree's shape ———

/** How many outcomes each stage has. */
export const countsOf = (stages: Pick<Stage, 'outcomes'>[]) => stages.map((st) => st.outcomes.length)
/** How many paths (leaves) the stages make. */
export const pathCount = (counts: number[]) => counts.reduce((a, n) => a * n, 1)

/** Every node of the first `depth` stages, in order down the tree, as outcome indices from the start. */
export function tuples(counts: number[], depth: number): number[][] {
  let out: number[][] = [[]]
  for (let k = 0; k < depth; k++) out = out.flatMap((t) => Array.from({ length: counts[k] }, (_, j) => [...t, j]))
  return out
}
export const idOf = (t: number[]) => t.join('-')

/** A stage's probability row for the node before it numbered `row`. */
export const rowOf = (st: Stage, row: number) => (st.same ? st.probs[0] : st.probs[row]) ?? []

/** A stage tidied, with `rows` probability rows (one while it's the same on every branch). */
function cleanStage(raw: any, rows: number, first: boolean): Stage {
  const outcomes = (Array.isArray(raw?.outcomes) ? raw.outcomes : []).slice(0, MAX_OUTCOMES).map(tidy)
  while (outcomes.length < MIN_OUTCOMES) outcomes.push('')
  const same = first || bool(raw?.same, true)
  const given: unknown[] = Array.isArray(raw?.probs) ? raw.probs : []
  const probs = Array.from({ length: same ? 1 : rows }, (_, r) => {
    const row: unknown[] = Array.isArray(given[r]) ? (given[r] as unknown[]) : []
    return outcomes.map((_: string, j: number) => tidy(row[j]))
  })
  return { title: tidy(raw?.title), outcomes, same, probs }
}

/** Tidy raw values (from a form, a link or a stored preset) into usable settings. */
export function cleanSettings(s: RawSettings): Settings {
  const d = DEFAULT_SETTINGS
  const given: unknown[] = Array.isArray(s.stages) && s.stages.length ? s.stages.slice(0, MAX_STAGES) : d.stages
  // Stages past the most paths are dropped, last first.
  const raws = [...given]
  const lengthOf = (r: any) => Math.min(MAX_OUTCOMES, Math.max(MIN_OUTCOMES, Array.isArray(r?.outcomes) ? r.outcomes.length : 0))
  while (raws.length > 1 && pathCount(raws.map(lengthOf)) > MAX_PATHS) raws.pop()
  const stages: Stage[] = []
  for (const raw of raws) stages.push(cleanStage(raw, pathCount(countsOf(stages)), !stages.length))

  const counts = countsOf(stages)
  const paths = pathCount(counts)
  const keys = new Set(labelKeys(counts))
  const blanks = Array.isArray(s.blanks) ? [...new Set(s.blanks.map(String))].filter((k) => keys.has(k)) : []
  return {
    stages,
    direction: paths > MAX_PATHS_DOWN ? 'right' : oneOf(DIRECTIONS, s.direction, d.direction),
    start: tidy(s.start),
    stageTitles: bool(s.stageTitles, d.stageTitles),
    pathStyle: oneOf(PATH_STYLES, s.pathStyle, d.pathStyle),
    showOutcomes: oneOf(SHOWS, s.showOutcomes, d.showOutcomes),
    showProbs: oneOf(SHOWS, s.showProbs, d.showProbs),
    showNames: oneOf(SHOWS, s.showNames, d.showNames),
    showPathProbs: oneOf(SHOWS, s.showPathProbs, d.showPathProbs),
    blanks,
    labelSize: cleanLabelSize(s.labelSize),
  }
}

/** Every label a tree of these stages can have, by key. */
export function labelKeys(counts: number[]): string[] {
  const nodes = counts.flatMap((_, k) => tuples(counts, k + 1).map(idOf))
  const leaves = tuples(counts, counts.length).map(idOf)
  return [...nodes.flatMap((id) => [`o${id}`, `p${id}`]), ...leaves.flatMap((id) => [`n${id}`, `q${id}`])]
}

// In the page address: each stage's outcomes (o1=H|T), its probabilities, one
// row, or rows split by ";" (p2=2/4|2/4;3/4|1/4), s2=0 when they differ by
// branch, and its title (t1=1st draw). They're left out when the stages are
// the default ones. Clicked blanks: blank=p0-1|q1-1.
export function settingsToQuery(s: Settings): string {
  const params = new URLSearchParams()
  for (const key of SCALARS) {
    const v = s[key]
    if (v === DEFAULT_SETTINGS[key]) continue
    params.set(key, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
  }
  if (JSON.stringify(s.stages) !== JSON.stringify(DEFAULT_SETTINGS.stages)) {
    s.stages.forEach((st, k) => {
      params.set(`o${k + 1}`, st.outcomes.join('|'))
      if (st.probs.some((r) => r.some(Boolean))) params.set(`p${k + 1}`, st.probs.map((r) => r.join('|')).join(';'))
      if (!st.same) params.set(`s${k + 1}`, '0')
      if (st.title) params.set(`t${k + 1}`, st.title)
    })
  }
  if (s.blanks.length) params.set('blank', s.blanks.join('|'))
  return params.toString()
}

export function settingsFromParams(params: URLSearchParams): Settings {
  const stages: RawSettings[] = []
  for (let k = 1; k <= MAX_STAGES && params.has(`o${k}`); k++) {
    stages.push({
      outcomes: params.get(`o${k}`)!.split('|'),
      probs: (params.get(`p${k}`) ?? '').split(';').map((r) => r.split('|')),
      same: params.get(`s${k}`) !== '0',
      title: params.get(`t${k}`) ?? '',
    })
  }
  const s: RawSettings = { stages: stages.length ? stages : undefined, blanks: params.get('blank')?.split('|').filter(Boolean) }
  for (const key of SCALARS) if (params.has(key)) s[key] = params.get(key)
  return cleanSettings(s)
}

// ——— Changing the tree ———
// Adding or removing an outcome moves the nodes after it, so the rows of the
// later stages that differ by branch, and the clicked blanks, move with them.

/** The stages rebuilt for new counts: `from` maps a node of the new tree to the old one it was, or null for a new one. */
function remap(s: Settings, stages: Stage[], from: (t: number[]) => number[] | null): Pick<Settings, 'stages' | 'blanks'> {
  const oldCounts = countsOf(s.stages)
  const counts = countsOf(stages)
  const oldRow = (t: number[]) => {
    const old = from(t)
    return old === null ? -1 : tuples(oldCounts, t.length).findIndex((o) => idOf(o) === idOf(old))
  }
  const next = stages.map((st, k) => {
    if (st.same) return st
    const rows = tuples(counts, k).map((t) => {
      const r = oldRow(t)
      return r < 0 ? st.outcomes.map(() => '') : st.probs[r] ?? st.outcomes.map(() => '')
    })
    return { ...st, probs: rows }
  })
  // Each blank goes to the label of the node that was it.
  const back = new Map<string, string>()
  for (let depth = 1; depth <= counts.length; depth++) {
    for (const t of tuples(counts, depth)) {
      const old = from(t)
      if (old) back.set(idOf(old), idOf(t))
    }
  }
  const leaf = (id: string) => id.split('-').length === counts.length
  const blanks = s.blanks.flatMap((key) => {
    const id = back.get(key.slice(1))
    return id === undefined || ('nq'.includes(key[0]) && !leaf(id)) ? [] : [key[0] + id]
  })
  return { stages: next, blanks }
}

/** One more outcome at the end of stage `k`. */
export function addOutcome(s: Settings, k: number): Pick<Settings, 'stages' | 'blanks'> {
  const n = s.stages[k].outcomes.length
  const stages = s.stages.map((st, i) =>
    i === k ? { ...st, outcomes: [...st.outcomes, ''], probs: st.probs.map((r) => [...r, '']) } : st,
  )
  return remap(s, stages, (t) => (t.length > k && t[k] === n ? null : t))
}

/** Stage `k` without its outcome `j`. */
export function removeOutcome(s: Settings, k: number, j: number): Pick<Settings, 'stages' | 'blanks'> {
  const stages = s.stages.map((st, i) =>
    i === k ? { ...st, outcomes: st.outcomes.filter((_, x) => x !== j), probs: st.probs.map((r) => r.filter((_, x) => x !== j)) } : st,
  )
  return remap(s, stages, (t) => (t.length > k ? t.map((v, i) => (i === k && v >= j ? v + 1 : v)) : t))
}

/** A new last stage, with two outcomes to name. */
export function addStage(s: Settings): Pick<Settings, 'stages' | 'blanks'> {
  return { stages: [...s.stages, { title: '', outcomes: ['', ''], same: true, probs: [['', '']] }], blanks: s.blanks.filter((k) => !'nq'.includes(k[0])) }
}

/** The tree without its last stage. */
export function removeStage(s: Settings): Pick<Settings, 'stages' | 'blanks'> {
  const depth = s.stages.length - 1
  return { stages: s.stages.slice(0, -1), blanks: s.blanks.filter((k) => !'nq'.includes(k[0]) && k.slice(1).split('-').length <= depth) }
}

/** Stage `k` the same on every branch, from its first row, or one row per node before it, each a copy of that row. */
export function setSame(s: Settings, k: number, same: boolean): Stage[] {
  return s.stages.map((st, i) => {
    if (i !== k || st.same === same) return st
    const rows = pathCount(countsOf(s.stages.slice(0, k)))
    return { ...st, same, probs: same ? [st.probs[0]] : Array.from({ length: rows }, () => [...st.probs[0]]) }
  })
}

// ——— Reading the tree ———

/** A probability as read: a fraction (n/d, a whole number too), a decimal or percent, or something else (a letter, written as typed). */
export type Read = { kind: 'fraction'; n: number; d: number } | { kind: 'decimal'; v: number } | { kind: 'letter' } | { kind: 'empty' }

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))

export function readProb(typed: string): Read {
  const t = typed.trim().replace(/\s+/g, '')
  if (!t) return { kind: 'empty' }
  let m = /^(\d+)\/(\d+)$/.exec(t)
  if (m && Number(m[2]) > 0) return { kind: 'fraction', n: Number(m[1]), d: Number(m[2]) }
  if (/^\d+$/.test(t)) return { kind: 'fraction', n: Number(t), d: 1 }
  if (/^(\d+\.?\d*|\.\d+)$/.test(t)) return { kind: 'decimal', v: Number(t) }
  m = /^(\d+\.?\d*|\.\d+)%$/.exec(t)
  if (m) return { kind: 'decimal', v: Number(m[1]) / 100 }
  return { kind: 'letter' }
}
const valueOf = (r: Read) => (r.kind === 'fraction' ? r.n / r.d : r.kind === 'decimal' ? r.v : null)

/** A number written the way a person would, without float noise: 0.15, not 0.15000000000000002. */
export const decimal = (v: number) => String(Number(v.toPrecision(10)))

/** A value as the figure writes it: plain text, or a fraction (n/d) to stack. */
export type Written = { text: string; fraction: boolean }

/** The product of some probabilities: in lowest terms when all are fractions, else a decimal; null if any isn't a number. */
export function product(reads: Read[]): Written | null {
  if (reads.some((r) => r.kind === 'empty' || r.kind === 'letter')) return null
  if (reads.every((r) => r.kind === 'fraction')) {
    let n = 1
    let d = 1
    for (const r of reads as { n: number; d: number }[]) {
      n *= r.n
      d *= r.d
      const g = gcd(n, d) || 1
      n /= g
      d /= g
    }
    return d === 1 ? { text: String(n), fraction: false } : { text: `${n}/${d}`, fraction: true }
  }
  return { text: decimal(reads.reduce((a, r) => a * valueOf(r)!, 1)), fraction: false }
}

/** A node: where it is, its outcome and the probability on the branch to it. */
export type TreeNode = { id: string; t: number[]; stage: number; outcome: string; prob: string; read: Read }
/** A path: its leaf, name and probability (null when it can't be worked out). */
export type TreePath = { id: string; t: number[]; outcomes: string[]; name: string; nameBlank: boolean; prob: Written | null }

/** A path's name from its outcomes. */
export const pathName = (outcomes: string[], style: PathStyle) => outcomes.join(style === 'comma' ? ', ' : '')

/**
 * What the tree means: each node, by stage; each path with its name and
 * probability; and the problems the teacher should know about, such as
 * branches from a node that don't add up to 1.
 */
export function readTree(s: Settings) {
  const counts = countsOf(s.stages)
  const nodes: TreeNode[][] = s.stages.map((st, k) =>
    tuples(counts, k + 1).map((t, i) => {
      const row = Math.floor(i / counts[k])
      const prob = rowOf(st, row)[t[k]] ?? ''
      return { id: idOf(t), t, stage: k, outcome: st.outcomes[t[k]].trim(), prob: prob.trim(), read: readProb(prob) }
    }),
  )
  const byId = new Map(nodes.flat().map((n) => [n.id, n]))
  const along = (t: number[]) => t.map((_, k) => byId.get(idOf(t.slice(0, k + 1)))!)

  const paths: TreePath[] = nodes[nodes.length - 1].map((leaf) => {
    const route = along(leaf.t)
    const outcomes = route.map((n) => n.outcome)
    return {
      id: leaf.id,
      t: leaf.t,
      outcomes,
      name: pathName(outcomes, s.pathStyle),
      nameBlank: outcomes.some((o) => !o),
      prob: product(route.map((n) => n.read)),
    }
  })

  // The branches from each node (the start too), all numbers, should add up to 1.
  let sums: string | null = null
  let sumCount = 0
  let overOne = false
  for (let k = 0; k < s.stages.length; k++) {
    tuples(counts, k).forEach((parent, row) => {
      const reads = rowOf(s.stages[k], row).map(readProb)
      if (reads.some((r) => (valueOf(r) ?? 0) > 1)) overOne = true
      if (s.stages[k].same && row > 0) return
      if (reads.some((r) => valueOf(r) === null)) return
      const fractions = reads.every((r) => r.kind === 'fraction')
      const total = fractions
        ? reads.reduce((acc, r) => {
            const f = r as { n: number; d: number }
            const n = acc.n * f.d + f.n * acc.d
            const d = acc.d * f.d
            const g = gcd(n, d) || 1
            return { n: n / g, d: d / g }
          }, { n: 0, d: 1 })
        : null
      const sum = total ? total.n / total.d : reads.reduce((a, r) => a + valueOf(r)!, 0)
      if (Math.abs(sum - 1) < 1e-9) return
      sumCount++
      if (sums) return
      const from = !parent.length ? 'the start' : s.stages[k].same ? 'each node' : pathName(along(parent).map((n) => n.outcome || '?'), 'comma')
      const said = total ? (total.d === 1 ? String(total.n) : `${total.n}/${total.d}`) : decimal(sum)
      sums = `The branches from ${from} add up to ${said}, not 1.`
    })
  }
  if (sums && sumCount > 1) sums = `${sums} ${sumCount - 1 === 1 ? 'One other node’s don’t' : `${sumCount - 1} other nodes’ don’t`} either.`
  return {
    counts,
    nodes,
    paths,
    problems: {
      sums,
      overOne: overOne ? 'A probability can’t be more than 1.' : null,
    },
  }
}
