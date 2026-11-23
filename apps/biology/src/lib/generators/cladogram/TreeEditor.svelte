<script lang="ts">
  // One node of the tree in the settings column, and everything inside it:
  // a taxon's name (and a trait of its own, once added), or a clade's
  // trait with its members listed under it, indented. It shows the tidied tree and changes nothing itself; typing
  // and the buttons go to `onText` and `onEdit`, addressed by index path.
  import { ArrowDown, ArrowUp, Plus, Split, Tag, Trash2, Ungroup } from '@lucide/svelte'
  import Self from './TreeEditor.svelte'
  import { MAX_LABEL, isClade, type Edit, type Node, type Path } from './tree'

  interface Props {
    node: Node
    path: Path
    /** how many siblings the node has, counting itself */
    siblings: number
    /** no more taxa can be added */
    full: boolean
    /** the tree has only two taxa, so none can go */
    least: boolean
    onText: (path: Path, field: 'name' | 'trait', text: string) => void
    onEdit: (edit: Edit, path: Path) => void
  }
  let { node, path, siblings, full, least, onText, onEdit }: Props = $props()

  const i = $derived(path[path.length - 1] ?? 0)
  const root = $derived(path.length === 0)
  const name = $derived(isClade(node) ? (root ? 'the whole tree' : `group ${node.trait.trim() || i + 1}`) : node.name.trim() || `taxon ${i + 1}`)
</script>

{#snippet moves()}
  {#if !root}
    <button type="button" class="icon-btn" aria-label="Move {name} up" data-tip="Move up" disabled={i === 0} onclick={() => onEdit('up', path)}>
      <ArrowUp size={16} />
    </button>
    <button
      type="button" class="icon-btn" aria-label="Move {name} down" data-tip="Move down"
      disabled={i === siblings - 1} onclick={() => onEdit('down', path)}
    >
      <ArrowDown size={16} />
    </button>
    <button type="button" class="icon-btn" aria-label="Remove {name}" data-tip="Remove" disabled={least} onclick={() => onEdit('remove', path)}>
      <Trash2 size={16} />
    </button>
  {/if}
{/snippet}

{#if isClade(node)}
  <div class="clade" class:root>
    <div class="row">
      <input
        type="text" maxlength={MAX_LABEL} value={node.trait}
        aria-label={root ? 'Trait on the root, shared by every taxon' : `Trait shared by ${name}`}
        placeholder={root ? 'Trait every taxon shares' : 'Trait this group shares'}
        oninput={(e) => onText(path, 'trait', e.currentTarget.value)}
      />
      <button type="button" class="icon-btn" aria-label="Add a taxon to {name}" data-tip="Add a taxon" disabled={full} onclick={() => onEdit('addTaxon', path)}>
        <Plus size={16} />
      </button>
      {#if !root}
        <button type="button" class="icon-btn" aria-label="Ungroup {name}" data-tip="Ungroup" onclick={() => onEdit('ungroup', path)}>
          <Ungroup size={16} />
        </button>
      {/if}
      {@render moves()}
    </div>
    <div class="members">
      {#each node.children as child, j (j)}
        <Self node={child} path={[...path, j]} siblings={node.children.length} {full} {least} {onText} {onEdit} />
      {/each}
    </div>
  </div>
{:else}
  <div class="row taxon">
    <input
      type="text" maxlength={MAX_LABEL} value={node.name} aria-label="Taxon {i + 1} name" placeholder="Taxon (empty for a blank line)"
      oninput={(e) => onText(path, 'name', e.currentTarget.value)}
    />
    {#if node.trait === undefined}
      <button type="button" class="icon-btn" aria-label="Give {name} a trait of its own" data-tip="Add a trait of its own" onclick={() => onEdit('addTrait', path)}>
        <Tag size={16} />
      </button>
    {/if}
    <button type="button" class="icon-btn" aria-label="Group {name} with a new taxon" data-tip="Group with a new taxon" disabled={full} onclick={() => onEdit('pair', path)}>
      <Split size={16} />
    </button>
    {@render moves()}
  </div>
  {#if node.trait !== undefined}
    <div class="row own">
      <input
        type="text" maxlength={MAX_LABEL} value={node.trait} aria-label="Trait only {name} has" placeholder="Trait only this taxon has"
        oninput={(e) => onText(path, 'trait', e.currentTarget.value)}
      />
    </div>
  {/if}
{/if}

<style>
  .clade { display: flex; flex-direction: column; gap: 0.4rem; }
  .members { display: flex; flex-direction: column; gap: 0.4rem; margin-left: 0.4rem; padding-left: 0.45rem; border-left: 2px solid var(--border); }
  .row { display: flex; align-items: center; gap: 0.15rem; }
  .row input { flex: 1; min-width: 0; font-size: 0.88rem; }
  .clade > .row input { font-style: italic; background: var(--blue-soft); border-color: var(--blue-border); }
  .taxon input { font-weight: 700; }
  .own { margin: -0.15rem 0 0 1.2rem; }
  .own input { font-style: italic; background: var(--blue-soft); border-color: var(--blue-border); }
</style>
