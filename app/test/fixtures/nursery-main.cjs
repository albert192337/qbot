// Isolated Electron UI fixture: real preload/player/assets, simulated generation. No network.
const { app, BrowserWindow, ipcMain, protocol, session } = require('electron');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const preset = path.join(root, 'app/resources/presets/mascot');
app.setPath('userData', process.env.QBOT_QA_DATA);
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{stream:true,supportFetchAPI:true,bypassCSP:true}}]);
app.whenReady().then(async () => {
  const manifest = JSON.parse(await readFile(path.join(preset,'manifest.json'),'utf8'));
  const qa = global.qa = { calls:[], status:null, manifest, active:null, win:null, failActivate:false };
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_request,cb)=>cb({cancel:true}));
  protocol.handle('qbot-asset',async request=>{
    const url=new URL(request.url);const relative=decodeURIComponent(url.pathname).replace(/^\//,'');
    const filename=path.join(preset,relative);
    if(!filename.startsWith(preset+path.sep))return new Response(null,{status:403});
    try{
      const bytes=await readFile(filename);const type=filename.endsWith('.webm')?'video/webm':'image/png';
      return new Response(bytes,{headers:{'Content-Type':type,'Cache-Control':'no-store'}});
    }catch{return new Response(null,{status:404});}
  });
  qa.settings={generationMode:'cloud',developerMode:false};qa.progress={points:2000,boxes:2,idleMs:300000,inventory:{painting:10,plant:1},lastTickAt:Date.now()};qa.decor=[];
  qa.rooms={status:{phase:'online',memberId:'me'},room:null,chat:[]};
  const handlers={
    'settings:set':(_e,patch)=>{qa.settings={...qa.settings,...patch};qa.calls.push(['settings',patch]);qa.win.webContents.send('settings:changed',qa.settings);},
    'studio:getPrompts':()=>({actions:{},turnaroundPrompt:'A warm companion',imageProvider:'seedream'}),
    'studio:savePersona':(_e,id,text)=>{qa.calls.push(['persona',id,text]);manifest.persona=text;},
    'studio:saveAgentActions':(_e,id,config)=>{qa.calls.push(['scenes',id,config]);manifest.agentActions=config;},
    'progress:get':()=>qa.progress,
    'progress:openBox':async()=>{qa.calls.push(['box']);await new Promise(r=>setTimeout(r,150));qa.progress={...qa.progress,points:qa.progress.points-500,boxes:qa.progress.boxes-1,inventory:{...qa.progress.inventory,painting:11}};return {ok:true,stickerId:'painting',tier:'common',progress:qa.progress};},
    'progress:craft':()=>{qa.calls.push(['craft']);return {ok:false,error:'测试库存不足'};},
    'decor:get':()=>qa.decor,
    'decor:set':(_e,name,placements)=>{qa.calls.push(['decor',name,placements]);if(qa.failDecor)throw new Error('保存失败，请重试');qa.decor=placements;},
    'market:list':()=>[],
    'claude:getStatus':()=>false,
    'agent:getStatus':()=>({activity:'idle',sessions:0}),
    'behavior:getRules':()=>[],
    'behavior:getExecutorState':()=>({current:null,queue:[]}),
    'perception:get':()=>({foregroundMonitor:{status:'disabled',platform:'darwin'},events:[],ledger:{apps:{},totalSwitches:0,eventCount:0},decisions:[]}),
    'rooms:getDisplayMode':()=>qa.mode??'desktop',
    'rooms:setDisplayMode':(_e,mode)=>{qa.mode=mode;qa.calls.push(['mode',mode]);return mode;},
    'rooms:getCache':()=>qa.rooms,
    'rooms:list':()=>[{roomId:'12345678',name:'午后的书房',kind:'study',online:1,members:1,lastActiveAt:Date.now(),capacity:8,listed:true}],
    'rooms:isSecure':()=>true,
    'rooms:join':(_e,roomId)=>{qa.calls.push(['join',roomId]);qa.rooms={status:{phase:'in-room',memberId:'me'},room:{roomId,name:'午后的书房',kind:'study',ownerId:'me',capacity:8,listed:true,members:[{memberId:'me',nickname:'测试朋友',online:true}]},chat:[]};qa.win.webContents.send('rooms:status',qa.rooms.status);qa.win.webContents.send('rooms:history',[]);return qa.rooms.room;},
    'rooms:leave':()=>{qa.calls.push(['leave']);qa.rooms={status:{phase:'online',memberId:'me'},room:null,chat:[]};},
    'rooms:toggleFavorite':()=>['12345678'],

    'settings:get':()=>qa.settings,
    'hatch:cloudAccount':()=>({connected:true,credits:3,providers:['seedream']}),
    'hatch:start':(_e,...args)=>{qa.calls.push(['start',...args]);qa.status={stage:'turnaround',cloud:true,running:true,actions:{}};return 'new-friend';},
    'hatch:getStatus':()=>qa.status,
    'hatch:pickTurnaround':(_e,id,index)=>{qa.calls.push(['pick',id,index]);qa.status={...qa.status,stage:'actions',actions:{idle:{status:'done'},drag:{status:'generating_video'}}};},
    'hatch:resume':()=>{qa.calls.push(['resume']);qa.status={...qa.status,running:true,stage:'actions',error:undefined};},
    'hatch:redo':()=>{qa.calls.push(['redo']);qa.status={...qa.status,running:true,stage:'actions',error:undefined};},
    'characters:list':()=>[
      {dirId:'mascot',manifest,hasUnfinishedJob:false},
      ...(qa.status?[{dirId:'new-friend',manifest:{...manifest,name:'栗子'},hasUnfinishedJob:qa.active!=='new-friend'}]:[]),
    ],
    'characters:activate':(_e,id)=>{qa.calls.push(['activate',id]);if(qa.failActivate)throw new Error('领取暂时失败，请重试');qa.active=id;},
    'characters:rename':(_e,id,name)=>qa.calls.push(['rename',id,name]),
    'characters:getActive':()=>({dirId:'mascot',manifest,hasUnfinishedJob:false}),
    'ui:returnToDesktop':()=>{qa.calls.push(['desktop']);},
  };
  for(const [channel,handler] of Object.entries(handlers))ipcMain.handle(channel,handler);
  ipcMain.on('ui:openConsole',(_e,pane)=>{qa.calls.push(['console',pane]);qa.win.webContents.send('ui:showScreen',pane);});
  ipcMain.on('rooms:open',()=>qa.win.webContents.send('ui:showScreen','lounge'));
  ipcMain.on('rooms:chat',(_e,text)=>qa.calls.push(['chat',text]));
  ipcMain.on('room:openHome',()=>qa.calls.push(['room']));
  const win=qa.win=new BrowserWindow({width:1120,height:760,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),contextIsolation:true,sandbox:false}});
  const pushVisibility=()=>win.webContents.send('ui:nurseryVisibility',win.isVisible()&&!win.isMinimized());
  for(const event of ['show','hide','minimize','restore'])win.on(event,pushVisibility);
  qa.push=status=>{qa.status=status;win.webContents.send('hatch:cloudStatus',{dirId:'new-friend',status});};
  await win.loadFile(path.join(root,'app/out/renderer/nursery/index.html'));
});
app.on('window-all-closed',()=>app.quit());
