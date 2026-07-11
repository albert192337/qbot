import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          pet: resolve(__dirname, 'src/renderer/pet/index.html'),
          hatch: resolve(__dirname, 'src/renderer/hatch/index.html'),
        },
      },
    },
  },
});
