// Econ Figures' generators. See ./index.ts.

import type { CatalogEntry } from './index'

export const ECONOMICS: CatalogEntry[] = [
  {
    id: 'supply-demand',
    site: 'economics',
    name: 'Supply and Demand',
    path: '/supply-demand',
    blurb: 'Supply and demand with shifts, price controls, taxes and shaded surplus.',
    description:
      'Make printable supply and demand graphs for economics tests. Shift demand or supply, add a price ceiling or floor with its shortage or surplus, a per-unit tax or subsidy, and shade consumer surplus, producer surplus and deadweight loss, schematic or numbered from a schedule.',
    keywords: [
      'supply', 'demand', 'equilibrium', 'shortage', 'surplus', 'price ceiling', 'price floor', 'consumer surplus', 'producer surplus',
      'deadweight loss', 'tax incidence', 'subsidy', 'elasticity', 'shift', 'market', 'AP Microeconomics', 'graph', 'printable',
    ],
  },
  {
    id: 'ad-as',
    site: 'economics',
    name: 'AD–AS Model',
    path: '/ad-as',
    blurb: 'AD, SRAS and LRAS with gaps, shocks and policy shifts.',
    description:
      'Make printable AD–AS graphs for economics tests. Start at long-run equilibrium or with a recessionary or inflationary gap braced under the axis, shift aggregate demand, short-run or long-run aggregate supply (or to full employment), use a three-range Keynesian AS curve, or number the graph from a schedule with a callout.',
    keywords: [
      'aggregate demand', 'aggregate supply', 'AD-AS', 'AD/AS', 'SRAS', 'LRAS', 'potential GDP', 'full employment', 'recessionary gap',
      'inflationary gap', 'output gap', 'stagflation', 'supply shock', 'fiscal policy', 'monetary policy', 'self-adjustment', 'economic growth',
      'Keynesian', 'price level', 'real GDP', 'macroeconomics', 'AP Macroeconomics', 'graph', 'printable',
    ],
  },
]
