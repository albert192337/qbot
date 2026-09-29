/* Isolated economy experiment. Builds the current garden rules without touching production files. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'), cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'),'utf8'));
const ts=require(path.join(root,'node_modules/typescript')),cache=new Map(),sources=new Map();
function loadTs(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const source=fs.readFileSync(file,'utf8');sources.set(path.relative(root,file),source);const mod={exports:{}};cache.set(file,mod);const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('module','exports','require',js)(mod,mod.exports,id=>{if(id==='node:crypto')return require(id);if(!id.startsWith('.'))throw Error('Unexpected runtime dependency: '+id);return loadTs(path.resolve(path.dirname(file),id+'.ts'));});return mod.exports;}
const c=loadTs(path.join(root,'app/src/main/garden/server-entry.ts')),build=JSON.stringify([...sources].sort());
const DAY=86400000, START=Date.UTC(2026,8,28,0), q=(a,p)=>{a=[...a].sort((x,y)=>x-y);return a[Math.max(0,Math.ceil(a.length*p)-1)];};
assert.equal(new Set(cfg.furniture.map(f=>f.id)).size,cfg.furniture.length);
for(const r of cfg.regions)assert.ok(c.SPECIES[r.seed]);
function run(profile,index,options={}){
 let seq=0;const rng={random:c.dailyRandom(cfg.seed+':'+index),id:()=>`sim-${index}-${++seq}`};
 let s=c.initialGarden(START,rng);c.enableV3(s,START);c.ensureLife(s,START,rng,'actor');
 s.coins=cfg.startingCoins;s.seeds.push({id:rng.id(),species:cfg.tutorialSeed,genes:[],bred:false});
 const policyRandom=c.dailyRandom('policy:'+index),ledger={grants:0,sales:0,seeds:0,furniture:0,travel:0}, owned=new Set(),visited=new Set(),snapshots=[];
 let firstHarvest=false,firstSale=false,firstFurniture=false,trip=null,trips=0,paidTrips=0,lastTrip=-99,weekTrips=0,week=-1,harvests=0,food=0,gifts=0,keptValue=0,keptCount=0,bond=0,firstBuyDay=null,firstTravelDay=null;
 const milestones={},pending=new Map();
 const grant=k=>{s.coins+=cfg.tutorialGrants[k];ledger.grants+=cfg.tutorialGrants[k];};grant('start');
 for(let day=1;day<=cfg.days;day++){
  let fed=0,gifted=false,todayBond=0,bought=false;const currentWeek=Math.floor((day-1)/7);if(week!==currentWeek){week=currentWeek;weekTrips=0;}
  for(const minute of profile.minutes){
   const now=START+(day-1)*DAY+minute*60000;c.ensureLife(s,now,rng,'actor');c.refreshShop(s,now,rng);c.advanceV3(s,now);
   if(trip&&now>=trip.end){s.seeds.push({id:rng.id(),species:trip.seed,genes:[],bred:false});owned.add(trip.furniture);trips++;firstTravelDay??=day;
    if(trip.region){todayBond+=cfg.travelBond+(visited.has(trip.region)?0:cfg.firstRegionBond);visited.add(trip.region);}trip=null;
   }
   for(let plot=0;plot<s.plots.length;plot++){
    const p=s.plots[plot];if(!p||p.readyAt>now)continue;
    if(c.needsReveal(p)){if(!pending.has(p.id))pending.set(p.id,now+180000);if(now<pending.get(p.id))continue;p.revealed=true;}
    const val=c.v3Value(p);p.value=val;
    s=c.transition(s,{type:'harvest',plot},now,rng,{actor:'actor'}).state;harvests++;
    if(!firstHarvest){grant('firstHarvest');firstHarvest=true;}
    const fruit=s.produce.find(x=>x.id===p.id);
    const wish=s.life.characters.actor.wishes.find(w=>w.xp===10&&c.wishMatches(w,fruit));
    if(fed<2&&wish){s=c.transition(s,{type:'feed',wish:wish.id,produce:fruit.id,actor:'actor'},now,rng,{actor:'actor'}).state;fed++;food+=val;}
    else if(profile.gift&&!gifted&&c.qualityOf(fruit)!=='rainbow'){s.produce=s.produce.filter(x=>x.id!==p.id);gifted=true;gifts+=val;todayBond+=cfg.giftBond;}
    else if(policyRandom()<profile.keepRate){s.produce=s.produce.filter(x=>x.id!==p.id);keptValue+=val;keptCount++;}
    else {s=c.transition(s,{type:'sell',id:p.id},now,rng,{actor:'actor'}).state;ledger.sales+=val;if(!firstSale){grant('firstSale');firstSale=true;}}
   }
   // Farming commands use actual supply and actual character-dependent plot unlocks.
   for(let plot=0;plot<c.unlockedPlots(s);plot++)if(!s.plots[plot]){
    let seed;
    if(day===1&&plot===0&&harvests===0)seed=s.seeds.find(x=>x.species==='carrot');
    seed??=s.seeds[0];
    if(!seed){const sp=plot===0?'strawberry':profile.farm==='short'?'carrot':'lotus';const offer=s.shop.offers.find(o=>o.kind==='seed'&&o.item===sp&&o.stock>0);
     if(offer&&s.coins>=offer.price){s=c.transition(s,{type:'buy',offer:offer.id},now,rng,{actor:'actor'}).state;ledger.seeds+=offer.price;seed=s.seeds.at(-1);}}
    if(seed)s=c.transition(s,{type:'plant',plot,seed:seed.id},now,rng,{actor:'actor'}).state;
   }
   const reserve=options.reserve??cfg.reserveCoins;
   if(firstSale&&!bought){const candidates=cfg.furniture.filter(f=>!owned.has(f.id)&&f.minDay<=day&&(!f.region||visited.has(f.region))).sort((a,b)=>a.price-b.price);
    const f=candidates[0];if(f&&s.coins-f.price>=reserve){s.coins-=f.price;ledger.furniture+=f.price;owned.add(f.id);bought=true;firstBuyDay??=day;if(!firstFurniture){grant('firstFurniture');firstFurniture=true;}}}
   if(firstFurniture&&!trip&&trips===0&&s.coins-cfg.tutorialTrip.fee>=reserve){const t=cfg.tutorialTrip;s.coins-=t.fee;ledger.travel+=t.fee;trip={end:now+t.minutes*60000,seed:t.seed,furniture:t.furniture};}
   else if(!trip&&trips>0&&weekTrips<cfg.paidTripsPerWeek&&day-lastTrip>=cfg.travelMinGapDays){
    const r=[...cfg.regions].reverse().find(r=>trips>=r.requiresTrips);
    const disposable=Math.max(0,ledger.sales-ledger.seeds);
    if(s.coins-r.fee>=reserve&&ledger.travel+r.fee<=cfg.tutorialTrip.fee+disposable*cfg.travelSpendShare){s.coins-=r.fee;ledger.travel+=r.fee;trip={end:now+r.minutes*60000,seed:r.seed,furniture:r.firstFurniture,region:r.id};weekTrips++;paidTrips++;lastTrip=day;}
   }
   assert.ok(s.coins>=0);assert.equal(s.coins,cfg.startingCoins+ledger.grants+ledger.sales-ledger.seeds-ledger.furniture-ledger.travel);
  }
  // Reference pair is a companion that stays at home. Travel uses another character;
  // travel memories belong to that other pair and are deliberately excluded here.
  todayBond=(gifted?cfg.giftBond:0)+cfg.interactionBond+Math.min(cfg.companionBondDailyCap,Math.floor(profile.presence/30)*cfg.companionBondPer30Min);
  bond+=Math.min(cfg.pairBondDailyCap,todayBond);
  for(const st of cfg.relationshipStages)if(bond>=st.bond)milestones[st.id]??=day;
  if([1,3,7,14,30,60].includes(day))snapshots.push({day,coins:s.coins,paidFurniture:[...owned].filter(id=>cfg.furniture.some(f=>f.id===id)).length,totalFurniture:owned.size,trips,paidTrips,bond,level:c.characterLevel(s.life.characters.actor.xp),harvests,food,gifts,keptValue,keptCount,...ledger});
 }
 return {snapshots,firstBuyDay,firstTravelDay,milestones};
}
const saved=process.argv.includes('--report-only')?JSON.parse(fs.readFileSync(path.join(__dirname,'reports/results.json'),'utf8')):null;
if(saved){assert.equal(saved.engineSHA256,crypto.createHash('sha256').update(build).digest('hex'));assert.equal(saved.configSHA256,crypto.createHash('sha256').update(JSON.stringify(cfg)).digest('hex'));}
const groups=saved?saved.groups:cfg.profiles.map(p=>{const runs=Array.from({length:cfg.runs},(_,i)=>run(p,i));return {id:p.id,name:p.name,days:[1,3,7,14,30,60].map(day=>{const rows=runs.map(r=>r.snapshots.find(x=>x.day===day));return {day,...Object.fromEntries(['coins','paidFurniture','totalFurniture','trips','bond','level','harvests','food','gifts','keptValue','grants','sales','seeds','furniture','travel'].map(k=>[k,{p10:q(rows.map(r=>r[k]),.1),p50:q(rows.map(r=>r[k]),.5),p90:q(rows.map(r=>r[k]),.9)}]))};}),firstBuyByDay1:runs.filter(r=>r.firstBuyDay===1).length/runs.length,firstTravelByDay1:runs.filter(r=>r.firstTravelDay===1).length/runs.length,stageDays:runs[0].milestones};});
// Determinism and ledger integrity are checked independently of report generation.
if(!saved)assert.deepEqual(run(cfg.profiles[1],7),run(cfg.profiles[1],7));
const report={version:cfg.version,runs:cfg.runs,days:cfg.days,engineSHA256:crypto.createHash('sha256').update(build).digest('hex'),configSHA256:crypto.createHash('sha256').update(JSON.stringify(cfg)).digest('hex'),groups};
fs.mkdirSync(path.join(__dirname,'reports'),{recursive:true});fs.writeFileSync(path.join(__dirname,'reports/results.json'),JSON.stringify(report,null,2));
const out=['# 数值验证结果','',`固定随机样本 ${cfg.runs} 个／作息，${cfg.days} 天。使用本次工作区编译的实际花园规则。参数版本：${cfg.version}。`,'','余额为现金；留藏、已种种子、家具价值不计入现金。P10/P50/P90 为样本分位数，各字段的中位数不能相加对账。每条样本逐笔现金恒等式已检查。','', '|作息|天数|余额 P10 / P50 / P90|付费家具 P50|全部家具 P50|旅行 P50|角色等级 P50|固定关系值|','|---|---:|---|---:|---:|---:|---:|---:|'];
for(const g of groups)for(const r of g.days)out.push(`|${g.name}|${r.day}|${r.coins.p10} / ${r.coins.p50} / ${r.coins.p90}|${r.paidFurniture.p50}|${r.totalFurniture.p50}|${r.trips.p50}|${r.level.p50}|${r.bond.p50}|`);
out.push('','## 新手节点','', '|作息|第1天买首件家具|第1天完成短途旅行|熟悉/亲近/默契天数|','|---|---:|---:|---|');
for(const g of groups)out.push(`|${g.name}|${Math.round(g.firstBuyByDay1*100)}%|${Math.round(g.firstTravelByDay1*100)}%|${g.stageDays.familiar??'>60'}/${g.stageDays.close??'>60'}/${g.stageDays.bonded??'>60'}|`);
out.push('','## 解释边界','','- 玩家按预设时刻查看、买得起时每天最多买一件最便宜的已解锁家具；这是积极购买情景，不是付费意愿预测。','- 留藏概率为人工假设，对所有品质统一抽样；真实玩家更可能留下高价值物，应在真人测试后改为按品质分层。','- 送礼每天最多一颗，投喂仅匹配现有两项基础心愿；特殊心愿、繁育、喷雾、土地升级、好友种子商店和旧箱子均未参与这轮模拟。','- 每批彩色作物在下次查看时开始180秒培育，后续查看完成；没有模拟窗口离开自动暂停，因此低频作息揭晓仍偏乐观。','- 旅行按提案结算，不调用现有逐步付费旅行；种子以现有等价物种入账。区域外观尚未制作。','- 留藏移到模拟外的收藏账本，仍计数量与机会成本；不回售、不再投喂。','- 关系为固定同伴稳定在场的理论节奏，没有验证真实共同在线率；旅行加分不加入这条关系。','- 64个样本只用于普通经济排错，不证明极稀有率、真实留存或人体感受。','- 原始结果记录引擎与配置SHA256。重复运行与每笔资金守恒检查通过。');
out.push('','## 补充口径','','- 教学胡萝卜在模拟中仍采用自然规则，可能被留藏或赠送。新手比例是开放行为压力结果，固定教程路径另用主文档的逐笔账本核对。','- 阶段天数一栏来自每组第一个固定样本；关系值列为该组P50。它们不代表真实玩家关系分布。','- 完整判定及未通过项见同目录上级的《验证结论与调参顺序》。');
fs.writeFileSync(path.join(__dirname,'reports/数值验证结果.md'),out.join('\n'));console.log(JSON.stringify(groups.map(g=>({name:g.name,day7:g.days[2].coins.p50,day30:g.days[4].coins.p50,furniture30:g.days[4].paidFurniture.p50,trip1:g.firstTravelByDay1,stages:g.stageDays})),null,2));


