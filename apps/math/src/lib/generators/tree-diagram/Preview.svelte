<script lang="ts">
  // The Tree Diagram Generator's picture on the directory: two marbles drawn
  // from a bag without replacement, with fractions on the branches, drawn by
  // the same code the generator uses.
  import { buildTree } from './layout.js'
  import { cleanSettings } from './settings.js'
  import TreeDiagram from './TreeDiagram.svelte'

  const settings = cleanSettings({
    stages: [
      { outcomes: ['R', 'B'], probs: [['3/5', '2/5']] },
      { outcomes: ['R', 'B'], same: false, probs: [['2/4', '2/4'], ['3/4', '1/4']] },
    ],
    showNames: 'hide',
    showPathProbs: 'hide',
  })
</script>

<TreeDiagram layout={buildTree(settings)} />
