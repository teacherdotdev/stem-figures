// Example figures: real figures from each generator, each with its own page
// (/<generator>/examples/<slug>) and a PNG in static/examples/, so search
// engines can index them as images. Each is the generator's own settings, so
// "Edit this figure" opens exactly the figure shown.
//
// After adding or changing one, redo the pictures with
// scripts/snapshot-examples.mjs (see the app's README). The first example of
// each generator is also its social card (static/og/<generator>.png).
//
// Captions say only what the figure shows; answer keys come from the
// generators' own logic (./details.server.ts), never typed here.

import { CATALOG } from '$shared/catalog/index'
import { SITE_ID } from '$lib/site/config'
import sizes from './sizes.json'
import type { Example, ExampleGeneratorId, ExampleSpec } from './types'

const SIZES = sizes as Record<string, number[]>

/** A generator's examples, or none while it is turned off (see $shared/catalog). */
function examplesOf<G extends ExampleGeneratorId>(generator: G, specs: ExampleSpec<G>[]): Example[] {
  if (!CATALOG.some((g) => g.site === SITE_ID && g.id === generator)) return []
  return specs.map((spec) => {
    const image = `/examples/${generator}/${spec.slug}.png`
    const [width, height] = SIZES[image] ?? [0, 0]
    return { ...spec, generator, settings: spec.settings as Record<string, unknown>, path: `/${generator}/examples/${spec.slug}`, image, width, height }
  })
}

