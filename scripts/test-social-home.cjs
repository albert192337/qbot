if(!process.versions.electron){
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const child=require('node:child_process').spawn(require('../app/node_modules/electron'),[__filename],{env,stdio:'inherit',windowsHide:true});child.on('exit',c=>process.exitCode=c??1);setTimeout(()=>child.kill(),60000).unref();
}else{
 const {app,BrowserWindow,ipcMain,session,protocol}=require('electron');const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
 const root=path.resolve(__dirname,'..');app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-social-home-')));
 protocol.registerSchemesAsPrivileged([{scheme:'qbot-asset',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
 app.whenReady().then(async()=>{try{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 protocol.handle('qbot-asset',()=>new Response('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="70"><rect x="15" y="26" width="30" height="40" rx="14" fill="#729585"/><circle cx="30" cy="21" r="18" fill="#e9c9ab"/><path d="M12 20Q10 0 30 1Q50 0 48 20L40 13L20 13" fill="#534f4e"/></svg>',{headers:{'content-type':'image/svg+xml'}}));
 let room=null,invites=0,mode='',failVisit=false;const people=[{id:'alice',nickname:'小夏',character:'森林来客',title:'',online:true,relation:'friend'},{id:'bob',nickname:'橘子汽水',character:'午后小猫',title:'',online:true,relation:'friend'},{id:'offline',nickname:'晚安',character:'月亮',title:'',online:false,relation:'friend'},{id:'request',nickname:'新朋友',character:'小鸟',title:'',online:true,relation:'incoming'}];
 const handlers={
 'overlays:get':()=>({revision:0,winner:null}),'roomPet:getCache':()=>({hello:{nickname:'吴邪',memberId:'test:own'},character:null,state:{mode:'idle'}}),
 'desktop:get':()=>({hiddenMembers:[],hidden:false}), 'social:profile':()=>({nickname:'我',character:{dirId:'self',manifest:{name:'张起灵'}},actions:[],pose:'',favorites:[]}),
 'rooms:getCache':()=>({status:{phase:room?'in-room':'off',memberId:'test:me',socialReady:true},room,chat:[]}),
 'social:contacts':()=>({available:true,reason:'',people,invitations:[]}), 'steam:get':()=>({phase:'off',label:'未连接 Steam',reason:'',friends:[]}),
 'social:guests':()=>[{id:'own',name:'吴邪',source:'角色库',character:{dirId:'own'}},{id:'cached',name:'缓存角色',source:'房友缓存',character:{dirId:'cached'}}],
 'rooms:list':()=>[{roomId:'ABCD1234',name:'午后的花园茶会',description:'一起喝茶，看看今日的新花',kind:'idle',online:2,capacity:6,language:'zh',lastActiveAt:1}],
 'social:world':()=>[], 'garden:visit':(_,id)=>{if(failVisit)throw Error('offline');return {owner:id,name:'小夏',offers:id==='bob'?[]:[{kind:'spray',item:'moon',price:260,limit:1},{kind:'spray',item:'charm',price:180,limit:1},{kind:'seed',item:'strawberry',price:30,limit:3}],day:20723,actorName:'森林来客',actorLevel:5,shopOpen:id!=='bob',landOpen:true};},
 'social:prepareJoin':()=>true,'rooms:create':()=>{room={roomId:'PRIVATE',name:'我的小屋',members:[],capacity:6,ownerId:'test:me'};},'social:contactAction':()=>{invites++;},
 'social:startTest':()=>{room={roomId:'LOCAL',name:'我的小屋',testing:true,capacity:6,ownerId:'test:me',members:[{memberId:'test:me',nickname:'我',online:true}]};},
 'social:inviteTest':(_,id)=>{room.members.push({memberId:'test:'+id,nickname:'吴邪',online:true,testing:true});},'rooms:setDisplayMode':(_,value)=>{mode=value;},'rooms:getDisplayMode':()=>mode,
 'rooms:leave':()=>{room=null;}
 };for(const [k,v] of Object.entries(handlers))ipcMain.handle(k,v);
 const win=new BrowserWindow({width:960,height:800,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:true}});const js=s=>win.webContents.executeJavaScript(s);const wait=ms=>new Promise(r=>setTimeout(r,ms));const until=async s=>{for(let n=0;n<100;n++){if(await js(s))return;await wait(50);}throw Error('timeout '+s);};
 const output=path.join(root,'output/social-home');fs.mkdirSync(output,{recursive:true});const shot=async n=>{await wait(250);fs.writeFileSync(path.join(output,n+'.png'),(await win.webContents.capturePage()).toPNG());};
 await win.loadFile(path.join(root,'app/out/renderer/social/index.html'));await until('document.querySelectorAll(".contact-row").length===2 && document.querySelectorAll(".own-guest").length===1 && document.querySelectorAll(".room-card").length===1');
 assert.equal(await js('!!document.querySelector("[data-page=friends],[data-page=world],.welcome")'),false);assert.equal(await js('document.querySelector("#room-strip").hidden'),true);
 await shot('home');await js('document.querySelector("[data-contact-id=alice] .contact-name").click()');await until('document.querySelectorAll(".friend-offer").length===3');await shot('friend-shop');
 await js('document.querySelector("[data-contact-id=bob] .contact-name").click()');await until('document.body.textContent.includes("朋友暂未开放商店")');
 await js('document.querySelector("[data-contact-tab=friends]").click()');assert.equal(await js('document.querySelectorAll(".contact-row").length'),4);
 await js('document.querySelector("[data-contact-tab=online]").click()');
 await js('document.querySelector("[data-contact-id=alice] .contact-actions button").click()');await until('!document.querySelector("#room-strip").hidden');assert.equal(invites,1);assert.equal(room.roomId,'PRIVATE');
 await js('document.querySelector("#leave").click()');await until('document.querySelector("#room-strip").hidden');
 await js('document.querySelector(".own-guest button").click()');await until('document.querySelector(".own-guest button").disabled');assert.equal(mode,'desktop');assert.equal(room.members.length,2);assert.equal(await js('[...document.querySelectorAll("#members button")].some(b=>b.textContent.includes("商店"))'),false);
 win.setSize(560,760);await wait(150);assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);await shot('narrow');
 const peer=new BrowserWindow({width:240,height:300,show:false,webPreferences:{preload:path.join(root,'app/out/preload/index.js'),offscreen:true}});
 await peer.loadFile(path.join(root,'app/out/renderer/pet/index.html'),{query:{roomPet:'1'}});await wait(300);
 await peer.webContents.executeJavaScript('document.querySelector("#stage").dispatchEvent(new PointerEvent("pointerenter"))');await wait(100);
 assert.equal(await peer.webContents.executeJavaScript('document.querySelector("[aria-label=查看房友的花园]").hidden'),true);
 peer.webContents.send('roomPet:hello',{nickname:'好友',memberId:'alice'});await wait(100);await peer.webContents.executeJavaScript('document.querySelector("#stage").dispatchEvent(new PointerEvent("pointerenter"))');await wait(100);
 assert.equal(await peer.webContents.executeJavaScript('document.querySelector("[aria-label=查看房友的花园]").hidden'),false);
 console.log('PASS: unified home, online filtering, private shop, details, friend invitation, own desktop invitation, shared garden controls, narrow layout. '+output);app.exit(0);
 }catch(e){console.error(e);app.exit(1);}});
}
