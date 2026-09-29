import { build } from '../../app/node_modules/vite/dist/node/index.js';
import path from 'node:path';
const root=process.cwd();
await build({configFile:false,root:path.join(root,'app/src/renderer'),base:'./',build:{outDir:path.join(root,'output/character-game/preview'),rollupOptions:{input:path.join(root,'app/src/renderer/nursery/index.html')}}});

