// Phase Diagram's address parameters, for /linking and /llms.txt. The grid
// and axis fields come from $shared/graph, whose fields don't say what
// values they take, so those are said here from the same lists.

import { CAPS } from '$shared/graph/caps'
import { EVERY, LABEL_MODES, MINOR, TITLE_MODES } from '$shared/graph/axes'
import { LABEL_SIZES } from '$shared/labelSize'
import { describeLinking, type ParamDoc } from '$lib/linking/define'
import type { FieldAbout } from '$lib/shared/settings'
import { SUBSTANCES } from './phase'
import { phaseSettings } from './settings'

/** The most characters $shared's text() keeps. */
const SHARED_TEXT: FieldAbout = { type: 'text', maxLength: 120 }
const titleModes: FieldAbout = { type: 'choice', options: TITLE_MODES }
const TITLE_MODE_WORDS = 'text: the words given; blank: a blank line for students to write on; none: nothing'
const labelModes: FieldAbout = { type: 'choice', options: LABEL_MODES }
const caps: FieldAbout = { type: 'choice', options: Object.keys(CAPS) }
const every: FieldAbout = { type: 'choice', options: EVERY.map(String) }
const GRID = 'substance=custom and axes=numbered'
const OWN = 'substance=custom'
const range = (axis: 'x' | 'y', end: string, unit: string): ParamDoc => ({
  what: `The ${axis}-axis’s ${end}, ${unit}, written as a plain number (e.g. 0, 2.5).`,
  when: GRID,
  about: SHARED_TEXT,
})
const cap = (axis: 'x' | 'y', end: string, when?: string): ParamDoc => ({ what: `How the ${axis}-axis’s ${end} end is finished.`, when, about: caps })
const LABEL_WORDS = 'names: its name; letters: a letter, A, B, C…, for questions; blank: a blank line for students; none: nothing'
const substances = SUBSTANCES.map((x) => `${x.id}: ${x.name.toLowerCase()}`).join('; ')

