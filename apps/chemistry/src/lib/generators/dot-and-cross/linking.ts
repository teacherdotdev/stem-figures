// Dot-and-Cross Diagram's address parameters, for /linking and /llms.txt.

import { describeLinking } from '$lib/linking/define'
import { figureTextDocs } from '$lib/linking/common'
import { METALS, NON_METALS } from './ionic'
import { MAX_EVERY, MAX_FORMULA, dotCrossSettings } from './settings'

const list = (items: string[]) => `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`

export const dotCrossLinking = describeLinking(dotCrossSettings, {
  id: 'dot-and-cross',
  summary:
    'A UK-style dot-and-cross diagram of one covalent molecule, one binary ionic compound, or one atom or ion, from formula: each shell a circle around the element symbol, each electron a dot or a cross by the atom it came from. What formula is decides which of the three is drawn.',
  notes: [
    'formula is a formula such as H2O, CH4, C2H4, MgCl2 or Al2O3, or one element such as Na, Cl-, Na+ or Mg 2+ (a charge of 2 or more needs a space, ^ or parentheses before it: Mg2+ would be two Mg atoms). URL-encode it: a space is + or %20 and a plus sign is %2B, so Na+ is formula=Na%2B and Mg 2+ is formula=Mg+2%2B. Names also work: water, ethene, magnesium chloride, sodium, chloride ion.',
    `A formula with one of the metals ${list(METALS)} is an ionic compound of that metal with one of ${list(NON_METALS)}. Each ion’s charge comes from its group, and the charges must balance (MgCl is refused; MgCl2 balances). Compounds with polyatomic ions, like NaOH, aren’t drawn.`,
    'One element alone is its atom, or with its usual charge its ion, from H to Ca (Z 1 to 20). Any other formula is a covalent molecule, drawn when its Lewis structure (octet rule) has every formal charge 0 and no atom past an octet: CO, SO2, O3 and anything needing a dative bond aren’t drawn, nor are polyatomic ions.',
    'In a molecule the central atom’s electrons are dots, the outer atoms’ crosses and a third kind of atom’s open circles (open squares for a fourth); two bonded atoms of one element are told apart. In an ionic compound the metal’s electrons are crosses and the non-metal’s dots, so a non-metal’s gained electrons are crosses. An atom’s own electrons are dots and an anion’s gained ones crosses. swap trades dots and crosses.',
    'A metal ion shows the full shell it is left with (Na⁺ is a ring of 8 crosses), and a non-metal ion a full outer shell; every ion is drawn in square brackets with its charge.',
  ],
  params: {
    formula: { what: 'The molecule, ionic compound, atom or ion, as a formula or a name (see notes).', values: `Up to ${MAX_FORMULA} characters` },
    which: { what: 'Which listed molecule, by id, when several share the formula’s atoms (C2H6O: ethanol or dimethyl-ether).', values: 'A listed id' },
    shells: { what: 'Which shells a molecule or ionic compound shows.', values: 'outer: outer shells only; all: every shell, the inner ones kept clear of the overlaps' },
    atomShells: { what: 'Which shells an atom or ion on its own shows.', values: 'outer: its outer shell only; all: every shell' },
    layout: {
      what: 'How an ionic compound’s ions are laid out.',
      values: `auto: every ion up to ${MAX_EVERY} ions, numbered beyond; every: every ion drawn, the single ion in the middle; numbered: one of each ion with its number in front, as 2[Cl]⁻`,
    },
    swap: { what: 'Trades dots and crosses.' },
    color: { what: 'Draws each kind of mark in its own color instead of black.' },
    blank: { what: 'Leaves the electrons off, keeping the circles, symbols and brackets, for students to draw them.' },
    charges: { what: 'How each ion’s charge is shown.', values: 'show: written at the top right of its brackets; blank: an empty box there for students; none: left off' },
    ...figureTextDocs('Mg loses 2 electrons, one to each Cl.'),
    answerKey: {
      what: 'Prints the answer key under the figure: each atom’s bonding and lone pairs for a molecule; the electrons moved and each ion’s arrangement, like Mg²⁺ 2,8; Cl⁻ 2,8,8, for an ionic compound; the arrangement for an atom or ion.',
    },
  },
  examples: [
    { shows: 'Methane, CH₄: the C atom’s outer shell overlapping four H atoms’, C’s electrons as dots and H’s as crosses.', settings: { formula: 'CH4' } },
    { shows: 'Magnesium chloride, MgCl₂: Cl⁻ Mg²⁺ Cl⁻ in square brackets, with the answer key.', settings: { formula: 'MgCl2', answerKey: true } },
    { shows: 'Aluminum oxide, Al₂O₃, drawn with every ion rather than numbered.', settings: { formula: 'Al2O3', layout: 'every' } },
    { shows: 'Ethene, C₂H₄, with every shell and the electrons left blank for students.', settings: { formula: 'C2H4', shells: 'all', blank: true } },
  ],
})
