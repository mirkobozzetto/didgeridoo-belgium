// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

// Site statique : le build (dossier dist/) est servi par le serveur Hono.
export default defineConfig({
  output: 'static',
  build: {
    // Assets référencés en chemins relatifs -> robuste derrière un reverse proxy.
    assets: '_assets',
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
