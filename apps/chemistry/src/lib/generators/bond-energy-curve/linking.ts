// Bond Energy Curve's address parameters, for /linking and /llms.txt. The
// grid and axis fields come from $shared/graph, whose fields don't say what
// values they take, so those are said here from the same lists, as Half-Life
// Graph says them.

import { CAPS } from '$shared/graph/caps'
import { EVERY, LABEL_MODES, MINOR, TITLE_MODES } from '$shared/graph/axes'
import { LABEL_SIZES } from '$shared/labelSize'
import { describeLinking, type ParamDoc } from '$lib/linking/define'
import type { FieldAbout } from '$lib/shared/settings'
import { BOND_NAMES, MAX_BONDS, bondSettings } from './settings'

/** The most characters $shared's text() keeps. */
const SHARED_TEXT: FieldAbout = { type: 'text', maxLength: 120 }
const titleModes: FieldAbout = { type: 'choice', options: TITLE_MODES }
const TITLE_MODE_WORDS = 'text: the words given; blank: a blank line for students to write on; none: nothing'
const labelModes: FieldAbout = { type: 'choice', options: LABEL_MODES }
const caps: FieldAbout = { type: 'choice', options: Object.keys(CAPS) }
const every: FieldAbout = { type: 'choice', options: EVERY.map(String) }
const range = (axis: 'x' | 'y', end: string, unit: string): ParamDoc => ({
  what: `The ${axis}-axis’s ${end}, ${unit}, written as a plain number (e.g. 0, 2.5, -350).`,
  when: 'axes=numbered',
  about: SHARED_TEXT,
})
const cap = (axis: 'x' | 'y', end: string): ParamDoc => ({ what: `How the ${axis}-axis’s ${end} end is finished.`, about: caps })
const nth = ['first', 'second', 'third'] as const
const bond = (n: 1 | 2 | 3) => {
  const when = n === 1 ? undefined : `count=${n} or more`
  return {
    [`name${n}`]: { what: `The ${nth[n - 1]} bond’s name, as the key writes it (e.g. H–H, C=C); empty for “Bond ${n}”. It starts as the made-up “${BOND_NAMES[n - 1]}”.`, when },
    [`length${n}`]: { what: `The ${nth[n - 1]} bond’s bond length, where its curve is lowest.`, when, values: 'always in pm, whatever lengthUnit shows' },
    [`energy${n}`]: { what: `The ${nth[n - 1]} bond’s bond energy, how far below 0 its curve’s lowest point is.`, when, values: 'in kJ/mol' },
  } as Record<`name${typeof n}` | `length${typeof n}` | `energy${typeof n}`, ParamDoc>
}

