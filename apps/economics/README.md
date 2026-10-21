# Econ Figures

Generators for clean, printable economics figures that teachers paste into
tests, worksheets and slides. Live at **https://econfigures.com** (with
economicsfigures.com as an alias), a teacher.dev project. See `CONTEXT.md`
for the vocabulary (figure, generator, directory…) and `docs/adr/` for
decisions.

## Pages

- `/` **Directory**: every generator as a card with a live preview, plus a
  card to request one we don't make yet.
- `/supply-demand` **Supply and Demand**: supply and demand curves and
  where they cross, shifts with arrows, a price ceiling or floor with its
  shortage or surplus braced, a per-unit tax or subsidy, and shaded
  consumer and producer surplus, deadweight loss and tax revenue.
  Schematic (no numbers, as AP graphs are drawn) or numbered from a typed
  schedule of prices and quantities. Common setups to start from.
- `/money-markets` **Money Markets**: the money market (upright money
  supply, money demand), loanable funds, or the market for reserves (upright
  supply of reserves, demand flat, sloping, then flat at the administered
  rate) with ample or limited reserves. Shift either curve with arrows; the
  rates and quantities before and after are written at the axes, and the
  readout says what happened to the rate and why (with ample reserves, moving
  the supply of reserves leaves the policy rate where it is). Common setups,
  including the AP 2024 ample-reserves graph.
- `/business-cycle` **Business Cycle**: real GDP rising and falling around
  a dashed long-run trend, with its peaks and troughs named and the phases
  (expansion, contraction, recession, recovery) pointed out with arrows, in
  words, as letters A, B, C… for a quiz, or as blank lines. Recessions
  shaded from peak to trough, dots at the turning points, and cycles even
  or irregular (from a seed, so a link draws the same wave). Common setups
  to start from.
- `/phillips-curve` **Phillips Curve**: the short-run Phillips curve,
  convex and sloping down, and the vertical long-run curve at the natural
  rate of unemployment; a movement along the SRPC, the SRPC shifting after
  a supply shock or a change in expected inflation, or the LRPC shifting
  with the natural rate; the long-run adjustment back to the LRPC; points
  A, B and C with dashed guides to both axes. Schematic, or numbered in
  percent with the axes crossing at 0 for deflation. Common setups to
  start from.
- `/production-possibilities` **Production Possibilities Curve**: a
  curve between two goods (the axis titles), bowed out, straight or bowed
  in; named points on, inside and outside it with captions pointing to
  them; a shift out or in, or a pivot when only one good can be made more
  of, with arrows; the opportunity cost steps between points on the curve;
  and two countries' straight-line curves for comparative advantage, on one
  graph or side by side with where each meets the axes written there.
  Schematic or numbered. Common setups to start from.
- `/ad-as` **AD–AS Model**: aggregate demand, short-run aggregate supply
  and the vertical LRAS at full-employment output (Y_f), starting in
  long-run equilibrium or with a recessionary or inflationary gap braced
  under the axis; AD, SRAS and LRAS shifts, or a shift just far enough to
  bring output to Y_f (policy closing a gap, self-adjustment, growth). A
  straight or three-range (Keynesian) aggregate supply curve, or numbered
  from a typed schedule of price levels and real GDP with potential GDP,
  and a callout with a leader arrow giving the equilibrium. Common setups
  to start from.
- `/cost-revenue-curves` **Cost and Revenue Curves**: a firm's MC, ATC, AVC
  and AFC from one cubic total cost, so MC crosses AVC and ATC at their
  lowest points (set by where ATC is lowest, how steeply MC rises and how
  much cost is fixed). A perfectly competitive firm at a price above, at or
  below its costs, with profit or loss, break-even and shutdown points, and
  the market beside it setting the price; a monopoly with consumer surplus,
  deadweight loss and the socially optimal and fair-return prices; and
  monopolistic competition in the short run and the long run (demand
  tangent to ATC, excess capacity). Common setups to start from.
