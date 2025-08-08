import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: El valor 'base' debe coincidir con el subdirectorio de tu sitio en GitHub Pages.
  // Para la URL https://megablas.github.io/consulta-pps-uflo/, el valor correcto es '/consulta-pps-uflo/'.
  base: '/consulta-pps-uflo/',
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