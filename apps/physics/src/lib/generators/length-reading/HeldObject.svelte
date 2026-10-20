<script lang="ts">
  // The object held in a caliper's or micrometer's jaws, in flat
  // grays with black outlines that photocopy well: a block, an upright
  // cylinder, a ball, or a wire running across the jaws. `k` scales line
  // widths the way the instrument's do inside a close-up.
  import type { ObjectShape } from './instrument'

  let { shape, k = 1 }: { shape: ObjectShape; k?: number } = $props()
  const INK = '#111'
</script>

<g stroke={INK} stroke-width={1.6 * k} stroke-linejoin="round">
  {#if shape.kind === 'block'}
    <rect x={shape.left} y={shape.top} width={shape.width} height={shape.bottom - shape.top} fill="#c4c8ce" />
  {:else if shape.kind === 'cylinder'}
    {@const { left, width, top, bottom, ry } = shape}
    <!-- upright: its side, shaded light to dark across, under an elliptical top -->
    <path
      d="M {left} {top + ry} V {bottom - ry} A {width / 2} {ry} 0 0 0 {left + width} {bottom - ry} V {top + ry}"
      fill="#b4b9c0"
    />
    <rect x={left + width * 0.18} y={top + ry} width={width * 0.14} height={bottom - top - 2 * ry} fill="#dfe2e6" stroke="none" />
    <rect x={left + width * 0.72} y={top + ry} width={width * 0.14} height={bottom - top - 2 * ry} fill="#8f959d" stroke="none" />
    <path d="M {left} {top + ry} V {bottom - ry} A {width / 2} {ry} 0 0 0 {left + width} {bottom - ry} V {top + ry}" fill="none" />
    <ellipse cx={left + width / 2} cy={top + ry} rx={width / 2} {ry} fill="#d4d7dc" />
  {:else if shape.kind === 'ball'}
    {@const { cx, cy, r } = shape}
    <circle {cx} {cy} {r} fill="#aeb3ba" />
    <ellipse cx={cx - r * 0.36} cy={cy - r * 0.38} rx={r * 0.26} ry={r * 0.16} transform="rotate(-35 {cx - r * 0.36} {cy - r * 0.38})" fill="#fff" stroke="none" />
  {:else if shape.kind === 'wire'}
    {@const { left, width, top, bottom } = shape}
    <rect x={left} y={top} width={width} height={bottom - top} fill="#a9aeb5" />
    <rect x={left + width * 0.2} y={top} width={width * 0.18} height={bottom - top} fill="#e2e4e8" stroke="none" />
    <rect x={left} y={top} width={width} height={bottom - top} fill="none" />
  {/if}
</g>
