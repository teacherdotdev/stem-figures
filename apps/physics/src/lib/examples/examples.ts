// Example figures: real figures from each generator, each with its own page
// (/<generator>/examples/<slug>) and a PNG in static/examples/, so search
// engines can index them as images. Each is the generator's own settings, so
// "Edit this figure" opens exactly the figure shown.
//
// After adding or changing one, redo the pictures with
// scripts/snapshot-examples.mjs (see the app's README). The first example of
// each generator is also its social card (static/og/<generator>.png).
//
// Captions say only what the figure shows; answer keys come from the
// generators' own logic (./details.server.ts), never typed here.

import { CATALOG } from '$shared/catalog/index'
import type { Load } from '$lib/generators/circuit-diagram/settings'
import type { Force } from '$lib/generators/free-body-diagram/settings'
import type { InclineObject } from '$lib/generators/inclined-plane/settings'
import type { Segment } from '$lib/generators/motion-graphs/settings'
import type { PulleyObject } from '$lib/generators/pulley/settings'
import type { Vector } from '$lib/generators/vector-diagram/settings'
import type { Label } from '$lib/shared/label'
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

// Labels are written as in a page address: F_N is F with N below it, theta is θ, 30deg is 30°.
const text = (t: string): Label => ({ mode: 'text', text: t })
const blank = (t: string): Label => ({ mode: 'blank', text: t })

/** A Free Body Diagram force, with its other fields at their defaults. */
const force = (angle: number, length: number, label: string, more: Partial<Force> = {}): Force => ({
  angle,
  length,
  label: text(label),
  arc: false,
  from: 'h',
  arcLabel: text('theta'),
  parts: false,
  xLabel: text('F_x'),
  yLabel: text('F_y'),
  ...more,
})

/** A Motion Graph segment. */
const segment = (kind: Segment['kind'], speed: number, duration: number, dir: Segment['dir'] = 'forward'): Segment => ({ kind, speed, duration, dir })

/** A Vector Diagram vector, with its other fields at their defaults. */
const vector = (magnitude: number, angle: number, label: string, more: Partial<Vector> = {}): Vector => ({
  magnitude,
  angle,
  label: text(label),
  style: 'solid',
  arc: false,
  from: 'h',
  arcLabel: text('theta'),
  parts: false,
  xLabel: text('A_x'),
  yLabel: text('A_y'),
  ...more,
})

/** A Pulley object labeled m_n, with its weight m_n g and its other fields at their defaults. */
const mass = (n: number, more: Partial<PulleyObject> = {}): PulleyObject => ({
  label: text(`m_${n}`),
  gravityLabel: text(`m_${n} g`),
  kind: 'block',
  size: 1,
  ...more,
})

/** An Inclined Plane object, a block of the usual size unless `more` says otherwise. */
const onRamp = (label: string, more: Partial<InclineObject> = {}): InclineObject => ({ label: text(label), kind: 'block', size: 1, ...more })

/** A Circuit Diagram resistor (or bulb), its name numbered automatically unless given. */
const load = (value: Label, more: Partial<Load> = {}): Load => ({ kind: 'resistor', name: text(''), value, ...more })
const none = (t: string): Label => ({ mode: 'none', text: t })

