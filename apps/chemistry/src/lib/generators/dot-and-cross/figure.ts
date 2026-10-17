// Everything a dot-and-cross figure draws, worked out from its settings: a
// molecule's overlapping circles, or each ion in its square brackets with
// its charge (every ion, or one of each with its number in front), or one
// atom or ion on its own; the electrons on them as marks; and the words for
// screen readers and the answer key.

import { textWidth as arialWidth } from '../lewis-structures/drawing'
import { drawMolecule, reachOf } from './covalent'
import { chargeText, ionName, type Compound, type Ion } from './ionic'
import { MARK_NAMES, markCount, markOf } from './marks'
import type { Atom, Read } from './read'
import { MARK, brackets as bracketsAround, ionRadii, ringMarks, textWidth, type Mark } from './shells'
import { allShells, layoutOf, readOnce, type ChargeMode, type DotCrossSettings } from './settings'

export interface Circle {
  x: number
  y: number
  r: number
}

export interface Label {
  x: number
  y: number
  text: string
}

export interface BracketBox {
  /** the ion's middle */
  x: number
  y: number
  half: number
  /** where its charge goes: written, or a blank box for students */
  charge?: Label & { blank: boolean }
}

export interface DotCrossFigure {
  read: Read
  /** whether every shell is drawn */
  allShells: boolean
  /** how an ionic compound's ions are laid out */
  layout: 'every' | 'numbered'
  width: number
  height: number
  circles: Circle[]
  symbols: Label[]
  marks: Mark[]
  brackets: BracketBox[]
  /** the number in front of an ion, in the numbered layout */
  counts: Label[]
  /** the figure for screen readers */
  label: string
  /** the answer key's lines */
  answer: string[]
}

export const COUNT_FONT = 30
const COUNT_GAP = 3
const ION_GAP = 18
/** The box left for a charge, for students to write it in. */
export const BLANK_CHARGE = 22
/** Text sizes as FigureFrame draws them. */
const TITLE_FONT = 22
const KEY_FONT = 18

/** A drawing of some ions or one molecule, its own (0, 0) in its middle,
 *  and how far it reaches each way. */
interface Part {
  circles: Circle[]
  symbols: Label[]
  marks: Mark[]
  brackets: BracketBox[]
  counts: Label[]
  left: number
  right: number
  top: number
  bottom: number
}

const emptyPart = (): Part => ({ circles: [], symbols: [], marks: [], brackets: [], counts: [], left: 0, right: 0, top: 0, bottom: 0 })

/** One atom or ion around (0, 0): its rings, outermost only unless `all`,
 *  each with its electrons, `owners` giving a shell's marks in the order
 *  they fill it; an ion in brackets, with `count` in front when it's more
 *  than 1. */
function ionPart(symbol: string, shells: number[], owners: (shell: number, count: number) => number[], all: boolean, charge: number, charges: ChargeMode, count = 1): Part {
  const p = emptyPart()
  const radii = ionRadii(shells.length, all)
  const first = all ? 0 : shells.length - 1
  radii.forEach((r, k) => {
    const shell = first + k
    p.circles.push({ x: 0, y: 0, r })
    p.marks.push(...ringMarks(0, 0, r, shell, owners(shell, shells[shell])))
  })
  p.symbols.push({ x: 0, y: 0, text: symbol })
  const outer = radii.at(-1)!
  const reach = outer + MARK + 1
  Object.assign(p, { left: reach, right: reach, top: reach, bottom: reach })
  if (charge) {
    const b = bracketsAround(outer)
    const box: BracketBox = { x: 0, y: 0, half: b.half }
    if (charges !== 'none') box.charge = { ...b.charge, text: chargeText(charge), blank: charges === 'blank' }
    p.brackets.push(box)
    Object.assign(p, { left: b.left, right: b.right, top: b.top, bottom: b.bottom })
  }
  if (count > 1) {
    p.counts.push({ x: -p.left - COUNT_GAP, y: 0, text: String(count) })
    p.left += COUNT_GAP + textWidth(String(count), COUNT_FONT)
  }
  return p
}

/** An ion of a compound: the metal's electrons are all its own, the
 *  non-metal's own and the ones it gained from the metal. */
