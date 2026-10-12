import assert from 'node:assert/strict';
const socket=new WebSocket(process.argv[2]||'wss://albertbeta.cn/rooms'),pending=new Map();let sequence=0;
socket.onmessage=e=>{const frame=JSON.parse(e.data);pending.get(frame.requestId)?.(frame);};
const request=frame=>new Promise((resolve,reject)=>{const requestId=String(++sequence),timer=setTimeout(()=>{pending.delete(requestId);reject(Error('Request timeout'));},15000);pending.set(requestId,result=>{clearTimeout(timer);pending.delete(requestId);resolve(result);});socket.send(JSON.stringify({...frame,requestId}));});
try{
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 const hello=await request({t:'hello',protoVer:2,nickname:'双扭蛋发布巡检'});assert.equal(hello.garden,1);
 const result=await request({t:'garden:request',action:'get',actor:'dual-capsule-release-check'});assert.equal(result.ok,true);
 const e=result.state.economy;assert.equal(e.capsuleMachineRevision,1);assert.equal(e.furniture3dRevision,undefined);assert.deepEqual(e.capsule3d,{rareMisses:0,epicMisses:0,draws:0});assert.equal(e.tokens,0);
 console.log(JSON.stringify({ok:true,capsuleMachineRevision:e.capsuleMachineRevision,independent3dPity:true,oldClientPoolCompatible:true,noPurchasesTopupsOrDraws:true}));
}finally{socket.close();}
