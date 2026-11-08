export interface AxisSpace { start: number; end: number; size: number }

/** Compress empty half-tile intervals; reserve natural space around symbols and labels. */
export function compactAxis(origin: number, min: number, max: number, spaces: readonly AxisSpace[]) {
  const first = Math.floor((min - origin) / 50)
  const last = Math.ceil((max - origin) / 50)
  const lengths = Array.from({ length: last - first }, () => 14)
  for (const space of spaces) {
    const a = Math.max(0, Math.floor((space.start - origin) / 50) - first)
    const b = Math.min(lengths.length, Math.ceil((space.end - origin) / 50) - first)
    if (b <= a) continue
    const current = lengths.slice(a, b).reduce((sum, n) => sum + n, 0)
    const extra = Math.max(0, space.size - current) / (b - a)
    for (let i = a; i < b; i++) lengths[i] += extra
  }
  const positions = [0]
  for (const size of lengths) positions.push(positions.at(-1)! + size)
  return (value: number) => {
    const cell = (value - origin) / 50 - first
    const index = Math.max(0, Math.min(lengths.length - 1, Math.floor(cell)))
    return positions[index] + (cell - index) * lengths[index]
  }
}

/** These circuit paths use absolute move, line, and quadratic commands only. */
export function mapWirePath(path: string, x: (n: number) => number, y: (n: number) => number) {
  let command = '', coordinate = 0
  return path.replace(/[MHVQLZ]|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi, token => {
    if (/^[a-z]$/i.test(token)) { command = token; coordinate = 0; return token }
    const map = command === 'H' ? x : command === 'V' ? y : coordinate++ % 2 === 0 ? x : y
    return String(map(Number(token)))
  })
}
