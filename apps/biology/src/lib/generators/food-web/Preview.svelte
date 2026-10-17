<script lang="ts">
  // Food Webs and Energy Pyramids' picture on the directory: a small
  // grassland web in three wide rows and large labels, to read at the card's
  // size. Its pictures are imported here, so the directory draws them on the
  // server too.
  import FoodWebFigure from './FoodWebFigure.svelte'
  import { contentsOf, drawings } from './pictures.svelte'
  import { foodWebSettings } from './settings'
  import grass from './organisms/grass.svg?raw'
  import berries from './organisms/berries.svg?raw'
  import rabbit from './organisms/rabbit.svg?raw'
  import mouse from './organisms/mouse.svg?raw'
  import deer from './organisms/deer.svg?raw'
  import fox from './organisms/fox.svg?raw'
  import hawk from './organisms/hawk.svg?raw'

  for (const [id, svg] of Object.entries({ grass, berries, rabbit, mouse, deer, fox, hawk })) {
    if (!drawings.has(id)) drawings.set(id, contentsOf(svg))
  }

  const settings = foodWebSettings.tidy({
    ...foodWebSettings.defaults,
    web: 'grass;berries;rabbit=grass;mouse=grass,berries;deer=grass,berries;fox=rabbit,mouse;hawk=rabbit,mouse',
    decomposers: false,
    labelSize: 'large',
  })
</script>

<FoodWebFigure {settings} id="preview-food-web" />
