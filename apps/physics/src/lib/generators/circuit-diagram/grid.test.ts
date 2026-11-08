import { describe, expect, it } from 'vitest'
import { circuitSettings } from './settings'

describe('grid workspace settings', () => {
  it('preserves placed symbols and rotation in a share link', () => {
    const settings = circuitSettings.clean({ editor: 'grid', gridParts: [
      { kind: 'cell', x: 240, y: 160, angle: 270 },
      { kind: 'wire', x: 320, y: 160, angle: 90 },
      { kind: 'voltmeter', x: 400, y: 240, angle: 180 },
    ] })
    expect(circuitSettings.fromParams(new URLSearchParams(circuitSettings.toQuery(settings)))).toEqual(settings)
  })
  it('keeps old links in quick setup and bounds untrusted placements', () => {
    expect(circuitSettings.fromParams(new URLSearchParams()).editor).toBe('quick')
    const settings = circuitSettings.clean({ gridParts: Array.from({ length: 100 }, () => ({ kind: 'unknown', x: -500, y: 9999, angle: 9999 })) })
    expect(settings.gridParts).toHaveLength(80)
    expect(settings.gridParts[0]).toEqual({ kind: 'resistor', x: 60, y: 540, angle: 359 })
  })
})

// Details and return branches must survive shared links and undo snapshots.
it('preserves component options on side and bottom parallel tiles', () => {
  const settings = circuitSettings.clean({
    editor: 'grid', sideRows: 4,
    returnTiles: [
      { side: 'left', index: 2, branch: -1, kind: 'battery' },
      { side: 'bottom', index: 1, branch: 1, kind: 'switch' },
    ],
    gridDetails: [
      { region: 'left', column: 2, branch: -1, cells: 3, flip: true, name: { mode: 'text', text: 'E' }, value: { mode: 'text', text: '12 V' } },
      { region: 'bottom', column: 1, branch: 1, open: true },
    ],
  })
  expect(circuitSettings.fromParams(new URLSearchParams(circuitSettings.toQuery(settings)))).toEqual(settings)
})

it('preserves custom SVG artwork on main, side, and bottom tiles in shared settings', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -24 60 48"><path d="M-30,0 H30" stroke="#111827"/></svg>'
  const settings = circuitSettings.clean({
    editor: 'grid',
    circuitTiles: [{ column: 1, branch: -1, kind: 'custom' }],
    returnTiles: [{ side: 'left', index: 0, branch: 0, kind: 'custom' }, { side: 'bottom', index: 1, branch: 0, kind: 'custom' }],
    gridDetails: ['main', 'left', 'bottom'].map(region => ({ region, column: region === 'left' ? 0 : 1, branch: region === 'main' ? -1 : 0, customSvg: svg })),
  })
  const restored = circuitSettings.fromParams(new URLSearchParams(circuitSettings.toQuery(settings)))
  expect(restored).toEqual(settings)
  expect(restored.gridDetails.every(d => d.customSvg === svg)).toBe(true)
})

it('bounds SVG settings and keeps old component details compatible', () => {
  const settings = circuitSettings.clean({ gridDetails: [ { region: 'main', column: 0 }, { customSvg: '<svg>'.repeat(14000) }, { customSvg: 42 } ] })
  expect(settings.gridDetails.map(d => d.customSvg)).toEqual(['', '', ''])
})

it('preserves built-in diodes on main, side, and bottom tiles', () => {
  const settings = circuitSettings.clean({
    editor: 'grid',
    circuitTiles: [{ column: 0, branch: 0, kind: 'diode' }],
    returnTiles: [{ side: 'right', index: 0, branch: 0, kind: 'diode' }, { side: 'bottom', index: 1, branch: 0, kind: 'diode' }],
  })
  expect(settings.circuitTiles[0].kind).toBe('diode')
  expect(settings.returnTiles.every(tile => tile.kind === 'diode')).toBe(true)
  expect(circuitSettings.fromParams(new URLSearchParams(circuitSettings.toQuery(settings)))).toEqual(settings)
})
