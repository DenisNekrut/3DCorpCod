import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages project site: https://denisnekrut.github.io/3DCorpCod/
  base: '/3DCorpCod/',
  plugins: [react()],
  server: { host: '0.0.0.0' },
});
