// Equilibrium Graph's address parameters, for /linking and /llms.txt. The
// grid and axis fields come from $shared/graph, whose fields don't say what
// values they take, so those are said here from the same lists, as Half-Life
// Graph says them.

import { CAPS } from '$shared/graph/caps'
import { EVERY, LABEL_MODES, MINOR, TITLE_MODES } from '$shared/graph/axes'
import { LABEL_SIZES } from '$shared/labelSize'
import { describeLinking, type ParamDoc } from '$lib/linking/define'
import type { FieldAbout } from '$lib/shared/settings'
import { REACTIONS, equationText } from './reactions'
import { MAX_STRESSES, equilibriumSettings } from './settings'

/** The most characters $shared's text() keeps. */
const SHARED_TEXT: FieldAbout = { type: 'text', maxLength: 120 }
const titleModes: FieldAbout = { type: 'choice', options: TITLE_MODES }
const TITLE_MODE_WORDS = 'text: the words given; blank: a blank line for students to write on; none: nothing'
const labelModes: FieldAbout = { type: 'choice', options: LABEL_MODES }
const caps: FieldAbout = { type: 'choice', options: Object.keys(CAPS) }
const every: FieldAbout = { type: 'choice', options: EVERY.map(String) }
const range = (axis: 'x' | 'y', end: string, unit: string): ParamDoc => ({
  what: `The ${axis}-axis’s ${end}, ${unit}, written as a plain number (e.g. 0, 2.5).`,
  about: SHARED_TEXT,
})
const cap = (axis: 'x' | 'y', end: string): ParamDoc => ({ what: `How the ${axis}-axis’s ${end} end is finished.`, about: caps })
const setups = REACTIONS.map((x) => `${x.id}: ${equationText(x)} (${x.id === 'abc' ? 'made up' : `${x.heat}${'evidence' in x ? `, ${x.evidence}` : ''}`}; example start ${x.start.join(', ')} mol/L and K ${x.k})`).join('; ')
const nth = ['first', 'second', 'third'] as const
const start = (n: 1 | 2 | 3): ParamDoc => ({
  what: `The ${nth[n - 1]} species’ concentration at time 0, in mol/L, in the order of the equation (reactants, then products).`,
  when: n === 3 ? 'the reaction has three species (every one but n2o4)' : undefined,
})
const stress = (n: 1 | 2 | 3) => {
  const when = `count=${n}${n < 3 ? ' or more' : ''}`
  return {
    [`s${n}Kind`]: {
      what: `What the ${nth[n - 1]} stress does.`,
      when,
      values:
        'add: a species is added, its line jumping up; remove: a species is removed, its line jumping down (never below 0); volume: the volume is changed, every line jumping together; raise, lower: the temperature is raised or lowered, changing K with no jump',
    },
    [`s${n}At`]: { what: `The time of the ${nth[n - 1]} stress, in the x-axis’s units; it has to be after 0 and on the time axis.`, when },
    [`s${n}Species`]: { what: 'Which species is added or removed: its place in the equation, from 1. Rounded, and no more than the reaction has.', when: `${when}, and s${n}Kind=add or remove` },
    [`s${n}Amount`]: {
      what: `How much: the mol/L added or removed; for s${n}Kind=volume, what the volume is multiplied by (0.5 halves it, so every concentration doubles), kept between 0.1 and 10; for raise and lower, how many times K changes (2 and 0.5 both mean 2 times), up or down as the reaction’s heat says. It doesn’t follow s${n}Kind: set it too.`,
      when,
    },
    [`s${n}Text`]: {
      what: `The words over the ${nth[n - 1]} stress’s dashed line, with subscripts and superscripts typed as N_2 and Fe^{3+}. Left out, the page writes its own (“N₂ added”, “Volume halved”, “Temperature raised”); empty (s${n}Text=) for no words, for students to say what happened.`,
      when,
    },
  } as Record<`s${typeof n}Kind` | `s${typeof n}At` | `s${typeof n}Species` | `s${typeof n}Amount` | `s${typeof n}Text`, ParamDoc>
}

