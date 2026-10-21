import adapter from '@sveltejs/adapter-vercel'

/** @type {import('@sveltejs/kit').Config} */
export default {
  kit: {
    adapter: adapter(),
    // Code shared by the STEM Figures sites lives in packages/shared.
    alias: { $shared: '../../packages/shared/src' },
  },
}
