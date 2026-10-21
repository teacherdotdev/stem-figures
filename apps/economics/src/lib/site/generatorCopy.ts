// The words in each generator's About drawer: what its figures show and how
// teachers use them, what can be set, and frequently asked questions, for
// GeneratorAbout and the page's structured data. Everything here should be
// true of the generator's code; check it when a generator changes.
// Plain text only: the same strings go into JSON-LD.

export interface Faq {
  q: string
  a: string
}

export interface GeneratorCopy {
  /** the drawer's visible heading */
  heading: string
  /** one or two short paragraphs */
  intro: string[]
  /** "What you can set", one line each */
  settings: string[]
  faqs: Faq[]
  /** what the generator's social card image (/og/<id>.png) shows */
  imageAlt: string
  /** schema.org educationalLevel */
  educationalLevel: string[]
}

export const COPY: Record<string, GeneratorCopy> = {
  'supply-demand': {
    heading: 'Supply and demand graphs: equilibrium, shifts, price ceilings and floors, taxes and surplus',
    intro: [
      'Supply and Demand draws a market’s demand and supply curves crossing at equilibrium, with the equilibrium price and quantity marked at the axes as Pₑ and Qₑ or P* and Q*. Shift demand, supply or both and it draws D₁ and D₂ or S₁ and S₂, arrows between them, and the old and new equilibrium, with P₁, P₂, Q₁ and Q₂ at the axes. Add a binding price ceiling with the shortage it causes, or a price floor with its surplus, the quantity demanded and quantity supplied marked at the axis; or a per-unit tax or subsidy, with the price buyers pay, the price sellers keep and the quantity sold. Shade consumer surplus, producer surplus, deadweight loss and tax revenue, and make either curve steep (inelastic), flat (elastic), perfectly inelastic or perfectly elastic.',
      'Teachers use it for questions on tests, worksheets and slides. Graphs start schematic, straight lines with no numbers, the way AP Microeconomics graphs are drawn, or can be numbered from a schedule of prices with the quantity demanded and quantity supplied at each, so students can read the equilibrium, a shortage or the tax incidence off the axes. Every label can be written, left as a blank line for students, or left off, and graphs print in color or black and white.',
    ],
    settings: [
      'Eleven common setups, from market equilibrium, an increase in demand and a decrease in supply to a price ceiling, a price floor, consumer and producer surplus, a per-unit tax with deadweight loss, perfectly inelastic supply and a numbered gasoline market',
      'Schematic axes with each curve normal, steep (inelastic), flat (elastic), vertical (perfectly inelastic) or horizontal (perfectly elastic), or numbered axes drawn through a schedule of prices, quantities demanded and quantities supplied, with a dot at each row',
      'A shift in demand, supply or both, each an increase or a decrease and small, medium or large, with none to three arrows from the old curve to the new',
      'A price ceiling or price floor at any price, with a brace marking the shortage or surplus',
      'A per-unit tax or subsidy of any size, drawn as a dashed S + tax or S − subsidy curve',
      'Shading for consumer surplus, producer surplus, deadweight loss, and tax revenue or the cost of a subsidy',
      'Dashed lines to the axes with the prices and quantities, equilibrium values named Pₑ and Qₑ or P* and Q*, and every label written, a blank line for students, or left off, all at once or one at a time',
      'The chart and axis titles (or blank lines), color or black and white, arrows or other ends on the axes, label size, and on numbered graphs the axis ranges, fitted or typed, and gridlines',
    ],
    faqs: [
      {
        q: 'How do you show a price ceiling on a supply and demand graph?',
        a: 'A price ceiling is a legal maximum price. It only binds below the equilibrium price: there, buyers want more than sellers will sell, so the quantity demanded Qd is greater than the quantity supplied Qs, and the gap is a shortage. Only Qs is sold, so the triangle between the curves from Qs to Qₑ is deadweight loss. Under Price control choose Ceiling and slide the price below equilibrium; Brace the shortage marks the gap, and Deadweight loss under Shading shades the triangle. A ceiling at or above equilibrium doesn’t bind, and the page says so.',
      },
      {
        q: 'What is the difference between a shift and a movement along the curve?',
        a: 'A change in the good’s own price moves the market along a curve: a change in quantity demanded or quantity supplied. A change in anything else, like income, tastes or the price of a related good for demand, or input costs or technology for supply, shifts the whole curve: a change in demand or supply. Under Shift choose what shifts, whether it increases or decreases, and how far; the graph draws D₁ and D₂ (or S₁ and S₂) with arrows between them, and the market moving along the other curve from E₁ to E₂.',
      },
      {
        q: 'What happens when supply and demand both shift?',
        a: 'One of price or quantity changes in a known direction and the other depends on which shift is bigger. If demand increases and supply decreases, the price rises for sure, but the quantity rises only if demand shifts more than supply. Under Shift choose Both, set each direction, and change How far demand shifts and How far supply shifts to show each case; when the new quantity matches the old one the axis reads Q₁ = Q₂.',
      },
      {
        q: 'How do you graph a per-unit tax and show who pays it?',
        a: 'A per-unit tax on sellers shifts supply up by the amount of the tax. The quantity sold falls to Qt, buyers pay a higher price Pb, sellers keep a lower price Ps, and the gap between them is the tax. Tax revenue is the tax times Qt, and the triangle between the curves from Qt to Qₑ is deadweight loss. The side of the market that is more inelastic pays more of the tax. Under Tax or subsidy choose Tax and set its size, then tick Tax revenue and Deadweight loss under Shading; make demand Steep (inelastic) to show buyers paying most of it.',
      },
      {
        q: 'How do you shade consumer and producer surplus?',
        a: 'Consumer surplus is the area under the demand curve and above the price buyers pay, out to the quantity sold; producer surplus is the area above the supply curve and below the price sellers keep. Tick Consumer surplus and Producer surplus under Shading. They follow the market as it ends up, so with a price ceiling, price floor or tax they shrink to the quantity actually sold, and Deadweight loss shades what is lost.',
      },
      {
        q: 'How do I make a supply and demand worksheet with blank labels?',
        a: 'Under Labels, choose Blank lines for Every label, and each curve, equilibrium point, price and quantity gets a line for students to write on; or set labels one at a time, leaving some written. The Students label a shift (blank labels) setup starts from an increase in demand with every label blank. Set the axis titles to blank lines under Titles, and choose Black and white under Look for a photocopy.',
      },
      {
        q: 'Can the graph have numbers on the axes?',
        a: 'Yes. Graphs start schematic, with no numbers, as AP graphs are drawn. Choose Numbered under Axes and type a schedule: each row a price with the quantity demanded and quantity supplied at it. The curves go through the rows, the axes fit the numbers or can be typed under Numbers, and the panel gives the equilibrium price and quantity, the size of any shortage or surplus, and with a tax what buyers pay, what sellers keep and how much is sold. A ceiling or floor price and a tax per unit are typed as numbers.',
      },
    ],
    imageAlt:
      'A printable supply and demand graph of an increase in demand, the demand curve shifting right from D₁ to D₂ along the supply curve S, with the equilibrium moving from E₁ to E₂, made with Supply and Demand',
    educationalLevel: ['High school', 'AP Microeconomics', 'AP Macroeconomics', 'College'],
  },
  'ad-as': {
    heading: 'AD–AS graphs: aggregate demand, SRAS and LRAS with recessionary and inflationary gaps, shocks and policy',
    intro: [
      'AD–AS Model draws the aggregate demand and aggregate supply model of the whole economy, the price level against real GDP: a downward-sloping aggregate demand curve (AD), an upward-sloping short-run aggregate supply curve (SRAS), and a vertical long-run aggregate supply curve (LRAS) at full-employment output, or potential GDP. Start in long-run equilibrium or with a recessionary or inflationary gap braced under the axis, then shift AD, SRAS or LRAS: a demand shock, a negative supply shock and stagflation, expansionary or contractionary fiscal and monetary policy closing a gap, the economy self-adjusting in the long run, or economic growth. Aggregate supply can also be drawn in three ranges, flat, then curving up, then vertical at full-employment output, as in the Keynesian model.',
      'Teachers use it for AP Macroeconomics tests, free-response practice, worksheets and slides. Graphs are schematic, with no numbers, the way AP graphs are drawn, with the curves before and after a shift named AD₁ and AD₂, the equilibria E₁ and E₂, and dashed lines to PL₁, PL₂ and Y₁ at the axes; or numbered from a schedule of price levels and real GDP, with a callout giving the equilibrium. Every label can be written, left as a blank line for students to fill in, or left off, in color or black and white.',
    ],
    settings: [
      'Twelve common setups: long-run equilibrium, a recessionary or an inflationary gap, an increase in aggregate demand, a negative supply shock (stagflation), expansionary or contractionary policy closing a gap, long-run self-adjustment, economic growth, a three-range Keynesian curve, a numbered graph, and a blank-label worksheet',
      'Schematic axes with no numbers, as AP graphs are drawn, or numbered ones from a schedule of up to 12 price levels with the real GDP demanded (AD) and supplied (AS) at each, and potential GDP where LRAS stands, the curves smooth or straight through the rows, with a dot at each row',
      'Aggregate supply as a straight SRAS line or in three ranges (Keynesian), starting at long-run equilibrium or with a small, medium or large recessionary or inflationary gap, and LRAS shown or hidden',
      'Shifts of AD and SRAS left or right by a small, medium or large amount, or To Yf, just far enough to bring output to full employment, and of LRAS left or right, with no arrows or one to three',
      'The output gap braced under the real GDP axis, and a callout with an arrow to the equilibrium, saying whether it is a long-run or short-run equilibrium (or the price level and real GDP on a numbered graph), your own words, or a blank line',
      'Dashed lines to the axes, equilibrium values named PLₑ and Yₑ or PL* and Y*, and each label (AD, SRAS, LRAS or Potential GDP, the equilibrium, the price level, real GDP, full-employment output and the gap) written, left as a blank line for students, or left off, one at a time or all at once',
      'Color or black and white, arrows at the axes’ ends, the chart and axis titles (or blank lines), label size, and on numbered axes, ranges fitted to the schedule or typed, how often they are numbered, and gridlines',
    ],
    faqs: [
      {
        q: 'What is the difference between a recessionary gap and an inflationary gap?',
        a: 'Both are output gaps: the distance between real GDP at the short-run equilibrium, where AD crosses SRAS, and full-employment output, where LRAS stands. In a recessionary gap real GDP is below full employment and unemployment is above its natural rate; in an inflationary gap real GDP is above full employment, unemployment is below its natural rate, and the price level is pushed up. Choose Recession or Inflation under Starting point, and the size of the gap, and the gap is braced under the real GDP axis and labeled.',
      },
      {
        q: 'How do you show expansionary fiscal policy on an AD–AS graph?',
        a: 'More government spending or lower taxes increase aggregate demand, so AD shifts right and real GDP and the price level both rise; expansionary monetary policy, lowering interest rates, shifts AD right the same way. Start in a recessionary gap and set Aggregate demand (AD) to To Yf under Shifts: AD₁ moves right just far enough to cross SRAS at full employment, with E₁ and E₂, PL₁ and PL₂ marked. Contractionary policy is the same from an inflationary gap, with AD shifting left.',
      },
      {
        q: 'What does a negative supply shock look like on the AD–AS graph?',
        a: 'A rise in the price of a key input, like oil, raises firms’ costs, so short-run aggregate supply decreases and SRAS shifts left. The price level rises while real GDP falls and unemployment rises, the combination called stagflation. Set Short-run aggregate supply (SRAS) to Left under Shifts and choose how far: from long-run equilibrium, the new equilibrium E₂ is up and to the left of LRAS, and the recessionary gap is braced under the axis.',
      },
      {
        q: 'How does the economy self-adjust in the long run?',
        a: 'Without policy, wages and other input prices adjust over time. In a recessionary gap, unemployment above the natural rate pushes nominal wages down, SRAS shifts right, and real GDP returns to full employment at a lower price level; in an inflationary gap, wages rise, SRAS shifts left, and real GDP falls back to full employment at a higher price level. Set Short-run aggregate supply (SRAS) to To Yf under Shifts, and the straight SRAS line moves just far enough to cross AD on LRAS, from either gap.',
      },
      {
        q: 'Why is long-run aggregate supply vertical?',
        a: 'In the long run wages and prices have fully adjusted, so the economy’s output depends on its resources and technology, not on the price level: LRAS is a vertical line at potential, or full-employment, real GDP. Economic growth, from more capital, more labor or better technology, shifts LRAS right. Choose the Economic growth setup, or set Long-run aggregate supply (LRAS) to Right under Shifts with Short-run aggregate supply (SRAS) set to To Yf, so SRAS moves with it to the new full-employment output, and name the line LRAS, Potential GDP or both under Labels.',
      },
      {
        q: 'Can the AD–AS graph have numbers on the axes?',
        a: 'Yes. Graphs start schematic, with no numbers, as AP Macroeconomics draws them. Choose Numbered under Axes, type a schedule of price levels with the real GDP demanded and supplied at each, and potential GDP, and AD and AS are drawn through the rows, with a dot at each. The settings panel gives the equilibrium price level and real GDP and the size of any output gap, and a callout can write the equilibrium on the graph; the axes fit the schedule or can be typed.',
      },
      {
        q: 'How do I make an AD–AS worksheet where students label the graph?',
        a: 'Under Labels, choose Blank lines for Every label, and each curve, the equilibrium, the price level and real GDP at the axes, full-employment output and the gap get a line for students to write on; or set the labels one at a time. The Students label a recessionary gap setup does this for you. Set the axis titles to blank lines under Titles too, and choose Black and white under Look for photocopying.',
      },
    ],
    imageAlt: 'A printable AD–AS graph of a recessionary gap closed by an increase in aggregate demand, AD₁ shifting right to AD₂ to meet SRAS on LRAS at full-employment output, the gap braced under the axis, made with AD–AS Model',
    educationalLevel: ['High school', 'AP Macroeconomics', 'College'],
  },
  'money-markets': {
    heading: 'Money market graphs: money supply and demand, loanable funds and the market for reserves',
    intro: [
      'Money Markets draws the three interest rate graphs of AP Macroeconomics. The money market has a vertical money supply curve, MS, set by the central bank, and a downward-sloping money demand curve, MD, meeting at the nominal interest rate. The loanable funds market has an upward-sloping supply of loanable funds and a downward-sloping demand, meeting at the real interest rate, for crowding out. The market for reserves has a vertical supply of reserves and a demand for reserves that is flat at the discount rate, slopes down, then flattens at the interest on reserves, with ample or limited reserves, so the Fed can change its administered rates or buy and sell bonds. Shift either curve, or both, and the old and new interest rates and quantities are written at the axes.',
      'Teachers use it for monetary policy questions on tests, worksheets and slides. Start from a common setup like an open-market purchase, deficit spending or lower administered rates, and the shift arrows, the dashed lines to the axes and the subscripted labels, like MS₁ and MS₂ or i₁ and i₂, are drawn the way AP graphs draw them, schematic with no numbers on the axes. Leave any label as a blank line for students to fill in, rename it, or print in black and white.',
    ],
    settings: [
      'The graph: the money market, loanable funds or the market for reserves, with ample or limited reserves, and eight common setups from an open-market purchase to crowding out and lower administered rates',
      'The shift: supply, demand or both, each increasing or decreasing (with ample reserves, the demand for reserves shifting up or down), small, medium or large, with no arrows or one to three',
      'Dashed lines to the axes with the interest rates and quantities, a dot where the curves cross, and equilibrium values named iₑ and Qₑ or i* and Q*',
      'Every curve and value label written in your own words, left as a blank line for students, or left off, one at a time or all at once',
      'The chart and axis titles (or blank lines), color or black and white, arrows at the axes’ ends, and label size',
    ],
    faqs: [
      {
        q: 'How do you show an open-market purchase on a money market graph?',
        a: 'When the Fed buys bonds it pays with new reserves, banks lend more, and the money supply increases: MS shifts right from MS₁ to MS₂, the nominal interest rate falls from i₁ to i₂, and the quantity of money rises from Q₁ to Q₂. Selling bonds does the opposite. Choose Money market: open-market purchase under Common setups, or under Shift set What shifts to Supply and Money supply to Increases or Decreases, and How far to Small, Medium or Large.',
      },
      {
        q: 'Why is the money supply curve vertical?',
        a: 'The central bank sets the quantity of money whatever the interest rate, so the money supply doesn’t depend on it and is drawn as a vertical line. Money demand slopes down because the nominal interest rate is the opportunity cost of holding money instead of bonds: the higher the rate, the less money people want to hold. Because MS is upright, the generator draws a dashed line across to the interest rate only; the money supply curve itself runs down to the quantity.',
      },
      {
        q: 'What happens to the interest rate when money demand increases?',
        a: 'When nominal GDP rises, from a higher price level or more real output, people need more money for transactions, and MD shifts right. With the money supply fixed, the nominal interest rate rises from i₁ to i₂ and the quantity of money stays the same. Choose Money market: higher money demand under Common setups, or set What shifts to Demand and Money demand to Increases; the quantity is written once, as Q₁, since it doesn’t move.',
      },
      {
        q: 'How do you show crowding out on a loanable funds graph?',
        a: 'When the government runs a deficit, it borrows, which increases the demand for loanable funds: DLF shifts right, the real interest rate rises from r₁ to r₂, and the higher rate crowds out private investment. Some teachers show the same thing as a decrease in the supply of loanable funds, since public saving falls; either way the real interest rate rises. Choose Loanable funds: deficit spending (crowding out) under Common setups, or set Graph to Loanable funds, then under Shift either Demand for loanable funds to Increases or Supply of loanable funds to Decreases.',
      },
      {
        q: 'What is the difference between ample and limited reserves?',
        a: 'The demand for reserves is flat at the top, at the discount rate, slopes down, then is flat at the bottom, at the interest the Fed pays on reserves. With ample reserves, as the Fed runs policy now, the supply of reserves crosses that flat bottom, so buying or selling bonds doesn’t change the policy rate (the federal funds rate); the Fed moves it by changing its administered rates, which shifts demand down or up. With limited reserves, supply crosses the sloping part, so an open-market purchase shifts supply right and lowers the policy rate. Choose Market for reserves under Graph, then Ample reserves or Limited reserves.',
      },
      {
        q: 'How do I make a money market worksheet with blank labels?',
        a: 'Under Labels, choose Blank lines for Every label, and each curve, interest rate and quantity gets a line for students to write on, while the shift arrows still show which way the curve moved. The Students label a shift (blank labels) setup does this for an increase in the money supply. Set the axis titles to blank lines under Titles too, and choose Black and white under Look for a clean photocopy.',
      },
      {
        q: 'Can I label the equilibrium i* and Q* instead of iₑ and Qₑ?',
        a: 'Yes. Under Labels, choose iₑ and Qₑ or i* and Q* for Equilibrium values; on the loanable funds graph they are rₑ or r*, and on the reserves graph PRₑ or PR*. After a shift, the values are numbered instead, like i₁ and i₂. Tick A dot where the curves cross to mark the equilibrium, labeled E, or E₁ and E₂ after a shift, and untick the dashed lines to leave the axes bare.',
      },
    ],
    imageAlt:
      'A printable money market graph of an open-market purchase: the vertical money supply curve shifting right from MS₁ to MS₂ along a downward-sloping money demand curve MD, the nominal interest rate falling from i₁ to i₂, made with Money Markets',
    educationalLevel: ['High school', 'AP Macroeconomics', 'College'],
  },
  'business-cycle': {
    heading: 'Business cycle graphs: peaks, troughs, expansion, contraction and recessions around a long-run trend',
    intro: [
      'Business Cycle graphs the business cycle: real GDP rising and falling over time around a dashed long-run trend, the economy’s growth path. Real GDP climbs through an expansion to a peak, falls through a contraction to a trough, then recovers and climbs again, and each phase can be named with an arrow to the wave: expansion, contraction, recession and recovery. Draw 1 to 4 cycles, even ones like the textbook wave or irregular ones of different heights and lengths like real data, around a rising or a flat trend, and shade the recessions from each peak to the trough after it.',
      'Teachers use it for AP Macroeconomics questions on tests, worksheets and slides. The graph is schematic, as AP graphs are drawn, with Real GDP up the side, Time along the bottom and no numbers. Label the peaks, troughs and phases in words, letter them A, B, C… along the wave for a quiz, with the answer key listed beside the settings, or leave blank lines for students to fill in, and print it in color or black and white.',
    ],
    settings: [
      'Six common setups: peak, trough, expansion and contraction; a quiz with a letter at each point; irregular cycles with recessions shaded; one cycle with every term; blank lines for students; and no labels',
      'The wave: 1 to 4 cycles, in halves, starting at a trough, rising, at a peak or falling, how big the swings are, how steeply the long-run trend rises (or flat), and how irregular the cycles are, with New shape for another irregular wave',
      'Peaks, troughs, expansion, contraction, recession, recovery and the trend line, each in your own words, a blank line for students or left off, or all of them at once',
      'Labels written as words or as letters A, B, C… along the wave for a quiz, with the answer key, and the phases named once or in every cycle',
      'Recessions shaded from each peak to the trough after it, and a dot at each peak and trough',
      'Color or black and white (the shading hatched), the chart and axis titles (or blank lines), arrows or other ends on the axes, and label size',
    ],
    faqs: [
      {
        q: 'What are the phases of the business cycle?',
        a: 'An expansion, when real GDP rises; a peak, its highest point, where the expansion ends; a contraction, when real GDP falls; and a trough, its lowest point, where the contraction ends and the next expansion begins. One full cycle runs from one peak to the next. The graph starts with the peaks, trough, expansion and contraction labeled; under Labels, switch on Recession and Recovery to name those too.',
      },
      {
        q: 'What is the difference between a contraction and a recession?',
        a: 'A contraction is any fall in real GDP from a peak to a trough. A recession is a contraction deep and widespread enough to count: a common rule of thumb is two quarters in a row of falling real GDP, and in the United States the NBER dates recessions by a significant decline in activity across the economy. Many textbooks use the two words for the same phase, and call the early part of an expansion the recovery. Here Contraction and Recession are two names for the same fall, from a peak to the trough after it: Contraction points at it from above and Recession from below. Recovery points at the rise just after the trough and Expansion further up.',
      },
      {
        q: 'What does the trend line on a business cycle graph show?',
        a: 'The long-run trend is the economy’s growth in potential output, the real GDP it can produce at full employment, which rises over time as it gains workers, capital and better technology. Real GDP swings above the trend near a peak, where unemployment is low and prices tend to rise, and below it near a trough, where unemployment is high. The Trend slider sets how steeply the dashed line rises, or flat at zero, and Trend line under Labels names it Long-run trend or in your own words.',
      },
      {
        q: 'Why are real business cycles irregular?',
        a: 'Real cycles don’t repeat: each expansion and contraction lasts a different length of time, and some recessions are much deeper than others. The textbook wave is even, as the graph starts. Move the Irregularity slider to vary each swing’s height and length, and press New shape for another wave; a link to the page keeps the one you have.',
      },
      {
        q: 'How do I shade recessions on a business cycle graph?',
        a: 'Under Shading, tick Shade recessions, peak to trough, and a gray band runs from each peak down to the trough after it, as charts of real GDP often shade recessions. In black and white the bands are hatched. Pair it with Irregular cycles, recessions shaded under Common setups for a graph that looks like real data.',
      },
      {
        q: 'How do I make a worksheet or quiz where students label the business cycle?',
        a: 'Under Labels, choose Blank lines under Every label, and each peak, trough and phase gets a line for students to write on; tick A dot at each peak and trough under Shading to mark the points. For a quiz, set Written as to Letters A, B, C…, and the labels become letters along the wave from left to right, with the answer key listed under the Cycle settings. Tick Name the phases in every cycle to letter every rise and fall, not just one of each.',
      },
    ],
    imageAlt: 'A printable business cycle graph of real GDP rising and falling around a dashed upward-sloping long-run trend, with two peaks, a trough, expansion and contraction labeled, made with Business Cycle',
    educationalLevel: ['High school', 'AP Macroeconomics', 'College'],
  },
  'production-possibilities': {
    heading: 'Production possibilities curve graphs: efficiency, opportunity cost, economic growth and comparative advantage',
    intro: [
      'Production Possibilities Curve draws the production possibilities curve (PPC), also called the production possibilities frontier (PPF), between two goods, like consumer goods and capital goods: bowed out for increasing opportunity cost, straight for constant opportunity cost, or bowed in. Mark points on, inside and outside the curve as efficient, inefficient and unattainable, shift the curve outward for economic growth or inward after a disaster, pivot it when only one good can be made more of, and step down it to show the opportunity cost of each move. For comparative advantage, draw two countries’ straight-line curves on one graph or side by side, with where each meets the axes written there.',
      'Teachers use it for economics questions on tests, worksheets and slides. Start from a common setup like economic growth or comparative advantage, name the two goods, and keep the graph schematic, with no numbers, as AP graphs are drawn, or number it so students can read off opportunity costs. Leave the point captions, point names and the curve’s label as blank lines for students to fill in, and print in color or black and white.',
    ],
    settings: [
      'Ten common setups, from points A to D on a bowed-out curve and economic growth to increasing and constant opportunity cost, a disaster, and comparative advantage, and the two goods, which are the axis titles',
      'Schematic axes with no numbers, as AP graphs are drawn, or numbered ones, with the most of each good typed where the curve meets each axis',
      'One country’s curve, bowed out, straight or bowed in, and how far it bows, or two countries’ straight-line curves for comparative advantage, on one graph or side by side, each country named',
      'Up to eight points, each on the curve, on the new curve after a shift, inside or outside it, or at numbers typed on a numbered graph, with the caption Efficient, Inefficient, Unattainable or your own words',
      'A shift of the whole curve outward (growth) or inward, small, medium or large, or a pivot when only one good changes, with up to three arrows and the curves labeled PPC₁ and PPC₂',
      'Opportunity cost steps between the points on the curve, and on a numbered graph how much of each good each step gives up and gains',
      'The curve’s name, the point names and the captions, each written, left as a blank line for students, or left off, and dashed lines from the points to the axes',
      'Color or black and white, arrows at the axes’ ends, the chart and axis titles (or blank lines), the numbered axes’ ranges and gridlines, and label size',
    ],
    faqs: [
      {
        q: 'What do points inside, on and outside a production possibilities curve mean?',
        a: 'A point on the curve is efficient: the economy is using all of its resources fully to make that mix of the two goods. A point inside the curve is inefficient, with resources unemployed or underused, as in a recession. A point outside it is unattainable with the resources and technology the economy has now. Under Points, put each point On the curve, Inside the curve or Outside the curve, and give it the caption Efficient, Inefficient or Unattainable, or your own words.',
      },
      {
        q: 'Why is the production possibilities curve bowed out?',
        a: 'Because of increasing opportunity cost. Resources are not equally good at making both goods, so as an economy makes more of one good it has to move resources that are less and less suited to it, giving up more and more of the other good for each extra unit. When resources are equally suited to both goods, the opportunity cost stays the same and the curve is a straight line. Under Shape, choose Bowed out, Straight or Bowed in, and under Opportunity cost tick Steps between the points on the curve to show what each move along it gives up.',
      },
      {
        q: 'How do you show economic growth on a production possibilities curve?',
        a: 'Economic growth shifts the whole curve outward: more resources, like a larger labor force or more capital, or better technology let the economy make more of both goods. A war or natural disaster that destroys resources shifts it inward, and a new technology that helps make only one good pivots the curve out along that good’s axis alone. Under Shift, choose what shifts (the whole curve, or only one good, a pivot), Outward (growth) or Inward, how far and how many arrows. The curves are labeled PPC₁ and PPC₂, and a point can go On the new curve.',
      },
      {
        q: 'How do you calculate opportunity cost from a production possibilities curve?',
        a: 'The opportunity cost of one good is how much of the other good is given up to make it: if making 25 more consumer goods means making 10 fewer capital goods, each consumer good costs 10 ÷ 25 = 0.4 capital goods. On a bowed-out curve that cost grows with each step along it; on a straight curve it stays the same. Choose Numbered under Axes, type the most of each good the economy can make, put points on the curve and tick Steps between the points on the curve: each step is drawn with dashed lines and what it gives up and gains written beside it, and the page lists each step’s opportunity cost.',
      },
      {
        q: 'How do you find comparative advantage from two countries’ production possibilities curves?',
        a: 'A country has a comparative advantage in the good it makes at the lower opportunity cost, and an absolute advantage in a good it can make more of. If Country A can make 40 wheat or 20 cloth, each wheat costs it 0.5 cloth; if Country B can make 30 of either, each wheat costs it 1 cloth, so A has the comparative advantage in wheat and B in cloth, and both gain by specializing and trading. Under Countries, choose Two, one graph or Two, side by side, then name the countries and type the most of each good each can make. The numbers are written where each line meets the axes, and the page gives each country’s opportunity cost of each good.',
      },
      {
        q: 'How do I make a PPC worksheet where students label the points?',
        a: 'Give the points captions, then under Labels set Captions to Blank lines: each caption becomes a blank line with an arrow to its point, for students to write efficient, inefficient or unattainable. Set the curve’s label to Blank line too, or choose Blank lines beside Every label to blank the curve’s name, the point names and the captions at once. The Students label the points (blank labels) setup starts one for you, and Black and white under Look prints cleanly on a photocopier.',
      },
      {
        q: 'Can the production possibilities curve have numbers on the axes?',
        a: 'Yes. Graphs start schematic, with no numbers, the way AP graphs are drawn. Choose Numbered under Axes and type where the curve meets each axis, the most of each good the economy can make; points on the curve are then placed by how much of the x-axis good they make, and a point can also go At numbers typed, to ask whether a mix is attainable. The axes fit the figure, or can be set by hand under Numbers, with gridlines.',
      },
    ],
    imageAlt:
      'A printable production possibilities curve between consumer goods and capital goods, bowed out, with point A on the curve labeled Efficient, point B inside it labeled Inefficient and point C outside it labeled Unattainable, made with Production Possibilities Curve',
    educationalLevel: ['High school', 'AP Microeconomics', 'AP Macroeconomics', 'College'],
  },
  'phillips-curve': {
    heading: 'Phillips curve graphs: short-run and long-run Phillips curves, supply shocks, expected inflation and the natural rate',
    intro: [
      'Phillips Curve draws the short-run Phillips curve (SRPC), sloping down and bending, and the vertical long-run Phillips curve (LRPC) at the natural rate of unemployment, with the inflation rate up the side and the unemployment rate along the bottom. It shows the short-run tradeoff between inflation and unemployment as a movement along the SRPC, up when aggregate demand rises and down when it falls, and the long run after it, when expected inflation catches up and the economy returns to the LRPC at the new inflation rate. It shifts the SRPC after a supply shock (stagflation) or a change in expected inflation, and shifts the LRPC when the natural rate of unemployment changes, with points A, B and C and dashed lines to the inflation and unemployment rates at the axes.',
      'Teachers use it for AP Macroeconomics questions on tests, worksheets and slides. Start from a common setup, like demand-pull inflation, a supply shock or the long-run adjustment back to the LRPC, and draw it schematic, with no numbers, as AP graphs are drawn, or on numbered axes in percent, typing the natural rate, expected inflation and the rates at each point, with the inflation axis running below 0% for deflation. Any label, from SRPC₁ and LRPC to π₁ and uₙ, can be written, left as a blank line for students, or left off, and the graph prints in color or black and white.',
    ],
    settings: [
      'Common setups: SRPC and LRPC, demand-pull inflation, falling demand, a supply shock, higher expected inflation, the long-run adjustment back to the LRPC, a lower natural rate, a numbered graph, and a blank-label worksheet',
      'Schematic axes with no numbers, as AP graphs are drawn, or numbered axes in percent, fitted to the graph or typed, with the percent signs on the numbers, in the axis titles or left off, and gridlines',
      'The SRPC and LRPC each shown or hidden, how sharply the SRPC bends (gentle, normal or strong), and where the natural rate of unemployment sits; numbered, the natural rate, expected inflation and a second point the SRPC passes through',
      'What moves: nothing, the economy up or down along the SRPC, the SRPC shifting right or left after a supply shock or a change in expected inflation, or the LRPC shifting left or right, with the SRPC moving with it or not; small, medium or large, or to the rates typed on a numbered graph',
      'The long run after a movement along the SRPC, as expectations adjust and the economy returns to the LRPC at C, with up to three shift arrows and arrows from point to point',
      'Points A, B and C, dashed lines to the axes, and the inflation and unemployment rates written there, like π₁, π₂, u₁ and uₙ',
      'Every label as text, a blank line for students, or none, with _ for subscripts like u_n; the chart and axis titles (or blank lines); color or black and white; arrows at the axes’ ends; and label size',
    ],
    faqs: [
      {
        q: 'Why does the short-run Phillips curve slope down?',
        a: 'In the short run, a rise in aggregate demand pushes output up, so unemployment falls, and pushes the price level up faster, so inflation rises; a fall in aggregate demand does the opposite. With expected inflation fixed, that tradeoff is a movement along the short-run Phillips curve (SRPC). Under Movement, choose Along SRPC and a Direction, Up (inflation rises) or Down (unemployment rises), to draw the move from A to B.',
      },
      {
        q: 'Why is the long-run Phillips curve vertical?',
        a: 'In the long run, expected inflation catches up with actual inflation and unemployment returns to the natural rate, whatever the inflation rate, so there is no tradeoff: the long-run Phillips curve (LRPC) is a vertical line at the natural rate of unemployment, as the long-run aggregate supply curve is vertical at full employment. After a movement along the SRPC, tick Long run: expectations adjust, back to the LRPC at C, and the SRPC shifts to SRPC₂, crossing the LRPC at point C at the new inflation rate.',
      },
      {
        q: 'How does a supply shock shift the Phillips curve?',
        a: 'A negative supply shock, like a sharp rise in oil prices, raises inflation and unemployment at the same time, stagflation, which shifts the short-run Phillips curve to the right (up). The economy moves off the LRPC to a point with both higher unemployment and higher inflation; a positive supply shock shifts the SRPC to the left. Under Movement, choose SRPC, set Why it shifts to Supply shock and pick a Direction, and point B lands on the new curve, to the right of the LRPC for a negative shock.',
      },
      {
        q: 'What is the difference between a shift of the short-run Phillips curve and a movement along it?',
        a: 'A change in aggregate demand moves the economy along the short-run Phillips curve, trading lower unemployment for higher inflation or the reverse. A change in expected inflation or a supply shock shifts the whole SRPC: higher expected inflation shifts it up and to the right, so every unemployment rate comes with more inflation. Under Movement, Along SRPC draws a movement from A to B on one curve; SRPC with Why it shifts set to Expected inflation draws the curve shifting up or down the LRPC, with B on the LRPC at the new expected inflation rate.',
      },
      {
        q: 'What shifts the long-run Phillips curve?',
        a: 'A change in the natural rate of unemployment, the frictional and structural unemployment left at full employment. Better job matching or job training lowers it and shifts the LRPC left; changes that make job searches longer raise it and shift the LRPC right, and the long-run aggregate supply curve shifts the opposite way. Under Movement, choose LRPC and a Direction, Left (lower NRU) or Right (higher NRU), and tick The SRPC shifts with it to move the short-run curve over too.',
      },
      {
        q: 'How do I make a Phillips curve worksheet with blank labels?',
        a: 'Under Labels, set Every label to Blank lines, and each curve name, point letter and rate at the axes becomes a line for students to write on; set any one back to Text to give it away. The Students label a movement (blank labels) setup does this for the long-run adjustment from A to B to C. Choose Black and white under Look for printing, and set the axis titles to blank lines under Titles too if you like.',
      },
      {
        q: 'Can a Phillips curve graph have numbers on the axes?',
        a: 'Yes. It starts schematic, with no numbers, as AP Macroeconomics graphs are drawn; choose Numbered under Axes and type the Natural rate (A) and Expected inflation (A), where the curves cross, and a second point the SRPC passes through, which is B for a movement along it. The axes fit themselves, running below 0% when a curve falls into deflation, the percent signs go on the numbers or in the axis titles, and the panel lists each point’s unemployment and inflation rates.',
      },
    ],
    imageAlt: 'A printable Phillips curve graph: a downward-sloping short-run Phillips curve (SRPC) crossing the vertical long-run Phillips curve (LRPC) at point A, at the natural rate of unemployment uₙ, with a dashed line across to the inflation rate π, made with Phillips Curve',
    educationalLevel: ['High school', 'AP Macroeconomics', 'College'],
  },
  'cost-revenue-curves': {
    heading: 'Cost and revenue curve graphs: MC, ATC and AVC, perfect competition, monopoly and monopolistic competition',
    intro: [
      'Cost and Revenue Curves draws a firm’s cost curves, marginal cost (MC), average total cost (ATC), average variable cost (AVC) and average fixed cost (AFC), all from one total cost, so MC always crosses AVC and ATC at their lowest points and the gap between ATC and AVC is AFC. Put the firm in a market: a perfectly competitive firm facing the price line D = MR = AR = P, making a profit or a loss, at its break-even or shutdown point, with the market’s supply and demand beside it; a monopoly producing where MR = MC, with consumer surplus, deadweight loss and regulated prices; or a monopolistically competitive firm in the short run or in long-run equilibrium with excess capacity.',
      'Teachers use it for AP Microeconomics and economics questions on tests, worksheets and slides. Start from a common setup, like a firm at a loss that keeps producing or a regulated natural monopoly, then shape the costs by eye. The axes show shape only, as AP graphs are drawn, with dashed lines to Pₑ, q* and the other prices and quantities. Shade profit or loss, consumer surplus and deadweight loss, in color or hatched for black and white, and leave any label, or every label, as a blank line for students to fill in.',
    ],
    settings: [
      'The graph: cost curves alone, perfect competition, monopoly or monopolistic competition, and eleven common setups, from cost curves with AFC to a regulated natural monopoly and a firm with blank labels',
      'The costs, set by eye: where ATC is lowest (its quantity and its cost), how steeply MC rises, and how much fixed cost there is (the gap between ATC and AVC); AVC on monopoly graphs, and AFC on any',
      'For perfect competition, the market price above ATC (profit), at the lowest ATC (break-even), between AVC and ATC (loss), at the lowest AVC (shutdown point), below AVC (shuts down) or anywhere on a slider, and the market beside the firm, setting the price',
      'For a monopoly, where demand meets the price axis and would meet the quantity axis, and regulation to the socially optimal price (P = MC), a fair-return price (P = ATC), or both marked',
      'For monopolistic competition, the short run with a profit or a loss, or the long run with demand tangent to ATC and the excess capacity bracketed',
      'Shading for profit or loss, consumer surplus and deadweight loss',
      'Dashed lines to the axes with the prices and quantities, dots where MC crosses AVC and ATC, Pₑ and Qₑ or P* and Q*, the price line named D = MR = AR = P, MR = P or MR, and each label written, a blank line for students, or left off',
      'The chart and axis titles (or blank lines), color or black and white, arrows at the axes’ ends, and label size',
    ],
    faqs: [
      {
        q: 'Why does marginal cost cross ATC and AVC at their lowest points?',
        a: 'While the cost of the next unit (MC) is below an average, it pulls the average down; once MC is above it, it pulls the average up. So MC cuts AVC and ATC exactly at their lowest points, AVC’s first since ATC’s low point is further right, where falling AFC still offsets rising AVC. Every curve here comes from one total cost, so this always holds however you set the costs, and Dots where MC crosses AVC and ATC marks the two points.',
      },
      {
        q: 'How do you show profit or loss on a perfectly competitive firm graph?',
        a: 'The firm takes the market price as given, so its demand, marginal revenue and average revenue are one horizontal line, D = MR = AR = P, and it produces q* where P = MC. Profit or loss is the rectangle between the price and ATC at q*, out to q*: profit when the price is above ATC, loss when it is below. Choose Perfect competition, pick the Market price, and tick Profit or loss under Shading; tick The market beside the firm, setting the price for the side-by-side market and firm graphs AP questions ask for.',
      },
      {
        q: 'What is the difference between the break-even point and the shutdown point?',
        a: 'The break-even point is the lowest point of ATC: at that price the firm makes zero economic profit. The shutdown point is the lowest point of AVC: between the two the firm makes a loss but keeps producing in the short run, because it covers its variable costs and some of its fixed cost, and below the lowest AVC it shuts down and loses only its fixed cost. Both are marked and named on a perfect competition graph, and the Market price choices put the price above ATC, at either point, between them or below AVC.',
      },
      {
        q: 'How do you draw a monopoly graph with deadweight loss?',
        a: 'A monopoly faces the downward-sloping market demand, so its marginal revenue lies below demand (twice as steep for a straight-line demand). It produces QM where MR = MC and charges PM, read up from QM to demand; the deadweight loss is the triangle between demand and MC from QM out to where they cross, the output a competitive market would reach. Choose Monopoly or the Monopoly: profit and deadweight loss setup, and tick Consumer surplus and Deadweight loss under Shading.',
      },
      {
        q: 'How is a natural monopoly regulated?',
        a: 'A natural monopoly’s ATC is still falling where demand meets MC, so one firm can supply the market most cheaply. Regulated to the socially optimal price, P = MC, it produces the allocatively efficient quantity but the price is below ATC, so it makes a loss and needs a subsidy; at the fair-return price, P = ATC, it breaks even with a normal profit. Choose the Monopoly: regulated (P = MC, P = ATC) setup, or set Regulation to either price or Both, marked.',
      },
      {
        q: 'Why does a monopolistically competitive firm have excess capacity in the long run?',
        a: 'Short-run profits draw new firms in and losses drive firms out, shifting each firm’s demand until it just touches ATC, where the firm makes zero economic profit. Because demand slopes down, it touches ATC to the left of ATC’s lowest point, so the firm produces less than the quantity at the lowest ATC: that gap is excess capacity, and the price is above MC as well. Choose Monopolistic competition and Long run, and a brace under the quantity axis marks the excess capacity, from q* to the quantity at the lowest ATC.',
      },
      {
        q: 'How do I make a worksheet where students label the graph?',
        a: 'Under Labels, set Every label to Blank lines, and every curve, point, price, quantity and shaded region gets a line for students to write on; or start from the Students label a firm (blank labels) setup. Set single labels to Blank line or None one at a time, and the axis titles to blank lines under Titles.',
      },
    ],
    imageAlt:
      'Printable side-by-side graphs of a perfectly competitive market and firm: market supply and demand set the price Pₑ, carried across to the firm’s price line D = MR = AR = P, with the firm’s economic profit shaded between Pₑ and ATC, made with Cost and Revenue Curves',
    educationalLevel: ['High school', 'AP Microeconomics', 'College'],
  },
}

export function copyFor(id: string): GeneratorCopy {
  const copy = COPY[id]
  if (!copy) throw new Error(`No page copy for the ${id} generator`)
  return copy
}
