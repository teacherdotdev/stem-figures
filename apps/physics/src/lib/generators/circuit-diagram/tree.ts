// A circuit as a series/parallel tree (docs/adr/0004): the loop is a list of
// parts and groups in order round it; a parallel group holds branches, and a
// branch is a part or a series group. Parts name themselves (R₁, R₂, ε) until
// the teacher types a name.
//
// Quick setup still builds a tree from flat settings (circuit.ts); Build a
// circuit edits the tree directly, including nested groups. Its compact
// address string keeps custom diagrams shareable.
//
// As one setting, the whole tree is a short string:
//
//   b.r.[r.(r.l)]    a battery, then R₁, then R₂ in parallel with R₃ and a bulb
//
// b r l d e s a are a battery, resistor, bulb (lamp), LED, diode, switch and ammeter; "." joins
// items; ( ) is a series group and [ ] a parallel one. After a part come its
// flags (o an open switch, 2 a battery of two cells, f a battery turned round),
// then after any item its extras, each a letter and a quoted label: n its name,
// v its value, m a voltmeter across it, i or j a current arrow (forward or
// backward), @ a point in the gap after it. "!" then extras belong to the loop.

import { cleanLabel, decodeLabel, encodeLabel, type Label, type LabelMode } from '$lib/shared/label'
import type { Field } from '$lib/shared/settings'

export type PartKind = 'battery' | 'resistor' | 'bulb' | 'led' | 'diode' | 'switch' | 'ammeter'
export const PART_KINDS: readonly PartKind[] = ['battery', 'resistor', 'bulb', 'led', 'diode', 'switch', 'ammeter']

export const cleanCells = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? Math.min(10, Math.max(1, Math.round(value))) : 1

export const MAX_PARTS = 8
/** How deep groups can nest: a parallel group in the loop is 1 deep. */
export const MAX_DEPTH = 3

/** A current arrow on a branch, forward or backward along the tree's order. */
export interface Arrow {
  dir: 'forward' | 'backward'
  label: Label
}

interface ItemBase {
  /** A voltmeter across this item, and its label. */
  voltmeter: Label | null
  /** A current arrow, when this item is a branch of a parallel group. */
  current: Arrow | null
  /** A point in the gap after this item, when it sits in a series run. */
  point: Label | null
}

export interface Part extends ItemBase {
  type: 'part'
  kind: PartKind
  name: Label
  /** Named automatically (R₁, R₂…) until the teacher types a name. */
  auto: boolean
  value: Label
  /** A switch: open or closed. */
  open: boolean
  /** A battery: one cell or a battery of two, and whether it's turned round. */
  cells: number
  flip: boolean
}

export interface Group extends ItemBase {
  type: 'series' | 'parallel'
  items: Item[]
}

export type Item = Part | Group

export interface Circuit {
  /** The loop, in order round it. The last item's point is in the gap back to the first. */
  items: Item[]
  /** A current arrow on the main loop. */
  current: Arrow | null
}

// Each kind's letter in an address, its automatic name, and its labels as they start.
const LETTER: Record<PartKind, string> = { battery: 'b', resistor: 'r', bulb: 'l', led: 'd', diode: 'e', switch: 's', ammeter: 'a' }
const KIND_OF = new Map(Object.entries(LETTER).map(([kind, letter]) => [letter, kind as PartKind]))
const PREFIX: Record<PartKind, string> = { battery: 'epsilon', resistor: 'R', bulb: 'L', led: 'D', diode: 'D', switch: 'S', ammeter: 'A' }
const NAME_MODE: Record<PartKind, LabelMode> = { battery: 'text', resistor: 'text', bulb: 'text', led: 'text', diode: 'text', switch: 'text', ammeter: 'none' }
const VALUE_TEXT: Record<PartKind, string> = { battery: '12 V', resistor: '4 Omega', bulb: '', led: '', diode: '', switch: '', ammeter: '0.5 A' }

export const defaultValue = (kind: PartKind): Label => ({ mode: 'none', text: VALUE_TEXT[kind] })
export const DEFAULT_VOLTMETER: Label = { mode: 'none', text: 'V' }
export const DEFAULT_CURRENT: Label = { mode: 'text', text: 'I' }
export const DEFAULT_POINT: Label = { mode: 'text', text: 'A' }

