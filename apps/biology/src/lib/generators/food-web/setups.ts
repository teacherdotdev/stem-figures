// Classic setups: an ecosystem's food web and a food chain taken from it,
// each a set of settings over the defaults, plus the 10% energy pyramid.
// Picking one keeps the teacher's look (colors, boxes, label size) and
// whichever figure they are making, unless the setup is the pyramid.

import { GRASSLAND, type FoodWebSettings } from './settings'

type Setup = { id: string; name: string; settings: Partial<FoodWebSettings> }

export const SETUPS: Setup[] = [
  { id: 'grassland', name: 'Grassland', settings: { web: GRASSLAND, chain: 'grass,grasshopper,frog,snake,hawk' } },
  {
    id: 'forest',
    name: 'Temperate forest',
    settings: {
      web: 'oak;berries;caterpillar=oak;deer=oak,berries;squirrel=oak;mouse=berries;songbird=caterpillar,berries;owl=mouse,squirrel,songbird;fox=mouse,squirrel,berries;wolf=deer;bear=berries,deer;mushroom',
      chain: 'oak,caterpillar,songbird,owl',
    },
  },
  {
    id: 'pond',
    name: 'Pond',
    settings: {
      web: 'algae;phytoplankton;zooplankton=phytoplankton;snail=algae;beetle:Water beetle=zooplankton;duck=algae,snail;small-fish=zooplankton,snail;frog=beetle,snail;turtle=algae,small-fish;large-fish=small-fish,frog;heron=small-fish,large-fish,frog;bacteria',
      chain: 'phytoplankton,zooplankton,small-fish,large-fish,heron',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    settings: {
      web: 'phytoplankton;kelp;zooplankton=phytoplankton;krill=phytoplankton;crab=kelp;small-fish=zooplankton,krill;whale=krill,zooplankton;large-fish=small-fish,crab;seal=small-fish,large-fish;shark=large-fish,seal;orca=seal,large-fish;bacteria',
      chain: 'phytoplankton,krill,small-fish,seal,orca',
    },
  },
  {
    id: 'tundra',
    name: 'Arctic tundra',
    settings: {
      web: 'grass;berries;lemming=grass,berries;caribou=grass;songbird=berries;arctic-fox=lemming,songbird,berries;owl=lemming,songbird;wolf=caribou,arctic-fox;phytoplankton;small-fish=phytoplankton;seal=small-fish;polar-bear=seal;bacteria',
      chain: 'grass,lemming,arctic-fox,wolf',
    },
  },
  {
    id: 'desert',
    name: 'Desert',
    settings: {
      web: 'cactus;grass;grasshopper=grass;mouse=cactus,grass;rabbit=cactus,grass;lizard=grasshopper;scorpion=grasshopper;snake=mouse,lizard;hawk=snake,rabbit,lizard;coyote=rabbit,mouse,cactus;bacteria',
      chain: 'grass,grasshopper,lizard,snake,hawk',
    },
  },
  {
    id: 'pyramid',
    name: 'The 10% energy pyramid',
    settings: { figure: 'pyramid', web: GRASSLAND, chain: 'grass,grasshopper,frog,snake', levels: 4, energy: 10000, share: 10, heat: 'text' },
  },
]

/** The settings a setup makes, starting from the teacher's look and figure but nothing else. */
export function settingsFor(setup: Setup, defaults: FoodWebSettings, current: FoodWebSettings): FoodWebSettings {
  const look = { labelSize: current.labelSize, colors: current.colors, boxes: current.boxes, figure: current.figure === 'pyramid' ? 'web' : current.figure }
  return { ...defaults, ...look, ...setup.settings } as FoodWebSettings
}
