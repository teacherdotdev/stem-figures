<script lang="ts">
  import { compactAxis, mapWirePath } from './compactLayout'
  import { labelWidth } from './layout'
  import { tileViewport, type Bounds } from './tileViewport'
  import { insertSeriesTile, branchEnds } from './tileSeries'
  import type { TileSelection } from './tileSelection'
  import FigureLabel from '$lib/shared/FigureLabel.svelte'
  import { tick } from 'svelte'
  import PartSymbol from './PartSymbol.svelte'
  import { newPart } from './tree'
  import type { CircuitSettings } from './settings'
  type Tile = CircuitSettings['circuitTiles'][number]
  type Kind = Tile['kind']
  type ReturnTile = CircuitSettings['returnTiles'][number]
  let { compact = false, selection = $bindable(null), sideRows = $bindable(), details = $bindable(), tiles = $bindable(), returnTiles = $bindable(), columns = $bindable(), symbols, color }: { compact: boolean; selection: TileSelection | null; sideRows: number; details: CircuitSettings['gridDetails']; tiles: Tile[]; returnTiles: ReturnTile[]; columns: number; symbols: 'us' | 'iec'; color: boolean } = $props()
  const names: Record<Kind, string> = { wire: 'Wire', resistor: 'Resistor', bulb: 'Bulb', led: 'LED', diode: 'Diode', battery: 'Battery', cell: 'Cell', switch: 'Switch', ammeter: 'Ammeter', voltmeter: 'Voltmeter', custom: 'Custom SVG' }
  let board: HTMLDivElement
  let selected = $state<{ column: number; branch: number } | null>(null)
  const ink = $derived(color ? '#1d4ed8' : '#111827')
  $effect(() => { if (selected) selection = { region: 'main', ...selected } })
  const detailAt = (region: TileSelection['region'], column: number, branch: number) => details.find(d => d.region === region && d.column === column && d.branch === branch)
  const low = $derived(Math.min(0, ...tiles.map(t => t.branch)))
  const high = $derived(Math.max(0, ...tiles.map(t => t.branch)))
  const sideCount = $derived(Math.max(sideRows, high + 2))
  const width = $derived(Math.max((columns + 2 + Math.max(0, ...returnTiles.filter(t => t.side !== 'bottom').map(t => Math.abs(t.branch))) * 2) * 100, (sideCount - low + 3 + Math.max(0, ...returnTiles.filter(t => t.side === 'bottom').map(t => Math.abs(t.branch))) * 2) * 140))
  const height = $derived(width / 1.4)
  const originX = $derived((width - columns * 100) / 2)
  const originY = $derived((height - (sideCount - low) * 100) / 2 - low * 100 + 50)
  const branches = (column: number) => tiles.filter(t => t.column === column).map(t => t.branch)
  const cells = $derived(Array.from({ length: columns }, (_, column) =>
    [...new Set([0, ...branches(column)])].map(branch => ({
      x: originX + column * 100,
      y: originY + branch * 100 - 50,
    }))).flat())
  function cellColumn(x: number) { return Math.floor((x + 50 - originX) / 100) }
  function cellBranch(y: number) { return Math.round((y + 50 - originY) / 100) }
  const kindAt = (column: number, branch: number): Kind => tiles.find(t => t.column === column && t.branch === branch)?.kind ?? 'wire'
  const half = (kind: Kind, cells = 2) => ({ resistor: symbols === 'us' ? 22 : 20, bulb: 15, led: 30, diode: 30, battery: cells * 10 - 5, cell: 5, switch: 17, ammeter: 15, voltmeter: 15, custom: 30, wire: 0 })[kind]
  function place(column: number, branch: number, kind: Kind) {
    if (branch < -32 || branch > 32) return
    if (column < 0 || column >= columns) {
      const extra = column < 0 ? -column : column - columns + 1
      if (columns + extra > 32) return
      if (column < 0) {
        for (const tile of tiles) tile.column += extra
        column = 0
      }
      columns += extra
    }
    selection = { region: 'main', column, branch }
    selected = { column, branch }
    const existing = tiles.find(t => t.column === column && t.branch === branch)
    if (existing) existing.kind = kind
    else if (tiles.length < 1024) tiles.push({ column, branch, kind })
  }
  function drop(e: DragEvent, column: number, branch: number) {
    e.preventDefault()
    const kind = e.dataTransfer?.getData('application/x-circuit-symbol')
    if (kind && Object.hasOwn(names, kind)) place(column, branch, kind as Kind)
  }
  function insert(column: number, branch = 0) {
    if (columns >= 32) return
    const crossing = returnTiles.filter(t => t.side === 'bottom' && t.index === column && t.branch !== 0 && returnTiles.some(n => n.side === t.side && n.branch === t.branch && n.index === column + 1)).map(t => t.branch)
    tiles = insertSeriesTile(tiles, column, branch)
    for (const tile of returnTiles) if (tile.side === 'bottom' && tile.index > column) tile.index++
    for (const d of details) if ((d.region === 'main' || d.region === 'bottom') && d.column > column) d.column++
    for (const b of crossing) returnTiles.push({ side: 'bottom', index: column + 1, branch: b, kind: 'wire' })
    columns++
  }
  function remove(column: number) {
    if (columns <= 1 || column < 0 || column >= columns) return
    tiles = tiles.filter(t => t.column !== column).map(t => ({ ...t, column: t.column > column ? t.column - 1 : t.column }))
    returnTiles = returnTiles.filter(t => t.side !== 'bottom' || t.index !== column).map(t => ({ ...t, index: t.side === 'bottom' && t.index > column ? t.index - 1 : t.index }))
    details = details.filter(d => !((d.region === 'main' || d.region === 'bottom') && d.column === column)).map(d => ({ ...d, column: (d.region === 'main' || d.region === 'bottom') && d.column > column ? d.column - 1 : d.column }))
    columns--
  }
  function removeBranch(column: number, branch: number) {
    tiles = tiles.filter(t => !(t.column === column && t.branch === branch))
    details = details.filter(d => !(d.region === 'main' && d.column === column && d.branch === branch))
  }
  const kinds = Object.keys(names) as Kind[]
  function cycle(column: number, branch: number, direction = 1) {
    const index = kinds.indexOf(kindAt(column, branch))
    place(column, branch, kinds[(index + direction + kinds.length) % kinds.length])
  }
  async function focusTile(column: number, branch: number) {
    await tick()
    board.querySelector<HTMLButtonElement>(`[data-column="${column}"][data-branch="${branch}"]`)?.focus()
  }
  function addAround(column: number, branch: number, direction: string) {
    if (direction === 'h' || direction === 'l') {
      if (column < 0 || column >= columns) { place(column, branch, 'wire'); return }
      const before = direction === 'h'
      if (columns >= 32) return
      insert(before ? column - 1 : column, branch)
      selected = { column: before ? column : column + 1, branch }
    } else {
      const step = direction === 'j' ? -1 : 1
      const next = branch + step
      if (Math.abs(next) > 31 || tiles.some(t => t.column === column && Math.abs(t.branch) >= 31)) return
      for (const tile of tiles) {
        if (tile.column === column && (step > 0 ? tile.branch >= next : tile.branch <= next)) tile.branch += step
      }
      for (const d of details) if (d.region === 'main' && d.column === column && (step > 0 ? d.branch >= next : d.branch <= next)) d.branch += step
      place(column, next, 'wire')
    }
    if (selected) void focusTile(selected.column, selected.branch)
  }
  function keys(e: KeyboardEvent, column: number, branch: number) {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const key = e.key.toLowerCase()
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') cycle(column, branch, e.key === 'ArrowLeft' ? -1 : 1)
    else if ('hjkl'.includes(key) && key.length === 1) {
      if (e.shiftKey) addAround(column, branch, key)
      else navigate(e)
    } else if (key === 'x' && e.shiftKey) {
      if (branch === 0) remove(column)
      else removeBranch(column, branch)
    } else if (key === 'x' || e.key === 'Delete' || e.key === 'Backspace') place(column, branch, 'wire')
    else return
    e.preventDefault()
    e.stopPropagation()
  }
  const perimeter = $derived([
    ...Array.from({ length: columns }, (_, index) => ({ side: 'bottom' as const, index, branch: 0 })),
    ...(['left', 'right'] as const).flatMap(side => Array.from({ length: sideCount }, (_, index) => ({ side, index, branch: 0 }))),
    ...returnTiles.filter(t => t.branch !== 0).map(t => ({ side: t.side, index: t.index, branch: t.branch })),
  ].map(t => ({ ...t,
    x: t.side === 'bottom' ? originX + t.index * 100 + 50 : (t.side === 'left' ? originX - 50 : originX + columns * 100 + 50) + t.branch * 100,
    y: t.side === 'bottom' ? originY + (sideCount + t.branch) * 100 : originY + t.index * 100 + 50,
    angle: t.side === 'bottom' ? 0 : 90,
  })))
  const returnKind = (side: ReturnTile['side'], index: number, branch = 0): Kind => returnTiles.find(t => t.side === side && t.index === index && t.branch === branch)?.kind ?? 'wire'
  function selectReturn(side: ReturnTile['side'], index: number, branch = 0) {
    selected = null
    selection = { region: side, column: index, branch }
  }
  function placeReturn(side: ReturnTile['side'], index: number, kind: Kind, branch = 0) {
    selectReturn(side, index, branch)
    const tile = returnTiles.find(t => t.side === side && t.index === index && t.branch === branch)
    if (tile) tile.kind = kind
    else returnTiles.push({ side, index, branch, kind })
  }
  async function focusReturn(side: ReturnTile['side'], index: number, branch = 0) {
    await tick()
    board.querySelector<HTMLButtonElement>(`[data-side="${side}"][data-index="${index}"][data-return-branch="${branch}"]`)?.focus()
  }
  function navigate(e: KeyboardEvent) {
    const target = e.currentTarget as HTMLElement
    const r = target.getBoundingClientRect()
    const key = e.key.toLowerCase()
    const dx = key === 'h' ? -1 : key === 'l' ? 1 : 0, dy = key === 'j' ? -1 : key === 'k' ? 1 : 0
    const choices = [...board.querySelectorAll<HTMLButtonElement>('.target')].filter(t => t !== target).map(t => {
      const q = t.getBoundingClientRect(), x = q.x + q.width / 2 - r.x - r.width / 2, y = q.y + q.height / 2 - r.y - r.height / 2
      return { t, forward: x * dx + y * dy, across: Math.abs(x * dy - y * dx) }
    }).filter(q => q.forward > 1).sort((a, b) => (a.forward + a.across * 4) - (b.forward + b.across * 4))
    choices[0]?.t.focus()
  }
  function cycleReturn(side: ReturnTile['side'], index: number, direction = 1, branch = 0) {
    const current = kinds.indexOf(returnKind(side, index, branch))
    placeReturn(side, index, kinds[(current + direction + kinds.length) % kinds.length], branch)
  }
  function returnKeys(e: KeyboardEvent, side: ReturnTile['side'], index: number, branch = 0) {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const key = e.key.toLowerCase()
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') cycleReturn(side, index, e.key === 'ArrowLeft' ? -1 : 1, branch)
    else if ('hjkl'.includes(key) && key.length === 1) {
      if (!e.shiftKey) navigate(e)
      else {
        const series = side === 'bottom' ? key === 'h' || key === 'l' : key === 'j' || key === 'k'
        if (series) {
          const before = key === 'h' || key === 'j', at = index + (before ? 0 : 1)
          if (side === 'bottom') {
            if (columns >= 32) return
            insert(at - 1)
          } else {
            if (sideCount >= 32) return
            const crossing = returnTiles.filter(t => t.side !== 'bottom' && t.branch !== 0 && t.index === at - 1 && returnTiles.some(n => n.side === t.side && n.branch === t.branch && n.index === at)).map(t => ({ side: t.side, branch: t.branch }))
            for (const tile of returnTiles) if (tile.side !== 'bottom' && tile.index >= at) tile.index++
            for (const run of crossing) returnTiles.push({ ...run, index: at, kind: 'wire' })
            for (const d of details) if ((d.region === 'left' || d.region === 'right') && d.column >= at) d.column++
            sideRows = sideCount + 1
          }
          if (!returnTiles.some(t => t.side === side && t.index === at && t.branch === branch)) placeReturn(side, at, 'wire', branch)
          else selectReturn(side, at, branch)
          void focusReturn(side, at, branch)
        } else {
          const next = branch + (key === 'h' || key === 'j' ? -1 : 1)
          if (Math.abs(next) > 4) return
          const step = next > branch ? 1 : -1
          if (returnTiles.some(t => t.side === side && Math.abs(t.branch) >= 15)) return
          for (const t of returnTiles) if (t.side === side && t.index === index && (step > 0 ? t.branch >= next : t.branch <= next)) t.branch += step
          for (const d of details) if (d.region === side && d.column === index && (step > 0 ? d.branch >= next : d.branch <= next)) d.branch += step
          placeReturn(side, index, 'wire', next)
          void focusReturn(side, index, next)
        }
      }
    } else if (key === 'x' && e.shiftKey) {
      if (branch !== 0) {
        returnTiles = returnTiles.filter(t => !(t.side === side && t.index === index && t.branch === branch))
        details = details.filter(d => !(d.region === side && d.column === index && d.branch === branch))
      }
      else if (side === 'bottom') remove(index)
      else if (sideCount > 2) {
        returnTiles = returnTiles.filter(t => t.side === 'bottom' || t.index !== index).map(t => ({ ...t, index: t.side !== 'bottom' && t.index > index ? t.index - 1 : t.index }))
        details = details.filter(d => !((d.region === 'left' || d.region === 'right') && d.column === index)).map(d => ({ ...d, column: (d.region === 'left' || d.region === 'right') && d.column > index ? d.column - 1 : d.column }))
        sideRows = sideCount - 1
      } else placeReturn(side, index, 'wire')
      selection = null
    } else if (key === 'x' || e.key === 'Delete' || e.key === 'Backspace') placeReturn(side, index, 'wire', branch)
    else return
    e.preventDefault()
    e.stopPropagation()
  }
  const symbolSpaces = $derived([
    ...tiles.filter(t => t.kind !== 'wire').map(t => ({ x: originX + t.column * 100 + 50, y: originY + t.branch * 100, vertical: false, info: detailAt('main', t.column, t.branch) })),
    ...perimeter.filter(t => returnKind(t.side, t.index, t.branch) !== 'wire').map(t => ({ ...t, vertical: t.angle === 90, info: detailAt(t.side, t.index, t.branch) })),
  ])
  const allBounds = $derived([
    ...cells.map(cell => ({ ...cell, width: 100, height: 100 })),
    ...perimeter.map(tile => ({ x: tile.x - 50, y: tile.y - 50, width: 100, height: 100 })),
  ])
  const worldBounds = $derived(tileViewport(allBounds, 0))
  const mapX = $derived(compact ? compactAxis(originX, worldBounds.x, worldBounds.x + worldBounds.width, symbolSpaces.flatMap(t => {
    const size = Math.max(t.vertical ? 64 : 76, t.info ? Math.max(labelWidth(t.info.name), labelWidth(t.info.value)) + (t.vertical ? 60 : 20) : 0) / 2
    return [{ start: t.x - 50, end: t.x, size }, { start: t.x, end: t.x + 50, size }]
  })) : (n: number) => n)
  const mapY = $derived(compact ? compactAxis(originY, worldBounds.y, worldBounds.y + worldBounds.height, symbolSpaces.flatMap(t => {
    const size = (t.vertical ? 76 : t.info && (t.info.name.mode !== 'none' || t.info.value.mode !== 'none') ? 84 : 56) / 2
    return [{ start: t.y - 50, end: t.y, size }, { start: t.y, end: t.y + 50, size }]
  })) : (n: number) => n)
  const wirePath = (path: string) => mapWirePath(path, mapX, mapY)
  const mappedBounds = $derived(allBounds.map(b => ({ x: mapX(b.x), y: mapY(b.y), width: mapX(b.x + b.width) - mapX(b.x), height: mapY(b.y + b.height) - mapY(b.y) })))
  let drawing = $state<SVGGElement>()
  let measured = $state<Bounds | null>(null)
  const viewport = $derived(tileViewport([
    ...mappedBounds,
    ...(measured ? [measured] : []),
  ]))
  $effect(() => {
    // Labels can extend beyond their tiles. Measure actual SVG content after rendering.
    JSON.stringify({ tiles, returnTiles, details, columns, sideRows, symbols, compact })
    const group = drawing
    let cancelled = false
    void tick().then(() => {
      if (!group || cancelled || !group.isConnected) return
      const box = group.getBBox()
      measured = { x: box.x, y: box.y, width: box.width, height: box.height }
    })
    return () => { cancelled = true }
  })
  function loopPath() {
    const left = originX - 50, right = originX + columns * 100 + 50
    const bottom = originY + sideCount * 100, r = 1.5
    return `M${originX} ${originY} H${left + r} Q${left} ${originY} ${left} ${originY + r} V${bottom - r} Q${left} ${bottom} ${left + r} ${bottom} H${right - r} Q${right} ${bottom} ${right} ${bottom - r} V${originY + r} Q${right} ${originY} ${right - r} ${originY} H${originX + columns * 100}`
  }