export function newPart(kind: PartKind = 'resistor'): Part {
  return {
    type: 'part',
    kind,
    // Named by renumber once it's in a circuit.
    name: { mode: NAME_MODE[kind], text: '' },
    auto: true,
    value: defaultValue(kind),
    open: false,
    cells: 1,
    flip: false,
    voltmeter: null,
    current: null,
    point: null,
  }
}

export const newGroup = (type: Group['type'], items: Item[]): Group => ({ type, items, voltmeter: null, current: null, point: null })

/** A battery, then R₁ in series, then R₂ in parallel with R₃. */
export const DEFAULT_CIRCUIT: Circuit = renumber({
  items: [newPart('battery'), newPart('resistor'), newGroup('parallel', [newPart('resistor'), newPart('resistor')])],
  current: null,
})

/** Every part, in reading order (the tree's order). */
export function* partsOf(items: Item[]): Generator<Part> {
  for (const item of items) {
    if (item.type === 'part') yield item
    else yield* partsOf(item.items)
  }
}

/** How deep an item's groups go: 0 for a part, 1 for a group of parts. */
export const depthOf = (item: Item): number => (item.type === 'part' ? 0 : 1 + Math.max(0, ...item.items.map(depthOf)))

// Automatic names.

/** Each automatically named part's name, in reading order: R₁, R₂… or plain R
 *  when it's the only one. Parts the teacher named are left out of the count. */
export function autoNames(circuit: Circuit): Map<Part, string> {
  const parts = [...partsOf(circuit.items)].filter((p) => p.auto)
  const total = new Map<PartKind, number>()
  for (const p of parts) total.set(p.kind, (total.get(p.kind) ?? 0) + 1)
  const seen = new Map<PartKind, number>()
  const names = new Map<Part, string>()
  for (const p of parts) {
    const n = (seen.get(p.kind) ?? 0) + 1
    seen.set(p.kind, n)
    names.set(p, total.get(p.kind)! > 1 ? `${PREFIX[p.kind]}_${n < 10 ? n : `{${n}}`}` : PREFIX[p.kind])
  }
  return names
}

/** Parts still named automatically whose name the teacher has since typed over
 *  stop being automatic. (A part not yet named has no name to type over.) */
export function settle(circuit: Circuit): Circuit {
  const names = autoNames(circuit)
  for (const [p, name] of names) if (p.auto && p.name.text && p.name.text !== name) p.auto = false
  return circuit
}

/** Give every automatically named part its name. */
export function renumber(circuit: Circuit): Circuit {
  for (const [p, name] of autoNames(circuit)) if (p.auto) p.name.text = name
  return circuit
}

// Tidying.

/**
 * Tidy a tree in place: a group inside a group of its own kind joins it, a
 * one-item group gives way to its item, empty groups go, and extras only stay
 * where they mean something (points in series runs, current arrows on
 * branches). Groups deeper than MAX_DEPTH and parts past MAX_PARTS are cut.
 */
export function tidy(circuit: Circuit): Circuit {
  let budget = MAX_PARTS
  const cut = (items: Item[], depth: number): Item[] =>
    items.flatMap((item): Item[] => {
      if (item.type === 'part') return budget-- > 0 ? [item] : []
      if (depth > MAX_DEPTH) {
        // Too deep: keep just its first part.
        const first = partsOf(item.items).next().value
        return first && budget-- > 0 ? [{ ...first, voltmeter: first.voltmeter ?? item.voltmeter, current: item.current, point: item.point }] : []
      }
      return [{ ...item, items: cut(item.items, depth + 1) }]
    })
  circuit.items = tidyRun(cut(circuit.items, 1), 'series', true)
  if (circuit.current) circuit.current = { ...circuit.current }
  return circuit
}

