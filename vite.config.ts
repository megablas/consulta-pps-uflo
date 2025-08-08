import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Using a relative base path is more robust for GitHub Pages deployments.
  // It ensures that asset paths are relative to the index.html file.
  base: './',
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
})