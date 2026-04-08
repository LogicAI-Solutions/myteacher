import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5273,
    allowedHosts: ['http://localhost:5273', 'myteacherapp.com.br', 'www.myteacherapp.com.br'],
    proxy: {
      '/api': {
        target: 'http://backend:8501',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
