# A generator copied onto two sites (now three)

Until now every generator in the catalog lived on one site, its only address, and other sites could list it with `alsoOn`, linking across to that site. Length Reading breaks that rule: it is a generator on both Math Figures (`mathfigures.com/length-reading`) and Chemistry Figures (`chemistryfigures.com/length-reading`). Measuring with a ruler is as much a math lesson (reading to the nearest quarter inch, measuring from a point other than 0) as a chemistry lab skill (the estimated digit), and a math teacher sent to chemistryfigures.com for it lands on a site whose other generators are not for them.

## Decision

1. **Each site has its own copy of the generator.** Math's `src/lib/generators/length-reading/` is a copy of Chemistry's, and each site draws, exports and saves it on its own, like any of its own generators. Math's copy uses the reading pieces in `packages/shared` (magnifier, marks, figure frame, title settings) where Chemistry uses its own copies of them, and `objectKinds.ts` holds the part of Chemistry's Volume by Displacement objects it needs.
2. **The catalog has an entry on each site with the same id.** Ids are unique within a site rather than across the catalog. Each entry follows its own site's style (Math's names end in "Generator"). The preview snapshot is keyed by id, so both entries share one.
3. **A site's directory shows only its own copy.** Searching Math Figures doesn't show Chemistry's copy again under Chemistry Figures, or the other way round. A site with neither shows both, each under its site.

## Considered Options

- **List it on Math with `alsoOn`**: no new code, but Math's card links away to chemistryfigures.com, which is the problem.
- **Move the generator into `packages/shared` and import it on both sites**: one copy to keep up, but a change for one site's teachers changes the other's, against the rule that each site is independent, and it would pull Chemistry's own reading pieces into the package with it.

## Consequences

A fix or feature in Length Reading has to be made in every copy, or deliberately left off some; the copies may drift, and that is allowed. Another generator put on two sites should follow the same pattern.

## A third site (2026-10-19)

Physics Figures (`physicsfigures.com/length-reading`) now has a third copy, with its own catalog entry named in Physics' style ("Length Reading Generator"). Physics and Chemistry teachers asked for a caliper and a micrometer; rather than two new generators, the generator is named after the measurement, length, and both copies gained an instrument choice: ruler (still the default), caliper and micrometer.

- **Physics and Chemistry** have all three instruments. Physics' copy was made from Math's, so it uses the `packages/shared` reading pieces as Math's does, with `objectKinds.ts` for the ruler's objects. Diff the two folders (`apps/physics/src/lib/generators/length-reading` and `apps/chemistry/src/lib/generators/length-reading`): they should differ only in imports, the page's name, and Chemistry's `linking.ts` and Physics' `objectKinds.ts`.
- **Math's copy deliberately stays ruler only.** Its ruler files still match the other two copies' apart from imports; the instrument choice, the caliper and micrometer files and the settings they add are left off. A ruler fix belongs in all three copies.
- The ruler's settings and drawing didn't change, so links and pictures made before still draw the same figure on every site. The directory preview, keyed by id and shared by all three entries, stays the ruler.
