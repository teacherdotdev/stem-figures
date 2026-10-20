// The biology, stated once: which bases pair, the standard genetic code and
// the amino acids' names. A pairs with T in DNA and with U in RNA; G pairs
// with C. The two strands of DNA are antiparallel, so the template strand,
// written 3′→5′ left to right, lines up base under base with the coding
// strand (5′→3′) and the mRNA (5′→3′). An anticodon pairs with its codon the
// same way, antiparallel: under the codon 5′-AUG-3′ it reads 3′-UAC-5′.

export type DnaBase = 'A' | 'C' | 'G' | 'T'
export type RnaBase = 'A' | 'C' | 'G' | 'U'

/** The base each DNA base pairs with in DNA. */
export const DNA_PAIR: Record<DnaBase, DnaBase> = { A: 'T', T: 'A', G: 'C', C: 'G' }
/** The RNA base each DNA or RNA base pairs with. */
export const RNA_PAIR: Record<string, RnaBase> = { A: 'U', T: 'A', U: 'A', G: 'C', C: 'G' }

/** A strand's bases paired one for one, as DNA or RNA. Pairs line up in the
 *  same columns, so the result reads the opposite way (3′→5′ under 5′→3′). */
export function complement(bases: string, as: 'dna' | 'rna'): string {
  const pair = as === 'dna' ? (b: string) => DNA_PAIR[(b === 'U' ? 'T' : b) as DnaBase] : (b: string) => RNA_PAIR[b]
  return [...bases].map((b) => pair(b) ?? '').join('')
}

/** The mRNA made from a template strand written 3′→5′: complementary to it, so 5′→3′. */
export const transcribe = (template: string) => complement(template, 'rna')

/** The coding strand as mRNA: the same bases, U for T. */
export const toRna = (bases: string) => bases.replace(/T/g, 'U')
export const toDna = (bases: string) => bases.replace(/U/g, 'T')

/** The anticodon under a codon, written 3′→5′ so its bases line up with the codon's. */
export const anticodon = (codon: string) => complement(codon, 'rna')

export const STOP = 'Stop'

export interface AminoAcid {
  /** one-letter code, M */
  one: string
  /** three-letter code, Met */
  three: string
  /** its name, methionine */
  full: string
}

export const AMINO_ACIDS: AminoAcid[] = [
  { one: 'A', three: 'Ala', full: 'alanine' },
  { one: 'R', three: 'Arg', full: 'arginine' },
  { one: 'N', three: 'Asn', full: 'asparagine' },
  { one: 'D', three: 'Asp', full: 'aspartic acid' },
  { one: 'C', three: 'Cys', full: 'cysteine' },
  { one: 'Q', three: 'Gln', full: 'glutamine' },
  { one: 'E', three: 'Glu', full: 'glutamic acid' },
  { one: 'G', three: 'Gly', full: 'glycine' },
  { one: 'H', three: 'His', full: 'histidine' },
  { one: 'I', three: 'Ile', full: 'isoleucine' },
  { one: 'L', three: 'Leu', full: 'leucine' },
  { one: 'K', three: 'Lys', full: 'lysine' },
  { one: 'M', three: 'Met', full: 'methionine' },
  { one: 'F', three: 'Phe', full: 'phenylalanine' },
  { one: 'P', three: 'Pro', full: 'proline' },
  { one: 'S', three: 'Ser', full: 'serine' },
  { one: 'T', three: 'Thr', full: 'threonine' },
  { one: 'W', three: 'Trp', full: 'tryptophan' },
  { one: 'Y', three: 'Tyr', full: 'tyrosine' },
  { one: 'V', three: 'Val', full: 'valine' },
]
const BY_LETTER = new Map(AMINO_ACIDS.map((a) => [a.one, a]))

/** The bases in the order the codon chart lists them. */
export const CHART_ORDER: RnaBase[] = ['U', 'C', 'A', 'G']

// The standard genetic code (NCBI table 1), one letter per codon, the first
// base slowest and the third fastest, each in U, C, A, G order: UUU, UUC,
// UUA, UUG, UCU … GGG. * is a stop codon.
const TABLE = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG'

/** Every codon and what it codes for: an amino acid, or null for a stop codon. */
export const CODONS: Map<string, AminoAcid | null> = new Map(
  [...TABLE].map((letter, i) => {
    const codon = [16, 4, 1].map((step) => CHART_ORDER[Math.floor(i / step) % 4]).join('')
    return [codon, letter === '*' ? null : BY_LETTER.get(letter)!]
  }),
)

export const START = 'AUG'

/** What an mRNA codon codes for: an amino acid, Stop, or undefined for something that isn't a codon. */
export function codeFor(codon: string): AminoAcid | typeof STOP | undefined {
  if (!CODONS.has(codon)) return undefined
  return CODONS.get(codon) ?? STOP
}

export const isStop = (codon: string) => CODONS.has(codon) && CODONS.get(codon) === null

export type NameStyle = 'three' | 'one' | 'full'

/** An amino acid's name in a style, or Stop. Full names start with a capital, as they do on the figure. */
export function aminoName(a: AminoAcid | typeof STOP, style: NameStyle): string {
  if (a === STOP) return STOP
  return style === 'full' ? a.full[0].toUpperCase() + a.full.slice(1) : a[style]
}

/** One codon in the reading frame. */
export interface Codon {
  /** its first base's position on the strand, from 0 */
  at: number
  /** the mRNA codon, 5′→3′ */
  bases: string
  /** what it codes for; null after translation has stopped */
  code: AminoAcid | typeof STOP | null
}

export interface Translation {
  /** where the reading frame starts, or null when there is no AUG to start at */
  start: number | null
  /** every whole codon from the start to the end of the strand */
  codons: Codon[]
  /** whether a stop codon ended translation */
  stopped: boolean
}

/** An mRNA (5′→3′) read in codons: from its first AUG, or from its first
 *  base. Translation ends at the first stop codon; the codons after it code
 *  for nothing. */
export function translate(mrna: string, frame: 'aug' | 'first'): Translation {
  const at = frame === 'first' ? 0 : mrna.indexOf(START)
  if (at < 0) return { start: null, codons: [], stopped: false }
  const codons: Codon[] = []
  let stopped = false
  for (let i = at; i + 3 <= mrna.length; i += 3) {
    const bases = mrna.slice(i, i + 3)
    const code = stopped ? null : (codeFor(bases) ?? null)
    if (code === STOP) stopped = true
    codons.push({ at: i, bases, code })
  }
  return { start: at, codons, stopped }
}