export const EXAMPLES: Example[] = [
  ...examplesOf('free-body-diagram', [
    {
      slug: 'free-body-diagram-box-pushed-across-floor-with-friction',
      title: 'Free body diagram of a box pushed across a floor with friction',
      alt: 'A free body diagram of a block with four forces: F_g down, F_N up, F_A to the right and a shorter F_f to the left, with a dashed velocity arrow v to the right',
      caption:
        'A block with four forces drawn from its middle: gravity F_g straight down, the normal force F_N straight up, an applied force F_A to the right and a shorter friction force F_f to the left. A dashed velocity arrow v beside the block points to the right, the way the box slides. There is no floor or hand in the figure, only the forces on the box.',
      settings: {
        body: 'block',
        forces: [force(270, 1, 'F_g'), force(90, 1, 'F_N'), force(0, 1, 'F_A'), force(180, 0.6, 'F_f')],
        velocity: true,
      },
    },
    {
      slug: 'free-body-diagram-block-sliding-down-incline-with-friction',
      title: 'Free body diagram of a block sliding down an incline with friction',
      alt: 'A free body diagram of a block with F_g straight down, F_N tilted 30° from the vertical and marked θ, and F_f pointing up the slope, with a dashed velocity arrow down the slope',
      caption:
        'A block sliding down a ramp that rises to the right at 30°, drawn without the ramp. Gravity F_g points straight down; the normal force F_N points up and to the left, square to the slope, with an angle mark θ between it and the dashed vertical; friction F_f points up the slope. A dashed velocity arrow v points down the slope.',
      settings: {
        body: 'block',
        forces: [force(270, 1, 'F_g'), force(120, 0.85, 'F_N', { arc: true, from: 'v' }), force(30, 0.5, 'F_f')],
        velocity: true,
        velocityAngle: 210,
      },
    },
    {
      slug: 'free-body-diagram-sign-hanging-from-two-cables',
      title: 'Free body diagram of a sign hanging from two cables',
      alt: 'A free body diagram of a dot with tensions T_1 and T_2 pulling up and out at θ above the horizontal on each side, and F_g straight down',
      caption:
        'A dot with three forces: tensions T_1 up and to the left and T_2 up and to the right, each 30° above the horizontal and marked θ from a dashed horizontal line, and the weight F_g straight down. All three are drawn the same length.',
      settings: {
        forces: [force(150, 1, 'T_1', { arc: true }), force(30, 1, 'T_2', { arc: true }), force(270, 1, 'F_g')],
      },
    },
    {
      slug: 'free-body-diagram-falling-ball-with-air-resistance',
      title: 'Free body diagram of a falling ball with air resistance',
      alt: 'A free body diagram of a ball with a long F_g arrow down and a shorter F_air arrow up, beside dashed v and a arrows pointing down',
      caption:
        'A ball falling through the air, with gravity F_g straight down and a shorter air resistance force F_air straight up. Beside it, dashed arrows show its velocity v and acceleration a, both pointing down.',
      settings: {
        body: 'ball',
        forces: [force(270, 1, 'F_g'), force(90, 0.5, 'F_{air}')],
        velocity: true,
        velocityAngle: 270,
        acceleration: true,
        accelerationAngle: 270,
      },
    },
    {
      slug: 'free-body-diagram-sled-pulled-at-an-angle',
      title: 'Free body diagram of a sled pulled at an angle',
      alt: 'A free body diagram of a block pulled by F_A at θ above the horizontal, with F_g down, a shorter F_N up and F_f to the left',
      caption:
        'A block pulled by a rope, with the applied force F_A pointing up and to the right at 35° above the horizontal, its angle marked θ from a dashed horizontal line. Gravity F_g points down, friction F_f to the left, and the normal force F_N up, drawn shorter than F_g.',
      settings: {
        body: 'block',
        forces: [
          force(270, 1, 'F_g'),
          force(90, 0.6, 'F_N'),
          force(180, 0.5, 'F_f'),
          force(35, 1, 'F_A', { arc: true }),
        ],
      },
    },
    {
      slug: 'free-body-diagram-normal-force-and-tension-both-up-vector-notation',
      title: 'Free body diagram with the normal force and tension both pointing up, in vector notation',
      alt: 'A free body diagram of a block with F_g straight down and two shorter arrows side by side pointing up, F_N and T, every label with an arrow over its letter',
      caption:
        'A block resting on a floor while a rope pulls up on it, too weakly to lift it. Gravity F_g points straight down; the normal force F_N and the tension T both point straight up, drawn side by side and each shorter than F_g. Every label has an arrow over its letter, the way vectors are written.',
      settings: {
        body: 'block',
        forces: [force(270, 1, 'F_g'), force(90, 0.6, 'F_N'), force(90, 0.4, 'T')],
        notation: 'arrow',
      },
    },
  ]),

  ...examplesOf('inclined-plane', [
    {
      slug: 'block-on-rough-inclined-plane-gravity-normal-friction',
      title: 'Block on a rough inclined plane with gravity, normal force and friction',
      alt: 'A block labeled m on a hatched ramp at angle θ, with F_g straight down, F_N out of the slope and F_f up the slope',
      caption:
        'A block labeled m resting on a ramp that rises to the right at 30°, its angle marked θ at the foot. The slope is hatched to show it is rough. Gravity F_g points straight down from the block, the normal force F_N points out of the slope, and friction F_f points up the slope along the bottom of the block.',
      settings: { surface: 'rough', gravity: true, normal: true, friction: 'up' },
    },
    {
      slug: 'cart-rolling-down-a-20-degree-ramp',
      title: 'Cart rolling down a 20° ramp',
      alt: 'A cart labeled m on a smooth ramp at 20°, with dashed velocity v and acceleration a arrows pointing down the slope',
      caption:
        'A cart labeled m on a smooth ramp rising to the right, its angle labeled 20° at the foot. Dashed arrows above the cart show its velocity v and acceleration a, both pointing down the slope. No forces are drawn, so students can add them.',
      settings: { objects: [onRamp('m', { kind: 'cart' })], angle: 20, angleLabel: text('20deg'), velocity: 'down', acceleration: 'down' },
    },
    {
      slug: 'ball-on-ramp-length-height-angle-labeled',
      title: 'Ball on a ramp with its length, height and angle labeled',
      alt: 'A ball labeled m on a ramp, with the slope’s length marked L, the ramp’s height marked h and its angle marked θ',
      caption:
        'A ball labeled m on a smooth ramp rising to the right at 25°. The length of the slope is marked L along it, the ramp’s height is marked h beside its tall side, and the angle at the foot is marked θ. Use it for energy questions, such as the ball’s speed at the bottom.',
      settings: { objects: [onRamp('m', { kind: 'ball' })], angle: 25, lengthMark: true, heightMark: true },
    },
    {
      slug: 'label-the-forces-block-on-a-35-degree-incline',
      title: 'Label the forces: 5 kg block on a 35° incline',
      alt: 'A block labeled 5 kg on a rough ramp at 35°, with three force arrows, down, out of the slope and up the slope, each with a blank line for its label',
      caption:
        'A block labeled 5 kg on a rough, hatched ramp at 35°. Three force arrows are drawn from the block, straight down, out of the slope and up the slope, each with a blank line where its name goes, for students to label gravity, the normal force and friction.',
      settings: {
        objects: [onRamp('5 kg')],
        angle: 35,
        angleLabel: text('35deg'),
        surface: 'rough',
        gravity: true,
        gravityLabel: blank('F_g'),
        normal: true,
        normalLabel: blank('F_N'),
        friction: 'up',
        frictionLabel: blank('F_f'),
      },
    },
    {
      slug: 'block-pushed-up-a-rough-incline',
      title: 'Block pushed up a rough incline with an applied force',
      alt: 'A block labeled m on a rough ramp at θ, with F_A up the slope, F_f down the slope, F_g down and F_N out of the slope, and a dashed velocity v up the slope',
      caption:
        'A block labeled m pushed up a rough ramp at 30°, its angle marked θ. The applied force F_A points up the slope and friction F_f points down it, opposing the motion; gravity F_g points straight down and the normal force F_N out of the slope. A dashed velocity arrow v points up the slope.',
      settings: { surface: 'rough', gravity: true, normal: true, friction: 'down', applied: 'up', velocity: 'up' },
    },
    {
      slug: 'two-blocks-tied-by-a-string-pulled-up-an-incline',
      title: 'Two blocks tied by a string, pulled up an incline',
      alt: 'Blocks m_1 and m_2 on a ramp at θ, tied by a string, with F_A pulling m_2 up the slope, tension T at both ends of the string, F_g1 and F_g2 down and F_N1 and F_N2 out of the slope',
      caption:
        'Two blocks on a smooth ramp at 30°, its angle marked θ: m_1 lower down and m_2 above it, tied together by a string parallel to the slope. An applied force F_A pulls m_2 up the slope, and tension T is drawn at both ends of the string, pulling each block toward the other. Each block has its own weight, F_g1 and F_g2, straight down, and its own normal force, F_N1 and F_N2, out of the slope.',
      settings: { objects: [onRamp('m_1'), onRamp('m_2')], tension: true, gravity: true, normal: true, applied: 'up' },
    },
  ]),

  ...examplesOf('pulley', [
    {
      slug: 'atwood-machine-tension-weight-acceleration',
      title: 'Atwood machine with tension, weight and acceleration',
      alt: 'An Atwood machine: masses m_1 and m_2 hanging over one fixed pulley, with tension T up each side of the string, weights m_1 g and m_2 g down, and dashed acceleration arrows a, up on the left and down on the right',
      caption:
        'Two blocks, m_1 on the left and m_2 on the right, hang from one string over a fixed pulley hung from the ceiling. Tension T is drawn on each side of the string, pulling up on each block and down on the pulley, and the weights m_1 g and m_2 g point down from the blocks. Dashed acceleration arrows a point up beside m_1 and down beside m_2.',
      settings: { tension: true, gravity: true, acceleration: 'forward' },
    },
    {
      slug: 'block-on-table-pulled-by-hanging-mass-over-pulley',
      title: 'Block on a table pulled by a hanging mass over a pulley',
      alt: 'A block m_1 on a rough table tied over a pulley at the table’s edge to a hanging block m_2, with tension, weight, normal force, friction and acceleration arrows',
      caption:
        'A block m_1 on a rough, hatched table is tied by a string over a pulley at the table’s edge to a block m_2 hanging below. Tension T runs along both parts of the string; m_1 g and m_2 g point down, the normal force F_N points up from m_1, and friction F_f points away from the pulley. Dashed arrows a show m_1 moving toward the pulley and m_2 falling.',
      settings: { setup: 'table', surface: 'rough', tension: true, gravity: true, normal: true, friction: 'away', acceleration: 'forward' },
    },
    {
      slug: 'block-on-incline-tied-over-pulley-to-hanging-mass',
      title: 'Block on an incline tied over a pulley to a hanging mass',
      alt: 'A block m_1 on a ramp at angle θ, tied by a string over a pulley at the top of the ramp to a hanging block m_2, with tension, weights and the normal force drawn',
      caption:
        'A block m_1 on a smooth ramp at 40°, its angle marked θ, tied by a string running parallel to the slope over a pulley at the top of the ramp to a block m_2 hanging beside the ramp’s tall side. Tension T is drawn along the string, the weights m_1 g and m_2 g point straight down and the normal force F_N points out of the slope.',
      settings: { setup: 'ramp', angle: 40, tension: true, gravity: true, normal: true },
    },
    {
      slug: 'block-and-tackle-3-strands-holding-the-load',
      title: 'Block and tackle with 3 strands holding up the load',
      alt: 'A block and tackle: a load m hanging from a bar under a movable pulley, held up by three strands of rope, with tension T up each strand, T down at the free end, and the weight mg',
      caption:
        'A block and tackle with a load m held up by three strands of one rope, running over two fixed pulleys at the ceiling and a movable pulley on a bar above the load. Tension T points up in each of the three strands holding the load and down at the free end, where the effort pulls, and the load’s weight mg points down.',
      settings: { setup: 'tackle', strands: 3, tension: true, gravity: true },
    },
    {
      slug: 'cart-on-table-and-hanging-mass-masses-left-blank',
      title: 'Cart on a table and a hanging mass, masses left blank',
      alt: 'A cart on a smooth table tied over a pulley to a hanging block, with blank lines on the cart and the block for their masses',
      caption:
        'A cart on a smooth table, tied by a string over a pulley at the table’s edge to a block hanging below. Both have a blank line in place of a label, so you can write in the masses for your problem. No forces are drawn.',
      settings: { setup: 'table', objects: [mass(1, { kind: 'cart', label: blank('m_1') }), mass(2, { label: blank('m_2') })] },
    },
    {
      slug: 'atwood-machine-with-three-masses',
      title: 'Atwood machine with three masses',
      alt: 'An Atwood machine with m_1 on the left, m_2 on the right and m_3 hanging below m_2 on a second string, with tensions T_1 and T_2, weights m_1 g, m_2 g and m_3 g, and dashed acceleration arrows a',
      caption:
        'Blocks m_1 and m_2 hang from one string over a fixed pulley, and a third block, m_3, hangs below m_2 on a second string. Tension T_1 is drawn at both ends of the first string and T_2 at both ends of the second, and the weights m_1 g, m_2 g and m_3 g point straight down. Dashed acceleration arrows a point up beside m_1 and down beside m_2 and m_3.',
      settings: { objects: [mass(1), mass(2), mass(3)], tension: true, gravity: true, acceleration: 'forward' },
    },
  ]),

  ...examplesOf('projectile-motion', [
    {
      slug: 'projectile-launched-at-30-degrees-with-velocity-components',
      title: 'Projectile launched at 30° with its velocity components',
      alt: 'A ball launched from level ground at 30°, with the launch velocity v_0, its components v_0x and v_0y, and the dashed parabolic path to where it lands',
      caption:
        'A ball launched from level ground at 30° above the horizontal, the angle labeled 30°. The launch velocity v_0 is drawn at the ball, with its horizontal and vertical components v_0x and v_0y, and a dashed parabola shows the path to where the ball lands on the ground.',
      settings: { angle: 30, angleLabel: text('30deg'), components: true },
    },
    {
      slug: 'ball-launched-horizontally-off-a-cliff',
      title: 'Ball launched horizontally off a cliff',
      alt: 'A ball launched horizontally off the top of a cliff with velocity v_0, drawn again at four equal time steps along its dashed path, with g down and the cliff’s height h and range R marked',
      caption:
        'A ball launched horizontally from the top corner of a cliff, with its launch velocity v_0 and the acceleration due to gravity g pointing down. The ball is drawn again at four equal time steps along its dashed path, the last where it lands: evenly spaced across, but farther apart each step down. The cliff’s height h and the range R are marked.',
      settings: { start: 'cliff', angle: 0, positions: 4, gravity: true, cliffMark: true, rangeMark: true },
    },
    {
      slug: 'projectile-path-at-equal-time-steps-lettered',
      title: 'Projectile path with the ball at equal time steps, lettered',
      alt: 'A ball launched at 60° from level ground, shown at the launch and six equal time steps along its path, lettered A to G',
      caption:
        'A ball launched from level ground at 60°, with its dashed path and the ball drawn at the launch and at six equal time steps after it, lettered A to G from the launch to the landing. No vectors are drawn, so students can add the velocity or acceleration at each point.',
      settings: { angle: 60, positions: 6, letters: true, velocity: false },
    },
    {
      slug: 'projectile-maximum-height-and-range-labeled',
      title: 'Projectile with its maximum height and range labeled',
      alt: 'A ball launched at 45° with velocity v_0, its dashed path, g pointing down, the maximum height marked H and the range marked R',
      caption:
        'A ball launched from level ground at 45°, the angle marked θ, with its launch velocity v_0 and the acceleration due to gravity g pointing down. Its maximum height is marked H and its range along the ground R.',
      settings: { gravity: true, heightMark: true, rangeMark: true },
    },
    {
      slug: 'sketch-the-path-ball-launched-upward-off-a-cliff',
      title: 'Sketch the path: ball launched upward off a cliff',
      alt: 'A ball on the top corner of a cliff with a launch velocity v_0 at θ above the horizontal and the cliff’s height marked h, with no path drawn',
      caption:
        'A ball on the top corner of a cliff, launched at 30° above the horizontal with velocity v_0, the angle marked θ, and the cliff’s height marked h. The path is left off, so students sketch it themselves.',
      settings: { start: 'cliff', angle: 30, path: false, cliffMark: true },
    },
  ]),

  ...examplesOf('motion-graphs', [
    {
      slug: 'position-time-graph-speeding-up-constant-velocity-slowing-down-lettered',
      title: 'Position–time graph: speeding up, constant velocity, slowing down, lettered',
      alt: 'A position–time graph with its segment ends lettered A to E: curving upward from A to B, a straight line from B to C, curving over and leveling off from C to D, and flat from D to E',
      caption:
        'A position–time graph of a cart that speeds up from rest for 4 s, moves at a constant 4 m/s for 4 s, slows down to a stop over 4 s and stays at rest for 3 s. Its segment ends are lettered A to E: the line curves upward from A to B, is straight from B to C, curves over from C to D, and is flat from D to E.',
      settings: { letters: true },
    },
    {
      slug: 'matching-position-velocity-acceleration-time-graphs-stacked',
      title: 'Matching position–time, velocity–time and acceleration–time graphs',
      alt: 'Position–time, velocity–time and acceleration–time graphs stacked on one time axis for a cart that goes forward, stops, then goes back, each segment in its own line style, with the segment ends lettered A to F',
      caption:
        'Three graphs of one motion stacked on the same time axis: position, velocity and acceleration. The cart speeds up forward from A to B, moves at 4 m/s from B to C, slows to a stop at D, speeds up backward from D to E and slows to a stop again at F. Each segment has its own line style, and the segment ends are lettered A to F on every graph.',
      settings: {
        graphs: 'all',
        letters: true,
        styles: true,
        segments: [segment('faster', 4, 2), segment('forward', 4, 3), segment('slower', 0, 2), segment('faster', 4, 2, 'back'), segment('slower', 0, 2)],
      },
    },
    {
      slug: 'velocity-time-graph-speeding-up-and-slowing-down',
      title: 'Velocity–time graph of a cart speeding up and slowing down',
      alt: 'A velocity–time graph of straight lines lettered A to F: flat at zero from A to B, rising gently from B to C, rising more steeply from C to D, level from D to E, and falling back to zero from E to F',
      caption:
        'A velocity–time graph made of straight lines, lettered A to F. The cart is at rest from A to B, speeds up to 2 m/s from B to C, speeds up more quickly to 6 m/s from C to D, holds 6 m/s from D to E, and slows to a stop from E to F. The steeper the line, the greater the acceleration.',
      settings: {
        graphs: 'vt',
        letters: true,
        segments: [segment('rest', 0, 2), segment('faster', 2, 3), segment('faster', 6, 3), segment('forward', 6, 3), segment('slower', 0, 3)],
      },
    },
    {
      slug: 'position-time-graph-shapes-without-numbers',
      title: 'Position–time graph shapes without numbers',
      alt: 'A position–time graph with no numbers or gridlines, lettered A to F: curving upward, straight, curving over, flat, then a straight line sloping down',
      caption:
        'A position–time graph on plain axes with no numbers or gridlines, so only the shapes show. From A to B the line curves upward (speeding up), from B to C it is straight (constant velocity), from C to D it curves over (slowing down), from D to E it is flat (at rest), and from E to F it slopes straight down (moving back at a constant velocity).',
      settings: {
        numbers: false,
        gridlines: false,
        letters: true,
        segments: [segment('faster', 4, 3), segment('forward', 4, 2), segment('slower', 0, 3), segment('rest', 0, 2), segment('back', 4, 3)],
      },
    },
    {
      slug: 'position-time-graph-tangent-instantaneous-velocity',
      title: 'Tangent to a position–time graph for instantaneous velocity',
      alt: 'A position–time graph curving upward for 6 s, with a dashed tangent line touching the curve at 4 s',
      caption:
        'A position–time graph of a cart speeding up steadily from rest for 6 s, so the line curves upward. A dashed tangent line touches the curve at 4 s; its slope is the cart’s instantaneous velocity at that moment.',
      settings: { segments: [segment('faster', 6, 6)], tangent: true, tangentAt: 4 },
    },
  ]),

  ...examplesOf('motion-map', [
    {
      slug: 'motion-map-cart-speeding-up-constant-velocity-slowing-down-stopping',
      title: 'Motion map of a cart that speeds up, moves at a constant velocity, slows down and stops',
      alt: 'A motion map with a dot every second from t = 0 s to 11 s along a number line from 0 to 35 m, the dots spreading out, then evenly spaced, then closing up, and one last dot labeled 12–15 s, each moving dot with a dashed velocity arrow',
      caption:
        'A cart speeds up from rest for 4 s, moves at a constant 4 m/s for 4 s, slows down to a stop over 4 s and stays at rest for 3 s, drawn as a dot every second along a number line in meters. The dots spread out, are evenly spaced, then close up, and the stop is one dot labeled 12–15 s. Each moving dot has a dashed velocity arrow above it, on one scale, so the arrows grow and shrink with the speed.',
      settings: { labels: 'times' },
    },
    {
      slug: 'motion-map-constant-velocity',
      title: 'Motion map at a constant velocity',
      alt: 'A motion map of seven evenly spaced dots, 3 m apart from 0 to 18 m, labeled t = 0 s to 6 s, each with an equal dashed velocity arrow, and a = 0 written above them',
      caption:
        'An object moving at a constant 3 m/s for 6 s, as a dot every second along a number line from 0 to 18 m. The dots are evenly spaced, 3 m apart, and every velocity arrow is the same length. Above the dots, a = 0: the velocity doesn’t change.',
      settings: { segments: [segment('forward', 3, 6)], labels: 'times', acceleration: true },
    },
    {
      slug: 'motion-map-speeding-up-from-rest',
      title: 'Motion map of an object speeding up from rest',
      alt: 'A motion map of seven dots lettered A to G, the gaps between them growing from left to right, with dashed velocity arrows getting longer and an acceleration arrow labeled a pointing right above them',
      caption:
        'An object speeding up steadily from rest to 6 m/s over 6 s, as a dot every second, lettered A to G. Each gap is 1 m longer than the one before, and the velocity arrows get longer from dot to dot; the first dot, at rest, has none. The acceleration arrow above the dots points the way it moves.',
      settings: { segments: [segment('faster', 6, 6)], labels: 'letters', acceleration: true },
    },
    {
      slug: 'motion-map-slowing-down-to-a-stop',
      title: 'Motion map of an object slowing down to a stop',
      alt: 'A motion map of dots closing up from left to right, labeled t = 0 s to 4 s, then one dot labeled 5–7 s, with dashed velocity arrows getting shorter, and the total displacement Δx drawn under the number line',
      caption:
        'An object moving at 6 m/s for 1 s, then slowing down steadily to a stop over 4 s and staying at rest for 2 s, as a dot every second. The gaps shrink by 1.5 m each second and the velocity arrows get shorter, until the dots meet at one spot, labeled 5–7 s, with no arrow. An arrow under the number line shows the total displacement, Δx.',
      settings: { segments: [segment('forward', 6, 1), segment('slower', 0, 4), segment('rest', 0, 2)], labels: 'times', displacement: true },
    },
    {
      slug: 'motion-map-there-and-back-lettered-to-match-motion-graph',
      title: 'Motion map of a cart going out and back, lettered to match its motion graph',
      alt: 'A motion map of a cart drawn on two lines: on the lower one it speeds up, moves steadily and slows to a stop at D, lettered A to D at the segment ends; on the line above it speeds up back toward the start and slows to a stop at F, with acceleration arrows above each segment',
      caption:
        'A cart speeds up forward from A to B, moves at 4 m/s from B to C and slows to a stop at D; then it speeds up backward from D to E and slows to a stop again at F. The way back is drawn above the way there, so no dots overlap. The letters at the segment ends are the same as on the matching Motion Graph example, and an acceleration arrow, or a = 0, sits above each segment.',
      settings: {
        labels: 'ends',
        acceleration: true,
        object: text('cart'),
        segments: [segment('faster', 4, 2), segment('forward', 4, 3), segment('slower', 0, 2), segment('faster', 4, 2, 'back'), segment('slower', 0, 2)],
      },
    },
    {
      slug: 'motion-map-dots-only-draw-the-velocity-arrows',
      title: 'Dots-only motion map: draw the velocity arrows',
      alt: 'A motion map with dots only, no arrows, lettered A to I along a number line from 0 to 22 m: evenly spaced at first, then spreading out, then closing up to a stop',
      caption:
        'A motion map with no arrows, for students to draw the velocity arrow at each dot. The object moves at 2 m/s for 3 s, speeds up to 5 m/s over 3 s, then slows to a stop over 2 s, a dot every second, lettered A to I. The answer key lists what it does in each segment.',
      settings: { dotsOnly: true, labels: 'letters', segments: [segment('forward', 2, 3), segment('faster', 5, 3), segment('slower', 0, 2)] },
    },
  ]),

  ...examplesOf('spring-scale', [
    {
      slug: 'spring-scale-reading-6-25-n',
      title: 'Spring scale reading 6.25 N',
      alt: 'A tan 10 N spring scale with a block on its hook, the pointer at 6.25 N, with a magnified view of the pointer',
      caption:
        'A tan 10 N spring scale, numbered every 1 N and marked every 0.1 N, with a block hanging from its hook. The pointer is between the 6.2 and 6.3 N marks, and a magnified circle beside the scale shows the marks around it.',
      settings: { force: 6.25 },
    },
    {
      slug: '5-n-spring-scale-with-slotted-masses',
      title: '5 N spring scale with slotted masses',
      alt: 'A green 5 N spring scale holding a hanger with four slotted masses, the pointer at 2.45 N, with a magnified view',
      caption:
        'A green 5 N spring scale, numbered every 0.5 N and marked every 0.1 N, holding a hanger with four slotted masses stacked on it. The pointer sits between the 2.4 and 2.5 N marks, shown enlarged in the magnifier beside the scale.',
      settings: { capacity: '5', force: 2.45, hanging: 'masses', masses: 4 },
    },
    {
      slug: 'spring-scale-reading-in-grams',
      title: 'Spring scale reading in grams',
      alt: 'A pink 1 N spring scale printed in grams, from 0 to 100 g, with a block on its hook and the pointer at 45.5 g',
      caption:
        'A pink 1 N spring scale printed only in grams, its tag reading 100 g, from 0 to 100 g, numbered every 10 g and marked every 1 g, with a block on its hook. The pointer is between the 45 and 46 g marks, shown in the magnifier beside it.',
      settings: { capacity: '1', units: 'grams', force: 0.455 },
    },
    {
      slug: 'spring-scale-with-a-zero-error',
      title: 'Spring scale with a zero error',
      alt: 'Two 10 N spring scales: on the left, with nothing hanging, the pointer rests at 0.20 N; on the right, with a block, it reads 4.30 N',
      caption:
        'The same 10 N spring scale twice. On the left, with nothing on its hook, the pointer rests below zero, at 0.20 N; on the right, with a block hanging, it points to 4.30 N. Students take the zero error off the reading to find the force.',
      settings: { force: 4.1, zero: 0.2 },
    },
    {
      slug: '50-n-spring-scale-in-newtons-and-grams',
      title: '50 N spring scale in newtons and grams',
      alt: 'A black and white 50 N spring scale printed in newtons on the left and grams on the right, with a block on its hook and the pointer at 27.50 N (2750 g)',
      caption:
        'A 50 N spring scale drawn in black and white, printed in newtons left of the slot and grams right of it: 0 to 50 N, numbered every 5 N and marked every 0.5 N, and 0 to 5000 g. A block hangs from its hook and the pointer sits on the 27.5 N mark, level with 2750 g, shown in the magnifier beside it.',
      settings: { capacity: '50', units: 'both', force: 27.5, color: false },
    },
  ]),

  ...examplesOf('length-reading', [
    {
      slug: 'caliper-reading-23-45-mm',
      title: 'Caliper reading 23.45 mm',
      alt: 'A caliper holding a block, reading 23.45 mm on its 0.05 mm sliding scale, with a close-up strip of its scales and a larger close-up of where the marks line up',
      caption:
        'A 150 mm caliper with a block held between its outside jaws. The close-up strip below it shows the sliding scale’s zero just past 23 mm on the main scale, and the larger close-up below that shows its 9th mark, between the 4 and the 5, lined up with a main-scale mark: 23 + 9 × 0.05 = 23.45 mm. The least count, 0.05 mm, is printed on the slider.',
      settings: { instrument: 'caliper' },
    },
    {
      slug: 'caliper-0-1-mm-reading-34-7-mm',
      title: '0.1 mm caliper reading 34.7 mm',
      alt: 'A caliper with a 0.1 mm sliding scale holding a cylinder, reading 34.7 mm, with a close-up strip of its scales',
      caption:
        'A caliper whose sliding scale has 10 divisions over 9 mm, so it reads to 0.1 mm, holding an upright cylinder across its diameter. The close-up strip shows the sliding scale’s zero between 34 and 35 mm on the main scale and its 7th mark lined up with a main-scale mark, so the reading is 34.7 mm.',
      settings: { instrument: 'caliper', leastCount: '0.1', caliper: 34.7, jaws: 'cylinder' },
    },
    {
      slug: 'caliper-0-02-mm-reading-41-38-mm',
      title: '0.02 mm caliper reading 41.38 mm',
      alt: 'A caliper with a 0.02 mm sliding scale holding a ball, reading 41.38 mm, with a close-up strip of its scales and a larger close-up of where the marks line up',
      caption:
        'A caliper whose sliding scale has 50 divisions over 49 mm, so it reads to 0.02 mm, holding a ball. The close-up strip shows the sliding scale’s zero just past 41 mm, and the larger close-up shows its 19th mark, four marks past the 3, lined up with a main-scale mark: 41 + 19 × 0.02 = 41.38 mm.',
      settings: { instrument: 'caliper', leastCount: '0.02', caliper: 41.38, jaws: 'ball' },
    },
    {
      slug: 'caliper-with-a-zero-error',
      title: 'Caliper with a zero error',
      alt: 'Two 0.1 mm calipers: above, with its jaws closed, reading 0.3 mm; below, holding block A, reading 27.6 mm, each with a close-up strip of its scales',
      caption:
        'The same 0.1 mm caliper twice. Above, with its jaws closed, the sliding scale’s zero sits just past the main scale’s zero and its 3rd mark lines up: a zero error of +0.3 mm. Below, holding block A, it reads 27.6 mm. Students take the zero error off the reading: the block is 27.3 mm long.',
      settings: { instrument: 'caliper', leastCount: '0.1', caliper: 27.6, caliperZero: 0.3, jawsLabel: 'A' },
    },
    {
      slug: 'micrometer-reading-7-38-mm',
      title: 'Micrometer reading 7.38 mm',
      alt: 'A micrometer holding a ball bearing, reading 7.38 mm, with a magnified view of its sleeve and thimble',
      caption:
        'A 0–25 mm micrometer with a ball between its anvil and spindle. The magnifier shows the 7 mm mark showing on the sleeve, but not the 7.5 mm mark below the datum line, and the thimble’s 38th mark on the datum line, so the reading is 7 + 0.38 = 7.38 mm. The thimble’s marks bunch together toward its top and bottom edges, as on a real one.',
      settings: { instrument: 'micrometer', jaws: 'ball' },
    },
    {
      slug: 'micrometer-reading-just-past-half-a-millimeter',
      title: 'Micrometer reading just past half a millimeter: 5.51 mm',
      alt: 'A micrometer holding a wire, reading 5.51 mm, with a magnified view showing the 5.5 mm mark just uncovered on the sleeve',
      caption:
        'A micrometer measuring a wire, with the thimble’s edge just past the 5.5 mm mark below the sleeve’s datum line, and the thimble’s 1st mark on the datum line. The reading is 5.5 + 0.01 = 5.51 mm. Missing the half-millimeter mark would give 5.01 mm, the common mistake.',
      settings: { instrument: 'micrometer', micrometer: 5.51, jaws: 'wire' },
    },
    {
      slug: 'micrometer-with-a-negative-zero-error',
      title: 'Micrometer with a negative zero error',
      alt: 'Two micrometers: above, closed, its thimble’s 0 three marks above the datum line, reading −0.03 mm; below, holding a wire, reading 3.27 mm, each with a magnified view',
      caption:
        'The same micrometer twice. Above, closed, the thimble’s 0 has turned three marks past the datum line, so it reads −0.03 mm: a negative zero error. Below, holding a wire, it reads 3.27 mm. Taking off the zero error gives 3.27 − (−0.03) = 3.30 mm.',
      settings: { instrument: 'micrometer', micrometer: 3.27, micrometerZero: -0.03, jaws: 'wire' },
    },
    {
      slug: 'caliper-scales-close-up-62-35-mm',
      title: 'Caliper scales close-up: 62.35 mm',
      alt: 'A close-up strip of a caliper’s main scale and 0.05 mm sliding scale reading 62.35 mm, with a larger close-up of where the marks line up below it',
      caption:
        'The scales alone, without the caliper: the main scale from 6 to 11 cm and the 0.05 mm sliding scale below it, its zero just past 62 mm. A larger close-up below shows its 7th mark, between the 3 and the 4, lined up with a main-scale mark, so the reading is 62 + 7 × 0.05 = 62.35 mm.',
      settings: { instrument: 'caliper', caliper: 62.35, closeUp: 'magnifier' },
    },
    {
      slug: 'metric-ruler-reading-7-45-cm',
      title: 'Metric ruler reading 7.45 cm',
      alt: 'A 15 cm ruler marked in millimeters with a metal cylinder lying along it from 0 to 7.45 cm, with a magnified view of its right end',
      caption:
        'A 15 cm ruler marked every millimeter, with a metal cylinder lying along it, its left end on 0. Its right end falls halfway between 7.4 and 7.5 cm, so its length is 7.45 cm, the hundredths digit estimated. A magnified view shows the right end against the marks.',
      settings: { length: 7.45, object: 'cylinder' },
    },
  ]),

  ...examplesOf('vector-diagram', [
    {
      slug: 'adding-two-perpendicular-vectors-head-to-tail',
      title: 'Adding two perpendicular vectors head to tail',
      alt: 'On a grid, vector A 6 squares to the right, then vector B 8 squares up from its tip, with the dashed resultant R from A’s tail to B’s tip and its angle marked θ',
      caption:
        'Two vectors drawn to scale head to tail on a grid: A, 6 squares to the right, then B, 8 squares straight up from A’s tip. The dashed resultant R runs from A’s tail to B’s tip, with its angle above the horizontal marked θ.',
      settings: { vectors: [vector(6, 0, 'A'), vector(8, 90, 'B')], resultantArc: true },
    },
    {
      slug: 'adding-three-vectors-head-to-tail',
      title: 'Adding three vectors head to tail',
      alt: 'On a grid, vectors A, B and C drawn head to tail, A to the right, B up and to the right, C up and to the left, with the dashed resultant R from A’s tail to C’s tip',
      caption:
        'Three vectors drawn to scale head to tail on a grid: A, 5 squares to the right; B, 4 squares at 60°; and C, 3 squares at 150°, up and to the left. The dashed resultant R runs from the first tail to the last tip.',
      settings: { vectors: [vector(5, 0, 'A'), vector(4, 60, 'B'), vector(3, 150, 'C')] },
    },
    {
      slug: 'resolving-a-vector-into-x-and-y-components',
      title: 'Resolving a vector into x and y components',
      alt: 'On a grid with x and y axes, vector A at θ above the x axis, with its dashed components A_x along the x axis and A_y up to A’s tip',
      caption:
        'One vector A, 5 squares long at 37° above the horizontal, drawn from where the x and y axes cross, on a grid. Its angle is marked θ from the x axis, and its components A_x along the horizontal and A_y up to its tip are drawn as thinner dashed arrows.',
      settings: {
        vectors: [vector(5, 37, 'A', { arc: true, parts: true })],
        resultant: 'none',
        axes: true,
      },
    },
    {
      slug: 'vector-addition-worksheet-draw-the-resultant',
      title: 'Vector addition worksheet: draw the resultant',
      alt: 'On a grid, vector A 4 squares at 30° and vector B 5 squares at 120° drawn head to tail, with no resultant drawn',
      caption:
        'Two vectors drawn to scale head to tail on a grid: A, 4 squares at 30°, and B, 5 squares at 120°, starting from A’s tip. The resultant is left off, so students draw it from A’s tail to B’s tip and measure it.',
      settings: { vectors: [vector(4, 30, 'A'), vector(5, 120, 'B')], resultant: 'none' },
    },
    {
      slug: 'subtracting-vectors-a-minus-b',
      title: 'Subtracting vectors: A − B as A + (−B)',
      alt: 'On a grid, vector A 5 squares to the right, then −B 3 squares straight down from its tip, with the dashed resultant A − B',
      caption:
        'Vector subtraction drawn as addition: A, 5 squares to the right, then −B, 3 squares straight down from A’s tip, the opposite of a B pointing up. The dashed resultant from A’s tail to −B’s tip is labeled A − B.',
      settings: { vectors: [vector(5, 0, 'A'), vector(3, 270, '−B')], resultantLabel: text('A − B') },
    },
  ]),

  ...examplesOf('waves', [
    {
      slug: 'transverse-wave-with-wavelength-and-amplitude-labeled',
      title: 'Transverse wave with its wavelength and amplitude labeled',
      alt: 'A transverse wave on a grid of displacement in cm against distance in m, two and a half cycles long, with its wavelength λ marked from crest to crest, its amplitude A from the rest line up to a crest, and a crest and a trough labeled',
      caption:
        'A transverse wave two and a half cycles long on numbered axes, displacement in centimeters against distance in meters, with gridlines. Its wavelength λ is marked with an arrow from one crest to the next, its amplitude A from the rest line up to the first crest, and a crest and a trough are labeled.',
      settings: { cycles: 2.5, crestLabel: text('crest'), troughLabel: text('trough') },
    },
    {
      slug: 'measure-the-wavelength-and-amplitude-of-a-wave',
      title: 'Measure the wavelength and amplitude of a wave',
      alt: 'A transverse wave three cycles long on a grid of displacement in cm against distance in m, numbered every meter and centimeter, with nothing marked',
      caption:
        'A transverse wave three cycles long on numbered axes with gridlines, displacement in centimeters against distance in meters. Nothing is marked, so students read the wavelength and the amplitude off the axes.',
      settings: { amplitude: 2, wavelength: 6, cycles: 3, wavelengthMark: false, amplitudeMark: false },
    },
    {
      slug: 'displacement-time-graph-of-a-wave-period-and-frequency',
      title: 'Displacement–time graph of a wave: period and frequency',
      alt: 'A transverse wave on axes of displacement in cm against time in s, four cycles over 2 seconds, with tick marks instead of gridlines and its period T marked from crest to crest',
      caption:
        'A wave drawn against time instead of distance: four cycles over 2 seconds, on numbered axes with tick marks rather than gridlines. The period T is marked from one crest to the next and the amplitude is left for students, who work out the frequency from the period.',
      settings: { xAxis: 'time', xTitle: 'Time (s)', amplitude: 4, period: 0.5, cycles: 4, amplitudeMark: false, gridlines: false },
    },
    {
      slug: 'longitudinal-wave-above-a-transverse-wave',
      title: 'Longitudinal wave above its matching transverse wave',
      alt: 'A longitudinal wave drawn as vertical lines, bunched at a compression and spread at a rarefaction, above a transverse wave on a displacement–distance grid, the compressions directly over the crests',
      caption:
        'A longitudinal wave drawn as a row of vertical lines, above the transverse wave it matches on numbered axes. The lines bunch together at each compression, right above a crest, and spread apart at each rarefaction, above a trough. A compression, a rarefaction, a crest and a trough are labeled, and the wavelength λ and amplitude A are marked.',
      settings: {
        wave: 'both',
        cycles: 2.5,
        compressionLabel: text('compression'),
        rarefactionLabel: text('rarefaction'),
        crestLabel: text('crest'),
        troughLabel: text('trough'),
      },
    },
    {
      slug: 'label-the-compression-and-rarefaction-of-a-longitudinal-wave',
      title: 'Label the compression and rarefaction of a longitudinal wave',
      alt: 'A longitudinal wave of vertical lines over a distance axis in m, with its wavelength λ marked from one compression to the next and blank lines under a compression and a rarefaction',
      caption:
        'A longitudinal wave, like a sound wave, drawn as vertical lines over a numbered distance axis. Its wavelength λ is marked from the middle of one compression to the next. Blank lines under a compression and a rarefaction are for students to name them.',
      settings: { wave: 'longitudinal', compressionLabel: blank('compression'), rarefactionLabel: blank('rarefaction') },
    },
    {
      slug: 'label-the-parts-of-a-wave-worksheet',
      title: 'Label the parts of a wave worksheet',
      alt: 'A transverse wave about a dashed rest line, with no axes, with blank lines for its wavelength, amplitude, a crest and a trough',
      caption:
        'A transverse wave two and a half cycles long, drawn about a dashed rest line with no axes. Arrows mark its wavelength and amplitude, and a crest and a trough are pointed out, each with a blank line for students to write what it is.',
      settings: {
        axes: false,
        cycles: 2.5,
        wavelengthLabel: blank('lambda'),
        amplitudeLabel: blank('A'),
        crestLabel: blank('crest'),
        troughLabel: blank('trough'),
        },
      },
    ]),

  ...examplesOf('circuit-diagram', [
    {
      slug: 'series-circuit-three-resistors-ammeter-reading-blank',
      title: 'Series circuit with three resistors and an ammeter',
      alt: 'A circuit diagram of a 12 V battery, an ammeter with a blank reading, and resistors R_1 2 Ω, R_2 4 Ω and R_3 6 Ω in series',
      caption:
        'A 12 V battery of two cells drives one loop through three resistors in series, R_1 of 2 Ω, R_2 of 4 Ω and R_3 of 6 Ω, and an ammeter. The ammeter’s reading is a blank line for students to work out. Resistors are drawn as US zigzags.',
      settings: { ammeter: true, ammeterLabel: blank('0.5 A') },
    },
    {
      slug: 'parallel-circuit-two-resistors-with-voltmeter',
      title: 'Parallel circuit with two resistors and a voltmeter',
      alt: 'A circuit diagram of a 6 V battery and an ammeter beside it, driving R_1 3 Ω and R_2 6 Ω in parallel, with a voltmeter across R_2 and its reading left blank',
      caption:
        'A 6 V battery and an ammeter in the main line, with two resistors in parallel as the rungs of a ladder: R_1 of 3 Ω and R_2 of 6 Ω. A voltmeter is connected across R_2 with a blank reading, and junction dots mark where the branches meet.',
      settings: {
        arrangement: 'parallel',
        loads: [load(text('3 Omega')), load(text('6 Omega'))],
        sourceValue: text('6 V'),
        ammeter: true,
        voltmeter: '2',
        voltmeterLabel: blank('6 V'),
      },
    },
    {
      slug: 'gcse-series-circuit-cell-switch-two-lamps-voltmeter',
      title: 'GCSE series circuit: a cell, a switch and two lamps',
      alt: 'A circuit diagram in IEC symbols: a cell, a closed switch and two lamps L_1 and L_2 in series, with a voltmeter across L_1',
      caption:
        'A circuit drawn in IEC symbols, as UK GCSE uses: one cell, a closed switch and two filament lamps, L_1 and L_2, in series, each lamp a circle with a cross. A voltmeter is connected across L_1. No values are given.',
      settings: {
        loads: [load(none('4 Omega'), { kind: 'bulb' }), load(none('4 Omega'), { kind: 'bulb' })],
        source: 'cell',
        sourceValue: none('12 V'),
        switch: 'closed',
        voltmeter: '1',
        symbols: 'iec',
      },
    },
    {
      slug: 'parallel-circuit-three-resistors-find-the-unknown-resistance',
      title: 'Parallel circuit with three resistors: find the unknown resistance',
      alt: 'A circuit diagram of a 12 V battery with an ammeter reading 6 A, and three resistors in parallel: R_1 4 Ω, R_2 6 Ω and R_3 x',
      caption:
        'A 12 V battery and an ammeter reading 6 A in the main line, with three resistors in parallel: R_1 of 4 Ω, R_2 of 6 Ω and R_3, whose resistance is the unknown x for students to find. The battery’s + and − terminals are marked.',
      settings: {
        arrangement: 'parallel',
        loads: [load(text('4 Omega')), load(text('6 Omega')), load(text('x'))],
        ammeter: true,
        ammeterLabel: text('6 A'),
        polarity: true,
      },
    },
    {
      slug: 'series-circuit-bulbs-open-switch',
      title: 'Series circuit with two bulbs and an open switch',
      alt: 'A circuit diagram of a 3 V battery, an open switch and two bulbs in series',
      caption:
        'A 3 V battery, an open switch and two light bulbs in series, the bulbs drawn as circles with a looped filament. With the switch open, no current flows and neither bulb lights.',
      settings: {
        loads: [load(none('4 Omega'), { kind: 'bulb' }), load(none('4 Omega'), { kind: 'bulb' })],
        sourceValue: text('3 V'),
        switch: 'open',
      },
    },
  ]),

  ...examplesOf('ray-diagram', [
    {
      slug: 'converging-lens-ray-diagram-object-beyond-2f',
      title: 'Converging lens ray diagram: object beyond 2F',
      alt: 'A ray diagram of a converging lens with F, F′, 2F and 2F′ marked, an object O beyond 2F, three principal rays, and a real, inverted, smaller image I between F′ and 2F′',
      caption:
        'A converging lens of focal length 10 cm with an object 4 cm tall, 30 cm away, beyond 2F. Three principal rays leave the object’s tip: parallel then through F′, straight through the center, and through F then parallel. They meet between F′ and 2F′, where the real, inverted, smaller image is drawn.',
      settings: {},
    },
    {
      slug: 'converging-lens-object-at-2f',
      title: 'Converging lens with the object at 2F',
      alt: 'A ray diagram of a converging lens with the object at 2F and a real, inverted image of the same size at 2F′, with the object and image distances marked d_o and d_i',
      caption:
        'A converging lens of focal length 10 cm with the object at 2F, 20 cm away. The three principal rays meet at 2F′ on the far side, where the image is real, inverted and the same size as the object. Arrows below the axis mark the object distance d_o and the image distance d_i.',
      settings: { distance: 20, doMark: true, diMark: true },
    },
    {
      slug: 'magnifying-glass-ray-diagram-object-inside-f',
      title: 'Magnifying glass ray diagram: object inside F',
      alt: 'A ray diagram of a converging lens with the object inside F; the rays spread out after the lens and their dashed extensions meet behind the object at a dashed, upright, larger virtual image',
      caption:
        'A converging lens of focal length 10 cm used as a magnifying glass, with a 3 cm object 5 cm away, inside F. The rays spread apart after the lens, so they never meet; their dashed extensions meet on the object’s side, 10 cm from the lens, at the virtual, upright image twice the object’s size, drawn dashed.',
      settings: { distance: 5, height: 3 },
    },
    {
      slug: 'diverging-lens-ray-diagram',
      title: 'Diverging lens ray diagram',
      alt: 'A ray diagram of a diverging lens with an object beyond 2F; the rays spread out and their dashed extensions meet between the lens and F at a small, upright, virtual image',
      caption:
        'A diverging lens of focal length 10 cm with an object 20 cm away. The parallel ray spreads out as if from F, the ray heading for F′ leaves parallel, and the center ray goes straight on. Their dashed extensions meet between F and the lens, at the virtual, upright, smaller image, drawn dashed.',
      settings: { element: 'diverging', distance: 20 },
    },
    {
      slug: 'concave-mirror-ray-diagram-object-between-c-and-f',
      title: 'Concave mirror ray diagram: object between C and F',
      alt: 'A ray diagram of a concave mirror with F and C marked, an object between C and F, four principal rays, and a real, inverted, larger image beyond C',
      caption:
        'A concave mirror of focal length 10 cm with an object 15 cm away, between C and F. Four rays reflect from it: parallel then through F, through F then parallel, through C and back on itself, and off the vertex at the same angle. They meet 30 cm in front of the mirror, beyond C, at the real, inverted image twice the object’s size.',
      settings: { element: 'concave', distance: 15, height: 3 },
    },
    {
      slug: 'convex-mirror-ray-diagram',
      title: 'Convex mirror ray diagram',
      alt: 'A ray diagram of a convex mirror with F and C behind it; the reflected rays spread out and their dashed extensions meet behind the mirror at a small, upright, virtual image',
      caption:
        'A convex mirror of focal length 10 cm, its F and C behind it, with an object 20 cm in front. Each ray reflects outward: the parallel one as if from F, the one heading for F back parallel, the one heading for C back on itself, and the one at the vertex at the same angle. Dashed extensions meet behind the mirror at the virtual, upright, smaller image.',
      settings: { element: 'convex', distance: 20 },
    },
    {
      slug: 'plane-mirror-ray-diagram',
      title: 'Plane mirror ray diagram',
      alt: 'A ray diagram of a plane mirror with an object 15 cm in front; two rays from its tip reflect at equal angles and their dashed extensions meet behind the mirror at an upright virtual image the same size, 15 cm behind',
      caption:
        'A plane mirror with an object 4 cm tall, 15 cm in front of it. Two rays from the object’s tip reflect at equal angles, one off the mirror level with the object’s foot and one above the tip. Their dashed extensions meet behind the mirror at the virtual image, upright and the same size, 15 cm behind it, the distances marked d_o and d_i.',
      settings: { element: 'plane', distance: 15, doMark: true, diMark: true },
    },
    {
      slug: 'blank-converging-lens-ray-diagram-worksheet',
      title: 'Blank converging lens ray diagram worksheet',
      alt: 'A blank ray diagram of a converging lens with F, F′, 2F and 2F′ marked on the principal axis, an object between F and 2F, and a numbered cm scale underneath, with no rays drawn',
      caption:
        'A converging lens of focal length 10 cm on its principal axis with F, F′, 2F and 2F′ marked and an object 15 cm away, between F and 2F, and no rays: a template for students to draw the principal rays and find the image. A cm scale numbered from the lens runs under it, for measuring the image distance.',
      settings: { distance: 15, shown: 'setup', scale: true },
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
