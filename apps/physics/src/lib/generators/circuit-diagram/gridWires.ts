/** Connect facing terminals along clear grid lines. Positions determine connectivity. */
export function gridWires(parts: readonly { x: number; y: number; angle: number }[]) {
  const terminals = parts.flatMap((part, index) => {
    const radians = part.angle * Math.PI / 180
    const dx = Math.round(Math.cos(radians)), dy = Math.round(Math.sin(radians))
    return [-1, 1].map(side => ({ index, x: part.x + side * dx * 40, y: part.y + side * dy * 40, dx: side * dx, dy: side * dy }))
  })
  const wires: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 0; i < terminals.length; i++) {
    const a = terminals[i]
    let nearest = -1, distance = Infinity
    for (let j = 0; j < terminals.length; j++) {
      const b = terminals[j]
      if (a.index === b.index || a.dx !== -b.dx || a.dy !== -b.dy) continue
      const x = b.x - a.x, y = b.y - a.y
      const along = x * a.dx + y * a.dy
      if (along <= 0 || x * a.dy !== y * a.dx || along >= distance) continue
      const blocked = parts.some((p, index) => {
        if (index === a.index || index === b.index) return false
        return Math.abs(p.x - (a.x + b.x) / 2) < Math.abs(x) / 2 + 25 && Math.abs(p.y - (a.y + b.y) / 2) < Math.abs(y) / 2 + 25
      })
      if (!blocked) { nearest = j; distance = along }
    }
    if (nearest > i) {
      const b = terminals[nearest]
      wires.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
    }
  }
  return wires
}
