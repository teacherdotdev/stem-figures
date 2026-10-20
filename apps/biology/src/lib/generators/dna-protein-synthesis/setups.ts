// Classic setups: the figures teachers make most often, each a set of
// settings over the defaults. The four multiple choice setups are one
// question's answer choices: A with every base right, B to D with one, two
// and three wrong pairings in the mRNA.

import type { DnaSettings } from './settings'

type Setup = { id: string; name: string; settings: Partial<DnaSettings> }

/** One answer choice: transcription only, its letter as the chart title, and its mistakes. */
const choiceOf = (letter: string, mistakes: number, mistakeSeed: number): Partial<DnaSettings> => ({
  seq: 'TACGGATTCAAGCCG', typed: 'template', trna: 'off', amino: 'off', titleMode: 'text', title: `${letter}.`, mistakes, mistakeSeed,
})

export const SETUPS: Setup[] = [
  {
    // Template written 3′→5′, starting TAC, so the mRNA starts AUG.
    id: 'template',
    name: 'Template strand starting TAC',
    settings: { seq: 'TACGGATTCAAGCCG', typed: 'template' },
  },
  {
    // Four bases before the start codon, and two after the stop.
    id: 'leader',
    name: 'Coding strand with bases before ATG',
    settings: { seq: 'GCCAATGGTTCACTGGAAATAAGC', typed: 'coding' },
  },
  {
    id: 'mrna',
    name: 'A short mRNA, translated',
    settings: { seq: 'AUGUUUGGCACCUAG', typed: 'mrna', coding: 'off', template: 'off' },
  },
  {
    // Half a DNA molecule: students write in the other strand.
    id: 'other-half',
    name: 'Draw the other half of the DNA',
    settings: { seq: 'ATGCGTACCTTAGGCATA', typed: 'coding', template: 'blank', mrna: 'off', trna: 'off', amino: 'off', bonds: true },
  },
  {
    id: 'stop',
    name: 'Ending in a stop codon',
    settings: { seq: 'TACCTCTTTGCAACT', typed: 'template' },
  },
  { id: 'choice-a', name: 'Multiple choice A: every base right', settings: choiceOf('A', 0, 1) },
  { id: 'choice-b', name: 'Multiple choice B: one wrong pairing', settings: choiceOf('B', 1, 7) },
  { id: 'choice-c', name: 'Multiple choice C: two wrong pairings', settings: choiceOf('C', 2, 12) },
  { id: 'choice-d', name: 'Multiple choice D: three wrong pairings', settings: choiceOf('D', 3, 21) },
]

/** The settings a setup makes, starting from the teacher's look (label size, colors) but nothing else. */
export function settingsFor(setup: Setup, defaults: DnaSettings, current: DnaSettings): DnaSettings {
  return { ...defaults, labelSize: current.labelSize, color: current.color, ...setup.settings }
}
