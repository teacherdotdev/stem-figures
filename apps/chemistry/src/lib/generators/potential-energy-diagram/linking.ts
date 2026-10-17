// Potential Energy Diagram's address parameters, for /linking and
// /llms.txt. The grid and axis fields come from $shared/graph, whose fields
// don't say what values they take, so those are said here from the same
// lists, as Mass Spectrum says them.

import { CAPS } from '$shared/graph/caps'
import { EVERY, MINOR, TITLE_MODES } from '$shared/graph/axes'
import { LABEL_SIZES } from '$shared/labelSize'
import { describeLinking, type ParamDoc } from '$lib/linking/define'
import type { FieldAbout } from '$lib/shared/settings'
import { MAX_ENERGY, energySettings } from './settings'

/** The most characters $shared's text() keeps. */
const SHARED_TEXT: FieldAbout = { type: 'text', maxLength: 120 }
const titleModes: FieldAbout = { type: 'choice', options: TITLE_MODES }
const TITLE_MODE_WORDS = 'text: the words given; blank: a blank line for students to write on; none: nothing'
const caps: FieldAbout = { type: 'choice', options: Object.keys(CAPS) }
const every: FieldAbout = { type: 'choice', options: EVERY.map(String) }
const range = (end: string): ParamDoc => ({
  what: `The energy axis’s ${end}, in the unit chosen, written as a plain number (e.g. 0, −50, 2.5).`,
  when: 'axes=numbered',
  about: SHARED_TEXT,
})
const ARROW_WORDS =
  'symbol: Eₐ or ΔH; value: the symbol and its value, e.g. “ΔH = −30 kJ/mol”; mark: a letter or number (see marks) for “which arrow shows…?” questions; blank: a blank line for students; none: no label'
const arrow = (what: string, when?: string): ParamDoc => ({ what, when })
const arrowLabel = (what: string, show: string): ParamDoc => ({ what, when: `${show}=1`, values: ARROW_WORDS })
const LEVEL_MODE_WORDS = 'text: the words in its text parameter, or this page’s word when that is empty; blank: a blank line for students; none: no label'
const levelLabel = (kind: string, word: string, when = 'style=curve'): [ParamDoc, ParamDoc] => [
  {
    what: `The ${kind} label’s words; empty for “${word}”. Subscripts and superscripts are typed as in Particle Diagram’s key: N_2 + 3H_2, SO_4^{2-}.`,
    when: `${kind === 'reactants' || kind === 'products' ? '' : `${when} and `}the label’s mode is text`,
  },
  { what: `How the ${kind} ${kind === 'reactants' || kind === 'products' ? 'are' : 'is'} labeled.`, when: kind === 'reactants' || kind === 'products' ? undefined : when, values: LEVEL_MODE_WORDS },
]
const [reactantsLabel, reactantsLabelMode] = levelLabel('reactants', 'Reactants')
const [productsLabel, productsLabelMode] = levelLabel('products', 'Products')
const [tsLabel, tsLabelMode] = levelLabel('transition state', 'Transition state')
const [intLabel, intLabelMode] = levelLabel('intermediate', 'Intermediate', 'style=curve with two or three steps')

