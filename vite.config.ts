import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [ react() ],
  server: {
    port: 5174,
    open: false
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 3000
  },
  test: {
    environment: 'jsdom',
    include: [ 'test/**/*.spec.{js,ts}' ]
  }
});
