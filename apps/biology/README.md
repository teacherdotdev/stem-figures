# Biology Figures

Generators for clean, printable biology figures that teachers paste into tests,
worksheets and slides. Live at **https://biologyfigures.com**, a teacher.dev
project. See `CONTEXT.md` for the vocabulary (figure, generator, directory…)
and `docs/adr/` for decisions.

## Pages

- `/` **Directory**: every generator as a card with a live preview, plus a
  card to request one we don't make yet.
- `/cell-diagram` **Cell Diagram** (turned off for now, a 404): an animal, plant or bacterial cell, one
  per figure, in color or black-and-white line art. A checklist (or a click
  on the figure) picks which structures it shows and which are labeled;
  labels are names, numbers or letters (with a word bank and answer key),
  or blank lines, down both sides with leader lines that never cross.
- `/population-growth` **Population Growth**: exponential (J-curve),
  logistic (S-curve), both together, overshoot and oscillation around K, or a
  boom and crash, from N₀, r and K. Graphs population size, the growth rate
  dN/dt or the per capita growth rate, over time or against N, one graph or
  two stacked on the same x-axis. Marks the carrying capacity, the inflection
  point and the lag, exponential and stationary phases; adds census points
  (with a little scatter) and a census table; any label can be a blank line,
  and the curve can be left off for blank axes. Default setups start it
  from yeast in a flask, deer on an island, doubling bacteria and more.
- `/punnett-square` **Punnett Square**: a monohybrid, dihybrid or X-linked
  cross typed as the parents' genotypes (Tt × tt), with complete, incomplete
  or codominance (Cᴿ Cᵂ, Iᴬ Iᴮ i). Gametes, parents and any cells can be left
  blank; cells can be shaded by phenotype in gray, hatching or dots; genotype
  and phenotype ratios print underneath as ratios, percentages or fractions.
- `/pedigree` **Pedigree**: a random family for autosomal dominant or
  recessive, X-linked dominant or recessive, or Y-linked inheritance, over 2
  to 4 generations, that students can diagnose; or a classic (hemophilia in
  a royal family, Huntington's, cystic fibrosis, albinism, color blindness,
  vitamin D–resistant rickets). Click anyone to change their sex or status,
  mark them deceased or the proband, make twins, or add a child, partner or
  sibling; the family is written into the address. It checks the family
  against every mode and says how students can tell, and can show carriers
  (half filled or a dot), genotypes as answers or blanks, numbers and a key.
- `/cell-division` **Mitosis & Meiosis** (turned off for now, a 404): cells at the phases of mitosis
  (interphase G1 or G2 through cytokinesis) or meiosis (prophase I through the
  four haploid cells), for 2n = 2, 4, 6 or 8, in an animal or plant cell. One
  phase, or a strip of phases in order or shuffled from a seed. Homologous
  pairs differ in size, each with a maternal and a paternal member (dark and
  light in color, solid and outlined in black and white); crossing over swaps
  tetrads' tips and carries into every later cell. Labels: phase names,
  numbers or blank lines, "2n = 4" or chromosome counts under each cell, and
  on one phase the structures (chromosome, sister chromatids, centromere,
  tetrad or homologous pair, spindle fibers, centrioles, nuclear envelope,
  cleavage furrow or cell plate) as names, letters or blank lines.
- `/predator-prey` **Predator–Prey Cycles**: a predator and its prey (hare
  and lynx, wolf and moose, or your own pair) rising and falling out of step,
  from the Lotka–Volterra model, worked out from where they start, their
  averages and the cycle length, or from the model's four rates. Both
  populations over time, on one y-axis or with the predators on the right,
  or as a phase plane loop; smooth curves or census counts with seeded
  noise; the peaks, lag and period marked, labeled or left blank, and either
  population left off for students to sketch. Built on `$shared/graph`.
- `/food-web` **Food Webs and Energy Pyramids**: a food web of up to 14
  organisms in rows by trophic level, producers at the bottom and
  decomposers in a column at the side with dashed arrows from every level;
  a food chain from it, left to right or bottom to top; or an energy
  pyramid of 3 to 5 levels with the share passed up (10% by default)
  applied exactly. Arrows always point the way energy flows, routed through
  the gaps between organisms so none runs through one. Setups for a
  grassland, forest, pond, ocean, tundra and desert. Each organism is one
  of 54 pictures of ours (`organisms/`, listed in `organisms/manifest.ts`),
  a picture the teacher uploads (kept in the browser's IndexedDB, by
  reference in the address: see `docs/adr/0002`), or a name in a box; its
  name, picture or both can be blank, and the web is written into the
  address as text (`web.ts`). Trophic level labels as text or blank lines,
  by level or by diet. `scripts/test-food-web-uploads.mjs` tests uploads in
  a real browser.
