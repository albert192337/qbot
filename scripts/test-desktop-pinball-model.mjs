import test from 'node:test';
import assert from 'node:assert/strict';
import {classify,newWallet,replenish,settle,simulate,placeIcon,iconContact,launchPoints,playback,LAUNCH_COUNTS,CAP,REFILL_MS,OPEN_MS,FLOOR_INSET} from '../app/src/renderer/desktop-pinball/model.mjs';
import {chooseWheel,wheelSegments,wheelAngle,advanceWheels,roundReceipt,SPIN_MS,HOLD_MS} from '../app/src/renderer/desktop-pinball/roulette.mjs';
const board={width:1200,height:850,icons:[],launchX:100,seed:42};
test('200% desktop scaling keeps the Shell icon size in DIP; collision follows the icon face',()=>{
 const p=placeIcon(28/2,202/2,48);assert.equal(p.x,38);assert.equal(p.y,125);assert.equal(p.size,48);
 assert.ok(iconContact({x:38,y:96},p));assert.equal(iconContact({x:38,y:94},p),null);
 assert.equal(iconContact({x:66,y:153},p),null,'empty outside corner does not bounce');
 const inside=iconContact({x:38,y:125},p);assert.ok(Number.isFinite(inside.depth)&&inside.depth>0);
});
test('semantic icon roles and folder precedence',()=>{
 for(const [name,kind,want] of [['回收站','virtual','save'],['Microsoft Edge','shortcut','split'],['Steam','shortcut','star'],['资料','folder','coin'],['planning.xlsx','file','multi'],['LibreOffice 26.8','shortcut','multi'],['QBot','shortcut','coin']])assert.equal(classify({name,kind}),want);
});
test('elapsed time, keyboard bonuses, cap, and full capacity do not bank infinite refills',()=>{
 const w=newWallet(0);assert.equal(replenish(w,REFILL_MS-1).balls,20);assert.equal(replenish(w,REFILL_MS).balls,21);
 let a=w;for(let i=0;i<5;i++)a=replenish(a,0,20);assert.equal(a.balls,21);assert.equal(a.keys,0);
 a=replenish(a,99999999,999999);assert.equal(a.balls,CAP);assert.equal(a.keys,0);
 a=settle(a,{id:'1',coins:10,stars:0},99999999);assert.equal(replenish(a,100000000).balls,29);
 assert.equal(replenish(w,-1000).balls,20);assert.equal(w.balls,20);
});
test('single settlement is idempotent; zero balance cannot launch',()=>{
 const r={id:'round',coins:12000,stars:0,prize:'petals',jackpot:true};const w=settle(newWallet(0),r,1);
 assert.equal(w.balls,19);assert.equal(w.coins,12000);assert.deepEqual(w.unlocked,['petals']);assert.equal(w.equipped,'petals');assert.equal(settle(w,r,2),w);
 assert.throws(()=>settle({...w,balls:0},{...r,id:'other'},3));
});
test('deterministic geometry and all five collision roles',()=>{
 for(const type of ['coin','multi','split','star','save']){
  const config={...board,icons:[{id:'target',x:100,y:180,r:58,type}]};
  const a=simulate(config),b=simulate(config);assert.deepEqual(a,b);assert.ok(a.events.some(e=>e.type===type),type+' collision');
  if(type==='split')assert.equal(a.ballCount,3);
  if(type==='save')assert.ok(a.events.some(e=>e.text==='再来一次'));
 }
});
test('the gold slot requires three lights; jackpot pays the base amount and triggers a wheel',()=>{
 const config={...board,launchX:1150,seed:2};
 const locked=simulate({...config,stars:2}),ready=simulate({...config,stars:3});
 assert.equal(locked.jackpot,false);assert.equal(locked.wheel,null);assert.equal(ready.jackpot,true);assert.ok(ready.coins>=10000);assert.deepEqual(ready.wheel,chooseWheel(2));assert.equal(ready.stars,0);
 const complete=simulate({...config,stars:3,unlocked:['petals','orbit']});assert.equal(complete.wheel.prize,null);assert.ok(complete.wheel.coins>=2000);assert.ok(complete.coins>=10000);
});
test('1/3/5-ball volleys start together, stay distinct at screen edges, and each ball pays its landing',()=>{
 for(const count of LAUNCH_COUNTS)for(const x of [0,600,1200]){
  const points=launchPoints(board.width,x,count);assert.equal(new Set(points.map(p=>p.x)).size,count);assert.ok(points.every(p=>p.x>=18&&p.x<=1182));
  const config={...board,launchX:x,launchCount:count},r=simulate(config);
  assert.deepEqual(r,simulate(config));assert.equal(r.launchCount,count);assert.equal(r.frames[0].balls.length,count);
  assert.equal(r.events.filter(e=>e.type==='bank').length,count);assert.equal(r.coins,r.events.filter(e=>e.type==='bank').reduce((sum,e)=>sum+Number(e.text.slice(1)),0));
 }
});
test('batch debit is atomic and idempotent; split bonus balls are free; malformed counts cannot spend',()=>{
 for(const count of LAUNCH_COUNTS){
  const r=simulate({...board,launchCount:count,icons:[{id:'split',x:100,y:180,r:58,type:'split'}]});
  assert.equal(r.ballCount,count+2);const before={...newWallet(10),balls:count},after=settle(before,r,20);
  assert.equal(after.balls,0);assert.equal(after.rounds,1);assert.equal(settle(after,r,30),after);assert.equal(before.balls,count);
  assert.throws(()=>settle({...before,balls:count-1},r,20),/弹珠不足/);
 }
 for(const count of [0,2,4,6,-1,1.5,NaN,Infinity,'5',null]){
  assert.throws(()=>simulate({...board,launchCount:count}));assert.throws(()=>settle(newWallet(0),{id:'bad',coins:1,stars:0,launchCount:count},1));
 }
 const full={...newWallet(0),balls:CAP};const after=settle(full,simulate({...board,launchCount:5}),50);
 assert.equal(after.balls,25);assert.equal(after.refillAt,50);assert.equal(replenish(after,50+REFILL_MS).balls,26);
});
test('simultaneous gold landings award the batch jackpot only once',()=>{
 const r=simulate({...board,launchCount:5,launchX:1150,stars:3,seed:2});
 assert.equal(r.events.filter(e=>e.type==='bank').length,5);assert.equal(r.events.filter(e=>e.type==='jackpot').length,1);
 const w=settle(newWallet(0),r,1);assert.equal(w.balls,15);assert.equal(w.pendingWheels.length,1);assert.equal(w.coins,r.coins+r.wheel.coins);assert.equal(w.stars,0);
});
test('additional shots preserve earlier clocks, merge visible rewards, and finish independently',()=>{
 const slow={started:0,result:{id:'slow',duration:10,coins:100,stars:1,frames:[{t:0,balls:[{id:0,x:100,y:54}],coins:0,stars:0},{t:1,balls:[{id:0,x:120,y:200}],coins:20,stars:1},{t:10,balls:[],coins:100,stars:1}],events:[{t:1,type:'hit',pin:'icon'}]}};
 const fast={started:500,result:{id:'fast',duration:1,coins:300,stars:1,frames:[{t:0,balls:[{id:0,x:800,y:54}],coins:0,stars:1},{t:1,balls:[],coins:300,stars:1}],events:[{t:1,type:'bank',text:'+300'}]}};
 const wallet={coins:400,stars:1},before=structuredClone(slow);
 const overlap=playback([slow,fast],wallet,750);assert.equal(overlap.balls.length,2);assert.equal(new Set(overlap.balls.map(b=>b.id)).size,2);assert.equal(overlap.coins,0);
 assert.deepEqual(overlap.balls.find(b=>b.id==='slow:0'),playback([slow],{coins:100,stars:1},750).balls[0]);
 const later=playback([slow,fast],wallet,1800);assert.deepEqual(later.completed,['fast']);assert.equal(later.balls.length,1);assert.equal(later.balls[0].y,200);assert.equal(later.coins,320);
 assert.deepEqual(later.events.map(e=>e.roundId),['slow','fast']);assert.deepEqual(slow,before);
 assert.deepEqual(playback(structuredClone([slow,fast]),wallet,1800),later,'reload resumes the same two clocks');
 const done=playback([slow,fast],wallet,11000);assert.equal(done.coins,400);assert.equal(done.stars,1);assert.equal(done.balls.length,0);
});
test('dense real-desktop layouts end with finite bounded balls and rewards',()=>{
 const icons=Array.from({length:190},(_,i)=>({id:String(i),x:30+(i%19)*62,y:110+Math.floor(i/19)*60,r:48*.47,size:48,type:['coin','multi','split','star','save'][i%5]}));
 for(const launchCount of LAUNCH_COUNTS)for(let seed=1;seed<=80;seed++){const r=simulate({...board,icons,seed,launchCount,launchX:seed*17%1200});assert.ok(r.duration<=15.02);assert.ok(r.ballCount<=launchCount+2);assert.ok(Number.isSafeInteger(r.coins));assert.ok(r.coins>0);assert.equal(r.frames.at(-1).balls.length,0);assert.ok(r.stars>=0&&r.stars<=3);for(const f of r.frames){assert.equal(new Set(f.balls.map(b=>b.id)).size,f.balls.length);for(const b of f.balls)assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y));}}
});
test('smooth playback interpolates positions without paying future rewards or drawing a drained ball',()=>{
 const round={started:0,result:{id:'smooth',duration:.075,coins:400,stars:1,events:[],frames:[{t:0,balls:[{id:0,x:100,y:100}],coins:0,stars:0},{t:.025,balls:[{id:0,x:110,y:120},{id:1,x:125,y:110}],coins:20,stars:1},{t:.05,balls:[],coins:400,stars:1}]}};
 const wallet={coins:400,stars:1},middle=playback([round],wallet,12.5);
 assert.deepEqual(middle.balls,[{id:'smooth:0',x:105,y:110}]);assert.equal(middle.coins,0);assert.equal(middle.stars,0);
 assert.equal(playback([round],wallet,25).balls.length,2);assert.equal(playback([round],wallet,50).balls.length,0);assert.equal(playback([round],wallet,50).coins,400);
});
test('reward breakdown reconciles with payout; capped lights and multipliers do not announce imaginary gains',()=>{
 for(const launchCount of LAUNCH_COUNTS)for(const stars of [0,3]){
  const r=simulate({...board,launchCount,launchX:1150,stars,seed:2});const s=r.summary;
  assert.equal(s.collisionCoins+s.landingCoins+s.bonusCoins,r.coins);assert.equal(s.extraBalls,r.ballCount-launchCount);
  assert.equal(s.bonusCoins,r.jackpot?10000:0);assert.ok(r.events.filter(e=>e.type==='bank').every(e=>Number.isInteger(e.amount)&&e.bin>=0&&e.bin<5));
  assert.deepEqual(settle(newWallet(0),r,1).last.summary,roundReceipt(r).summary);
 }
 const full=simulate({...board,stars:3,icons:[{id:'star',x:100,y:180,r:58,type:'star'}]});assert.equal(full.events.some(e=>e.type==='star'&&e.pin==='star'),false);
 const multis=Array.from({length:7},(_,i)=>({id:'m'+i,x:100,y:150+i*55,r:45,type:'multi'}));
 const r=simulate({...board,icons:multis});const gains=r.events.filter(e=>e.type==='multi');assert.equal(new Set(gains.map(e=>e.value)).size,gains.length);assert.ok(gains.every(e=>e.value<=5));
});
test('equal wheel sectors choose deterministically; owned cosmetics are visibly replaced with coins',()=>{
 const seen=new Set();for(let seed=0;seed<1000;seed++){const a=chooseWheel(seed);assert.deepEqual(a,chooseWheel(seed));assert.deepEqual({label:a.label,coins:a.coins,prize:a.prize},a.segments[a.index]);seen.add(a.index);}
 assert.equal(seen.size,8);const owned=wheelSegments(['petals','orbit']);assert.ok(owned.every(s=>s.prize===null&&s.coins>0));assert.equal(owned[2].coins,5000);assert.equal(owned[5].coins,5000);
 for(let index=0;index<8;index++){const stop=wheelAngle(index,SPIN_MS);assert.ok(Math.abs((stop+index*Math.PI/4)/(Math.PI*2)-6)<1e-9);assert.equal(stop,wheelAngle(index,SPIN_MS*2));}
});
test('wheel awards and pending tickets persist once; late and early hits queue by actual trigger time',()=>{
 const a=simulate({...board,stars:3,launchX:1150,id:'slow',seed:2});
 let w=settle(newWallet(0),a,0);assert.equal(settle(w,a,1),w);const first=w.pendingWheels[0];
 const b=simulate({...board,stars:3,launchX:1150,id:'fast',seed:3});w=settle(w,b,10);
 w.pendingWheels[0].triggerAt=10000;w.pendingWheels[1].triggerAt=1000;const paid=w.coins,inventory=w.balls;
 assert.equal(advanceWheels(w,999),w);w=advanceWheels(w,1000);assert.equal(w.pendingWheels.find(t=>t.id==='fast').startedAt,1000);assert.equal(w.pendingWheels.find(t=>t.id==='slow').startedAt,null);
 const restored=JSON.parse(JSON.stringify(w));assert.deepEqual(advanceWheels(restored,2000),w);w=advanceWheels(restored,1000+SPIN_MS+HOLD_MS);assert.equal(w.pendingWheels.length,1);assert.equal(w.pendingWheels[0].startedAt,null);
 w=advanceWheels(w,10000);assert.equal(w.pendingWheels[0].startedAt,10000);w=advanceWheels(w,10000+SPIN_MS+HOLD_MS);assert.equal(w.pendingWheels.length,0);assert.equal(w.coins,paid);assert.equal(w.balls,inventory);assert.equal(w.lastWheel.id,first.id);
});
test('wheel winnings stay hidden until the pointer stops, including reload and cancelled desktop geometry',()=>{
 const r=simulate({...board,stars:3,launchX:1150,id:'wheel',seed:2});assert.ok(r.wheel.coins>0);
 let wallet=settle(newWallet(0),r,0);wallet=advanceWheels(wallet,r.events.find(e=>e.type==='jackpot').t*1000+1);
 const ticket=wallet.pendingWheels[0],round={started:0,result:r},before=ticket.startedAt+SPIN_MS-1,after=before+1;
 const hidden=playback([round],wallet,before);assert.equal(hidden.coins,r.coins);assert.deepEqual(hidden.completed,[]);
 const shown=playback([round],wallet,after);assert.equal(shown.coins,wallet.coins);assert.deepEqual(shown.completed,['wheel']);
 assert.deepEqual(playback([JSON.parse(JSON.stringify(round))],JSON.parse(JSON.stringify(wallet)),after),shown);
 const moved=playback([{...round,cancelled:true}],wallet,before);assert.equal(moved.balls.length,0);assert.equal(moved.events.length,0);assert.equal(moved.coins,r.coins);assert.deepEqual(moved.completed,[]);
});


test('chest pre-roll hides physics and all future payouts; refresh preserves clocks and debit',()=>{
 const openedAt=10000,started=openedAt+OPEN_MS,before=newWallet(openedAt);
 before.stars=3;
 const result=simulate({...board,launchX:1190,stars:3,id:'chest-opening',seed:8});
 const wallet=settle(before,result,started),round={openedAt,started,before,result};
 const stored=JSON.stringify(wallet);
 for(const now of [openedAt,started-1]){
  const frame=playback([round],wallet,now);
  assert.equal(frame.balls.length,0);assert.equal(frame.events.length,0);
  assert.equal(frame.coins,before.coins);assert.equal(frame.stars,before.stars);
  assert.deepEqual(playback(JSON.parse(JSON.stringify([round])),JSON.parse(stored),now),frame);
 }
 assert.equal(playback([round],wallet,started).balls.length,1);
 assert.equal(wallet.balls,before.balls-1);assert.equal(JSON.stringify(wallet),stored);
 for(const e of result.events.filter(e=>e.type==='bank'))assert.equal(e.y,board.height-FLOOR_INSET);
 assert.equal(wallet.pendingWheels[0].triggerAt,started+result.events.find(e=>e.type==='jackpot').t*1000);
});