export const bondLinking = describeLinking(bondSettings, {
  id: 'bond-energy-curve',
  summary:
    'A graph of potential energy (up the side) against internuclear distance (along the bottom) for a covalent bond: a curve that falls steeply to its lowest point, at the bond length and at minus the bond energy, then rises toward 0, the energy of the separated atoms. Up to three bonds on one graph (count), each a name, a bond length in pm and a bond energy in kJ/mol (name1, length1, energy1), told apart by solid, dashed and dotted lines and a key.',
  notes: [
    'Every bond is the name and the two numbers given. The defaults, Bond X (150 pm, 300 kJ/mol), Bond Y (120 pm, 500 kJ/mol) and Bond Z (200 pm, 200 kJ/mol), are made up, not real bonds: give a real bond’s name, length and energy from a table of bond lengths and bond energies.',
    'Each curve is E(r) = D · [(1 − e^(−a(r − r₀)))² − 1] with a = 3 / r₀, where r₀ is the bond length and D the bond energy, so its minimum is exactly at (r₀, −D), it crosses 0 at 0.77 r₀ and it is −0.10 D at 2 r₀. Every curve has the same shape, stretched to its r₀ and D: read the minimum, not the width of the well.',
    'The axes are not fitted to the bonds by the link. Set xFrom, xTo and xStep (in lengthUnit) for 0 to about three times the longest bond length, and yFrom, yTo and yStep for just below minus the largest bond energy up to about a quarter of it above 0, with 0 on a gridline: e.g. xTo=450&xStep=25 and yFrom=-550&yTo=150&yStep=50 for bonds of up to 150 pm and 500 kJ/mol. axes=shape fits them itself.',
    'lengthUnit changes the unit lengths are shown in (pm, Å or nm), on the distance axis and in the guide lines’ labels; length1 to length3 stay in pm, and xFrom, xTo and xStep are in lengthUnit. The axis titles follow lengthUnit and unit unless xTitle or yTitle gives other words.',
    'names=0 calls the bonds Bond A, B and C, in the key and the screen-reader label alike, so students match them to a table of bond lengths and energies. It needs count=2 or more: one bond is always named.',
    'axes=shape leaves out the numbers and gridlines, fits both axes to the curves and keeps only the 0 on the energy axis; the range, numbering and gridline parameters then do nothing.',
    'Axis ranges are text holding plain numbers. From xFrom to xTo counting by xStep makes the gridlines, at most 50 blocks per axis. The axes run along the grid’s left and bottom edges, and the zero line is drawn across the grid at 0.',
  ],
  params: {
    count: { what: `How many bonds are drawn, 1 to ${MAX_BONDS}.` },
    ...bond(1),
    ...bond(2),
    ...bond(3),
    names: { what: 'Whether the bonds are named in the key; 0 calls them Bond A, B and C.', when: 'count=2 or more' },
    lengthUnit: { what: 'The unit lengths are shown in.', values: 'pm: picometers; angstrom: ångströms (Å); nm: nanometers' },
    unit: { what: 'How the energy unit is written.', values: 'kj-per-mol: kJ/mol; kj-mol-1: kJ mol⁻¹' },
    axes: { what: 'Whether the axes are numbered.', values: 'numbered: numbers and gridlines; shape: no numbers or gridlines, fitted to the curves, with only the 0 on the energy axis' },
    guides: { what: 'Whether dashed guide lines run from each curve’s minimum across to the energy axis and down to the distance axis.' },
    guideLabels: {
      what: 'What’s written by each guide line’s foot.',
      when: 'guides=1',
      values: 'values: the bond length and the energy, e.g. 150 pm and −300 kJ/mol; words: Bond length and Bond energy; blank: a blank line for students; none: nothing',
    },
    dots: { what: 'Whether each curve has a dot on its minimum.' },
    regions: {
      what: 'Whether “Repulsion” is written beside the steep wall left of the minimum and “Attraction” along the rise right of it.',
      when: 'count=1',
      values: 'words: the two words; blank: a blank line for each; none: nothing',
    },
    color: { what: 'Whether the curves are in color (blue, red, green); 0 draws them all in black. Either way they are solid, dashed and dotted.' },
    gridlines: { what: 'How the gridlines are drawn.', when: 'axes=numbered', values: 'light: gray; standard: black; bold: heavier, for photocopies; none: a tick at each block instead' },
    xFrom: range('x', 'start', 'in lengthUnit'),
    xTo: range('x', 'end', 'in lengthUnit'),
    xStep: range('x', 'gridline spacing', 'in lengthUnit'),
    yFrom: range('y', 'start', 'in kJ/mol'),
    yTo: range('y', 'end', 'in kJ/mol'),
    yStep: range('y', 'gridline spacing', 'in kJ/mol'),
    xEvery: { what: 'Number every nth x gridline; 0 leaves the x-axis unnumbered.', when: 'axes=numbered', about: every },
    yEvery: { what: 'Number every nth y gridline, counting from 0; 0 leaves the y-axis unnumbered.', when: 'axes=numbered', about: every },
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
    minor: { what: 'Minor gridlines: how many parts each grid block is split into; 0 for none.', when: 'axes=numbered', about: { type: 'choice', options: MINOR.map(String) } },
    labelSize: { what: 'How big the figure’s text is compared to its lines.', about: { type: 'choice', options: Object.keys(LABEL_SIZES) } },
  },
  examples: [
    { shows: 'The made-up Bond X, 150 pm and 300 kJ/mol, with dashed guide lines from its minimum to both axes, labeled 150 pm and −300 kJ/mol.', settings: { guides: true } },
    {
      shows: 'Two made-up bonds on one graph, Bond X and the shorter, stronger Bond Y, with a key.',
      settings: { count: 2, yFrom: '-550', yTo: '150', yStep: '50', yEvery: 2 },
    },
    {
      shows: 'Three made-up bonds with their names hidden as Bond A, B and C, for students to match to a table of bond lengths and energies.',
      settings: { count: 3, names: false, xTo: '600', xStep: '50', xEvery: 2, yFrom: '-550', yTo: '150', yStep: '50', yEvery: 2 },
    },
    {
      shows: 'The shape of the curve with no numbers, “Repulsion” and “Attraction” marked either side of the minimum.',
      settings: { axes: 'shape', regions: 'words', xEndCap: 'triangle', yEndCap: 'triangle' },
    },
  ],
})
