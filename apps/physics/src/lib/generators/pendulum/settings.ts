// Every choice the teacher makes on the Pendulum Generator, with its default:
// the Swing, a bob released 30° to the right of the vertical, drawn at its
// release point, at the bottom and at the far side, with its dashed path, the
// angle θ, the string's length L and the height h it drops. The labels are
// Physics' own ($lib/shared/label), each written, a blank line, or none.

import { figureTextFields } from '$shared/figureText'
import { bool, choice, defineSettings, number, type Field } from '$shared/settings'
import { cleanLabel, decodeLabel, encodeLabel, type Label } from '$lib/shared/label'

/** One bob at θ, or the Swing: the bob at its release point, at the bottom and at the far side. */
export const PICTURES = ['one', 'swing'] as const
export type Picture = (typeof PICTURES)[number]

export const PICTURE_NAMES: Record<Picture, string> = { one: 'One bob', swing: 'Swing' }

/** Which side of the vertical the bob is on, or is released from. */
export const SIDES = ['left', 'right'] as const
export type Side = (typeof SIDES)[number]

/** The forces on One bob: none, the tension and weight, or those with weight's components along the string and the path. */
export const FORCES = ['none', 'tensionWeight', 'components'] as const
export type Forces = (typeof FORCES)[number]

/** θ from the vertical, in degrees. */
export const MIN_ANGLE = 5
export const MAX_ANGLE = 75
/** In the Swing the three bobs overlap below this. */
export const MIN_SWING_ANGLE = 15

/** A label on the figure: written text, a blank line, or none. */
function label(fallback: Label): Field<Label> {
  return {
    fallback,
    accept: (v) => (v && typeof v === 'object' ? cleanLabel(v, fallback) : undefined),
    parse: (text) => decodeLabel(text, fallback),
    format: encodeLabel,
  }
}

const text = (t: string): Label => ({ mode: 'text', text: t })
const { titleMode, title } = figureTextFields()

/** The marks that are on in one picture and off in the other, for switching between them. */
export const PICTURE_DEFAULTS: Record<Picture, { arc: boolean; heightMark: boolean }> = {
  one: { arc: false, heightMark: false },
  swing: { arc: true, heightMark: true },
}

export const pendulumSettings = defineSettings(
  {
    picture: choice(PICTURES, 'swing'),
    /** θ from the vertical, in whole degrees */
    angle: number({ min: MIN_ANGLE, max: MAX_ANGLE, fallback: 30 }),
    side: choice(SIDES, 'right'),
    /** the bob's dashed path, from one side to the other */
    arc: bool(true),
    /** a dashed vertical through the pivot and an arc from it to the string */
    angleMark: bool(true),
    angleLabel: label(text('theta')),
    lengthLabel: label(text('L')),
    /** dashed horizontals through the lowest point and the raised bob, and a dimension line between them */
    heightMark: bool(true),
    heightLabel: label(text('h')),
    /** A, B, C beside the Swing's three bobs: the release point, the bottom and the far side */
    pointLabels: bool(false),
    labelA: label(text('A')),
    labelB: label(text('B')),
    labelC: label(text('C')),
    /** One bob only */
    forces: choice(FORCES, 'none'),
    tensionLabel: label(text('T')),
    weightLabel: label(text('mg')),
    /** weight's component along the string, away from the pivot */
    alongLabel: label(text('mg cos theta')),
    /** weight's component along the path, toward the bottom */
    acrossLabel: label(text('mg sin theta')),
    /** Swing only: a tangent arrow on the bottom bob */
    velocity: bool(false),
    velocityLabel: label(text('v')),
    bobLabel: label(text('m')),
    color: bool(false),
    titleMode,
    title,
  },
  (s) => {
    // Whole degrees, and in the Swing at least MIN_SWING_ANGLE, so its three bobs stand apart.
    const angle = Math.round(s.angle)
    return { ...s, angle: s.picture === 'swing' ? Math.max(MIN_SWING_ANGLE, angle) : angle }
  },
)

export type PendulumSettings = typeof pendulumSettings.defaults
