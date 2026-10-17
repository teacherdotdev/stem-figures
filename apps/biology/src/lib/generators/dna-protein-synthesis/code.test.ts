import { describe, expect, it } from 'vitest'
import { AMINO_ACIDS, CODONS, START, STOP, aminoName, anticodon, codeFor, complement, isStop, transcribe, translate } from './code'

// The standard genetic code written out by amino acid, as textbooks list it,
// to check the table against.
const BY_AMINO: Record<string, string[]> = {
  Phe: ['UUU', 'UUC'],
  Leu: ['UUA', 'UUG', 'CUU', 'CUC', 'CUA', 'CUG'],
  Ile: ['AUU', 'AUC', 'AUA'],
  Met: ['AUG'],
  Val: ['GUU', 'GUC', 'GUA', 'GUG'],
  Ser: ['UCU', 'UCC', 'UCA', 'UCG', 'AGU', 'AGC'],
  Pro: ['CCU', 'CCC', 'CCA', 'CCG'],
  Thr: ['ACU', 'ACC', 'ACA', 'ACG'],
  Ala: ['GCU', 'GCC', 'GCA', 'GCG'],
  Tyr: ['UAU', 'UAC'],
  His: ['CAU', 'CAC'],
  Gln: ['CAA', 'CAG'],
  Asn: ['AAU', 'AAC'],
  Lys: ['AAA', 'AAG'],
  Asp: ['GAU', 'GAC'],
  Glu: ['GAA', 'GAG'],
  Cys: ['UGU', 'UGC'],
  Trp: ['UGG'],
  Arg: ['CGU', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'],
  Gly: ['GGU', 'GGC', 'GGA', 'GGG'],
  Stop: ['UAA', 'UAG', 'UGA'],
}

describe('the genetic code', () => {
  it('has all 64 codons', () => {
    expect(CODONS.size).toBe(64)
    for (const codon of CODONS.keys()) expect(codon).toMatch(/^[ACGU]{3}$/)
  })

  it('matches the standard code, codon by codon', () => {
    const listed = Object.values(BY_AMINO).flat()
    expect(new Set(listed).size).toBe(64)
    for (const [amino, codons] of Object.entries(BY_AMINO)) {
      for (const codon of codons) {
        const code = codeFor(codon)
        expect(code === STOP ? STOP : code?.three, codon).toBe(amino)
      }
    }
  })

  it('has exactly three stop codons, UAA, UAG and UGA', () => {
    expect([...CODONS.keys()].filter(isStop).sort()).toEqual(['UAA', 'UAG', 'UGA'])
  })

  it('codes for 20 amino acids, each with a one-letter, three-letter and full name', () => {
    const coded = new Set([...CODONS.values()].filter(Boolean))
    expect(coded.size).toBe(20)
    expect(AMINO_ACIDS).toHaveLength(20)
    expect(new Set(AMINO_ACIDS.map((a) => a.one)).size).toBe(20)
    expect(new Set(AMINO_ACIDS.map((a) => a.three)).size).toBe(20)
  })

  it('starts at AUG, methionine', () => {
    expect(START).toBe('AUG')
    const met = codeFor('AUG')
    expect(met !== STOP && met && [met.one, met.three, met.full]).toEqual(['M', 'Met', 'methionine'])
    expect(aminoName(met!, 'full')).toBe('Methionine')
    expect(aminoName(STOP, 'one')).toBe('Stop')
  })
})

describe('base pairing', () => {
  it('pairs A with T in DNA and with U in RNA, and G with C', () => {
    expect(complement('ATGC', 'dna')).toBe('TACG')
    expect(complement('ATGC', 'rna')).toBe('UACG')
    expect(complement('AUGC', 'rna')).toBe('UACG')
  })

  it('transcribes a template strand written 3′→5′ starting TAC into mRNA starting AUG', () => {
    expect(transcribe('TACGGATTC')).toBe('AUGCCUAAG')
  })

  it('writes the anticodon under 5′-AUG-3′ as 3′-UAC-5′', () => {
    expect(anticodon('AUG')).toBe('UAC')
    for (const codon of CODONS.keys()) {
      const a = anticodon(codon)
      expect(a).not.toMatch(/T/)
      // Complementary base by base, so pairing it back gives the codon.
      expect(complement(a, 'rna')).toBe(codon)
    }
  })
})

describe('translation', () => {
  it('reads from the first AUG, leaving the bases before it out', () => {
    const t = translate('GCCAAUGGUUCAC', 'aug')
    expect(t.start).toBe(4)
    expect(t.codons.map((c) => c.bases)).toEqual(['AUG', 'GUU', 'CAC'])
  })

  it('stops at the first stop codon; the codons after it code for nothing', () => {
    const t = translate('AUGUUUUAGCCAGGG', 'aug')
    expect(t.stopped).toBe(true)
    const codes = t.codons.map((c) => (c.code === null ? null : c.code === STOP ? STOP : c.code.three))
    expect(codes).toEqual(['Met', 'Phe', STOP, null, null])
  })

  it('reads in frame, so a stop out of frame doesn’t count', () => {
    // UAA at bases 5–7 is split across two codons.
    const t = translate('AUGUUAAGG', 'aug')
    expect(t.stopped).toBe(false)
    expect(t.codons.map((c) => c.bases)).toEqual(['AUG', 'UUA', 'AGG'])
  })

  it('translates nothing without an AUG, unless read from the first base', () => {
    expect(translate('GGCUUUCCC', 'aug')).toEqual({ start: null, codons: [], stopped: false })
    const t = translate('GGCUUUCCC', 'first')
    expect(t.codons.map((c) => (c.code !== STOP && c.code ? c.code.three : c.code))).toEqual(['Gly', 'Phe', 'Pro'])
  })

  it('leaves a part codon at the end unread', () => {
    expect(translate('AUGCCUA', 'aug').codons.map((c) => c.bases)).toEqual(['AUG', 'CCU'])
  })
})
