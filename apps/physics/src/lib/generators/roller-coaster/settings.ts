// Every choice the teacher makes on the Roller Coaster Generator, with its
// default: a cart at the top of a hill, a dip, a lower hill and a run-out,
// each point lettered with its height marked. The track is a list of points
// from left to right, each with a height; the same rows are the shape of the
// track and the points questions are asked about.

import { bool, choice, defineSettings, int, label, list, number, type SettingsOf } from '$lib/shared/settings'
import type { Label } from '$lib/shared/label'

/** One point on the track. New fields go at the end, so old links keep working (see `list`). */
const point = {
  height: number(0, 0, 100),
  /** Text or a blank line puts a dot on the track; none leaves a point that only shapes it. */
  label: label({ mode: 'text', text: 'A' }),
  /** A mark from the ground up to the point: its text, a line to write on, or no mark. */
  heightLabel: label({ mode: 'text', text: '0 m' }),
  /** The stretch from this point to the next has friction. */
  rough: bool(false),
  /** The length mark under a rough stretch; none leaves it to the rough stretch before. */
  lengthLabel: label({ mode: 'text', text: 'd' }),
}

export type TrackPoint = SettingsOf<typeof point>

export const MIN_POINTS = 2
export const MAX_POINTS = 8
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

const text = (t: string): Label => ({ mode: 'text', text: t })

/** A height as its mark reads until the teacher types something else: 40 → "40 m". */
export const heightText = (height: number) => `${height} m`

/** A point with the labels a new one starts with. */
export const newPoint = (height: number, letter: string, more: Partial<TrackPoint> = {}): TrackPoint => ({
  height,
  label: text(letter),
  heightLabel: text(heightText(height)),
  rough: false,
  lengthLabel: text('d'),
  ...more,
})

export const OBJECTS = ['cart', 'ball', 'block', 'none'] as const

const base = defineSettings({
  /** The track, from left to right, drawn evenly spaced. */
  points: list(
    point,
    [newPoint(40, 'A'), newPoint(10, 'B'), newPoint(25, 'C'), newPoint(5, 'D')],
    MAX_POINTS,
    MIN_POINTS,
  ),
  /** The number of the point the loop stands on, or 0 for no loop. */
  loopAt: int(0, 0, MAX_POINTS),
  /** In the same units as the heights, and drawn to scale with them. */
  loopRadius: number(8, 2, 50),
  radiusLabel: label(text('R')),
  loopTopLabel: label({ mode: 'none', text: 'top' }),
  object: choice('cart', OBJECTS),
  objectSize: number(0.6, 0.3, 1.2),
  objectLabel: label(text('m')),
  /** The number of the point the object sits at. */
  objectAt: int(1, 1, MAX_POINTS),
  /** The object at the top of the loop, upside down inside it, instead of at a point. */
  objectOnLoop: bool(false),
  velocity: choice('none', ['none', 'forward', 'back']),
  velocityLabel: label(text('v')),
  /** Under the first rough stretch. */
  roughLabel: label(text('mu_k')),
  /** The line heights are measured from. */
  ground: bool(true),
  mirror: bool(false),
  color: bool(false),
})

export type CoasterSettings = typeof base.defaults

/** The loop and the object at a point the track has: a loop past its end is none, an object past it sits at the last point. */
function withinTrack(s: CoasterSettings): CoasterSettings {
  const n = s.points.length
  return { ...s, loopAt: s.loopAt > n ? 0 : s.loopAt, objectAt: Math.min(s.objectAt, n) }
}

/** The settings, with the loop and the object kept on the track whichever way they come in (a link, a preset, undo). */
export const coasterSettings = {
  ...base,
  clean: (raw: unknown) => withinTrack(base.clean(raw)),
  fromParams: (params: URLSearchParams) => withinTrack(base.fromParams(params)),
}

// Editing the track's list of points from the settings panel: adding, moving
// and removing a point, and retyping its height. Labels still as the
// generator wrote them follow along; anything the teacher typed is kept.
//   - Letters still in order (A, B, C…) are re-lettered, so they stay in order.
//   - A height mark still showing its height ("40 m") follows the height.
// The loop and the object are at a point by its number, so they move with it.

/** The parts of the settings that say which point is which. */
export interface TrackList {
  points: TrackPoint[]
  /** The loop's point, counted from 1, or 0 for none. */
  loopAt: number
  /** The object's point, counted from 1. */
  objectAt: number
}

const inOrder = (rows: TrackPoint[]) => rows.every((p, i) => p.label.text === LETTERS[i])
const reletter = (rows: TrackPoint[]) => rows.forEach((p, i) => (p.label.text = LETTERS[i]))

/** A height as the settings keep it: from 0 to 100, to 0.01, and 0 for nothing typed. */
const tidyHeight = (h: unknown) => point.height.clean(h)

/** A new point at the right end, level with the one before it. */
export function added(t: TrackList): TrackList {
  if (t.points.length >= MAX_POINTS) return t
  const relabel = inOrder(t.points)
  const points = [...t.points, newPoint(tidyHeight(t.points.at(-1)!.height), LETTERS[t.points.length])]
  if (relabel) reletter(points)
  return { ...t, points }
}

export function removed(t: TrackList, i: number): TrackList {
  if (t.points.length <= MIN_POINTS) return t
  const relabel = inOrder(t.points)
  const points = t.points.filter((_, k) => k !== i)
  if (relabel) reletter(points)
  const after = (at: number) => (at === i + 1 ? 0 : at > i + 1 ? at - 1 : at)
  return {
    points,
    loopAt: after(t.loopAt),
    objectAt: Math.max(1, Math.min(points.length, after(t.objectAt) || i + 1)),
  }
}

/** Point i moved one place left (−1) or right (1), swapping with its neighbour. */
export function moved(t: TrackList, i: number, by: -1 | 1): TrackList {
  const j = i + by
  if (j < 0 || j >= t.points.length) return t
  const relabel = inOrder(t.points)
  const points = [...t.points]
  ;[points[i], points[j]] = [points[j], points[i]]
  if (relabel) reletter(points)
  const after = (at: number) => (at === i + 1 ? j + 1 : at === j + 1 ? i + 1 : at)
  return { points, loopAt: after(t.loopAt), objectAt: after(t.objectAt) }
}

/** A height mark as the generator writes it ("40 m", "12.35 m"). */
const WRITTEN = /^\d+(\.\d+)? m$/

/**
 * A point's height retyped; nothing typed (null) is left for the settings to
 * tidy. The mark follows when it shows the height as last tidied, so a height
 * typed past 100, to more than 2 decimals, or cleared on the way to a new one
 * doesn't stop it following. While the field is empty there's no height to
 * compare with, so a mark written the generator's way follows.
 */
export function heightTyped(p: TrackPoint, typed: number | null) {
  const empty = typeof p.height !== 'number' || !Number.isFinite(p.height)
  const follows = empty ? WRITTEN.test(p.heightLabel.text) : p.heightLabel.text === heightText(tidyHeight(p.height))
  p.height = typed as number
  if (follows && typeof typed === 'number' && Number.isFinite(typed)) p.heightLabel.text = heightText(tidyHeight(typed))
}