export const equilibriumLinking = describeLinking(equilibriumSettings, {
  id: 'equilibrium-graph',
  summary:
    'A graph of every species’ concentration in mol/L (up the side) against time (along the bottom) for one of seven reversible reactions (reaction), settling to equilibrium from the starting concentrations (start1, start2, start3) and K (k), then answering up to three stresses (count, with s1Kind, s1At, s1Species, s1Amount and s1Text for the first): a species added or removed, the volume changed, or the temperature raised or lowered. The lines are solid, dashed and dotted in the order of the equation.',
  notes: [
    'Every line is solved from K, never drawn from typed levels: each stretch settles where Q = K, moving in the ratio of the coefficients, at the rate of an elementary reaction (forward rate = k_f × each reactant’s concentration to the power of its coefficient, and the same for the reverse). The first approach comes within 1% of equilibrium at the time established; the same rate constants then carry every shift.',
    'The K each setup starts with is an example value, chosen with its starting concentrations to give a clear graph. It is not the reaction’s measured K. reaction alone does not bring a setup’s example values: also set start1, start2, start3 and k, or the defaults (ammonia’s 1, 3, 0 and 0.5) are used.',
    'A temperature stress has no jump: K is multiplied or divided by s1Amount. Raising the temperature lowers K when the forward reaction is exothermic (ammonia, hi, so3, fescn) and raises it when endothermic (n2o4, pcl5); for abc, heat says which. Heating also speeds the approach, cooling slows it.',
    'A volume stress divides every concentration by s1Amount at once; the system then shifts toward the side with fewer moles when the volume falls, and not at all when both sides have the same moles (hi). For fescn, in solution, it is water added or evaporated.',
    'The axes are not fitted to the graph by the link: set xTo and xStep so the last shift has time to settle, and yTo and yStep to the highest concentration. The page says when a stress comes before the system has settled, when more is removed than is there, or when the time axis ends mid-shift.',
    'Axis ranges are text holding plain numbers. From xFrom to xTo counting by xStep makes the gridlines, at most 50 blocks per axis; nothing is drawn before time 0. xEvery=0 and yEvery=0 leave the axes unnumbered, for a sketch question.',
  ],
  params: {
    reaction: { what: 'The reaction setup.', values: setups },
    start1: start(1),
    start2: start(2),
    start3: start(3),
    k: { what: 'The equilibrium constant Kc before any temperature stress. The default is an example value chosen to give a clear graph, not the reaction’s measured K.' },
    heat: { what: 'Whether the forward reaction gives out heat or takes it in. Every other setup has its own.', when: 'reaction=abc' },
    established: { what: 'The time equilibrium is first reached (within 1%), in the x-axis’s units. It sets how fast the whole graph runs.' },
    count: { what: `How many stresses there are, 0 to ${MAX_STRESSES}. Rounded to a whole number.` },
    ...stress(1),
    ...stress(2),
    ...stress(3),
    speciesLabels: { what: 'Whether each line has its formula beside it; 0 leaves students to work out which line is which from the coefficients.' },
    color: { what: 'Whether the lines are in color (blue, red, green); 0 draws them all in black, told apart by their dashes.' },
    xFrom: range('x', 'start', 'in time units'),
    xTo: range('x', 'end', 'in time units'),
    xStep: range('x', 'gridline spacing', 'in time units'),
    yFrom: range('y', 'start', 'in mol/L'),
    yTo: range('y', 'end', 'in mol/L'),
    yStep: range('y', 'gridline spacing', 'in mol/L'),
    xEvery: { what: 'Number every nth x gridline; 0 leaves the x-axis unnumbered.', about: every },
    yEvery: { what: 'Number every nth y gridline; 0 leaves the y-axis unnumbered.', about: every },
    title: { what: 'The chart title’s words.', when: 'titleMode=text', about: SHARED_TEXT },
    titleMode: { what: 'The chart title across the top.', about: titleModes, values: TITLE_MODE_WORDS },
    xTitle: { what: 'The x-axis title’s words.', when: 'xTitleMode=text', about: SHARED_TEXT },
    xTitleMode: { what: 'The x-axis title.', about: titleModes, values: TITLE_MODE_WORDS },
    yTitle: { what: 'The y-axis title’s words.', when: 'yTitleMode=text', about: SHARED_TEXT },
    yTitleMode: { what: 'The y-axis title.', about: titleModes, values: TITLE_MODE_WORDS },
    xLabel: { what: 'The letter at the end of the x-axis.', when: 'xLabelMode=text', about: SHARED_TEXT },
    xLabelMode: { what: 'Whether the x-axis has a letter at its end.', about: labelModes },
    yLabel: { what: 'The letter at the end of the y-axis.', when: 'yLabelMode=text', about: SHARED_TEXT },
    yLabelMode: { what: 'Whether the y-axis has a letter at its end.', about: labelModes },
    xStartCap: cap('x', 'left'),
    xEndCap: cap('x', 'right'),
    yStartCap: cap('y', 'bottom'),
    yEndCap: cap('y', 'top'),
    minor: { what: 'Minor gridlines: how many parts each grid block is split into; 0 for none.', about: { type: 'choice', options: MINOR.map(String) } },
    labelSize: { what: 'How big the figure’s text is compared to its lines.', about: { type: 'choice', options: Object.keys(LABEL_SIZES) } },
  },
  examples: [
    { shows: 'N₂ + 3H₂ ⇌ 2NH₃ settling to equilibrium from 1 mol/L of N₂ and 3 mol/L of H₂, with nothing added.', settings: { established: 3 } },
    {
      shows: 'Ammonia at equilibrium, then N₂ added at time 8: its line jumps up and the system shifts toward NH₃.',
      settings: { count: 1, xTo: '16', xStep: '1', yTo: '3.2' },
    },
    {
      shows: 'N₂O₄ ⇌ 2NO₂ from 1 mol/L of N₂O₄ with K = 0.2, the volume halved at time 8: both lines double, then shift toward N₂O₄.',
      settings: { reaction: 'n2o4', start1: 1, start2: 0, k: 0.2, count: 1, s1Kind: 'volume', xTo: '16', xStep: '1', yTo: '2', yStep: '0.2', yEvery: 1 },
    },
    {
      shows: 'Ammonia with three stresses and no words, in black: N₂ added, the volume halved and the temperature raised, for students to name.',
      settings: {
        count: 3, s1Text: '', s2Text: '', s3Text: '', color: false, speciesLabels: false,
        xTo: '32', xStep: '2', yTo: '6', yStep: '0.5',
      },
    },
  ],
})
