// Chromatography's settings, as they appear in the page address.

import { figureTextFields } from '$lib/shared/figureText'
import { bool, choice, defineSettings, number, text, type Field } from '$lib/shared/settings'
import { INK_COLORS, MAX_FRONT, MAX_SAMPLES, MAX_SPOTS, MIN_FRONT, cleanName, rfText, roundCm, type InkColor, type Sample } from './inks'

/** Which papers the figure shows: after the solvent has run, or before it beside after. */
export const SHOWS = ['after', 'both'] as const
export type Show = (typeof SHOWS)[number]
export const SHOW_NAMES: Record<Show, string> = { after: 'After only', both: 'Before and after' }

export const MAX_SOLVENT = 24

/** The samples, written in the address as each name and its spots, the
 *  spots as color-distance pairs: "A:blue-5.6,yellow-2.4_B:red-4.4". There
 *  are always 1 to 6 samples of 1 to 5 spots. */
function samples(fallback: Sample[]): Field<Sample[]> {
  const accept = (v: unknown): Sample[] | undefined => {
    if (!Array.isArray(v) || v.length < 1 || v.length > MAX_SAMPLES) return undefined
    const out: Sample[] = []
    for (const sample of v) {
      if (!sample || typeof sample.name !== 'string' || !Array.isArray(sample.spots)) return undefined
      if (sample.spots.length < 1 || sample.spots.length > MAX_SPOTS) return undefined
      const spots = []
      for (const spot of sample.spots) {
        if (!spot || !INK_COLORS.includes(spot.color) || typeof spot.distance !== 'number' || !Number.isFinite(spot.distance)) return undefined
        spots.push({ color: spot.color as InkColor, distance: Math.min(MAX_FRONT, Math.max(0, roundCm(spot.distance))) })
      }
      out.push({ name: cleanName(sample.name), spots })
    }
    return out
  }
  const spot = /^([a-z]+)-(\d+(\.\d+)?)$/
  return {
    fallback,
    accept,
    parse: (text) => {
      const list = []
      for (const part of text.split('_')) {
        const colon = part.indexOf(':')
        if (colon < 0) return undefined
        const spots = []
        for (const pair of part.slice(colon + 1).split(',')) {
          const m = spot.exec(pair)
          if (!m) return undefined
          spots.push({ color: m[1], distance: Number(m[2]) })
        }
        list.push({ name: part.slice(0, colon), spots })
      }
      return accept(list)
    },
    format: (v) => v.map((s) => `${s.name}:${s.spots.map((p) => `${p.color}-${p.distance}`).join(',')}`).join('_'),
  }
}

export const DEFAULT_SAMPLES: Sample[] = [
  { name: 'A', spots: [{ color: 'blue', distance: 5.6 }, { color: 'yellow', distance: 2.4 }] },
  { name: 'B', spots: [{ color: 'red', distance: 4.4 }] },
  { name: 'C', spots: [{ color: 'blue', distance: 5.6 }, { color: 'red', distance: 4.4 }, { color: 'yellow', distance: 2.4 }] },
]

export const chromatographySettings = defineSettings(
  {
    samples: samples(DEFAULT_SAMPLES),
    /** how far the solvent front is above the origin line, in cm */
    front: number({ min: MIN_FRONT, max: MAX_FRONT, fallback: 8 }),
    show: choice(SHOWS, 'after'),
    setup: bool(true),
    measurements: bool(false),
    labels: bool(false),
    solvent: text('Water', MAX_SOLVENT),
    ...figureTextFields(),
  },
  (s) => {
    // No dye travels farther than the solvent carrying it.
    const front = roundCm(s.front)
    return {
      ...s,
      front,
      samples: s.samples.map((sample) => ({ ...sample, spots: sample.spots.map((p) => ({ ...p, distance: Math.min(p.distance, front) })) })),
    }
  },
)

export type ChromatographySettings = typeof chromatographySettings.defaults

/** What a sample is called on the figure and in the answer key: its name, or "Sample 2" when it has none. */
export const sampleName = (s: Sample, i: number) => s.name.trim() || `Sample ${i + 1}`

/** The answer key: each sample's spots with their Rf, one sample per line,
 *  e.g. "A: blue Rf = 0.70, yellow Rf = 0.30". */
export const answerLines = (s: ChromatographySettings) =>
  s.samples.map((sample, i) => `${sampleName(sample, i)}: ${sample.spots.map((p) => `${p.color} Rf = ${rfText(p.distance, s.front)}`).join(', ')}`)