export const EXAMPLES: Example[] = [
  ...examplesOf('supply-demand', [
    {
      slug: 'supply-and-demand-graph-increase-in-demand',
      title: 'Supply and demand graph: an increase in demand',
      alt: 'Supply and demand graph with no numbers on the axes, Price up the side and Quantity along the bottom: a downward-sloping blue demand curve D₁ shifting right to D₂, with two arrows between them, and an upward-sloping red supply curve S. The equilibrium moves up along S from E₁ to E₂, each point with dashed lines to the axes labeled P₁ and P₂ on the price axis and Q₁ and Q₂ on the quantity axis',
      caption:
        'An increase in demand on a schematic supply and demand graph. The demand curve shifts right from D₁ to D₂, shown by two arrows, while the supply curve S stays put. The equilibrium moves up along S from E₁ to E₂, and the dashed lines to the axes show the price rising from P₁ to P₂ and the quantity rising from Q₁ to Q₂.',
      settings: { shift: 'demand' },
    },
    {
      slug: 'supply-and-demand-price-ceiling-shortage-deadweight-loss',
      title: 'Price ceiling graph: shortage and deadweight loss',
      alt: 'Supply and demand graph with no numbers on the axes, Price up the side and Quantity along the bottom: demand D and supply S crossing at E, with dashed lines to Pₑ and Qₑ. A horizontal line labeled Price ceiling runs below Pₑ, with dots where it meets S and D and dashed lines down to Qs and Qd, a brace under it between them labeled Shortage, and a shaded triangle between the curves from Qs to Qₑ labeled DWL',
      caption:
        'A binding price ceiling, set below the equilibrium price Pₑ. At the ceiling the quantity supplied Qs is less than the quantity demanded Qd, and the brace between them marks the shortage. The shaded triangle between the demand and supply curves, from Qs to the equilibrium quantity Qₑ, is the deadweight loss.',
      settings: { control: 'ceiling', dwl: true },
    },
    {
      slug: 'supply-and-demand-per-unit-tax-incidence-deadweight-loss-tax-revenue',
      title: 'Per-unit tax graph: tax incidence, tax revenue and deadweight loss',
      alt: 'Supply and demand graph with no numbers on the axes, Price up the side and Quantity along the bottom: demand D and supply S crossing at E, and a dashed curve S + tax above S. Dashed lines mark Pb and Ps on the price axis, above and below the height of E, and Qt left of Qₑ on the quantity axis. Shaded regions are labeled CS in blue above Pb, Tax revenue in green between Ps and Pb out to Qt, PS in red below Ps, and DWL in orange, written below and right of the small triangle between Qt and Qₑ with an arrow to it',
      caption:
        'A per-unit tax shifts the supply curve up from S to the dashed S + tax. Buyers now pay Pb, more than the price at the old equilibrium E, sellers keep Ps, less than it, and the quantity sold falls from Qₑ to Qt. The shaded areas show consumer surplus (CS), producer surplus (PS), the tax revenue between Ps and Pb, and the deadweight loss (DWL) between Qt and Qₑ.',
      settings: { tax: 'tax', cs: true, ps: true, dwl: true, revenue: true },
    },
    {
      slug: 'supply-and-demand-schedule-graph-price-floor-surplus',
      title: 'Supply and demand schedule graph with a price floor and surplus (numbered)',
      alt: 'Numbered supply and demand graph titled Market for milk, Price ($/gallon) from 0 to 3.5 up the side and Gallons (thousands) from 0 to 900 along the bottom, with gridlines: demand D and supply S drawn through dots at each row of a schedule and crossing at E, with dashed lines to Pₑ at 2 and Qₑ at 600. A horizontal line labeled Price floor at 2.5 meets D at 500, marked Qd, and S at 700, marked Qs, with a brace above it between them labeled Surplus',
      caption:
        'A supply and demand graph numbered from a schedule for the market for milk, with demand and supply plotted as dots at prices from $1 to $3 a gallon. The curves cross at an equilibrium price of $2 and a quantity of 600 thousand gallons. A price floor at $2.50 makes the quantity supplied, 700 thousand gallons, greater than the quantity demanded, 500 thousand, a surplus of 200 thousand gallons marked by the brace.',
      settings: {
        look: 'numeric', control: 'floor', controlPrice: 2.5, title: 'Market for milk', titleMode: 'text',
        xTitle: 'Gallons (thousands)', yTitle: 'Price ($/gallon)',
      },
    },
    {
      slug: 'supply-and-demand-worksheet-decrease-in-supply-blank-labels',
      title: 'Supply and demand worksheet: label a decrease in supply',
      alt: 'Black and white supply and demand graph with no numbers on the axes, Price up the side and Quantity along the bottom: a downward-sloping demand curve and an upward-sloping supply curve shifting left, with two arrows from the first supply curve to the second, and two equilibrium points with dashed lines to both axes. Every curve, point, price and quantity has a blank line for students to label',
      caption:
        'A worksheet graph of a decrease in supply, in black and white with no numbers on the axes. The supply curve shifts left, shown by two arrows, and the equilibrium moves up along the demand curve to a higher price and a lower quantity. The curves, both equilibrium points and their prices and quantities at the axes are each left as a blank line for students to label.',
      settings: {
        shift: 'supply', supplyDir: 'decrease', ink: 'bw',
        dLabelMode: 'blank', sLabelMode: 'blank', eLabelMode: 'blank', pLabelMode: 'blank', qLabelMode: 'blank',
      },
    },
  ]),

  ...examplesOf('ad-as', [
    {
      slug: 'ad-as-recessionary-gap-expansionary-fiscal-policy',
      title: 'AD–AS graph of a recessionary gap closed by expansionary fiscal policy (AD shifts right)',
      alt: 'AD–AS graph of price level against real GDP with no numbers on the axes: a vertical green LRAS line, an upward-sloping red SRAS line, and a blue AD₁ line crossing SRAS at a dot labeled E₁, to the left of LRAS; two arrows point right to AD₂, which crosses SRAS on LRAS at a dot labeled E₂. Dashed lines run from E₁ to both axes and from E₂ to the price level axis, marked PL₁ and PL₂ on the price level axis and Y₁ and Yf on the real GDP axis, and a brace under the axis from Y₁ to Yf is labeled Recessionary gap',
      caption:
        'An economy in a recessionary gap brought to full employment by an increase in aggregate demand, drawn with no numbers, as AP graphs are. AD₁ and SRAS cross at E₁, at real GDP Y₁, short of full-employment output Yf where LRAS stands, and the gap between them is braced under the axis. AD shifts right to AD₂, which crosses SRAS on LRAS at E₂: real GDP rises to Yf and the price level rises from PL₁ to PL₂.',
      settings: { start: 'recession', adShift: 'full' },
    },
    {
      slug: 'ad-as-negative-supply-shock-stagflation-sras-shift-left',
      title: 'Negative supply shock on the AD–AS graph: SRAS shifts left (stagflation)',
      alt: 'AD–AS graph of price level against real GDP with no numbers on the axes: a downward-sloping blue AD line, a vertical green LRAS line, and a red SRAS₁ line crossing AD on LRAS at a dot labeled E₁; two arrows point left to SRAS₂, which crosses AD higher up and to the left of LRAS at a dot labeled E₂. Dashed lines to the axes mark PL₁ and PL₂ on the price level axis and Y₂ and Yf on the real GDP axis, and a brace under the axis from Y₂ to Yf is labeled Recessionary gap',
      caption:
        'A negative supply shock from long-run equilibrium, drawn with no numbers. AD, SRAS₁ and LRAS meet at E₁, at full-employment output Yf. SRAS shifts left to SRAS₂, which crosses AD at E₂: the price level rises from PL₁ to PL₂ while real GDP falls to Y₂, as in stagflation. The recessionary gap from Y₂ to Yf is braced under the axis.',
      settings: { srasShift: 'left' },
    },
    {
      slug: 'ad-as-long-run-self-adjustment-recessionary-gap-sras-shift-right',
      title: 'Long-run self-adjustment from a recessionary gap on the AD–AS graph (SRAS shifts right)',
      alt: 'AD–AS graph of price level against real GDP with no numbers on the axes: a downward-sloping blue AD line, a vertical green LRAS line, and a red SRAS₁ line crossing AD at a dot labeled E₁, to the left of LRAS; two arrows point right to SRAS₂, which crosses AD lower down on LRAS at a dot labeled E₂. Dashed lines run from E₁ to both axes and from E₂ to the price level axis, marked PL₁ and the lower PL₂ on the price level axis and Y₁ and Yf on the real GDP axis, and a brace under the axis from Y₁ to Yf is labeled Recessionary gap',
      caption:
        'An economy returning on its own from a recessionary gap to full employment, with aggregate demand unchanged, drawn with no numbers. AD and SRAS₁ cross at E₁, at real GDP Y₁, short of full-employment output Yf where LRAS stands, and the gap is braced under the axis. SRAS shifts right to SRAS₂, which crosses AD on LRAS at E₂: real GDP rises to Yf and the price level falls from PL₁ to PL₂.',
      settings: { start: 'recession', srasShift: 'full' },
    },
    {
      slug: 'ad-as-numbered-graph-from-schedule-price-level-real-gdp',
      title: 'Numbered AD–AS graph from a schedule: equilibrium at price level 90 and real GDP 8,800',
      alt: 'AD–AS graph on numbered axes with gridlines, price level from 60 to 140 by 10 and real GDP from 6000 to 10,500, numbered every 1000: a blue AD line falling through a dot at each row of the schedule, from 6400 at a price level of 130 to 10,000 at 70; a red AS curve rising through its dots from 6500 at 70, steepening to 9900 at 130; and a vertical green line at 9500 labeled Potential GDP. A callout with an arrow to where AD and AS cross reads price level = 90, real GDP = 8,800, and a brace under the axis from Yₑ at 8800 to Yf at 9500 is labeled Recessionary gap',
      caption:
        'An AD–AS graph drawn from a schedule of seven price levels, from 70 to 130, with the real GDP demanded and supplied at each, a dot at each row. AD and AS cross at a price level of 90 and real GDP of 8,800, written in a callout. Potential GDP stands at 9,500, and the recessionary gap of 700 between them is braced under the axis.',
      settings: { look: 'numeric', callout: true, guides: false, lrasLabel: 'Potential GDP', asLabel: 'AS', eLabelMode: 'none' },
    },
    {
      slug: 'ad-as-graph-worksheet-label-inflationary-gap',
      title: 'AD–AS graph worksheet: label an inflationary gap',
      alt: 'Black and white AD–AS graph of price level against real GDP with no numbers on the axes: a vertical line, a downward-sloping line and an upward-sloping line, the last two crossing at a dot to the right of the vertical line, with dashed lines from the dot to both axes; blank lines for students to write on beside each line, the dot, the price level at the axis, the two outputs at the real GDP axis, and under a brace below the axis between the vertical line and the dashed line',
      caption:
        'A worksheet graph of an inflationary gap in black and white, every label left as a blank line for students. AD and SRAS cross to the right of LRAS, with dashed lines to the price level and real GDP axes, and the gap between that output and full-employment output is braced under the axis. Blank lines wait for the names of the three curves, the equilibrium, the price level, the two outputs and the gap.',
      settings: {
        start: 'inflation', ink: 'bw',
        adLabelMode: 'blank', asLabelMode: 'blank', lrasLabelMode: 'blank', eLabelMode: 'blank',
        plLabelMode: 'blank', gdpLabelMode: 'blank', yfLabelMode: 'blank', inflationLabelMode: 'blank',
      },
    },
  ]),

  ...examplesOf('money-markets', [
    {
      slug: 'money-market-graph-increase-in-money-supply',
      title: 'Money market graph: an increase in the money supply (open-market purchase)',
      alt: 'Money market graph with no numbers on the axes, Nominal interest rate up the side and Quantity of money along the bottom: a downward-sloping money demand curve labeled MD (blue), a vertical money supply curve MS₁ (red) and a second vertical curve MS₂ to its right, with two arrows pointing right from MS₁ to MS₂, dashed lines across from where each crosses MD to i₁ and the lower i₂ on the vertical axis, and Q₁ and Q₂ under the two supply curves',
      caption:
        'The money market after the money supply increases, as when the Fed buys bonds. The vertical money supply curve shifts right from MS₁ to MS₂, shown by two arrows, along the downward-sloping money demand curve MD. The nominal interest rate falls from i₁ to i₂, and the quantity of money rises from Q₁ to Q₂.',
      settings: { shift: 'supply' },
    },
    {
      slug: 'loanable-funds-graph-crowding-out-deficit-spending',
      title: 'Loanable funds graph: crowding out from government deficit spending',
      alt: 'Loanable funds market graph with no numbers on the axes, Real interest rate up the side and Quantity of loanable funds along the bottom: an upward-sloping supply curve labeled SLF (red), a downward-sloping demand curve DLF₁ (blue) and a second demand curve DLF₂ to its right, two arrows pointing right from DLF₁ to DLF₂, and dashed lines from both equilibria to r₁ and the higher r₂ on the vertical axis and to Q₁ and Q₂ on the horizontal axis',
      caption:
        'The loanable funds market when the government borrows to cover a deficit. The demand for loanable funds increases from DLF₁ to DLF₂ along an unchanged supply curve SLF. The real interest rate rises from r₁ to r₂ and the quantity of loanable funds from Q₁ to Q₂, marked with dashed lines to both axes.',
      settings: { graph: 'funds', shift: 'demand' },
    },
    {
      slug: 'market-for-reserves-graph-ample-reserves-lower-administered-rates',
      title: 'Ample reserves graph: the Fed lowers its administered rates',
      alt: 'Market for reserves graph with no numbers on the axes, Policy rate up the side and Quantity of reserves along the bottom: a demand for reserves curve DR₁ (blue) flat at the top, sloping down, then flat along the bottom, a second curve DR₂ the same shape lower down, two arrows pointing down from DR₁ to DR₂ on their flat parts, a vertical supply of reserves curve SR (red) crossing both flat bottoms, dashed lines across to PR₁ and the lower PR₂ on the vertical axis, and Q₁ under SR',
      caption:
        'The market for reserves with ample reserves: the vertical supply of reserves SR crosses the flat bottom of the demand for reserves. When the Fed lowers its administered rates, the demand for reserves shifts down from DR₁ to DR₂. The policy rate falls from PR₁ to PR₂ while the quantity of reserves stays at Q₁.',
      settings: { graph: 'reserves', shift: 'demand', demandDir: 'decrease' },
    },
    {
      slug: 'market-for-reserves-graph-limited-reserves-open-market-purchase',
      title: 'Limited reserves graph: an open-market purchase lowers the policy rate',
      alt: 'Market for reserves graph with no numbers on the axes, Policy rate up the side and Quantity of reserves along the bottom: a demand for reserves curve DR (blue) flat at the top, sloping down, then flat along the bottom, a vertical supply of reserves curve SR₁ (red) crossing its sloping part and a second vertical curve SR₂ to the right, also on the slope, two arrows pointing right from SR₁ to SR₂, dashed lines across to PR₁ and the lower PR₂ on the vertical axis, and Q₁ and Q₂ under the two supply curves',
      caption:
        'The market for reserves with limited reserves: the vertical supply of reserves crosses the sloping part of the demand for reserves DR. An open-market purchase adds reserves, shifting supply right from SR₁ to SR₂. The policy rate falls from PR₁ to PR₂ and the quantity of reserves rises from Q₁ to Q₂.',
      settings: { graph: 'reserves', regime: 'limited', shift: 'supply' },
    },
    {
      slug: 'money-market-graph-worksheet-blank-labels-increase-in-money-demand',
      title: 'Money market graph worksheet: label an increase in money demand',
      alt: 'Black and white money market graph with no numbers on the axes, Nominal interest rate up the side and Quantity of money along the bottom: a vertical money supply curve, a downward-sloping money demand curve and a second demand curve to its right, two arrows pointing right between the demand curves, dashed lines across to two interest rates on the vertical axis, and blank lines for students to write the name of each curve, both interest rates and the quantity',
      caption:
        'A worksheet money market graph in black and white, with no numbers on the axes. Money demand shifts right, shown by two arrows, along a vertical money supply curve, and dashed lines run across to the old and new interest rates. Each curve, both interest rates and the quantity of money have a blank line for students to label.',
      settings: { shift: 'demand', ink: 'bw', msLabelMode: 'blank', mdLabelMode: 'blank', iLabelMode: 'blank', qLabelMode: 'blank' },
    },
  ]),

  ...examplesOf('business-cycle', [
    {
      slug: 'business-cycle-graph-peak-trough-expansion-contraction',
      title: 'Business cycle graph: peak, trough, expansion and contraction',
      alt: 'Business cycle graph with Real GDP up the side, Time along the bottom and no numbers on the axes: a blue wave of real GDP rising from a dashed, upward-sloping long-run trend line to a high point labeled Peak, falling to a low point labeled Trough, then rising to a second, higher Peak and turning down, with an arrow to the fall after the first peak labeled Contraction and an arrow to the rise before the second peak labeled Expansion',
      caption:
        'Real GDP rising and falling over time around a dashed long-run trend that slopes upward, drawn with no numbers on the axes. Real GDP rises to a peak, falls to a trough, then rises to a second, higher peak and turns down again. Arrows label the fall after the first peak Contraction and the rise to the second peak Expansion.',
      settings: {},
    },
    {
      slug: 'business-cycle-phases-graph-recession-recovery-long-run-trend',
      title: 'Phases of the business cycle: expansion, peak, contraction, recession, trough and recovery',
      alt: 'Business cycle graph with Real GDP up the side, Time along the bottom and no numbers on the axes: a blue wave of real GDP around a dashed, upward-sloping trend line, with two high points labeled Peak and a low point labeled Trough; on the fall after the first peak, arrows labeled Contraction near the peak and Recession near the trough; on the rise after the trough, arrows labeled Recovery near the trough and Expansion near the second peak; and an arrow up to the dashed line labeled Long-run trend',
      caption:
        'Every term of the business cycle on one graph of real GDP over time. Real GDP rises to a peak, falls to a trough and rises to a second, higher peak, around a dashed line labeled Long-run trend. The fall is labeled Contraction just after the peak and Recession nearer the trough, and the rise is labeled Recovery just after the trough and Expansion nearer the second peak.',
      settings: { recessionLabelMode: 'text', recoveryLabelMode: 'text', trendLabelMode: 'text' },
    },
    {
      slug: 'business-cycle-recessions-shaded-irregular-cycles',
      title: 'Business cycle graph with recessions shaded and irregular cycles',
      alt: 'Business cycle graph with Real GDP up the side, Time along the bottom and no numbers on the axes: a blue wave of real GDP with three peaks and three troughs of different heights and spacing, each labeled Peak or Trough, each higher than the last as the dashed long-run trend rises, gray bands shading each fall from a peak to the next trough, an arrow to the first fall labeled Recession, an arrow to the rise before the second peak labeled Expansion, and an arrow down to the dashed line labeled Long-run trend',
      caption:
        'Three irregular business cycles, each rise and fall a different size and length, around a dashed, upward-sloping long-run trend. Gray bands shade the recessions, from each peak down to the trough after it. Each peak and trough is labeled, along with one recession, one expansion and the long-run trend.',
      settings: { cycles: 3, irregularity: 0.6, seed: 8, shade: true, recessionLabelMode: 'text', contractionLabelMode: 'none', trendLabelMode: 'text' },
    },
    {
      slug: 'business-cycle-quiz-identify-the-phases-letters',
      title: 'Business cycle quiz: identify the phases at letters A to G',
      alt: 'Business cycle graph with Real GDP up the side, Time along the bottom and no numbers on the axes: a blue wave of real GDP around a dashed, upward-sloping trend line, with letters A to G from left to right, A an arrow to the first rise, B a dot at the first peak, C an arrow to the fall after it, D a dot at the trough, E an arrow to the next rise, F a dot at the second peak and G an arrow to the fall at the end',
      caption:
        'A business cycle for students to identify, lettered A to G from left to right instead of labeled. Dots mark the two peaks (B and F) and the trough (D), and arrows point to each rise (A and E) and each fall (C and G) of real GDP. The answer key reads A: Expansion, B: Peak, C: Contraction, D: Trough, E: Expansion, F: Peak and G: Contraction.',
      settings: { style: 'letters', dots: true, every: true },
    },
    {
      slug: 'business-cycle-worksheet-blank-labels-peak-trough',
      title: 'Business cycle worksheet: label the peaks, trough, expansion and contraction',
      alt: 'Black and white business cycle graph with Real GDP up the side, Time along the bottom and no numbers on the axes: a wave of real GDP around a dashed, upward-sloping trend line, with a dot and a blank line above each of the two peaks, a dot and a blank line below the trough, and arrows with blank lines pointing to the fall after the first peak and to the rise before the second peak',
      caption:
        'A worksheet business cycle in black and white, with blank lines for students to label. Real GDP rises to a peak, falls to a trough and rises to a second, higher peak around a dashed long-run trend. Dots mark the two peaks and the trough, each with a blank line, and arrows with blank lines point to the fall after the first peak and the rise to the second.',
      settings: { ink: 'bw', dots: true, peakLabelMode: 'blank', troughLabelMode: 'blank', expansionLabelMode: 'blank', contractionLabelMode: 'blank' },
    },
  ]),

  ...examplesOf('production-possibilities', [
    {
      slug: 'production-possibilities-curve-efficient-inefficient-unattainable-points',
      title: 'Production possibilities curve with efficient, inefficient and unattainable points',
      alt: 'Bowed-out production possibilities curve labeled PPC, with capital goods on the y-axis and consumer goods on the x-axis and no numbers: point A on the curve with an arrow from the caption Efficient, point B inside the curve with an arrow from the caption Inefficient, and point C outside the curve with an arrow from the caption Unattainable',
      caption:
        'A production possibilities curve between consumer goods and capital goods, bowed out and drawn with no numbers on the axes. Point A is on the curve, captioned Efficient; point B is inside it, captioned Inefficient; and point C is outside it, captioned Unattainable. Each caption has an arrow to its point.',
      settings: { points: 'A,on,0.35,,Efficient;B,inside,0.55,,Inefficient;C,outside,0.7,,Unattainable' },
    },
    {
      slug: 'production-possibilities-curve-economic-growth-outward-shift',
      title: 'PPC shifting outward: economic growth on a production possibilities curve',
      alt: 'Two bowed-out production possibilities curves with capital goods on the y-axis and consumer goods on the x-axis and no numbers: the inner curve labeled PPC₁ with point A on it, the outer curve labeled PPC₂ with point B on it, and two arrows from the inner curve out to the outer one',
      caption:
        'A production possibilities curve between consumer goods and capital goods shifting outward, from PPC₁ to PPC₂, drawn with no numbers on the axes. Two arrows point from the old curve out to the new one. Point A is on PPC₁, and point B is on PPC₂ above and to the right of it, with more of both goods.',
      settings: { shift: 'both', points: 'A,on,0.55;B,on2,0.55' },
    },
    {
      slug: 'production-possibilities-curve-increasing-opportunity-cost-numbered',
      title: 'Increasing opportunity cost on a numbered production possibilities curve',
      alt: 'Production possibilities curve on numbered axes with gridlines, capital goods on the y-axis from 0 to 140 and consumer goods on the x-axis from 0 to 110: a bowed-out curve labeled PPC from 120 capital goods to 100 consumer goods, with points A to E on it at 0, 25, 50, 75 and 100 consumer goods and 120, 110, 90, 60 and 0 capital goods, joined by dashed steps labeled −10 and +25, −20 and +25, −30 and +25, and −60 and +25',
      caption:
        'A bowed-out production possibilities curve on numbered axes, meeting the capital goods axis at 120 and the consumer goods axis at 100. Points A to E sit on the curve at 0, 25, 50, 75 and 100 consumer goods, joined by dashed steps down and across. Each step gains 25 consumer goods and gives up more capital goods than the one before: 10, 20, 30 and then 60, written beside the steps.',
      settings: { look: 'numeric', bow: 1.5, yMax: 120, steps: true, points: 'A,on,0;B,on,0.25;C,on,0.5;D,on,0.75;E,on,1' },
    },
    {
      slug: 'production-possibilities-curve-comparative-advantage-two-countries',
      title: 'Comparative advantage: two countries’ production possibilities curves side by side',
      alt: 'Two production possibilities graphs side by side on the same scale, each with cloth on the y-axis and wheat on the x-axis: under the first, Country A, a straight blue line labeled PPC from 20 cloth to 40 wheat; under the second, Country B, a straight red line labeled PPC from 30 cloth to 30 wheat, each number written where its line meets the axis',
      caption:
        'Production possibilities curves for two countries making wheat and cloth, drawn side by side on the same scale. Country A (blue) can make 40 wheat or 20 cloth, and Country B (red) 30 wheat or 30 cloth. Each curve is a straight line between those amounts, which are written where it meets the axes.',
      settings: { countries: 'side', xTitle: 'Wheat', yTitle: 'Cloth' },
    },
    {
      slug: 'production-possibilities-curve-worksheet-blank-labels-guns-and-butter',
      title: 'Production possibilities curve worksheet: label the points (guns and butter)',
      alt: 'Black and white production possibilities curve with guns on the y-axis and butter on the x-axis and no numbers: a bowed-out curve with points A and B on it, point C inside it and point D outside it, each with an arrow from a blank line for students to label, and a blank line beside the curve for its name',
      caption:
        'A worksheet production possibilities curve between butter and guns, in black and white with no numbers on the axes. Points A and B are on the curve, point C is inside it and point D is outside it. Each point has an arrow from a blank line, for students to write whether it is efficient, inefficient or unattainable, and the curve has a blank line for its name.',
      settings: {
        ink: 'bw', xTitle: 'Butter', yTitle: 'Guns',
        points: 'A,on,0.25,,Efficient;B,on,0.75,,Efficient;C,inside,0.35,,Inefficient;D,outside,0.55,,Unattainable',
        captionMode: 'blank', curveLabelMode: 'blank',
      },
    },
  ]),

  ...examplesOf('phillips-curve', [
    {
      slug: 'phillips-curve-short-run-long-run-srpc-lrpc-natural-rate',
      title: 'Short-run and long-run Phillips curve graph (SRPC and LRPC)',
      alt: 'Phillips curve graph with no numbers on the axes, Inflation rate up the side and Unemployment rate along the bottom: a blue curve labeled SRPC sloping down and bending, flatter toward the right, crossing a vertical red line labeled LRPC at point A, with a dashed line across from A to the inflation axis, labeled π, and the LRPC meeting the unemployment axis at uₙ',
      caption:
        'The short-run Phillips curve (SRPC) slopes down and bends, steep at low unemployment and flatter at high unemployment, and crosses the vertical long-run Phillips curve (LRPC) at point A. The LRPC stands at the natural rate of unemployment, labeled uₙ on the unemployment axis, and a dashed line runs across from A to the inflation rate π. The axes have no numbers, as AP Macroeconomics graphs are drawn.',
      settings: {},
    },
    {
      slug: 'phillips-curve-expansionary-policy-short-run-long-run-adjustment',
      title: 'Phillips curve: expansionary policy in the short run and the long run (A to B to C)',
      alt: 'Phillips curve graph with no numbers on the axes: point A where the blue curve SRPC₁ crosses the vertical red LRPC; a black arrow up along SRPC₁ to point B, at lower unemployment and higher inflation; a second blue curve SRPC₂ above and to the right of SRPC₁, with two blue arrows from SRPC₁ to it; and a black arrow across from B to point C, where SRPC₂ crosses the LRPC. Dashed lines run from the points to the axes, labeled π₁ and π₂ on the inflation axis and u₁ and uₙ on the unemployment axis',
      caption:
        'The economy starts at A, where the short-run Phillips curve SRPC₁ crosses the long-run Phillips curve (LRPC) at the natural rate uₙ, with inflation at π₁. It moves up along SRPC₁ to B, where unemployment has fallen to u₁ and inflation has risen to π₂. The SRPC then shifts up to SRPC₂, and the economy moves across to C on the LRPC, back at uₙ with inflation at π₂.',
      settings: { movement: 'along', longRun: true },
    },
    {
      slug: 'phillips-curve-supply-shock-stagflation-srpc-shift',
      title: 'Phillips curve shift after a negative supply shock (stagflation)',
      alt: 'Phillips curve graph with no numbers on the axes: point A where the blue curve SRPC₁ crosses the vertical red LRPC; a second blue curve SRPC₂ above and to the right of SRPC₁, with two blue arrows from SRPC₁ to it; and a black arrow from A up and to the right to point B on SRPC₂, at higher unemployment and higher inflation. Dashed lines run from A and B to the axes, labeled π₁ and π₂ on the inflation axis and uₙ and u₁ on the unemployment axis',
      caption:
        'A negative supply shock shifts the short-run Phillips curve to the right, from SRPC₁ to SRPC₂. The economy moves from A, on the long-run Phillips curve (LRPC) at the natural rate uₙ with inflation at π₁, to B on SRPC₂, where unemployment has risen to u₁ and inflation to π₂. Both are higher at once: stagflation.',
      settings: { movement: 'srpc' },
    },
    {
      slug: 'phillips-curve-numbered-contractionary-policy-disinflation',
      title: 'Numbered Phillips curve: contractionary policy and disinflation (A to B to C)',
      alt: 'Phillips curve graph with numbered axes and gridlines, the unemployment rate numbered every 2% up to 12% and the inflation rate from −6% to 10%, the axes crossing at 0%: point A at 5% unemployment and 6% inflation, where the blue curve SRPC₁ crosses the vertical red LRPC at uₙ; a black arrow down along SRPC₁ to point B at 8% unemployment and 2% inflation; a lower blue curve SRPC₂ that falls below 0% inflation at higher unemployment, with two blue arrows down to it from SRPC₁; and a black arrow across from B to point C at 5% unemployment and 2% inflation. Dashed lines run to the axes, labeled π₁ at 6%, π₂ at 2%, uₙ at 5% and u₁ at 8%',
      caption:
        'A Phillips curve graph on numbered axes, with percent signs on the numbers. The economy starts at A, 5% unemployment and 6% inflation, where the short-run Phillips curve SRPC₁ crosses the long-run Phillips curve (LRPC) at the natural rate of 5%. It moves down along SRPC₁ to B, 8% unemployment and 2% inflation, then the SRPC shifts down to SRPC₂ and the economy moves across to C, back at 5% unemployment with inflation at 2%. The inflation axis runs down to −6%, where SRPC₂ falls below 0% (deflation) at higher unemployment.',
      settings: { look: 'numeric', movement: 'along', longRun: true, expected: 6, u2: 8, pi2: 2 },
    },
    {
      slug: 'phillips-curve-worksheet-blank-labels-long-run-adjustment',
      title: 'Phillips curve worksheet: label the short-run and long-run adjustment',
      alt: 'Black and white Phillips curve graph with no numbers, axes titled Inflation rate and Unemployment rate: two short-run Phillips curves sloping down and a vertical long-run Phillips curve; three points, one where the lower short-run curve crosses the vertical line, one up and to the left along that curve, and one where the upper curve crosses the vertical line; arrows from point to point and from the lower curve to the upper one; dashed lines to both axes; and a blank line for students to write each curve’s name, each point’s letter and the two inflation rates and two unemployment rates at the axes',
      caption:
        'A worksheet version of the long-run adjustment graph, in black and white with no numbers on the axes. Two short-run Phillips curves, a vertical long-run Phillips curve, three points and dashed lines to the axes are drawn, with arrows from point to point and from one short-run curve to the other. Every curve name, point letter and rate at the axes is a blank line for students to fill in.',
      settings: {
        movement: 'along',
        longRun: true,
        ink: 'bw',
        srpcLabelMode: 'blank',
        lrpcLabelMode: 'blank',
        nruLabelMode: 'blank',
        aLabelMode: 'blank',
        bLabelMode: 'blank',
        cLabelMode: 'blank',
        piLabelMode: 'blank',
        uLabelMode: 'blank',
      },
    },
  ]),

  ...examplesOf('cost-revenue-curves', [
    {
      slug: 'perfect-competition-side-by-side-graphs-market-and-firm-profit',
      title: 'Perfect competition side-by-side graphs: market and firm making an economic profit',
      alt: 'Side-by-side graphs with no numbers on the axes. Left, labeled Market: supply S and demand D crossing at a dot, with dashed lines to Pₑ on the Price axis and Qₑ on the Quantity axis. The dashed line at Pₑ runs across to the right graph, labeled Firm, where it becomes the horizontal price line D = MR = AR = P. On the firm’s graph of Price and costs against Quantity, MC, ATC and AVC curves, MC meeting the price line at a dot above q*, a green rectangle labeled Profit between the price line and a dashed line at ATC on the price axis, and arrows to dots labeled Shutdown point, at the lowest AVC, and Break-even point, at the lowest ATC.',
      caption:
        'A perfectly competitive market beside one of its firms. Market supply and demand set the price Pₑ, and the dashed line carries it across to the firm, where it is the horizontal line D = MR = AR = P. The firm produces q*, where MC meets the price line, and the shaded rectangle between the price and ATC out to q* is its economic profit. The shutdown point (the lowest AVC) and the break-even point (the lowest ATC) are marked where MC crosses them.',
      settings: { graph: 'perfect', market: true },
    },
    {
      slug: 'cost-curves-graph-mc-atc-avc-afc',
      title: 'Cost curves graph: MC, ATC, AVC and AFC',
      alt: 'Graph of Price and costs against Quantity with no numbers on the axes: a red MC curve that dips and then rises steeply, a U-shaped green ATC curve, a U-shaped purple AVC curve below it, and a dashed orange AFC curve falling all the way across. MC passes through the lowest points of AVC and ATC, each marked with a dot, and the gap between ATC and AVC narrows as quantity grows.',
      caption:
        'A firm’s cost curves: marginal cost (MC), average total cost (ATC), average variable cost (AVC) and average fixed cost (AFC, dashed). MC falls, then rises through the lowest point of AVC and then the lowest point of ATC, each marked with a dot. AFC falls as output grows, so ATC and AVC, which are AFC apart, draw closer together.',
      settings: { afc: true },
    },
    {
      slug: 'monopoly-graph-profit-consumer-surplus-deadweight-loss',
      title: 'Monopoly graph with profit, consumer surplus and deadweight loss',
      alt: 'Graph of Price and costs against Quantity with no numbers on the axes: a downward-sloping demand curve D = AR, a dashed marginal revenue curve MR twice as steep, and MC and ATC curves. A dot on demand above where MR meets MC, with dashed lines to PM on the price axis and QM on the quantity axis (the M a subscript). Shaded: a blue triangle labeled CS under demand above PM, a green rectangle labeled Profit between PM and a dashed line at ATC on the price axis, and an orange triangle labeled DWL between demand and MC from QM to where they cross.',
      caption:
        'A monopoly producing QM, where marginal revenue meets marginal cost, and charging PM, read up from QM to the demand curve. The rectangle between PM and ATC out to QM is the monopoly’s profit, and the triangle under demand above PM is consumer surplus. The triangle between demand and MC, from QM out to where they cross, is the deadweight loss.',
      settings: { graph: 'monopoly', cs: true, dwl: true },
    },
    {
      slug: 'natural-monopoly-regulation-graph-socially-optimal-fair-return-price',
      title: 'Regulated natural monopoly graph: socially optimal (P = MC) and fair-return (P = ATC) prices',
      alt: 'Graph of Price and costs against Quantity with no numbers on the axes: demand D = AR, a dashed MR curve, and MC and ATC curves, ATC still falling where demand crosses MC. Three dots on demand, each with dashed lines to both axes: PM and QM above where MR meets MC; PFR and QFR where demand crosses ATC the second time; and PSO and QSO where demand crosses MC, the lowest price and the largest quantity (M, FR and SO subscripts).',
      caption:
        'A natural monopoly, whose ATC is still falling where demand meets MC, at the three prices it could charge. Unregulated, it produces QM, where MR = MC, and charges PM. At the fair-return price PFR, where demand meets ATC, it produces QFR and breaks even; at the socially optimal price PSO, where demand meets MC, it produces the most, QSO, at a price below ATC.',
      settings: { graph: 'monopoly', regulation: 'both', profit: false, atcQ: 7.5, atcCost: 2.75, mcSlope: 1, fixed: 0.45, demandTop: 9.6, demandEnd: 6.5 },
    },
    {
      slug: 'monopolistic-competition-long-run-equilibrium-graph-excess-capacity',
      title: 'Monopolistic competition long-run equilibrium graph with excess capacity',
      alt: 'Graph of Price and costs against Quantity with no numbers on the axes: a downward-sloping demand curve D = AR just touching a U-shaped ATC curve at a dot, a dashed MR curve, and MC crossing MR directly below the dot. Dashed lines run from the dot to Pₑ on the price axis and q* on the quantity axis, and from a dot at the lowest point of ATC, where MC crosses it, down to q with the subscript min ATC. A brace under the quantity axis from q* to q min ATC is labeled Excess capacity.',
      caption:
        'A monopolistically competitive firm in long-run equilibrium. It produces q*, where MR meets MC, and its demand curve just touches ATC there, so the price Pₑ equals ATC and the firm makes zero economic profit. q* is less than the quantity at ATC’s lowest point, and the gap between them is bracketed as excess capacity.',
      settings: { graph: 'monopolistic', run: 'long' },
    },
    {
      slug: 'perfect-competition-short-run-loss-graph-blank-labels-worksheet',
      title: 'Perfect competition short-run loss graph with blank labels (worksheet)',
      alt: 'Graph of Price and costs against Quantity with no numbers on the axes and every label a blank line: red MC, green ATC and purple AVC curves, each with a blank at its end, and a blue horizontal price line with a blank, between the lowest points of AVC and ATC. MC meets the price line at a dot with a dashed line down to a blank on the quantity axis. A red rectangle with a blank inside lies between the price line and a dashed line at ATC, and the price and ATC each have a blank at the price axis. Arrows from two more blanks point to dots at the lowest points of AVC and ATC.',
      caption:
        'A perfectly competitive firm making a short-run loss, with every label a blank line for students to fill in. The price line sits between the lowest points of AVC and ATC; the firm produces where the price line meets MC, and the shaded rectangle between the price and ATC out to that quantity is the loss. The blanks are for the four lines, the price, ATC and quantity at the axes, the loss, and the shutdown and break-even points.',
      settings: {
        graph: 'perfect', price: 'loss',
        mcLabelMode: 'blank', atcLabelMode: 'blank', avcLabelMode: 'blank', priceLineLabelMode: 'blank', breakEvenLabelMode: 'blank',
        shutdownLabelMode: 'blank', pLabelMode: 'blank', qFirmLabelMode: 'blank', costLabelMode: 'blank', profitLabelMode: 'blank', lossLabelMode: 'blank',
      },
    },
  ]),
]

/** A generator's examples, in order; the first is its best. */
export const examplesFor = (generator: string) => EXAMPLES.filter((e) => e.generator === generator)

export const findExample = (generator: string, slug: string) => EXAMPLES.find((e) => e.generator === generator && e.slug === slug)

/** Generators with examples. */
export const EXAMPLE_GENERATORS = [...new Set(EXAMPLES.map((e) => e.generator))]

/** The generator's social card image (static/og/<generator>.png), made from its first example. */
export const ogImage = (generator: string) => `/og/${generator}.png`
