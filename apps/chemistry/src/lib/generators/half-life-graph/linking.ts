// Half-Life Graph's address parameters, for /linking and /llms.txt. The grid
// and axis fields come from $shared/graph, whose fields don't say what values
// they take, so those are said here from the same lists, as Mass Spectrum
// says them.

import { CAPS } from '$shared/graph/caps'
import { EVERY, LABEL_MODES, MINOR, TITLE_MODES } from '$shared/graph/axes'
import { LABEL_SIZES } from '$shared/labelSize'
import { describeLinking, type ParamDoc } from '$lib/linking/define'
import type { FieldAbout } from '$lib/shared/settings'
import { ISOTOPES, UNITS, UNIT_NAMES, timeText } from './isotopes'
import { MAX_ISOTOPES, halfLifeSettings } from './settings'

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
const setups = [...ISOTOPES.map((x) => `${x.id}: ${x.name.toLowerCase()} (${timeText(x.half, x.unit)})`), 'custom: the name, half-life and unit given'].join('; ')
const units = UNITS.map((u) => `${u}: ${UNIT_NAMES[u].many}`).join('; ')
const nth = ['first', 'second', 'third'] as const
const isotope = (n: 1 | 2 | 3) => {
  const when = n === 1 ? undefined : `count=${n} or more`
  const custom = `iso${n}=custom${when ? ` and ${when}` : ''}`
  return {
    [`iso${n}`]: { what: `The ${nth[n - 1]} isotope.`, when, values: setups },
    [`name${n}`]: { what: `The ${nth[n - 1]} isotope’s name; empty for “Isotope ${n}”.`, when: custom },
    [`half${n}`]: { what: `The ${nth[n - 1]} isotope’s half-life, in unit${n}.`, when: custom },
    [`unit${n}`]: { what: `The unit of the ${nth[n - 1]} isotope’s half-life.`, when: custom, values: units },
  } as Record<`iso${typeof n}` | `name${typeof n}` | `half${typeof n}` | `unit${typeof n}`, ParamDoc>
}

export const halfLifeLinking = describeLinking(halfLifeSettings, {
  id: 'half-life-graph',
  summary:
    'A graph of how much of a radioactive isotope is left (up the side) against time (along the bottom): N = N₀ · (½)^(t / T½), halving every half-life. Up to three isotopes on one graph (count), each a setup or custom (iso1=custom, with name1, half1 and unit1), told apart by solid, dashed and dotted lines and a key.',
  notes: [
    'Half-lives are from NNDC NuDat 3, rounded to three significant figures, except carbon-14’s: 5,730 years, the textbook value (NuDat 3 gives 5,700 ± 30).',
    'Each isotope’s half-life is converted into xUnit, a year being 365.25 days. The axes are not fitted to the isotopes by the link: set xTo and xStep for about five half-lives of the longest, e.g. xTo=30000&xStep=2000 for carbon-14 in years.',
    'quantity picks what’s up the side: percent (from 100), fraction (from 1), or the mass in g, number of nuclei or activity, each starting from start. The y-axis title follows quantity (and activityUnit) unless yTitle gives other words; the x-axis title follows xUnit unless xTitle does. The y-axis is not fitted to start either: set yTo and yStep.',
    'daughter=1 draws the first isotope’s daughter rising as N₀ − N, dashed, only when count=1, quantity is percent, fraction or nuclei, and the isotope has a stable daughter (or is custom, with daughterName): sr90, rn222, ra226 and k40 have none.',
    'guides draws dashed lines at the first isotope’s first 1 to 4 half-lives, from 50%, 25%, 12.5% and 6.25% of the starting amount across to its curve and down to the time axis; a line off the grid is left out.',
    'names=0 calls the isotopes Isotope A, B and C (alone with its daughter, Parent isotope and Daughter isotope), in the key and the screen-reader label alike, so students identify them from the half-lives they read off.',
    'Axis ranges are text holding plain numbers. From xFrom to xTo counting by xStep makes the gridlines, at most 50 blocks per axis; the time axis starts at 0, before which nothing is drawn.',
  ],
  params: {
    count: { what: `How many isotopes are drawn, 1 to ${MAX_ISOTOPES}.` },
    ...isotope(1),
    ...isotope(2),
    ...isotope(3),
    names: { what: 'Whether the isotopes are named in the key; 0 calls them Isotope A, B and C.' },
    quantity: {
      what: 'What’s up the side.',
      values: 'percent: percent remaining; fraction: fraction remaining; mass: mass in g; nuclei: number of nuclei; activity: activity in Bq or counts per minute',
    },
    start: { what: 'The starting mass in g, number of nuclei, or activity.', when: 'quantity=mass, nuclei or activity' },
    activityUnit: { what: 'The activity’s unit.', when: 'quantity=activity', values: 'Bq: becquerels; cpm: counts per minute' },
    xUnit: { what: 'The time unit along the x-axis.', values: units },
    curve: { what: 'Whether the curves are drawn; 0 leaves only the dots, or an empty grid, for students to plot.' },
    dots: { what: 'Whether each curve has a dot at each of its first 6 half-lives, and at the start when it is the only curve. A curve whose half-lives are under 12 drawing units apart on the axis gets none.' },
    daughter: { what: 'Whether the first isotope’s stable daughter is drawn, rising as the parent falls.', when: 'count=1 and quantity=percent, fraction or nuclei' },
    daughterName: { what: 'The daughter’s name; empty for “Daughter”.', when: 'iso1=custom and daughter=1' },
    guides: { what: 'Dashed guide lines at the first isotope’s first 1 to 4 half-lives; 0 for none.' },
    guideLabels: {
      what: 'What’s written by each guide line.',
      when: 'guides=1 or more',
      values: `times: the time, e.g. 5,730 years; halves: T½, 2T½, 3T½…; blank: a blank line for students; none: nothing`,
    },
    color: { what: 'Whether the curves are in color (blue, red, green); 0 draws them all in black.' },
    xFrom: range('x', 'start', 'in xUnit'),
    xTo: range('x', 'end', 'in xUnit'),
    xStep: range('x', 'gridline spacing', 'in xUnit'),
    yFrom: range('y', 'start', 'in the quantity’s units'),
    yTo: range('y', 'end', 'in the quantity’s units'),
    yStep: range('y', 'gridline spacing', 'in the quantity’s units'),
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
    { shows: 'Carbon-14’s decay curve as percent remaining against time in years, with guide lines at its first three half-lives labeled with their times.', settings: { guides: 3 } },
    {
      shows: 'Three isotopes on one graph, their names hidden as Isotope A, B and C, for students to identify from the half-lives they read off.',
      settings: { count: 3, iso1: 'h3', iso2: 'cs137', iso3: 'co60', names: false, xTo: '160', xStep: '10', xEvery: 2 },
    },
    {
      shows: 'Carbon-14 decaying to nitrogen-14, the two curves crossing at one half-life, marked by a guide line labeled T½.',
      settings: { daughter: true, guides: 1, guideLabels: 'halves' },
    },
    {
      shows: 'Iodine-131 decaying from 80 g over 45 days, with a dot at the start and at each half-life.',
      settings: { iso1: 'i131', xUnit: 'd', quantity: 'mass', start: 80, dots: true, xTo: '45', xStep: '5', xEvery: 1, yTo: '80', yStep: '10' },
    },
  ],
})
