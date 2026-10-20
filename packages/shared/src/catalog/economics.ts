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
    id: 'phillips-curve',
    site: 'economics',
    name: 'Phillips Curve',
    path: '/phillips-curve',
    blurb: 'Short- and long-run Phillips curves with movements and shifts.',
    description:
      'Make printable Phillips curve graphs for economics tests. Draw the short-run Phillips curve and the long-run curve at the natural rate of unemployment, move along the SRPC, shift either curve after a supply shock or a change in expected inflation, and show the long-run adjustment with points A, B and C, schematic or numbered in percent with deflation.',
    keywords: [
      'Phillips curve', 'SRPC', 'LRPC', 'inflation', 'unemployment', 'natural rate of unemployment', 'NRU', 'expectations', 'expected inflation',
      'stagflation', 'supply shock', 'deflation', 'AP Macroeconomics', 'graph', 'printable',
    ],
  },
]
