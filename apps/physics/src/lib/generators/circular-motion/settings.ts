// Every choice the teacher makes on the Circular Motion Generator, with its
// default: an object on a dashed circle seen from above, with its velocity
// and centripetal acceleration. One setup choice picks what's drawn; each
// setup has a choice or two of its own, and the vectors and marks are
// switches that only name what the setup already fixes.

import { bool, choice, defineSettings, int, label } from '$lib/shared/settings'

export const SETUPS = ['top', 'vertical', 'conical'] as const
export type Setup = (typeof SETUPS)[number]

export const SETUP_NAMES: Record<Setup, string> = {
  top: 'Top view',
  vertical: 'Vertical circle',
  conical: 'Conical pendulum',
}

export const AROUND = ['nothing', 'string', 'turntable', 'road'] as const
export type Around = (typeof AROUND)[number]

export const HELD = ['string', 'loop', 'hill', 'dip'] as const
export type Held = (typeof HELD)[number]

export const POINTS = ['top', 'bottom', 'side', 'topBottom', 'all'] as const
export type Points = (typeof POINTS)[number]

const text = (t: string) => ({ mode: 'text' as const, text: t })

export const circularSettings = defineSettings({
  setup: choice<Setup>('top', SETUPS),

  // Top view.
  /** What the object goes round on: nothing, a string to the centre, a turntable, or a road (a flat curve). */
  around: choice<Around>('nothing', AROUND),
  /** How many positions the object is drawn at, evenly spaced from startAngle. */
  positions: int(1, 1, 8),
  /** Where the first position is, in degrees counterclockwise from the right. */
  startAngle: int(45, 0, 359),
  /** Which way the object goes round, in the Top view and the Vertical circle. */
  direction: choice('ccw', ['ccw', 'cw']),
  /** A second object on a turntable, halfway out on the first one's radius. */
  inner: bool(false),

  // Vertical circle.
  held: choice<Held>('string', HELD),
  /** Where on the circle the object is drawn. A hill is always the top, a dip the bottom. */
  points: choice<Points>('topBottom', POINTS),

  // Conical pendulum.
  /** The string's angle from the vertical. */
  angle: int(30, 15, 60),
  /** The conical pendulum's angle, and the Top view's angle mark. */
  angleLabel: label(text('theta')),
  lengthLabel: label(text('L')),

  object: choice('ball', ['ball', 'block']),
  objectLabel: label({ mode: 'none', text: 'm' }),

  // Vectors. Velocity and acceleration are motion, so they're dashed.
  velocity: bool(true),
  velocityLabel: label(text('v')),
  /** The conical pendulum's velocity is along the line of sight: out of the page (a dot) or into it (a cross). */
  velocityInto: choice('out', ['out', 'in']),
  acceleration: bool(true),
  accelerationLabel: label(text('a_c')),
  /** Top view: a solid arrow toward the centre, named by the teacher (F_c, T, F_f, F_g). */
  inwardForce: bool(false),
  forceLabel: label(text('F_c')),
  /** Side views: the real forces on the object, gravity and the tension or the normal force. */
  forces: bool(true),
  gravityLabel: label(text('F_g')),
  tensionLabel: label(text('T')),
  normalLabel: label(text('F_N')),
  /** Conical pendulum: the tension's horizontal and vertical components. */
  components: bool(false),
  xLabel: label(text('T_x')),
  yLabel: label(text('T_y')),

  // Marks.
  radius: choice('none', ['none', 'radius', 'diameter']),
  radiusLabel: label(text('r')),
  angularSpeed: bool(false),
  omegaLabel: label(text('omega')),
  angleMark: bool(false),
  /** A, B, C… beside each position, in the order the object reaches them. */
  pointLabels: bool(false),

  /** How every vector's label is set: as typed, with an arrow over it, or in bold. */
  notation: choice('none', ['none', 'arrow', 'bold']),
  color: bool(false),
})

export type CircularSettings = typeof circularSettings.defaults

/** Where the object is drawn on a Vertical circle, in the order top, side, bottom. */
export function pointsOf(s: Pick<CircularSettings, 'held' | 'points'>): ('top' | 'side' | 'bottom')[] {
  if (s.held === 'hill') return ['top']
  if (s.held === 'dip') return ['bottom']
  return { top: ['top'], bottom: ['bottom'], side: ['side'], topBottom: ['top', 'bottom'], all: ['top', 'side', 'bottom'] }[s.points] as ('top' | 'side' | 'bottom')[]
}

/** Is the object a block? On a road it always is, turned along the road. */
export const objectKind = (s: Pick<CircularSettings, 'setup' | 'around' | 'object'>) => (s.setup === 'top' && s.around === 'road' ? 'block' : s.object)

/** Is there a second object? Only on a turntable. */
export const hasInner = (s: Pick<CircularSettings, 'setup' | 'around' | 'inner'>) => s.setup === 'top' && s.around === 'turntable' && s.inner