/** Tidy the items of a run: the loop or a series group (`type` series), or a parallel group's branches. */
function tidyRun(items: Item[], type: Group['type'], isLoop = false): Item[] {
  const out: Item[] = []
  for (let item of items) {
    if (item.type !== 'part') {
      const inner = tidyRun(item.items, item.type)
      if (!inner.length) {
        // An empty group leaves its point behind.
        if (item.point && out.length && !out.at(-1)!.point) out.at(-1)!.point = item.point
        continue
      }
      const [only] = inner
      item =
        inner.length === 1
          ? { ...only, voltmeter: only.voltmeter ?? item.voltmeter, current: item.current ?? only.current, point: item.point }
          : { ...item, items: inner }
    }
    if (item.type === type && !(type === 'series' && item.voltmeter)) {
      // A parallel group in a parallel group adds its branches; a series run
      // in a series run joins it, unless a voltmeter is across just that run.
      const joined = item.items.map((child) => ({ ...child }))
      if (type === 'parallel' && item.voltmeter && !joined.some((c) => c.voltmeter)) joined[0].voltmeter = item.voltmeter
      if (type === 'series') joined.at(-1)!.point = item.point
      out.push(...joined)
      continue
    }
    out.push(item)
  }
  const last = out.length - 1
  return out.map((item, i) => ({
    ...item,
    current: type === 'parallel' ? item.current : null,
    point: type === 'series' && (i < last || isLoop) ? item.point : null,
  }))
}

// Reading settings back from storage, a preset or an address.

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'

function cleanArrow(v: unknown): Arrow | null {
  if (!isObject(v)) return null
  return { dir: v.dir === 'backward' ? 'backward' : 'forward', label: cleanLabel(v.label, DEFAULT_CURRENT) }
}
const cleanOptional = (v: unknown, fallback: Label) => (isObject(v) ? cleanLabel(v, fallback) : null)

function cleanItem(v: unknown): Item | null {
  if (!isObject(v)) return null
  const extras = {
    voltmeter: cleanOptional(v.voltmeter, DEFAULT_VOLTMETER),
    current: cleanArrow(v.current),
    point: cleanOptional(v.point, DEFAULT_POINT),
  }
  if (v.type === 'part') {
    const kind = PART_KINDS.includes(v.kind as PartKind) ? (v.kind as PartKind) : 'resistor'
    const fresh = newPart(kind)
    return {
      ...fresh,
      ...extras,
      name: cleanLabel(v.name, fresh.name),
      auto: typeof v.auto === 'boolean' ? v.auto : true,
      value: cleanLabel(v.value, fresh.value),
      open: kind === 'switch' && v.open === true,
      cells: kind === 'battery' ? cleanCells(v.cells) : 1,
      flip: kind === 'battery' && v.flip === true,
    }
  }
  if ((v.type === 'series' || v.type === 'parallel') && Array.isArray(v.items)) {
    return { type: v.type, items: v.items.map(cleanItem).filter((i) => i !== null), ...extras }
  }
  return null
}

/** Tidy a stored or linked circuit into a usable one, as a fresh copy. */
export function cleanCircuit(value: unknown): Circuit {
  const v = isObject(value) ? value : {}
  const items = Array.isArray(v.items) ? v.items.map(cleanItem).filter((i) => i !== null) : []
  const circuit = settle({ items, current: cleanArrow(v.current) })
  tidy(circuit)
  if (!circuit.items.length) return structuredClone(DEFAULT_CIRCUIT)
  return renumber(circuit)
}

// The page address.

const quote = (text: string) => `'${text.replace(/[\\']/g, (c) => `\\${c}`)}'`

function encodeName(p: Part): string | null {
  const def = NAME_MODE[p.kind]
  if (p.auto) return p.name.mode === def ? null : p.name.mode === 'text' ? AUTO_TEXT : encodeLabel(p.name)
  return encodeLabel(p.name)
}
/** A name shown as text and still numbered automatically. */
const AUTO_TEXT = '~*'

function encodeExtras(item: ItemBase): string {
  let out = ''
  if (item.voltmeter) out += `m${quote(encodeLabel(item.voltmeter))}`
  if (item.current) out += `${item.current.dir === 'forward' ? 'i' : 'j'}${quote(encodeLabel(item.current.label))}`
  if (item.point) out += `@${quote(encodeLabel(item.point))}`
  return out
}

function encodeItem(item: Item): string {
  if (item.type !== 'part') {
    const [open, close] = item.type === 'series' ? '()' : '[]'
    return `${open}${item.items.map(encodeItem).join('.')}${close}${encodeExtras(item)}`
  }
  let out = LETTER[item.kind]
  if (item.open) out += 'o'
  if (item.cells > 1) out += String(cleanCells(item.cells))
  if (item.flip) out += 'f'
  const name = encodeName(item)
  if (name !== null) out += `n${quote(name)}`
  if (encodeLabel(item.value) !== encodeLabel(defaultValue(item.kind))) out += `v${quote(encodeLabel(item.value))}`
  return out + encodeExtras(item)
}

