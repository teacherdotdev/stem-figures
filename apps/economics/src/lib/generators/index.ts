// Every generator on the site. Their names, addresses and search words are
// in the STEM Figures catalog ($shared/catalog), with every other site's;
// here each gets the component drawing its directory preview. Page titles,
// the sitemap and the top bar read GENERATORS.

import type { Component } from 'svelte'
import { generatorsOn } from '$shared/catalog/index'
import { SITE_ID } from '$lib/site/config'
import SupplyDemand from './supply-demand/Preview.svelte'
import BusinessCycle from './business-cycle/Preview.svelte'

export const PREVIEWS: Record<string, Component> = {
  'supply-demand': SupplyDemand,
  'business-cycle': BusinessCycle,
}

export const GENERATORS = generatorsOn(SITE_ID, PREVIEWS)

export type Generator = (typeof GENERATORS)[number]

export const findGenerator = (path: string) => GENERATORS.find((g) => g.path === path)
