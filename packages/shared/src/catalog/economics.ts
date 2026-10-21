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
      'Make printable supply and demand graphs for economics tests: shifts, price ceilings and floors, per-unit taxes, and shaded surplus and deadweight loss.',
    keywords: [
      'supply', 'demand', 'equilibrium', 'shortage', 'surplus', 'price ceiling', 'price floor', 'consumer surplus', 'producer surplus',
      'deadweight loss', 'tax incidence', 'subsidy', 'elasticity', 'shift', 'market', 'AP Microeconomics', 'graph', 'printable',
    ],
  },
  {
    id: 'money-markets',
    site: 'economics',
    name: 'Money Markets',
    path: '/money-markets',
    blurb: 'The money market, loanable funds and the market for reserves, with Fed policy shifts.',
    description:
      'Make printable money market, loanable funds and reserves market graphs for economics tests, with Fed policy shifts and ample or limited reserves.',
    keywords: [
      'money market', 'money supply', 'money demand', 'loanable funds', 'crowding out', 'reserves', 'ample reserves', 'limited reserves',
      'interest on reserves', 'IORB', 'administered rates', 'federal funds rate', 'policy rate', 'open-market operations', 'monetary policy',
      'interest rate', 'AP Macroeconomics', 'graph', 'printable',
    ],
  },
  {
    id: 'business-cycle',
    site: 'economics',
    name: 'Business Cycle',
    path: '/business-cycle',
    blurb: 'A business cycle around a growth trend, with peaks, troughs and phases labeled or blank.',
    description:
      'Make printable business cycle graphs for economics tests, with peaks, troughs and phases labeled or blank.',
    keywords: [
      'business cycle', 'peak', 'trough', 'expansion', 'contraction', 'recession', 'recovery', 'real GDP', 'trend', 'potential GDP',
      'economic growth', 'AP Macroeconomics', 'graph', 'printable',
    ],
  },
  {
    id: 'phillips-curve',
    site: 'economics',
    name: 'Phillips Curve',
    path: '/phillips-curve',
    blurb: 'Short- and long-run Phillips curves with movements and shifts.',
    description:
      'Make printable Phillips curve graphs for economics tests: short- and long-run curves, supply shocks, inflation expectations and the natural rate.',
    keywords: [
      'Phillips curve', 'SRPC', 'LRPC', 'inflation', 'unemployment', 'natural rate of unemployment', 'NRU', 'expectations', 'expected inflation',
      'stagflation', 'supply shock', 'deflation', 'AP Macroeconomics', 'graph', 'printable',
    ],
  },
  {
    id: 'production-possibilities',
    site: 'economics',
    name: 'Production Possibilities Curve',
    path: '/production-possibilities',
    blurb: 'Production possibilities curves with points, shifts and comparative advantage.',
    description:
      'Make printable production possibilities curves for economics tests: opportunity cost, efficiency, economic growth and comparative advantage.',
    keywords: [
      'production possibilities curve', 'PPC', 'PPF', 'production possibilities frontier', 'opportunity cost', 'efficiency', 'scarcity',
      'economic growth', 'comparative advantage', 'absolute advantage', 'capital goods', 'consumer goods', 'AP Microeconomics',
      'AP Macroeconomics', 'graph', 'printable',
    ],
  },
  {
    id: 'ad-as',
    site: 'economics',
    name: 'AD–AS Model',
    path: '/ad-as',
    blurb: 'AD, SRAS and LRAS with gaps, shocks and policy shifts.',
    description:
      'Make printable AD–AS graphs for economics tests: recessionary and inflationary gaps, demand and supply shocks, policy shifts and long-run adjustment.',
    keywords: [
      'aggregate demand', 'aggregate supply', 'AD-AS', 'AD/AS', 'SRAS', 'LRAS', 'potential GDP', 'full employment', 'recessionary gap',
      'inflationary gap', 'output gap', 'stagflation', 'supply shock', 'fiscal policy', 'monetary policy', 'self-adjustment', 'economic growth',
      'Keynesian', 'price level', 'real GDP', 'macroeconomics', 'AP Macroeconomics', 'graph', 'printable',
    ],
  },
  {
    id: 'cost-revenue-curves',
    site: 'economics',
    name: 'Cost and Revenue Curves',
    path: '/cost-revenue-curves',
    blurb: 'Firm cost curves with MR, profit and loss, for perfect competition, monopoly and monopolistic competition.',
    description:
      'Make printable cost and revenue curves for economics tests: perfect competition, monopoly and monopolistic competition, with profit, loss and DWL.',
    keywords: [
      'cost curves', 'marginal cost', 'average total cost', 'average variable cost', 'average fixed cost', 'marginal revenue',
      'profit maximization', 'MR = MC', 'perfect competition', 'monopoly', 'monopolistic competition', 'shutdown point', 'break-even',
      'deadweight loss', 'natural monopoly', 'regulation', 'excess capacity', 'AP Microeconomics', 'graph', 'printable',
    ],
  },
]
