// An energy pyramid: 3 to 5 stacked trapezoids of equal height, producers
// at the base, each passing a share of its energy (10% by default) to the
// level above, so 10,000 kcal at the base gives 1,000, 100 and 10 above it.
// Each level's name and energy are written inside it, or left blank; a
// picture can sit beside each level, and a "lost as heat" arrow out of its
// right side. Drawn not to scale: at 10%, a level drawn to scale would be a
// hundredth the width of the one two below it.

import { textWidth, wrap } from '$lib/generators/cell-diagram/labels'
import { BLANK_WIDTH, dietName, fontOf, levelName, type Pt } from './layout'
import { nameOf, type Entry, type Web } from './web'
import type { FoodWebSettings, Unit } from './settings'

const BASE = 560
const TOP = 120
const PICTURE = 56
const PICTURE_GAP = 14
const HEAT_ARROW = 40
const HEAT_GAP = 8

/** Each level's energy, base first: the share passed up applied exactly,
 *  written to 12 significant figures so floating point doesn't show. */
export function energies(base: number, share: number, levels: number): number[] {
  return Array.from({ length: levels }, (_, i) => Number(((base * share ** i) / 100 ** i).toPrecision(12)))
}

/** An energy as written: thousands separated, up to three decimal places. */
export const energyText = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 3 })

export const unitText = (unit: Unit, perArea: boolean) => (perArea ? `${unit}/m²/yr` : unit)

export interface PyramidLevel {
  /** 0 at the base */
  index: number
  points: Pt[]
  /** the level's name as drawn, wrapped; null when blank, [] when none */
  name: string[] | null
  /** the energy, its text, and whether it is drawn blank */
  energy: number
  value: string | null
  blankValue: boolean
  /** the middle of the level, where its text is centred */
  cx: number
  cy: number
  picture: { entry: Entry; x: number; y: number; size: number } | null
  heat: { from: Pt; to: Pt; text: string | null; x: number; y: number } | null
}

export interface Pyramid {
  levels: PyramidLevel[]
  width: number
  height: number
  font: number
  /** the answer: each level's name and energy */
  answer: string[]
}

type PyramidSettings = Pick<
  FoodWebSettings,
  'levels' | 'energy' | 'share' | 'unit' | 'perArea' | 'values' | 'pyramidNames' | 'typedNames' | 'pictures' | 'heat' | 'labelSize' | 'wording'
>

/** The trophic level names of a pyramid's levels, base first. */
export function levelNames(count: number, wording: FoodWebSettings['wording']): string[] {
  return Array.from({ length: count }, (_, i) => {
    if (wording !== 'diet') return levelName(i + 1, true)
    if (i === 0) return dietName('producer', true)
    if (i === 1) return dietName('herbivore', true)
    return i === count - 1 && count > 3 ? 'Top carnivores' : dietName('carnivore', true)
  })
}

export function layoutPyramid(s: PyramidSettings, web: Web, chain: string[]): Pyramid {
  const font = fontOf(s.labelSize)
  const n = s.levels
  // The chain's organisms from the producer up.
  const organisms = chain.map((k) => web.find((e) => e.key === k)!).filter(Boolean)
  const values = energies(s.energy, s.share, n)
  const unit = unitText(s.unit, s.perArea)
  const trophic = levelNames(n, s.wording)
  const typed = s.typedNames.split(';').map((t) => t.trim())
  const nameOfLevel = (i: number): string | null => {
    if (s.pyramidNames === 'blank') return null
    if (s.pyramidNames === 'none') return ''
    if (s.pyramidNames === 'chain' && organisms[i]) return nameOf(organisms[i])
    if (s.pyramidNames === 'typed' && typed[i]) return typed[i]
    return trophic[i]
  }

  const levelH = Math.max(66, font * 4.2)
  const pictures = s.pictures && organisms.length > 0
  const left = pictures ? PICTURE + PICTURE_GAP : 0
  const heatText = `${Math.round((100 - s.share) * 1000) / 1000}% lost as heat`
  const heatW = s.heat === 'none' ? 0 : HEAT_GAP + HEAT_ARROW + 8 + (s.heat === 'blank' ? BLANK_WIDTH : textWidth(heatText, font))
  const widthAt = (t: number) => BASE - ((BASE - TOP) * t) / n
  const height = n * levelH
  const cxAll = left + BASE / 2
  const levels: PyramidLevel[] = []
  for (let i = 0; i < n; i++) {
    const yBottom = height - i * levelH
    const yTop = yBottom - levelH
    const wb = widthAt(i), wt = widthAt(i + 1)
    const points = [
      { x: cxAll - wb / 2, y: yBottom },
      { x: cxAll + wb / 2, y: yBottom },
      { x: cxAll + wt / 2, y: yTop },
      { x: cxAll - wt / 2, y: yTop },
    ]
    const midW = (wb + wt) / 2
    const name = nameOfLevel(i)
    const blankValue = s.values === 'blank' || (s.values === 'base' && i > 0)
    const value = s.values === 'none' ? null : `${energyText(values[i])} ${unit}`
    const entry = pictures ? organisms[i] : undefined
    const yMid = yTop + levelH / 2
    const edgeAtMid = cxAll - midW / 2
    levels.push({
      index: i,
      points,
      name: name === null ? null : name === '' ? [] : wrap(name, font, Math.max(80, midW - 24)).slice(0, 2),
      energy: values[i],
      value,
      blankValue,
      cx: cxAll,
      cy: yMid,
      picture: entry ? { entry, x: edgeAtMid - PICTURE_GAP - PICTURE, y: yMid - PICTURE / 2, size: PICTURE } : null,
      heat:
        s.heat === 'none'
          ? null
          : {
              from: { x: cxAll + midW / 2 + HEAT_GAP, y: yMid },
              to: { x: cxAll + midW / 2 + HEAT_GAP + HEAT_ARROW, y: yMid },
              text: s.heat === 'text' ? heatText : null,
              x: cxAll + midW / 2 + HEAT_GAP + HEAT_ARROW + 8,
              y: yMid,
            },
    })
  }
  // The widest any heat label reaches past the base, on its own level.
  const right = Math.max(left + BASE, ...levels.map((l) => (l.heat ? l.heat.x + heatW - HEAT_GAP - HEAT_ARROW - 8 : 0)))
  const answer = levels.map((l, i) => {
    const label = organisms[i] && s.pyramidNames !== 'chain' ? `${trophic[i]} (${nameOf(organisms[i]).toLowerCase()})` : nameOfLevel(i) || trophic[i]
    return `${label}: ${energyText(values[i])} ${unit}`
  })
  return { levels, width: right, height, font, answer }
}