export const energyLinking = describeLinking(energySettings, {
  id: 'potential-energy-diagram',
  summary:
    'A reaction energy profile: the potential energy (up the side) against the reaction coordinate (along the bottom, never numbered), as a smooth curve through the energies in levels, flat at the reactants, over each transition state and down to the products. A catalysed path with a lower transition state can be added, dashed, with a key. style=levels draws a level diagram instead: the reactants and products as lines with ΔH between them.',
  notes: [
    `levels is 3, 5 or 7 energies joined by underscores, in order along the reaction: reactants, transition state, products for one step (levels=50_150_20); reactants, transition state 1, intermediate, transition state 2, products for two (levels=40_120_70_100_10); and so on for three. Each is −${MAX_ENERGY} to ${MAX_ENERGY}, in the unit chosen. Only energies are stored: Eₐ and ΔH are worked out from them.`,
    'ΔH = products − reactants. Each step’s Eₐ runs from the level before it up to its transition state, and its reverse Eₐ from the level after it. Each transition state must be above the levels either side of it and each intermediate below the transition states either side; otherwise the page says so, and an arrow that would point the wrong way isn’t drawn.',
    'With catalyst=1 the catalysed path has the same reactants and products and one transition state, catTs, which must be above both and below the highest uncatalysed transition state. Its key names the paths uncatName (solid) and catName (dashed).',
    'The Eₐ arrows run up from the level before each transition state to its peak, the ΔH arrow from the reactants to the products, the reverse Eₐ arrow (of the last step) from the products up to its transition state. Dashed lines carry each level across to its arrow unless guides=0.',
    'Arrows labeled with mark are lettered A, B, C… (or numbered) in the order Eₐ of each step, catalysed Eₐ, ΔH, reverse Eₐ, counting only those marked.',
    'With axes=numbered (the default) the energy axis runs from yFrom to yTo counting by yStep; it isn’t fitted to the levels by the link, so set the range to cover them. axes=shape fits it and leaves off the numbers and gridlines.',
    'The y-axis title isn’t changed by the link: with unit=kj, say, also set yTitle, e.g. “Potential energy (kJ)”.',
  ],
  params: {
    style: { what: 'What is drawn.', values: 'curve: the energy profile, a curve through every level; levels: a level diagram, the reactants and products as lines with ΔH between them' },
    levels: {
      what: 'The energies of the levels, in order along the reaction.',
      about: { type: 'format', syntax: '3, 5 or 7 numbers joined by underscores, e.g. 50_150_20' },
    },
    catalyst: { what: 'Adds a catalysed path, dashed, with a lower transition state.', when: 'style=curve' },
    catTs: { what: 'The catalysed transition state’s energy.', when: 'catalyst=1' },
    uncatName: { what: 'The key’s name for the uncatalysed (solid) path; empty for “Uncatalysed”.', when: 'catalyst=1' },
    catName: { what: 'The key’s name for the catalysed (dashed) path; empty for “Catalysed”. It is also written in the catalysed Eₐ label: “Eₐ (catalysed)”.', when: 'catalyst=1' },
    unit: { what: 'The energy unit, written in the arrows’ values and the answer key.', values: 'kj-per-mol: kJ/mol; kj-mol-1: kJ mol⁻¹; kj: kJ' },
    eaArrow: arrow('Draws each step’s forward Eₐ arrow.', 'style=curve'),
    eaLabel: arrowLabel('How each Eₐ arrow is labeled.', 'eaArrow'),
    catEaArrow: arrow('Draws the catalysed path’s Eₐ arrow.', 'catalyst=1'),
    catEaLabel: arrowLabel('How the catalysed Eₐ arrow is labeled.', 'catEaArrow'),
    dhArrow: arrow('Draws the ΔH arrow, from the reactants to the products.'),
    dhLabel: arrowLabel('How the ΔH arrow is labeled.', 'dhArrow'),
    revEaArrow: arrow('Draws the reverse Eₐ arrow, from the products up to the last transition state.', 'style=curve'),
    revEaLabel: arrowLabel('How the reverse Eₐ arrow is labeled.', 'revEaArrow'),
    bothHeads: { what: 'Puts an arrowhead at both ends of each arrow, not just the end it points to.' },
    marks: { what: 'How arrows labeled with mark are marked.', values: 'letters: A, B, C…; numbers: 1, 2, 3…' },
    guides: { what: 'Draws dashed lines carrying each level across to its arrows.' },
    reactantsLabel,
    reactantsLabelMode,
    productsLabel,
    productsLabelMode,
    tsLabel,
    tsLabelMode,
    intLabel,
    intLabelMode,
    color: { what: 'The curve’s color (the level lines’ on a level diagram).' },
    catColor: { what: 'The catalysed path’s color.', when: 'catalyst=1' },
    axes: { what: 'Whether the energy axis is numbered.', values: 'numbered: numbers and gridlines; shape: no numbers or gridlines, fitted to the levels' },
    gridlines: { what: 'How the energy axis’s gridlines are drawn.', when: 'axes=numbered', values: 'light: light gray; standard: dark; bold: for photocopies; none: a tick at each number' },
    yFrom: range('start'),
    yTo: range('end'),
    yStep: range('gridline spacing'),
    yEvery: { what: 'Number every nth gridline; 0 leaves the energy axis unnumbered.', when: 'axes=numbered', about: every },
    title: { what: 'The chart title’s words.', when: 'titleMode=text', about: SHARED_TEXT },
    titleMode: { what: 'The chart title across the top.', about: titleModes, values: TITLE_MODE_WORDS },
    xTitle: { what: 'The x-axis title’s words.', when: 'xTitleMode=text', about: SHARED_TEXT },
    xTitleMode: { what: 'The x-axis title.', about: titleModes, values: TITLE_MODE_WORDS },
    yTitle: { what: 'The y-axis title’s words.', when: 'yTitleMode=text', about: SHARED_TEXT },
    yTitleMode: { what: 'The y-axis title.', about: titleModes, values: TITLE_MODE_WORDS },
    xEndCap: { what: 'How the reaction coordinate’s right end is finished.', about: caps },
    yEndCap: { what: 'How the energy axis’s top end is finished.', about: caps },
    minor: { what: 'Minor gridlines: how many parts each grid block is split into; 0 for none.', when: 'axes=numbered', about: { type: 'choice', options: MINOR.map(String) } },
    labelSize: { what: 'How big the figure’s text is compared to its lines.', about: { type: 'choice', options: Object.keys(LABEL_SIZES) } },
  },
  examples: [
    { shows: 'An exothermic reaction: reactants at 50 kJ/mol, a transition state at 150 and products at 20, its Eₐ and ΔH arrows labeled with their values.', settings: { eaLabel: 'value', dhLabel: 'value' } },
    {
      shows: 'The same reaction with and without a catalyst, the catalysed path dashed over a transition state at 100 kJ/mol, with a key.',
      settings: { catalyst: true, catTs: 100 },
    },
    {
      shows: 'A two-step reaction with an intermediate at 70 kJ/mol, each step’s Eₐ arrow lettered for a question and ΔH left blank.',
      settings: { levels: [40, 120, 70, 100, 10], eaLabel: 'mark', dhLabel: 'blank', yTo: '140' },
    },
  ],
})
