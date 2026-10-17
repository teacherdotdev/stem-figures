import { describe, expect, it } from 'vitest'
import { layoutChart } from './chart'
import { CODONS } from './code'
import { buildDna } from './figure'
import { answerLines, blankCount, worksheetOf, type BaseBox, type Row } from './rows'
import { dnaSettings } from './settings'
import { SETUPS, settingsFor } from './setups'

const settingsOf = (query: string) => dnaSettings.fromParams(new URLSearchParams(query))
const sheet = (query: string) => worksheetOf(settingsOf(query))
const build = (query: string) => buildDna(settingsOf(query))
const rowOf = (rows: Row[], id: string) => rows.find((r) => r.id === id)!
const boxesOf = (rows: Row[], id: string) => (rowOf(rows, id) as { boxes: BaseBox[] }).boxes
const written = (boxes: BaseBox[]) => boxes.map((b) => b.base).join('')

const DNA_PAIR: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' }
const RNA_PAIR: Record<string, string> = { A: 'U', U: 'A', G: 'C', C: 'G' }

describe('the rows', () => {
  it('start as the template strand TAC GGA TTC AAG CCG with every row worked out', () => {
    const w = sheet('')
    expect(w.rows.map((r) => r.id)).toEqual(['coding', 'template', 'mrna', 'trna', 'amino'])
    expect(written(boxesOf(w.rows, 'coding'))).toBe('ATGCCTAAGTTCGGC')
    expect(written(boxesOf(w.rows, 'template'))).toBe('TACGGATTCAAGCCG')
    expect(written(boxesOf(w.rows, 'mrna'))).toBe('AUGCCUAAGUUCGGC')
    expect(written(boxesOf(w.rows, 'trna'))).toBe('UACGGAUUCAAGCCG')
    const amino = rowOf(w.rows, 'amino') as Extract<Row, { id: 'amino' }>
    expect(amino.aminos.map((a) => a.name)).toEqual(['Met', 'Pro', 'Lys', 'Phe', 'Gly'])
  })

  it('puts each anticodon under its codon, complementary, with no T in any RNA row', () => {
    const w = sheet('seq=GCCAATGGTTCACTGGAAATAAGC&typed=coding')
    const mrna = boxesOf(w.rows, 'mrna')
    const trna = boxesOf(w.rows, 'trna')
    for (const b of trna) expect(b.base).toBe(RNA_PAIR[mrna[b.col].base])
    // From the AUG at base 5 to just before the stop: five anticodons.
    expect(trna.map((b) => b.col)).toEqual(Array.from({ length: 15 }, (_, i) => 4 + i))
    expect(written(mrna) + written(trna)).not.toMatch(/T/)
  })

  it('gives the bases before the first AUG no amino acid, and none after the stop', () => {
    const w = sheet('seq=GCCAATGGTTCACTGGAAATAAGC&typed=coding')
    const amino = rowOf(w.rows, 'amino') as Extract<Row, { id: 'amino' }>
    expect(amino.aminos.map((a) => [a.col, a.name])).toEqual([[4, 'Met'], [7, 'Val'], [10, 'His'], [13, 'Trp'], [16, 'Lys'], [19, 'Stop']])
  })

  it('translates nothing without an AUG', () => {
    const w = sheet('seq=GGCTTTCCC&typed=coding')
    expect(w.translation.start).toBeNull()
    expect(boxesOf(w.rows, 'trna')).toEqual([])
    expect((rowOf(w.rows, 'amino') as Extract<Row, { id: 'amino' }>).aminos).toEqual([])
    expect(sheet('seq=GGCTTTCCC&typed=coding&frame=first').translation.codons).toHaveLength(3)
  })

  it('names amino acids by one letter or in full', () => {
    const names = (q: string) => (rowOf(sheet(q).rows, 'amino') as Extract<Row, { id: 'amino' }>).aminos.map((a) => a.name)
    expect(names('aminoNames=one')).toEqual(['M', 'P', 'K', 'F', 'G'])
    expect(names('aminoNames=full')).toEqual(['Methionine', 'Proline', 'Lysine', 'Phenylalanine', 'Glycine'])
  })

  it('leaves out rows that are off', () => {
    expect(sheet('coding=off&trna=off').rows.map((r) => r.id)).toEqual(['template', 'mrna', 'amino'])
  })
})

