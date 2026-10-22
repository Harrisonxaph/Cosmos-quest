import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    // The 3D scene chunk (Three.js) is about 700 kB and loads only after the page and facts are shown.
    chunkSizeWarningLimit: 800,
  },
});
