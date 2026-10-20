// Every generator on every STEM Figures site. Each generator lives on one
// site (`site`), which is its only address; `alsoOn` lists the sites whose
// directories show it too, after their own generators. Searching any site's
// directory finds generators from every site.
//
// The one exception is a generator copied onto several sites so each has it
// at its own address (Length Reading, on Math, Physics and Chemistry): it has
// an entry on each, with the same id. See docs/adr/0001-a-generator-on-two-sites.md.
//
// An editor (`kind: 'editor'`) is listed like a generator, but the teacher
// draws its figure by hand, so there are no settings in its address.
//
// A generator turned off (`off: true`) keeps its entry and its code, but is
// left out of CATALOG, so no directory, search, sitemap or docs page lists
// it and its page is a 404. Delete the flag to turn it back on.
//
// Adding a generator means adding its entry to its site's file here, its
// preview to that app's src/lib/generators/index.ts, and a preview snapshot
// (see previews.ts).

import { BIOLOGY } from './biology'
import { CHEMISTRY } from './chemistry'
import { MATH } from './math'
import { PHYSICS } from './physics'

export const SITES = {
  math: { name: 'Math Figures', url: 'https://mathfigures.com' },
  physics: { name: 'Physics Figures', url: 'https://physicsfigures.com' },
  chemistry: { name: 'Chemistry Figures', url: 'https://chemistryfigures.com' },
  biology: { name: 'Biology Figures', url: 'https://biologyfigures.com' },
  engineering: { name: 'Engineering Figures', url: 'https://engineeringfigures.com' },
}

export type SiteId = keyof typeof SITES

export const SITE_IDS = Object.keys(SITES) as SiteId[]

export interface CatalogEntry {
  /** unique on its site; a generator copied onto several sites has the same id on each */
  id: string
  /** the site it lives on */
  site: SiteId
  /** other sites whose directories list it, after their own generators */
  alsoOn?: SiteId[]
  /** display name, as its own site writes it (Math and Physics include "Generator") */
  name: string
  /** its address on its own site */
  path: string
  /** one line for the directory card */
  blurb: string
  /** the page's search engine description */
  description: string
  /** words teachers might search for instead of the name */
  keywords: string[]
  /** 'editor' for a figure drawn by hand rather than generated from
   *  settings: its address carries no settings, so it has no link parameters */
  kind?: 'editor'
  /** turned off for now: kept in the code, but listed nowhere and a 404 */
  off?: true
}

export const CATALOG: CatalogEntry[] = [...MATH, ...PHYSICS, ...CHEMISTRY, ...BIOLOGY].filter((g) => !g.off)

/** The generators living on `site`, each with its preview component from
 *  `previews` (keyed by id). A generator without one fails the build. */
export function generatorsOn<P>(site: SiteId, previews: Record<string, P>) {
  return CATALOG.filter((g) => g.site === site).map((g) => {
    const Preview = previews[g.id]
    if (!Preview) throw new Error(`No preview for the ${g.id} generator`)
    return { ...g, Preview }
  })
}

/** A generator's link from a page on `here`: its path on its own site, or
 *  its full address on another. */
export const hrefFrom = (here: SiteId, g: CatalogEntry) => (g.site === here ? g.path : SITES[g.site].url + g.path)

const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

/** Whether a generator matches a search. Every word typed must start some
 *  word in its name, blurb or keywords, so "grad cyl" finds Volume Reading. */
export function matches(g: CatalogEntry, query: string) {
  const wanted = words(query)
  const have = words([g.name, g.blurb, ...g.keywords].join(' '))
  return wanted.every((w) => have.some((h) => h.startsWith(w)))
}

/** A site's directory for a search (empty for none). `listed` is the site's
 *  own matching generators, then those it lists from other sites. While
 *  searching, `elsewhere` holds every other match, grouped by the site it
 *  lives on, leaving out other sites' copies of a generator listed here. */
export function directory(here: SiteId, query: string) {
  const found = CATALOG.filter((g) => matches(g, query))
  const listed = [
    ...found.filter((g) => g.site === here),
    ...found.filter((g) => g.site !== here && g.alsoOn?.includes(here)),
  ]
  const searching = words(query).length > 0
  const elsewhere = searching
    ? SITE_IDS.filter((site) => site !== here)
        .map((site) => ({ site, generators: found.filter((g) => g.site === site && !listed.some((l) => l.id === g.id)) }))
        .filter((group) => group.generators.length)
    : []
  return { listed, elsewhere }
}