describe('blanks', () => {
  it('blanks every box of a blank row, keeping its bases for the answer key', () => {
    const w = sheet('template=blank')
    const t = boxesOf(w.rows, 'template')
    expect(t.every((b) => b.blank)).toBe(true)
    expect(written(t)).toBe('TACGGATTCAAGCCG')
  })

  it('blanks the share asked of a partly blank row, the same for the same seed', () => {
    for (const share of [10, 30, 50, 70, 90]) {
      const blanks = boxesOf(sheet(`mrna=some&share=${share}&seed=4`).rows, 'mrna').filter((b) => b.blank)
      expect(blanks).toHaveLength(blankCount(15, share))
      expect(blankCount(15, share)).toBe(Math.min(14, Math.max(1, Math.round((15 * share) / 100))))
    }
    const a = boxesOf(sheet('mrna=some&seed=4').rows, 'mrna').map((b) => b.blank)
    const b = boxesOf(sheet('mrna=some&seed=4').rows, 'mrna').map((b) => b.blank)
    const c = boxesOf(sheet('mrna=some&seed=5').rows, 'mrna').map((b) => b.blank)
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })

  it('keeps one row’s blanks when another row changes', () => {
    const one = boxesOf(sheet('mrna=some&seed=9').rows, 'mrna').map((b) => b.blank)
    const two = boxesOf(sheet('mrna=some&seed=9&coding=some&template=off').rows, 'mrna').map((b) => b.blank)
    expect(two).toEqual(one)
  })

  it('always leaves at least one box blank and one written', () => {
    expect(blankCount(15, 1)).toBe(1)
    expect(blankCount(15, 99)).toBe(14)
    expect(blankCount(1, 50)).toBe(1)
    expect(blankCount(0, 50)).toBe(0)
  })
})

describe('mistakes', () => {
  const base = 'seq=TACGGATTCAAGCCGATCGGTTAC&typed=template'
  for (const row of ['coding', 'template', 'mrna', 'trna'] as const) {
    it(`puts exactly the number asked in the ${row} row, every one wrong`, () => {
      for (const count of [1, 2, 3, 4]) {
        for (const seed of [1, 2, 3, 50, 999]) {
          const w = sheet(`${base}&mistakes=${count}&mistakeRow=${row}&mistakeSeed=${seed}`)
          expect(w.mistakes).toHaveLength(count)
          expect(new Set(w.mistakes.map((m) => m.col)).size).toBe(count)
          for (const r of w.rows) {
            if (!('boxes' in r)) continue
            for (const b of r.boxes) {
              const mistake = w.mistakes.find((m) => m.col === b.col && m.row === r.id)
              expect(b.wrong).toBe(!!mistake)
              expect(r.id === row || !b.wrong).toBe(true)
              if (b.wrong) expect(b.base).not.toBe(b.correct)
              else expect(b.base).toBe(b.correct)
            }
          }
          // A wrong base doesn't pair with what's opposite it.
          const strands = w.reading.strands
          for (const m of w.mistakes) {
            if (m.row === 'coding') expect(DNA_PAIR[m.base]).not.toBe(strands.template[m.col])
            if (m.row === 'template') expect(DNA_PAIR[m.base]).not.toBe(strands.coding[m.col])
            if (m.row === 'mrna') expect(m.base).not.toBe(strands.mrna[m.col])
            if (m.row === 'trna') expect(RNA_PAIR[m.base]).not.toBe(strands.mrna[m.col])
            // RNA rows get RNA bases, or T where U belongs; DNA rows only DNA bases.
            if (m.row === 'mrna' || m.row === 'trna') expect(m.base === 'T' ? m.correct : m.base).toMatch(/^[ACGU]$/)
            if (m.row === 'mrna' || m.row === 'trna') expect(m.base !== 'T' || m.correct === 'U').toBe(true)
            else expect(m.base).toMatch(/^[ACGT]$/)
          }
        }
      }
    })
  }

  it('makes an mRNA mistake one that doesn’t pair with the template', () => {
    for (let seed = 1; seed < 40; seed++) {
      const w = sheet(`${base}&mistakes=4&mistakeSeed=${seed}`)
      for (const m of w.mistakes) {
        const opposite = w.reading.strands.template[m.col]
        const pairs = { A: 'T', U: 'A', G: 'C', C: 'G' }[m.base]
        expect(pairs, `${m.base} opposite ${opposite}`).not.toBe(opposite)
      }
    }
  })

  it('places the same mistakes for the same seed, and others for another', () => {
    const a = sheet(`${base}&mistakes=3&mistakeSeed=11`).mistakes
    expect(sheet(`${base}&mistakes=3&mistakeSeed=11`).mistakes).toEqual(a)
    expect(sheet(`${base}&mistakes=3&mistakeSeed=12`).mistakes).not.toEqual(a)
  })

  it('never puts a mistake in a blank box, and says when too few are written in', () => {
    const w = sheet('mrna=some&share=90&mistakes=4&seed=3')
    const open = boxesOf(w.rows, 'mrna').filter((b) => !b.blank)
    expect(open).toHaveLength(1)
    expect(w.mistakes).toHaveLength(1)
    expect(w.mistakes.every((m) => open.some((b) => b.col === m.col))).toBe(true)
    expect(w.mistakeNote).toBe('The mRNA row has only 1 base written in, so only 1 mistake fits.')
    expect(sheet('mrna=off&mistakes=2').mistakeNote).toBe('The mRNA row is off, so it can’t hold mistakes.')
  })

  it('says when nothing written in can show a mistake is wrong', () => {
    expect(sheet('template=off&mrna=off&mistakes=1&mistakeRow=coding').mistakeNote).toMatch(/can’t tell/)
    expect(sheet('mistakes=1&mistakeRow=coding').mistakeNote).toBeNull()
  })

  it('lists each mistake in the answer key', () => {
    const s = settingsOf(`${base}&mistakes=2&mistakeSeed=5&answerKey=1`)
    const w = worksheetOf(s)
    const lines = answerLines(s, w)
    const listed = lines.filter((l) => l.startsWith('Mistake: '))
    expect(listed).toHaveLength(2)
    for (const [i, m] of w.mistakes.entries()) expect(listed[i]).toBe(`Mistake: mRNA base ${m.col + 1} should be ${m.correct}, not ${m.base}`)
    const t = worksheetOf(settingsOf(`${base}&mistakes=1&mistakeRow=trna&mistakeSeed=2`))
    expect(answerLines(settingsOf(`${base}&mistakes=1&mistakeRow=trna&mistakeSeed=2`), t).at(-1)).toMatch(/^Mistake: Anticodon \d+, base [123] should be [ACGU], not [ACGUT]$/)
  })
})

