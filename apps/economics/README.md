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
- `/cost-revenue-curves` **Cost and Revenue Curves**: a firm's MC, ATC, AVC
  and AFC from one cubic total cost, so MC crosses AVC and ATC at their
  lowest points (set by where ATC is lowest, how steeply MC rises and how
  much cost is fixed). A perfectly competitive firm at a price above, at or
  below its costs, with profit or loss, break-even and shutdown points, and
  the market beside it setting the price; a monopoly with consumer surplus,
  deadweight loss and the socially optimal and fair-return prices; and
  monopolistic competition in the short run and the long run (demand
  tangent to ATC, excess capacity). Common setups to start from.
- `/about`, `/privacy`, `/reuse`, `/sitemap.xml`, `/robots.txt`

Every page has the top bar: the site name, the current generator, and links
to the other STEM Figures sites; the footer has the "Built by teacher.dev"
link. The directory's search box filters its cards as you type, searching
every STEM Figures site, and its last card is **Request a generator**.
Generators fill the window with no footer. The help button in the corner
opens the same kind of email dialog. Behind every page are faint economics
doodles: supply and demand, a bar chart, a production possibilities
frontier, a pie chart and a trend line.

A generator's settings live in the page address, so a link opens the same
figure, and the server renders that figure on first load (see ADR 0001).
Saved presets stay in the browser's localStorage.

## Code layout

```
src/routes/            SvelteKit pages
src/lib/site/          top bar, Help, footer, SEO and structured data, site config
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
shares (schematic or numbered, color or black and white, axis words) with
`LookSettings` and `NumberSettings` as their groups; `fit.ts` fits numbered
axes to the data. In a label, `_` lowers the next letter and `_{…}` everything
in the braces ($shared/graph/runs).

To add a generator: its entry in `packages/shared/src/catalog/economics.ts`,
a folder under `src/lib/generators/` with its builder and preview, its
preview in `generators/index.ts`, its route under `src/routes/`, and a
preview snapshot (see `packages/shared/README.md`). The directory, search and
sitemap pick it up from the catalog.

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
