// The choices in a row style: how one equation row is drawn. The coordinate
// grid uses all but values; endpoints, asymptotes and fills are its own. The number
// line uses the color, point mark, label style and values, since its thick
// line, arrows and circles carry meaning.

import { COLORS, type Color } from '$shared/graph/colors'

// A row's color is one of the inks every graph draws in.
export { COLORS, type Color }
export const LINE_STYLES = { solid: 'Solid', dashed: 'Dashed', dotted: 'Dotted' }
// Which ends of a line get an arrowhead. "left" is the end with the smaller x
// (the bottom, for an up-and-down line).
export const ARROWS = { both: 'Both ends', none: 'No arrows', left: 'Left end', right: 'Right end' }
// How points are marked: a dot, or a cross as in France.
export const POINT_STYLES = { dot: 'Dot', cross: 'Cross' }
// What's written at a labeled point: its label (A), or its label and coordinates or value (A(1, 2), A(0.35)).
// The keys stay "name" and "coords", which are in the coordinate grid's links.
export const LABEL_STYLES = { name: 'Label', coords: 'Label and coordinates' }
// Whether a number line writes values above the line, for endpoints and
// unlabeled points off the numbered ticks, or leaves them for students.
export const VALUE_STYLES = { shown: 'Write values', hidden: 'No values' }
// Whether a line with a domain shows open and closed circles at its ends, or just stops.
export const ENDPOINTS = { shown: 'Show endpoints', hidden: 'No endpoints' }
// Whether a curve's asymptotes are drawn as dotted lines. Hidden unless asked, so a test can ask for them.
export const ASYMPTOTES = { hidden: 'No asymptotes', shown: 'Show asymptotes' }
// How an inequality's shaded region is filled: a see-through tint, or
// hatching, which keeps overlapping regions apart in black and white.
export const FILLS = { tint: 'Tint', hatch: 'Hatching' }

export type LineStyle = keyof typeof LINE_STYLES
export type Arrows = keyof typeof ARROWS
export type PointStyle = keyof typeof POINT_STYLES
export type LabelStyle = keyof typeof LABEL_STYLES
export type ValueStyle = keyof typeof VALUE_STYLES
export type Endpoints = keyof typeof ENDPOINTS
export type AsymptoteStyle = keyof typeof ASYMPTOTES
export type Fill = keyof typeof FILLS
// How thick a coordinate grid row's line is drawn, with its arrowheads and circles. Medium is how it always was.
export const THICKNESSES = { thin: 'Thin', medium: 'Medium', thick: 'Thick' }
export type Thickness = keyof typeof THICKNESSES
