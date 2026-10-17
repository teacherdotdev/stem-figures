// Reading the sequence the teacher typed into the strands it makes. Any case,
// spaces and hyphens are fine, and so are written ends (5′-ATG…-3′): when
// they say the strand was typed the other way round from how the figure
// writes it, it is turned around. Every other letter is left out, and T in
// RNA or U in DNA is read as the other, each reported under the box.
//
// Whatever was typed, the strands are worked out from the coding strand,
// the DNA strand that reads like the mRNA, with T for U.

import { DNA_PAIR, complement, toDna, toRna, type DnaBase } from './code'

/** The most bases drawn: 12 codons on one line. */
export const MAX_BASES = 36

export const TYPED = ['template', 'coding', 'mrna'] as const
export type Typed = (typeof TYPED)[number]

export const TYPED_NAMES: Record<Typed, string> = {
  template: 'DNA template strand',
  coding: 'DNA coding strand',
  mrna: 'mRNA',
}

/** Which end each strand is written from, left to right. */
export const WRITTEN_FROM: Record<Typed, '5' | '3'> = { template: '3', coding: '5', mrna: '5' }

export interface Strands {
  /** DNA coding strand, 5′→3′ */
  coding: string
  /** DNA template strand, 3′→5′, base under base with the coding strand */
  template: string
  /** mRNA, 5′→3′: the coding strand with U for T */
  mrna: string
}

export interface Reading {
  /** the bases kept, in the typed strand's alphabet and the figure's direction */
  bases: string
  strands: Strands
  /** what was changed or left out, one sentence each */
  problems: string[]
}

// A written end: 5 or 3, then a prime (or "end"), or set apart from the
// bases by a hyphen or a space. A digit among the bases is just a stray one.
const LEADING_END = /^\s*([35])(\s*['′’‘ʹ´`"])?(\s*end\b)?(\s*[-–—:])?\s*/i
const TRAILING_END = /(\s*[-–—])?(\s*)([35])(\s*['′’‘ʹ´`"])?(\s*end)?\s*$/i

/** The written end at each side of what was typed, if any, and the bases between. */
function ends(typed: string): { left: '5' | '3' | null; right: '5' | '3' | null; body: string } {
  let body = typed
  let left: '5' | '3' | null = null
  let right: '5' | '3' | null = null
  const lead = LEADING_END.exec(body)
  if (lead && (lead[2] || lead[3] || lead[4] || /^\s*[35]\s/.test(body))) {
    left = lead[1] as '5' | '3'
    body = body.slice(lead[0].length)
  }
  const trail = TRAILING_END.exec(body)
  if (trail && (trail[1] || trail[2] || trail[4] || trail[5])) {
    right = trail[3] as '5' | '3'
    body = body.slice(0, trail.index)
  }
  return { left, right, body }
}

const list = (chars: string[]) => {
  const shown = chars.map((c) => (c === ' ' ? 'a space' : `“${c}”`))
  return shown.length < 3 ? shown.join(' and ') : `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}`
}

/** What was typed as one strand, read into all three. */
export function readSequence(typed: string, as: Typed): Reading {
  const problems: string[] = []
  const rna = as === 'mrna'
  const { left, right, body } = ends(typed)

  const stray = new Set<string>()
  let bases = ''
  for (const ch of body.toUpperCase()) {
    if ('ACGTU'.includes(ch)) bases += ch
    else if (!/[\s\-–—.,_·]/.test(ch)) stray.add(ch)
  }
  if (stray.size) problems.push(`Left out ${list([...stray])}: only A, C, G, ${rna ? 'U' : 'T'} are bases.`)

  const hasT = bases.includes('T')
  const hasU = bases.includes('U')
  if (rna && hasT) problems.push(hasU ? 'T and U are mixed: RNA has U, so each T is read as U.' : 'RNA has U, not T: each T is read as U.')
  if (!rna && hasU) problems.push(hasT ? 'T and U are mixed: DNA has T, so each U is read as T.' : 'DNA has T, not U: each U is read as T.')
  bases = rna ? toRna(bases) : toDna(bases)

  // Written ends that say the strand runs the other way round from how the
  // figure writes it: turned around.
  const from = WRITTEN_FROM[as]
  const other = from === '5' ? '3' : '5'
  if (left === other || right === from) {
    if (left && right && left === right) problems.push(`Both ends are written ${left}′; read left to right as ${from}′→${other}′.`)
    else {
      bases = [...bases].reverse().join('')
      problems.push(`Typed ${other}′→${from}′, so it’s turned around to read ${from}′→${other}′ like the figure.`)
    }
  }

  if (bases.length > MAX_BASES) {
    problems.push(`Only the first ${MAX_BASES} bases are drawn (12 codons); ${bases.length - MAX_BASES} more were typed.`)
    bases = bases.slice(0, MAX_BASES)
  }

  return { bases, strands: strandsFrom(bases, as), problems }
}

/** All three strands from one, already read. */
export function strandsFrom(bases: string, as: Typed): Strands {
  const coding = as === 'template' ? complement(bases, 'dna') : toDna(bases)
  return {
    coding,
    template: [...coding].map((b) => DNA_PAIR[b as DnaBase]).join(''),
    mrna: toRna(coding),
  }
}
