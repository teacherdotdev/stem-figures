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
  'population-growth': {
    heading: 'Population growth graphs: exponential J-curves, logistic S-curves and per capita rates',
    intro: [
      'Population Growth graphs a population growing from its starting size N₀ at a growth rate r: exponential growth, dN/dt = rN, which curves upward in a J shape, or logistic growth, dN/dt = rN(K − N)/K, an S-shaped curve that levels off at the carrying capacity K. It can draw the two together from the same numbers, logistic growth that overshoots K and oscillates around it, or a population that booms and crashes. Show the population size, the growth rate dN/dt or the per capita growth rate over time, two of them stacked on the same time axis, or the rates against population size.',
      'Teachers use it for ecology questions on tests, worksheets and slides. Start from a default setup like yeast in a flask or deer on an island, or type your own numbers, name the organism and the unit of time, and the axes fit themselves. Mark the carrying capacity, the inflection point and the lag, exponential and stationary phases, add census points scattered like real counts with a table beside the graph, or hide the curve and leave blank axes and blank labels for students to fill in.',
    ],
    settings: [
      'Growth: logistic (S-curve), exponential (J-curve), exponential and logistic together, overshoot and oscillation, or boom and crash',
      'The starting size N₀, growth rate r, carrying capacity K (the peak size for boom and crash, and a lag τ for overshoot), and the time span, in hours, days, weeks, months, years or generations',
      'Ten default setups, from yeast in a flask and bacteria doubling every hour to reindeer that boom and crash, and the organism’s name for the axis titles',
      'The graphs: population size, growth rate or per capita growth rate over time, two of them stacked, or either rate or both against population size',
      'The carrying capacity as a dashed line, the inflection point at N = K/2, and the lag, exponential and stationary phases, each labeled, left as a blank line for students, or unlabeled',
      'Census points counted at any interval, on the curve or scattered by about 5%, 10% or 20%, with a table of the counts beside the graph',
      'The curve drawn or hidden for students to draw, its color, the chart and axis titles (or blank lines), the axis ranges and numbering, gridlines, and label size',
    ],
    faqs: [
      {
        q: 'What is the difference between exponential and logistic growth?',
        a: 'Exponential growth, dN/dt = rN, assumes unlimited resources, so the population grows faster and faster in a J-shaped curve. Logistic growth, dN/dt = rN(K − N)/K, slows as the population nears the carrying capacity K, the largest population the environment can support, so the curve is S-shaped and levels off at K. Choose Exponential and logistic to draw both from the same starting size and r, the exponential curve dashed.',
      },
      {
        q: 'Where is the inflection point on a logistic growth curve?',
        a: 'At half the carrying capacity, N = K/2. There the population grows fastest, rK/4 individuals per unit of time: below it, growth speeds up; above it, growth slows. Tick Inflection point to mark it with a dot and dashed lines to the axes, and the page also says when the population reaches it.',
      },
      {
        q: 'What is the per capita growth rate?',
        a: 'The growth rate per individual: dN/dt divided by N. For exponential growth it stays at r however big the population gets. For logistic growth it is r(K − N)/K, falling in a straight line from r to 0 at the carrying capacity. Graph it against population size to see the difference, or stack it under the growth rate dN/dt, which for logistic growth is a hump that peaks at N = K/2.',
      },
      {
        q: 'How do I find the doubling time of an exponential population?',
        a: 'Divide ln 2, about 0.693, by r. A population growing at r = 0.5 per year doubles about every 1.39 years. With exponential growth chosen, the page shows the doubling time for the r you type, and the Bacteria doubling every hour setup uses r = ln 2 per hour, so its census table doubles each hour.',
      },
      {
        q: 'Can I graph census data with some scatter, like real counts?',
        a: 'Yes. Tick Show census points and choose how often the population is counted. The counts can sit on the curve or be scattered by about 5%, 10% or 20%, and New counts draws a different scatter. List the counts in a table beside the graph, or untick Draw the curve so students fit the curve through the points themselves.',
      },
      {
        q: 'What are the lag, exponential and stationary phases?',
        a: 'The stages of a growth curve like yeast or bacteria in a culture: a slow start while the population is small (the lag phase), rapid growth (the exponential phase), and a leveling off near the carrying capacity (the stationary phase). The generator ends the phases where the curve’s steepest tangent, through the inflection point, meets the starting size and K, the way a culture’s lag is measured, and brackets each phase above the graph.',
      },
      {
        q: 'Can it show a population that overshoots its carrying capacity?',
        a: 'Yes. Overshoot and oscillation is logistic growth that responds to crowding a lag τ late, so it can rise past K and swing around it. With r times τ below about 0.37 it levels off without overshooting, up to about 1.57 the swings die away, and above that they keep going; the page says which for the numbers you type. Boom and crash draws a population using up food that doesn’t grow back, rising to the peak size you type and then crashing.',
      },
    ],
    imageAlt: 'A printable logistic growth curve of a deer population leveling off at a carrying capacity of 500, with the inflection point marked, made with Population Growth',
    educationalLevel: ['Middle school', 'High school', 'AP Biology'],
  },

  'punnett-square': {
    heading: 'Printable Punnett squares for monohybrid, dihybrid and X-linked crosses',
    intro: [
      'Punnett Square draws the square for the cross you type: the first parent’s gametes across the top, the second’s down the side, and every offspring genotype in the cells, with the genotype and phenotype ratios printed underneath. It handles one-gene crosses like Tt × Tt, dihybrid crosses like RrYy × RrYy in a 4 × 4 square, and X-linked crosses written on the X and Y chromosomes, with complete dominance, incomplete dominance or codominance. Alleles are set the way genetics texts set them, in italic letters with superscripts like Cᴿ and Iᴬ.',
      'Teachers use it for genetics tests, worksheets and slides. Leave the cells, gametes, parents’ genotypes or ratios blank for students to fill in, shade the cells by phenotype in patterns that survive a photocopy, and put a question above the square.',
    ],
    settings: [
      'Cross: monohybrid, dihybrid (two genes, a 4 × 4 square) or X-linked, with complete dominance, incomplete dominance or codominance for the one-gene and X-linked crosses',
      'The parents’ genotypes, typed (Tt × tt, RrYy × RrYy, X^B X^b × X^B Y, C^R C^W × C^R C^W), or a common cross: Mendel’s pea plants, a test cross, a dihybrid cross, color blindness, snapdragon color or ABO blood type',
      'A name for each phenotype (tall and short; red, pink and white), used in the ratios, the key and the cells',
      'The parents labeled by genotype, with ♀ and ♂, as Mother and Father, or not at all, with their genotypes written or left blank',
      'Gametes shown or blank; offspring cells filled in, all blank, or blank just where you click; and each phenotype’s name written under its genotype',
      'Shading by phenotype in gray, hatching and dots, with a key: every phenotype its own fill, or just one phenotype shaded',
      'Genotype and phenotype ratios shown, as a blank line or left off, written as ratios, percentages or fractions (daughters and sons separately for an X-linked cross)',
      'A chart title, a question above the square, and the label size',
    ],
    faqs: [
      {
        q: 'How do you fill in a Punnett square?',
        a: 'Split each parent’s genotype into the gametes it can make, one allele of each gene per gamete. Write the first parent’s gametes across the top and the second parent’s down the side, then fill each cell with the gamete above it plus the gamete beside it. For Tt × Tt the gametes are T and t on each side, and the cells are TT, Tt, Tt and tt.',
      },
      {
        q: 'What are the genotype and phenotype ratios of a Tt × Tt cross?',
        a: 'The genotype ratio is 1 TT : 2 Tt : 1 tt. With complete dominance TT and Tt look alike, so the phenotype ratio is 3 dominant : 1 recessive, such as 3 tall : 1 short. The generator prints both ratios under the square, as ratios, percentages or fractions.',
      },
      {
        q: 'Why does a dihybrid cross give a 9:3:3:1 ratio?',
        a: 'A parent heterozygous for two genes that assort independently, like RrYy, makes four kinds of gamete in equal numbers: RY, Ry, rY and ry. That gives a 4 × 4 square of 16 cells, of which 9 show both dominant traits, 3 show only the first, 3 show only the second, and 1 shows both recessive traits. Choose Dihybrid and type each parent with two genes.',
      },
      {
        q: 'How do I make an X-linked (sex-linked) Punnett square?',
        a: 'Choose X-linked and type the mother with two X chromosomes and the father with an X and a Y, each X carrying its allele as a superscript: X^B X^b × X^B Y. The Y carries no allele. Because sons get their only X from their mother, the phenotypes under the square are given separately for daughters and for sons.',
      },
      {
        q: 'What is the difference between incomplete dominance and codominance?',
        a: 'With incomplete dominance the heterozygote shows a blend of the two traits, as when red and white snapdragons give pink ones (CᴿCᵂ). With codominance both alleles show in full, as in type AB blood (IᴬIᴮ). Choose either under Dominance, then name each genotype’s phenotype. A small letter without a superscript, like i for type O, is recessive to the others.',
      },
      {
        q: 'How do I type superscripts like Cᴿ or Iᴬ?',
        a: 'Type ^ before a superscript and _ before a subscript, as in C^R C^W or R_1 R_2, or press Ctrl+. and Ctrl+, as in Google Docs. Pasted superscript letters work too. With incomplete dominance or codominance, a letter typed straight after the gene’s letter is read as a superscript (CR is Cᴿ) and a digit as a subscript (R1 is R₁).',
      },
      {
        q: 'Can I make a blank Punnett square for students?',
        a: 'Yes. Under Square, set Offspring to Blank, or to Some blank and click the cells students fill in, and tick the boxes to leave the gametes or the parents’ genotypes blank. Under Ratios, choose Blank line to give students a line for each ratio. Blank cells are never shaded, so the shading can’t give their answer away.',
      },
    ],
    imageAlt: 'A printable Punnett square crossing Tt × Tt, with the tall offspring shaded gray, a key for tall and short, and the genotype and phenotype ratios below, made with Punnett Square',
    educationalLevel: ['Middle school', 'High school', 'AP Biology'],
  },

  'pedigree': {
    heading: 'Pedigree charts for inheritance problems, with genotypes',
    intro: [
      'Pedigree draws a family’s pedigree chart with the standard symbols: squares for males, circles for females, filled in when affected, with generation numerals down the left and a number under each person. Pick an inheritance mode (autosomal dominant, autosomal recessive, X-linked recessive, X-linked dominant or Y-linked) and it draws a random family whose genes are passed down by Mendel’s rules, looking for one in which every other mode is ruled out or far less likely, so students can work out which it is. Or start from a classic family for hemophilia, Huntington’s disease, cystic fibrosis, albinism, red–green color blindness or vitamin D–resistant rickets.',
      'Click anyone in the pedigree to change them, or add a child, partner or sibling. As you go, the generator checks the family against every mode, names the clue that rules each one out (such as unaffected parents with an affected child), and warns you when a change makes the family impossible for the mode you picked. Teachers use it for genetics tests and worksheets: show genotypes under each person for the key or blank lines for students, and turn on the answer key line to print the inheritance mode under the figure.',
    ],
    settings: [
      'Inheritance: autosomal dominant, autosomal recessive, X-linked recessive, X-linked dominant or Y-linked',
      'A random family of 2, 3 or 4 generations, small, medium or large, with New pedigree for another one',
      'Or a classic family: hemophilia in a royal family, Huntington’s disease, cystic fibrosis, albinism, red–green color blindness or vitamin D–resistant rickets',
      'Anyone’s sex (male, female or unknown) and status (unaffected, carrier or affected), deceased and proband marks, twins and related partners, and children, partners and siblings added or removed',
      'Carriers: hidden, half filled or a center dot',
      'Genotypes under each person, worked out from the pedigree or left as blank lines, with the allele letter you choose',
      'Generation numerals, individual numbers and the key, each on or off',
      'A chart title, and an answer key line naming the inheritance mode',
    ],
    faqs: [
      {
        q: 'How do you tell if a pedigree is dominant or recessive?',
        a: 'Look for two parents with the same phenotype and a child who differs. If two unaffected parents have an affected child, the trait is recessive: both parents must carry the allele without showing it. If two affected parents have an unaffected child, it is dominant. A dominant trait usually shows in every generation, each affected person having an affected parent, while a recessive trait often skips generations.',
      },
      {
        q: 'How can you tell if a trait is X-linked from a pedigree?',
        a: 'An X-linked recessive trait affects mostly males and usually passes from an affected man through his daughters, who are carriers, to some of their sons. An affected man never passes it to his sons, who get his Y. It is ruled out when an affected daughter has an unaffected father, or an affected mother has an unaffected son. An X-linked dominant trait passes from an affected father to all of his daughters and none of his sons.',
      },
      {
        q: 'What does a Y-linked pedigree look like?',
        a: 'Only males are affected, and every son of an affected man is affected, so the trait runs straight down the male line from father to son. Women never have it and never pass it on, and an unaffected man never has an affected son. One affected woman, or an affected son of an unaffected father, rules Y-linked inheritance out.',
      },
      {
        q: 'What do the symbols in a pedigree chart mean?',
        a: 'A square is a male, a circle a female and a diamond a person of unknown sex. A filled symbol is affected; a half-filled one, or one with a dot in the middle, is a carrier. A slash marks someone who has died, and an arrow marks the proband, the person the family came to attention through. A line joins partners (a double line when they are related), and their children hang from the line below in birth order. Generations are numbered I, II, III down the left and people 1, 2, 3 from left to right, so II-3 is the third person in generation II.',
      },
      {
        q: 'Why do some genotypes have a blank, like A_?',
        a: 'Often a pedigree can’t tell whether someone has one copy of an allele or two: an unaffected person in a recessive pedigree may be a carrier, and an affected person in a dominant one may be homozygous. When Genotypes is set to Answers, the generator writes the allele it can be sure of and a blank for the other, as students would. For a recessive trait, showing carriers settles it, because an unshaded symbol then means the person is not a carrier.',
      },
      {
        q: 'Can I make a pedigree worksheet with blank genotypes?',
        a: 'Yes. Under Labels, set Genotypes to Blanks to put a line under every person for students to fill in, and leave carriers hidden so they have to work them out. Switch Genotypes to Answers, and turn on the answer key line under Chart title, to print the key for the same family.',
      },
      {
        q: 'Are my changes to the family saved?',
        a: 'Yes. A family you change by hand is written into the page address, so a copied link or a saved preset brings back exactly that family. Changing the inheritance mode keeps it; New pedigree, or a different number of generations or family size, starts a new random family.',
      },
    ],
    imageAlt: 'A printable four-generation hemophilia pedigree with half-filled carrier women, affected men, deceased slashes, a proband arrow and a key, made with Pedigree',
    educationalLevel: ['Middle school', 'High school', 'AP Biology'],
  },

  'predator-prey': {
    heading: 'Predator–prey population graphs and phase planes',
    intro: [
      'Predator–Prey Cycles graphs a predator and its prey rising and falling out of step, worked out from the Lotka–Volterra model. Pick a pair like the snowshoe hare and Canada lynx, or type your own names, and set where both populations start, what they average and how long one cycle takes. The graph shows the predators peaking after the prey, cycle after cycle, either as both populations over time or as a phase plane, predators against prey, where one cycle is one trip round the loop.',
      'Teachers use it for ecology questions on tests, worksheets and slides. Mark the peaks, the lag from a prey peak to the predator peak after it, and the period, labeled with their lengths or with blank lines for students to fill in. Switch to census counts with some scatter so the graph reads like field data, leave one or both populations off to give students axes to sketch on, and print in black and white, where the predators’ line is dashed.',
    ],
    settings: [
      'Pair: snowshoe hare and Canada lynx, rabbit and wolf, rabbit and red fox, moose and wolf (Isle Royale), sea lion and orca, snake and eagle, mouse and owl, aphid and ladybug, or names of your own',
      'The cycle from populations (both at the start, their averages and the cycle length) or from the model’s four rates, α, β, γ and δ',
      'How much time is shown, in years, months, weeks or days',
      'The populations over time, with both drawn, one of them or neither (blank axes), or a phase plane of predators against prey',
      'Smooth curves or census counts, taken every so often and off by about 0 to 50%, joined with lines or not',
      'Peaks, the lag and the period marked on the graph over time, labeled with their length, their name only, or a blank line for students',
      'One y-axis for both or the predators on the right, color or black and white, and the chart and axis titles, axis ranges, gridlines and label size',
    ],
    faqs: [
      {
        q: 'Why does the predator population peak after the prey?',
        a: 'Predators need food to grow in number. While prey are plentiful, the predators eat well and their numbers rise, but that takes time, so they keep rising after the prey have peaked. Then the many predators eat the prey down, food runs short, the predators fall, and the prey recover. That delay between a prey peak and the predator peak after it is the lag.',
      },
      {
        q: 'What is the Lotka–Volterra predator–prey model?',
        a: 'A pair of equations for how a prey population x and a predator population y change: dx/dt = αx − βxy and dy/dt = δxy − γy. Prey grow at rate α and are eaten in proportion to how often the two meet (β); predators grow from the prey they eat (δ) and die at rate γ. The populations cycle forever around a balance point, which is also each one’s average over a cycle.',
      },
      {
        q: 'Why do snowshoe hare and lynx populations cycle?',
        a: 'Fur-trade records from Canada show hare and lynx numbers rising and falling about every 10 years, the lynx a year or two behind the hares, the classic example of a predator–prey cycle. Real hare cycles also depend on the hares’ food and other predators, so the Lotka–Volterra model is a simplified picture, and this generator draws the model rather than the historical counts.',
      },
      {
        q: 'What does a predator–prey phase plane show?',
        a: 'It graphs the predators against the prey instead of each against time. Because the populations repeat, the points trace a closed loop, and one trip round it is one full cycle. With prey on the x-axis the loop goes round counterclockwise: prey rise while predators are few, predators rise, prey fall while predators are many, then predators fall. The generator draws arrows on the loop the way it goes.',
      },
      {
        q: 'How do I make a worksheet where students find the lag and period?',
        a: 'Under Marked, turn on Lag and Period and set the labels to Blank for students. Each gets a two-headed arrow between peaks and a blank line to fill in from the time axis. The settings panel shows the cycle length and lag the model works out, for your answer key.',
      },
      {
        q: 'Can I graph data that looks like real field counts?',
        a: 'Yes. Under Data, choose Census counts, set how often the populations are counted and how far off each count is, from 0 to 50%. Each set of counts is the same every time for the same figure, and New counts draws another. The counts can be joined with lines, solid for the prey and dashed for the predators.',
      },
      {
        q: 'Can I use my own animals and numbers?',
        a: 'Yes. Type any names for the prey and predators, then the populations at the start, their averages and the cycle length, and the model works out the rest. Or switch to Model rates to type α, β, γ and δ yourself. The further the start is from the averages, the bigger the swings.',
      },
    ],
    imageAlt: 'A printable predator–prey graph of snowshoe hare and lynx populations over time, with the peaks, lag and period marked, made with Predator–Prey Cycles',
    educationalLevel: ['Middle school', 'High school', 'AP Biology'],
  },

  'enzyme-activity': {
    heading: 'Enzyme activity graphs: temperature, pH, substrate concentration and inhibitors',
    intro: [
      'Enzyme Activity graphs how fast an enzyme works, the rate of reaction, against temperature, pH or substrate concentration. Against temperature the rate rises to the optimum, then falls steeply as the enzyme denatures; against pH it makes a bell around the optimum pH; against substrate concentration it rises and levels off at Vmax, following Michaelis–Menten. Pick an enzyme for each curve, from a human enzyme and Taq polymerase to pepsin, salivary amylase, trypsin and catalase, or an unknown enzyme with an optimum and width of your own.',
      'Teachers use it for questions on tests, worksheets and slides. Put up to three curves on one graph, like pepsin, amylase and trypsin against pH, or an enzyme with a competitive and a non-competitive inhibitor, told apart by solid, dashed and dotted lines and a key, so they read in black and white. The graphs show shape only, with no numbers on the axes. Mark the optimum, where the enzyme has denatured, Vmax, and ½Vmax with Km, each labeled, left as a blank line for students, or unlabeled.',
    ],
    settings: [
      'Rate against temperature, pH or substrate concentration',
      'Up to three curves, each one of the enzymes (human enzyme, Taq polymerase, pepsin, salivary amylase, trypsin or catalase) or an unknown enzyme with its own optimum and width, named in a key',
      'Against substrate concentration, each curve with no inhibitor, a competitive inhibitor or a non-competitive one, how soon the rate levels off (Km), and how strong the inhibitor is',
      'The optimum and denaturation marked with dots, or Vmax, ½Vmax and Km with dashed lines to the axes, named for their curve when there’s more than one, each labeled, left as a blank line for students, or unlabeled',
      'Color or black and white, gridlines, arrows at the axes’ ends, the chart and axis titles (or blank lines), and label size',
    ],
    faqs: [
      {
        q: 'Why does an enzyme’s rate fall above its optimum temperature?',
        a: 'Warming speeds up the reaction, because the enzyme and substrate molecules move faster and collide more often, so the rate rises up to the optimum. Past it, the heat breaks the bonds holding the enzyme’s shape, its active site changes shape and the substrate no longer fits. The enzyme is denatured, and the rate falls steeply to zero. The graph shows that as a slow rise and a sharp fall.',
      },
      {
        q: 'What temperatures and pH do the enzymes work best at?',
        a: 'The human enzyme, pepsin, salivary amylase, trypsin and catalase work best at body temperature, about 37 °C, and Taq polymerase, from bacteria in hot springs, at about 75 °C. Pepsin works best at about pH 2 in the stomach, salivary amylase and catalase at about pH 7, trypsin at about pH 8 in the small intestine, and Taq polymerase at about pH 8.3. For any other optimum, choose Unknown enzyme and type your own.',
      },
      {
        q: 'Why are there no numbers on the axes?',
        a: 'The graphs show the shapes students learn, like a rise to an optimum and a steep fall, rather than data from one experiment, so they leave the numbers off. Each enzyme’s optimum still sits in the right place along the axis, and the settings panel says where each one works best.',
      },
      {
        q: 'How do competitive and non-competitive inhibitors change the graph?',
        a: 'A competitive inhibitor fits the active site and competes with the substrate, so with enough substrate the enzyme still reaches the same Vmax, but it takes more substrate to get there: Km is higher. A non-competitive inhibitor binds somewhere else and changes the enzyme’s shape, so adding substrate can’t make up for it: Vmax is lower, and Km stays the same. Choose Substrate, then give the curves no inhibitor, a competitive inhibitor and a non-competitive one.',
      },
      {
        q: 'What are Vmax and Km?',
        a: 'Vmax is the fastest rate an enzyme reaches when every active site is busy, where the curve levels off. Km, the Michaelis constant, is the substrate concentration at which the rate is half of Vmax; the lower it is, the more easily the enzyme takes up its substrate. Under Marked, Vmax gets a dashed line across, and ½Vmax and Km a dot with dashed lines to both axes, labeled at the axes. With an inhibitor, each label names its curve, like Vmax (non-competitive) or Km (competitive).',
      },
      {
        q: 'How do I make a worksheet where students label the graph?',
        a: 'Under Marked, set the labels to Blank line, and each mark gets a line for students to write on: the optimum, denaturation, Vmax, ½Vmax or Km. Turn every curve off for blank axes to sketch on, or set the axis titles to blank lines too.',
      },
    ],
    imageAlt: 'A printable enzyme activity graph of pepsin, salivary amylase and trypsin against pH, each curve a bell around its optimum, made with Enzyme Activity',
    educationalLevel: ['Middle school', 'High school', 'AP Biology'],
  },

  'gel-electrophoresis': {
    heading: 'Gel electrophoresis figures: DNA fingerprinting, PCR and restriction digests',
    intro: [
      'Gel Electrophoresis draws an agarose gel with up to 12 lanes: a DNA ladder (a 100 bp ladder, a 1 kb ladder or λ DNA cut with HindIII) and sample lanes holding the band sizes you type. Each band runs as far as its size takes it on the gel you pick, so smaller fragments run farther, sizes too big or too small for the gel crowd toward its ends, and bands too close to separate run together as one thicker band. Start from a crime scene, paternity test, restriction digest or PCR experiment, then change anything.',
      'Teachers use it for DNA fingerprinting, forensics and paternity questions, restriction mapping, PCR results and sizing fragments against a ladder. Leave a sample lane empty for students to draw its bands, swap the ladder’s sizes or the electrodes’ signs for blanks, or add a ruler for a standard curve. The answer key prints the sample lanes’ band sizes under the figure.',
    ],
    settings: [
      'Lanes: 2 to 12, each a ladder or a sample, in any order, each with its own label',
      'Ladder: 100 bp ladder, 1 kb ladder, or λ DNA / HindIII',
      'Each sample’s band sizes in bp or kb, with “x2” for a darker band or “x0.5” for a fainter one, and an option to leave the lane blank for students',
      'Agarose: a 0.8%, 1%, 1.5% or 2% gel',
      'Look: printable dark bands on white, blue bands as a classroom stain leaves them, or glowing bands on a dark gel, as under UV or blue light',
      'Lane labels as names, blank lines or none, and lane numbers',
      'Ladder sizes in bp or kb, as blank lines, or left off; electrodes as signs, named Cathode and Anode, blank circles, or left off',
      'A ruler in cm and mm beside the gel, a chart title, and an answer key line',
    ],
    faqs: [
      {
        q: 'Why do smaller DNA fragments travel farther in gel electrophoresis?',
        a: 'DNA is negatively charged, so in the electric field it moves away from the negative electrode (cathode) at the wells toward the positive electrode (anode). The agarose is a mesh of tiny pores, and shorter fragments slip through it more easily than longer ones, so in the same time they travel farther from the wells.',
      },
      {
        q: 'How do you find a band’s size from a DNA ladder?',
        a: 'A ladder is a mix of DNA fragments of known sizes run in its own lane. Compare a sample band with the ladder bands beside it: a band level with the 3000 bp ladder band is about 3000 bp, and one between the 2000 and 1500 bp bands is between those sizes. For a closer estimate, measure how far each ladder band ran, plot size on a log scale against distance to make a standard curve, and read the unknown band’s size from its distance.',
      },
      {
        q: 'How do you tell which suspect matches in DNA fingerprinting?',
        a: 'The suspect whose lane has every band the crime scene sample has, at the same heights and no others, matches. A suspect with even one band that is missing or in a different place is not a match. In a paternity test, every band in the child’s lane must come from the mother or the father, so the true father has every band the child has that the mother doesn’t.',
      },
      {
        q: 'What agarose percentage should a gel be?',
        a: 'Pick the gel by the sizes you want to separate. A low-percentage gel has bigger pores and separates large fragments, while a higher one separates small fragments. Here a 0.8% gel separates about 800 to 10,000 bp, a 1% gel about 500 to 10,000 bp, a 1.5% gel about 200 to 3000 bp, and a 2% gel about 100 to 2000 bp, so PCR products of a few hundred bp suit a 2% gel with a 100 bp ladder.',
      },
      {
        q: 'Why are some bands thicker or brighter than others?',
        a: 'A band with more DNA in it stains darker, or glows brighter. Ladder bands are drawn with the amounts of DNA their makers list, so reference bands like the 1 kb ladder’s 3000 bp band stand out. Type “x2” after a sample’s size for a darker band and “x0.5” for a fainter one. Two sizes too close for the gel to separate are drawn as one thicker band, and the settings say which sizes ran together.',
      },
      {
        q: 'Can students draw the bands themselves?',
        a: 'Yes. Clear a sample lane’s band sizes to leave it empty on the figure, for example the double digest after the two single digests. Set Ladder sizes or Lane labels to Blank lines, or Electrodes to Blank, for students to fill those in too.',
      },
      {
        q: 'Can I put the ladder in the middle of the gel?',
        a: 'Yes. A ladder can go in any lane, and a gel can have more than one. Its sizes are written beside it only when it is the first or last lane, so put a ladder at an end if students need its sizes labeled.',
      },
    ],
    imageAlt: 'A gel electrophoresis figure with glowing bands on a dark gel: a 1 kb ladder with its sizes labeled, a crime scene lane and three suspects’ lanes, made with Gel Electrophoresis',
    educationalLevel: ['Middle school', 'High school', 'AP Biology'],
  },

  'micropipette-reading': {
    heading: 'Micropipette reading figures, from a P2 to a P1000',
    intro: [
      'Micropipette Reading draws an adjustable micropipette, from 2 µL to 1000 µL, set to the volume you type. Students read the digits in its volume display from top to bottom and place the decimal point by the pipette’s size: the same digits 1, 2 and 5 mean 1.25 µL on a 2 µL pipette, 12.5 µL on a 20 µL one and 125 µL on a 200 µL one. As on a Gilson Pipetman, digits after the decimal point are red, and a line across the display marks the decimal point too, so it stays clear on a black and white copy.',
      'Teachers use it for lab skills lessons, quizzes and lab practicals, so students can practice reading a micropipette before they handle a real one. Pick the size, type a volume or pick one at random, and the figure follows; a volume the pipette can’t be set to is caught, and the box says why. Copy the figure, or download it as a PNG or SVG for a test, worksheet or slide.',
    ],
    settings: [
      'Size: a 2, 10, 20, 100, 200 or 1000 µL micropipette (Gilson’s P2 to P1000), each set from a tenth of its size up to it',
      'The volume it’s set to, typed in µL or picked at random, checked against the pipette’s range and steps',
      'A tip on the end, in the color that size takes: clear, yellow or blue',
      'The size printed above the volume display, or left off',
      'Color: decimal digits in red, or all black and white for photocopying',
      'A line across the display at the decimal point, on the sizes with red digits',
    ],
    faqs: [
      {
        q: 'How do you read a micropipette?',
        a: 'Read the digits in the volume display from top to bottom, then place the decimal point by the pipette’s size. On a 20 µL pipette (a P20) the three digits stand for tens, ones and tenths of a µL, so 1, 5, 7 reads 15.7 µL. On a 200 µL pipette (a P200) they stand for hundreds, tens and ones, so 1, 5, 4 reads 154 µL. A quick check: the reading can never be more than the pipette’s size.',
      },
      {
        q: 'What do the red numbers on a micropipette mean?',
        a: 'On Gilson Pipetman pipettes, the red digits are the ones after the decimal point, in µL. A 10 µL or 20 µL pipette has one red digit at the bottom, the tenths. A 2 µL pipette has two, the tenths and hundredths, so 0, 8, 5 with the 8 and 5 in red is 0.85 µL. A 100 µL or 200 µL pipette has no red digits, because it reads in whole µL. Other makers mark the decimal point differently, so check the pipettes in your own lab.',
      },
      {
        q: 'Which micropipette should I use for a volume?',
        a: 'Use the smallest one whose range includes the volume, since a pipette is least accurate near the bottom of its range. Each is used from a tenth of its size up to it: a P2 from 0.2 to 2 µL, a P10 from 1 to 10 µL, a P20 from 2 to 20 µL, a P100 from 10 to 100 µL, a P200 from 20 to 200 µL and a P1000 from 100 to 1000 µL. So 15 µL goes on a P20, 150 µL on a P200 and 750 µL on a P1000.',
      },
      {
        q: 'What is the difference between a P20 and a P200?',
        a: 'The number is the largest volume it measures, in µL. A P20 goes up to 20 µL in steps of 0.1 µL; a P200 goes up to 200 µL in steps of 1 µL. Their displays look alike, so the same digits 1, 2, 5 read 12.5 µL on a P20 and 125 µL on a P200. That is why the generator prints the size above the display. Turn it off if the question gives the size instead.',
      },
      {
        q: 'Why won’t the generator take the volume I typed?',
        a: 'A real micropipette can only be dialed within its range and in steps of its bottom digit, so the generator checks what you type the same way. A 20 µL pipette goes from 2 to 20 µL in steps of 0.1 µL, so 25 µL is out of range and 12.53 µL can’t be dialed. The box says why, and for a volume between steps it gives the nearest one, here 12.5 µL. The figure keeps the last volume that worked until you fix it.',
      },
      {
        q: 'Can I print a micropipette figure in black and white?',
        a: 'Yes. Under Color, choose Black and white: the red digits turn black, and the pipette and its tip are drawn in black outline on white. Keep Line at the decimal point on, and the line across the display still shows students where the decimal point goes.',
      },
      {
        q: 'Which tip goes on which micropipette?',
        a: 'Tips are color coded by the volumes they hold. The figure draws a clear tip on the 2 µL and 10 µL pipettes, a yellow tip on the 20, 100 and 200 µL ones, and a blue tip on the 1000 µL one, the colors most labs use, and the plunger button’s cap is yellow or blue to match. Turn off Tip on the end to draw the pipette without one.',
      },
    ],
    imageAlt: 'A 20 µL micropipette with a yellow tip, its volume display reading 1, 5, 7 from top to bottom with the 7 in red, made with Micropipette Reading',
    educationalLevel: ['High school', 'AP Biology', 'College'],
  },
}

export function copyFor(id: string): GeneratorCopy {
  const copy = COPY[id]
  if (!copy) throw new Error(`No page copy for the ${id} generator`)
  return copy
}
