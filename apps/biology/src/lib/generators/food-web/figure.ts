// The Food Webs and Energy Pyramids figure, worked out from its settings:
// the web's or chain's layout, or the pyramid's, and the answer key (each
// organism's trophic level, so any name left blank, or each level's energy).

import { textWidth } from '$lib/generators/cell-diagram/labels'
import { dietName, dietOf, layoutChain, layoutWeb, levelName, type Diet, type Layout } from './layout'
import { layoutPyramid, type Pyramid } from './pyramid'
import { chainKeys, webOf, type ColorMode, type FoodWebSettings } from './settings'
import { levelsOf, nameOf, type Web } from './web'

export interface FoodWebFigure {
  web: Web
  chain: string[]
  layout: Layout | null
  pyramid: Pyramid | null
  width: number
  height: number
}

export function buildFigure(s: FoodWebSettings): FoodWebFigure {
  const web = webOf(s)
  const chain = chainKeys(s)
  const options = { labelSize: s.labelSize, decomposers: s.decomposers, levelLabels: s.levelLabels, wording: s.wording }
  if (s.figure === 'pyramid') {
    const pyramid = layoutPyramid(s, web, chain)
    return { web, chain, layout: null, pyramid, width: pyramid.width, height: pyramid.height }
  }
  const layout = s.figure === 'chain' ? layoutChain(web, chain, s.direction, options) : layoutWeb(web, options)
  return { web, chain, layout, pyramid: null, width: layout.width, height: layout.height }
}

// ---- Color --------------------------------------------------------------

/** One tint per trophic level, from producers up. */
const LEVEL_TINTS = ['#e3f1e4', '#fdebd3', '#dde7fb', '#f8dddd', '#efe0f8', '#d9f0ed']

/** A pyramid level's fill: a tint of its own in color, white in black and white. */
export const fillOf = (mode: ColorMode, level: number) => (mode === 'bw' ? '#fff' : LEVEL_TINTS[Math.min(level, LEVEL_TINTS.length) - 1])

// ---- Answer key ---------------------------------------------------------

/** The answer, as items to print: each trophic level and what is at it
 *  (or each diet, in that wording), the chain in order, or each pyramid
 *  level's energy. */
export function answerItems(s: FoodWebSettings, fig: FoodWebFigure = buildFigure(s)): string[] {
  if (fig.pyramid) return fig.pyramid.answer
  const web = fig.web
  const placed = levelsOf(web)
  const name = (k: string) => nameOf(web.find((e) => e.key === k)!)
  if (s.figure === 'chain') {
    return fig.chain.map((k, i) => {
      const level = i + 1
      const words = s.wording === 'diet' ? (level === 1 ? 'Producer' : level === 2 ? 'Herbivore' : 'Carnivore') : levelName(level, false)
      return `${words}: ${name(k)}`
    })
  }
  const shown = fig.layout!.nodes.map((n) => n.key)
  if (s.wording === 'diet') {
    const order: Diet[] = ['producer', 'herbivore', 'detritivore', 'omnivore', 'carnivore', 'decomposer']
    return order
      .map((d) => [d, shown.filter((k) => dietOf(web, placed, k) === d)] as const)
      .filter(([, ks]) => ks.length)
      .map(([d, ks]) => `${dietName(d, ks.length > 1)}: ${ks.map(name).join(', ')}`)
  }
  const levels = [...new Set(shown.map((k) => placed.get(k)!.level))].sort((a, b) => (a ?? 99) - (b ?? 99))
  return levels.map((l) => {
    const ks = shown.filter((k) => placed.get(k)!.level === l)
    return `${levelName(l, true)}: ${ks.map(name).join(', ')}`
  })
}

const KEY_FONT = 18

/** The answer key as printed under the figure: its items joined with dots,
 *  broken into lines no wider than the figure (or 420 px). */
export function answerText(s: FoodWebSettings, fig: FoodWebFigure = buildFigure(s)): string {
  const max = Math.max(420, fig.width)
  const lines: string[] = []
  for (const item of answerItems(s, fig)) {
    const last = lines.at(-1)
    if (last !== undefined && textWidth(`${last} · ${item}`, KEY_FONT) <= max) lines[lines.length - 1] = `${last} · ${item}`
    else lines.push(item)
  }
  return lines.join('\n')
}

/** What the figure shows, for screen readers. */
export function describeFigure(s: FoodWebSettings, fig: FoodWebFigure): string {
  const web = fig.web
  const name = (k: string) => nameOf(web.find((e) => e.key === k)!).toLowerCase()
  if (fig.pyramid) {
    return `Energy pyramid of ${fig.pyramid.levels.length} levels, ${fig.pyramid.answer.join('; ')}`
  }
  if (s.figure === 'chain') return `Food chain: ${fig.chain.map(name).join(' to ')}`
  const links = web.flatMap((e) => e.eats.map((f) => `${name(f)} to ${name(e.key)}`))
  return `Food web of ${web.length} organisms, with arrows from ${links.join(', ')}`
}
