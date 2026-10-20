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
    id: 'cost-revenue-curves',
    site: 'economics',
    name: 'Cost and Revenue Curves',
    path: '/cost-revenue-curves',
    blurb: 'Firm cost curves with MR, profit and loss, for perfect competition, monopoly and monopolistic competition.',
    description:
      'Make printable cost and revenue curve graphs for economics tests. MC, ATC, AVC and AFC from one total cost, so MC crosses AVC and ATC at their lowest points; a perfectly competitive firm beside its market, with profit or loss and the break-even and shutdown points; a monopoly with consumer surplus, deadweight loss and regulated prices; and monopolistic competition in the short and long run.',
    keywords: [
      'cost curves', 'marginal cost', 'average total cost', 'average variable cost', 'average fixed cost', 'marginal revenue',
      'profit maximization', 'MR = MC', 'perfect competition', 'monopoly', 'monopolistic competition', 'shutdown point', 'break-even',
      'deadweight loss', 'natural monopoly', 'regulation', 'excess capacity', 'AP Microeconomics', 'graph', 'printable',
    ],
  },
]
