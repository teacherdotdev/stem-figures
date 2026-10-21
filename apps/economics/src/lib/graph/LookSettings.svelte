<script lang="ts">
  // The Look settings group every economics graph has: color or black and
  // white (regions hatched instead of tinted), and how the axes end.
  // Schematic or numbered axes is AxesPicker, in a generator's first card.
  import { Palette } from '@lucide/svelte'
  import Section from '$shared/Section.svelte'
  import CapPicker from '$shared/graph/CapPicker.svelte'
  import { CAPS, type Cap } from '$shared/graph/caps'
  import type { Ink } from './settings'

  interface Props {
    ink: Ink
    xEndCap: Cap
    yEndCap: Cap
  }
  let { ink = $bindable(), xEndCap = $bindable(), yEndCap = $bindable() }: Props = $props()

  const ends = $derived(xEndCap === 'none' && yEndCap === 'none' ? 'plain axes' : `${CAPS[xEndCap]} / ${CAPS[yEndCap]}`.toLowerCase())
  const summary = $derived([ink === 'color' ? 'Color' : 'Black and white', ends].join(' · '))
</script>

<Section title="Look" icon={Palette} {summary}>
  <div class="field">
    <span>Ink</span>
    <div class="segmented" role="radiogroup" aria-label="Ink">
      <button type="button" role="radio" aria-checked={ink === 'color'} class:on={ink === 'color'} onclick={() => (ink = 'color')}>Color</button>
      <button type="button" role="radio" aria-checked={ink === 'bw'} class:on={ink === 'bw'} onclick={() => (ink = 'bw')}>Black and white</button>
    </div>
  </div>
  <div class="field-row">
    <div class="field">
      <span>x-axis end</span>
      <CapPicker options={CAPS} label="x-axis end" direction="right" bind:value={xEndCap} />
    </div>
    <div class="field">
      <span>y-axis end</span>
      <CapPicker options={CAPS} label="y-axis end" direction="up" bind:value={yEndCap} />
    </div>
  </div>
</Section>
