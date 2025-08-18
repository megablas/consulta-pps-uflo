import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Define la ruta base pública. En desarrollo, suele ser '/'.
  // Para despliegues en una subcarpeta (ej. GitHub Pages), sería '/nombre-repo/'.
  base: '/',
  server: {
    proxy: {
      '/airtable-api': {
        target: 'https://api.airtable.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/airtable-api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      // No external dependencies needed; Vite will bundle everything.
    },
  },
})
