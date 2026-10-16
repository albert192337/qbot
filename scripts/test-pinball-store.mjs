import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {PinballStore} from '../app/src/main/pinball/store.mjs';
const board={width:1200,height:850,icons:[],launchX:1100,launchCount:1};
function fixture(){return path.join(fs.mkdtempSync(path.join(os.tmpdir(),'qbot-pinball-store-')),'desktop-pinball.json');}

test('formal launch atomically persists debit, trajectory, origin and future reward across restart',()=>{
 const file=fixture(),store=new PinballStore(file,fs,10000),before=store.snapshot(10000).summary;
 const round=store.launch(board,{x:500,y:600},10000,42),restored=new PinballStore(file,fs,10100);
 assert.deepEqual(restored.data,JSON.parse(JSON.stringify(store.data)));assert.deepEqual(restored.data.rounds[0].origin,{x:500,y:600});
 assert.equal(restored.snapshot(10100).summary.balls,before.balls-1);
 assert.equal(restored.snapshot(10100).summary.coins,before.coins);
 restored.tick(round.ends+1000);
 assert.equal(restored.data.wallet.coins,store.data.wallet.coins);
 assert.equal(restored.data.wallet.rounds,1);assert.equal(restored.data.rounds.length,0);
 assert.equal(new PinballStore(file).data.wallet.coins,store.data.wallet.coins);
});
test('failed atomic rename never consumes inventory or reports a successful launch',()=>{
 const file=fixture(),store=new PinballStore(file,fs,10000),before=structuredClone(store.data);
 store.io={...fs,renameSync(){throw Error('disk unavailable');}};
 assert.throws(()=>store.launch(board,null,10000,1),/disk unavailable/);
 assert.deepEqual(store.data,before);assert.deepEqual(new PinballStore(file).data,before);
 store.io=fs;store.launch(board,null,10000,1);assert.equal(store.data.wallet.rounds,1);
});
test('only available balls can be spent, malformed counts and positions leave the save unchanged',()=>{
 const file=fixture(),store=new PinballStore(file,fs,10000);
 store.commit({...store.data,wallet:{...store.data.wallet,balls:1}});
 const before=fs.readFileSync(file,'utf8');
 for(const count of [0,2,6,1.5,null,'1'])assert.throws(()=>store.launch({...board,launchCount:count},null,10000));
 assert.throws(()=>store.launch({...board,launchX:NaN},null,10000));
 assert.equal(fs.readFileSync(file,'utf8'),before);
 store.launch(board,null,10000);assert.throws(()=>store.launch(board,null,10000),/弹珠不足/);
 assert.equal(store.data.wallet.balls,0);assert.equal(store.data.wallet.rounds,1);
});
test('backup recovery preserves damaged evidence; double corruption cannot grant a new starter wallet',()=>{
 const file=fixture(),store=new PinballStore(file,fs,10000);store.launch(board,null,10000);
 const backup=fs.readFileSync(file+'.bak','utf8');fs.writeFileSync(file,'damaged');
 assert.deepEqual(new PinballStore(file).data,JSON.parse(backup));assert.equal(fs.readFileSync(file,'utf8'),'damaged');
 fs.writeFileSync(file+'.bak','damaged backup');assert.throws(()=>new PinballStore(file),/原文件已保留/);
 assert.equal(fs.readFileSync(file,'utf8'),'damaged');
});
test('full inventory idle ticks do not rewrite saves; keyboard and time replenishment share one cap',()=>{
 const file=fixture(),store=new PinballStore(file,fs,10000);store.commit({...store.data,wallet:{...store.data.wallet,balls:30}});
 const before=fs.readFileSync(file,'utf8');assert.equal(store.tick(50000,20),false);assert.equal(fs.readFileSync(file,'utf8'),before);
 store.launch(board,null,50000);for(let i=0;i<5;i++)store.tick(51000+i,20);
 assert.equal(store.data.wallet.balls,30);assert.equal(store.data.wallet.keys,0);
});
test('display cancellation and restart preserve an already drawn jackpot and queue without another payout',()=>{
 const file=fixture(),store=new PinballStore(file,fs,10000);store.commit({...store.data,wallet:{...store.data.wallet,stars:3}});
 const r=store.launch(board,null,10000,42);assert.ok(r.result.wheel);
 const coins=store.data.wallet.coins,ticket=structuredClone(store.data.wallet.pendingWheels[0]);
 store.cancelGeometry();const restarted=new PinballStore(file);restarted.tick(ticket.triggerAt+1);
 assert.equal(restarted.data.wallet.coins,coins);assert.deepEqual(restarted.data.wallet.pendingWheels[0].wheel,ticket.wheel);
 restarted.tick(ticket.triggerAt+10000);assert.equal(restarted.data.wallet.coins,coins);assert.equal(restarted.data.wallet.rounds,1);
});


test('a second Node process resumes the same pending round and wallet without settling twice',()=>{
 const file=fixture(),store=new PinballStore(file,fs,10000);store.launch(board,{x:100,y:400},10000,12);
 const source=`import {PinballStore} from ${JSON.stringify(new URL('../app/src/main/pinball/store.mjs',import.meta.url).href)};const s=new PinballStore(process.argv[1]);process.stdout.write(JSON.stringify(s.snapshot(10100)));`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',source,file],{encoding:'utf8',windowsHide:true});
 assert.equal(child.status,0,child.stderr);const resumed=JSON.parse(child.stdout);
 assert.equal(resumed.wallet.rounds,1);assert.equal(resumed.wallet.balls,19);assert.equal(resumed.summary.coins,0);
 assert.deepEqual(resumed.rounds,JSON.parse(JSON.stringify(store.data.rounds)));
 assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),JSON.parse(JSON.stringify(store.data)));
});


test('one-time preview adoption retains rewards and never merges over a formal save',()=>{
 const source=new PinballStore(fixture(),fs,10000);source.launch(board,null,10000,5);
 const original=structuredClone(source.data.wallet),file=fixture();
 const formal=new PinballStore(file,fs,10000,source.data.wallet);
 assert.deepEqual(formal.data.wallet,original);assert.deepEqual(source.data.wallet,original);
 const different={...original,coins:999999};assert.deepEqual(new PinballStore(file,fs,10000,different).data.wallet,original);
 assert.equal(formal.data.rounds.length,0);
});
