const { app, BrowserWindow, ipcMain, session } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const root = path.resolve(__dirname, '../..'), rendered = path.join(root, 'app/out/renderer');
const core = require(path.join(root, 'rooms/generated/garden-core.cjs'));
app.setPath('userData', fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'qbot-figma-export-')));
const wait = ms => new Promise(r => setTimeout(r, ms));
const titles = { bag: '01 背包', daily: '02 今日小店', shop: '03 种植补给', book: '04 植物图鉴' };
app.whenReady().then(async () => {
 try {
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
   const u = new URL(details.url);
   cb({cancel: ['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol) && !['127.0.0.1', 'localhost', 'mcp.figma.com'].includes(u.hostname)});
  });
  let id = 0; const now = Date.now(), rng = { random: () => .5, id: () => `review-${++id}` };
  const state = core.initialGarden(now, rng); core.ensureLife(state, now, rng, 'pet'); core.enableV3(state, now); state.coins = 5000;
  state.produce = [{id:'review-fruit',species:'strawberry',traits:['juicy'],kg:.872,value:26,bred:false,growthVersion:3,revealed:true}];
  ipcMain.handle('garden:get', () => state); ipcMain.handle('settings:get', () => ({gardenRenderMode:'2d'}));
  ipcMain.handle('overlays:get', () => ({revision:0,winner:null})); ipcMain.handle('characters:getActive', () => null);
  const server = http.createServer((req, res) => {
   const url = new URL(req.url, 'http://127.0.0.1:43127');
   const file = path.resolve(rendered, '.' + decodeURIComponent(url.pathname));
   if (!file.startsWith(rendered + path.sep) || !fs.existsSync(file)) {res.writeHead(404);res.end();return;}
   const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'};
   res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
   if(file.endsWith('.html')) {
    const title = titles[url.searchParams.get('view')] || '小小花园';
    res.end(fs.readFileSync(file,'utf8').replace('<title>小小花园</title>',`<title>${title}</title>`).replace('</head>','<script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script></head>'));
   } else fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(43127,'127.0.0.1',r));
  const win = new BrowserWindow({width:900,height:800,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:true,backgroundThrottling:false}});
  win.webContents.on('console-message', e => console.log('PAGE',e.level,e.message));
  win.webContents.on('did-fail-load', (_,code,msg,url) => console.log('FAIL',code,msg,url));
  console.log('READY');
  let last = '';
  const timeout = setTimeout(()=>app.exit(0),20*60*1000);
  while(true){
   let job; try{job=JSON.parse(fs.readFileSync(path.join(__dirname,'export-job.json'),'utf8'));}catch{await wait(200);continue;}
   if(job.id===last){await wait(200);continue;} last=job.id;
   if(job.exit){clearTimeout(timeout);server.close();app.exit(0);return;}
   const endpoint = `https://mcp.figma.com/mcp/capture/${job.id}/submit?bindVariables=true`;
   await win.loadURL(`http://127.0.0.1:43127/garden/index.html?view=${job.page}#figmacapture=${job.id}&figmaendpoint=${encodeURIComponent(endpoint)}&figmadelay=2000`);
   await wait(3500);
   const check = await win.webContents.executeJavaScript(`({title:document.title,tabs:[...document.querySelectorAll('#app > nav.tabs button')].map(b=>b.textContent),capture:!!window.figma,content:!!document.querySelector('.content')})`);
   console.log('OPENED', job.page, JSON.stringify(check));
   fs.writeFileSync(path.join(__dirname,'export-status.json'),JSON.stringify({job,check}));
  }
 }catch(e){console.error(e);app.exit(1);}
});