- `/enzyme-activity` **Enzyme Activity**: the rate of reaction against
  temperature (a rise to the optimum, then a steep fall as the enzyme
  denatures), pH (a bell around the optimum) or substrate concentration
  (Michaelis–Menten, levelling off at Vmax), shape only, with no numbers on
  the axes. Up to three curves, solid, dashed and dotted with a key: a human
  enzyme, Taq polymerase, pepsin, salivary amylase, trypsin or catalase, an
  unknown enzyme with its own optimum and width, or against substrate no
  inhibitor, a competitive one (higher Km) and a non-competitive one (lower
  Vmax). The optimum and denaturation, or Vmax, ½Vmax and Km, marked with
  dashed lines to the axes, labeled, blank or unlabeled. Built on
  `$shared/graph`.
- `/dna-protein-synthesis` **DNA and Protein Synthesis**: one sequence of up
  to 36 bases, typed as the DNA template strand (3′→5′, starting TAC), the
  coding strand or the mRNA, drawn as flat strands of boxes lined up base
  under base: the coding strand, template strand, mRNA, tRNA anticodons and
  amino acids, each shown, blank, partly blank (a share picked by seed) or
  off. Read in codons from the first AUG (or the first base) to the first
  stop codon with the standard genetic code (`code.ts`). Amino acids by one-
  or three-letter code or full name, as linked beads or words; 5′ and 3′
  ends and row names shown, blank or off; codon gaps, brackets, hydrogen
  bonds and greyscale-safe base colors. Up to four deliberate wrong
  pairings in one row for multiple choice, listed in the answer key, and
  the square codon chart beside, below or alone.
