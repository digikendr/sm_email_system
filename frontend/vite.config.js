import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/bill': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
      '/invoice': 'http://localhost:3000',
      '/pdfs': 'http://localhost:3000'
    }
  }
})
