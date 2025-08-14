
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Esto es crucial para GitHub Pages. Le dice a Vite que la aplicación
  // se servirá desde una subcarpeta llamada '/consulta-pps-uflo/'.
  // Todas las rutas de los assets en el index.html construido tendrán este prefijo.
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
      // Especifica los módulos que deben dejarse como externos y no empaquetarse.
      // Esto es crucial cuando se usan importmaps, ya que le dice a Vite
      // que no intente resolver estas dependencias durante la compilación,
      // porque serán proporcionadas por el navegador en tiempo de ejecución.
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-dom/client',
        '@google/genai',
        'xlsx'
      ],
    },
  },
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})
