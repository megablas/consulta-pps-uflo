import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: El valor 'base' debe coincidir con el subdirectorio de tu sitio en GitHub Pages.
  // Para la URL https://megablas.github.io/consulta-pps-uflo/, el valor correcto es '/consulta-pps-uflo/'.
  base: '/consulta-pps-uflo/',
})
