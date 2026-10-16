import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import {newWallet,replenish,simulate,settle,playback,advanceWheels,OPEN_MS} from '../../renderer/desktop-pinball/model.mjs';

function valid(data){
 const w=data?.wallet;
 return data?.version===1&&Array.isArray(data.rounds)&&w?.version===1&&Number.isInteger(w.balls)&&w.balls>=0&&w.balls<=30&&Number.isFinite(w.coins)&&w.coins>=0&&Number.isFinite(w.refillAt)&&Number.isInteger(w.stars)&&w.stars>=0&&w.stars<=3&&Array.isArray(w.unlocked)&&w.overrides&&Array.isArray(w.pendingWheels??[])&&data.rounds.every(r=>Number.isFinite(r.started)&&Number.isFinite(r.ends)&&Array.isArray(r.result?.frames)&&r.result.frames.length>0&&Array.isArray(r.result.events));
}
/** Single synchronous commit owns debit, reward, immutable replay and queued wheel.
 * Failure leaves memory unchanged. Reopening the window never launches or awards.
 */
export class PinballStore{
 constructor(file,io=fs,now=Date.now(),legacyWallet=null){
  this.file=file;this.io=io;this.data=null;
  for(const candidate of [file,file+'.bak']){
   if(!io.existsSync(candidate))continue;
   try{const data=JSON.parse(io.readFileSync(candidate,'utf8'));if(!valid(data))throw Error('invalid');this.data=data;break;}catch{}
  }
  if(!this.data){
   if(io.existsSync(file)||io.existsSync(file+'.bak'))throw Error('弹珠存档无法读取，原文件已保留');
   const initial={version:1,wallet:legacyWallet?structuredClone(legacyWallet):newWallet(now),rounds:[]};
   if(!valid(initial))throw Error('原弹珠存档无法读取，原文件已保留');
   this.commit(initial);
  }
 }
 commit(next){
  this.io.mkdirSync(path.dirname(this.file),{recursive:true});
  this.io.writeFileSync(this.file+'.tmp',JSON.stringify(next));
  // Only copy a valid primary; a damaged primary must not replace the recovery copy.
  if(this.io.existsSync(this.file)){try{if(valid(JSON.parse(this.io.readFileSync(this.file,'utf8'))))this.io.copyFileSync(this.file,this.file+'.bak');}catch{}}
  this.io.renameSync(this.file+'.tmp',this.file);this.data=next;
 }
 snapshot(now=Date.now()){
  const {wallet,rounds}=this.data,frame=playback(rounds,wallet,now);
  return {wallet,rounds,summary:{balls:wallet.balls,coins:frame.coins,cap:30,refillAt:wallet.refillAt,keys:wallet.keys}};
 }
 tick(now=Date.now(),keys=0){
  const current=this.data.wallet;
  const wallet=advanceWheels(current.balls>=30?current:replenish(current,now,keys),now);
  const rounds=this.data.rounds.filter(r=>now<r.ends||wallet.pendingWheels?.some(t=>t.id===r.result.id));
  const next={...this.data,wallet,rounds};
  if(rounds.length===this.data.rounds.length&&JSON.stringify(wallet)===JSON.stringify(this.data.wallet))return false;
  this.commit(next);return true;
 }
 launch(board,origin,now=Date.now(),seed=randomBytes(4).readUInt32LE()){
  const before=replenish(this.data.wallet,now),started=now+OPEN_MS;
  if(before.balls<board.launchCount)throw Error('弹珠不足');
  const result=simulate({...board,id:randomUUID(),seed,stars:before.stars,unlocked:before.unlocked});
  const wallet=settle(before,result,started),round={result,before,origin,width:board.width,height:board.height,openedAt:now,started,ends:started+result.duration*1000+1000};
  this.commit({...this.data,wallet,rounds:[...this.data.rounds,round]});return round;
 }
 cancelGeometry(){
  if(!this.data.rounds.some(r=>!r.cancelled))return;
  this.commit({...this.data,rounds:this.data.rounds.map(r=>({...r,cancelled:true}))});
 }
 assign(id,type){this.commit({...this.data,wallet:{...this.data.wallet,overrides:{...this.data.wallet.overrides,[id]:type}}});}
}