export const phaseLinking = describeLinking(phaseSettings, {
  id: 'phase-diagram',
  summary:
    'A one-substance phase diagram: pressure (up the side) against temperature (along the bottom), with the sublimation curve, the fusion line and the vaporization curve meeting at the triple point and the vaporization curve ending at the critical point. The substance is a real one (drawn not to scale, its real values written at the axes) or your own (substance=custom, from its triple point, critical point and normal melting and boiling points), which can also go on numbered axes, to scale (axes=numbered).',
  notes: [
    'A real substance is always drawn not to scale (axes=shape): the figure has the textbook’s shape, and the triple and critical points’ real temperatures and pressures are written at the axes where dashed lines from each point land. axes=numbered is ignored for a real substance.',
    'For substance=custom the six values tripleT, tripleP, critT, critP, nmp and nbp are in the units tUnit and pUnit choose; the link doesn’t convert them. The critical point must be hotter and at a higher pressure than the triple point, the triple point’s pressure below 1 atm (101.325 kPa) and the critical pressure above it, and nmp and nbp either side of the temperature a straight line from the triple point to the critical point reaches 1 atm at, or nothing is drawn.',
    'With axes=numbered the diagram is drawn to scale on the axes the range parameters give; the link doesn’t fit them to the diagram, so set xFrom, xTo, xStep, yFrom, yTo and yStep to take in both points. The sublimation curve starts at the grid’s bottom left corner.',
    'Water’s fusion line leans left; every other real substance’s leans right. Your own leans left when nmp is below tripleT. Carbon dioxide’s triple point is above 1 atm, so its 1 atm line crosses only the sublimation curve.',
    'Everything set to letters shares one run of A, B, C…: the regions, the boundaries, the points, then the 1 atm crossings. shuffle=0 keeps that order; any other whole number reorders them, the same way every time.',
    'The axis titles “Temperature (°C)”, “Temperature (K)”, “Pressure (atm)” and “Pressure (kPa)” follow tUnit and pUnit; any other xTitle or yTitle is written as given.',
  ],
  params: {
    substance: { what: 'The substance.', values: `${substances}; custom: your own, from the six values below` },
    axes: { what: 'How the axes are drawn.', when: OWN, values: 'shape: not to scale, with no numbers along the axes; numbered: numbered axes and gridlines, to scale' },
    tUnit: { what: 'The temperature unit.', values: 'C: °C; K: kelvin' },
    pUnit: { what: 'The pressure unit.', values: 'atm; kPa' },
    name: { what: 'Your own substance’s name, for the answer key and the figure’s description.', when: OWN },
    tripleT: { what: 'The triple point’s temperature, in tUnit.', when: OWN },
    tripleP: { what: 'The triple point’s pressure, in pUnit.', when: OWN },
    critT: { what: 'The critical point’s temperature, in tUnit.', when: OWN },
    critP: { what: 'The critical point’s pressure, in pUnit.', when: OWN },
    nmp: { what: 'The normal melting point (at 1 atm), in tUnit. The fusion line runs from the triple point through it.', when: OWN },
    nbp: { what: 'The normal boiling point (at 1 atm), in tUnit. On a grid the vaporization curve passes through it.', when: OWN },
    regions: { what: 'How the solid, liquid and gas regions are labeled.', values: LABEL_WORDS },
    points: { what: 'How the triple and critical points are labeled; their dots are always drawn, and a blank line is joined to its dot by a short line.', values: LABEL_WORDS },
    curves: {
      what: 'How the phase boundaries are labeled.',
      values: 'none: nothing; names: “Melting / freezing”, “Boiling / condensing” and “Sublimation / deposition” written along them; letters: a letter beside a small dot on each; blank: a blank line along each',
    },
    guides: { what: 'Whether dashed lines run from the triple and critical points to both axes.' },
    axisValues: {
      what: 'What is written at the axes where the dashed lines from the triple and critical points land.',
      when: 'axes=shape',
      values: 'values: the temperature and pressure (0.01 °C, 0.00604 atm); blank: a blank line for students; none: nothing',
    },
    isobar: { what: 'Whether a dashed line crosses the graph at 1 atm (101.3 kPa), named at the pressure axis (on a grid, on the graph), with a dot where it crosses each boundary and a dashed line down from each, except, not to scale, from a crossing with no value to write at its foot.' },
    normalPoints: {
      what: 'What marks each place the 1 atm line crosses a boundary: under the temperature axis not to scale, beside the dot on a grid.',
      when: 'isobar=1',
      values: 'values: the temperature (100.0 °C); names: Normal m.p., Normal b.p. or Sublimation point; letters: a letter; blank: a blank line for students; none: nothing',
    },
    supercritical: { what: 'Whether dashed lines run up and right from the critical point, with the region past them labeled Supercritical fluid as the other regions are.' },
    shuffle: { what: 'A seed reordering the letters; 0 keeps them in order.' },
    color: { what: 'The boundaries’ color.' },
    xFrom: range('x', 'start', 'in tUnit'),
    xTo: range('x', 'end', 'in tUnit'),
    xStep: range('x', 'gridline spacing', 'in tUnit'),
    yFrom: range('y', 'start', 'in pUnit'),
    yTo: range('y', 'end', 'in pUnit'),
    yStep: range('y', 'gridline spacing', 'in pUnit'),
    xEvery: { what: 'Number every nth x gridline; 0 leaves the x-axis unnumbered.', when: GRID, about: every },
    yEvery: { what: 'Number every nth y gridline; 0 leaves the y-axis unnumbered.', when: GRID, about: every },
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
    xStartCap: cap('x', 'left', GRID),
    xEndCap: cap('x', 'right'),
    yStartCap: cap('y', 'bottom', GRID),
    yEndCap: cap('y', 'top'),
    minor: { what: 'Minor gridlines: how many parts each grid block is split into; 0 for none.', when: GRID, about: { type: 'choice', options: MINOR.map(String) } },
    labelSize: { what: 'How big the figure’s text is compared to its lines.', about: { type: 'choice', options: Object.keys(LABEL_SIZES) } },
  },
  examples: [
    {
      shows: 'The phase diagram of water, not to scale, with the 1 atm line: its regions and its triple and critical points named, their temperatures and pressures written at the axes, and the normal melting and boiling points, 0.00 °C and 100.0 °C, under the crossings.',
      settings: { isobar: true },
    },
    {
      shows: 'The phase diagram of carbon dioxide with the 1 atm line, which crosses only the sublimation curve, at −78.5 °C.',
      settings: { substance: 'co2', isobar: true },
    },
    {
      shows: 'A worksheet on a made-up substance on a numbered grid: the regions, the points and the 1 atm crossings lettered for students to name.',
      settings: { substance: 'custom', axes: 'numbered', regions: 'letters', points: 'letters', isobar: true, normalPoints: 'letters' },
    },
  ],
})