function compoundIon(ion: Ion, ownOwner: number, gainedOwner: number, all: boolean, charges: ChargeMode, count = 1) {
  const last = ion.shells.length - 1
  const gained = Math.max(0, -ion.charge)
  return ionPart(
    ion.symbol,
    ion.shells,
    (shell, n) => (shell === last && gained ? [...Array(n - gained).fill(ownOwner), ...Array(gained).fill(gainedOwner)] : Array(n).fill(ownOwner)),
    all,
    ion.charge,
    charges,
    count,
  )
}

/** Owners: a compound's metal gets crosses and its non-metal dots; an atom
 *  on its own gets dots, and an anion's gained electrons crosses. */
const METAL = 1
const NON_METAL = 0

function atomPart(a: Atom, all: boolean, charges: ChargeMode) {
  return compoundIon({ symbol: a.symbol, charge: a.charge, count: 1, shells: a.shells, atomShells: a.atomShells }, 0, 1, all, charges)
}

/** Parts placed with their middles at the given points, as one part. */
function combine(placed: { part: Part; x: number; y: number }[]): Part {
  const out = emptyPart()
  let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity]
  for (const { part, x, y } of placed) {
    const move = <T extends { x: number; y: number }>(t: T): T => ({ ...t, x: t.x + x, y: t.y + y })
    out.circles.push(...part.circles.map(move))
    out.symbols.push(...part.symbols.map(move))
    out.marks.push(...part.marks.map(move))
    out.counts.push(...part.counts.map(move))
    out.brackets.push(...part.brackets.map((b) => ({ ...move(b), ...(b.charge ? { charge: move(b.charge) } : {}) })))
    minX = Math.min(minX, x - part.left)
    maxX = Math.max(maxX, x + part.right)
    minY = Math.min(minY, y - part.top)
    maxY = Math.max(maxY, y + part.bottom)
  }
  return { ...out, left: -minX, right: maxX, top: -minY, bottom: maxY }
}

/** Parts side by side, middles on one line, ION_GAP between them. */
function row(parts: Part[]): { part: Part; x: number; y: number }[] {
  let x = 0
  return parts.map((part, i) => {
    if (i) x += part.left
    const at = { part, x, y: 0 }
    x += part.right + ION_GAP
    return at
  })
}

/** A part with its electrons turned: mirrored left to right, or a quarter
 *  turn clockwise. An anion's last places to fill are on its left, so this
 *  turns its gained electrons to face the metal ion beside it or above it. */
const turned = (p: Part, how: 'mirror' | 'up'): Part => ({
  ...p,
  marks: p.marks.map((m) => (how === 'mirror' ? { ...m, x: -m.x } : { ...m, x: -m.y, y: m.x })),
})

/** Every ion of a compound, the cation in the middle of a 1:2 compound
 *  (Cl⁻ Mg²⁺ Cl⁻) and the anion in the middle of a 2:1 one; with three of
 *  one kind around one of the other, the third goes below the middle; and
 *  2:3 or 3:2 alternate, the more numerous at both ends. An anion's gained
 *  electrons face a metal ion beside it. */
function everyIon(c: Compound, all: boolean, charges: ChargeMode): Part {
  const m = compoundIon(c.metal, METAL, METAL, all, charges)
  const x = compoundIon(c.nonMetal, NON_METAL, METAL, all, charges)
  const anionsMore = c.nonMetal.count > c.metal.count
  const [few, many] = anionsMore ? [m, x] : [x, m]
  // the first of a row of the more numerous ion, on the left of a metal ion
  const first = anionsMore ? turned(x, 'mirror') : m
  const fewCount = Math.min(c.metal.count, c.nonMetal.count)
  const manyCount = Math.max(c.metal.count, c.nonMetal.count)
  if (manyCount === 1) return combine(row([m, x]))
  if (fewCount === 1 && manyCount === 2) return combine(row([first, few, many]))
  if (fewCount === 1) {
    const top = row([first, few, many])
    const below = anionsMore ? turned(x, 'up') : m
    const at = { part: below, x: top[1].x, y: Math.max(...top.map((t) => t.part.bottom)) + ION_GAP + below.top }
    return combine([...top, at])
  }
  const parts: Part[] = []
  for (let i = 0; i < fewCount + manyCount; i++) parts.push(i % 2 ? few : i ? many : first)
  return combine(row(parts))
}

/** One of each ion, metal first, each with its number in front. */
function numbered(c: Compound, all: boolean, charges: ChargeMode): Part {
  return combine(
    row([compoundIon(c.metal, METAL, METAL, all, charges, c.metal.count), compoundIon(c.nonMetal, NON_METAL, METAL, all, charges, c.nonMetal.count)]),
  )
}

