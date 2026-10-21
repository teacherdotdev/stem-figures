// An example figure's page, built into a static page for every example.

import { error } from '@sveltejs/kit'
import { exampleDetails } from '$lib/examples/details.server'
import { EXAMPLES, examplesFor, findExample } from '$lib/examples/examples'
import type { EntryGenerator, PageServerLoad } from './$types'

export const prerender = true

export const entries: EntryGenerator = () => EXAMPLES.map((e) => ({ generator: e.generator, slug: e.slug }))

export const load: PageServerLoad = ({ params }) => {
  const example = findExample(params.generator, params.slug)
  if (!example) error(404, 'Not found')
  return { example, details: exampleDetails(example), siblings: examplesFor(example.generator).filter((e) => e !== example) }
}
