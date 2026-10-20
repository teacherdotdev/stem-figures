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
