<script lang="ts">
  // How a kind's discs are joined: alone, or a center with outer discs
  // around it. Each choice shows a small drawing of the shape.
  import { SHAPES, SHADE_FILL, SHAPE_NAMES, particleDiscs, type Shape } from '$shared/particles/particles'

  let { shape = $bindable(), name }: { shape: Shape; name: string } = $props()

  /** Every shape drawn with the same looks, so only the shape differs. */
  const drawing = (s: Shape) =>
    particleDiscs({ count: 1, shape: s, look: { size: 'm', shade: 'gray', charge: '' }, outer: { size: 's', shade: 'white', charge: '' } })
</script>

<div class="row">
  <span class="label">Shape</span>
  <div class="options" role="radiogroup" aria-label="{name} shape">
    {#each SHAPES as s (s)}
      <button type="button" role="radio" aria-checked={shape === s} class="shape" class:on={shape === s} onclick={() => (shape = s)}>
        <svg viewBox="-35 -35 70 70" width="34" height="34" aria-hidden="true">
          {#each drawing(s) as d, i (i)}
            <circle cx={d.x} cy={d.y} r={d.r} fill={SHADE_FILL[d.shade]} stroke="#222" stroke-width="2" />
          {/each}
        </svg>
        <span>{SHAPE_NAMES[s]}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .row { display: flex; align-items: flex-start; gap: 0.6rem; margin-top: 0.55rem; }
  .label { flex: none; width: 3.6rem; padding-top: 0.35rem; font-size: 0.84rem; font-weight: 700; }
  .options { display: flex; flex-wrap: wrap; gap: 0.25rem; }
  .shape {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    width: 4.6rem;
    padding: 0.35rem 0.2rem 0.3rem;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    background: #fff;
    font-size: 0.74rem;
    line-height: 1.1;
  }
  .shape:hover { border-color: var(--blue-border); background: var(--blue-soft); }
  .shape.on { border-color: var(--blue); box-shadow: 0 0 0 2px var(--blue); }
</style>
