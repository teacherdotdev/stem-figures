// What each row of the figure holds, before it's laid out: every base in
// its column, which boxes are left blank for students, and the deliberate
// mistakes for multiple choice. Then the answer key, which writes out every
// row drawn in full and where each mistake is.

import { aminoName, anticodon, CODONS, START, STOP, translate, type AminoAcid, type Translation } from './code'
import { readSequence, type Reading } from './sequence'
import { rowName, ROWS, type BaseRowId, type DnaSettings, type RowId, type RowMode } from './settings'

/** One base's box. */
export interface BaseBox {
  /** its column, from 0 */
  col: number
  /** the base printed in it: the right one, or a mistake */
  base: string
  correct: string
  blank: boolean
  wrong: boolean
}

/** One amino acid, or Stop, under its codon. */
export interface AminoBox {
  /** which codon in the frame, from 0 */
  codon: number
  /** its codon's first column */
  col: number
  name: string
  stop: boolean
  blank: boolean
}

export type Row =
  | { id: Exclude<RowId, 'amino'>; mode: RowMode; boxes: BaseBox[] }
  | { id: 'amino'; mode: RowMode; aminos: AminoBox[] }

export interface Mistake {
  row: BaseRowId
  col: number
  /** its place along its row, from 1, as the answer key counts */
  place: number
  base: string
  correct: string
}

export interface Worksheet {
  reading: Reading
  translation: Translation
  /** the rows drawn, top to bottom */
  rows: Row[]
  mistakes: Mistake[]
  /** why fewer mistakes were placed than asked, or why they can't be checked */
  mistakeNote: string | null
}

