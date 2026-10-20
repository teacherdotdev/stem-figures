// The figure drawn as the server draws it, where no uploaded picture is ever
// available. (In the browser, scripts/test-food-web-uploads.mjs.)

import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import FoodWebFigure from './FoodWebFigure.svelte'
import { blackAndWhite, drawings, loadDrawings } from './pictures.svelte'
import { foodWebSettings } from './settings'

const settingsOf = (query: string) => foodWebSettings.fromParams(new URLSearchParams(query))
const draw = (query: string) => render(FoodWebFigure, { props: { settings: settingsOf(query) } }).body

describe('the figure, drawn on the server', () => {
  it('draws an uploaded picture it doesn’t have as a dashed box with the name, and no error', () => {
    const body = draw('web=grass;hare.u-0123456789ab:Snowshoe hare=grass')
    expect(body).toContain('Snowshoe hare')
    expect(body).toMatch(/<rect[^>]*stroke-dasharray="6 5"/)
    expect(body).not.toContain('<image')
    // In a chain and a pyramid's pictures too.
    expect(draw('figure=chain&web=grass;hare.u-0123456789ab=grass')).toMatch(/<rect[^>]*stroke-dasharray="6 5"/)
    expect(draw('figure=pyramid&pictures=1&levels=3&web=grass;hare.u-0123456789ab=grass;fox=hare')).toMatch(/<rect[^>]*stroke-dasharray="6 5"/)
  })

  it('draws a bundled picture from its file once it is loaded', async () => {
    await loadDrawings(['grass', 'rabbit'])
    const body = draw('web=grass;rabbit=grass')
    expect(body.match(/viewBox="0 0 128 128"/g)).toHaveLength(2)
    expect(body).toContain(drawings.get('grass')!.slice(0, 40))
  })

  it('draws an energy pyramid’s values, blanks and units', () => {
    const body = draw('figure=pyramid&values=base&unit=kJ&perArea=1&heat=blank')
    expect(body).toContain('10,000 kJ/m²/yr')
    expect(body).not.toContain('1,000 kJ')
    // Three blank values, each a line before its unit, and four blank heat labels.
    expect(body.match(/>kJ\/m²\/yr</g)).toHaveLength(3)
    expect(body.match(/<line /g)!.length).toBeGreaterThanOrEqual(3 + 4 + 4)
    expect(body.match(/<polygon /g)).toHaveLength(4)
  })

  it('takes colored fills out in black and white, keeping the lines', () => {
    expect(blackAndWhite('<path fill="#c0392b" stroke="#111" d="M0 0"/><path fill="none" d="M1 1"/><circle fill="#111"/>')).toBe(
      '<path fill="#fff" stroke="#111" d="M0 0"/><path fill="none" d="M1 1"/><circle fill="#111"/>',
    )
  })
})
