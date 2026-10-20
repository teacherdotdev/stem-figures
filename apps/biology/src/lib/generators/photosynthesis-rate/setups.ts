// The setups: the photosynthesis graphs teachers draw most often, each a set
// of settings to start from. Picking one keeps the teacher's look (label
// size, color) and writes the setup's axis titles.

import { AIR, lightCompensation } from './model'
import { autoTitles, type PhotosynthesisSettings } from './settings'

export type Setup = { id: string; name: string; settings: Partial<PhotosynthesisSettings> }

/** The light at which a plant at 25 °C in air just keeps up with respiration, to a hundredth. */
const DIM = Math.round(lightCompensation(AIR.co2, 25) * 100) / 100

export const SETUPS: Setup[] = [
  {
    id: 'limiting-factors',
    name: 'Limiting factors: CO₂ and temperature',
    settings: { graph: 'light', light1: 60, co21: 0.1, temp1: 25, co22: 0.1, temp2: 15, co23: 0.04, temp3: 15 },
  },
  {
    id: 'pondweed',
    name: 'Pondweed and lamp distance',
    settings: {
      graph: 'light', lightAxis: 'distance', rateUnit: 'bubbles', co21: 0.1, temp1: 20, show2: false, show3: false,
      axes: 'numbered', gridlines: true, points: 'on', seed: 3,
    },
  },
  {
    id: 'co2-light',
    name: 'Rate against CO₂ at two light intensities',
    settings: {
      graph: 'co2', light1: 60, temp1: 25, name1: 'High light intensity', light2: 30, temp2: 25, name2: 'Low light intensity', show3: false,
    },
  },
  {
    id: 'temperature-light',
    name: 'Rate against temperature at high and low light',
    settings: {
      graph: 'temperature', light1: 80, co21: 0.1, name1: 'High light intensity', light2: 15, co22: 0.1, name2: 'Low light intensity', show3: false,
    },
  },
  {
    id: 'chamber',
    name: 'CO₂ in a closed chamber: dark, dim and bright light',
    settings: {
      graph: 'chamber', light1: 0, temp1: 25, name1: 'Dark', light2: DIM, temp2: 25, name2: 'Dim light (compensation point)',
      light3: 60, temp3: 25, name3: 'Bright light',
    },
  },
  {
    id: 'gases',
    name: 'CO₂ and O₂ in the light, then the dark',
    settings: { graph: 'gases', light1: 60, temp1: 25, show2: false, show3: false, lightsOff: true, offAt: 30, minutes: 60 },
  },
]

/** The settings a setup makes: the defaults, the teacher's look, the setup's own and the titles that go with it. */
export function settingsFor(setup: Setup, defaults: PhotosynthesisSettings, current: PhotosynthesisSettings): PhotosynthesisSettings {
  const next = { ...defaults, labelSize: current.labelSize, color: current.color, ...setup.settings }
  const titles = autoTitles(next)
  return { ...next, xTitle: titles.xTitle, yTitle: titles.yTitle, y2Title: titles.y2Title }
}
