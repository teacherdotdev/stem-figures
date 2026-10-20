# EdTech-a-thon Agent Instructions

This project was created as a prototype during the 3-day "EdTech-a-thon" event by a team with varying technical expertise. Now we want to host it long-term.

### Default Web App Tech Stack

- Runtime: Bun
- Package manager: Bun
- Language: Typescript
- Build tool: Vite-based tooling
- Linter: ESLint (for JS/TS projects)
- Formatter: Prettier (for JS/TS projects; by default, create a blank prettier config file that does not modify any settings)
- Framework: SvelteKit if using Svelte or Astro if not
- UI Library: Svelte
- UI / Styling: Tailwind CSS
- UI Rendering Method: Prefer DOM elements over canvas when possible for the sake of accessibility, using canvas only when it is unreasonable not to
- Data & Persistence: Follow this hierarchy — no data, then `localStorage`, then Supabase only if real accounts or shared persistence are strictly necessary

### STEM Figures monorepo

- Every site is an app under `apps/`, each deployed as its own Vercel project with that folder as its Root Directory. Keep each site's behavior independent: a change to one app must not change another site.
- Install once at the repo root (`npm install`); npm workspaces link `apps/*` and `packages/*`. Don't add per-app lockfiles.
- Code used by more than one site lives in `packages/shared` and is imported as `$shared/...`. Changing a file there changes every site that imports it, so check and build each of those apps. A site that needs a different version keeps its own copy in its `src/lib/`.
- Every generator is listed in `packages/shared/src/catalog/`, with the one site it lives on and any other sites that list it (`alsoOn`). Every directory searches all of them. See `packages/shared/README.md` for adding one. The exception is a generator copied onto several sites, each with its own entry and code (Length Reading, on Math, Physics and Chemistry, Math's with the ruler only): change every copy (`packages/shared/docs/adr/0001-a-generator-on-two-sites.md`).
- Start an app with `./scripts/agent-dev.mjs stemfigures/apps/<app>` from the workspace root.
