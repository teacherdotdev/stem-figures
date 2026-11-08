export interface Bounds { x: number; y: number; width: number; height: number }

/** Frame the circuit and its edit targets with a small, consistent margin. */
export function tileViewport(bounds: readonly Bounds[], padding = 12): Bounds {
  if (!bounds.length) return { x: 0, y: 0, width: 100, height: 100 }
  const x = Math.min(...bounds.map(b => b.x)) - padding
  const y = Math.min(...bounds.map(b => b.y)) - padding
  return {
    x, y,
    width: Math.max(...bounds.map(b => b.x + b.width)) + padding - x,
    height: Math.max(...bounds.map(b => b.y + b.height)) + padding - y,
  }
}
