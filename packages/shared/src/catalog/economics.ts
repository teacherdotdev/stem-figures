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
    id: 'production-possibilities',
    site: 'economics',
    name: 'Production Possibilities Curve',
    path: '/production-possibilities',
    blurb: 'Production possibilities curves with points, shifts and comparative advantage.',
    description:
      'Make printable production possibilities curves for economics tests. Bowed out, straight or bowed in, with points on, inside and outside the curve, economic growth or a pivot, opportunity cost steps, and two countries side by side for comparative advantage.',
    keywords: [
      'production possibilities curve', 'PPC', 'PPF', 'production possibilities frontier', 'opportunity cost', 'efficiency', 'scarcity',
      'economic growth', 'comparative advantage', 'absolute advantage', 'capital goods', 'consumer goods', 'AP Microeconomics',
      'AP Macroeconomics', 'graph', 'printable',
    ],
  },
]
