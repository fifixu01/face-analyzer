import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves the site from /face-analyzer/, so production asset paths need that prefix.
  base: mode === 'production' ? '/face-analyzer/' : '/',
  plugins: [react(), tailwindcss()],
}));
