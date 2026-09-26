const mode=process.argv[2]??'inspect';
const expressions={
 inspect:'JSON.stringify({pid:process.pid,path:e.app.getAppPath(),windows:e.BrowserWindow.getAllWindows().map(w=>({id:w.id,url:w.webContents.getURL()}))})',
 quit:'(()=>{setTimeout(()=>e.app.quit(),150);return "Normal quit requested"})()',
 open:'(()=>{e.ipcMain.emit("garden:open",{},"friends");return "Friends garden opened"})()',
 verify:'(async()=>{const w=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes("/garden/index.html")&&!w.webContents.getURL().includes("view=strip"));if(!w)throw Error("Garden window missing");return JSON.stringify(await w.webContents.executeJavaScript('+JSON.stringify('(async()=>{const s=await window.qbot.garden.get();return {online:s.online,newBreedingApi:Array.isArray(s.friendBreeding),page:document.body.textContent.includes("朋友的花园与小店"),friendCards:[...document.querySelectorAll("button")].filter(b=>b.textContent.includes("看土地")).length}})()')+'))})()'
};
const gardenJs={
 visitFirst:'(()=>{const b=[...document.querySelectorAll("button")].find(b=>b.textContent.includes("看土地"));if(!b)throw Error("No friend card");b.click();return "Opened first friend"})()',
 refreshTest:'(()=>{const b=document.querySelector(".garden-test-refresh");if(!b)throw Error("Test refresh button missing");b.click();return "Clicked test refresh"})()',
 testState:'(()=>{const text=document.body.textContent;return {testButton:!!document.querySelector(".garden-test-refresh"),refreshed:text.includes("测试作物已刷新"),breed:[...document.querySelectorAll("button")].filter(b=>b.textContent==="申请繁育").length,cultivate:[...document.querySelectorAll("button")].filter(b=>b.textContent==="帮忙培育").length}})()',
 showTest:'(()=>{document.querySelectorAll(".result-popup button").forEach(b=>b.click());document.querySelector(".garden-test-refresh")?.scrollIntoView({block:"start"});return "Test crops ready"})()'
};
for(const [key,code] of Object.entries(gardenJs))expressions[key]='(async()=>{const w=e.BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes("/garden/index.html")&&!w.webContents.getURL().includes("view=strip"));if(!w)throw Error("Garden window missing");return JSON.stringify(await w.webContents.executeJavaScript('+JSON.stringify(code)+'))})()';
(async()=>{
 if(!expressions[mode])throw Error('Unknown mode');
 const targets=await fetch('http://127.0.0.1:9229/json').then(r=>r.json());
 const ws=new WebSocket(targets[0].webSocketDebuggerUrl),timer=setTimeout(()=>{ws.close();process.exitCode=1;console.error('Inspector timeout');},15000);
 ws.onopen=()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:'(()=>{const e=process.getBuiltinModule("module").createRequire(process.cwd()+"/package.json")("electron");'+(mode==='verify'?'return ':'return ')+expressions[mode]+'})()',returnByValue:true,awaitPromise:true}}));
 ws.onmessage=event=>{const r=JSON.parse(event.data);if(r.id!==1)return;clearTimeout(timer);if(r.result?.exceptionDetails){console.error(JSON.stringify(r.result.exceptionDetails));process.exitCode=1;}else console.log(r.result.result.value);ws.close();};
})().catch(e=>{console.error(e.message);process.exitCode=1;});
