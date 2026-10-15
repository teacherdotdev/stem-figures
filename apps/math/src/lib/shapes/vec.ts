// Points and directions on a figure, in its own units (SVG's, y down), and the
// few operations a figure's layout needs.

import type { MathBox } from '$lib/shared/mathSvg.js'

/** A point or a direction. */
export type Vec = [number, number]

export const add = (p: Vec, q: Vec): Vec => [p[0] + q[0], p[1] + q[1]]
export const sub = (p: Vec, q: Vec): Vec => [p[0] - q[0], p[1] - q[1]]
export const mul = (p: Vec, k: number): Vec => [p[0] * k, p[1] * k]
export const dot = (p: Vec, q: Vec) => p[0] * q[0] + p[1] * q[1]
export const cross = (p: Vec, q: Vec) => p[0] * q[1] - p[1] * q[0]
export const len = (p: Vec) => Math.hypot(p[0], p[1])
export const unit = (p: Vec) => mul(p, 1 / (len(p) || 1))
export const perp = (p: Vec): Vec => [-p[1], p[0]]
/** Rounded to a tenth, for SVG coordinates. */
export const r1 = (v: number) => Math.round(v * 10) / 10

/** How far a label's box reaches from its middle in direction d. */
export const reach = (box: MathBox, d: Vec) => (box.w / 2) * Math.abs(d[0]) + ((box.asc + box.desc) / 2) * Math.abs(d[1])
