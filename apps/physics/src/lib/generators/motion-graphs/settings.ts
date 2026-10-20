// Every choice the teacher makes on the Motion Graph Generator, with its
// default: a cart that speeds up, cruises, slows down and stops, on a position–time graph.
// The motion is typed segment by segment, as a speed and how long it lasts;
// ./motion works out the rest.

import { LABEL_SIZES, type LabelSize } from '$shared/labelSize'
import { bool, choice, defineSettings, int, label, list, number, type SettingsOf } from '$lib/shared/settings'

/** What a segment does: stays at rest, moves at a constant velocity forward or back, speeds up or slows down. */
export const KINDS = ['rest', 'forward', 'back', 'faster', 'slower'] as const
export type Kind = (typeof KINDS)[number]
export const KIND_NAMES: Record<Kind, string> = {
  rest: 'At rest',
  forward: 'Constant velocity forward',
  back: 'Constant velocity back',
  faster: 'Speeding up',
  slower: 'Slowing down',
}

/**
 * One segment of the motion. New fields go at the end, so old links keep
 * working (see `list`). The Motion Map Generator's segments are these too, so
 * a link's segments mean the same on both pages.
 */
export const segment = {
  kind: choice('forward', KINDS),
  /** Its speed in m/s: the one it moves at, or speeds up or slows down to. */
  speed: number(4, 0, 100),
  /** How long it lasts, in seconds. */
  duration: number(3, 0.1, 60),
  /** Which way a segment speeding up from rest goes. Once moving, it keeps going the way it was. */
  dir: choice('forward', ['forward', 'back']),
}

export type Segment = SettingsOf<typeof segment>

export const MAX_SEGMENTS = 6

/** The speed a segment of each kind starts with: slowing down is to a stop. */
export const speedFor = (kind: Kind) => (kind === 'slower' ? 0 : 4)

/** A segment with every setting at its default but these. */
export const newSegment = (over: Partial<Segment> = {}): Segment => ({ kind: 'forward', speed: speedFor(over.kind ?? 'forward'), duration: 3, dir: 'forward', ...over })

/** The motion both pages start with: a cart that speeds up, cruises, slows down and stops. */
export const DEFAULT_SEGMENTS: Segment[] = [
  newSegment({ kind: 'faster', duration: 4 }),
  newSegment({ duration: 4 }),
  newSegment({ kind: 'slower', duration: 4 }),
  newSegment({ kind: 'rest' }),
]

/** The graphs teachers can pick: one, or all three stacked on the same time axis. */
export const GRAPHS = {
  xt: { name: 'Position–time', views: ['x'] },
  vt: { name: 'Velocity–time', views: ['v'] },
  at: { name: 'Acceleration–time', views: ['a'] },
  all: { name: 'All three, stacked', views: ['x', 'v', 'a'] },
} as const satisfies Record<string, { name: string; views: readonly View[] }>
export type Graphs = keyof typeof GRAPHS
/** What a graph shows up its side: position, velocity or acceleration. */
export type View = 'x' | 'v' | 'a'

const text = (t: string) => ({ mode: 'text' as const, text: t })

/** An axis: time (t), or what a graph shows up its side. */
export type AxisKey = 't' | View

/** One axis's From, To and Count by, as tFrom, tTo, tStep and so on. */
function rangeFields<K extends AxisKey>(key: K, from: number, to: number, step: number, min: number, max: number) {
  return {
    [`${key}From`]: number(from, min, max),
    [`${key}To`]: number(to, min, max),
    [`${key}Step`]: number(step, 0.01, max),
  } as Record<`${K}From` | `${K}To` | `${K}Step`, ReturnType<typeof number>>
}

export const motionSettings = defineSettings({
  segments: list(segment, DEFAULT_SEGMENTS, MAX_SEGMENTS),
  /** Where it starts, in meters. */
  start: int(0, -50, 50),
  graphs: choice('xt', Object.keys(GRAPHS) as Graphs[]),
  /** The numbers along both axes. Off, the graph shows only the shape. */
  numbers: bool(true),
  gridlines: bool(true),
  /** A, B, C… at the ends of the segments, for questions like “between B and C”. */
  letters: bool(false),
  /** Each segment in its own line style (and color, with color on). */
  styles: bool(false),
  /** A tangent to the position–time graph, for the instantaneous velocity. */
  tangent: bool(false),
  tangentAt: number(2, 0, 60),
  title: label({ mode: 'none', text: '' }),
  timeTitle: label(text('Time (s)')),
  xTitle: label(text('Position (m)')),
  vTitle: label(text('Velocity (m/s)')),
  aTitle: label(text('Acceleration (m/s^2)')),
  labelSize: choice<LabelSize>('medium', Object.keys(LABEL_SIZES) as LabelSize[]),
  color: bool(false),
  /**
   * The axes' ranges as the teacher sets them, so graphs on a worksheet can
   * match. Off, each graph is fitted to the motion and these are ignored.
   * Stacked graphs share the time axis (t) and each has its own range up its
   * side: position (x), velocity (v) and acceleration (a).
   */
  ranges: bool(false),
  ...rangeFields('t', 0, 15, 1, 0, 100),
  ...rangeFields('x', 0, 35, 5, -1000, 1000),
  ...rangeFields('v', 0, 5, 1, -100, 100),
  ...rangeFields('a', -1, 1, 0.5, -100, 100),
})

export type MotionSettings = typeof motionSettings.defaults

export const viewsOf = (s: Pick<MotionSettings, 'graphs'>): readonly View[] => GRAPHS[s.graphs].views
