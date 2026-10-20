// Every choice the teacher makes on the Ray Diagram Generator, with its
// default: an object beyond 2F of a converging lens, with its three principal
// rays and its real, inverted, smaller image. Distances and heights are in cm.
// The labels on the figure are Physics' own ($lib/shared/label), each written,
// a blank line, or none.

import { figureTextFields } from '$shared/figureText'
import { LABEL_SIZES, type LabelSize } from '$shared/labelSize'
import { bool, choice, defineSettings, number, type Field } from '$shared/settings'
import { cleanLabel, decodeLabel, encodeLabel, type Label } from '$lib/shared/label'
import { ELEMENTS, answerLines as opticsAnswer } from './optics'

/** How much of the figure is drawn: the setup alone for students to draw the rays, the rays too, or the rays and the image. */
export const SHOWN = ['setup', 'rays', 'complete'] as const
export type Shown = (typeof SHOWN)[number]

/** A lens drawn as its shape, or as the textbook line symbol with arrowheads. */
export const LENS_STYLES = ['shape', 'symbol'] as const
export type LensStyle = (typeof LENS_STYLES)[number]

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
const cm = (fallback: number, min: number, max: number) => number({ min, max, fallback })
const hundredths = (n: number) => Math.round(n * 100) / 100

export const raySettings = defineSettings(
  {
    element: choice(ELEMENTS, 'converging'),
    lensStyle: choice(LENS_STYLES, 'shape'),
    /** how long, in cm, whatever its sign; a plane mirror has none */
    focalLength: cm(10, 1, 100),
    /** d_o, in cm */
    distance: cm(30, 0.5, 300),
    /** the object's height, in cm */
    height: cm(4, 0.1, 100),
    /** the object arrow pointing down from the axis */
    inverted: bool(false),
    shown: choice(SHOWN, 'complete'),
    // The principal rays. A plane mirror draws the vertex ray and the upper ray.
    parallelRay: bool(true),
    centerRay: bool(true),
    focalRay: bool(true),
    vertexRay: bool(true),
    upperRay: bool(true),
    // Points on the axis: F, F′, 2F and 2F′ on a lens, F and C on a mirror.
    fLabel: label(text('F')),
    fBackLabel: label(text('F′')),
    twoFLabel: label(text('2F')),
    twoFBackLabel: label(text('2F′')),
    cLabel: label(text('C')),
    objectLabel: label(text('O')),
    imageLabel: label(text('I')),
    // Dimension arrows.
    doMark: bool(false),
    doLabel: label(text('d_o')),
    diMark: bool(false),
    diLabel: label(text('d_i')),
    fMark: bool(false),
    fMarkLabel: label(text('f')),
    hoMark: bool(false),
    hoLabel: label(text('h_o')),
    hiMark: bool(false),
    hiLabel: label(text('h_i')),
    /** a numbered cm scale under the figure, 0 at the lens or mirror */
    scale: bool(false),
    color: bool(false),
    labelSize: choice(Object.keys(LABEL_SIZES) as LabelSize[], 'medium'),
    ...figureTextFields(),
  },
  (s) => ({ ...s, focalLength: hundredths(s.focalLength), distance: hundredths(s.distance), height: hundredths(s.height) }),
)

export type RaySettings = typeof raySettings.defaults

/** The answer key for these settings (see ./optics). */
export const answerLines = (s: Pick<RaySettings, 'element' | 'focalLength' | 'distance'>) => opticsAnswer(s.element, s.focalLength, s.distance)
