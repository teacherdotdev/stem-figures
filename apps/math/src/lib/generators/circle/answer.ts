// An example figure's answer key, worked out by the generator's own drawing:
// what each label typed as text stands for (an angle's or an arc's degrees,
// a line's length), and each shaded area's measures. A figure with nothing
// to find lists its lines by name, for naming the parts of a circle.

import { roundTo } from '$lib/shapes/parts.js'
import { buildCircle, lineName } from './layout.js'
import { circleMeasures } from './measures.js'
import { readRadius, type Settings } from './settings.js'

export function circleAnswer(s: Settings): { heading: string; lines: string[] } {
  const f = buildCircle(s)
  // Everything the figure names must be drawn, or it isn't the figure described.
  const missing = [
    ...Object.keys(s.angles).filter((k) => !f.angles.some((a) => a.key === k)),
    ...Object.keys(s.arcs).filter((k) => !f.geo.arcs.some((a) => a.key === k)),
    ...Object.keys(s.faces).filter((k) => !f.areas.some((a) => a.key === k)),
    ...Object.keys(s.marks).filter((k) => !f.geo.nodes.some((n) => n.key === k)),
    ...Object.keys(f.geo.problems),
  ]
  if (missing.length) throw new Error(`The circle figure doesn’t draw ${missing.join(', ')}`)
  const r = readRadius(s.radius)
  const unit = s.unit.trim() ? ` ${s.unit.trim()}` : ''
  const round = (v: number) => roundTo(v, s.round)
  const lines: string[] = []
  for (const a of f.angles) {
    const st = s.angles[a.key]
    if (st?.label === 'text' && st.text.trim()) lines.push(`${st.text.trim()} = ${round(a.measure)}°`)
  }
  for (const a of f.geo.arcs) {
    const st = s.arcs[a.key]
    if (st?.label === 'text' && st.text.trim()) lines.push(`${st.text.trim()} = ${round(a.sweep)}°`)
  }
  for (const g of f.geo.lines) {
    if (g.line.label === 'text' && g.line.text.trim() && g.line.kind !== 'tangent' && r !== null) lines.push(`${g.line.text.trim()} = ${round(g.length * r)}${unit}`)
  }
  const name = (key: string) => (s.points.find((p) => p.id === key)?.name ?? (key === 'o' ? s.centerName : s.marks[key]) ?? '').trim()
  for (const m of circleMeasures(s, f.areas.map((a) => a.face), (face) => face.corners.map(name).join('')).slice(2)) {
    lines.push(`${m.name}: ${m.values.join(', ')}`)
  }
  if (!lines.length) lines.push(f.geo.lines.map((g) => lineName(s, g)).join(' · '))
  return { heading: 'Answer key', lines }
}
