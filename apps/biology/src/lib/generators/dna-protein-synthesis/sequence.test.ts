import { describe, expect, it } from 'vitest'
import { MAX_BASES, readSequence } from './sequence'

describe('reading a typed strand', () => {
  it('gives the same three strands whichever one is typed', () => {
    const fromTemplate = readSequence('TACGGATTCAAGCCG', 'template').strands
    const fromCoding = readSequence('ATGCCTAAGTTCGGC', 'coding').strands
    const fromMrna = readSequence('AUGCCUAAGUUCGGC', 'mrna').strands
    expect(fromTemplate).toEqual({ coding: 'ATGCCTAAGTTCGGC', template: 'TACGGATTCAAGCCG', mrna: 'AUGCCUAAGUUCGGC' })
    expect(fromCoding).toEqual(fromTemplate)
    expect(fromMrna).toEqual(fromTemplate)
  })

  it('reads a template strand written 3′→5′, starting TAC, into mRNA starting AUG', () => {
    expect(readSequence('TAC', 'template').strands.mrna).toBe('AUG')
  })

  it('pairs the strands base for base, with no T in the mRNA and no U in the DNA', () => {
    const { coding, template, mrna } = readSequence('TTAGGCATCGATCGAATTCCGGA', 'template').strands
    const pair: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' }
    for (let i = 0; i < coding.length; i++) {
      expect(template[i]).toBe(pair[coding[i]])
      expect(mrna[i]).toBe(coding[i] === 'T' ? 'U' : coding[i])
    }
    expect(mrna).not.toMatch(/T/)
    expect(coding + template).not.toMatch(/U/)
  })

  it('ignores case, spaces, hyphens and ends written the figure’s way', () => {
    for (const typed of ['tac gga ttc', "3'-TAC-GGA-TTC-5'", '3′ TACGGATTC 5′', '3’–tacggattc–5’', ' 3 TAC GGA TTC 5 ']) {
      const r = readSequence(typed, 'template')
      expect(r.bases, typed).toBe('TACGGATTC')
      expect(r.problems, typed).toEqual([])
    }
    expect(readSequence("5'-AUG CCU-3'", 'mrna').bases).toBe('AUGCCU')
  })

  it('turns a strand typed with its ends the other way round to read the figure’s way', () => {
    const r = readSequence("5'-GCCAT-3'", 'template')
    expect(r.bases).toBe('TACCG')
    expect(r.problems).toEqual(['Typed 5′→3′, so it’s turned around to read 3′→5′ like the figure.'])
    expect(readSequence("3'-CGTA", 'coding').bases).toBe('ATGC')
  })

  it('reports other letters and leaves them out', () => {
    const r = readSequence('ATG XCC 7TA', 'coding')
    expect(r.bases).toBe('ATGCCTA')
    expect(r.problems).toEqual(['Left out “X” and “7”: only A, C, G, T are bases.'])
  })

  it('reports T and U mixed, reading them as the strand’s own', () => {
    const dna = readSequence('ATGUUA', 'coding')
    expect(dna.bases).toBe('ATGTTA')
    expect(dna.problems).toEqual(['T and U are mixed: DNA has T, so each U is read as T.'])
    const rna = readSequence('AUGTTA', 'mrna')
    expect(rna.bases).toBe('AUGUUA')
    expect(rna.problems).toEqual(['T and U are mixed: RNA has U, so each T is read as U.'])
    expect(readSequence('ATG', 'mrna').problems).toEqual(['RNA has U, not T: each T is read as U.'])
  })

  it(`draws at most ${MAX_BASES} bases`, () => {
    const r = readSequence('ATG'.repeat(13), 'coding')
    expect(r.bases).toHaveLength(MAX_BASES)
    expect(r.problems).toEqual([`Only the first ${MAX_BASES} bases are drawn (12 codons); 3 more were typed.`])
    expect(readSequence('ATG'.repeat(12), 'coding').problems).toEqual([])
  })
})
