// Nuclide Notation's address parameters, for /linking and /llms.txt.

import { describeLinking } from '$lib/linking/define'
import { figureTextDocs } from '$lib/linking/common'
import { PARTICLE_INFO, PARTICLES, SYMBOL_TEXT } from './particles'
import { MAX_CHARGE, MAX_MASS, MAX_SYMBOL, MIN_CHARGE, nuclideSettings } from './settings'

const part = (name: string, when?: string) => ({
  what: `How the ${name} is drawn.`,
  when,
  values: 'shown: its value; blank: an empty box or line (see blank) for students; off: left out',
})

export const nuclideLinking = describeLinking(nuclideSettings, {
  id: 'nuclide-notation',
  summary:
    'One nuclide symbol: an element (kind=element), your own symbol (kind=custom) or a nuclear particle (kind=particle), with its mass number at the top left, atomic number at the bottom left and charge at the top right, or written in hyphen notation (carbon-14). Any position can be shown, left blank for students or left out.',
  notes: [
    `z is the atomic number (protons) and mass the mass number (protons plus neutrons); there are no proton, neutron or electron parameters. For kind=element, z is 1 to 118 and picks the element. mass is never below z (it’s raised to z) and charge is never above z (fewer than 0 electrons). Both are rounded to whole numbers.`,
    `charge is written as chemists write it: 2+, − or 3−, never +2 or 1+. ${MIN_CHARGE} to ${MAX_CHARGE}; 0 draws no charge.`,
    `kind=particle draws ${PARTICLES.map((p) => `${p} (${PARTICLE_INFO[p].mass} over ${PARTICLE_INFO[p].zText})`).join(', ')}, ignoring z, mass, charge and symbol. A particle has no charge position and no hyphen notation.`,
    `particleSymbol must be one the particle can be written with (alpha: He or alpha; beta and positron: e or beta; proton: p or H); otherwise the particle’s first is used. ${Object.entries(SYMBOL_TEXT).filter(([id, text]) => id !== text).map(([id, text]) => `${id} is written ${text}`).join(', ')}.`,
    'Hyphen notation shows only the symbol (or name) and mass number, each shown, blank or off as symbolPart and massPart say.',
  ],
  params: {
    kind: { what: 'What the symbol is.', values: 'element: an element, by z; custom: the symbol given; particle: a nuclear particle' },
    z: { what: 'The atomic number: the number of protons.', when: 'kind=element or kind=custom' },
    mass: { what: 'The mass number: protons plus neutrons.', values: `Up to ${MAX_MASS}`, when: 'kind=element or kind=custom' },
    charge: { what: 'The charge: protons minus electrons.', when: 'kind=element or kind=custom' },
    symbol: { what: `Your own symbol, such as X or ?, up to ${MAX_SYMBOL} characters.`, when: 'kind=custom' },
    particle: { what: 'Which nuclear particle.', when: 'kind=particle', values: 'beta is a beta-minus particle (an electron); positron is beta-plus' },
    particleSymbol: { what: 'The symbol the particle is written with.', when: 'kind=particle' },
    massPart: part('mass number'),
    zPart: part('atomic number', 'notation=symbol or notation=both'),
    symbolPart: part('symbol (and in hyphen notation, the name)'),
    chargePart: part('charge', 'notation=symbol or notation=both, and kind is not particle'),
    blank: { what: 'How a blank position is drawn.', values: 'box: an empty box; line: a line to write on' },
    notation: { what: 'How the nuclide is written.', values: 'symbol: the symbol with its numbers; hyphen: hyphen notation alone (carbon-14); both: hyphen notation under the symbol' },
    hyphenName: { what: 'What hyphen notation starts with.', when: 'kind=element and notation=hyphen or both', values: 'name: the element’s name (carbon-14); symbol: its symbol (C-14)' },
    font: { what: 'The font.', values: 'sans: Arial; serif: Times New Roman' },
    ...figureTextDocs(''),
    answerKey: {
      what: 'Prints the answer key under the figure: what it is (e.g. “Chlorine-37 ion, Cl⁻”), its protons, neutrons and electrons (a particle’s numbers), and the value of each blank.',
    },
  },
  examples: [
    { shows: 'Carbon-14 as ¹⁴₆C, with “carbon-14” written under it.', settings: { mass: 14, notation: 'both' } },
    { shows: 'The chlorine-37 ion ³⁷Cl⁻, without its atomic number, with the answer key.', settings: { z: 17, mass: 37, charge: -1, zPart: 'off', answerKey: true } },
    { shows: 'Uranium-235 with its atomic number left as a blank box for students.', settings: { z: 92, mass: 235, zPart: 'blank' } },
    { shows: 'A beta particle written ⁰₋₁β, in Times New Roman.', settings: { kind: 'particle', particle: 'beta', particleSymbol: 'beta', font: 'serif' } },
  ],
})