- `/<generator>`: on each one, the About button in the top bar opens a drawer
  with what it makes, what can be set, its example figures and frequently
  asked questions (`src/lib/site/generatorCopy.ts`, which also feeds the
  page's structured data).
- `/<generator>/examples/<slug>`: one example figure (see below).
- `/about`, `/privacy`, `/reuse`, `/sitemap.xml`, `/robots.txt`

Every page has the top bar: the site name and the current generator on the
left, and on a generator its About button, then links to the other STEM
Figures sites, on the right; the footer has the "Built by teacher.dev"
link. The directory's search box filters its cards as you type, searching
every STEM Figures site, and its last card is **Request a generator**.
Generators fill the window with no footer. The help button in the corner
opens the same kind of email dialog. Behind every page are faint economics
doodles: supply and demand, a bar chart, a production possibilities
frontier, a pie chart and a trend line.

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
  PNG download, and a numbered graph's values or the quiz answer key where the generator works them out, from
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
written (a misspelled choice, say), so a picture can't show a
different figure than its page describes.

### Redoing the pictures

After adding or changing an example, or changing how a generator draws, take
the pictures again. With the site running:

```sh
./scripts/agent-dev.mjs stemfigures/apps/economics                          # from the workspace root; prints its address
node --experimental-strip-types scripts/snapshot-examples.mjs --app=economics http://localhost:10003/  # from stemfigures/, with that address
```

It needs the Chromium Playwright installs (`npx playwright install chromium`).
Look at the pictures before committing them, and delete the PNG of an example
you removed or renamed.

## Code layout

```
src/routes/            SvelteKit pages
src/lib/site/          top bar, About drawer and page copy, Help, footer, SEO
src/lib/examples/      example figures, their pages' details and gallery
$shared/               ../../packages/shared: pieces shared with the other sites
src/lib/generators/    index.ts gives each generator its preview; one folder each
src/lib/graph/         the econ graph library every generator draws with
```

`src/lib/graph/` draws every economics graph. A generator works out its
curves in the graph's own units (`curves.ts`: straight, bowed, convex,
flat–slope–flat, any function, shifted copies, crossings) and describes a
panel: curves and their names, shaded regions, points, values at the axes
with dashed guides, shift arrows (`shifts.ts`), braces and callouts.
`panel.ts` lays it out on $shared/graph's grid, placing every label where it
touches nothing, and any label can be a blank line for students.
`figure.ts` puts one or two panels side by side with dashed lines across;
`EconFigure.svelte` draws them. `settings.ts` has the settings every graph
shares (schematic or numbered, color or black and white, axis words):
`AxesPicker` for schematic or numbered, in a generator's first card, and
`LookSettings` and `NumberSettings` as settings groups; `fit.ts` fits numbered
axes to the data. In a label, `_` lowers the next letter and `_{…}` everything
in the braces ($shared/graph/runs).

To add a generator: its entry in `packages/shared/src/catalog/economics.ts`,
a folder under `src/lib/generators/` with its builder and preview, its
preview in `generators/index.ts`, its route under `src/routes/`, and a
preview snapshot (see `packages/shared/README.md`). The directory, search and
sitemap pick it up from the catalog. Its page needs its words in
`src/lib/site/generatorCopy.ts`, and it should get a few examples in
`src/lib/examples/examples.ts` (with its settings type in `types.ts` and its
definition in `details.server.ts`).

## Development

```bash
npm install   # once, from the stemfigures repo root (npm workspaces)
../../../scripts/agent-dev.mjs stemfigures/apps/economics   # from the workspace, never npm run dev directly
npm run check   # svelte-check
npm run build
```

Deployed on Vercel with `@sveltejs/adapter-vercel`. The Cloudflare Web
Analytics token is read from `CF_BEACON_TOKEN`, which is set only in
Vercel's production environment.