</script>

<div class="workspace">
  <div class="keyboard-guide no-print" aria-label="Tile editing controls">
    <p>Click a tile to select it, then edit its component in the sidebar.</p>
    <ul>
      <li><span class="keys"><kbd>←</kbd><kbd>→</kbd></span><span>Cycle components</span></li>
      <li><span class="keys"><kbd>h</kbd><kbd>j</kbd><kbd>k</kbd><kbd>l</kbd></span><span>Move selection</span></li>
      <li><span class="keys"><kbd>Shift</kbd><span>+</span><kbd>j</kbd><span>/</span><kbd>k</kbd></span><span>Add above / below</span></li>
      <li><span class="keys"><kbd>Shift</kbd><span>+</span><kbd>h</kbd><span>/</span><kbd>l</kbd></span><span>Add left / right</span></li>
      <li><span class="keys"><kbd>x</kbd></span><span>Clear component</span></li>
      <li><span class="keys"><kbd>Shift</kbd><span>+</span><kbd>x</kbd></span><span>Remove tile</span></li>
    </ul>
  </div>
  <div class="space" style:--ratio="{viewport.width} / {viewport.height}" style:--fit="{viewport.width / viewport.height * 100}cqh">
    <div class="board" bind:this={board}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewport.x} {viewport.y} {viewport.width} {viewport.height}" width={viewport.width} height={viewport.height} role="img" aria-label="Connected circuit loop with {columns} columns">
        <rect x={viewport.x} y={viewport.y} width={viewport.width} height={viewport.height} fill="white" />
        <g bind:this={drawing}>
        <path d={wirePath(loopPath())} fill="none" stroke="#111827" stroke-width="2.2" stroke-linejoin="round" />
        {#each Array.from({ length: columns }, (_, c) => c) as c}
          {#each [...new Set([0, ...branches(c)])] as b}
            {@const kind = kindAt(c, b)}
            {@const info = detailAt('main', c, b)}
            {@const x = originX + 50 + c * 100}
            {@const y = originY + b * 100}
            {@const ends = branchEnds(tiles, c, b)}
            {#if ends.left}
              <path d={wirePath(`M${x - 50} ${originY} V${y - Math.sign(b) * 1.5} Q${x - 50} ${y} ${x - 48.5} ${y}`)} fill="none" stroke="#111827" stroke-width="2.2" />
              <circle cx={mapX(x - 50)} cy={mapY(originY)} r="3" fill="#111827" />
            {/if}
            {#if ends.right}
              <path d={wirePath(`M${x + 50} ${originY} V${y - Math.sign(b) * 1.5} Q${x + 50} ${y} ${x + 48.5} ${y}`)} fill="none" stroke="#111827" stroke-width="2.2" />
              <circle cx={mapX(x + 50)} cy={mapY(originY)} r="3" fill="#111827" />
            {/if}
            {#key kind}
              <g transform="translate({mapX(x)} {mapY(y)})">
                {#if kind === 'wire'}
                  <path d="M{mapX(x - (ends.left ? 48.5 : 50)) - mapX(x)} 0 H{mapX(x + (ends.right ? 48.5 : 50)) - mapX(x)}" fill="none" stroke="#111827" stroke-width="2.2" />
                {:else}
                  <path d="M{mapX(x - (ends.left ? 48.5 : 50)) - mapX(x)} 0 H{-half(kind, info?.cells)} M{half(kind, info?.cells)} 0 H{mapX(x + (ends.right ? 48.5 : 50)) - mapX(x)}" fill="none" stroke="#111827" stroke-width="2.2" />
                  {#if kind === 'custom'}
                    {#if info?.customSvg}<image href={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(info.customSvg)} x="-30" y="-24" width="60" height="48" />{:else}<path d="M-30 0 H-20 M20 0 H30" stroke={ink} stroke-width="2.2" /><rect x="-20" y="-15" width="40" height="30" fill="white" stroke={ink} stroke-width="2.2" stroke-dasharray="3 3" />{/if}
                  {:else if kind === 'voltmeter'}
                    <circle r="15" fill="white" stroke={ink} stroke-width="2.2" />
                  {:else}
                    {@const part = newPart(kind === 'cell' ? 'battery' : kind)}
                    <PartSymbol part={{ ...part, cells: kind === 'battery' ? info?.cells ?? 2 : 1, open: info?.open ?? false, flip: info?.flip ?? false }} style={symbols} {ink} />
                  {/if}
                  {#if kind === 'ammeter' || kind === 'voltmeter'}<text y="6" text-anchor="middle" font-family="serif" font-size="18" fill={ink}>{kind === 'ammeter' ? 'A' : 'V'}</text>{/if}
                {/if}
              </g>
            {/key}
            {#if info && kind !== 'wire'}<FigureLabel label={info.name} x={mapX(x)} y={mapY(y) - 28} size={14} /><FigureLabel label={info.value} x={mapX(x)} y={mapY(y) + 30} size={14} />{/if}
          {/each}
        {/each}
        {#each perimeter as tile}
          {@const kind = returnKind(tile.side, tile.index, tile.branch)}
          {@const info = detailAt(tile.side, tile.index, tile.branch)}
          {#if tile.branch !== 0}
            {@const baseX = tile.side === 'bottom' ? tile.x : tile.x - tile.branch * 100}
            {@const baseY = tile.side === 'bottom' ? tile.y - tile.branch * 100 : tile.y}
            {@const start = !returnTiles.some(t => t.side === tile.side && t.branch === tile.branch && t.index === tile.index - 1)}
            {@const end = !returnTiles.some(t => t.side === tile.side && t.branch === tile.branch && t.index === tile.index + 1)}
            <path d={wirePath(tile.side === 'bottom'
              ? `${start ? `M${baseX - 50} ${baseY} V${tile.y}` : `M${tile.x - 50} ${tile.y}`} H${tile.x + 50} ${end ? `V${baseY}` : ''}`
              : `${start ? `M${baseX} ${baseY - 50} H${tile.x}` : `M${tile.x} ${tile.y - 50}`} V${tile.y + 50} ${end ? `H${baseX}` : ''}`)} fill="none" stroke="#111827" stroke-width="2.2" />
          {/if}
          {#key kind}
          {#if kind !== 'wire'}
            <g transform="translate({mapX(tile.x)} {mapY(tile.y)}) rotate({tile.angle})">
              <rect x={-half(kind, info?.cells)} y="-25" width={half(kind, info?.cells) * 2} height="50" fill="white" />
              {#if kind === 'custom'}
                {#if info?.customSvg}<image href={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(info.customSvg)} x="-30" y="-24" width="60" height="48" />{:else}<path d="M-30 0 H-20 M20 0 H30" stroke={ink} stroke-width="2.2" /><rect x="-20" y="-15" width="40" height="30" fill="white" stroke={ink} stroke-width="2.2" stroke-dasharray="3 3" />{/if}
              {:else if kind === 'voltmeter'}
                <circle r="15" fill="white" stroke={ink} stroke-width="2.2" />
              {:else}
                {@const part = newPart(kind === 'cell' ? 'battery' : kind)}
                <PartSymbol part={{ ...part, cells: kind === 'battery' ? info?.cells ?? 2 : 1, open: info?.open ?? false, flip: info?.flip ?? false }} style={symbols} {ink} />
              {/if}
            </g>
            {#if kind === 'ammeter' || kind === 'voltmeter'}
              <text x={mapX(tile.x)} y={mapY(tile.y) + 6} text-anchor="middle" font-family="serif" font-size="18" fill={ink}>{kind === 'ammeter' ? 'A' : 'V'}</text>
            {/if}
          {/if}
          {/key}
          {#if info && kind !== 'wire'}<FigureLabel label={info.name} x={mapX(tile.x) + (tile.angle ? 28 : 0)} y={mapY(tile.y) - (tile.angle ? 12 : 28)} size={14} /><FigureLabel label={info.value} x={mapX(tile.x) + (tile.angle ? 28 : 0)} y={mapY(tile.y) + 30} size={14} />{/if}
        {/each}
        </g>
      </svg>
      {#each perimeter as tile}
        <div class="tile no-print" class:selected={selection?.region === tile.side && selection?.column === tile.index && selection?.branch === tile.branch} style:left="{(mapX(tile.x - 50) - viewport.x) / viewport.width * 100}%" style:top="{(mapY(tile.y - 50) - viewport.y) / viewport.height * 100}%" style:width="{(mapX(tile.x + 50) - mapX(tile.x - 50)) / viewport.width * 100}%" style:height="{(mapY(tile.y + 50) - mapY(tile.y - 50)) / viewport.height * 100}%">
          <button class="target" data-side={tile.side} data-index={tile.index} data-return-branch={tile.branch} onfocus={() => selectReturn(tile.side, tile.index, tile.branch)} aria-label="{tile.side} wire tile {tile.index + 1}, {names[returnKind(tile.side, tile.index, tile.branch)]}. Click to select." onclick={() => selectReturn(tile.side, tile.index, tile.branch)} onkeydown={e => returnKeys(e, tile.side, tile.index, tile.branch)} ondragover={e => e.preventDefault()} ondrop={e => {
            e.preventDefault()
            const kind = e.dataTransfer?.getData('application/x-circuit-symbol')
            if (kind && Object.hasOwn(names, kind)) placeReturn(tile.side, tile.index, kind as Kind, tile.branch)
          }}></button>
        </div>
      {/each}
      {#each cells as cell}
        {@const c = cellColumn(cell.x)}
        {@const b = cellBranch(cell.y)}
        {#if cell.x < width && cell.y < height && cell.x + 100 > 0 && cell.y + 100 > 0}
          <div class="tile no-print" class:selected={selected?.column === c && selected?.branch === b} style:left="{(mapX(originX + c * 100) - viewport.x) / viewport.width * 100}%" style:top="{(mapY(originY + b * 100 - 50) - viewport.y) / viewport.height * 100}%" style:width="{(mapX(cell.x + 100) - mapX(cell.x)) / viewport.width * 100}%" style:height="{(mapY(cell.y + 100) - mapY(cell.y)) / viewport.height * 100}%">
            <button class="target" data-column={c} data-branch={b} aria-label="{names[kindAt(c, b)]}, column {c + 1}, row {b + 1}. Click to select." onfocus={() => selected = { column: c, branch: b }} onkeydown={e => keys(e, c, b)} onclick={() => selected = { column: c, branch: b }} ondragover={e => e.preventDefault()} ondrop={e => drop(e, c, b)}></button>

          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>

<style>
  .workspace { display: flex; flex-direction: column; width: 100%; min-width: 0; min-height: 0; }
  .keyboard-guide { flex-shrink: 0; margin-bottom: .85rem; color: var(--muted); font-size: .8rem; }
  .keyboard-guide p { margin: 0 0 .65rem; font-size: .85rem; }
  .keyboard-guide ul { display: flex; flex-wrap: wrap; gap: .65rem 1.2rem; list-style: none; padding: 0; margin: 0; }
  .keyboard-guide li { display: flex; align-items: center; gap: .5rem; }
  .keys { display: inline-flex; align-items: center; gap: .2rem; white-space: nowrap; }
  kbd { display: inline-flex; justify-content: center; align-items: center; min-width: 1.5rem; height: 1.5rem; padding: 0 .3rem; border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 5px; background: var(--bg, #f8fafc); color: var(--ink); font-family: inherit; font-size: .75rem; font-weight: 600; line-height: 1; }
  .space { position: relative; container-type: size; aspect-ratio: var(--ratio); width: 100%; }
  .board { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(100cqw, var(--fit)); aspect-ratio: var(--ratio); overflow: hidden; container-type: size; }
  .board svg { display: block; width: 100%; height: 100%; }
  .tile { position: absolute; box-sizing: border-box; border: 1px dashed transparent; background-image: linear-gradient(to right, #d1d5db 45%, transparent 45%), linear-gradient(to right, #d1d5db 45%, transparent 45%), linear-gradient(to bottom, #d1d5db 45%, transparent 45%), linear-gradient(to bottom, #d1d5db 45%, transparent 45%); background-size: 8px 1px, 8px 1px, 1px 8px, 1px 8px; background-repeat: repeat-x, repeat-x, repeat-y, repeat-y; background-position: top left, bottom left, top left, top right; }

  .target { position: absolute; inset: 0; width: 100%; background: transparent; border: 0; border-radius: 6px; }
  .tile.selected { box-shadow: inset 0 0 0 1px #2563eb55; }
  .target:hover, .target:focus-visible { background: #2563eb0a; outline: 2px solid var(--blue); }
  @media (min-width: 861px) and (min-height: 560px) { .space { flex: 1; min-height: 0; aspect-ratio: auto; } }
  @media print { .space { flex: none; aspect-ratio: var(--ratio); } }
</style>
