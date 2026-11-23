// Every choice the teacher makes on the Spring Generator, with its default: a
// spring hanging from a ceiling, drawn twice, at its natural length and
// stretched by a block, with the extension marked x. Three choices shape the
// figure (orientation, picture and springs); the rest are labels and marks.
// The labels are Physics' own ($lib/shared/label), each written, a blank
// line, or none.

import { figureTextFields } from '$shared/figureText'
import { bool, choice, defineSettings, number, type Field } from '$shared/settings'
import { cleanLabel, decodeLabel, encodeLabel, type Label } from '$lib/shared/label'

/** Hanging from a ceiling, or lying on a floor from a wall on the left. */
export const ORIENTATIONS = ['hanging', 'horizontal'] as const
export type Orientation = (typeof ORIENTATIONS)[number]

/** One spring; Before and after (natural length beside stretched or compressed); Three positions (−A, equilibrium, +A). */
export const PICTURES = ['one', 'beforeAfter', 'positions'] as const
export type Picture = (typeof PICTURES)[number]

/** How many springs, and how they're joined: in series (end to end) or in parallel (side by side). */
export const SPRINGS = ['1', '2s', '2p', '3s', '3p'] as const
export type Springs = (typeof SPRINGS)[number]

export const COIL_STYLES = ['zigzag', 'loops'] as const

/** What hangs on or is pushed by the spring. Slotted masses only hang. */
export const OBJECTS = ['block', 'masses', 'ball'] as const
export type SpringObject = (typeof OBJECTS)[number]

export const MOTION_ARROWS = ['none', 'velocity', 'acceleration', 'both'] as const
export type MotionArrows = (typeof MOTION_ARROWS)[number]

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

/** The most a spring is squashed, as a share of its natural length, and the most it is stretched. */
export const MOST_COMPRESSED = -0.5
export const MOST_STRETCHED = 1

/** The least a hanging spring is stretched by the object on it. */
export const LEAST_HANGING_STRETCH = 0.05

/** In Three positions on a floor, the spring is squashed by A at −A, so A is at most this. */
export const HORIZONTAL_MOST_AMPLITUDE = -MOST_COMPRESSED

export const springSettings = defineSettings(
  {
    orientation: choice(ORIENTATIONS, 'hanging'),
    picture: choice(PICTURES, 'beforeAfter'),
    springs: choice(SPRINGS, '1'),
    /** How far the free end has moved, as a share of the natural length: negative is squashed. In Three positions, the amplitude A. */
    stretch: number({ min: MOST_COMPRESSED, max: MOST_STRETCHED, fallback: 0.4 }),
    coils: choice(COIL_STYLES, 'zigzag'),
    object: choice(OBJECTS, 'block'),
    massLabel: label(text('m')),
    /** One per spring when there are several: k_1, k_2, k_3. */
    springLabel: label(text('k')),
    /** From where the free end would be at the natural length to where it is. */
    extensionMark: bool(true),
    extensionLabel: label(text('x')),
    /** The natural length, on the spring drawn at it. */
    lengthMark: bool(false),
    lengthLabel: label(text('L_0')),
    /** A dashed line where the free end rests. */
    equilibriumLine: bool(false),
    equilibriumLabel: label(text('x = 0')),
    /** An arrow pulling the object along the spring, or pushing it when the spring is squashed. */
    appliedForce: bool(false),
    forceLabel: label(text('F')),
    // Three positions.
    /** The positions' names are x = −A, x = 0 and x = +A, with A written here. */
    amplitudeLabel: label(text('A')),
    motionArrows: choice(MOTION_ARROWS, 'both'),
    /** Which way the object is going as it passes equilibrium: toward the wall or ceiling, or away from it. */
    moving: choice(['toward', 'away'] as const, 'away'),
    velocityLabel: label(text('v')),
    accelerationLabel: label(text('a')),
    color: bool(false),
    titleMode,
    title,
  },
  (s) => {
    const r2 = (n: number) => Math.round(n * 100) / 100
    let stretch = r2(s.stretch)
    // A hanging spring with a mass on it is stretched, if only a little.
    if (s.orientation === 'hanging') stretch = Math.max(s.picture === 'positions' ? 0 : LEAST_HANGING_STRETCH, stretch)
    // In Three positions the stretch is the amplitude, which has no sign.
    if (s.picture === 'positions') stretch = Math.min(Math.abs(stretch), s.orientation === 'horizontal' ? HORIZONTAL_MOST_AMPLITUDE : MOST_STRETCHED)
    return {
      ...s,
      stretch,
      // Three springs in each of three positions is too crowded: Three positions has one spring.
      springs: s.picture === 'positions' ? '1' : s.springs,
      // Slotted masses hang from a hook; on a floor the object is a block.
      object: s.orientation === 'horizontal' && s.object === 'masses' ? 'block' : s.object,
    }
  },
)

export type SpringSettings = typeof springSettings.defaults

/** How many springs, and whether they're in series or parallel. */
export function arrangementOf(springs: Springs): { count: number; joined: 'series' | 'parallel' } {
  return { count: Number(springs[0]), joined: springs.endsWith('p') ? 'parallel' : 'series' }
}