describe('the answer key', () => {
  it('writes out every row drawn, in codons, with its ends', () => {
    expect(answerLines(settingsOf(''))).toEqual([
      'DNA coding strand: 5′-ATG CCT AAG TTC GGC-3′',
      'DNA template strand: 3′-TAC GGA TTC AAG CCG-5′',
      'mRNA: 5′-AUG CCU AAG UUC GGC-3′',
      'tRNA anticodons: UAC GGA UUC AAG CCG',
      'Amino acids: Met–Pro–Lys–Phe–Gly',
    ])
    expect(answerLines(settingsOf('seq=GCCAATGGTTCACTGGAAATAAGC&typed=coding&coding=off&template=off&trna=off'))).toEqual([
      'mRNA: 5′-GCCA AUG GUU CAC UGG AAA UAA GC-3′',
      'Amino acids: Met–Val–His–Trp–Lys, then Stop',
    ])
  })
})

describe('the layout', () => {
  it('lines every row up base under base', () => {
    for (const q of ['', 'gaps=0', 'seq=GCCAATGGTTCACTGGAAATAAGC&typed=coding', 'labelSize=large&brackets=1&bonds=1']) {
      const d = build(q)
      const xs = new Map<number, number>()
      for (const r of d.rows) {
        const row = rowOf(d.worksheet.rows, r.id)
        if (!('boxes' in row)) continue
        r.boxes.forEach((b, i) => {
          const col = row.boxes[i].col
          if (xs.has(col)) expect(b.x, `${q} ${r.id} column ${col}`).toBe(xs.get(col))
          else xs.set(col, b.x)
        })
      }
      // Each bead is centred under its codon's middle base.
      const amino = d.rows.find((r) => r.id === 'amino')!
      const aminos = (rowOf(d.worksheet.rows, 'amino') as Extract<Row, { id: 'amino' }>).aminos
      amino.beads.forEach((b, i) => expect(b.x).toBeCloseTo(xs.get(aminos[i].col + 1)! + d.box / 2, 6))
    }
  })

  it('never overlaps boxes in a row, and keeps codons apart with gaps', () => {
    const d = build('')
    const xs = d.rows[0].boxes.map((b) => b.x)
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(d.box)
    expect(xs[3] - xs[2]).toBeGreaterThan(d.box)
    expect(xs[2] - xs[1]).toBe(d.box)
  })

  it('grows wider with a longer sequence', () => {
    const widths = [6, 12, 24, 36].map((n) => build(`seq=${'TAC'.repeat(n / 3)}&typed=template`).width)
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeGreaterThan(widths[i - 1])
  })

  it('stacks rows top to bottom without overlapping', () => {
    const d = build('brackets=1&bonds=1')
    for (let i = 1; i < d.rows.length; i++) expect(d.rows[i].y).toBeGreaterThan(d.rows[i - 1].y + d.rows[i - 1].h)
    expect(d.height).toBeGreaterThanOrEqual(d.rows.at(-1)!.y + d.rows.at(-1)!.h)
  })

  it('draws 2 hydrogen bonds for A–T and 3 for G–C, only where both bases are written', () => {
    expect(build('bonds=1&seq=ATGC&typed=coding').bonds).toHaveLength(2 + 2 + 3 + 3)
    expect(build('bonds=1&seq=ATGC&typed=coding&template=blank').bonds).toHaveLength(0)
    expect(build('seq=ATGC&typed=coding').bonds).toHaveLength(0)
  })

  it('brackets each codon read, Stop’s included', () => {
    expect(build('brackets=1&seq=GCCAATGGTTCACTGGAAATAAGC&typed=coding').brackets).toHaveLength(6)
  })

  it('labels each strand’s 5′ and 3′ ends the right way round', () => {
    const ends = (id: string) => build('').rows.find((r) => r.id === id)!.ends.map((e) => e.text)
    expect(ends('coding')).toEqual(['5′', '3′'])
    expect(ends('template')).toEqual(['3′', '5′'])
    expect(ends('mrna')).toEqual(['5′', '3′'])
    expect(ends('trna')).toEqual(['3′', '5′'])
    expect(build('ends=blank').rows[0].endBlanks).toHaveLength(2)
    expect(build('ends=off').rows[0].ends).toEqual([])
  })

  it('widens the figure to fit its answer key and title', () => {
    const d = build('seq=ATG&typed=coding&answerKey=1&rowNames=off&ends=off')
    expect(d.width).toBeGreaterThan(build('seq=ATG&typed=coding&rowNames=off&ends=off').width)
    expect(build('seq=ATG&typed=coding&titleMode=text&title=Transcribe+and+translate+this+gene').dx).toBeGreaterThan(0)
    expect(d.dx).toBeGreaterThan(0)
  })

  it('places the chart beside, below, or alone', () => {
    const strands = build('')
    const right = build('show=both')
    const below = build('show=both&chartAt=below')
    const alone = build('show=chart')
    expect(right.chart!.x).toBeGreaterThanOrEqual(strands.width)
    expect(below.chart!.y).toBeGreaterThanOrEqual(strands.height)
    expect(alone.rows.length && alone.chart!.x).toBe(0)
    expect(alone.width).toBe(alone.chart!.width)
  })
})

