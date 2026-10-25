// How the parts of a data display are filled: a bar's series, and later a
// pie's sectors and a Venn diagram's regions. In color, the graph inks; in
// black and white, fills that still tell apart once photocopied (gray, white,
// hatching, dots and cross-hatching), as Biology's Punnett Square shades its
// genotypes. FillPatterns.svelte defines the patterns a figure uses.

import { COLORS } from '$shared/graph/colors'

export const INK = '#111827'

/** Fills in color, then the black-and-white ones. */
export const FILLS = {
  blue: 'Blue',
  red: 'Red',
  green: 'Green',
  orange: 'Orange',
  purple: 'Purple',
  gray: 'Gray',
  white: 'White',
  hatch: 'Hatching',
  dots: 'Dots',
  cross: 'Cross-hatching',
  backhatch: 'Back hatching',
  ink: 'Black',
} as const
export type Fill = keyof typeof FILLS

/** A whole figure's look: colors, fills that photocopy, or white for students to shade. */
export const LOOKS = { color: 'Color', bw: 'Black and white', white: 'White' } as const
export type Look = keyof typeof LOOKS

/** The fills given to series in turn, for each look. */
export const ORDER: Record<Look, Fill[]> = {
  color: ['blue', 'red', 'green', 'orange', 'purple', 'gray'],
  bw: ['gray', 'white', 'hatch', 'dots', 'cross', 'backhatch'],
  white: ['white', 'white', 'white', 'white', 'white', 'white'],
}

/** The fills drawn with an SVG pattern rather than one color. */
export const PATTERNS = ['hatch', 'dots', 'cross', 'backhatch'] as const
export type Pattern = (typeof PATTERNS)[number]
export const isPattern = (f: Fill): f is Pattern => (PATTERNS as readonly string[]).includes(f)

const SOLID: Record<Exclude<Fill, Pattern>, string> = {
  blue: COLORS.blue,
  red: COLORS.red,
  green: COLORS.green,
  orange: COLORS.orange,
  purple: COLORS.purple,
  gray: '#9ca3af',
  white: '#ffffff',
  ink: INK,
}

/** The fill's paint, with `id` prefixing the patterns' ids (see FillPatterns.svelte). */
export const paint = (fill: Fill, id: string) => (isPattern(fill) ? `url(#${id}-${fill})` : SOLID[fill])

/** Whether text written on this fill should be white rather than ink. */
export const isDark = (fill: Fill) => ['blue', 'red', 'green', 'purple', 'ink'].includes(fill)

/** The fill of item `i` in this look, unless the teacher picked one ('' or anything unknown is "in turn"). */
export const fillOf = (look: Look, i: number, picked?: string): Fill =>
  picked && picked in FILLS ? (picked as Fill) : ORDER[look][i % ORDER[look].length]
