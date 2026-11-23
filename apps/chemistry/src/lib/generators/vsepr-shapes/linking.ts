// VSEPR Shapes' address parameters, for /linking and /llms.txt.

import { describeLinking } from '$lib/linking/define'
import { figureTextDocs } from '$lib/linking/common'
import { MAX_ANGLE_TEXT, MAX_FORMULA, vseprSettings } from './settings'

export const vseprLinking = describeLinking(vseprSettings, {
  id: 'vsepr-shapes',
  summary:
    'The 3D VSEPR shape of one molecule or polyatomic ion with a single central atom, from its formula, drawn wedge-and-dash or as a ball-and-stick model, with its shape name, electron geometry, AXE notation and bond angles, or those left blank for a “name the shape” question.',
  notes: [
    'formula is a formula with one central atom, such as NH3, SF4, XeF4, I3- or SO4 2- (a charge of 2 or more needs a space, ^ or parentheses before it). URL-encode it: a space is + or %20 and a plus sign is %2B, so NH4+ is formula=NH4%2B and SO4 2- is formula=SO4+2-. Its structure is the one Lewis Structures builds under the octet rule; double and triple bonds are drawn as such, and an ion with resonance structures draws its first.',
    'Molecules with more than one central atom (ethanol, N2H4) and single atoms have no shape to draw.',
    'The figure is always drawn at the ideal angles of its electron geometry. A bond angle label reads the ideal angle, with < when lone pairs squeeze it (<109.5° for H2O), unless angles gives the teacher’s own. A radical’s lone electron squeezes nothing (NO2 reads 120°), and CH3 (the methyl radical) is trigonal planar.',
    'yaw and pitch turn the molecule from its textbook view; both 0 is the textbook view.',
    'question leaves the shape name, electron geometry, AXE notation and bond angles that are on blank, and answerKey prints them under the figure.',
  ],
  params: {
    formula: { what: 'The molecule or ion, as a formula (see notes).', values: `Up to ${MAX_FORMULA} characters` },
    style: { what: 'How the molecule is drawn.', values: 'wedge-and-dash: circles with wedges and dashed bonds, as in textbooks; ball-and-stick: a shaded model in the usual atom colors' },
    yaw: { what: 'Degrees the molecule is turned round the page’s up-down axis from its textbook view, positive bringing its front to the right. Rounded to a whole number.' },
    pitch: { what: 'Degrees the molecule is tipped from its textbook view, positive taking its top away from the viewer. Rounded to a whole number.' },
    lonePairs: { what: 'How the central atom’s lone pairs are drawn.', values: 'lobes: a balloon with two dots in it; dots: two dots; none: left off' },
    outerPairs: { what: 'Draws the outer atoms’ lone pairs as dots.' },
    symbols: { what: 'Writes the element symbol on each ball.', when: 'style=ball-and-stick' },
    grayscale: { what: 'Draws the balls in grays instead of colors.', when: 'style=ball-and-stick' },
    shapeName: { what: 'Writes the shape name (molecular geometry) under the figure, e.g. “Shape: trigonal pyramidal”.' },
    electronGeometry: { what: 'Writes the electron geometry under the figure, e.g. “Electron geometry: tetrahedral”.' },
    axe: { what: 'Writes the AXE notation under the figure, e.g. “AXE notation: AX₃E”.' },
    bondAngles: { what: 'Draws an arc with its angle for each kind of bond angle the shape has (trigonal bipyramidal has two).' },
    angles: {
      what: 'The teacher’s own bond angle labels, one per kind of angle in the shape’s order, joined by |; an empty one keeps the ideal angle.',
      when: 'bondAngles=1',
      values: `Each up to ${MAX_ANGLE_TEXT} characters, e.g. 104.5° for H2O`,
    },
    question: { what: 'Leaves the labels that are on blank, for a “name the shape” question; ignored when no label is on.' },
    ...figureTextDocs('Shape: trigonal pyramidal'),
    answerKey: { what: 'Prints the answers under the figure: each label that is on, filled in.', when: 'question=1' },
  },
  examples: [
    { shows: 'Ammonia, NH₃, wedge-and-dash with its lone pair as a lobe, its shape named and its AXE notation.', settings: { axe: true } },
    { shows: 'Sulfur tetrafluoride, SF₄, as a ball-and-stick model with its two kinds of bond angle.', settings: { formula: 'SF4', style: 'ball-and-stick', bondAngles: true } },
    { shows: 'Water, H₂O, with its bond angle labeled 104.5°.', settings: { formula: 'H2O', bondAngles: true, angles: '104.5°' } },
    {
      shows: 'Xenon tetrafluoride, XeF₄, with its shape, electron geometry and AXE notation left blank and an answer key.',
      settings: { formula: 'XeF4', electronGeometry: true, axe: true, question: true, answerKey: true },
    },
  ],
})
