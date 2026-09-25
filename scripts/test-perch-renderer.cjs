// Real renderer/preload with local generated media and mocked IPC; no paid calls.
const {app,BrowserWindow,ipcMain,protocol,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'qbot-perch-renderer-'));
app.setPath('userData',path.join(dir,'profile'));
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{stream:true,supportFetchAPI:true,bypassCSP:true}}]);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));
 const ffmpeg=require('../app/node_modules/ffmpeg-static');
 execFileSync(ffmpeg,['-y','-f','lavfi','-i','color=c=tan:s=128x128:r=12','-t','1','-an','-c:v','libvpx-vp9',path.join(dir,'fixture.webm')],{stdio:'ignore',windowsHide:true});
 const realDir=process.env.QBOT_PERCH_CHARACTER;
 protocol.handle('qbot-asset',request=>new Response(fs.readFileSync(realDir?path.join(realDir,decodeURIComponent(new URL(request.url).pathname)):path.join(dir,'fixture.webm')),{headers:{'Content-Type':'video/webm'}}));
 const manifest=realDir?JSON.parse(fs.readFileSync(path.join(realDir,'manifest.json'),'utf8')):{id:'test',name:'fixture',actions:Object.fromEntries(['idle','drag','perch_sit','perch_lie','tea'].map(id=>[id,{status:'done',webm:id+'.webm'}]))};
 const action=realDir?'perch_lie':'perch_sit', perchFile=manifest.actions[action].webm;
 let dock=null, detached=0, perchRequests=0, edgeRequests=0, acceptDrop=false;
 for(const [key,fn]of Object.entries({'settings:get':()=>({voiceEnabled:false,talkFrequency:'quiet',freeMode:true,behaviorMode:'free'}),
 'characters:getActive':()=>({dirId:'test',manifest}),'garden:get':()=>({plots:[]}),
 'progress:get':()=>({points:100,boxes:0,inventory:{},lastTickAt:Date.now()}),'agent:getStatus':()=>({activity:'idle',sessions:0}),
 'meeting:getStatus':()=>({inMeeting:false}),'music:getStatus':()=>({playing:false}),'sign:getMessage':()=>null,'behavior:getIdlePlan':()=>null,
 'pet:getPerch':()=>dock,'pet:perch':()=>{perchRequests++;if(acceptDrop){dock={action,title:'Fixture'};win.webContents.send('pet:perch',dock);}return {ok:acceptDrop};},
 'desktop:get':()=>({revision:0,hidden:false,hiddenMembers:[],peek:null}),
 'desktop:drop':()=>{edgeRequests++;return false;},
 }))ipcMain.handle(key,fn);
 const win=new BrowserWindow({width:360,height:360,show:false,webPreferences:{offscreen:true,backgroundThrottling:false,preload:path.join(root,'app/out/preload/index.js')}});
 ipcMain.on('pet:detachPerch',()=>{detached++;dock=null;win.webContents.send('pet:perch',null);});
 await win.loadFile(path.join(root,'app/out/renderer/pet/index.html'));
 const read=()=>win.webContents.executeJavaScript(`(()=>{const v=[...document.querySelectorAll('#stage video')].find(v=>v.style.visibility==='visible'),h=document.getElementById('pet-hud');return {ready:v?.readyState,width:v?.videoWidth,src:v?.src,loop:v?.loop,hud:h?getComputedStyle(h).visibility:null}})()`);
 for(let i=0;i<60&&!(await read()).src;i++)await wait(100);
 dock={action,title:'Fixture'};win.webContents.send('pet:perch',dock);await wait(300);
 assert.ok((await read()).src.includes(perchFile));assert.equal((await read()).hud,'hidden');assert.equal((await read()).loop,true);
 win.webContents.send('agent:status',{activity:'working',sessions:1});
 win.webContents.send('behavior:action',{action:'tea',loops:1,preview:true});await wait(1300);
 assert.ok((await read()).src.includes(perchFile),'status and auto actions cannot replace the perched pose');
 for(let i=0;i<80&&!((await read()).ready>=2&&(await read()).width>0);i++)await wait(100);
 assert.ok((await read()).ready >= 2 && (await read()).width > 0,'actual clip decoded successfully');
 await win.webContents.executeJavaScript(`{const s=document.getElementById('stage');s.setPointerCapture=()=>{};s.hasPointerCapture=()=>false;for(const type of ['pointerdown','pointerup'])s.dispatchEvent(new PointerEvent(type,{button:0,isPrimary:true,pointerId:1,screenX:100,screenY:100,clientX:100,clientY:100}));} void 0`);
 await wait(300);assert.equal((await read()).hud,'visible','single click reveals controls');
 const before=detached;
 await win.webContents.executeJavaScript(`{const s=document.getElementById('stage');s.dispatchEvent(new PointerEvent('pointerdown',{button:0,isPrimary:true,pointerId:2,screenX:100,screenY:100}));s.dispatchEvent(new PointerEvent('pointermove',{button:0,isPrimary:true,pointerId:2,screenX:150,screenY:150}));s.dispatchEvent(new PointerEvent('pointerup',{button:0,isPrimary:true,pointerId:2,screenX:150,screenY:150}));} void 0`);
 await wait(1800);assert.ok(detached>before);assert.equal((await read()).hud,'visible');
 assert.equal(perchRequests,1,'releasing a drag attempts window docking');
 assert.equal(edgeRequests,1,'a drop without a window can still enter screen-edge peek');
 if(!realDir)assert.ok(!(await read()).src.includes(perchFile)); // A sticker may reuse its idle clip for perching.
 acceptDrop=true;
 await win.webContents.executeJavaScript(`{const s=document.getElementById('stage');for(const [type,x] of [['pointerdown',100],['pointermove',150],['pointerup',150]])s.dispatchEvent(new PointerEvent(type,{button:0,isPrimary:true,pointerId:3,screenX:x,screenY:x}));} void 0`);
 await wait(500);assert.equal(perchRequests,2);assert.equal(edgeRequests,1,'successful window docking skips edge peek');
 assert.ok((await read()).src.includes(perchFile));assert.equal((await read()).hud,'hidden');
 console.log('PASS: perched animation loops, status cannot override, HUD hidden until single click, dragging exits and restores controls');app.exit(0);
}catch(e){console.error(e);app.exit(1);}});
