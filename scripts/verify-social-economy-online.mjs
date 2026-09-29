import assert from 'node:assert/strict';
const socket=new WebSocket(process.argv[2]||'wss://albertbeta.cn/rooms'),pending=new Map();let seq=0;
socket.onmessage=e=>{const f=JSON.parse(e.data);pending.get(f.requestId)?.(f);};
const request=f=>new Promise((resolve,reject)=>{const requestId=String(++seq),timer=setTimeout(()=>{pending.delete(requestId);reject(Error('Request timeout'));},15000);pending.set(requestId,r=>{clearTimeout(timer);pending.delete(requestId);resolve(r);});socket.send(JSON.stringify({...f,requestId}));});
try{
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 const hello=await request({t:'hello',protoVer:2,nickname:'家具经济上线巡检'});assert.equal(hello.garden,1);
 const result=await request({t:'garden:request',action:'get',actor:'economy-release-check'});
 assert.equal(result.ok,true);assert.equal(result.state.economy.version,4);assert.equal(result.state.economy.capsuleRevision,2);assert.equal(result.state.economy.tokens,0);
 assert.ok(Array.isArray(result.state.economy.wishes));assert.ok(result.state.economy.travel);
 console.log(JSON.stringify({ok:true,economyVersion:4,capsuleRevision:2,wishes:result.state.economy.wishes.length,travel:true,noPurchasesOrTopups:true}));
}finally{socket.close();}
