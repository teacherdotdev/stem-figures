// The labels of every Population Growth and Enzyme Activity example, of
// their directory pictures and of busier figures, as they were placed when
// the label placer moved into $shared/graph/labels. Moving or changing the placer must not move a
// label on these figures without someone meaning it to: if this fails on
// purpose, look at the pictures, then update the record with `vitest -u`.

import { describe, expect, it } from 'vitest'
import { buildEnzyme } from '$lib/generators/enzyme-activity/figure'
import { enzymeSettings } from '$lib/generators/enzyme-activity/settings'
import { fitAxes } from '$lib/generators/population-growth/fit'
import { buildPopulation } from '$lib/generators/population-growth/figure'
import { MODELS } from '$lib/generators/population-growth/growth'
import { GRAPH_IDS, populationSettings } from '$lib/generators/population-growth/settings'
import { SETUPS, settingsFor } from '$lib/generators/population-growth/setups'
import { EXAMPLES } from './examples'

const examples = (generator: string) => EXAMPLES.filter((e) => e.generator === generator).map((e) => [e.slug, e.settings] as const)

const population = (settings: Record<string, unknown>) => {
  const g = buildPopulation(populationSettings.tidy({ ...populationSettings.defaults, ...settings }))
  return { width: g.width, height: g.height, panels: g.panels.map((p) => ({ at: p.at, labels: p.labels })), bandLabels: g.bandLabels }
}
const enzyme = (settings: Record<string, unknown>) => {
  const g = buildEnzyme(enzymeSettings.tidy({ ...enzymeSettings.defaults, ...settings }))
  return { width: g.width, height: g.height, markLabels: g.markLabels, sideLabels: g.sideLabels, keyEntries: g.keyEntries }
}

// The directory pictures' settings, as their Preview.svelte files make them.
const pgStart = populationSettings.tidy({ ...populationSettings.defaults, model: 'both', n0: 10 })
const PREVIEWS = {
  'population-growth': { ...pgStart, ...fitAxes(pgStart) },
  'enzyme-activity': {
    graph: 'ph', xTitle: 'pH', enzyme1: 'pepsin', show2: true, enzyme2: 'amylase', show3: true, enzyme3: 'trypsin',
    optLabelMode: 'none', labelSize: 'large',
  },
}

// Every Population Growth setup and model with everything marked, and
// Enzyme Activity's busiest marks, as their own tests draw them.
const pgAll = (base: Record<string, unknown>) => {
  const all = populationSettings.tidy({ ...populationSettings.defaults, ...base, inflection: true, phases: true, kLine: true })
  return { ...all, ...fitAxes(all) }
}
const BUSY_PG: [string, Record<string, unknown>][] = [
  ...SETUPS.map((x) => [`setup ${x.id}`, pgAll(settingsFor(x, populationSettings.defaults, populationSettings.defaults))] as [string, Record<string, unknown>]),
  ...MODELS.flatMap((model) => GRAPH_IDS.map((graphs) => [`${model} ${graphs}`, pgAll({ model, graphs })] as [string, Record<string, unknown>])),
]
const query = (q: string) => enzymeSettings.fromParams(new URLSearchParams(q)) as Record<string, unknown>
const THREE_PH = 'graph=ph&xTitle=pH&enzyme1=pepsin&show2=1&enzyme2=amylase&show3=1&enzyme3=trypsin'
const INHIBITORS = 'graph=substrate&xTitle=Substrate+concentration&show2=1&show3=1'
const BUSY_ENZYME = [
  THREE_PH + '&markDen=1', 'show2=1&markDen=1', INHIBITORS + '&markKm=1', 'graph=substrate&inhibitor1=competitive&show3=1&markKm=1',
  INHIBITORS + '&markKm=1&km=0.4&strength=1.5', 'optLabelMode=blank&markDen=1&labelSize=large',
].map((q) => [q, query(q)] as [string, Record<string, unknown>])

describe('the labels on the graphs’ examples', () => {
  it('are where they were', async () => {
    const record = {
      'population-growth': Object.fromEntries([...examples('population-growth'), ['preview', PREVIEWS['population-growth']], ...BUSY_PG].map(([slug, s]) => [slug, population(s)])),
      'enzyme-activity': Object.fromEntries([...examples('enzyme-activity'), ['preview', PREVIEWS['enzyme-activity']], ...BUSY_ENZYME].map(([slug, s]) => [slug, enzyme(s)])),
    }
    expect(Object.keys(record['population-growth']).length).toBeGreaterThan(1)
    expect(Object.keys(record['enzyme-activity']).length).toBeGreaterThan(1)
    await expect(JSON.stringify(record, null, 1)).toMatchFileSnapshot('./label-layouts.json')
  })
})
