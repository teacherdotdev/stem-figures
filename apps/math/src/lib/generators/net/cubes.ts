// The 11 nets of a cube, as squares on a grid, and folding a net up to see
// which face of the cube each square becomes. Folding gives each square's
// corners as corners of the cube, so the layout can tell a fold line (two
// squares side by side sharing a cube edge) from a cut edge, and pair the
// cut edges that meet when the net is folded.

/** A square of a net: its column and row on the grid, row 0 at the top. */
export type Cell = [number, number]

/**
 * The 11 cube nets, each one once (no two are turns or mirror images of each
 * other). Net 1 is the cross textbooks draw first; 1 to 6 have a row of four
 * squares, 7 to 9 a row of three, 10 is the staircase and 11 two rows of three.
 */
export const CUBE_NETS: Cell[][] = [
  // A row of four with one square above and one below.
  [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]],
  // Two squares, then a row of three, then one.
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2]],
  // The staircase: two, two and two.
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
  // Two rows of three.
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
]

type P3 = [number, number, number]
const add3 = (p: P3, q: P3): P3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]]
const sub3 = (p: P3, q: P3): P3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]]
const key3 = (p: P3) => p.map((c) => Math.round(c)).join(',')

/** A square's corners in order round it: top left, top right, bottom right, bottom left. */
export const cornersOf = ([c, r]: Cell): [number, number][] => [[c, r], [c + 1, r], [c + 1, r + 1], [c, r + 1]]

/**
 * Fold a net of squares up into a cube of side 1. Gives each square's corners
 * (in cornersOf's order) as names of the cube's corners ("0,1,1"), or null
 * when the squares don't fold into a cube: two land on the same face, or
 * they aren't joined.
 */
export function foldCube(cells: Cell[]): string[][] | null {
  if (!cells.length) return null
  const at = new Map(cells.map((cell, i) => [cell.join(','), i]))
  // Each square's corners in 3D once folded, and which way the inside of the cube is from it.
  const placed: ({ corners: P3[]; inward: P3 } | null)[] = cells.map(() => null)
  placed[0] = { corners: cornersOf(cells[0]).map(([x, y]): P3 => [x - cells[0][0], y - cells[0][1], 0]), inward: [0, 0, 1] }
  const queue = [0]
  // Neighbours across each side: [column step, row step, the two corners on that side, the two across from them].
  const SIDES: [number, number, [number, number], [number, number]][] = [
    [0, -1, [0, 1], [3, 2]],
    [1, 0, [1, 2], [0, 3]],
    [0, 1, [3, 2], [0, 1]],
    [-1, 0, [0, 3], [1, 2]],
  ]
  while (queue.length) {
    const i = queue.shift()!
    const here = placed[i]!
    for (const [dc, dr, shared, away] of SIDES) {
      const j = at.get(`${cells[i][0] + dc},${cells[i][1] + dr}`)
      if (j === undefined || placed[j]) continue
      // The neighbour folds up toward the inside, about the side they share.
      const toward = sub3(here.corners[shared[0]], here.corners[away[0]]) // from this square across to the shared side
      const corners: P3[] = [] as unknown as P3[]
      // The neighbour's corners on the shared side are this square's; the others are up from them.
      const theirs = cornersOf(cells[j])
      const mine = cornersOf(cells[i])
      theirs.forEach(([x, y], k) => {
        const same = mine.findIndex(([u, v]) => u === x && v === y)
        if (same >= 0) corners[k] = here.corners[same]
      })
      theirs.forEach(([x, y], k) => {
        if (corners[k]) return
        // Its partner on the shared side is the corner of the neighbour one step back toward this square.
        const back = theirs.findIndex(([u, v]) => u === x - dc && v === y - dr)
        corners[k] = add3(corners[back], here.inward)
      })
      placed[j] = { corners, inward: [-toward[0], -toward[1], -toward[2]] }
      queue.push(j)
    }
  }
  if (placed.some((p) => !p)) return null
  const faces = new Set(placed.map((p) => p!.corners.map(key3).sort().join(' ')))
  if (faces.size !== cells.length) return null
  return placed.map((p) => p!.corners.map(key3))
}

/** A net turned and flipped every way, each as sorted text, to tell whether two nets are the same. */
export function shapesOf(cells: Cell[]): string[] {
  const out: string[] = []
  let cur = cells
  for (let flip = 0; flip < 2; flip++) {
    for (let turn = 0; turn < 4; turn++) {
      cur = cur.map(([c, r]) => [r, -c] as Cell)
      const minC = Math.min(...cur.map((p) => p[0]))
      const minR = Math.min(...cur.map((p) => p[1]))
      out.push(cur.map(([c, r]) => `${c - minC},${r - minR}`).sort().join(' '))
    }
    cur = cur.map(([c, r]) => [-c, r] as Cell)
  }
  return out
}
