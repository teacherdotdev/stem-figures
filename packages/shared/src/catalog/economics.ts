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
    id: 'money-markets',
    site: 'economics',
    name: 'Money Markets',
    path: '/money-markets',
    blurb: 'The money market, loanable funds and the market for reserves, with Fed policy shifts.',
    description:
      'Make printable money market, loanable funds and reserves market graphs for economics tests. Shift money supply or money demand, show crowding out, and draw the market for reserves with ample or limited reserves as the Fed changes administered rates or buys and sells bonds.',
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
      'Make printable business cycle graphs for economics tests: real GDP rising and falling around a dashed long-run trend, with peaks, troughs, expansion, contraction, recession and recovery labeled, lettered for a quiz or left blank, and recessions shaded.',
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
      'Make printable Phillips curve graphs for economics tests. Draw the short-run Phillips curve and the long-run curve at the natural rate of unemployment, move along the SRPC, shift either curve after a supply shock or a change in expected inflation, and show the long-run adjustment with points A, B and C, schematic or numbered in percent with deflation.',
    keywords: [
      'Phillips curve', 'SRPC', 'LRPC', 'inflation', 'unemployment', 'natural rate of unemployment', 'NRU', 'expectations', 'expected inflation',
      'stagflation', 'supply shock', 'deflation', 'AP Macroeconomics', 'graph', 'printable',
    ],
  },
]
