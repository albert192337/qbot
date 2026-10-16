const fs=require('node:fs');
async function evaluate(target,expression){
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 try{return await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('CDP timeout')),25000);
  ws.onmessage=e=>{const r=JSON.parse(e.data);if(r.id!==1)return;clearTimeout(timeout);if(r.error||r.result.exceptionDetails)reject(Error(JSON.stringify(r)));else resolve(r.result.result.value);};
  ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
 });}finally{ws.close();}
}
async function targets(){return fetch('http://127.0.0.1:9326/json/list').then(r=>r.json());}
(async()=>{
 const pet=(await targets()).find(t=>t.url.endsWith('/pet/index.html'));if(!pet)throw Error('Missing formal pet');
 const before=await evaluate(pet,"(async()=>({summary:await window.qbot.pinball.get(),chestVisible:!!document.querySelector('.hud-chest')?.getClientRects().length,title:document.querySelector('.hud-chest')?.title}))()");
 await evaluate(pet,'window.qbot.pinball.open()');
 const overlay=(await targets()).find(t=>t.url.endsWith('/desktop-pinball/index.html'));if(!overlay)throw Error('Missing overlay');
 const state=await evaluate(overlay,"(()=>{const s=window.pinballPreview.state();return {formal:s.formal,ready:s.ready,icons:s.icons.length,coins:s.wallet.coins,balls:s.wallet.balls,temporaryPanel:!!document.querySelector('.shelf')};})()");
 const after=await evaluate(pet,'window.qbot.pinball.get()');
 const legacy=JSON.parse(fs.readFileSync('output/desktop-pinball/profile/wallet.json','utf8'));
 if(!before.chestVisible||!state.formal||!state.ready||!state.icons||state.temporaryPanel||before.summary.balls!==after.balls||before.summary.coins!==after.coins||legacy.coins!==after.coins)throw Error(JSON.stringify({before,state,after,legacyCoins:legacy.coins}));
 const report={before,state,after,legacyCoins:legacy.coins,noDebitOnOpen:true};
 fs.writeFileSync('output/formal-pinball/live-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
