const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  const root = path.resolve(__dirname, '..');
  const { build } = await import(pathToFileURL(require.resolve('vite', { paths: [path.join(root, 'app')] })).href);
  await build({ configFile: false, root: path.join(root, 'app/src/renderer'), base: './', build: {
    outDir: path.join(root, 'app/out/renderer'), emptyOutDir: false,
    rollupOptions: { input: { roomlab: path.join(root, 'app/src/renderer/roomlab/index.html'), diyroom: path.join(root, 'app/src/renderer/diyroom/index.html'), tearoom: path.join(root, 'app/src/renderer/tearoom/index.html'), cozy: path.join(root, 'app/src/renderer/cozy/index.html') } },
  } });
})().catch(e => { console.error(e); process.exitCode = 1; });
