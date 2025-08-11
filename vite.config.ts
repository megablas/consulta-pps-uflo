import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import express from './api/index';

const expressApiPlugin = (): Plugin => ({
  name: 'express-api-plugin',
  configureServer: (server) => {
    server.middlewares.use('/api', express);
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), expressApiPlugin()],
  // Esto es crucial para GitHub Pages. Le dice a Vite que la aplicación
  // se servirá desde una subcarpeta llamada '/consulta-pps-uflo/'.
  // Todas las rutas de los assets en el index.html construido tendrán este prefijo.
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