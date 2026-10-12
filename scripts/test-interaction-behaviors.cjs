// Actual chat handler, command router, approval engine and Electron surfaces; no paid API or live invitations.
const {app,BrowserWindow,ipcMain,protocol,session,screen}=require('electron');
const fs=require('node:fs/promises'),sync=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {build}=require('node:module').createRequire(require.resolve('vite'))('esbuild');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/interaction-behaviors');
app.setPath('userData',sync.mkdtempSync(path.join(os.tmpdir(),'qbot-interaction-ui-')));
protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.on('window-all-closed',()=>{});
const mocks={
 './interaction-behaviors':`export const performInteractionBehavior=async(actor,choice,reason,source)=>globalThis.commandQa.engine.propose(actor,{...choice,approvalText:choice.kind?'我可以和小白白一起喝茶吗？':undefined},reason,source);`,
 './config':`export const getSettings=async()=>globalThis.commandQa.settings;`,
 './characters':`export const getCharacter=async id=>globalThis.commandQa.characters.find(c=>c.dirId===id);`,
 './autonomy':`export const autonomy={get:()=>globalThis.commandQa.engine.get(),answer:(...a)=>globalThis.commandQa.engine.answer(...a),propose:(...a)=>globalThis.commandQa.engine.propose(...a)};export const behaviorOpportunities=async()=>globalThis.commandQa.choices;export const canRunUserCommand=async()=>true;`,
 './garden/journal-service':`export const generateMoment=async()=>{throw Error('No writing API in this test')};`,
 './brain-llm':`export const buildInput=async()=>({personaName:'小青',availableIntents:['idle'],memoryRevision:0,behaviorOpportunities:globalThis.commandQa.choices,desktopObjects:{source:'shell',items:[{id:'game',name:'逆水寒手游',kind:'shortcut'}]}});`,
 './llm-client':`export const BRAIN_MODEL='mock';export const chatCompleteWithRetry=async()=>{globalThis.commandQa.modelCalls++;return JSON.stringify({do:false,behavior:globalThis.commandQa.selected,action:'idle',say:['马上去找啦']})};`,
 './bubble':`export const beginChatThinking=()=>()=>{};`,
 './behavior-executor':`export const execute=()=>{throw Error('Pair must go through consent')};`,
 './idle-plan':`export const applyIdleDecision=()=>{};`,
 './user-memory':`export const queueMemoryExtraction=async()=>{};`,
 './conversation-memory':`export const rememberConversation=()=>{};export const setChatting=()=>{};`,
 './brain-log':`export const beginBrainCall=async()=>'';export const updateBrainCall=async()=>{};`,
};
const bundle=path.join(root,'app/out/main/interaction-behavior-qa.cjs');
const built=build({stdin:{contents:"export * from './app/src/main/desktop-icon-copies';export * from './app/src/main/pet-chat';export * from './app/src/main/autonomy-engine';export * from './app/src/main/behavior-audit';export * from './app/src/main/pet-hint';export * from './app/src/main/desktop-visibility';export * from './app/src/main/desktop-overlays';",resolveDir:root},outfile:bundle,bundle:true,platform:'node',external:['electron'],plugins:[{name:'isolated-command-dependencies',setup(b){
 b.onResolve({filter:/.*/},args=>['pet-chat.ts','pet-command.ts'].includes(path.basename(args.importer))&&mocks[args.path]?{path:args.path,namespace:'command-qa'}:undefined);
 b.onLoad({filter:/.*/,namespace:'command-qa'},args=>({contents:mocks[args.path],loader:'js'}));
}}]});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(fn,label,tries=350)=>{for(let n=0;n<tries;n++){if(await fn())return;await delay(100);}throw Error(label);};
app.whenReady().then(async()=>{try{
 await built;
 await fs.mkdir(out,{recursive:true});
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 const api=require(bundle);api.registerDesktopVisibility();api.registerDesktopOverlays(()=>true);api.registerPetHints();
 const base=path.join(root,'app/resources/presets/mascot'),manifest=JSON.parse(await fs.readFile(path.join(base,'manifest.json'),'utf8'));
 const host={dirId:'host',manifest:{...structuredClone(manifest),name:'小青'}},guest={dirId:'guest',manifest:{...structuredClone(manifest),name:'小白白'}};
 protocol.handle('qbot-asset',async req=>{const u=new URL(req.url),p=path.resolve(base,decodeURIComponent(u.pathname).replace(/^\//,''));if(!p.startsWith(base+path.sep))return new Response(null,{status:403});try{return new Response(await fs.readFile(p),{headers:{'Content-Type':p.endsWith('.webm')?'video/webm':p.endsWith('.json')?'application/json':'image/png'}});}catch{return new Response(null,{status:404});}});
 const area=screen.getPrimaryDisplay().workArea;
 const pet=new BrowserWindow({x:area.x+150,y:area.y+250,width:360,height:360,show:false,frame:false,transparent:true,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),backgroundThrottling:false}});
 const chat=new BrowserWindow({width:480,height:160,show:false,frame:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js')}});
 api.trackDesktopWindow(pet,'host');
 let dispatches=0,valid=true;const playback=[];const realInventory=await api.desktopInventory(true);assert.ok(realInventory.items.length>0);assert.ok(realInventory.items.every(i=>!('location' in i)));const gameObject=realInventory.items.find(o=>o.name==='逆水寒手游');const realCopy=gameObject?await api.desktopIconCopy(gameObject.id):null;const sampleImage=realCopy?.image||(await app.getFileIcon(process.execPath)).toDataURL();
 const choice={id:'local:guest:tea',behavior:'invite',kind:'tea',target:'guest',targetName:'小白白',label:'邀请本地角色小伙伴图标打闹',reason:'本地角色库',revision:'fixture'};
 const engine=new api.AutonomyEngine({audit:api.behaviorAudit,now:Date.now,valid:async()=>valid,publish:p=>pet.webContents.send('autonomy:proposal',p),execute:async p=>{dispatches++;pet.webContents.send('pet:menuCommand',p.opportunity.behavior==='iconPlay'?{type:'iconPlay',actor:'host',requestId:p.id,image:sampleImage}:{type:'pair',kind:p.opportunity.kind,guestId:p.opportunity.target,requestId:p.id});return 'sent';}});
 globalThis.commandQa={engine,choices:[choice],characters:[host,guest],settings:{activeCharacter:'host',arkApiKey:'QA-LOCAL-MOCK',freeMode:false,voiceEnabled:false,talkFrequency:'quiet'},modelCalls:0,selected:choice.id};
 const handlers={
  'petChat:send':(_,text)=>api.sendPetChat(text),'autonomy:get':()=>engine.get(),'autonomy:answer':(_,id,accept)=>engine.answer(id,accept),'autonomy:icons':()=>[],
  'relationships:recordLocal':()=>{},'social:contacts':()=>({available:false,invitations:[],people:[]}),
  'rooms:getStatus':()=>({phase:'off'}),'garden:weather':()=>({now:Date.now(),current:null,next:null,today:[],forecast:[]}),
  'garden:get':()=>({plots:[]}),'sign:getMessage':()=>null,'pet:getPerch':()=>null,'pet:perch':()=>({}),'pet:getCursor':()=>({x:0,y:0}),
  'behavior:getIdlePlan':()=>null,'settings:get':()=>globalThis.commandQa.settings,
  'progress:get':()=>({points:0,boxes:0,inventory:{},idleMs:0}),'characters:getActive':()=>host,'characters:list':()=>[host,guest],
  'characters:pairDialogue':()=>[], 'agent:getStatus':()=>({activity:'idle',sessions:0}),'meeting:getStatus':()=>({inMeeting:false}),'music:getStatus':()=>({playing:false}),
  'pet:setVisitMode':async(_,enter)=>pet.setBounds({width:enter?720:360,height:enter?600:360}),
 };
 for(const [id,fn]of Object.entries(handlers))ipcMain.handle(id,fn);
 ipcMain.on('autonomy:result',(_,id,outcome)=>playback.push({id,outcome}));
 await pet.loadFile(path.join(root,'app/out/renderer/pet/index.html'));await chat.loadFile(path.join(root,'app/out/renderer/chat/index.html'));pet.showInactive();chat.showInactive();
 const run=(w,s)=>w.webContents.executeJavaScript(s),submit=async()=>{await run(chat,`document.querySelector('#message').value='去找小白白';document.querySelector('#chat-form').requestSubmit()`);await until(()=>run(chat,`!document.querySelector('#send').disabled`),'chat command completes');};
 await until(()=>run(pet,`[...document.querySelectorAll('#stage video')].some(v=>v.currentTime>0)`),'actor playing');
 await submit();const hint=()=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('pet-hint/index.html'));
 await until(()=>hint()?.isVisible(),'command approval visible');
 assert.equal(dispatches,0);assert.equal(await run(pet,`!!document.querySelector('#pair-interaction')`),false);
 assert.match(await run(hint(),'document.body.innerText'),/我可以和小白白一起喝茶吗/);
 assert.equal(await run(chat,`document.querySelector('#status').textContent`),'','success adds no explanatory text');
 await fs.writeFile(path.join(out,'approval.png'),(await hint().webContents.capturePage()).toPNG());
 await fs.writeFile(path.join(out,'chat.png'),(await chat.webContents.capturePage()).toPNG());
 await run(hint(),`document.querySelectorAll('#invitation-actions button')[1].click()`);
 await until(()=>!engine.get(),'rejection clears proposal');assert.equal(dispatches,0);
 assert.equal((await api.behaviorAudit.list()).at(-1).outcome,'rejected');
 // Same command immediately after refusal is a new explicit request, not proactive nagging.
 await submit();await until(()=>hint()?.isVisible(),'second manual request visible');
 await run(hint(),`document.querySelector('#invitation-actions button').click();document.querySelector('#invitation-actions button').click()`);
 await until(()=>run(pet,`document.querySelector('#pair-interaction')?.dataset.beat==='0'`),'consented fight starts');
 assert.equal(dispatches,1);
 await fs.writeFile(path.join(out,'fight.png'),(await pet.webContents.capturePage()).toPNG());
 await until(()=>run(pet,`!document.querySelector('#pair-interaction')&&!document.body.classList.contains('pair-returning')`),'fight ends naturally');
 assert.ok(playback.some(e=>e.outcome==='completed'));assert.equal(globalThis.commandQa.modelCalls,2);
 await submit();await until(()=>hint()?.isVisible(),'third request visible');valid=false;
 await run(hint(),`document.querySelector('#invitation-actions button').click()`);await until(()=>!engine.get(),'stale request removed');
 const events=await api.behaviorAudit.list();assert.equal(events.at(-1).outcome,'cancelled');assert.equal(dispatches,1);
 assert.ok(events.every(e=>e.source==='user'));

 valid=true;const icon={id:'icon:game',behavior:'iconPlay',target:'game',targetName:'逆水寒手游',label:'抛玩逆水寒手游图标副本',reason:'图片副本',revision:'fixture'};
 globalThis.commandQa.choices=[icon];globalThis.commandQa.selected=icon.id;
 await run(chat,`document.querySelector('#message').value='扔一下逆水寒手游的图标';document.querySelector('#chat-form').requestSubmit()`);
 await until(()=>run(pet,`!!document.querySelector('.pet-icon-copy')`),'named icon copy appears');
 assert.equal(await run(chat,`document.querySelector('#status').textContent`),'');
 await delay(650);
 await fs.writeFile(path.join(out,'icon-play.png'),(await pet.webContents.capturePage()).toPNG());
 await until(()=>run(pet,`!document.querySelector('.pet-icon-copy')`),'icon copy finishes');
 const iconId=playback.find(e=>e.id!==playback[0].id&&e.outcome==='started')?.id;assert.ok(iconId);assert.ok(playback.some(e=>e.id===iconId&&e.outcome==='completed'));
 // A new explicit gesture cancels the prop, never leaves it floating forever.
 await run(chat,`document.querySelector('#message').value='再玩一下这个图标';document.querySelector('#chat-form').requestSubmit()`);
 await until(()=>run(pet,`!!document.querySelector('.pet-icon-copy')`),'second icon starts');
 await run(pet,`document.querySelector('#stage').dispatchEvent(new PointerEvent('pointerdown',{button:0,pointerId:9}))`);
 await until(()=>run(pet,`!document.querySelector('.pet-icon-copy')`),'pointer cancels icon');
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify({ok:true,dispatches,modelCalls:globalThis.commandQa.modelCalls,model:'local deterministic mock; no paid API',desktop:{source:realInventory.source,count:realInventory.items.length,gameMatches:realInventory.items.filter(o=>o.name.includes('逆水寒')).map(o=>o.name)},playback,events:await api.behaviorAudit.list(),checks:['ordinary chat form to production parser','named consent without command prefix','decline and repeated consent','pair natural completion','stale consent cancelled','named icon finite playback','gesture cancellation','OS desktop namespace enumeration','no success small text']},null,2));
 pet.destroy();chat.destroy();console.log('PASS: ordinary chat -> approval -> actual pair; named icon copy -> finite playback, no paid API');app.exit(0);
 }catch(e){console.error(e);app.exit(1);}});
