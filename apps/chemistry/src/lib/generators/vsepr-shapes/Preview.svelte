<script lang="ts">
  // VSEPR Shapes' figures on its directory card: ammonia wedge-and-dash and
  // sulfur hexafluoride as a ball-and-stick model.
  import SplitPreview from '$lib/shared/SplitPreview.svelte'
  import VseprFigure from './VseprFigure.svelte'
  import { findShape, vseprSettings } from './settings'

  const ammonia = vseprSettings.tidy({ ...vseprSettings.defaults, shapeName: false })
  const sf6 = vseprSettings.tidy({ ...vseprSettings.defaults, formula: 'SF6', style: 'ball-and-stick', shapeName: false })
</script>

{#snippet ammoniaFigure()}<VseprFigure settings={ammonia} found={findShape(ammonia.formula)} />{/snippet}
{#snippet sf6Figure()}<VseprFigure settings={sf6} found={findShape(sf6.formula)} />{/snippet}

<SplitPreview figures={[ammoniaFigure, sf6Figure]} split="vertical" />
