import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 5174, host: true },
  preview: { port: 4174, host: true },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
