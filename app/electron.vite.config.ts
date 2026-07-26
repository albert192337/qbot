import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    // @qbot/pipeline 是 workspace 包，打进 main bundle（免打包期 node_modules 链接问题）；
    // ffmpeg-static 保持 external：它按 __dirname 定位二进制，bundle 会破坏路径
    plugins: [externalizeDepsPlugin({ exclude: ['@qbot/pipeline'] })],
    build: {
      rollupOptions: {
        external: ['ffmpeg-static'],
      },
    },
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
          room: resolve(__dirname, 'src/renderer/room/index.html'),
          bubble: resolve(__dirname, 'src/renderer/bubble/index.html'),
        },
      },
    },
  },
});
