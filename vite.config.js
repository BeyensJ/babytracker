import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_BUILD_NUMBER ? `1.0.${process.env.VITE_APP_BUILD_NUMBER}` : '1.0.0'),
    __APP_BUILD_NUMBER__: JSON.stringify(process.env.VITE_APP_BUILD_NUMBER || 'dev'),
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
})
