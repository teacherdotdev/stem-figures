// DNA and Protein Synthesis's settings, as they appear in the page address:
// the sequence as typed and which strand it is (?seq=TACGGATTC&typed=template),
// how it's read in codons, then how each row is drawn, blank or left off,
// the deliberate mistakes for multiple choice, and the codon chart.

import { figureTextFields } from '$shared/figureText'
import { LABEL_SIZES, type LabelSize } from '$shared/labelSize'
import { bool, choice, defineSettings, number, text } from '$shared/settings'
import { TYPED } from './sequence'

/** The rows, top to bottom. */
export const ROWS = ['coding', 'template', 'mrna', 'trna', 'amino'] as const
export type RowId = (typeof ROWS)[number]
/** The rows made of bases, which can hold a mistake. */
export const BASE_ROWS = ['coding', 'template', 'mrna', 'trna'] as const
export type BaseRowId = (typeof BASE_ROWS)[number]

export const ROW_NAMES: Record<RowId, string> = {
  coding: 'DNA coding strand',
  template: 'DNA template strand',
  mrna: 'mRNA',
  trna: 'tRNA anticodons',
  amino: 'Amino acids',
}

/** How a row is drawn: written in, every box blank, a share of its boxes blank, or not at all. */
export const ROW_MODES = ['shown', 'blank', 'some', 'off'] as const
export type RowMode = (typeof ROW_MODES)[number]

export const FRAMES = ['aug', 'first'] as const
export const NAME_STYLES = ['three', 'one', 'full'] as const
export const AMINO_STYLES = ['beads', 'text'] as const
/** Strand ends and row names: written, blank for students, or left off. */
export const SHOWN_BLANK_OFF = ['shown', 'blank', 'off'] as const
export const SHOWS = ['strands', 'chart', 'both'] as const
export const CHART_AT = ['right', 'below'] as const

export const MAX_SEED = 999999
export const MAX_MISTAKES = 4

const row = (mode: RowMode) => choice(ROW_MODES, mode)

export const dnaSettings = defineSettings(
  {
    /** the sequence as typed, ends, spaces and all */
    seq: text('TACGGATTCAAGCCG', 120),
    typed: choice(TYPED, 'template'),
    /** the reading frame: from the first AUG, or from the first base */
    frame: choice(FRAMES, 'aug'),

    coding: row('shown'),
    template: row('shown'),
    mrna: row('shown'),
    trna: row('shown'),
    amino: row('shown'),
    /** the share of a partly blank row's boxes left blank, in percent */
    share: number({ min: 10, max: 90, fallback: 50 }),
    /** which boxes a partly blank row leaves blank */
    seed: number({ min: 1, max: MAX_SEED, fallback: 1 }),
    /** each row's name on the left; empty for its usual one */
    codingName: text('', 40),
    templateName: text('', 40),
    mrnaName: text('', 40),
    trnaName: text('', 40),
    aminoName: text('', 40),
    rowNames: choice(SHOWN_BLANK_OFF, 'shown'),
    ends: choice(SHOWN_BLANK_OFF, 'shown'),

    aminoNames: choice(NAME_STYLES, 'three'),
    aminoStyle: choice(AMINO_STYLES, 'beads'),
    /** a gap between codons, on every row so they still line up */
    gaps: bool(true),
    /** a bracket under each mRNA codon that's read */
    brackets: bool(false),
    /** hydrogen bonds between the DNA strands: 2 for A–T, 3 for G–C */
    bonds: bool(false),
    /** each base's box tinted by its base */
    color: bool(false),

    /** deliberate wrong bases, for multiple choice */
    mistakes: number({ min: 0, max: MAX_MISTAKES, fallback: 0 }),
    mistakeRow: choice(BASE_ROWS, 'mrna'),
    mistakeSeed: number({ min: 1, max: MAX_SEED, fallback: 1 }),

    show: choice(SHOWS, 'strands'),
    chartAt: choice(CHART_AT, 'right'),

    labelSize: choice(Object.keys(LABEL_SIZES) as LabelSize[], 'medium'),
    ...figureTextFields(),
  },
  (s) => ({ ...s, share: Math.round(s.share), seed: Math.round(s.seed), mistakes: Math.round(s.mistakes), mistakeSeed: Math.round(s.mistakeSeed) }),
)

export type DnaSettings = typeof dnaSettings.defaults

/** A new seed, for Shuffle. */
export const newSeed = (old: number) => {
  let next = old
  while (next === old) next = 1 + Math.floor(Math.random() * MAX_SEED)
  return next
}

/** A row's name as the figure writes it. */
export const rowName = (s: DnaSettings, id: RowId) => s[`${id}Name`].trim() || ROW_NAMES[id]
