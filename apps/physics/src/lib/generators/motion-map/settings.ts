// Every choice the teacher makes on the Motion Map Generator, with its
// default: the Motion Graph Generator's cart, which speeds up, cruises, slows
// down and stops, as a dot every second with its velocity arrows.
// The motion is the Motion Graph's: the same segments and starting position,
// written the same way in the page address, so either page can open the
// other's motion with a plain link (graphLink, mapLink).

import { LABEL_SIZES, type LabelSize } from '$shared/labelSize'
import { bool, choice, defineSettings, int, label, list } from '$lib/shared/settings'
import { DEFAULT_SEGMENTS, MAX_SEGMENTS, motionSettings, segment, type Segment } from '../motion-graphs/settings'

/** The time between dots, Δt, in seconds. */
export const STEPS = ['0.5', '1', '2'] as const
export type Step = (typeof STEPS)[number]

/** What is written on the dots: nothing, the times, a letter on every dot, or the Motion Graph's letters at the segment ends. */
export const DOT_LABELS = { none: 'None', times: 'Times', letters: 'Letters', ends: 'Segment ends' } as const
export type DotLabels = keyof typeof DOT_LABELS

const text = (t: string) => ({ mode: 'text' as const, text: t })

export const mapSettings = defineSettings({
  segments: list(segment, DEFAULT_SEGMENTS, MAX_SEGMENTS),
  /** Where it starts, in meters. */
  start: int(0, -50, 50),
  dt: choice<Step>('1', STEPS),
  /** No arrows at all, for “add the velocity arrows” questions. */
  dotsOnly: bool(false),
  /** An acceleration arrow above each segment's dots, or a = 0. */
  acceleration: bool(false),
  labels: choice<DotLabels>('none', Object.keys(DOT_LABELS) as DotLabels[]),
  /** Ticks and numbers on the number line. Off, the map shows only its shape. */
  numbers: bool(true),
  origin: bool(false),
  /** An arrow under the number line from where the motion starts to where it ends. */
  displacement: bool(false),
  displacementLabel: label(text('Deltax')),
  /** What is moving, written beside the first dot. */
  object: label({ mode: 'none', text: 'cart' }),
  title: label({ mode: 'none', text: '' }),
  answerKey: bool(false),
  labelSize: choice<LabelSize>('medium', Object.keys(LABEL_SIZES) as LabelSize[]),
  color: bool(false),
})

export type MapSettings = typeof mapSettings.defaults

/** The motion's segments and start, the settings both pages share. */
type Shared = { segments: Segment[]; start: number }

/** The address of another page drawing this motion, with its other settings at their defaults. */
function linkTo<S extends Shared>(path: string, def: { defaults: S; toQuery(s: S): string }, s: Shared) {
  const query = def.toQuery({ ...def.defaults, segments: s.segments, start: s.start })
  return query ? `${path}?${query}` : path
}

/** The Motion Graph Generator with this motion. */
export const graphLink = (s: Shared) => linkTo('/motion-graphs', motionSettings, s)

/** The Motion Map Generator with this motion. */
export const mapLink = (s: Shared) => linkTo('/motion-map', mapSettings, s)

/** A pasted link to the Motion Graph Generator (or another motion map) as a
 *  fresh motion map of the same motion, or null when it isn't one. Only the
 *  segments and start come across; every other setting is this page's default. */
export function mapFromLink(text: string): MapSettings | null {
  const t = text.trim()
  let url: URL
  try {
    url = new URL(/^[a-z]+:\/\//i.test(t) ? t : `https://${t}`)
  } catch {
    return null
  }
  if (!/\/motion-(graphs|map)\/?$/.test(url.pathname)) return null
  const motion = new URLSearchParams()
  for (const key of ['segments', 'start']) {
    const value = url.searchParams.get(key)
    if (value !== null) motion.set(key, value)
  }
  return mapSettings.fromParams(motion)
}

export const stepOf =(s: Pick<MapSettings, 'dt'>) => Number(s.dt)
