// Isolated production renderers. Domain commands run against fixture state; network is blocked.
const {app,BrowserWindow,ipcMain,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/direction-c-client');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-direction-c-')));
app.on('window-all-closed',()=>{});
const ts=require('../node_modules/typescript');require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(fn,label)=>{for(let n=0;n<200;n++){if(await fn())return;await wait(100);}throw Error(label);};
setTimeout(()=>app.exit(2),90000).unref();
app.whenReady().then(async()=>{let win,strip;const errors=[],checks=[];try{
 fs.mkdirSync(out,{recursive:true});session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 const {initialGarden,transition}=require('../app/src/main/garden/rules.ts');let id=0;const rng={id:()=>`fixture-${++id}`,random:()=>.5};let garden=initialGarden(Date.now(),rng),settings={voiceEnabled:true,gardenRenderMode:'3d'};
 const {gardenWeather}=require('../app/src/shared/garden-weather.ts');
 let historyActor='current',roomState=null,roomSaves=0,chatExpanded=false,roomStatus={phase:'off'},opened='',closed=0,seed=null,gardenUnavailable=false;
 const broadcast=(channel,value)=>BrowserWindow.getAllWindows().forEach(w=>w.webContents.send(channel,value));
 const handlers={
 'garden:get':()=>gardenUnavailable?new Promise(()=>{}):garden,'garden:weather':()=>gardenWeather(),
 'garden:act':(_e,command)=>{try{const result=transition(garden,command,Date.now(),rng);garden=result.state;broadcast('garden:changed');return {ok:true,...result};}catch(e){return {ok:false,error:e.message};}},
 'garden:showVisit':(_e,owner)=>{broadcast('garden:sceneVisit',owner?{owner,name:'阿圆',plots:[null,garden.plots[0]],plotCount:2,offers:[],day:0,visibility:'friends',actorLevel:1,landOpen:true,shopOpen:false}:null);},
 'garden:visit':(_e,owner)=>({owner,name:'阿圆',plots:[null,garden.plots[0]],plotCount:2,offers:[],day:0,visibility:'friends',actorLevel:1,landOpen:true,shopOpen:false}),'garden:journalStatus':()=>({enabled:false,configured:false}),
 'settings:get':()=>settings,'settings:set':(_e,patch)=>{settings={...settings,...patch};broadcast('settings:changed',settings);},
 'characters:list':()=>[],'characters:getActive':()=>null,'social:contacts':()=>({available:true,people:[{id:'ABCDEFGHIJKL',nickname:'阿圆',relation:'friend',online:true}],invitations:[]}),
 'social:guests':()=>[],'rooms:getCache':()=>({status:roomStatus,room:null,chat:[]}),'rooms:getStatus':()=>roomStatus,
 'desktop:get':()=>({revision:0,hidden:false,hiddenMembers:[],peek:null}),'overlays:get':()=>({winner:null}),
 'room:get3d':()=>roomState,'room:save3d':(_e,v)=>{roomState=v;roomSaves++;return v;},
 'petChat:history':()=>({actor:historyActor,lines:historyActor==='other'?[]:[{role:'user',text:'你好',at:Date.now()},{role:'assistant',text:'下午好',at:Date.now()}]}),
 'petChat:send':()=>({ok:true}),
 };
 for(const [key,fn] of Object.entries(handlers))ipcMain.handle(key,fn);
 ipcMain.on('panel:navigate',(_e,page)=>{win.setContentSize(page==='room'?1000:420,page==='room'?640:560);});
 ipcMain.on('ui:openConsole',(_e,p)=>{opened=p;});ipcMain.on('panel:close',()=>{closed++;});
 ipcMain.on('garden:focusPlot',(_e,index)=>broadcast('garden:focusPlot',index));
 ipcMain.on('garden:selectSeed',(_e,s)=>{seed=s;broadcast('garden:seed',s);});
 ipcMain.on('petChat:resize',(_e,v)=>{chatExpanded=v;win.setContentSize(380,v?370:132);});
 const make=(width,height)=>{const w=new BrowserWindow({width,height,frame:false,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),contextIsolation:true,sandbox:false,offscreen:true,backgroundThrottling:false}});w.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});return w;};
 win=make(420,560);const js=s=>win.webContents.executeJavaScript(s),child=s=>js(`document.querySelector('iframe').contentWindow.eval(${JSON.stringify(s)})`);
 const load=(name,query={})=>win.loadFile(path.join(root,'app/out/renderer',name,'index.html'),{query});
 const shot=name=>win.webContents.capturePage().then(img=>fs.writeFileSync(path.join(out,name+'.png'),img.toPNG()));
 await load('panel',{page:'menu'});await until(()=>js(`document.body.innerText.includes('1 人在线')`),'menu real contacts');
 assert.equal(await js(`document.querySelectorAll('[role=tab]').length`),4);await js(`document.querySelector('[aria-label="静音"]').click()`);await wait(100);assert.equal(settings.voiceEnabled,false);
 await shot('menu');await js(`document.querySelector('[role=tab][aria-label="角色"]').click()`);await until(()=>js(`document.body.innerText.includes('装扮市场')`),'character root');await js(`document.querySelector('[aria-label="装扮市场"]').click()`);assert.equal(opened,'market');checks.push('menu tabs, actual friend count, mute, market on character root');
 win.webContents.send('panel:page','phone');await until(()=>js(`document.querySelectorAll('.c-app').length===6`),'phone apps');await shot('phone');
 await js(`document.querySelector('[aria-label="我的房间"]').click()`);await until(()=>child(`document.body.dataset.ready==='true'`),'real room embedded renderer');
 const original=await child('window.tea3d.layout');const point=await child('window.tea3d.project(window.tea3d.layout[0].key)');
 const offset=await js(`(()=>{const r=document.querySelector('iframe').getBoundingClientRect();return{x:r.x,y:r.y}})()`);
 const mouse={x:Math.round(point.x+offset.x),y:Math.round(point.y+offset.y)};
 win.webContents.sendInputEvent({type:'mouseDown',...mouse,button:'left',clickCount:1});win.webContents.sendInputEvent({type:'mouseUp',...mouse,button:'left',clickCount:1});await wait(100);
 assert.deepEqual(await child('window.tea3d.layout'),original);assert.equal(await child(`document.querySelector('#selection').hidden`),true);checks.push('room defaults to visit, existing furniture is not selected or moved');
 await child(`document.querySelector('.item[data-asset="lantern"]').click()`);assert.equal((await child('window.tea3d.layout')).length,original.length);
 await child(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`);assert.equal((await child('window.tea3d.layout')).length,original.length);checks.push('furniture ghost does not consume inventory; Escape cancels');
 await child(`document.querySelector('#companion-edit').click();window.tea3d.select(window.tea3d.layout[0].key);document.querySelector('#remove').click();document.querySelector('#companion-edit').click()`);
 await until(()=>Promise.resolve(roomSaves>0),'finish saves real room');assert.equal(roomState.layout.length,original.length-1);await shot('room');checks.push('edit reclaim and Finish persist through existing room API');
 await js(`document.querySelector('[aria-label="返回"]').click()`);await until(()=>js(`document.querySelectorAll('.c-app').length===6`),'room back phone');
 win.webContents.send('panel:page','garden');await until(()=>child(`document.querySelectorAll('.companion-seed').length>0`),'garden iframe bridge and seeds');
 await child(`document.querySelector('.companion-seed[title="草莓"]').click()`);await until(()=>Promise.resolve(!!seed),'selected seed IPC');const count=garden.seeds.length;
 strip=make(1000,720);await strip.loadFile(path.join(root,'app/out/renderer/garden/index.html'),{query:{view:'strip'}});await until(()=>strip.webContents.executeJavaScript(`!!document.querySelector('.farm-plot')`),'3D garden');strip.webContents.send('garden:seed',seed);await wait(100);
 await strip.webContents.executeJavaScript(`document.querySelector('.farm-plot').click()`);await until(()=>Promise.resolve(garden.seeds.length===count-1),'actual plant command');assert.ok(garden.plots[0]);checks.push('choose seed in compact panel then click 3D plot uses real transition');
 await until(()=>child(`document.body.innerText.includes('×1')`),'bag updates actual quantity');
 win.setContentSize(304,380);win.webContents.send('garden:page','plot:1');await until(()=>child(`document.querySelector('h2')?.textContent==='2号土地'`),'compact empty plot');
 assert.equal(await child(`document.querySelectorAll('.seed-card,.batch-sow,canvas').length`),0);
 assert.ok(await child(`document.querySelectorAll('.companion-seed').length>0`));
 assert.equal(await child(`document.documentElement.scrollWidth>innerWidth`),false);await shot('garden');checks.push('small empty plot keeps compact seed grid without extra canvases or horizontal overflow');
 const ownCount=await strip.webContents.executeJavaScript(`document.querySelectorAll('.farm-plot').length`);const own=JSON.stringify(garden.plots);win.webContents.send('garden:page','visit:ABCDEFGHIJKL');await until(()=>strip.webContents.executeJavaScript(`document.querySelectorAll('.farm-plot').length===2`),'friend garden replaces scene');
 await strip.webContents.executeJavaScript(`document.querySelector('.farm-plot[data-plot="1"]').click()`);await until(()=>child(`document.querySelector('.spatial-visit .card')!==null`),'friend plot contextual operations');assert.equal(JSON.stringify(garden.plots),own);
 win.webContents.send('garden:page','bag');await until(()=>strip.webContents.executeJavaScript(`document.querySelectorAll('.farm-plot').length===${ownCount}`),'return own scene');checks.push('friend scene selection cannot mutate own plants; return restores own garden');strip.destroy();strip=null;
 await load('chat');win.setContentSize(380,132);await js(`document.querySelector('#history-toggle').click()`);await until(()=>js(`document.querySelector('#history').innerText.includes('下午好')`),'chat real history');assert.equal(chatExpanded,true);assert.equal(await js(`document.querySelector('#public-chat').hidden`),true);
 await js(`document.querySelector('#emoji-toggle').click();document.querySelector('#emoji-picker button').click()`);assert.equal(await js(`document.querySelector('#message').value`),'😊');assert.equal(chatExpanded,false);checks.push('history expansion, emoji insertion, public hidden outside room');
 roomStatus={phase:'in-room'};win.webContents.send('rooms:status',roomStatus);await wait(100);assert.equal(await js(`document.querySelector('#public-chat').hidden`),false);await js(`document.querySelector('#history-toggle').click()`);await wait(100);await shot('chat');
 historyActor='other';win.webContents.send('characters:activated',{dirId:'other',manifest:{name:'另一个角色'}});await until(()=>js(`document.querySelector('#history').innerText===''`),'character history isolated');checks.push('switching current actor clears prior chat');

 gardenUnavailable=true;await load('garden',{view:'shop'});await until(()=>js(`document.querySelector('.garden-load-error button')?.textContent==='重试'`),'stalled initial garden read exposes retry');
 gardenUnavailable=false;await js(`document.querySelector('.garden-load-error button').click()`);await until(()=>js(`document.querySelector('#app').textContent.includes('今日小店')`),'retry recovers existing shop');checks.push('stalled first load times out and retry restores shop');

 // Exercise the production native panel owner, including fixed-size resizing and hidden lifecycle.
 const {build}=require('node:module').createRequire(require.resolve('vite'))('esbuild');
 const bundle=path.join(root,'app/out/main/direction-c-window-qa.cjs');
 globalThis.panelQa={pet:new BrowserWindow({width:184,height:184,show:false}),shown:0,hidden:0};
 await build({entryPoints:[path.join(root,'app/src/main/desktop-panel.ts')],outfile:bundle,bundle:true,platform:'node',external:['electron'],plugins:[{name:'panel-qa',setup(b){
  b.onResolve({filter:/windows$|desktop-visibility$/},a=>path.basename(a.importer)==='desktop-panel.ts'?{path:a.path,namespace:'panel-qa'}:undefined);
  b.onLoad({filter:/.*/,namespace:'panel-qa'},a=>({contents:a.path==='./windows'?'export const getPetWindow=()=>globalThis.panelQa.pet;':a.path==='./garden/windows'?'export const showGardenWorkspace=()=>{globalThis.panelQa.shown++};export const closeGardenWorkspace=()=>{globalThis.panelQa.hidden++};':'export const allowDesktopWindow=()=>{};export const trackDesktopWindow=()=>{};',loader:'js'}));
 }}]});
 const owner=require(bundle);for(const event of ['panel:navigate','panel:close','panel:ignore'])ipcMain.removeAllListeners(event);owner.registerDesktopPanel();
 const before=new Set(BrowserWindow.getAllWindows());owner.openDesktopPanel('menu');
 const native=BrowserWindow.getAllWindows().find(w=>!before.has(w));
 await until(()=>Promise.resolve(native.isVisible()),'native small window ready');
 const small=native.getBounds();assert.ok(Math.abs(small.width-304)<=3);assert.ok(Math.abs(small.height-380)<=4);
 owner.openDesktopPanel('room');await until(()=>Promise.resolve(native.getBounds().width>small.width+100),'native room resize while not resizable');
 assert.equal(native.isResizable(),false);
 owner.openDesktopPanel('garden');await until(()=>Promise.resolve(globalThis.panelQa.shown>0),'garden workspace starts');
 native.hide();const shown=globalThis.panelQa.shown;globalThis.panelQa.pet.emit('move');assert.equal(globalThis.panelQa.shown,shown,'hidden panel must not reopen garden when pet moves');
 assert.ok(globalThis.panelQa.hidden>0);native.destroy();globalThis.panelQa.pet.destroy();delete process.env.ELECTRON_RENDERER_URL;
 checks.push('production native panel resizes and hidden garden stays closed on pet movement');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:true,checks,errors},null,2));console.log('PASS '+checks.length+' production interaction checks');app.exit(0);
 }catch(e){console.error(e.stack);if(win&&!win.isDestroyed())fs.writeFileSync(path.join(out,'failure.png'),(await win.webContents.capturePage()).toPNG());fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:false,checks,errors,error:String(e)},null,2));app.exit(1);}
});