function moleculePart(read: Extract<Read, { ok: true }>, all: boolean): Part {
  if (read.species.kind !== 'covalent') return emptyPart()
  const d = drawMolecule(read.species.molecule, all)
  return {
    ...emptyPart(),
    circles: [...d.atoms.map((a) => ({ x: a.x, y: a.y, r: a.r })), ...d.rings],
    symbols: d.atoms.map((a) => ({ ...a.label, text: a.symbol })),
    marks: d.marks,
    left: Math.max(...d.atoms.map((a) => reachOf(a) - a.x)),
    right: Math.max(...d.atoms.map((a) => a.x + reachOf(a))),
    top: Math.max(...d.atoms.map((a) => reachOf(a) - a.y)),
    bottom: Math.max(...d.atoms.map((a) => a.y + reachOf(a))),
  }
}

/** The whole figure for these settings. Its drawing is at least as wide as
 *  the chart title and answer key lines, so they always fit. */
export function buildFigure(s: DotCrossSettings): DotCrossFigure {
  const read = readOnce(s.formula, s.which)
  const all = allShells(s, read)
  const layout = layoutOf(s, read)
  let part = emptyPart()
  if (read.ok) {
    const { species } = read
    if (species.kind === 'atom') part = combine([{ part: atomPart(species.atom, all, s.charges), x: 0, y: 0 }])
    else if (species.kind === 'ionic') part = layout === 'numbered' ? numbered(species.compound, all, s.charges) : everyIon(species.compound, all, s.charges)
    else part = moleculePart(read, all)
  }
  const answer = s.answerKey ? answerLines(read) : []
  const drawnW = part.left + part.right
  const textW = Math.max(
    s.titleMode === 'text' && s.title ? arialWidth(s.title, TITLE_FONT) * 1.08 : 0,
    ...answer.map((line) => arialWidth(line, KEY_FONT)),
  )
  const width = Math.ceil(Math.max(drawnW, textW, read.ok ? 0 : 240))
  const height = Math.ceil(read.ok ? part.top + part.bottom : 120)
  const dx = part.left + (width - drawnW) / 2
  const dy = part.top
  const move = <T extends { x: number; y: number }>(t: T): T => ({ ...t, x: round2(t.x + dx), y: round2(t.y + dy) })
  return {
    read,
    allShells: all,
    layout,
    width,
    height,
    circles: part.circles.map(move),
    symbols: part.symbols.map(move),
    marks: s.blank ? [] : part.marks.map(move),
    brackets: part.brackets.map((b) => ({ ...move(b), ...(b.charge ? { charge: move(b.charge) } : {}) })),
    counts: part.counts.map(move),
    label: describe(s, read, all, layout),
    answer,
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

// ---- Words ------------------------------------------------------------------

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const ORDER_WORDS = ['', 'single', 'double', 'triple']
const ORDER_SIGNS = ['', '–', '=', '≡']
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six']
const words = (n: number) => NUMBER_WORDS[n] ?? String(n)

/** Who each owner's electrons belong to in a molecule: "O", or "one C" and
 *  "the other C" where two of an element bond to each other. */
function ownerNames(read: Extract<Read, { ok: true }>) {
  if (read.species.kind !== 'covalent') return []
  const { structure, owners } = read.species.molecule
  const names: string[] = []
  const seen = new Set<string>()
  owners.forEach((o, i) => {
    if (names[o] !== undefined) return
    const el = structure.atoms[i].element
    const split = new Set(owners.filter((_, j) => structure.atoms[j].element === el)).size > 1
    names[o] = split ? (seen.has(el) ? `the other ${el}` : `one ${el}`) : el
    seen.add(el)
  })
  return names
}

/** "O’s electrons are dots and H’s crosses". */
function marksSentence(read: Extract<Read, { ok: true }>, swap: boolean) {
  const names = ownerNames(read)
  const parts = names.map((who, o) => `${who}’s ${o === 0 ? 'electrons are ' : ''}${MARK_NAMES[markOf(o, swap)][1]}`)
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

function describeMolecule(read: Extract<Read, { ok: true }>, s: DotCrossSettings, all: boolean) {
  if (read.species.kind !== 'covalent') return ''
  const st = read.species.molecule.structure
  const what = `A dot-and-cross diagram of ${read.name}${all ? ' with every shell drawn' : ''}`
  const counts = new Map<string, number>()
  for (const a of st.atoms) counts.set(a.element, (counts.get(a.element) ?? 0) + 1)
  const atoms = [...counts].map(([el, n]) => (n > 1 ? `${n} ${el} atoms` : `one ${el} atom`)).join(' and ')
  if (s.blank) return `${what}: the circles of ${atoms} overlapping where they bond, with no electrons drawn`
  const bonds = new Map<string, number>()
  for (const b of st.bonds) {
    const key = `${st.atoms[b.a].element}${ORDER_SIGNS[b.order]}${st.atoms[b.b].element} ${ORDER_WORDS[b.order]}`
    bonds.set(key, (bonds.get(key) ?? 0) + 1)
  }
  const bondWords = [...bonds].map(([key, n]) => {
    const [sym, order] = key.split(' ')
    const pairs = ORDER_WORDS.indexOf(order)
    return `${words(n)} ${sym} ${order} bond${n > 1 ? 's' : ''}, ${n > 1 ? 'each ' : ''}${plural(pairs, 'shared pair')} in the overlap`
  })
  const lone = new Map<string, number>()
  st.atoms.forEach((a) => a.lone >= 2 && lone.set(a.element, Math.max(lone.get(a.element) ?? 0, Math.floor(a.lone / 2))))
  const loneWords = [...lone].map(([el, n]) => `${(counts.get(el) ?? 0) > 1 ? 'each ' : ''}${el} has ${plural(n, 'lone pair')}`)
  return `${what}: ${bondWords.join('; ')}${loneWords.length ? `; ${loneWords.join(', ')}` : ''}. ${capital(marksSentence(read, s.swap))}`
}

const chargeWords = (charges: ChargeMode) =>
  charges === 'show' ? 'in square brackets with its charge' : charges === 'blank' ? 'in square brackets with a blank for its charge' : 'in square brackets'

/** An ion as read: "Cl⁻ (2, 8, 8)", and its outer shell's marks. */
function ionWords(ion: Ion, ownOwner: number, gainedOwner: number, swap: boolean, all: boolean) {
  const outer = ion.shells.at(-1)!
  const gained = Math.max(0, -ion.charge)
  const marks = gained
    ? `${markCount(markOf(ownOwner, swap), outer - gained)} and ${markCount(markOf(gainedOwner, swap), gained)}`
    : markCount(markOf(ownOwner, swap), outer)
  return { name: `${ionName(ion.symbol, ion.charge)}${all ? ` (${ion.shells.join(', ')})` : ''}`, marks: `${marks} on its outer shell` }
}

function describeCompound(c: Compound, s: DotCrossSettings, all: boolean, layout: 'every' | 'numbered') {
  const what = `A dot-and-cross diagram of ${c.name}${all ? ' with every shell drawn' : ''}`
  const one = (ion: Ion, ownOwner: number) => {
    const w = ionWords(ion, ownOwner, METAL, s.swap, all)
    const marks = s.blank ? '' : ` with ${w.marks}`
    if (layout === 'numbered') return `${ion.count > 1 ? `${ion.count} in front of ` : ''}one ${w.name} ion${marks}`
    return ion.count > 1 ? `${words(ion.count)} ${w.name} ions${marks ? `, each${marks}` : ''}` : `one ${w.name} ion${marks}`
  }
  return `${what}: ${one(c.metal, METAL)}; ${one(c.nonMetal, NON_METAL)}; each ion ${chargeWords(s.charges)}${s.blank ? ', with no electrons drawn' : ''}`
}

function describeAtom(a: Atom, s: DotCrossSettings, all: boolean) {
  const name = ionName(a.symbol, a.charge)
  const what = `A dot-and-cross diagram of ${a.charge ? `the ${name} ion, ${chargeWords(s.charges)}` : `${a.element.match(/^[aeiou]/) ? 'an' : 'a'} ${a.element} atom, ${a.symbol}`}`
  const shown = all ? a.shells : [a.shells.at(-1)!]
  const rings = all ? `${a.shells.join(', ')} electrons on ${plural(a.shells.length, 'shell')}` : `${plural(shown[0], 'electron')} on its outer shell`
  if (s.blank) return `${what}: ${plural(shown.length, 'ring')} with no electrons drawn`
  const gained = Math.max(0, -a.charge)
  const own = MARK_NAMES[markOf(0, s.swap)][1]
  const theirs = MARK_NAMES[markOf(1, s.swap)]
  const marks = gained
    ? `, as ${own}, except the ${gained === 1 ? `gained electron, a ${theirs[0]}` : `${gained} gained electrons, ${theirs[1]}`}`
    : `, as ${own}`
  return `${what}: ${rings}${marks}`
}

function describe(s: DotCrossSettings, read: Read, all: boolean, layout: 'every' | 'numbered') {
  if (!read.ok) return 'No dot-and-cross diagram'
  const { species } = read
  const base =
    species.kind === 'atom'
      ? describeAtom(species.atom, s, all)
      : species.kind === 'ionic'
        ? describeCompound(species.compound, s, all, layout)
        : describeMolecule(read, s, all)
  const answer = s.answerKey ? answerLines(read) : []
  return base + (answer.length ? `. Answer key: ${answer.join('; ')}` : '')
}

// ---- The answer key -----------------------------------------------------------

/** Each kind of atom's bonding and lone pairs in a molecule: "O: 2 bonding
 *  pairs, 2 lone pairs", "Each H: 1 bonding pair, no lone pairs". */
function moleculeAnswer(read: Extract<Read, { ok: true }>): string[] {
  if (read.species.kind !== 'covalent') return []
  const { structure: st, owners } = read.species.molecule
  const groups = new Map<string, { element: string; atoms: number; bonding: number; lone: number; single: number }>()
  // central atom first, as the marks go
  const order = st.atoms.map((_, i) => i).sort((i, j) => owners[i] - owners[j] || i - j)
  order.forEach((i) => {
    const a = st.atoms[i]
    const bonding = st.bonds.reduce((n, b) => n + (b.a === i || b.b === i ? b.order : 0), 0)
    const key = `${a.element} ${bonding} ${a.lone}`
    const g = groups.get(key) ?? { element: a.element, atoms: 0, bonding, lone: Math.floor(a.lone / 2), single: a.lone % 2 }
    g.atoms++
    groups.set(key, g)
  })
  const total = (el: string) => st.atoms.filter((a) => a.element === el).length
  return [...groups.values()].map((g) => {
    const who = g.atoms === total(g.element) ? (g.atoms === 1 ? g.element : `Each ${g.element}`) : g.atoms === 1 ? `One ${g.element}` : `${g.atoms} of the ${g.element} atoms each`
    const lone = g.lone ? plural(g.lone, 'lone pair') : 'no lone pairs'
    return `${who}: ${plural(g.bonding, 'bonding pair')}, ${lone}${g.single ? ', 1 unpaired electron' : ''}`
  })
}

const arrangement = (ion: { symbol: string; charge: number; shells: number[] }) => `${ionName(ion.symbol, ion.charge)} ${ion.shells.join(',')}`

/** Who loses and gains how many electrons, and each ion's arrangement:
 *  "Mg loses 2 electrons, one to each Cl." and "Mg²⁺ 2,8; Cl⁻ 2,8,8". */
function compoundAnswer(c: Compound): string[] {
  const { metal: m, nonMetal: x } = c
  const lost = plural(m.charge, 'electron')
  let transfer: string
  if (m.count === 1 && x.count === 1) transfer = `${m.symbol} loses ${lost} to ${x.symbol}.`
  else if (m.count === 1) transfer = `${m.symbol} loses ${lost}, ${words(m.charge / x.count)} to each ${x.symbol}.`
  else if (x.count === 1) transfer = `Each ${m.symbol} loses ${lost} to ${x.symbol}, which gains ${-x.charge}.`
  else transfer = `Each ${m.symbol} loses ${lost} and each ${x.symbol} gains ${-x.charge}.`
  return [transfer, `${arrangement(m)}; ${arrangement(x)}`]
}

function atomAnswer(a: Atom): string[] {
  const line = `${ionName(a.symbol, a.charge)}: ${a.shells.join(',')}`
  if (!a.charge) return [line]
  return [`${line} (${a.symbol} ${a.charge > 0 ? 'loses' : 'gains'} ${plural(Math.abs(a.charge), 'electron')})`]
}

/** The answer key's lines for what's drawn. */
export function answerLines(read: Read): string[] {
  if (!read.ok) return []
  const { species } = read
  if (species.kind === 'atom') return atomAnswer(species.atom)
  if (species.kind === 'ionic') return compoundAnswer(species.compound)
  return moleculeAnswer(read)
}
