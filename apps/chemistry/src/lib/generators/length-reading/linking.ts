// Length Reading's address parameters, for /linking and /llms.txt.

import { describeLinking } from '$lib/linking/define'
import { figureTextDocs, spanDoc } from '$lib/linking/common'
import { OBJECT_NAMES } from '../volume-by-displacement/objects'
import { JAW_OBJECT_NAMES } from './instrument'
import { METRIC_MARK_NAMES, READ_NAMES } from './ruler'
import { INSTRUMENT_NAMES, lengthSettings } from './settings'

export const lengthLinking = describeLinking(lengthSettings, {
  id: 'length-reading',
  summary:
    'A ruler, a caliper or a micrometer, picked by instrument. On a metric (cm) or imperial (inch) ruler an object lies along its top edge: length is the object’s length and start is where its left end sits, both in the ruler’s unit; start=0 lines it up with the 0 mark. A caliper or micrometer holds an object in its jaws at the reading caliper or micrometer, in mm.',
  notes: [
    'The ruler parameters (system to span) apply only when instrument=ruler; leastCount, caliper and caliperZero only when instrument=caliper; micrometerRead, micrometer and micrometerZero only when instrument=micrometer; closed, jaws, jawsLabel, printed and closeUp to both the caliper and the micrometer.',
    'caliper is rounded to its leastCount (0.1, 0.05 or 0.02 mm) and kept from 0 to 150 mm; micrometer is rounded to 0.001 mm with micrometerRead=estimate (one digit past the thimble’s marks) or 0.01 mm with micrometerRead=mark, and kept from 0 to 25 mm. A zero error (caliperZero up to ±0.5 mm, micrometerZero up to ±0.05 mm) is rounded the same way, and the reading is never below it. The jaws are the reading minus the zero error apart, and the answer key gives the reading, the zero error and the corrected reading.',
    'cm, metricMarks and read apply only when system=metric; inches and imperialMarks only when system=imperial.',
    '5 cm and 10 cm marks (metricMarks=five or ten) are only for the 50 and 100 cm rulers; on a shorter ruler they become 1 cm marks.',
    'length and start are rounded to what the ruler reads: with read=estimate, one digit past the smallest mark (1 mm marks to 0.01 cm; 1 cm and 0.5 cm marks to 0.1 cm; 5 and 10 cm marks to 1 cm); with read=mark, to the nearest mark. Imperial lengths always land on a mark: write them as decimals (3.375 for 3 3/8 in).',
    'length is at least 0.5 cm (or 0.25 in, or one reading step if bigger) and start is kept so the object stays on the ruler.',
  ],
  params: {
    system: { what: 'Which kind of ruler.', values: 'metric: centimeters; imperial: inches' },
    cm: { what: 'The metric ruler’s length in cm (100 is a meter stick).', when: 'system=metric' },
    inches: { what: 'The imperial ruler’s length in inches.', when: 'system=imperial' },
    metricMarks: {
      what: 'The metric ruler’s smallest marks.',
      when: 'system=metric',
      values: Object.entries(METRIC_MARK_NAMES).map(([id, name]) => `${id}: ${name}`).join('; '),
    },
    imperialMarks: { what: 'Marks per inch on the imperial ruler (16 is sixteenths).', when: 'system=imperial' },
    read: {
      what: 'How far a metric reading goes.',
      when: 'system=metric',
      values: Object.entries(READ_NAMES).map(([id, name]) => `${id}: ${name.toLowerCase()}`).join('; '),
    },
    object: {
      what: 'The object lying along the ruler.',
      values: Object.entries(OBJECT_NAMES).map(([id, name]) => `${id}: ${name.toLowerCase()}`).join('; '),
    },
    marbles: { what: 'How many marbles, in a row. Rounded to a whole number.', when: 'object=marbles' },
    guides: { what: 'Dashed lines from the object’s ends down to the ruler, for round objects whose ends are above where they touch it.' },
    length: { what: 'The object’s length, in cm or inches.', values: 'Rounded to what the ruler reads (see notes)' },
    start: { what: 'Where the object’s left end sits on the ruler, in cm or inches; 0 lines it up with the 0 mark.' },
    view: { what: 'Whether magnified circles are drawn at the object’s ends: one on its right end, and one on its left end when that isn’t at 0.', values: 'both: ruler and magnifiers; whole: ruler only' },
    span: spanDoc('view=both'),
    instrument: {
      what: 'What the length is read from.',
      values: Object.entries(INSTRUMENT_NAMES).map(([id, name]) => `${id}: ${name.toLowerCase()}`).join('; '),
    },
    leastCount: {
      what: 'The caliper’s least count in mm: its sliding scale has 10 divisions over 9 mm (0.1), 20 over 39 mm (0.05) or 50 over 49 mm (0.02).',
      when: 'instrument=caliper',
    },
    caliper: { what: 'The caliper’s reading in mm: where the zero of its sliding scale sits on the main scale.', when: 'instrument=caliper' },
    caliperZero: { what: 'What the caliper reads with its jaws closed, in mm; 0 for no zero error.', when: 'instrument=caliper' },
    micrometerRead: {
      what: 'How far the micrometer is read: one estimated digit past the thimble’s marks, to 0.001 mm (estimate), or to the nearest mark, 0.01 mm (mark).',
      when: 'instrument=micrometer',
    },
    micrometer: { what: 'The micrometer’s reading in mm: the sleeve to the half mm plus the thimble in 0.01 mm, and an estimated 0.001 mm with micrometerRead=estimate.', when: 'instrument=micrometer' },
    micrometerZero: { what: 'What the micrometer reads closed, in mm; 0 for no zero error.', when: 'instrument=micrometer' },
    closed: { what: 'With a zero error, also draws the instrument closed above the measuring one, with its own close-up.', when: 'instrument=caliper or micrometer' },
    jaws: {
      what: 'What the caliper’s or micrometer’s jaws hold, drawn as wide as the reading less the zero error.',
      when: 'instrument=caliper or micrometer',
      values: Object.entries(JAW_OBJECT_NAMES).map(([id, name]) => `${id}: ${name.toLowerCase()}`).join('; '),
    },
    jawsLabel: { what: 'A short label by the object in the jaws.', when: 'instrument=caliper or micrometer, and jaws is not none' },
    printed: { what: 'Prints the least count on the caliper’s slider or the micrometer’s frame, as on real ones.', when: 'instrument=caliper or micrometer' },
    closeUp: {
      what: 'Whether close-ups of the scales are drawn: on a caliper a strip of the main and sliding scales; on a micrometer a magnified circle of the sleeve and thimble.',
      when: 'instrument=caliper or micrometer',
      values: 'both: the instrument and its close-up; magnifier: the close-up alone; whole: the instrument alone',
    },
    ...figureTextDocs('Length: 4.37 cm'),
  },
  examples: [
    { shows: 'A metal cylinder 6.42 cm long on a 15 cm ruler marked in mm, starting at 0, with the answer key.', settings: { length: 6.42, answerKey: true } },
    { shows: 'A cube 2 3/8 in long on a 6 in ruler marked in eighths, with no magnifiers.', settings: { system: 'imperial', imperialMarks: '8', object: 'cube', length: 2.375, view: 'whole' } },
    { shows: 'A 0.02 mm caliper reading 41.38 mm with a zero error of +0.04 mm, drawn closed as well, with the answer key.', settings: { instrument: 'caliper', leastCount: '0.02', caliper: 41.38, caliperZero: 0.04, answerKey: true } },
    { shows: 'A micrometer holding a wire, reading 5.51 mm, with the magnifier alone.', settings: { instrument: 'micrometer', micrometer: 5.51, jaws: 'wire', closeUp: 'magnifier' } },
  ],
})
