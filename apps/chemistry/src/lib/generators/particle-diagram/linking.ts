// Particle Diagram's address parameters, for /linking and /llms.txt.

import { describeLinking } from '$lib/linking/define'
import { chartTitleDocs } from '$lib/linking/common'
import { latticeRoom } from './lattice'
import { CHARGES, MAX_ATOMS, MAX_COUNT, MAX_KINDS, MAX_NAME, SHAPES, SHAPE_NAMES, SHADES, SHADE_NAMES, SIZES } from '$shared/particles/particles'
import { particleSettings } from './settings'

const LOOK = `{"size":…,"shade":…,"charge":…}, where size is ${SIZES.join(', ')}; shade is ${SHADES.map((s) => `${s} (${SHADE_NAMES[s].toLowerCase()})`).join(', ')}; and charge is ${CHARGES.map((c) => (c ? c : '"" (none, an atom)')).join(', ')}`
const SHAPE_WORDS = SHAPES.map((s) => `${s} (${SHAPE_NAMES[s].toLowerCase()})`).join(', ')

export const particleLinking = describeLinking(particleSettings, {
  id: 'particle-diagram',
  summary:
    'Atoms, ions and molecules drawn as plain discs, either in a fixed square box as a gas, liquid or solid (layout=scattered, from the particles list and state) or packed in a lattice (layout=lattice, from main and second). An optional key beside the box names each kind.',
  notes: [
    `particles is a URL-encoded JSON array of 1 to ${MAX_KINDS} particle kinds, each {"count":0–${MAX_COUNT},"after":0–${MAX_COUNT},"shape":…,"look":LOOK,"outer":LOOK,"name":"…"}. shape is one of ${SHAPE_WORDS}; look is the center (or only) disc and outer every disc around it. A look is ${LOOK}. after is how many the after box has when boxes=two (missing, it is the same as count). A missing count is 1, a missing look is medium white with no charge, a missing outer is small white with no charge, and name (up to ${MAX_NAME} characters) is what the key calls the kind. A kind with count 0 appears only in the key. Particles that don’t fit in the box are left out.`,
    'Key names (name, mainName, secondName, atomNames), keyNote and arrowLabel can have subscripts and superscripts: _ before a subscript and ^ before a superscript, with braces around more than one character, so H_2O is H₂O and SO_4^{2-} is SO₄²⁻ (a hyphen in a superscript is drawn as a minus sign).',
    'seed picks the random positions (and, in a lattice, which sites get the second kind); the same seed always gives the same figure.',
    `In a lattice, pattern=pure uses main only; alternate alternates main and second like an ionic solid; substitute swaps secondCount sites for second (room for rows × columns); interstitial puts secondCount second atoms in the gaps between four (room for (rows − 1) × (columns − 1), e.g. ${latticeRoom({ pattern: 'interstitial', rows: 4, columns: 5 })} in a 4 × 5 lattice).`,
    'border applies to the box of particles and latticeBorder to the lattice (none by default).',
    `With keyList=atoms the key lists each different atom or ion in the particle kinds once (a molecule’s center before its outer atoms), instead of each kind whole. Their names are atomNames, a URL-encoded JSON array of up to ${MAX_ATOMS} {"look":LOOK,"name":"…"}, each naming the atom drawn with that look; an atom with no name in it is listed without one.`,
  ],
  params: {
    layout: { what: 'How the particles are arranged.', values: 'scattered: in a box, as state says (scattered from when every box was a gas); lattice: packed in a grid, for an ionic solid or alloy' },
    state: {
      what: 'How the particles sit in the box.',
      when: 'layout=scattered',
      values: 'gas: spread out at random, also for a solution; liquid: close together but jumbled, settled at the bottom; solid: in rows from the bottom up, all turned the same way',
    },
    boxes: {
      what: 'One box, or a before box and an after box with an arrow between, both the fixed square and sharing one key.',
      when: 'layout=scattered',
      values: 'one: one box; two: before and after, for a reaction or a change of state, each kind drawn count times before and after times after',
    },
    afterState: { what: 'How the particles sit in the after box, with the same values as state.', when: 'boxes=two' },
    arrowLabel: { what: 'Short text over the arrow, e.g. “heat” or “+ energy”, with subscripts and superscripts written as in key names. Empty for none.', when: 'boxes=two' },
    particles: { what: 'The particle kinds in the box, as JSON (see notes).', when: 'layout=scattered' },
    seed: { what: 'Which random arrangement is drawn. Rounded to a whole number.' },
    border: { what: 'The box’s border.', when: 'layout=scattered' },
    pattern: { what: 'The lattice’s pattern.', when: 'layout=lattice', values: 'pure: one kind (a pure metal); alternate: alternating (an ionic solid); substitute: substitutional alloy; interstitial: interstitial alloy' },
    rows: { what: 'The lattice’s rows. Rounded to a whole number.', when: 'layout=lattice' },
    columns: { what: 'The lattice’s columns. Rounded to a whole number.', when: 'layout=lattice' },
    spacing: { what: 'Whether the lattice’s atoms or ions touch or are evenly spaced apart.', when: 'layout=lattice' },
    main: { what: `The lattice’s main atom or ion, as JSON: ${'{"size":…,"shade":…,"charge":…}'}.`, when: 'layout=lattice' },
    second: { what: 'The lattice’s second atom or ion, as JSON like main.', when: 'layout=lattice and pattern is not pure' },
    secondCount: { what: 'How many second atoms a substitutional or interstitial lattice has, up to its room (see notes). Rounded to a whole number.', when: 'pattern is substitute or interstitial' },
    mainName: { what: 'The key’s name for the lattice’s main kind.', when: 'layout=lattice' },
    secondName: { what: 'The key’s name for the lattice’s second kind.', when: 'layout=lattice and pattern is not pure' },
    latticeBorder: { what: 'The border around a lattice.', when: 'layout=lattice' },
    show: { what: 'What the figure shows.', values: 'box: the box only; both: the box and its key; key: the key only (so separate answer choices can share one key)' },
    keyNote: { what: 'A note line at the bottom of the key, e.g. “H₂O molecules are not shown”.', when: 'show is both or key' },
    keyList: { what: 'What the key lists.', when: 'layout=scattered and show is both or key', values: 'particles: each kind whole; atoms: each different atom once (see notes)' },
    atomNames: { what: 'The key’s names for each atom, as JSON (see notes).', when: 'keyList=atoms' },
    ...chartTitleDocs(),
  },
  examples: [
    {
      shows: 'A reaction before and after: 4 H₂ and 3 O₂ molecules become 4 H₂O molecules with 1 O₂ left over, with one key for both boxes.',
      settings: {
        boxes: 'two',
        particles: [
          { count: 4, after: 0, shape: 'pair', look: { size: 's', shade: 'white', charge: '' }, outer: { size: 's', shade: 'white', charge: '' }, name: 'H_2 molecule' },
          { count: 3, after: 1, shape: 'pair', look: { size: 'm', shade: 'gray', charge: '' }, outer: { size: 'm', shade: 'gray', charge: '' }, name: 'O_2 molecule' },
          { count: 0, after: 4, shape: 'bent', look: { size: 'm', shade: 'gray', charge: '' }, outer: { size: 's', shade: 'white', charge: '' }, name: 'H_2O molecule' },
        ],
        show: 'both',
      },
    },
    {
      shows: 'Water molecules with a key that lists each atom, a large gray O atom and a small white H atom, for students to write the formula.',
      settings: {
        particles: [{ count: 6, shape: 'bent', look: { size: 'l', shade: 'gray', charge: '' }, outer: { size: 's', shade: 'white', charge: '' } }],
        show: 'both',
        keyList: 'atoms',
        atomNames: [
          { look: { size: 'l', shade: 'gray', charge: '' }, name: 'O atom' },
          { look: { size: 's', shade: 'white', charge: '' }, name: 'H atom' },
        ],
      },
    },
    {
      shows: 'An ionic solid: a 4 × 4 alternating lattice of large − ions and small + ions, with a key naming them Cl⁻ and Na⁺.',
      settings: { layout: 'lattice', pattern: 'alternate', rows: 4, columns: 4, mainName: 'Cl⁻ ion', secondName: 'Na⁺ ion', show: 'both' },
    },
    {
      shows: 'An interstitial alloy: a 5 × 6 lattice of gray atoms with 6 tiny black atoms in the gaps, and a key.',
      settings: {
        layout: 'lattice',
        pattern: 'interstitial',
        rows: 5,
        columns: 6,
        main: { size: 'l', shade: 'gray', charge: '' },
        second: { size: 'xs', shade: 'black', charge: '' },
        secondCount: 6,
        mainName: 'Fe atom',
        secondName: 'C atom',
        show: 'both',
      },
    },
  ],
})
