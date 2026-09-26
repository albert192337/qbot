import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const socket=new WebSocket('wss://albertbeta.cn/rooms'),pending=new Map();let seq=0;
socket.onmessage=e=>{const f=JSON.parse(e.data);pending.get(f.requestId)?.(f);};
const request=f=>new Promise((resolve,reject)=>{const requestId=String(++seq),timer=setTimeout(()=>{pending.delete(requestId);reject(Error('Request timeout'));},15000);pending.set(requestId,r=>{clearTimeout(timer);pending.delete(requestId);resolve(r);});socket.send(JSON.stringify({...f,requestId}));});
try{
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 const hello=await request({t:'hello',protoVer:2,nickname:'花园上线巡检'});assert.equal(hello.garden,1);
 const state=await request({t:'garden:request',action:'get',actor:'garden-release-check'});assert.equal(state.ok,true);assert.ok(Array.isArray(state.state.friendBreeding));
 const invalid=await request({t:'garden:request',action:'act',actor:'garden-release-check',operation:`${Date.now()}-${randomUUID()}`,command:{type:'friendBreedAnswer',request:'nonexistent-release-check',accept:true}});
 assert.equal(invalid.ok,false);assert.match(invalid.error,/申请已处理或已过期/);
 console.log(JSON.stringify({ok:true,tls:true,friendBreeding:true,invalidRequestRejected:true,serverTime:hello.serverTime}));
}finally{socket.close();}