- `/photosynthesis-rate` **Photosynthesis Rate**: the rate of photosynthesis
  against light intensity (or distance from the lamp, as 1/d²), CO₂
  concentration or temperature: a straight rise while light is limiting,
  bending and levelling off where CO₂ or temperature limits it (a
  non-rectangular hyperbola, its temperature curve Enzyme Activity's). Up to
  three curves, each at its own CO₂, temperature or light, solid, dashed and
  dotted with a key, gross or net of respiration, in arbitrary units or
  bubbles a minute. Also the CO₂ in a closed chamber over time in the dark,
  dim and bright light, or the CO₂ and O₂ around one plant, over time with
  O₂ on a right-hand axis or against each other, the light going off part
  way with the dark shaded. The saturation point, what limits the rate on the
  rise and the plateau, lettered points, the optimum and the compensation
  point, labeled, blank or unlabeled; scattered data points or points alone;
  shape-only or numbered axes, and setups to start from. Built on
  `$shared/graph` and its label placer.
- `/osmosis` **Osmosis and Tonicity**: a red blood cell or a plant cell in
  a solution, a beaker split by a selectively permeable membrane, a U-tube
  with the membrane at the bottom, or a dialysis-tubing bag in a beaker. Up
  to three solutes, each with its concentration on each side (%, M or mM)
  and whether it can cross; tonicity is worked out from the ones that can't.
  Solute particles are scattered as crowded as their concentrations, with
  water as small discs in the room they leave (`$shared/particles`, from a
  seed with Shuffle), and arrows for the net movement of water and of each
  solute that can cross. The start, the result (crenated, swollen or burst;
  plasmolyzed, flaccid or turgid; a level risen; a bag swollen or shrunk),
  both, or a cell in a hypotonic, an isotonic and a hypertonic solution side
  by side, in order or shuffled. Concentrations, tonicity, membrane, cell
  parts and result as text, blank lines or none; arrows as blank boxes;
  color or black and white, a key and an answer key.
- `/gel-electrophoresis` **Gel Electrophoresis**: an agarose gel of 2 to 12
  lanes, each a DNA ladder (100 bp, 1 kb or λ/HindIII) or a sample with the
  band sizes typed in. Bands run linearly in log size over the gel's range
  (0.8 to 2% agarose) and crowd together past it; bands too close to
  separate run as one. Printable, blue-stained or glowing, with ladder
  sizes, lane names, electrodes and a ruler shown or blanked, and sample
  lanes left blank for students to draw.
- `/micropipette-reading` **Micropipette Reading**: a 2, 10, 20, 100,
  200 or 1000 µL micropipette (Gilson's P2 to P1000), labeled with its size
  and set to the volume typed, which is checked against its range and steps.
  Its display shows three digit wheels read top to bottom (four on the
  1000 µL, all black), red where the decimal point goes (Gilson's
  convention), with a line there too for black and white copies.
- `/microscope-field-of-view` **Microscope Field of View** (turned off for now, a 404): the circle seen
  down a compound microscope, drawn to scale: onion or Elodea cells, cheek or
  red blood cells, paramecia, simple cells or circles, or the letter e, at
  any eyepiece and objective, and the same slide at a higher power beside
  it. The field's diameter is typed or worked out from the low-power one.
  Optional clear mm ruler, scale bar and diameter arrow; a question written
  for the settings and an answer box, shown or blank.
- `/<generator>`: on each one, the About button in the top bar opens a drawer
  with what it makes, what can be set, its example figures and frequently
  asked questions (`src/lib/site/generatorCopy.ts`, which also feeds the
  page's structured data).
- `/<generator>/examples/<slug>`: one example figure (see below).
- `/about`, `/privacy`, `/reuse`, `/sitemap.xml`, `/robots.txt`

Every page has the top bar: the site name and the current generator on the
left, and on a generator its About button, then links to the other STEM
Figures sites, on the right, which the footer
repeats along with the "Built by teacher.dev" link. The directory's search box
filters its cards as you type, and its last card is **Request a generator**. Generators fill the
window with no footer. The help button in the corner opens the same kind of
email dialog. Behind every page are faint biology doodles: a DNA helix,
a cell, a leaf, a mitochondrion, a bacterium and a Punnett square.

A generator's settings live in the page address, so a link opens the same
figure, and the server renders that figure on first load (see ADR 0001).
Saved presets stay in the browser's localStorage.

## Example figures

Each generator has a handful of example figures, so search engines have real
pictures to index. Each one has:

- its settings, title, alt text and caption in `src/lib/examples/examples.ts`
  (the first of each generator is its best);
- a static page at `/<generator>/examples/<slug>`, built by
  `src/routes/[generator=examplegenerator]/examples/[slug]/`, with the picture,
  an "Edit this figure" link that opens the generator with those settings, a
  PNG download, and an answer key where the generator works one out, from
  the generator's own code in `src/lib/examples/details.server.ts`;
- its picture at `static/examples/<generator>/<slug>.png`, listed in
  `sitemap.xml` as an image of both its page and its generator's page.

A generator's first example is also its social card, `static/og/<generator>.png`
(1200×630). The first card in each generator's settings column says what it
makes and opens its examples to start from, with saved presets moved to the
bottom of the column. Who may reuse the pictures, and how, is in
`src/lib/examples/license.ts` and the `/reuse` page. A generator that is
turned off lists no examples.

The build fails if an example's settings aren't ones its generator keeps as
written (a volume the pipette can't be set to, say), so a picture can't show a
different figure than its page describes.

### Redoing the pictures

After adding or changing an example, or changing how a generator draws, take
the pictures again. With the site running:

```sh
./scripts/agent-dev.mjs stemfigures/apps/biology                          # from the workspace root; prints its address
node scripts/snapshot-examples.mjs --app=biology http://localhost:10003/  # from stemfigures/, with that address
```

It needs the Chromium Playwright installs (`npx playwright install chromium`).
Look at the pictures before committing them, and delete the PNG of an example
you removed or renamed.

## Code layout

```
src/routes/            SvelteKit pages
src/lib/site/          top bar, About drawer and page copy, Help, footer, SEO
src/lib/examples/      example figures, their pages' details and gallery
src/lib/shared/        pieces every generator uses: figure card and toolbar,
                       undo history, presets, dialogs, fields
$shared/               ../../packages/shared: pieces shared with the other sites
src/lib/generators/    index.ts lists every generator; one folder each
```

To add a generator: make a folder under `src/lib/generators/` with its
builder and preview, add one entry to `generators/index.ts`, and add its route
under `src/routes/`. The directory, search and sitemap pick it up from the list.
Its page needs its words in `src/lib/site/generatorCopy.ts`, and it should get
a few examples in `src/lib/examples/examples.ts` (with its settings type in
`types.ts` and its definition in `details.server.ts`).

## Development

```bash
npm install   # once, from the stemfigures repo root (npm workspaces)
../../../scripts/agent-dev.mjs stemfigures/apps/biology   # from the workspace, never npm run dev directly
npm run check   # svelte-check
npm run build
```

Deployed on Vercel with `@sveltejs/adapter-vercel`. The Cloudflare Web
Analytics token is read from `CF_BEACON_TOKEN`, which is set only in
Vercel's production environment.