describe('the codon chart', () => {
  it('fills all 64 cells, each codon once, with what it codes for', () => {
    for (const style of ['three', 'one', 'full'] as const) {
      const c = layoutChart(style, 1)
      expect(c.lines).toHaveLength(64)
      const codons = c.lines.map((l) => l.text.slice(0, 3))
      expect(new Set(codons)).toEqual(new Set(CODONS.keys()))
      for (const l of c.lines) {
        expect(l.x).toBeGreaterThan(c.grid.x)
        expect(l.x).toBeLessThan(c.grid.x + c.grid.w)
        expect(l.y).toBeGreaterThan(c.grid.y)
        expect(l.y).toBeLessThan(c.grid.y + c.grid.h)
      }
      expect(c.lines.filter((l) => l.marked).map((l) => l.text.slice(0, 3)).sort()).toEqual(['AUG', 'UAA', 'UAG', 'UGA'])
    }
  })

  it('puts each codon in the cell for its first and second base', () => {
    const c = layoutChart('three', 1)
    const order = 'UCAG'
    for (const l of c.lines) {
      const row = Math.floor((l.y - c.grid.y) / c.grid.cellH)
      const col = Math.floor((l.x - c.grid.x) / c.grid.cellW)
      expect(order[row] + order[col]).toBe(l.text.slice(0, 2))
    }
    expect(c.lines.find((l) => l.text.startsWith('AUG'))!.text).toBe('AUG Met (Start)')
    expect(c.lines.find((l) => l.text.startsWith('UGA'))!.text).toBe('UGA Stop')
  })
})

describe('the setups', () => {
  it('each keep their settings as written', () => {
    for (const setup of SETUPS) {
      const s = dnaSettings.tidy(settingsFor(setup, dnaSettings.defaults, dnaSettings.defaults))
      for (const [key, value] of Object.entries(setup.settings)) expect((s as Record<string, unknown>)[key], `${setup.id} ${key}`).toEqual(value)
      expect(worksheetOf(s).reading.problems, setup.id).toEqual([])
    }
  })

  it('give the four multiple choices 0 to 3 mistakes', () => {
    const counts = SETUPS.filter((x) => x.id.startsWith('choice-')).map((x) => worksheetOf(dnaSettings.tidy(settingsFor(x, dnaSettings.defaults, dnaSettings.defaults))).mistakes.length)
    expect(counts).toEqual([0, 1, 2, 3])
  })

  it('end the stop codon setup on a stop', () => {
    const s = dnaSettings.tidy(settingsFor(SETUPS.find((x) => x.id === 'stop')!, dnaSettings.defaults, dnaSettings.defaults))
    const t = worksheetOf(s).translation
    expect(t.stopped).toBe(true)
    expect(t.codons.at(-1)!.bases).toBe('UGA')
  })
})
