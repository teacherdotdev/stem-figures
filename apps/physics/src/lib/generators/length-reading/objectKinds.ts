// The objects that lie along the ruler: the ones Chemistry's Volume by
// Displacement drops into a graduated cylinder, copied from its objects.ts
// with only what Length Reading uses. Length Reading is on Chemistry Figures
// too; keep this and that file drawing the same objects.

export const OBJECTS = ['marbles', 'rock', 'cube', 'cylinder'] as const
export type ObjectKind = (typeof OBJECTS)[number]

export const OBJECT_NAMES: Record<ObjectKind, string> = { marbles: 'Marbles', rock: 'Rock', cube: 'Cube', cylinder: 'Metal cylinder' }

export const MARBLE_COUNTS = [1, 2, 3, 4, 5] as const

/** The object in a sentence: "a marble", "3 marbles", "a rock", "a metal cylinder". */
export const objectName = (kind: ObjectKind, marbles: number) =>
  kind === 'marbles' ? (marbles === 1 ? 'a marble' : `${marbles} marbles`) : `a ${OBJECT_NAMES[kind].toLowerCase()}`

export interface Circle {
  x: number
  y: number
  r: number
}

/** a rock's width over its height, lying down */
export const ROCK_ASPECT = 1.5
/** a metal cylinder's height over its width, like the slugs in a density kit */
export const CYLINDER_ASPECT = 2
/** how round its machined edges are, over its width: enough to sit in the
 *  rounded bottom of the glass */
export const CYLINDER_EDGE = 0.1

// A lumpy outline around its box, as fractions of it from the top left,
// going clockwise, with a flatter bottom where it rests.
const ROCK_OUTLINE: [number, number][] = [
  [0.3, 0.06], [0.55, 0], [0.8, 0.12], [0.97, 0.38], [1, 0.66], [0.9, 0.93],
  [0.62, 1], [0.3, 0.99], [0.07, 0.88], [0, 0.6], [0.1, 0.3],
]

/** The rock's outline: straight-ish between lumps, rounded at them. */
export function rockPath({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const pts = ROCK_OUTLINE.map(([u, v]) => [x + u * w, y + v * h])
  const mid = (i: number) => {
    const [a, b] = [pts[i % pts.length], pts[(i + 1) % pts.length]]
    return `${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2}`
  }
  let d = `M ${mid(0)}`
  for (let i = 1; i <= pts.length; i++) {
    const [px, py] = pts[i % pts.length]
    d += ` Q ${px} ${py} ${mid(i)}`
  }
  return `${d} Z`
}