/** A small random number generator (mulberry32), so a seed always gives the same boxes. */
export function seededRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The numbers 0 to n − 1, shuffled by `rand`. */
function shuffled(n: number, rand: () => number) {
  const out = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** How many of a partly blank row's n boxes are blank: the share asked,
 *  but at least one and, with two or more, at least one left written. */
export function blankCount(n: number, share: number) {
  if (n === 0) return 0
  if (n === 1) return 1
  return Math.min(n - 1, Math.max(1, Math.round((n * share) / 100)))
}

/** Which of n boxes a row leaves blank. Each row has its own random
 *  numbers from the seed, so changing one row doesn't move another's blanks. */
function blanksFor(mode: RowMode, n: number, s: DnaSettings, row: RowId): Set<number> {
  if (mode === 'blank') return new Set(Array.from({ length: n }, (_, i) => i))
  if (mode !== 'some') return new Set()
  const rand = seededRandom((s.seed * 31 + ROWS.indexOf(row) * 0x9e3779b9) >>> 0)
  return new Set(shuffled(n, rand).slice(0, blankCount(n, s.share)))
}

const DNA_BASES = ['A', 'C', 'G', 'T']
const RNA_BASES = ['A', 'C', 'G', 'U']

/** The wrong bases a box could hold instead: any base that doesn't pair as
 *  it should, or in RNA, T where U belongs (a common slip). */
export function wrongBases(row: BaseRowId, correct: string) {
  const rna = row === 'mrna' || row === 'trna'
  const options = (rna ? RNA_BASES : DNA_BASES).filter((b) => b !== correct)
  return rna && correct === 'U' ? [...options, 'T'] : options
}

/** The rows a mistake in a row can be checked against: the strands it pairs with or copies. */
const CHECKED_BY: Record<BaseRowId, RowId[]> = {
  coding: ['template', 'mrna'],
  template: ['coding', 'mrna'],
  mrna: ['coding', 'template', 'trna', 'amino'],
  trna: ['mrna'],
}

export function worksheetOf(s: DnaSettings): Worksheet {
  const reading = readSequence(s.seq, s.typed)
  const { coding, template, mrna } = reading.strands
  const translation = translate(mrna, s.frame)
  const coded = translation.codons.filter((c) => c.code !== null)

  const strand = (bases: string) => [...bases].map((b, col) => ({ col, base: b }))
  const contents: Record<Exclude<RowId, 'amino'>, { col: number; base: string }[]> = {
    coding: strand(coding),
    template: strand(template),
    mrna: strand(mrna),
    // Stop codons are read by a release factor, not a tRNA, so they get no anticodon.
    trna: coded.filter((c) => c.code !== STOP).flatMap((c) => [...anticodon(c.bases)].map((base, i) => ({ col: c.at + i, base }))),
  }

  const rows: Row[] = []
  for (const id of ROWS) {
    const mode = s[id]
    if (mode === 'off') continue
    if (id === 'amino') {
      const blank = blanksFor(mode, coded.length, s, id)
      rows.push({
        id, mode,
        aminos: coded.map((c, i) => ({
          codon: translation.codons.indexOf(c), col: c.at,
          name: aminoName(c.code as AminoAcid | typeof STOP, s.aminoNames), stop: c.code === STOP, blank: blank.has(i),
        })),
      })
    } else {
      const cells = contents[id]
      const blank = blanksFor(mode, cells.length, s, id)
      rows.push({ id, mode, boxes: cells.map((c, i) => ({ col: c.col, base: c.base, correct: c.base, blank: blank.has(i), wrong: false })) })
    }
  }

  // The mistakes: in boxes written in, never two in one box, each a base
  // that's wrong (so never one that happens to be right).
  const mistakes: Mistake[] = []
  let mistakeNote: string | null = null
  if (s.mistakes > 0) {
    const target = rows.find((r) => r.id === s.mistakeRow) as Extract<Row, { boxes: BaseBox[] }> | undefined
    const name = rowName(s, s.mistakeRow)
    if (!target) mistakeNote = `The ${name} row is off, so it can’t hold mistakes.`
    else {
      const open = target.boxes.map((b, i) => i).filter((i) => !target.boxes[i].blank)
      const rand = seededRandom(s.mistakeSeed)
      const picked = shuffled(open.length, rand).slice(0, s.mistakes).map((k) => open[k]).sort((a, b) => a - b)
      for (const i of picked) {
        const box = target.boxes[i]
        const options = wrongBases(s.mistakeRow, box.correct)
        box.base = options[Math.floor(rand() * options.length)]
        box.wrong = true
        mistakes.push({ row: s.mistakeRow, col: box.col, place: i + 1, base: box.base, correct: box.correct })
      }
      if (picked.length < s.mistakes) {
        mistakeNote = open.length
          ? `The ${name} row has only ${open.length} ${open.length === 1 ? 'base' : 'bases'} written in, so ${picked.length === 1 ? 'only 1 mistake fits' : `only ${picked.length} mistakes fit`}.`
          : `The ${name} row has no bases written in, so it can’t hold mistakes.`
      } else if (!CHECKED_BY[s.mistakeRow].some((id) => rows.some((r) => r.id === id && r.mode !== 'blank'))) {
        mistakeNote = `Nothing written in pairs with the ${name}, so students can’t tell the mistakes are wrong.`
      }
    }
  }

  return { reading, translation, rows, mistakes, mistakeNote }
}

// ── The answer key ─────────────────────────────────────────────────────────

/** Bases split into codons from the reading frame's start, with any before it apart. */
function inCodons(bases: string, start: number | null) {
  if (start === null) return bases
  const parts = start > 0 ? [bases.slice(0, start)] : []
  for (let i = start; i < bases.length; i += 3) parts.push(bases.slice(i, i + 3))
  return parts.join(' ')
}

/** Where a mistake is, as the answer key says it. */
export function mistakeText(s: DnaSettings, m: Mistake, w: Worksheet) {
  if (m.row === 'trna') {
    const codon = w.translation.codons.findIndex((c) => m.col >= c.at && m.col < c.at + 3)
    const n = w.translation.codons.slice(0, codon + 1).filter((c) => c.code !== null && c.code !== STOP).length
    return `Anticodon ${n}, base ${m.col - w.translation.codons[codon].at + 1} should be ${m.correct}, not ${m.base}`
  }
  return `${rowName(s, m.row)} base ${m.place} should be ${m.correct}, not ${m.base}`
}

/** The answer key: every row drawn, written out in full, then each mistake;
 *  for the codon chart alone, its start and stop codons. */
export function answerLines(s: DnaSettings, w: Worksheet = worksheetOf(s)): string[] {
  if (s.show === 'chart') {
    const stops = [...CODONS].filter(([, a]) => a === null).map(([codon]) => codon)
    return [`Start codon: ${START} (${aminoName(CODONS.get(START)!, s.aminoNames)})`, `Stop codons: ${stops.join(', ')}`]
  }
  const { strands } = w.reading
  const start = w.translation.start
  const lines: string[] = []
  for (const row of w.rows) {
    const name = rowName(s, row.id)
    if (row.id === 'coding') lines.push(`${name}: 5′-${inCodons(strands.coding, start)}-3′`)
    else if (row.id === 'template') lines.push(`${name}: 3′-${inCodons(strands.template, start)}-5′`)
    else if (row.id === 'mrna') lines.push(`${name}: 5′-${inCodons(strands.mrna, start)}-3′`)
    else if (row.id === 'trna') {
      const anticodons = w.translation.codons.filter((c) => c.code !== null && c.code !== STOP).map((c) => anticodon(c.bases))
      lines.push(`${name}: ${anticodons.length ? anticodons.join(' ') : 'none'}`)
    } else if ('aminos' in row) {
      const names = row.aminos.filter((a) => !a.stop).map((a) => a.name)
      const sep = s.aminoNames === 'full' ? ' – ' : '–'
      lines.push(`${name}: ${names.length ? names.join(sep) : 'none'}${w.translation.stopped ? `, then ${STOP}` : ''}`)
    }
  }
  for (const m of w.mistakes) lines.push(`Mistake: ${mistakeText(s, m, w)}`)
  return lines
}
