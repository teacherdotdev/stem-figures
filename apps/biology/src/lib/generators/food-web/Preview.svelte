<script lang="ts">
  // Food Webs and Energy Pyramids' picture on the directory: a small
  // grassland web in large labels, to read at the card's size. Its pictures
  // are imported here, so the directory draws them on the server too.
  import FoodWebFigure from './FoodWebFigure.svelte'
  import { contentsOf, drawings } from './pictures.svelte'
  import { foodWebSettings } from './settings'
  import grass from './organisms/grass.svg?raw'
  import grasshopper from './organisms/grasshopper.svg?raw'
  import rabbit from './organisms/rabbit.svg?raw'
  import frog from './organisms/frog.svg?raw'
  import fox from './organisms/fox.svg?raw'
  import hawk from './organisms/hawk.svg?raw'

  for (const [id, svg] of Object.entries({ grass, grasshopper, rabbit, frog, fox, hawk })) {
    if (!drawings.has(id)) drawings.set(id, contentsOf(svg))
  }

  const settings = foodWebSettings.tidy({
    ...foodWebSettings.defaults,
    web: 'grass;grasshopper=grass;rabbit=grass;frog=grasshopper;fox=rabbit,frog;hawk=frog,rabbit',
    labelSize: 'large',
  })
</script>

<FoodWebFigure {settings} id="preview-food-web" />
