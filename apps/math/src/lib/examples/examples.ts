// Example figures: real figures from each generator, each with its own page
// (/<generator>/examples/<slug>) and a PNG in static/examples/, so search
// engines can index them as images. Each is the generator's own settings, so
// "Edit this figure" opens exactly the figure shown.
//
// After adding or changing one, redo the pictures with
// scripts/snapshot-examples.mjs (see the app's README). The first example of
// each generator is also its social card (static/og/<generator>.png).
//
// Captions say only what the figure shows; solved measures and answer keys
// come from the generators' own logic (./details.server.ts), never typed here.

import { CATALOG } from '$shared/catalog/index'
import { SITE_ID } from '$lib/site/config'
import sizes from './sizes.json'
import type { Example, ExampleGeneratorId, ExampleSpec } from './types'

const SIZES = sizes as Record<string, number[]>

/** A generator's examples, or none while it is turned off (see $shared/catalog). */
function examplesOf<G extends ExampleGeneratorId>(generator: G, specs: ExampleSpec<G>[]): Example[] {
  if (!CATALOG.some((g) => g.site === SITE_ID && g.id === generator)) return []
  return specs.map((spec) => {
    const image = `/examples/${generator}/${spec.slug}.png`
    const [width, height] = SIZES[image] ?? [0, 0]
    return { ...spec, generator, settings: spec.settings as Record<string, unknown>, path: `/${generator}/examples/${spec.slug}`, image, width, height }
  })
}

