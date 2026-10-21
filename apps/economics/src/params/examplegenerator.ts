// A generator with example figures, for /<generator>/examples/<slug>.

import type { ParamMatcher } from '@sveltejs/kit'
import { EXAMPLE_GENERATORS } from '$lib/examples/examples'

export const match: ParamMatcher = (param) => (EXAMPLE_GENERATORS as string[]).includes(param)
