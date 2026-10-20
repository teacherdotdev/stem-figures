// Every generator on the site. Their names, addresses and search words are
// in the STEM Figures catalog ($shared/catalog), with every other site's;
// here each gets the component drawing its directory preview. Page titles,
// the sitemap and the top bar read GENERATORS.
//
// The Coil and Magnet generator (coil-and-magnet/) is switched off for now:
// it has no catalog entry, preview here or page. Restore all three to bring
// it back.

import type { Component } from 'svelte'
import { generatorsOn, matches } from '$shared/catalog/index'
import { SITE_ID } from '$lib/site/config'
import CircuitDiagramPreview from './circuit-diagram/Preview.svelte'
import FreeBodyPreview from './free-body-diagram/Preview.svelte'
import InclinedPlanePreview from './inclined-plane/Preview.svelte'
import MotionGraphsPreview from './motion-graphs/Preview.svelte'
import ProjectileMotionPreview from './projectile-motion/Preview.svelte'
import PulleyPreview from './pulley/Preview.svelte'
import RayDiagramPreview from './ray-diagram/Preview.svelte'
import SpringScalePreview from './spring-scale/Preview.svelte'
import VectorDiagramPreview from './vector-diagram/Preview.svelte'
import WavePreview from './waves/Preview.svelte'

/** Each generator's directory preview, by id. */
export const PREVIEWS: Record<string, Component> = {
  'free-body-diagram': FreeBodyPreview,
  'vector-diagram': VectorDiagramPreview,
  'inclined-plane': InclinedPlanePreview,
  'pulley': PulleyPreview,
  'projectile-motion': ProjectileMotionPreview,
  'motion-graphs': MotionGraphsPreview,
  'spring-scale': SpringScalePreview,
  'waves': WavePreview,
  'circuit-diagram': CircuitDiagramPreview,
  'ray-diagram': RayDiagramPreview,
}

export const GENERATORS = generatorsOn(SITE_ID, PREVIEWS)

export type Generator = (typeof GENERATORS)[number]

export const findGenerator = (path: string) => GENERATORS.find((g) => g.path === path)

/** What a generator's figures are called: its name without "Generator", like "Free Body Diagram". */
export const figureName = (g: { name: string }) => g.name.replace(/ Generator$/, '')

/** The site's own generators matching a search. */
export const searchGenerators = (query: string) => GENERATORS.filter((g) => matches(g, query))
