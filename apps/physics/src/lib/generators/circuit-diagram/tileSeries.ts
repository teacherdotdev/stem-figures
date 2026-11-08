import type { CircuitSettings } from './settings'
type Tile = CircuitSettings['circuitTiles'][number]

/** Insert a column while continuing any branch crossing the insertion point. */
export function insertSeriesTile(tiles: readonly Tile[], after: number, branch: number): Tile[] {
  const column = after + 1
  const crossing = new Set(tiles.filter(t => t.column === after && tiles.some(next => next.column === column && next.branch === t.branch)).map(t => t.branch))
  crossing.add(branch)
  return [
    ...tiles.map(t => ({ ...t, column: t.column >= column ? t.column + 1 : t.column })),
    ...[...crossing].filter(b => b !== 0).map(b => ({ kind: 'wire' as const, column, branch: b })),
  ]
}

/** Only the ends of a series run connect back to the main circuit. */
export function branchEnds(tiles: readonly Tile[], column: number, branch: number) {
  return {
    left: branch !== 0 && !tiles.some(t => t.column === column - 1 && t.branch === branch),
    right: branch !== 0 && !tiles.some(t => t.column === column + 1 && t.branch === branch),
  }
}
