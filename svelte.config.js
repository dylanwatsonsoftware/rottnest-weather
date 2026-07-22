import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import adapter from '@sveltejs/adapter-vercel'

/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    files: {
      assets: 'public'
    }
  }
}
