// Settings every economics graph has, for a generator's defineSettings():
// the look (schematic, as AP graphs are drawn, or numbered axes), color or
// black and white, gridlines, the chart title and the words at the axes'
// ends, and the ranges a numbered graph runs over. Plus `labels()`, which
// gives each label on a figure its words and whether they're written, left
// as a blank line for students, or left off.

import { TITLE_MODES, gridFields, readAxes, type Axes, type RangeSettings, type TitleMode } from '$shared/graph/axes'
import type { Cap } from '$shared/graph/caps'
import { bool, choice, text, type Field } from '$shared/settings'
import type { LabelSize } from '$shared/labelSize'
import type { PanelSpec, Words } from './panel'

export const LOOKS = ['schematic', 'numeric'] as const
export type Look = (typeof LOOKS)[number]
export const LOOK_NAMES: Record<Look, string> = { schematic: 'Schematic', numeric: 'Numbered' }

export const INKS = ['color', 'bw'] as const
export type Ink = (typeof INKS)[number]

/** Whether a change's before and after are numbered 1 and 2 (D₁ and D₂) or 0 and 1 (D₀ and D₁). */
export const NUMBER_FROMS = ['1', '0'] as const
export type NumberFrom = (typeof NUMBER_FROMS)[number]
export const NUMBER_FROM_NAMES: Record<NumberFrom, string> = { '1': '1 and 2', '0': '0 and 1' }
/** The number written for the `k`th of a change's curves or values, the first 1, numbered from `from`. */
export const nth = (k: number, from: NumberFrom) => k - 1 + Number(from)

/** The hidden grid a schematic graph is drawn on: 0 to 10 each way. */
export const SCHEMATIC: Axes = {
  x: { start: 0, step: 1, blocks: 10, numbering: 'decimal' },
  y: { start: 0, step: 1, blocks: 10, numbering: 'decimal' },
}

/** The words of a label and whether they're written, a blank line or left off. */
export const label = (words: string, mode: TitleMode = 'text') => ({ words: text(words, 40), mode: choice(TITLE_MODES, mode) })

/** Labels' fields, each name with its words and a `…Mode`: `labels({ eLabel: 'E' })` gives eLabel and eLabelMode. */
export function labels<K extends string>(defaults: Record<K, string | [string, TitleMode]>) {
  return Object.fromEntries(
    Object.entries(defaults).flatMap(([k, v]) => {
      const [w, mode] = Array.isArray(v) ? (v as [string, TitleMode]) : [v as string, 'text' as TitleMode]
      const l = label(w, mode)
      return [[k, l.words], [`${k}Mode`, l.mode]]
    }),
  ) as Record<K, Field<string>> & Record<`${K}Mode`, Field<TitleMode>>
}

/** A label's words and mode from settings with `key` and `keyMode`. */
export const wordsOf = <K extends string>(s: Record<K, string> & Record<`${K}Mode`, TitleMode>, key: K): Words => ({
  text: s[key],
  mode: s[`${key}Mode`] as TitleMode,
})

type Defaults = {
  look?: Look
  title?: string
  titleMode?: TitleMode
  xTitle: string
  yTitle: string
  range: RangeSettings
}

/** The look, ink, titles and ranges, as defineSettings() fields with this generator's defaults. */
export function lookFields(d: Defaults) {
  return {
    look: choice(LOOKS, d.look ?? 'schematic'),
    ink: choice(INKS, 'color'),
    gridlines: bool(true),
    ...gridFields({
      ...d.range,
      xEvery: 1, yEvery: 1,
      title: d.title ?? '', titleMode: d.titleMode ?? 'none',
      xTitle: d.xTitle, xTitleMode: 'text',
      yTitle: d.yTitle, yTitleMode: 'text',
      xLabel: '', xLabelMode: 'none', yLabel: '', yLabelMode: 'none',
      xStartCap: 'none', xEndCap: 'none', yStartCap: 'none', yEndCap: 'none',
      minor: 0,
    }),
  }
}

/** What lookFields() gives, as settings. */
export type LookSettings = RangeSettings & {
  look: Look
  ink: Ink
  gridlines: boolean
  xEvery: number
  yEvery: number
  title: string
  titleMode: TitleMode
  xTitle: string
  xTitleMode: TitleMode
  yTitle: string
  yTitleMode: TitleMode
  xEndCap: Cap
  yEndCap: Cap
  minor: number
  labelSize: LabelSize
}

/** The axes drawn: schematic's hidden 0-to-10 grid, or the ranges typed, and anything in them to fix. */
export function axesOf(s: LookSettings, schematic: Axes = SCHEMATIC): Axes & { problems: Record<string, string | null> } {
  return s.look === 'numeric' ? readAxes(s) : { ...schematic, problems: {} }
}

/** The parts of a panel the look settings decide. */
export function panelBase(s: LookSettings, schematic: Axes = SCHEMATIC): Omit<PanelSpec, 'axes'> & { axes: Axes } {
  const numeric = s.look === 'numeric'
  const { problems: _, ...axes } = axesOf(s, schematic)
  return {
    axes,
    every: numeric ? { x: s.xEvery, y: s.yEvery } : { x: 0, y: 0 },
    gridlines: numeric && s.gridlines,
    minor: s.minor,
    ends: { x: s.xEndCap, y: s.yEndCap },
    axisWords: { x: { text: s.xTitle, mode: s.xTitleMode }, y: { text: s.yTitle, mode: s.yTitleMode } },
    title: { text: s.title, mode: s.titleMode },
    labelSize: s.labelSize,
    bw: s.ink === 'bw',
  }
}

/** A file name from the chart title, or the generator's own. */
export function filenameOf(s: { title: string; titleMode: TitleMode }, fallback: string) {
  const name = s.titleMode === 'text' && s.title.trim() ? s.title.trim() : fallback
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback
}
