// Rate Law Graphs' address parameters, for /linking and /llms.txt.

import { describeLinking, type ParamDoc } from '$lib/linking/define'
import { rateLawSettings } from './settings'

const TITLE_MODE_WORDS = 'text: the words given, or the title this page writes when none are; blank: a blank line for students to write on; none: nothing'
const axisTitle = (name: string, param: string, writes: string, when?: string): Record<string, ParamDoc> => ({
  [`${param}Title`]: { what: `The ${name}’s title; empty for the one this page writes, ${writes}.`, when: [when, `${param}TitleMode=text`].filter(Boolean).join(' and ') },
  [`${param}TitleMode`]: { what: `The ${name}’s title.`, when, values: TITLE_MODE_WORDS },
})

export const rateLawLinking = describeLinking(rateLawSettings, {
  id: 'rate-law-graphs',
  summary:
    'Graphs of a reactant’s concentration against time for A → products with rate = k[A]ⁿ, n (order) being 0, 1 or 2: [A], ln[A] and 1/[A] against time, all three side by side (graphs=all) or one alone. Exactly one is a straight line: [A] for zero order, ln[A] for first, 1/[A] for second. The figure never says the order, so students find it from which graph is straight.',
  notes: [
    'The integrated rate laws: zero order [A] = [A]₀ − kt; first order ln[A] = ln[A]₀ − kt; second order 1/[A] = 1/[A]₀ + kt. k is in the unit its order gives it, written from concUnit and timeUnit: M s⁻¹, s⁻¹ or M⁻¹ s⁻¹ (mol/L and mol dm⁻³ likewise). The first half-life is [A]₀/2k, ln 2/k or 1/(k[A]₀).',
    'The axes are always fitted and cannot be set: time runs from 0 until a tenth of [A]₀ is left (0.9[A]₀/k, ln 10/k or 9/(k[A]₀)), rounded up to a round step, and each graph’s y-axis fits its own values. To choose where the time axis ends, choose k.',
    'A zero-order reaction ends when [A] reaches 0, at t = [A]₀/k: its line stops there. Its data points stop when a tenth of [A]₀ is left (0.9[A]₀/k), where its ln[A] and 1/[A] axes are fitted to.',
    'curve=0 with points=1 leaves only the data points; curve=0 and points=0 with a table leaves empty grids for students to plot the table’s data on.',
    'The data are count points evenly spaced from t = 0 to the end of the time axis (for zero order, to 0.9[A]₀/k), or at the round spacing just under that. Each [A] is the model’s value, scattered by noise percent of itself (normally distributed, from seed, so the same link always draws the same data), then rounded to three significant figures; ln[A] (to three decimal places) and 1/[A] (to three significant figures) are worked out from the rounded [A]. The first point is [A]₀ exactly.',
    'species is the reactant’s formula; digits after a letter are lowered, so N2O5 is written N₂O₅, and the axis titles follow it and the units ([N₂O₅] (M), ln[N₂O₅], 1/[N₂O₅] (M⁻¹)) unless a title gives other words.',
    'guides draws dashed lines on the [A] graph only (graphs=all or conc), from [A]₀/2, [A]₀/4 and [A]₀/8 across to the curve and down to the time axis.',
  ],
  params: {
    order: { what: 'The order of the reaction in A.', values: '0: zero order; 1: first order; 2: second order' },
    a0: { what: 'The starting concentration [A]₀, in concUnit.' },
    k: { what: 'The rate constant, in the unit its order gives it (see the notes).' },
    graphs: {
      what: 'Which graphs are drawn.',
      values: 'all: [A], ln[A] and 1/[A] against time, side by side; conc: [A] against time; ln: ln[A] against time; inv: 1/[A] against time',
    },
    curve: { what: 'Whether the model’s curve is drawn on each graph.' },
    points: { what: 'Whether the data points are drawn on each graph.' },
    count: { what: 'How many data points, 5 to 10.', when: 'points=1 or table is not none' },
    noise: { what: 'The scatter on each data point’s [A], in percent of itself.', when: 'points=1 or table is not none', values: '0: none, the points lie on the curve' },
    seed: { what: 'What the scatter is drawn from: the same seed always gives the same data.', when: 'noise is not 0' },
    table: {
      what: 'A table of the data under the graphs, time across the top.',
      values: 'none: no table; conc: time and [A]; all: time, [A], ln[A] and 1/[A]',
    },
    guides: { what: 'Dashed guide lines at the first 1 to 3 half-lives, on the [A] graph; 0 for none.', when: 'graphs=all or conc' },
    guideLabels: {
      what: 'What’s written by each guide line.',
      when: 'guides=1 or more',
      values: 'times: the time, e.g. 34.7 s; halves: 1 half-life, 2 half-lives…; blank: a blank line for students; none: nothing',
    },
    species: { what: 'The reactant: a letter or a formula, e.g. A, N2O5, H2O2. Empty for A.' },
    concUnit: { what: 'The unit of concentration.' },
    timeUnit: { what: 'The unit of time.', values: 's: seconds; min: minutes; h: hours' },
    numbers: { what: 'Whether the axes are numbered; 0 gives sketch graphs showing only the shapes.' },
    gridlines: { what: 'Whether the gridlines are drawn; 0 leaves the axes, with arrows.' },
    color: { what: 'Whether the curve is blue; 0 draws it in black.' },
    title: { what: 'The chart title’s words.', when: 'titleMode=text' },
    titleMode: { what: 'The chart title across the top.', values: 'text: the words given; blank: a blank line for students to write on; none: nothing' },
    ...(axisTitle('time axis', 'time', 'e.g. Time (s)') as { timeTitle: ParamDoc; timeTitleMode: ParamDoc }),
    ...(axisTitle('[A] graph’s y-axis', 'conc', 'e.g. [A] (M)', 'graphs=all or conc') as { concTitle: ParamDoc; concTitleMode: ParamDoc }),
    ...(axisTitle('ln[A] graph’s y-axis', 'ln', 'e.g. ln[A]', 'graphs=all or ln') as { lnTitle: ParamDoc; lnTitleMode: ParamDoc }),
    ...(axisTitle('1/[A] graph’s y-axis', 'inv', 'e.g. 1/[A] (M⁻¹)', 'graphs=all or inv') as { invTitle: ParamDoc; invTitleMode: ParamDoc }),
    labelSize: { what: 'How big the figure’s text is compared to its lines.' },
  },
  examples: [
    { shows: 'A second-order reaction’s three graphs side by side: [A] and ln[A] curve, 1/[A] is the straight line.', settings: { order: '2' } },
    {
      shows: 'A zero-order reaction as data points with about 2% scatter and no curve, on all three graphs.',
      settings: { order: '0', k: 0.01, curve: false, points: true, noise: '2' },
    },
    {
      shows: 'A second-order reaction’s data table of time and [A], over three empty grids for students to plot.',
      settings: { order: '2', curve: false, table: 'conc' },
    },
    {
      shows: 'First-order [N₂O₅] against time in mol/L, with guide lines at its first three half-lives labeled with their times.',
      settings: { graphs: 'conc', species: 'N2O5', concUnit: 'mol/L', guides: 3 },
    },
  ],
})
