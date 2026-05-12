import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // El proxy solo aplica en desarrollo local.
    // En producción el frontend llama directamente al backend via VITE_API_URL.
    proxy: {
      '/api':     'http://localhost:3001',
      '/webhook': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
  },
});
