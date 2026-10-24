<script lang="ts">
  // A table typed in like a spreadsheet, or pasted from one: a name on each
  // row, then a value per column under the column's heading, with a narrow ±
  // column beside each one when `errors` is on.
  //
  // There are no add or remove buttons. An empty column and an empty row wait
  // at the end, and typing in either adds a column or a row. A row or column
  // that's been emptied is gone once the table loses focus (one column always
  // stays). Enter moves down a row. Pasting a block with tabs (or several
  // lines with commas) anywhere in it replaces the whole table, headings
  // included. In `hiding` mode each value and name becomes a button that
  // leaves it for students. See table.ts for how it's kept.
  import { tick } from 'svelte'
  import { EyeOff } from '@lucide/svelte'
  import { MAX_COLUMNS, MAX_ROWS, blankCell, blankRow, parsePasted, type Cell, type TableRow } from './table'

  interface Props {
    id: string
    columns: string[]
    rows: TableRow[]
    errors?: boolean
    hiding?: boolean
    /** what a row is, for its heading and labels: "Category" */
    rowName: string
    /** what a column is: "Series" */
    columnName: string
    /** an example heading for the first column, shown while it's empty */
    placeholders?: { column?: string }
    /** called with a column's index when it's removed, for settings kept per column */
    onremovecolumn?: (j: number) => void
  }
  let {
    id, columns = $bindable(), rows = $bindable(), errors = $bindable(false), hiding = false,
    rowName, columnName, placeholders = {}, onremovecolumn,
  }: Props = $props()

  let table = $state<HTMLElement>()
  const canAddColumn = $derived(!hiding && columns.length < MAX_COLUMNS)
  const canAddRow = $derived(!hiding && rows.length < MAX_ROWS)

  // Each box's id: the heading of column j, or row i's name, value j or ± j
  // (row rows.length is the empty row at the end).
  const headId = (j: number) => `${id}-h${j}`
  const cellId = (i: number, col: string) => `${id}-r${i}-${col}`

  /** Focus a box as soon as it's drawn (before the next key arrives), with
   *  the caret at the end of what's in it. */
  async function focusLater(el: string) {
    await tick()
    const input = document.getElementById(el) as HTMLInputElement | null
    input?.focus()
    input?.setSelectionRange(input.value.length, input.value.length)
  }

  // Typing in the empty column or row adds it, with what was typed.
  function newColumn(e: Event & { currentTarget: HTMLInputElement }) {
    const typed = e.currentTarget.value
    e.currentTarget.value = ''
    columns.push(typed)
    for (const r of rows) r.cells.push(blankCell())
    focusLater(headId(columns.length - 1))
  }
  function newRow(e: Event & { currentTarget: HTMLInputElement }, col: string) {
    const typed = e.currentTarget.value
    e.currentTarget.value = ''
    const row = blankRow(columns.length)
    if (col === 'name') row.name = typed
    else row.cells[Number(col.slice(1))][col[0] === 'v' ? 'value' : 'error'] = typed
    rows.push(row)
    focusLater(cellId(rows.length - 1, col))
  }

  // Leaving the table drops the rows and columns that were emptied.
  const blankColumn = (j: number) => !columns[j].trim() && rows.every((r) => !r.cells[j].value.trim() && !r.cells[j].error.trim())
  const blankRowAt = (r: TableRow) => !r.name.trim() && r.cells.every((c) => !c.value.trim() && !c.error.trim())
  function tidy(e: FocusEvent) {
    if (table?.contains(e.relatedTarget as Node | null)) return
    for (let j = columns.length - 1; j >= 0 && columns.length > 1; j--) {
      if (!blankColumn(j)) continue
      columns.splice(j, 1)
      for (const r of rows) r.cells.splice(j, 1)
      onremovecolumn?.(j)
    }
    if (rows.some(blankRowAt)) rows = rows.filter((r) => !blankRowAt(r))
  }

  // Enter moves down a row, as in a spreadsheet.
  function down(e: KeyboardEvent, i: number, col: string) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    document.getElementById(i < 0 ? cellId(0, col) : cellId(i + 1, col))?.focus()
  }

  function onpaste(e: ClipboardEvent) {
    const pasted = parsePasted(e.clipboardData?.getData('text/plain') ?? '')
    if (!pasted || !pasted.rows.length) return
    e.preventDefault()
    const n = pasted.columns?.length ?? Math.max(1, ...pasted.rows.map((r) => r.cells.length))
    columns = pasted.columns ?? Array.from({ length: n }, (_, j) => columns[j] ?? '')
    rows = pasted.rows.map((r) => ({ ...r, cells: Array.from({ length: n }, (_, j) => r.cells[j] ?? blankCell()) }))
    if (rows.some((r) => r.cells.some((c) => c.error))) errors = true
  }

  const columnLabel = (j: number) => columns[j]?.trim() || `${columnName} ${j + 1}`
  const rowLabel = (i: number) => rows[i]?.name.trim() || `${rowName} ${i + 1}`
  // The width each column takes, in rem, below which the table scrolls.
  const minWidth = $derived(6.5 + columns.length * (errors ? 6.2 : 3.6) + (canAddColumn ? 2.4 : 0))
  // Values take a share of the width (less each as there are more), the names the rest.
  const valueWidth = $derived(errors ? Math.min(16, 56 / columns.length) : Math.min(40, 60 / columns.length))
  const errorWidth = $derived(errors ? Math.min(10, 34 / columns.length) : 0)