export function encodeCircuit(circuit: Circuit): string {
  const loop = circuit.items.map(encodeItem).join('.')
  return circuit.current ? `${loop}!${encodeExtras({ voltmeter: null, current: circuit.current, point: null })}` : loop
}

/** Read an address's circuit, or undefined when it can't be read. */
export function decodeCircuit(raw: string): Circuit | undefined {
  let i = 0
  const fail = () => {
    throw new Error(`can't read the circuit at ${i}`)
  }
  const peek = () => raw[i]
  const readQuoted = (): string => {
    if (raw[i++] !== "'") fail()
    let text = ''
    while (i < raw.length && raw[i] !== "'") text += raw[i] === '\\' ? raw[++i] : raw[i], i++
    if (raw[i++] !== "'") fail()
    return text
  }
  const readExtras = (item: ItemBase, part?: Part) => {
    for (;;) {
      const c = peek()
      if (c === 'm') i++, (item.voltmeter = decodeLabel(readQuoted(), DEFAULT_VOLTMETER))
      else if (c === 'i' || c === 'j') i++, (item.current = { dir: c === 'i' ? 'forward' : 'backward', label: decodeLabel(readQuoted(), DEFAULT_CURRENT) })
      else if (c === '@') i++, (item.point = decodeLabel(readQuoted(), DEFAULT_POINT))
      else if (part && c === 'n') {
        i++
        const text = readQuoted()
        if (text === AUTO_TEXT) part.name.mode = 'text'
        else {
          const name = decodeLabel(text, part.name)
          part.auto = name.mode !== 'text'
          part.name = name
        }
      } else if (part && c === 'v') i++, (part.value = decodeLabel(readQuoted(), defaultValue(part.kind)))
      else return
    }
  }
  const readItem = (): Item => {
    const c = raw[i++]
    if (c === '(' || c === '[') {
      const group = newGroup(c === '(' ? 'series' : 'parallel', readRun(c === '(' ? ')' : ']'))
      readExtras(group)
      return group
    }
    const kind = KIND_OF.get(c)
    if (!kind) fail()
    const part = newPart(kind)
    for (;;) {
      const flag = peek()
      if (flag === 'o') part.open = true
      else if (/^[0-9]$/.test(flag ?? '')) {
        const start = i
        while (/^[0-9]$/.test(peek() ?? '')) i++
        part.cells = cleanCells(Number(raw.slice(start, i)))
        continue
      }
      else if (flag === 'f') part.flip = true
      else break
      i++
    }
    readExtras(part, part)
    return part
  }
  const readRun = (close: string | null): Item[] => {
    const items = [readItem()]
    while (peek() === '.') i++, items.push(readItem())
    if (close !== null && raw[i++] !== close) fail()
    return items
  }
  try {
    const circuit: Circuit = { items: readRun(null), current: null }
    if (peek() === '!') {
      i++
      const loop: ItemBase = { voltmeter: null, current: null, point: null }
      readExtras(loop)
      circuit.current = loop.current
    }
    if (i !== raw.length) fail()
    return renumber(circuit)
  } catch {
    return undefined
  }
}

// A written description, for screen readers. Labels are left out, so a blank
// is never given away.

const PART_WORDS: Record<PartKind, string> = { battery: 'a battery', resistor: 'a resistor', bulb: 'a bulb', led: 'an LED', diode: 'a diode', switch: 'a switch', ammeter: 'an ammeter' }

function describeItem(item: Item): string {
  if (item.type === 'part') {
    const words = item.kind === 'switch' ? `${item.open ? 'an open' : 'a closed'} switch` : PART_WORDS[item.kind]
    return item.voltmeter ? `${words} with a voltmeter across it` : words
  }
  const words =
    item.type === 'series' ? item.items.map(describeItem).join(' then ') : `${item.items.length} branches in parallel (${item.items.map(describeItem).join('; ')})`
  return item.voltmeter ? `${words}, with a voltmeter across them` : words
}

export const describeCircuit = (circuit: Circuit) => `A circuit diagram: ${circuit.items.map(describeItem).join(', then ')}, and back to the start`

/** The circuit as a settings field. */
export const circuitField = (def: Circuit): Field<Circuit> => ({
  default: def,
  clean: (v) => (v === undefined || v === null ? structuredClone(def) : cleanCircuit(v)),
  encode: encodeCircuit,
  decode: decodeCircuit,
})
