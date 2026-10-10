<script lang="ts">
  // The Circuit Editor's directory card: a circuit the generator can't draw,
  // R₁ in series with R₂ and R₃ in parallel, drawn the way the editor draws
  // it, every part on the grid and every wire routed by the editor.
  import CircuitDrawing from './CircuitDrawing.svelte'
  import { cropBox, emptySchematic, route, type End, type Part, type PartKind, type Rotation, type Schematic } from './schematic'

  const text = (t: string) => ({ mode: 'text' as const, text: t })
  const at = (id: string, kind: PartKind, x: number, y: number, rotation: Rotation, name: string, value: string): Part => ({
    id, kind, x, y, rotation, name: name ? text(name) : { mode: 'none', text: '' }, value: text(value), flip: false, open: false,
  })
  let sample: Schematic = {
    ...emptySchematic(),
    parts: [
      at('cell', 'battery', 120, 260, 270, '', '12 V'),
      at('r1', 'resistor', 260, 140, 0, 'R_1', '2 Omega'),
      at('r2', 'resistor', 400, 260, 90, 'R_2', '6 Omega'),
      at('r3', 'resistor', 540, 260, 90, 'R_3', '3 Omega'),
    ],
  }
  const joins: [End, End][] = [
    [{ part: 'cell', t: 1 }, { part: 'r1', t: 0 }],
    [{ part: 'r1', t: 1 }, { part: 'r2', t: 0 }],
    [{ part: 'r1', t: 1 }, { part: 'r3', t: 0 }],
    [{ part: 'r2', t: 1 }, { part: 'cell', t: 0 }],
    [{ part: 'r3', t: 1 }, { part: 'cell', t: 0 }],
  ]
  for (const [i, [a, b]] of joins.entries()) sample = { ...sample, wires: [...sample.wires, { id: `w${i}`, a, b, via: route(sample, a, b), auto: true }] }
  const crop = cropBox(sample)!
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="{crop.x} {crop.y} {crop.width} {crop.height}">
  <CircuitDrawing schematic={sample} />
</svg>
