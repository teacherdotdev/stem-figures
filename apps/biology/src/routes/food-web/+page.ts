// Loads the pictures the page's first figure draws before it is drawn, on
// the server too, so the figure arrives with them (the rest load as the
// teacher adds organisms).
import { foodWebSettings, webOf } from '$lib/generators/food-web/settings'
import { loadDrawings, picturesIn } from '$lib/generators/food-web/pictures.svelte'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
  await loadDrawings(picturesIn(webOf(foodWebSettings.fromParams(url.searchParams))))
}