</script>

{#snippet valueBox(i: number, j: number, cell: Cell)}
  {#if hiding}
    <button
      class="hide" class:hidden={cell.hidden} aria-pressed={cell.hidden} aria-label="Leave {rowLabel(i)}, {columnLabel(j)} for students"
      onclick={() => (cell.hidden = !cell.hidden)}
    >{#if cell.hidden}<EyeOff size={13} aria-hidden="true" />{/if}{cell.value}</button>
  {:else}
    <input
      type="text" class="value" inputmode="decimal" id={cellId(i, `v${j}`)} aria-label="{rowLabel(i)}, {columnLabel(j)}"
      bind:value={cell.value} onkeydown={(e) => down(e, i, `v${j}`)}
    />
  {/if}
{/snippet}

<div class="scroll" onpaste={onpaste} onfocusout={tidy} bind:this={table}>
  <table style:min-width="{minWidth}rem" aria-label="{rowName} table">
    <colgroup>
      <col />
      {#each columns as _}<col style:width="{valueWidth}%" />{#if errors}<col style:width="{errorWidth}%" />{/if}{/each}
      {#if canAddColumn}<col class="c-new" />{/if}
    </colgroup>
    <thead>
      <tr>
        <th class="corner" scope="col">{rowName}</th>
        {#each columns as _, j}
          <th scope="col">
            <input
              type="text" class="heading" id={headId(j)} aria-label="{columnName} {j + 1} heading"
              placeholder={j === 0 ? (placeholders.column ?? '') : ''} bind:value={columns[j]}
              onkeydown={(e) => down(e, -1, `v${j}`)}
            />
          </th>
          {#if errors}<th scope="col" class="pm" aria-label="± for {columnLabel(j)}">±</th>{/if}
        {/each}
        {#if canAddColumn}
          <th scope="col" class="new">
            <input
              type="text" class="heading" aria-label="Add a {columnName.toLowerCase()}" title="Add a {columnName.toLowerCase()}" placeholder="+"
              oninput={newColumn}
            />
          </th>
        {/if}
      </tr>
    </thead>
    <tbody>
      {#each rows as row, i}
        <tr>
          <th scope="row">
            {#if hiding}
              <button class="hide name" class:hidden={row.hideName} aria-pressed={row.hideName} aria-label="Leave the name {rowLabel(i)} for students" onclick={() => (row.hideName = !row.hideName)}>
                {#if row.hideName}<EyeOff size={13} aria-hidden="true" />{/if}{row.name}
              </button>
            {:else}
              <input type="text" class="name" id={cellId(i, 'name')} aria-label="{rowName} {i + 1}" bind:value={row.name} onkeydown={(e) => down(e, i, 'name')} />
            {/if}
          </th>
          {#each row.cells as cell, j}
            <td>{@render valueBox(i, j, cell)}</td>
            {#if errors}
              <td class="pm">
                <input
                  type="text" class="value" inputmode="decimal" id={cellId(i, `e${j}`)} aria-label="± for {rowLabel(i)}, {columnLabel(j)}"
                  disabled={hiding} bind:value={cell.error} onkeydown={(e) => down(e, i, `e${j}`)}
                />
              </td>
            {/if}
          {/each}
          {#if canAddColumn}<td class="new"></td>{/if}
        </tr>
      {/each}
      {#if canAddRow}
        <tr class="new">
          <th scope="row">
            <input
              type="text" class="name" id={cellId(rows.length, 'name')} aria-label="Add a {rowName.toLowerCase()}"
              placeholder="Add a {rowName.toLowerCase()}" oninput={(e) => newRow(e, 'name')}
            />
          </th>
          {#each columns as _, j}
            <td>
              <input
                type="text" class="value" inputmode="decimal" id={cellId(rows.length, `v${j}`)} aria-label="Add a {rowName.toLowerCase()}: {columnLabel(j)}"
                oninput={(e) => newRow(e, `v${j}`)}
              />
            </td>
            {#if errors}
              <td class="pm">
                <input type="text" class="value" inputmode="decimal" id={cellId(rows.length, `e${j}`)} aria-label="Add a {rowName.toLowerCase()}: ± for {columnLabel(j)}" oninput={(e) => newRow(e, `e${j}`)} />
              </td>
            {/if}
          {/each}
          {#if canAddColumn}<td class="new"></td>{/if}
        </tr>
      {/if}
    </tbody>
  </table>
</div>

<style>
  /* A spreadsheet: ruled cells, gray headings, a blue ring on the box being
     typed in. It scrolls sideways only when the columns truly don't fit (the
     table's min-width); the padding keeps the focus ring inside, so focusing a
     box never scrolls it. */
  .scroll { overflow-x: auto; overflow-y: hidden; margin: -3px; padding: 3px; }
  table { width: 100%; table-layout: fixed; border-collapse: collapse; background: #fff; font-size: 0.92rem; }
  .c-new { width: 2.4rem; }
  th, td { padding: 0; border: 1px solid var(--border); }
  thead th, tbody th { background: var(--bg); }
  .corner { padding: 0 0.55rem; font-size: 0.78rem; font-weight: 700; color: var(--muted); text-align: left; white-space: nowrap; overflow: hidden; }
  .pm { color: var(--muted); }
  thead .pm { font-size: 0.85rem; font-weight: 700; text-align: center; }
  tbody .pm { background: #fbfcfd; }
  /* Under table, to outrank the site's own text box styles. */
  table input {
    display: block; width: 100%; min-width: 0; height: 2.2rem; margin: 0; padding: 0 0.55rem;
    border: 0; border-radius: 0; background: transparent; color: var(--ink); font: inherit; box-shadow: none;
  }
  table input:focus { outline: 2px solid var(--blue); outline-offset: -2px; background: #fff; }
  table input::placeholder { color: #9aa3b2; font-weight: 400; }
  .heading { font-weight: 700; }
  .value { text-align: right; font-variant-numeric: tabular-nums; }
  table input:disabled { background: transparent; }
  th.new, td.new, tr.new > * { background: #fff; border: 1px dashed #c9cfd8; }
  tr.new input::placeholder, th.new input::placeholder { color: var(--blue-dark); opacity: 0.75; }
  th.new input { padding: 0; text-align: center; font-size: 1.1rem; }
  th.new input::placeholder { opacity: 1; }
  .hide {
    display: flex; align-items: center; justify-content: flex-end; gap: 0.25rem; width: 100%; height: 2.2rem; padding: 0 0.55rem;
    border: 0; background: #fff; color: var(--ink); font: inherit; cursor: pointer;
  }
  .hide.name { justify-content: flex-start; background: var(--bg); font-weight: 400; }
  .hide:hover { background: var(--blue-soft); }
  .hide.hidden { color: var(--muted); text-decoration: line-through; background: repeating-linear-gradient(-45deg, #fff 0 6px, var(--bg) 6px 12px); }
</style>