export const EXAMPLES: Example[] = [
  ...examplesOf('coordinate-grid', [
    {
      slug: 'graph-of-y-2x-plus-1-coordinate-plane',
      title: 'Graph of y = 2x + 1 on a coordinate plane',
      alt: 'A four-quadrant coordinate grid from −10 to 10 on both axes with the straight line y = 2x + 1 drawn across it',
      caption:
        'A four-quadrant coordinate grid numbered from −10 to 10 on both axes, with arrows at every end and x and y at the arrow tips. The line y = 2x + 1 is drawn across it in black, crossing the y-axis at 1 and rising 2 for every 1 across, with an arrowhead where it leaves the grid at each end. The equation isn’t written on the figure, so students can find it from the graph.',
      settings: { xFrom: '-10', xTo: '10', yFrom: '-10', yTo: '10', equations: [{ text: 'y=2x+1' }] },
    },
    {
      slug: 'plotting-points-in-four-quadrants',
      title: 'Plotting points in all four quadrants',
      alt: 'A coordinate grid from −6 to 6 with four labeled points, A(2, 4), B(−3, 1), C(−4, −2) and D(5, −3), one in each quadrant',
      caption:
        'A coordinate grid numbered from −6 to 6 on both axes, with four points drawn as dots and labeled with their letters only: A in the first quadrant, B in the second, C in the third and D in the fourth. Students read each point’s coordinates, or name the quadrant it’s in.',
      settings: { xFrom: '-6', xTo: '6', yFrom: '-6', yTo: '6', equations: [{ text: 'A(2,4),B(-3,1),C(-4,-2),D(5,-3)' }] },
    },
    {
      slug: 'first-quadrant-graph-paper-with-axis-titles',
      title: 'First-quadrant graph with axis titles: distance over time',
      alt: 'A blank first-quadrant grid titled Distance over time, with Time (hours) along the x-axis from 0 to 10 and Distance (miles) up the y-axis from 0 to 100 by 10',
      caption:
        'A blank first-quadrant grid with the chart title Distance over time. The x-axis is titled Time (hours) and numbered from 0 to 10 by 1; the y-axis is titled Distance (miles) and numbered from 0 to 100 by 10. Nothing is graphed, so students can plot a table of values or draw a line of best fit.',
      settings: {
        xTo: '10', yTo: '100', yStep: '10', titleMode: 'text', title: 'Distance over time',
        xTitleMode: 'text', xTitle: 'Time (hours)', yTitleMode: 'text', yTitle: 'Distance (miles)',
      },
    },
    {
      slug: 'graph-of-a-parabola-y-x2-minus-2x-minus-3',
      title: 'Graph of the parabola y = x² − 2x − 3',
      alt: 'A coordinate grid from −6 to 6 with the upward parabola y = x² − 2x − 3 drawn in blue',
      caption:
        'A coordinate grid numbered from −6 to 6 on both axes with the parabola y = x² − 2x − 3 drawn in blue. It opens upward, crosses the x-axis at −1 and 3, and has its vertex at (1, −4); both arms run off the top of the grid with arrowheads. Use it for questions on zeros, the vertex and the axis of symmetry.',
      settings: { xFrom: '-6', xTo: '6', yFrom: '-6', yTo: '6', equations: [{ text: 'y=x^2-2x-3', color: 'blue' }] },
    },
    {
      slug: 'piecewise-function-graph-with-open-and-closed-circles',
      title: 'Piecewise function graph with open and closed circles',
      alt: 'A coordinate grid from −6 to 6 with a two-piece piecewise function: y = x + 2 for x < 1, ending in an open circle at (1, 3), and y = −2x + 4 for x ≥ 1, starting from a closed circle at (1, 2)',
      caption:
        'A coordinate grid numbered from −6 to 6 on both axes with a piecewise function drawn in black. For x < 1 it’s the line y = x + 2, which ends in an open circle at (1, 3); for x ≥ 1 it’s the line y = −2x + 4, which starts from a closed circle at (1, 2). Use it for evaluating f(1), domain and range, or the jump at x = 1.',
      settings: {
        xFrom: '-6', xTo: '6', yFrom: '-6', yTo: '6',
        equations: [{ text: 'y=x+2, x<1' }, { text: 'y=-2x+4, x>=1' }],
      },
    },
    {
      slug: 'sine-graph-from-minus-2pi-to-2pi',
      title: 'Graph of y = sin x from −2π to 2π',
      alt: 'The sine curve y = sin x on a grid whose x-axis runs from −2π to 2π, numbered −2π, −π, 0, π and 2π, and whose y-axis runs from −2 to 2',
      caption:
        'The curve y = sin x on a coordinate grid whose x-axis runs from −2π to 2π, with a gridline every π/2 and numbers at −2π, −π, 0, π and 2π, and whose y-axis runs from −2 to 2. The curve rises and falls between 1 and −1, crossing the x-axis at every multiple of π. The equation isn’t written on the figure.',
      settings: { xFrom: '-2pi', xTo: '2pi', xStep: 'pi/2', xEvery: 2, yFrom: '-2', yTo: '2', equations: [{ text: 'y=sin(x)' }] },
    },
    {
      slug: 'trig-graph-y-3-sin-2x-in-degrees',
      title: 'Graph of y = 3 sin 2x in degrees, from 0° to 360°',
      alt: 'The curve y = 3 sin 2x on a grid whose x-axis runs from 0° to 360°, with a gridline every 45° and numbers every 90°, and whose y-axis runs from −4 to 4',
      caption:
        'The curve y = 3 sin 2x drawn in blue on a coordinate grid whose x-axis runs from 0° to 360°, with a gridline every 45° and numbers at 0°, 90°, 180°, 270° and 360°, and whose y-axis runs from −4 to 4. It goes through two full cycles, reaching 3 at 45° and 225° and −3 at 135° and 315°, so students can read its amplitude of 3 and period of 180°. The equation isn’t written on the figure.',
      settings: {
        xFrom: '0°', xTo: '360°', xStep: '45°', xEvery: 2, yFrom: '-4', yTo: '4', angle: 'degrees', equations: [{ text: 'y=3sin(2x)', color: 'blue' }],
      },
    },
    {
      slug: 'exponential-and-logarithm-graphs-y-2x-and-log2-x',
      title: 'Graphs of y = 2ˣ and y = log₂ x, reflected in y = x',
      alt: 'A coordinate grid from −6 to 6 with the exponential curve y = 2^x in blue, the logarithm curve y = log₂ x in red, and the dashed line y = x between them',
      caption:
        'A coordinate grid numbered from −6 to 6 on both axes. The exponential curve y = 2ˣ is drawn in blue, passing through (0, 1) and (1, 2) and flattening toward the x-axis on the left; the logarithm y = log₂ x is drawn in red, passing through (1, 0) and (2, 1) and dropping toward the y-axis. The dashed line y = x between them shows that each is the other reflected, as inverse functions. Use it for inverses, domain and range, and asymptotes.',
      settings: {
        xFrom: '-6', xTo: '6', yFrom: '-6', yTo: '6',
        equations: [{ text: 'y=2^x', color: 'blue' }, { text: 'y=log_2(x)', color: 'red' }, { text: 'y=x', line: 'dashed' }],
      },
    },
    {
      slug: 'rational-function-with-a-hole-and-asymptotes',
      title: 'Rational function with a hole and dotted asymptotes',
      alt: 'A coordinate grid from −6 to 6 with the rational function y = (2x² + 3x − 2)/(x² + x − 2) in green, an open circle for its hole at (−2, 5/3), and dotted asymptotes at x = 1 and y = 2',
      caption:
        'A coordinate grid numbered from −6 to 6 on both axes with the rational function y = (2x² + 3x − 2)/(x² + x − 2) drawn in green. It factors as (2x − 1)(x + 2)/((x − 1)(x + 2)), so it has a hole at (−2, 5/3), drawn as an open circle, where x + 2 cancels; a vertical asymptote at x = 1 and a horizontal asymptote at y = 2, drawn as dotted lines, with the curve in two branches on either side. Use it for holes versus vertical asymptotes, limits and end behavior.',
      settings: {
        xFrom: '-6', xTo: '6', yFrom: '-6', yTo: '6', equations: [{ text: 'y=(2x^2+3x-2)/(x^2+x-2)', color: 'green', asym: 'shown' }],
      },
    },
    {
      slug: 'system-of-linear-inequalities-graph',
      title: 'System of linear inequalities: y > x − 2 and y ≤ −x + 3',
      alt: 'A coordinate grid from −6 to 6 with the region above the dashed line y = x − 2 shaded blue and the region below the solid line y = −x + 3 shaded red, overlapping on the left',
      caption:
        'A coordinate grid numbered from −6 to 6 on both axes with two inequalities shaded. Above the dashed line y = x − 2 is shaded blue, dashed because points on it don’t make y > x − 2 true; below the solid line y = −x + 3 is shaded red, solid because points on it make y ≤ −x + 3 true. The lines cross at (2.5, 0.5), and the solutions to the system are where the shading overlaps, to the left of that point.',
      settings: {
        xFrom: '-6', xTo: '6', yFrom: '-6', yTo: '6',
        equations: [{ text: 'y>x-2', color: 'blue' }, { text: 'y<=-x+3', color: 'red' }],
      },
    },
  ]),

  ...examplesOf('number-line', [
    {
      slug: 'graph-inequality-x-greater-than-or-equal-to-minus-2',
      title: 'Graphing the inequality x ≥ −2 on a number line',
      alt: 'A number line from −5 to 5 with a closed circle at −2 and a thick line with an arrow running right from it',
      caption:
        'A number line from −5 to 5, numbered at every tick. The inequality x ≥ −2 is graphed on it: a closed circle at −2, because −2 is included, and a thick line from it running off the right end with its own arrow. The inequality itself isn’t written on the figure.',
      settings: { from: '-5', to: '5', equations: [{ text: 'x>=-2' }] },
    },
    {
      slug: 'compound-inequality-minus-3-less-than-x-less-than-or-equal-to-4',
      title: 'Compound inequality −3 < x ≤ 4 on a number line',
      alt: 'A number line from −6 to 6 with an open circle at −3, a closed circle at 4 and a thick line between them',
      caption:
        'A number line from −6 to 6 with the compound inequality −3 < x ≤ 4 graphed on it: an open circle at −3, which isn’t included, a closed circle at 4, which is, and a thick line joining them. Every number between −3 and 4 makes it true.',
      settings: { from: '-6', to: '6', equations: [{ text: '-3<x<=4' }] },
    },
    {
      slug: 'or-inequality-x-less-than-minus-1-or-x-greater-than-or-equal-to-3',
      title: 'Graph of x < −1 or x ≥ 3 on a number line',
      alt: 'A number line from −5 to 5 with an open circle at −1 and a thick line running left, and a closed circle at 3 with a thick line running right',
      caption:
        'A number line from −5 to 5 with the “or” inequality x < −1 or x ≥ 3 graphed on it. An open circle at −1 has a thick line running off the left end, and a closed circle at 3 has one running off the right end, each with its own arrow. The numbers between −1 and 3 are left out.',
      settings: { from: '-5', to: '5', equations: [{ text: 'x<-1 or x>=3' }] },
    },
    {
      slug: 'fraction-number-line-0-to-2-with-lettered-points',
      title: 'Fraction number line from 0 to 2 with lettered points',
      alt: 'A number line from 0 to 2 with a tick every quarter, numbered only at 0, 1 and 2, with points P, Q and R drawn as dots',
      caption:
        'A number line from 0 to 2 with a tick every quarter, numbered only at the whole numbers 0, 1 and 2. Three points sit on ticks, drawn as dots and labeled only with their letters, P, Q and R, so students count the quarters and write the fraction each one stands for.',
      settings: { from: '0', to: '2', step: '1/4', every: 4, equations: [{ text: 'P(3/4),Q(3/2),R(7/4)' }] },
    },
    {
      slug: 'sequence-1-over-n-on-a-number-line',
      title: 'The sequence aₙ = 1/n on a number line',
      alt: 'A number line from 0 to 1 by tenths with the first five terms of 1/n drawn as dots at 1, 1/2, 1/3, 1/4 and 1/5',
      caption:
        'A number line from 0 to 1, marked every tenth, with the first five terms of the sequence aₙ = 1/n drawn as dots: 1, 1/2, 1/3, 1/4 and 1/5. The terms bunch up as they near 0, which shows the sequence converging. Terms that don’t sit on a numbered tick have their value written above them.',
      settings: { from: '0', to: '1', step: '0.1', equations: [{ text: 'a_n=1/n' }] },
    },
  ]),

  ...examplesOf('triangle', [
    {
      slug: 'right-triangle-legs-3-and-4-hypotenuse-x',
      title: 'Right triangle with legs 3 and 4: find the hypotenuse',
      alt: 'Right triangle ABC with the right angle at B, leg AB labeled 3, leg BC labeled 4 and the hypotenuse CA labeled x',
      caption:
        'A right triangle ABC drawn to scale, with a right-angle square at B. The legs are labeled with their lengths, 3 along the bottom (AB) and 4 up the side (BC), and the hypotenuse CA is labeled x. Use it for the Pythagorean theorem.',
      settings: { A: '', AB: '3', BC: '4', BLabel: 'none', BCLabel: 'auto', CALabel: 'text', CAText: 'x' },
    },
    {
      slug: '30-60-90-triangle-hypotenuse-10',
      title: '30-60-90 triangle with hypotenuse 10',
      alt: 'Right triangle ABC with a 30° angle at A, a right angle at B, the hypotenuse labeled 10 and the legs labeled x and y',
      caption:
        'A 30-60-90 right triangle ABC drawn to scale, with the 30° angle at A marked and labeled and a right-angle square at B. The hypotenuse is labeled 10, the short leg BC, across from the 30° angle, is labeled x, and the long leg AB is labeled y.',
      settings: { A: '30', AB: '', CA: '10', BLabel: 'none', ABLabel: 'text', ABText: 'y' },
    },
    {
      slug: 'sohcahtoa-find-the-opposite-side',
      title: 'SOHCAHTOA: find the side opposite a 35° angle',
      alt: 'Right triangle ABC with a 35° angle at A, a right angle at B, the hypotenuse labeled 12 cm and the side opposite A labeled x',
      caption:
        'A right triangle ABC with a 35° angle at A and a right-angle square at B. The hypotenuse CA is labeled 12 cm and the side BC, opposite the 35° angle, is labeled x; the side AB next to it has no label. Students pick sine to find x.',
      settings: { A: '35', AB: '', CA: '12', BLabel: 'none', unit: 'cm' },
    },
    {
      slug: 'law-of-cosines-two-sides-and-included-angle',
      title: 'Law of cosines: two sides and the angle between them',
      alt: 'Triangle ABC with AB labeled 8 m, CA labeled 11 m, the 40° angle between them at A, and the third side BC labeled x',
      caption:
        'A triangle ABC drawn to scale with two sides and the angle between them given: AB is 8 m, CA is 11 m and ∠A is 40°, marked with an arc. The third side, BC, is labeled x. There is no right angle, so students use the law of cosines.',
      settings: { A: '40', B: '', AB: '8', CA: '11', unit: 'm' },
    },
    {
      slug: 'isosceles-triangle-with-height-for-area',
      title: 'Isosceles triangle with its height drawn, for area',
      alt: 'Isosceles triangle ABC with base AB labeled 10, equal sides CA and BC labeled 13 with one tick mark each, and a dashed height from C labeled h',
      caption:
        'An isosceles triangle ABC with base AB labeled 10 and its two equal sides, CA and BC, each labeled 13 and marked with a congruence tick. A dashed height runs from C down to the middle of AB, labeled h, with a right-angle square where it meets the base. Students find h, then the area.',
      settings: { A: '', B: '', AB: '10', BC: '13', CA: '13', BCLabel: 'auto', BCTicks: 1, CATicks: 1, hC: true, hCLabel: 'text', hCText: 'h' },
    },
  ]),

  ...examplesOf('rectangle', [
    {
      slug: 'rectangle-12-cm-by-5-cm-area-and-perimeter',
      title: 'Rectangle 12 cm by 5 cm for area and perimeter',
      alt: 'A rectangle ABCD drawn to scale, its bottom side labeled 12 cm and its right side 5 cm, with right-angle squares at the corners',
      caption:
        'A rectangle ABCD drawn to scale, 12 cm long and 5 cm wide, with its length labeled along the bottom side AB and its width along the right side BC. Each corner has a right-angle square. The other two sides are left unlabeled for students to work out.',
      settings: { AB: '12', BC: '5', unit: 'cm' },
    },
    {
      slug: 'rectangle-diagonal-labeled-x-pythagorean-theorem',
      title: 'Rectangle with a diagonal labeled x',
      alt: 'A rectangle 8 by 6 with diagonal AC drawn and labeled x',
      caption:
        'A rectangle ABCD drawn to scale, with its sides labeled 8 and 6 and a right-angle square at each corner. Diagonal AC is drawn from the bottom left corner to the top right and labeled x, for a Pythagorean theorem question.',
      settings: { AB: '8', dAC: true, dACLabel: 'text', dACText: 'x' },
    },
    {
      slug: 'rectangle-with-sides-as-algebraic-expressions',
      title: 'Rectangle with sides labeled 2x + 3 and x',
      alt: 'A rectangle with its length labeled 2x + 3 and its width labeled x',
      caption:
        'A rectangle ABCD whose length AB is labeled 2x + 3 and whose width BC is labeled x, with right-angle squares at its corners. Use it for writing expressions for perimeter and area, or for solving for x given one of them.',
      settings: { AB: '13', BC: '5', ABLabel: 'text', ABText: '2x+3', BCLabel: 'text', BCText: 'x' },
    },
    {
      slug: 'square-with-diagonals-crossing-at-e',
      title: 'Square with its diagonals drawn',
      alt: 'A square ABCD with every side marked with one tick, its diagonals AC and BD crossing at E with a right-angle square',
      caption:
        'A square ABCD with a side of 7, each side marked with one congruence tick. Both diagonals are drawn and cross at a point named E, with a right-angle square there and at every corner, showing that a square’s diagonals are perpendicular.',
      settings: { kind: 'square', AB: '7', ABTicks: 1, BCTicks: 1, CDTicks: 1, DATicks: 1, dAC: true, dBD: true, cross: 'E' },
    },
  ]),

  ...examplesOf('parallelogram', [
    {
      slug: 'parallelogram-with-base-and-height-for-area',
      title: 'Parallelogram with base and height for area',
      alt: 'A parallelogram with base AB labeled 12 cm and a dashed height from D labeled 5 cm, with parallel arrows on opposite sides',
      caption:
        'A parallelogram ABCD drawn to scale, its base AB labeled 12 cm. A dashed height drops from D to the base, labeled 5 cm, with a right-angle square where it lands. Parallel arrows mark AB and CD with one arrow, and BC and DA with two.',
      settings: { AB: '12', DA: '10', A: '30', unit: 'cm', DALabel: 'none', ALabel: 'none', hD: true, hDLabel: 'measure' },
    },
    {
      slug: 'parallelogram-find-the-missing-angles',
      title: 'Parallelogram: find the missing angles',
      alt: 'A parallelogram with sides 9 and 5, angle A labeled 65 degrees and angles B, C and D labeled x, y and z',
      caption:
        'A parallelogram ABCD with sides labeled 9 and 5 and ∠A labeled 65°. The other three angles are labeled x, y and z, with parallel arrows on both pairs of opposite sides, so students use what they know about a parallelogram’s angles to find each one.',
      settings: { AB: '9', DA: '5', A: '65', BLabel: 'text', BText: 'x', CLabel: 'text', CText: 'y', DLabel: 'text', DText: 'z' },
    },
    {
      slug: 'rhombus-with-diagonals-crossing-at-e',
      title: 'Rhombus with its diagonals drawn',
      alt: 'A rhombus ABCD with side 6 and angle A 70 degrees, each side marked with one tick, its diagonals crossing at E with a right-angle square',
      caption:
        'A rhombus ABCD with side AB labeled 6 and ∠A labeled 70°, all four sides marked with one congruence tick. Both diagonals are drawn and cross at E, with a right-angle square showing that they are perpendicular.',
      settings: { kind: 'rhombus', AB: '6', A: '70', ABTicks: 1, BCTicks: 1, CDTicks: 1, DATicks: 1, dAC: true, dBD: true, cross: 'E' },
    },
  ]),

  ...examplesOf('trapezoid', [
    {
      slug: 'isosceles-trapezoid-with-bases-and-height-for-area',
      title: 'Isosceles trapezoid with bases and height for area',
      alt: 'An isosceles trapezoid with bases 14 cm and 8 cm, a dashed height of 4 cm, parallel arrows on the bases and a tick on each leg',
      caption:
        'An isosceles trapezoid ABCD drawn to scale, with its bases labeled 14 cm along the bottom and 8 cm along the top, each marked with a parallel arrow. A dashed height from D to the bottom base is labeled 4 cm, and the two equal legs are each marked with one congruence tick.',
      settings: { kind: 'isosceles-trapezoid', AB: '14', CD: '8', h: '4', unit: 'cm', ABArrows: 1, CDArrows: 1, BCTicks: 1, DATicks: 1 },
    },
    {
      slug: 'right-trapezoid-find-the-slanted-side',
      title: 'Right trapezoid: find the slanted side',
      alt: 'A right trapezoid with bases 15 and 9, a vertical leg of 8 and the slanted leg labeled x',
      caption:
        'A right trapezoid ABCD with its bases labeled 15 along the bottom and 9 along the top, marked parallel with one arrow each. The left leg DA is labeled 8 and meets both bases at right angles; the slanted leg BC is labeled x.',
      settings: { AB: '15', CD: '9', DA: '8' },
    },
    {
      slug: 'trapezoid-with-angle-a-and-height',
      title: 'Trapezoid with an angle and its height',
      alt: 'A trapezoid with bases 12 and 6, a dashed height of 5, angle A labeled 60 degrees and angle D labeled x',
      caption:
        'A trapezoid ABCD with its bases labeled 12 and 6, marked parallel with one arrow each, and a dashed height of 5 dropped from D. ∠A is labeled 60° and ∠D is labeled x, for a question on the angles along a leg between parallel lines.',
      settings: { kind: 'trapezoid', CD: '6', A: '60', ABArrows: 1, CDArrows: 1, DLabel: 'text', DText: 'x' },
    },
    {
      slug: 'isosceles-trapezoid-with-diagonals',
      title: 'Isosceles trapezoid with its diagonals drawn',
      alt: 'An isosceles trapezoid with bases 12 and 6, both diagonals drawn and crossing at E, with a tick on each leg',
      caption:
        'An isosceles trapezoid ABCD with its bases labeled 12 and 6 and marked parallel, each leg marked with one congruence tick. Both diagonals are drawn and cross at a point named E. There is no height or other label, so students can show the diagonals are the same length.',
      settings: { kind: 'isosceles-trapezoid', hD: false, ABArrows: 1, CDArrows: 1, BCTicks: 1, DATicks: 1, dAC: true, dBD: true, cross: 'E' },
    },
  ]),

  ...examplesOf('kite', [
    {
      slug: 'kite-with-diagonals-6-and-12-for-area',
      title: 'Kite with diagonals 6 and 12 for area',
      alt: 'A kite ABCD standing upright, its diagonals drawn and labeled 6 and 12, crossing at a right angle, with its equal sides marked',
      caption:
        'A kite ABCD standing upright on its line of symmetry, its short sides marked with one tick and its long sides with two. Both diagonals are drawn: AC across is labeled 6 and BD down the middle 12, with a right-angle square where they cross and another at the top corner B. No side lengths are shown, so students find the area from the diagonals.',
      settings: {
        AB: '3sqrt(2)', DA: '3sqrt(10)', B: '90', ABLabel: 'none', DALabel: 'none', BLabel: 'none',
        dAC: true, dACLabel: 'measure', dBD: true, dBDLabel: 'measure', moved: 'dBD:110,0',
      },
    },
    {
      slug: 'kite-find-the-missing-angle',
      title: 'Kite: find the missing angle',
      alt: 'A kite with short sides 6 and long sides 10, angle B labeled 110 degrees, equal angles A and C marked with arcs and angle D labeled x',
      caption:
        'A kite ABCD with its short sides labeled 6 and marked with one tick, and its long sides labeled 10 and marked with two. ∠B at the top is labeled 110°, the two equal angles A and C are marked with one arc each, and ∠D at the bottom is labeled x.',
      settings: { AB: '6', DA: '10', B: '110', AArcs: 1, CArcs: 1, DLabel: 'text', DText: 'x' },
    },
    {
      slug: 'kite-with-its-line-of-symmetry',
      title: 'Kite with its line of symmetry',
      alt: 'A kite with sides 7 in and 12 in and angle B 80 degrees, with the diagonal BD drawn dashed as its line of symmetry',
      caption:
        'A kite ABCD with its short sides labeled 7 in and its long sides 12 in, each pair of equal sides marked with ticks, and ∠B labeled 80°. The diagonal BD from top to bottom is drawn dashed: the kite’s line of symmetry.',
      settings: { AB: '7', DA: '12', B: '80', unit: 'in', dBD: true, dBDStyle: 'dashed' },
    },
  ]),

  ...examplesOf('regular-polygon', [
    {
      slug: 'regular-hexagon-with-apothem-for-area',
      title: 'Regular hexagon with its apothem, for area',
      alt: 'A regular hexagon with its bottom side labeled 10 cm and a dashed apothem from the center dot to that side labeled 8.7 cm',
      caption:
        'A regular hexagon with its center marked by a dot. The bottom side is labeled 10 cm, and a dashed apothem runs from the center to the middle of that side, labeled 8.7 cm, with a right-angle square where it meets the side. Students use the apothem and perimeter to find the area.',
      settings: { size: '10', unit: 'cm', apothemLabel: 'measure' },
    },
    {
      slug: 'regular-pentagon-find-the-interior-angle',
      title: 'Regular pentagon: find the interior angle',
      alt: 'A regular pentagon with its bottom side labeled 6 and the angle in its bottom left corner marked with an arc and labeled x',
      caption:
        'A regular pentagon with its bottom side labeled 6. The interior angle in its bottom left corner is marked with an arc and labeled x, for students to find from the number of sides. No center or other lines are drawn.',
      settings: { n: 5, size: '6', angleLabel: 'text', angleText: 'x', apothem: false, dot: false },
    },
    {
      slug: 'regular-octagon-with-all-its-radii',
      title: 'Regular octagon split into triangles by its radii',
      alt: 'A regular octagon with a dashed radius from its center dot to each of its eight corners, one of them labeled 5',
      caption:
        'A regular octagon with a dot at its center and a dashed radius to each of its eight corners, splitting it into eight matching triangles. The radius to the bottom right corner is labeled 5. Use it for central angles, or to find the area from the triangles.',
      settings: { n: 8, sizeBy: 'radius', size: '5', sideLabel: 'none', apothem: false, radius: true, radiusLabel: 'measure', radii: true },
    },
    {
      slug: 'regular-decagon-with-congruence-marks',
      title: 'Regular decagon with congruence marks',
      alt: 'A regular decagon with one tick mark on every side and an arc in every corner, and no numbers',
      caption:
        'A regular decagon, 10 sides, with a congruence tick on every side and a congruence arc in every corner, showing that all its sides and all its angles are equal. Nothing is labeled with a number, so students can name the polygon or work out its angle sum.',
      settings: { n: 10, sideLabel: 'none', sideTicks: 1, angleArcs: 1, apothem: false, dot: false },
    },
  ]),

  ...examplesOf('prism', [
    {
      slug: 'rectangular-prism-8-cm-by-3-cm-by-5-cm',
      title: 'Rectangular prism 8 cm by 3 cm by 5 cm',
      alt: 'A rectangular prism drawn to scale with its length labeled 8 cm, its width 3 cm and its height 5 cm, hidden edges dashed',
      caption:
        'A rectangular prism (a box) drawn to scale, seen from a little above, with its length labeled 8 cm along the front, its width 3 cm along the side going back, and its height 5 cm up the left. The three edges round the back are dashed. Use it for volume or surface area.',
      settings: { length: '8', height: '5' },
    },
    {
      slug: 'cube-with-6-inch-edges',
      title: 'Cube with 6-inch edges',
      alt: 'A cube with one edge labeled 6 in and its hidden edges dashed',
      caption:
        'A cube with only its front bottom edge labeled, 6 in, since every edge of a cube is the same length. The edges round the back are dashed. Use it for volume or surface area.',
      settings: { length: '6', width: '6', height: '6', unit: 'in', widthLabel: 'none', heightLabel: 'none' },
    },
    {
      slug: 'triangular-prism-with-a-right-triangle-base',
      title: 'Triangular prism with a right triangle base',
      alt: 'A triangular prism lying on its side, its right triangle end labeled 6 cm, 8 cm and 10 cm, and its length 12 cm',
      caption:
        'A triangular prism lying on its side, with a right triangle at its front end: the legs are labeled 6 cm and 8 cm, with a right-angle square between them, and the hypotenuse 10 cm. The prism’s length going back is labeled 12 cm, and its hidden edges are dashed.',
      settings: { base: 'right', triHeight: '8', height: '12', hypLabel: 'measure' },
    },
    {
      slug: 'hexagonal-prism-with-its-apothem',
      title: 'Hexagonal prism with its apothem',
      alt: 'A hexagonal prism with a side labeled 4 cm, its height 10 cm, and an apothem of 3.5 cm drawn on its top face',
      caption:
        'A prism with a regular hexagon for its base, standing up, with the front bottom side labeled 4 cm and the height 10 cm. On the top face, the apothem runs from the center, drawn as a dot, to the middle of a side, with a right-angle square, and is labeled 3.5 cm. The hidden edges are dashed.',
      settings: { base: 'regular', height: '10', apothemLabel: 'measure', moved: 'apothem:15,0' },
    },
    {
      slug: 'rectangular-prism-with-a-missing-height-x',
      title: 'Rectangular prism with a missing height x',
      alt: 'A rectangular prism with its length labeled 12 ft, its width 4 ft and its height x',
      caption:
        'A rectangular prism with its length labeled 12 ft and its width 4 ft, and its height labeled x. Give students the volume and ask for x.',
      settings: { length: '12', width: '4', height: '5', heightLabel: 'text', heightText: 'x', unit: 'ft' },
    },
  ]),

  ...examplesOf('cylinder', [
    {
      slug: 'cylinder-with-radius-4-cm-and-height-10-cm',
      title: 'Cylinder with radius 4 cm and height 10 cm',
      alt: 'A cylinder with its radius drawn on the top circle and labeled 4 cm, and its height labeled 10 cm',
      caption:
        'A right cylinder drawn to scale, with a radius drawn from the center of its top circle to the edge and labeled 4 cm, and its height labeled 10 cm up the side. The back half of the bottom circle is dashed. Use it for volume or surface area.',
      settings: { radius: '4', height: '10' },
    },
    {
      slug: 'cylinder-with-diameter-12-inches-and-height-9-inches',
      title: 'Cylinder with diameter 12 inches and height 9 inches',
      alt: 'A cylinder with a diameter drawn across its top circle labeled 12 in, and its height labeled 9 in',
      caption:
        'A right cylinder with a diameter drawn right across its top circle and labeled 12 in, and its height labeled 9 in. Students halve the diameter to find the radius.',
      settings: { diameter: true, radius: '12', height: '9', unit: 'in' },
    },
    {
      slug: 'oblique-cylinder-with-its-height-and-lean',
      title: 'Oblique cylinder with its height and lean',
      alt: 'An oblique cylinder leaning to the right with its radius labeled 3 cm, its dashed height 8 cm and its lean 4 cm',
      caption:
        'An oblique cylinder leaning to the right, its top circle slid sideways past its base. Its radius is labeled 3 cm. The height is drawn dashed straight down from the top’s center to the base’s extended line, with a right-angle square, and labeled 8 cm, and the lean along that line is labeled 4 cm.',
      settings: { oblique: true, height: '8', lean: '4', moved: 'lean:-30,0' },
    },
    {
      slug: 'cylinder-with-radius-r-and-height-h',
      title: 'Cylinder with radius r and height h',
      alt: 'A cylinder with its radius labeled r and its height labeled h, with no numbers',
      caption:
        'A right cylinder labeled only with letters: its radius r, drawn from the center of the top circle, and its height h. Use it beside the volume formula V = πr²h, or on a formula sheet.',
      settings: { radius: '5', height: '6', unit: '', radiusLabel: 'text', radiusText: 'r', heightLabel: 'text', heightText: 'h' },
    },
  ]),

  ...examplesOf('pyramid', [
    {
      slug: 'square-pyramid-with-slant-height-10-cm',
      title: 'Square pyramid with slant height 10 cm',
      alt: 'A square pyramid with base edges labeled 12 cm and a dashed slant height of 10 cm down the front face',
      caption:
        'A square pyramid with two base edges labeled 12 cm. The slant height is drawn dashed from the tip down the middle of the front face to the base edge, with a right-angle square, and labeled 10 cm; the height isn’t drawn. Hidden edges are dashed. Use it for surface area.',
      settings: { length: '12', width: '12', height: '', slant: '10', showHeight: false },
    },
    {
      slug: 'rectangular-pyramid-8-cm-by-6-cm-height-9-cm',
      title: 'Rectangular pyramid 8 cm by 6 cm with height 9 cm',
      alt: 'A rectangular pyramid with base edges labeled 8 cm and 6 cm and its dashed height labeled 9 cm',
      caption:
        'A rectangular pyramid with its base edges labeled 8 cm and 6 cm. Its height is drawn dashed from the tip straight down to the middle of the base, with a right-angle square, and labeled 9 cm. Hidden edges are dashed. Use it for volume.',
      settings: { length: '8', height: '9', depth: 'left' },
    },
    {
      slug: 'hexagonal-pyramid-with-its-apothem-and-height',
      title: 'Hexagonal pyramid with its apothem and height',
      alt: 'A hexagonal pyramid with a base side labeled 4 cm, its dashed height 9 cm and the base’s apothem 3.5 cm',
      caption:
        'A pyramid on a regular hexagon, with a base side labeled 4 cm and its height drawn dashed from the tip to the center of the base and labeled 9 cm. The base’s apothem runs from the center to the middle of the front side, with a right-angle square, and is labeled 3.5 cm. Hidden edges are left off.',
      settings: { base: 'regular', height: '9', apothemLabel: 'measure', depth: 'left', hidden: false },
    },
  ]),

  ...examplesOf('cone', [
    {
      slug: 'cone-with-radius-4-cm-and-height-9-cm',
      title: 'Cone with radius 4 cm and height 9 cm',
      alt: 'A cone with its dashed height labeled 9 cm and a dashed radius labeled 4 cm on its base',
      caption:
        'A right cone drawn to scale, with its height drawn dashed from the tip down to the center of the base and labeled 9 cm, and a radius drawn dashed from the center to the edge and labeled 4 cm, with a right-angle square between them. The back of the base circle is dashed. Use it for volume.',
      settings: { radius: '4', height: '9' },
    },
    {
      slug: 'cone-with-the-slant-height-labeled-x',
      title: 'Cone with the slant height labeled x',
      alt: 'A cone with its height labeled 8 cm, its radius 6 cm and its slant height x',
      caption:
        'A right cone with its dashed height labeled 8 cm and its radius 6 cm, with a right-angle square between them, and its sloping side labeled x. Students use the Pythagorean theorem to find the slant height.',
      settings: { radius: '6', height: '8', slantLabel: 'text', slantText: 'x' },
    },
    {
      slug: 'cone-with-diameter-10-cm-and-slant-height-13-cm',
      title: 'Cone with diameter 10 cm and slant height 13 cm',
      alt: 'A cone with a dashed diameter across its base labeled 10 cm and its slant height labeled 13 cm',
      caption:
        'A right cone with a diameter drawn dashed across its base and labeled 10 cm, and its sloping side labeled 13 cm. Its height is drawn dashed from the tip to the base with a right-angle square but isn’t labeled, for students to find.',
      settings: { diameter: true, radius: '10', height: '', slant: '13' },
    },
    {
      slug: 'cone-with-radius-r-and-height-h',
      title: 'Cone with radius r and height h',
      alt: 'A cone with its dashed height labeled h and its radius labeled r, with no numbers',
      caption:
        'A right cone labeled only with letters: its dashed height h and its radius r, with a right-angle square between them. Use it beside the volume formula V = ⅓πr²h, or on a formula sheet.',
      settings: { height: '5', unit: '', radiusLabel: 'text', radiusText: 'r', heightLabel: 'text', heightText: 'h' },
    },
  ]),

  ...examplesOf('sphere', [
    {
      slug: 'sphere-with-radius-6-cm',
      title: 'Sphere with radius 6 cm',
      alt: 'A sphere with a radius drawn from its center to its edge and labeled 6 cm',
      caption:
        'A sphere with a circle round its middle, the back half dashed, and a radius drawn from the center, shown as a dot, to the edge and labeled 6 cm. Use it for volume or surface area.',
      settings: { radius: '6' },
    },
    {
      slug: 'sphere-with-diameter-14-inches',
      title: 'Sphere with diameter 14 inches',
      alt: 'A sphere with a diameter drawn right across its middle and labeled 14 in',
      caption:
        'A sphere with a circle round its middle, the back half dashed, and a diameter drawn right across it through the center, labeled 14 in. Students halve it to find the radius.',
      settings: { diameter: true, radius: '14', unit: 'in' },
    },
    {
      slug: 'hemisphere-with-radius-5-m',
      title: 'Hemisphere with radius 5 m',
      alt: 'A hemisphere with its flat face down, like a dome, and a radius on its flat face labeled 5 m',
      caption:
        'A hemisphere with its flat face down, like a dome. The back of the flat face’s circle is dashed, and a radius is drawn from its center to the edge and labeled 5 m.',
      settings: { shape: 'hemisphere', radius: '5', unit: 'm' },
    },
    {
      slug: 'hemisphere-bowl-with-radius-8-cm',
      title: 'Hemisphere bowl with radius 8 cm',
      alt: 'A hemisphere with its flat face up, like a bowl, and a radius across its top labeled 8 cm',
      caption:
        'A hemisphere with its flat face up, like a bowl, and a radius drawn from the center of the top circle to its edge, labeled 8 cm. Use it for how much a bowl holds.',
      settings: { shape: 'hemisphere', bowl: true, radius: '8' },
    },
  ]),

  ...examplesOf('box-plot', [
    {
      slug: 'box-plot-of-test-scores',
      title: 'Box plot of test scores',
      alt: 'A box plot of 15 test scores titled Test scores, over a number line from 60 to 100 labeled Score (points)',
      caption:
        'A box plot of 15 test scores from 62 to 98, titled Test scores, over a number line from 60 to 100 numbered every 5 and titled Score (points). None of the five-number summary is written on it, so students read the minimum, quartiles, median and maximum from the line.',
      settings: {
        rows: [{ text: '62, 68, 71, 74, 75, 78, 80, 82, 84, 85, 88, 90, 91, 94, 98' }],
        title: 'Test scores',
        titleMode: 'text',
        axisTitle: 'Score (points)',
        axisTitleMode: 'text',
      },
    },
    {
      slug: 'comparing-two-box-plots-class-a-and-class-b',
      title: 'Comparing two box plots: Class A and Class B',
      alt: 'Two box plots, Class A above Class B, over one number line from 50 to 100 labeled Score',
      caption:
        'Two box plots of ten test scores each, named Class A and Class B, drawn one above the other over the same number line from 50 to 100, with a tick every 5 and a number every 10. Sharing one line lets students compare the two classes’ medians, spreads and ranges straight down.',
      settings: {
        rows: [
          { text: '55, 60, 64, 70, 72, 75, 78, 81, 85, 90', name: 'Class A' },
          { text: '68, 72, 75, 77, 80, 82, 84, 86, 88, 95', name: 'Class B' },
        ],
        from: '50',
        to: '100',
        step: '5',
        every: 2,
        axisTitle: 'Score',
        axisTitleMode: 'text',
      },
    },
    {
      slug: 'box-plot-from-five-number-summary-quartiles-labeled',
      title: 'Box plot from a five-number summary, with Q1, the median and Q3 labeled',
      alt: 'A box plot over a number line from 10 to 40 with 18, 25 and 31 written above Q1, the median and Q3',
      caption:
        'A box plot drawn from the five-number summary 12, 18, 25, 31, 40, over a number line from 10 to 40 numbered every 5. The values of Q1, the median and Q3, 18, 25 and 31, are written above the box; the whisker ends are left for students to read.',
      settings: {
        rows: [{ text: '12, 18, 25, 31, 40' }],
        q1Label: 'measure',
        medianLabel: 'measure',
        q3Label: 'measure',
      },
    },
    {
      slug: 'box-plot-with-outliers',
      title: 'Box plot with outliers',
      alt: 'A box plot of minutes spent on homework, with a dot for an outlier at each end beyond the whiskers',
      caption:
        'A box plot of 13 students’ minutes spent on homework, titled Minutes spent on homework, over a number line from 0 to 80 numbered every 10. The two values more than 1.5 box widths past the box, 2 and 75, are drawn as dots of their own, and the whiskers stop at the last values that aren’t outliers.',
      settings: {
        rows: [{ text: '2, 20, 22, 25, 25, 28, 30, 30, 32, 35, 38, 40, 75' }],
        outliers: true,
        title: 'Minutes spent on homework',
        titleMode: 'text',
        axisTitle: 'Minutes',
        axisTitleMode: 'text',
      },
    },
    {
      slug: 'parts-of-a-box-plot-labeled-a-to-e',
      title: 'Parts of a box plot: label the five-number summary',
      alt: 'A box plot with the letters A, B, C, D and E above its minimum, Q1, median, Q3 and maximum',
      caption:
        'A box plot over a number line from 0 to 50 numbered every 5, with the letters A to E written above its minimum, Q1, median, Q3 and maximum. Students name the part each letter marks, or read its value from the line.',
      settings: {
        rows: [{ text: '4, 15, 22, 36, 48' }],
        minLabel: 'text',
        minText: 'A',
        q1Label: 'text',
        q1Text: 'B',
        medianLabel: 'text',
        medianText: 'C',
        q3Label: 'text',
        q3Text: 'D',
        maxLabel: 'text',
        maxText: 'E',
      },
    },
  ]),

  ...examplesOf('bar-graph', [
    {
      slug: 'bar-graph-of-favorite-sports',
      title: 'Bar graph of favorite sports',
      alt: 'A bar graph titled Favorite sports with a blue column for each of five sports over an axis from 0 to 10 titled Number of students',
      caption:
        'A bar graph titled Favorite sports, with one blue column each for Soccer, Basketball, Swimming, Tennis and Running. The value axis is titled Number of students and numbered from 0 to 10 by 1, with light gridlines across it, and the sports are named under their columns above the title Sport. No values are written on the bars, so students read them from the axis.',
      settings: {
        columns: ['Students'],
        rows: [
          { name: 'Soccer', cells: [{ value: '8' }] },
          { name: 'Basketball', cells: [{ value: '6' }] },
          { name: 'Swimming', cells: [{ value: '5' }] },
          { name: 'Tennis', cells: [{ value: '3' }] },
          { name: 'Running', cells: [{ value: '4' }] },
        ],
        to: '10',
        title: 'Favorite sports',
        titleMode: 'text',
        categoryTitle: 'Sport',
        categoryTitleMode: 'text',
        valueTitle: 'Number of students',
        valueTitleMode: 'text',
      },
    },
    {
      slug: 'double-bar-graph-boys-and-girls',
      title: 'Double bar graph: favorite pets of boys and girls',
      alt: 'A double bar graph of favorite pets with a blue bar for boys and a red bar for girls beside each pet, and a key naming them',
      caption:
        'A double bar graph of favorite pets, with two bars side by side for each of Dog, Cat, Fish and Rabbit: blue for Boys and red for Girls, named in a key on the right. The value axis is titled Number of students and numbered from 0 to 9. Students compare the two groups pet by pet.',
      settings: {
        columns: ['Boys', 'Girls'],
        rows: [
          { name: 'Dog', cells: [{ value: '9' }, { value: '7' }] },
          { name: 'Cat', cells: [{ value: '5' }, { value: '8' }] },
          { name: 'Fish', cells: [{ value: '3' }, { value: '2' }] },
          { name: 'Rabbit', cells: [{ value: '2' }, { value: '4' }] },
        ],
        title: 'Favorite pets',
        titleMode: 'text',
        valueTitle: 'Number of students',
        valueTitleMode: 'text',
      },
    },
    {
      slug: 'horizontal-bar-chart-books-read',
      title: 'Horizontal bar chart of books read, with values',
      alt: 'A horizontal bar chart of books read by five students, each bar with its number written at its end',
      caption:
        'A horizontal bar chart titled Books read this term, with a sideways bar for each of five students, Amara, Ben, Chen, Dana and Eli, named down the left. Each bar has its number of books written at its end, over an axis titled Books numbered from 0 to 12.',
      settings: {
        rows: [
          { name: 'Amara', cells: [{ value: '12' }] },
          { name: 'Ben', cells: [{ value: '7' }] },
          { name: 'Chen', cells: [{ value: '9' }] },
          { name: 'Dana', cells: [{ value: '4' }] },
          { name: 'Eli', cells: [{ value: '10' }] },
        ],
        direction: 'bars',
        values: 'end',
        title: 'Books read this term',
        titleMode: 'text',
        valueTitle: 'Books',
        valueTitleMode: 'text',
      },
    },
    {
      slug: 'stacked-composite-bar-chart-travel-to-school',
      title: 'Stacked (composite) bar chart: how students travel to school',
      alt: 'A stacked bar chart in black and white with a column for each of three year groups split into Walk, Bus and Car, and a key below',
      caption:
        'A stacked bar chart, also called a composite bar chart, of how students in Years 7, 8 and 9 travel to school. Each year’s column is split into Walk, Bus and Car in gray, white and hatching, named in a key below the graph, with the number in each part written inside it. Black-and-white fills keep the parts apart on a photocopy.',
      settings: {
        columns: ['Walk', 'Bus', 'Car'],
        rows: [
          { name: 'Year 7', cells: [{ value: '12' }, { value: '10' }, { value: '8' }] },
          { name: 'Year 8', cells: [{ value: '15' }, { value: '8' }, { value: '6' }] },
          { name: 'Year 9', cells: [{ value: '9' }, { value: '14' }, { value: '5' }] },
        ],
        stacking: 'stacked',
        barWidth: 'wide',
        values: 'inside',
        look: 'bw',
        keyAt: 'below',
        valueTitle: 'Number of students',
        valueTitleMode: 'text',
      },
    },
    {
      slug: 'bar-graph-with-error-bars-mean-plant-height',
      title: 'Bar graph with error bars: mean plant height',
      alt: 'A gray bar graph of mean plant height under three fertilizers, each bar with an error bar, and the note Error bars show ±1 SEM',
      caption:
        'A bar graph of the mean height of plants given no fertilizer, fertilizer A and fertilizer B, in gray for printing, over an axis titled Mean height (cm). Each bar has an error bar with crossbars reaching one standard error of the mean above and below it, and the note under the graph says Error bars show ±1 SEM. Students judge whether the differences between the means are likely to be real.',
      settings: {
        rows: [
          { name: 'None', cells: [{ value: '12.4', error: '1.1' }] },
          { name: 'Fertilizer A', cells: [{ value: '18.9', error: '1.6' }] },
          { name: 'Fertilizer B', cells: [{ value: '15.2', error: '2.3' }] },
        ],
        look: 'bw',
        errorBars: true,
        errorNote: 'Error bars show ±1 SEM',
        categoryTitle: 'Treatment',
        categoryTitleMode: 'text',
        valueTitle: 'Mean height (cm)',
        valueTitleMode: 'text',
      },
    },
    {
      slug: 'bar-graph-with-a-bar-left-for-students-to-draw',
      title: 'Bar graph with a bar left for students to draw',
      alt: 'A bar graph of rainfall from Monday to Friday with Thursday’s bar missing, over bold gridlines with minor lines for drawing it',
      caption:
        'A bar graph of rainfall in millimeters from Monday to Friday with Thursday’s bar left off, so students draw it from a table or a description. Bold gridlines split into halves make the bar easy to draw to the nearest half millimeter, and the axis is titled Rainfall (mm).',
      settings: {
        rows: [
          { name: 'Monday', cells: [{ value: '4' }] },
          { name: 'Tuesday', cells: [{ value: '7.5' }] },
          { name: 'Wednesday', cells: [{ value: '2' }] },
          { name: 'Thursday' },
          { name: 'Friday', cells: [{ value: '1' }] },
        ],
        gridlines: 'bold',
        minor: 2,
        valueTitle: 'Rainfall (mm)',
        valueTitleMode: 'text',
      },
    },
  ]),

  ...examplesOf('mapping-diagram', [
    {
      slug: 'mapping-diagram-of-a-function',
      title: 'Mapping diagram of a function',
      alt: 'A mapping diagram with inputs 1, 2, 3 and 4 in an oval on the left, outputs 3, 5, 7 and 9 on the right, and one arrow from each input',
      caption:
        'A mapping diagram with the inputs 1, 2, 3 and 4 in an oval under the title Input and the outputs 3, 5, 7 and 9 in an oval under Output. One arrow goes from each input to one output: 1 to 3, 2 to 5, 3 to 7 and 4 to 9.',
      settings: {
        inputs: '1, 2, 3, 4',
        outputs: '3, 5, 7, 9',
        arrows: [
          { from: '1', to: '3' },
          { from: '2', to: '5' },
          { from: '3', to: '7' },
          { from: '4', to: '9' },
        ],
      },
    },
    {
      slug: 'mapping-diagram-relation-that-is-not-a-function',
      title: 'Mapping diagram of a relation that is not a function',
      alt: 'A mapping diagram from x to y with inputs −2, 0 and 3, where 0 has arrows to both 4 and 6',
      caption:
        'A mapping diagram of the ordered pairs (−2, 1), (0, 4), (0, 6) and (3, 8), with the inputs titled x and the outputs titled y. The input 0 has two arrows, one to 4 and one to 6.',
      settings: {
        inputs: '−2, 0, 3',
        outputs: '1, 4, 6, 8',
        arrows: [
          { from: '−2', to: '1' },
          { from: '0', to: '4' },
          { from: '0', to: '6' },
          { from: '3', to: '8' },
        ],
        inputTitle: 'x',
        outputTitle: 'y',
      },
    },
    {
      slug: 'mapping-diagram-many-to-one-function-x-squared',
      title: 'Mapping diagram of y = x², a function that isn’t one-to-one',
      alt: 'A mapping diagram titled y = x² with inputs −2, −1, 1 and 2 and outputs 1 and 4, two arrows ending at each output',
      caption:
        'A mapping diagram titled y = x², with the inputs −2, −1, 1 and 2 on the left, titled x, and the outputs 1 and 4 on the right, titled y. −2 and 2 both have arrows to 4, and −1 and 1 both have arrows to 1.',
      settings: {
        inputs: '−2, −1, 1, 2',
        outputs: '1, 4',
        arrows: [
          { from: '−2', to: '4' },
          { from: '−1', to: '1' },
          { from: '1', to: '1' },
          { from: '2', to: '4' },
        ],
        inputTitle: 'x',
        outputTitle: 'y',
        title: 'y = x²',
        titleMode: 'text',
      },
    },
    {
      slug: 'mapping-diagram-with-words-students-and-sports',
      title: 'Mapping diagram with words: students and their sports',
      alt: 'A mapping diagram in boxes from four students, Ana, Ben, Cara and Dev, to three sports, with one arrow from each student',
      caption:
        'A mapping diagram drawn in boxes, with four students, Ana, Ben, Cara and Dev, under the title Student and three sports, Soccer, Tennis and Swimming, under Sport. Ana and Cara both have arrows to Soccer, Ben to Tennis and Dev to Swimming.',
      settings: {
        inputs: 'Ana, Ben, Cara, Dev',
        outputs: 'Soccer, Tennis, Swimming',
        arrows: [
          { from: 'Ana', to: 'Soccer' },
          { from: 'Ben', to: 'Tennis' },
          { from: 'Cara', to: 'Soccer' },
          { from: 'Dev', to: 'Swimming' },
        ],
        inputTitle: 'Student',
        outputTitle: 'Sport',
        shape: 'box',
      },
    },
    {
      slug: 'blank-mapping-diagram-draw-the-arrows',
      title: 'Mapping diagram without arrows, for students to draw',
      alt: 'A mapping diagram with inputs 1 to 5 titled x and outputs 2, 4, 6, 8 and 10 titled y, and no arrows',
      caption:
        'A mapping diagram with the inputs 1, 2, 3, 4 and 5 under the title x and the outputs 2, 4, 6, 8 and 10 under y, and no arrows between them. Students draw the arrows from a rule or a list of ordered pairs.',
      settings: {
        inputs: '1, 2, 3, 4, 5',
        outputs: '2, 4, 6, 8, 10',
        inputTitle: 'x',
        outputTitle: 'y',
      },
    },
  ]),

  ...examplesOf('length-reading', [
    {
      slug: 'inch-ruler-measuring-to-the-nearest-quarter-inch',
      title: 'Measuring to the nearest quarter inch',
      alt: 'A 6 inch ruler marked in quarter inches with a metal cylinder lying along it from 0 to 3 1/4 inches, with a magnified view of its right end',
      caption:
        'A 6 inch ruler marked every quarter inch, with longer marks at the half inches, and a metal cylinder lying along it with its left end on 0. Its right end is on the 3 1/4 inch mark. A magnified view shows the right end against the marks.',
      settings: { system: 'imperial', imperialMarks: '4', length: 3.25 },
    },
    {
      slug: 'inch-ruler-measuring-to-the-nearest-eighth-inch',
      title: 'Measuring to the nearest eighth inch',
      alt: 'A 6 inch ruler marked in eighths of an inch with a rock lying along it from 0 to 2 5/8 inches, with dashed lines down from its ends',
      caption:
        'A 6 inch ruler marked every eighth of an inch, with marks shortening from halves to quarters to eighths, and a rock lying along it from 0. Dashed lines drop from the rock’s ends to the ruler, and its right end is on the 2 5/8 inch mark. A magnified view shows the right end against the marks.',
      settings: { system: 'imperial', object: 'rock', guides: true, length: 2.625 },
    },
    {
      slug: 'centimeter-ruler-measuring-to-the-nearest-centimeter',
      title: 'Measuring to the nearest centimeter',
      alt: 'A 15 cm ruler marked only every centimeter with a row of four marbles lying along it from 0 to 6 cm',
      caption:
        'A 15 cm ruler marked and numbered every centimeter, with no millimeter marks, and a row of four marbles lying along it from 0. Dashed lines drop from the row’s ends to the ruler, and its right end is on the 6 cm mark. There is no magnifier, so students read it from the whole ruler.',
      settings: { metricMarks: 'cm', read: 'mark', object: 'marbles', marbles: 4, guides: true, length: 6, view: 'whole' },
    },
    {
      slug: 'millimeter-ruler-measuring-in-centimeters-and-millimeters',
      title: 'Measuring in centimeters and millimeters: 8.4 cm',
      alt: 'A 15 cm ruler marked in millimeters with a metal cylinder lying along it from 0 to 8.4 cm, with a magnified view of its right end',
      caption:
        'A 15 cm ruler marked every millimeter, with a longer mark at each half centimeter, and a metal cylinder lying along it from 0. Its right end is on the fourth millimeter mark past 8 cm, so it is 8.4 cm, or 84 mm, long. A magnified view shows the right end against the marks.',
      settings: { read: 'mark', length: 8.4 },
    },
    {
      slug: 'ruler-measuring-not-from-zero-inches',
      title: 'Measuring with a ruler not starting at zero, in inches',
      alt: 'A 6 inch ruler marked in quarter inches with a metal cylinder lying along it from 1 inch to 3 1/2 inches, with magnified views of both ends',
      caption:
        'A 6 inch ruler marked every quarter inch, with a metal cylinder lying along it from the 1 inch mark rather than 0. Magnified views show its left end on 1 inch and its right end on 3 1/2 inches, so students subtract to find its length.',
      settings: { system: 'imperial', imperialMarks: '4', start: 1, length: 2.5 },
    },
  ]),
]

/** A generator's examples, in order; the first is its best. */
export const examplesFor = (generator: string) => EXAMPLES.filter((e) => e.generator === generator)

export const findExample = (generator: string, slug: string) => EXAMPLES.find((e) => e.generator === generator && e.slug === slug)

/** Generators with examples. */
export const EXAMPLE_GENERATORS = [...new Set(EXAMPLES.map((e) => e.generator))]

/** The generator's social card image (static/og/<generator>.png), made from its first example. */
export const ogImage = (generator: string) => `/og/${generator}.png`
