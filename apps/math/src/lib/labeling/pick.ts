// What a figure offers to be pointed at and clicked, for PickLayer.svelte to
// draw its highlights and hit areas from: lines, angles, places for a point
// and curves, each by a key that stays with it as the figure changes.

export type Vec = [number, number]

/** Something on the figure the teacher can point at: an angle, a line, a place for a point or a curve, by its key or id. */
export type Part = { kind: 'angle' | 'line' | 'point' | 'curve'; key: string }

export interface Pickable {
  /** The figure's own box, which the layer's SVG matches. */
  frame: { x: number; y: number; w: number; h: number }
  /** Lines and sides: `name` is what a screen reader hears, else it's named by `kind`. */
  segments: { id: string; kind: string; from: Vec; to: Vec; name?: string }[]
  /** Angles: the wedge that's highlighted and clicked, where their popup opens, and their measure written while it's highlighted. */
  angles: { key: string; wedge: string; anchor: Vec; measure: number; ghost?: { at: Vec; text: string } }[]
  /** Places a point can go, shown or not: `line` is the line it's near the end of, if any. */
  spots: { key: string; at: Vec; line: string | null; name?: string }[]
  /** Curves, as SVG paths, and where their popup opens. */
  curves?: { key: string; d: string; anchor: Vec; name?: string }[]
  /** The labels drawn, so a ghost measure isn't written over an angle's own. */
  labels: { part: string }[]
}
