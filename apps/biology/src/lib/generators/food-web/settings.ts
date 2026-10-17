// Food Webs and Energy Pyramids' settings, as they appear in the page
// address. The web is one text field written as web.ts describes; the food
// chain is a list of its organisms (empty for the web's longest chain), and
// the energy pyramid takes its level names and pictures from the chain.

import { bool, choice, defineSettings, number, text, type Field } from '$shared/settings'
import { figureTextFields } from '$shared/figureText'
import { LABEL_SIZES, type LabelSize } from '$shared/labelSize'
import { chainOf, formatWeb, parseWeb, writtenChain, type Web } from './web'

export const FIGURES = ['web', 'chain', 'pyramid'] as const
export type FigureKind = (typeof FIGURES)[number]
export const FIGURE_NAMES: Record<FigureKind, string> = { web: 'Food web', chain: 'Food chain', pyramid: 'Energy pyramid' }

/** A label as text, a blank line for students, or left off. */
export const LABEL_MODES = ['text', 'blank', 'none'] as const
export type LabelMode = (typeof LABEL_MODES)[number]

/** Trophic levels named as consumers (primary, secondary…) or by diet (herbivore, carnivore…). */
export const WORDINGS = ['consumers', 'diet'] as const
export type Wording = (typeof WORDINGS)[number]

/** Pictures (and the pyramid's levels) in color, or black and white. */
export const COLOR_MODES = ['color', 'bw'] as const
export type ColorMode = (typeof COLOR_MODES)[number]

export const DIRECTIONS = ['right', 'up'] as const
export type Direction = (typeof DIRECTIONS)[number]

export const UNITS = ['kcal', 'kJ', 'J'] as const
export type Unit = (typeof UNITS)[number]

/** Which pyramid values are written: all, only the base's (the rest blank), all blank, or none. */
export const VALUE_MODES = ['all', 'base', 'blank', 'none'] as const
export type ValueMode = (typeof VALUE_MODES)[number]

/** Where the pyramid's level names come from, or blank lines for students, or none. */
export const PYRAMID_NAMES = ['levels', 'chain', 'typed', 'blank', 'none'] as const
export type PyramidNames = (typeof PYRAMID_NAMES)[number]

/** The grassland web: the first setup, and what the page starts with. */
export const GRASSLAND =
  'grass;grasshopper=grass;rabbit=grass;mouse=grass;frog=grasshopper;songbird=grasshopper;snake=frog,mouse,songbird;fox=rabbit,mouse;hawk=snake,rabbit,mouse,songbird;mushroom'

/** A web as written by formatWeb; anything that doesn't read as one is the grassland. */
function webField(fallback: string): Field<string> {
  const accept = (v: unknown) => {
    if (typeof v !== 'string') return undefined
    const web = parseWeb(v)
    return web ? formatWeb(web) : undefined
  }
  return { fallback, accept, parse: accept, format: (v) => v }
}

export const foodWebSettings = defineSettings(
  {
    figure: choice(FIGURES, 'web'),
    web: webField(GRASSLAND),
    /** the chain's organisms by key, from producer to top; '' for the web's longest */
    chain: text('', 200),
    direction: choice(DIRECTIONS, 'right'),
    decomposers: bool(true),
    arrows: bool(true),
    levelLabels: choice(LABEL_MODES, 'none'),
    wording: choice(WORDINGS, 'consumers'),
    colors: choice(COLOR_MODES, 'color'),
    boxes: bool(true),

    levels: number({ min: 3, max: 5, fallback: 4 }),
    energy: number({ min: 0.001, max: 1e9, fallback: 10000 }),
    /** the percent of each level's energy passed up to the next */
    share: number({ min: 1, max: 50, fallback: 10 }),
    unit: choice(UNITS, 'kcal'),
    perArea: bool(false),
    values: choice(VALUE_MODES, 'all'),
    pyramidNames: choice(PYRAMID_NAMES, 'levels'),
    /** typed level names, base first, separated by semicolons */
    typedNames: text('', 200),
    pictures: bool(false),
    heat: choice(LABEL_MODES, 'none'),

    labelSize: choice(Object.keys(LABEL_SIZES) as LabelSize[], 'medium'),
    ...figureTextFields(),
  },
  (s) => {
    // A chain keeps only organisms in the web; fewer than two is the web's own.
    const chain = writtenChain(parseWeb(s.web)!, s.chain)
    return { ...s, levels: Math.round(s.levels), chain: chain.length >= 2 ? chain.join(',') : '' }
  },
)

export type FoodWebSettings = typeof foodWebSettings.defaults

export const webOf = (s: Pick<FoodWebSettings, 'web'>): Web => parseWeb(s.web) ?? parseWeb(GRASSLAND)!
/** The chain drawn: the one chosen, or the web's longest. */
export const chainKeys = (s: Pick<FoodWebSettings, 'web' | 'chain'>) => chainOf(webOf(s), s.chain)
/** The typed pyramid names, base first. */
export const typedNamesOf = (s: Pick<FoodWebSettings, 'typedNames'>) => s.typedNames.split(';').map((n) => n.trim())
