import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/consulta-pps-uflo/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: {
      rollupOptions: {
        // No external dependencies needed; Vite will bundle everything.
      },
    },
    // Expose specific env variables to the client-side code under process.env
    define: {
      'process.env.VITE_AIRTABLE_PAT': JSON.stringify(env.VITE_AIRTABLE_PAT),
      'process.env.VITE_AIRTABLE_BASE_ID': JSON.stringify(env.VITE_AIRTABLE_BASE_ID)
    }
  }
})
