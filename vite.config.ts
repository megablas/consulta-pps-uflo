import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      // FIX: Corrected invalid JavaScript object syntax in the manifest configuration.
      // Keys were malformed (e.g., `name"`) and properties were missing commas.
      manifest: {
        "name": "Mi Panel Académico",
        "short_name": "Mi Panel",
        "description": "Una aplicación para que los estudiantes consulten de forma segura el estado de sus Prácticas Profesionales Supervisadas (PPS) y prácticas realizadas.",
        "theme_color": "#2563eb",
        "background_color": "#f8fafc",
        "display": "standalone",
        "scope": "/consulta-pps-uflo/",
        "start_url": "/consulta-pps-uflo/",
        "icons": [
          {
            "src": "icons/icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
          },
          {
            "src": "icons/icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // Ruta base para producción en GitHub Pages
  // FIX: Added a missing comma to separate this property from the next one.
  base: '/consulta-pps-uflo/',
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