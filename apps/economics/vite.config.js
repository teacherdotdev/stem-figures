import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [sveltekit()],
  // Expose the Cloudflare Web Analytics token (set in Vercel) to client code.
  envPrefix: ['VITE_', 'CF_BEACON_TOKEN'],
})
