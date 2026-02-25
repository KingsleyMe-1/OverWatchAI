import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/scrape': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/proxy': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
