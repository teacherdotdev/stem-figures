// Chromatography's address parameters, for /linking and /llms.txt.

import { describeLinking } from '$lib/linking/define'
import { figureTextDocs } from '$lib/linking/common'
import { INK_COLORS, MAX_FRONT, MAX_NAME, MAX_SAMPLES, MAX_SPOTS } from './inks'
import { MAX_SOLVENT, chromatographySettings } from './settings'

export const chromatographyLinking = describeLinking(chromatographySettings, {
  id: 'chromatography',
  summary:
    'A paper chromatogram: inks spotted on a pencil origin line, each separated into colored spots the solvent has carried up the paper to a dashed solvent front. It can show the paper before the solvent ran beside it, hang it from a glass rod in a beaker of solvent, and mark each spot’s distance from the origin line.',
  notes: [
    `samples is 1 to ${MAX_SAMPLES} inks joined by underscores, each a name (up to ${MAX_NAME} characters, no : _ or ,), a colon and 1 to ${MAX_SPOTS} spots joined by commas, each a color and a distance in cm joined by a hyphen: samples=A:blue-5.6,yellow-2.4_B:red-4.4. URL-encode a space in a name as + or %20.`,
    `Colors are ${INK_COLORS.join(', ')}. Distances are rounded to 0.1 cm and kept between 0 (a dye that doesn’t dissolve) and front.`,
    'The answer key gives each spot’s Rf: its distance divided by front, to 2 decimal places.',
  ],
  params: {
    samples: {
      what: 'The inks spotted on the origin line, left to right, and how far each of their colors traveled (see notes).',
      about: { type: 'format', syntax: `name:color-distance,… joined by underscores, e.g. A:blue-5.6,yellow-2.4_B:red-4.4 (1 to ${MAX_SAMPLES})` },
    },
    front: { what: 'How far the solvent front is above the origin line, in cm.', values: `Rounded to 0.1 cm, up to ${MAX_FRONT}` },
    show: { what: 'Which papers the figure shows.', values: 'after: the paper after the solvent has run; both: the paper before it (each ink a single spot on the origin line) beside the paper after' },
    setup: { what: 'Hangs the paper from a glass rod in a beaker, dipping into the solvent below the origin line; 0 draws the paper alone.' },
    measurements: { what: 'Draws an arrow from the origin line to the middle of each spot that moved, and one to the solvent front, each labeled in cm.' },
    labels: { what: 'Names the parts to the right of the figure: the glass rod, paper, solvent front, pencil line (origin), solvent and beaker.' },
    solvent: { what: 'What the solvent’s label calls it.', when: 'labels=1 and setup=1', values: `Up to ${MAX_SOLVENT} characters` },
    ...figureTextDocs('A: blue Rf = 0.70, yellow Rf = 0.30'),
  },
  examples: [
    { shows: 'Three inks after the solvent has run, in a beaker of water, with the setup’s parts labeled.', settings: { labels: true } },
    { shows: 'The same inks before and after, with the distances marked for working out Rf.', settings: { show: 'both', measurements: true } },
    {
      shows: 'Just the paper: an unknown ink X and two known dyes, measured, with the Rf values in the answer key.',
      settings: {
        setup: false,
        measurements: true,
        answerKey: true,
        samples: [
          { name: 'X', spots: [{ color: 'red', distance: 3.2 }, { color: 'blue', distance: 6 }] },
          { name: 'Red', spots: [{ color: 'red', distance: 3.2 }] },
          { name: 'Blue', spots: [{ color: 'blue', distance: 6 }] },
        ],
      },
    },
  ],
})
