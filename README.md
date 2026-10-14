# STEM Figures

Free generators for clean, printable figures that teachers paste into tests,
worksheets and slides, a teacher.dev project. This monorepo holds every site
in the family. Each is its own SvelteKit app, deployed as its own Vercel
project on its own domain.

| App                | Site                                                 | Vercel root directory |
| ------------------ | ---------------------------------------------------- | --------------------- |
| `apps/stem`        | [stemfigures.com](https://stemfigures.com)           | `apps/stem`           |
| `apps/math`        | [mathfigures.com](https://mathfigures.com)           | `apps/math`           |
| `apps/physics`     | [physicsfigures.com](https://physicsfigures.com)     | `apps/physics`        |
| `apps/chemistry`   | [chemistryfigures.com](https://chemistryfigures.com) | `apps/chemistry`      |
| `apps/biology`     | [biologyfigures.com](https://biologyfigures.com)     | `apps/biology`        |
| `apps/engineering` | [engineeringfigures.com](https://engineeringfigures.com) | `apps/engineering` |

`packages/shared` holds components and helpers used by more than one site,
imported as `$shared/...` (an alias set in each app's `svelte.config.js`).
Move something there only when the sites that use it want the same code; a
site that needs its own version keeps it in its `src/lib/`.

Each app came from its own repo (EdTech-a-thon/mathfigures and so on) with
its full history, so `git log -- apps/math` shows the site's past commits.

## Development

```bash
npm install                    # once, at the repo root: installs every app
../scripts/agent-dev.mjs stemfigures/apps/math   # from the workspace, never npm run dev directly
npm run check                  # svelte-check in every app
npm test                       # vitest in every app and packages/shared
npm run build                  # build every app
npm run build -w apps/math     # or just one
```

## Deployment

Each Vercel project points at this repo with its **Root Directory** set to its
app (table above), and keeps its own domains and environment variables
(`CF_BEACON_TOKEN` for Cloudflare Web Analytics). Each app's `vercel.json`
installs from the repo root and only deploys `main` (production) and `dev`
(preview); pushes to other branches create no deployments. Its ignore step,
`scripts/vercel-ignore.sh`, skips a build when nothing in that app,
`packages/`, or the root package files changed since that project's last
deployment on the branch.

`apps/math` and `apps/physics` vendor different builds of Caret, so
`apps/physics/vendor` stamps its copies `0.0.0-physics`, and `.npmrc` sets
`legacy-peer-deps` so npm can install both. `apps/biology/vendor` (Punnett
Square's cross) holds Physics's build restamped `0.0.0-biology`, so updating
one site's Caret never changes the other's.

## License

The code is open source under the Apache License 2.0 (`LICENSE.txt`).

The figures are a separate matter. Everything the sites contribute to a
figure a teacher makes, and every example picture, is dedicated to the public
domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/):
use it anywhere, without asking or giving credit. We can only waive our own
rights, so anything original a teacher adds stays theirs. The terms live in
`packages/shared/src/license.ts`. Exported SVGs and PNGs carry them as
metadata, as do the directory previews, and every site, Engineering and
STEM Figures included, explains them at `/reuse`. Why CC0:
`packages/shared/docs/adr/0002-figures-are-cc0.md`. Any new way of saving a
figure should write the same metadata (`SVG_METADATA`, `withLicense`).
