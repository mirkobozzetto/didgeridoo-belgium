// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap'

// Site statique : le build (dossier dist/) est servi par le serveur Hono.
export default defineConfig({
  site: 'https://didgeridoo.top',
  output: 'static',
  integrations: [
    sitemap({
      // Pages privées ou sans intérêt SEO.
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/verifier-email') &&
        !page.includes('/reinitialiser') &&
        !page.includes('/mes-propositions'),
    }),
  ],
  build: {
    // Assets référencés en chemins relatifs -> robuste derrière un reverse proxy.
    assets: '_assets',
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
