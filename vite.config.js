import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'Utils/popUpHandling.js',
      formats: ['iife'],
      name: 'PopupHandler',
      fileName: () => 'popUpHandling.js'
    }
  }
});