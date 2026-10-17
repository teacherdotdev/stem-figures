// The bundled organism pictures (organisms/<id>.svg, a 128 × 128 viewBox,
// any colors and strokes), loaded only when a figure shows them. The page's
// load function loads the ones its first figure needs before it is drawn,
// on the server too, so the first figure arrives with its pictures.

import { SvelteMap } from 'svelte/reactivity'
import { ORGANISM_BY_ID } from './organisms/manifest'
import type { Web } from './web'

const FILES = import.meta.glob('./organisms/*.svg', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>

/** Each loaded picture's drawing (the SVG's contents), by organism id. */
export const drawings = new SvelteMap<string, string>()

/** A picture file's contents, inside its <svg> element. */
export const contentsOf = (svg: string) => svg.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim()

export async function loadDrawings(ids: Iterable<string>) {
  const wanted = [...new Set(ids)].filter((id) => ORGANISM_BY_ID.has(id) && !drawings.has(id))
  await Promise.all(
    wanted.map(async (id) => {
      const file = FILES[`./organisms/${id}.svg`]
      if (file) drawings.set(id, contentsOf(await file()))
    }),
  )
}

/** The bundled pictures a web draws. */
export const picturesIn = (web: Web) => web.map((e) => e.picture).filter((p) => ORGANISM_BY_ID.has(p))

/** A picture as drawn in black and white: every colored fill taken out,
 *  leaving the lines on white. Provisional until the pictures' style is
 *  settled; it is the one place that decides. */
export function blackAndWhite(drawing: string) {
  const keep = /^(none|#000|#000000|#111|#111111|#222|#2f2f2f|black|#fff|#ffffff|white|transparent|url\(.*\))$/i
  return drawing.replace(/fill="([^"]*)"/g, (all, color: string) => (keep.test(color.trim()) ? all : 'fill="#fff"'))
}
