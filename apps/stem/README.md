# STEM Figures

The home of the STEM Figures family: free generators for clean, printable
figures that teachers paste into tests, worksheets and slides. Live at
**https://stemfigures.com**, a teacher.dev project. See `CONTEXT.md` for the
vocabulary and `docs/adr/` for decisions.

The family's figure sites, each its own app in this monorepo (`apps/`) and
its own domain:

- [Math Figures](https://mathfigures.com)
- [Physics Figures](https://physicsfigures.com)
- [Chemistry Figures](https://chemistryfigures.com)
- [Biology Figures](https://biologyfigures.com)
- [Engineering Figures](https://engineeringfigures.com)
- [Econ Figures](https://econfigures.com)

## Pages

- `/` **Directory**: every figure site as a card linking out to it.
- `/sitemap.xml`, `/robots.txt`

Searching every generator across the family from here is planned; see
`docs/adr/0001-family-search-from-site-manifests.md`.

## Code layout

```
src/routes/            SvelteKit pages
src/lib/sites.ts       every figure site in the family
src/lib/site/          top bar, footer, SEO, site config
static/sites/          each figure site's favicon, copied from its app
```

To add a figure site: copy its `apps/<site>/static/favicon.svg` to `static/sites/`, add
one entry to `src/lib/sites.ts`, and add STEM Figures' link to that site's
`SISTER_SITES`.

## Development

```bash
npm install   # once, from the stemfigures repo root (npm workspaces)
../../../scripts/agent-dev.mjs stemfigures/apps/stem --no-pocketbase   # from the workspace, never npm run dev directly
npm run check   # svelte-check
npm run build
```

Deployed on Vercel with `@sveltejs/adapter-vercel`. The Cloudflare Web
Analytics token is read from `CF_BEACON_TOKEN`, which is set only in
Vercel's production environment.
