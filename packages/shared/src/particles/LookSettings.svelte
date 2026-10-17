<script lang="ts">
  // How one atom or ion looks: its size, its shade and, for an ion, its
  // charge. Each choice shows the disc itself where it can.
  import { CHARGES, SHADES, SHADE_FILL, SHADE_NAMES, SIZES, SIZE_NAMES, chargeText, type Look } from './particles'

  let { look = $bindable(), name }: { look: Look; name: string } = $props()
</script>

<div class="row">
  <span class="label">Size</span>
  <div class="options" role="radiogroup" aria-label="{name} size">
    {#each SIZES as size (size)}
      <button type="button" role="radio" aria-checked={look.size === size} class="chip small" class:on={look.size === size} onclick={() => (look.size = size)}>
        {SIZE_NAMES[size]}
      </button>
    {/each}
  </div>
</div>
<div class="row">
  <span class="label">Shade</span>
  <div class="options" role="radiogroup" aria-label="{name} shade">
    {#each SHADES as shade (shade)}
      <button
        type="button"
        role="radio"
        aria-checked={look.shade === shade}
        aria-label={SHADE_NAMES[shade]}
        data-tip={SHADE_NAMES[shade]}
        class="swatch"
        class:on={look.shade === shade}
        onclick={() => (look.shade = shade)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="10" fill={SHADE_FILL[shade]} stroke="#222" stroke-width="1.5" /></svg>
      </button>
    {/each}
  </div>
</div>
<div class="row">
  <span class="label">Charge</span>
  <div class="options" role="radiogroup" aria-label="{name} charge">
    {#each CHARGES as charge (charge)}
      <button type="button" role="radio" aria-checked={look.charge === charge} class="chip small" class:on={look.charge === charge} onclick={() => (look.charge = charge)}>
        {charge ? chargeText(charge) : 'None'}
      </button>
    {/each}
  </div>
</div>

<style>
  .row { display: flex; align-items: flex-start; gap: 0.6rem; margin-top: 0.55rem; }
  .label { flex: none; width: 3.3rem; padding-top: 0.35rem; font-size: 0.84rem; font-weight: 700; }
  .options { display: flex; flex-wrap: wrap; gap: 0.25rem; }
  .small { padding: 0.3rem 0.5rem; font-size: 0.84rem; }
  .swatch {
    display: grid;
    place-items: center;
    width: 2.1rem;
    height: 2.1rem;
    padding: 0;
    border: 1.5px solid var(--border);
    border-radius: 999px;
    background: #fff;
  }
  .swatch:hover { border-color: var(--blue-border); background: var(--blue-soft); }
  .swatch.on { border-color: var(--blue); box-shadow: 0 0 0 2px var(--blue); }
</style>
