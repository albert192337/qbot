import {sowingMinutes,SPECIES,TRAITS,LEVEL_XP,FERTILIZERS,traitSlot,needsReveal,canBreed,type GardenState,type Plant,type Produce,type Seed,type Trait,type Species,type GardenCommand,type GardenReveal} from '../../shared/garden';
import {dailyRandom,gardenDay,nextGardenDay} from '../../shared/garden-life';
import {FACTOR_SCORE,V3,V3_XP,AFFINITIES,AFFINITY_WEIGHTS,V3_WEATHER,weatherWeights,exposures,fits,cappedTraits,withSize,qualityOf,scoreOf,speciesLevel,fertilizerV3,v3Value,weekKey,geneSlots,stableSlots,recordGarden,type FactorQuality,type Exposure} from '../../shared/garden-v3';
import type {Random} from './rules';

export function enableV3(s:GardenState,now:number):boolean {
 if(s.v3)return false;
 for(const p of s.plots)if(p&&p.growthVersion!==3)p.legacyLevel=Math.max(1,LEVEL_XP.filter(x=>s.xp[p.species]>=x).length);
 for(const sp of Object.keys(SPECIES) as Species[]){const xp=s.xp[sp],i=Math.max(0,LEVEL_XP.filter(n=>xp>=n).length-1);s.xp[sp]=Math.round(V3_XP[i]+(i<7?(xp-LEVEL_XP[i])/(LEVEL_XP[i+1]-LEVEL_XP[i])*(V3_XP[i+1]-V3_XP[i]):Math.min(1,(xp-LEVEL_XP[7])/400)*(V3_XP[8]-V3_XP[7])));}
 s.v3={version:3,day:gardenDay(now),xpToday:{},rainbowMisses:0,pityEvents:[],week:weekKey(now),breeds:0,geneMisses:0,sizeMisses:0,oils:{normal:2,rich:0},soil:[1,1,1,1,1,1],records:[],counters:{},sunPartners:[],appraisals:{}};
 s.shop.refreshAt=0;recordGarden(s,now,'welcome','新花园手册：选一个喜欢的组合，慢慢种出自己的收藏。');return true;
}
export function refreshV3Day(s:GardenState,now:number):void {const v=s.v3;if(!v)return;const day=Math.max(v.day,gardenDay(now));if(day!==v.day){v.day=day;v.xpToday={};}const week=Math.max(v.week,weekKey(now));if(week!==v.week){v.week=week;v.breeds=0;}}
export function refreshV3Shop(s:GardenState,now:number):boolean {
 if(!s.v3)return false;refreshV3Day(s,now);if(s.shop.refreshAt>now)return true;
 const day=s.v3.day,basic:Species[]=['carrot','strawberry','sunflower','tomato','tulip','lotus'];
 s.shop={refreshAt:nextGardenDay(day),offers:[...basic.map(sp=>({id:`supply3:${day}:${sp}`,kind:'seed' as const,item:sp,price:SPECIES[sp].price,stock:99})),...(Object.keys(FERTILIZERS) as (keyof typeof FERTILIZERS)[]).map(f=>({id:`supply3:${day}:${f}`,kind:'fertilizer' as const,item:f,price:fertilizerV3(f).price,stock:[8,3,1,1][FERTILIZERS[f].grade-1]}))]};return true;
}
const choose=<T>(items:T[],random:()=>number):T=>items[Math.min(items.length-1,Math.floor(random()*items.length))];
export function poisson(mean:number,random:()=>number):number {let p=1,n=0;const stop=Math.exp(-Math.max(0,Math.min(5,mean)));do{n++;p*=Math.max(Number.EPSILON,Math.min(1-Number.EPSILON,random()));}while(p>stop&&n<64);return n-1;}
function weighted<T>(items:T[],weight:(t:T)=>number,random:()=>number):T {let ticket=random()*items.reduce((sum,x)=>sum+weight(x),0);return items.find(x=>(ticket-=weight(x))<0)??items.at(-1)!;}
function drawFactor(pool:Trait[],weights:number[],random:()=>number):Trait|undefined {const tiers:FactorQuality[]=['blue','purple','gold','rainbow'];const q=weighted(tiers,t=>weights[tiers.indexOf(t)],random),available=pool.filter(t=>TRAITS[t].tier===q);return available.length?choose(available,random):undefined;}
export function makeV3Plant(s:GardenState,seed:Seed,plot:number,now:number,rng:Random,harvests:number=SPECIES[seed.species].harvests,index=0):Plant {
 const duration=sowingMinutes(seed.species,s)*60000;
 const traits=cappedTraits(seed.genes.filter(t=>traitSlot(t)!=='size')),slots=seed.slots??geneSlots(traits);
 return {id:rng.id(),species:seed.species,traits,kg:SPECIES[seed.species].kg,value:0,bred:false,growthVersion:3,plantedAt:now,readyAt:now+duration,fertilizers:[],baseTraits:traits,harvestsLeft:harvests,harvestIndex:index,yieldCount:SPECIES[seed.species].harvests,lineage:seed.lineage,slots,
 batch:{seedlingEnd:now+duration*V3.seedling,naturalReadyAt:now+duration,settled:false,seed:Math.floor(rng.random()*4294967296),realm:s.v3!.realm??'garden',exposure:[],candidates:[],slots,massGene:seed.massGene,soil:s.v3!.soil[plot],sunBonus:Math.min(2,s.v3!.sunActive??0)*.03}};
}
const massRange=(t:Trait):[number,number]=>t==='giant'?[5,5.6]:t==='large'?[3,4.2]:t==='plump'?[1.5,2.4]:[.45,.58];
// Resolve slot collisions automatically; strongest rarity wins, stable ties keep the earlier roll.
export function settleFactors(traits:Trait[]):Trait[]{return cappedTraits([...new Set(traits)].filter(t=>traitSlot(t)!=='size').sort((a,b)=>FACTOR_SCORE[TRAITS[b].tier]-FACTOR_SCORE[TRAITS[a].tier]));}
export function advanceV3(s:GardenState,now:number):boolean {
 if(!s.v3)return false;refreshV3Day(s,now);let changed=false;
 for(const [plot,p] of s.plots.entries()){
  const b=p?.batch;if(!p||p.growthVersion!==3||!b)continue;
  // Migrate a saved choice without rerolling or requiring another player action.
  if(b.settled&&b.candidates.length){p.traits=withSize(settleFactors([...p.traits,...b.candidates]),p.kg/SPECIES[p.species].kg);p.slots=stableSlots(p.traits,p.slots);b.candidates=[];p.value=v3Value(p);if(!p.revealed&&qualityOf(p)==='rainbow')p.readyAt=Math.min(p.readyAt,now);changed=true;}
  if(p.cultivation&&p.cultivation.remainingMs>V3.cultivationMs){p.cultivation.remainingMs=V3.cultivationMs;changed=true;}
  if(b.settled||now<b.seedlingEnd)continue;
  b.exposure=exposures(p.plantedAt,b.seedlingEnd,b.realm);b.settled=true;changed=true;
  const random=dailyRandom(`batch3:${p.id}:${b.seed}`),old=[...p.traits],candidates:Trait[]=[];
  const propose=(t:Trait|undefined)=>{if(!t||p.traits.includes(t)||candidates.includes(t))return;if(fits(p.traits,t))p.traits.push(t);else candidates.push(t);};
  const fertilizer=p.fertilizers[0]?fertilizerV3(p.fertilizers[0]):undefined;
  const coverage=b.fertilizedAt===undefined?0:Math.max(0,Math.min(1,(b.seedlingEnd-b.fertilizedAt)/(b.seedlingEnd-p.plantedAt)));
  const weatherCount=poisson(V3.lambda+(fertilizer?.effect==='mutation'?fertilizer.lambda*coverage:0),random);
  const beforeWeather=[...p.traits];
  for(let i=0;i<weatherCount;i++){const e=weighted(b.exposure,e=>e.ms,random);if(e)propose(drawFactor([...V3_WEATHER[e.kind].pool] as Trait[],weatherWeights(e.kind),random));}
  const naturalRainbow=[...p.traits,...candidates].some(t=>!beforeWeather.includes(t)&&TRAITS[t].tier==='rainbow');
  const ssr=b.exposure.filter(e=>V3_WEATHER[e.kind].grade==='SSR'),fresh=ssr.filter(e=>!s.v3!.pityEvents.includes(`${plot}:${e.id}`));
  s.v3.pityEvents=[...s.v3.pityEvents,...fresh.map(e=>`${plot}:${e.id}`)].slice(-2048);
  if(naturalRainbow)s.v3.rainbowMisses=0;
  else for(const e of fresh){if(s.v3.rainbowMisses>=V3.rainbowPity){const chosen=weighted(ssr,e=>e.ms,random),pool=([...V3_WEATHER[chosen.kind].pool] as Trait[]).filter(t=>TRAITS[t].tier==='rainbow');const unseen=pool.filter(t=>!p.traits.includes(t)),candidate=choose(unseen.length?unseen:pool,random);if(p.traits.includes(candidate))candidates.push(candidate);else propose(candidate);s.v3.rainbowMisses=0;recordGarden(s,now,'rainbowPity','第 33 次传说天气结算：出现了彩色因子。',undefined,p.id);}else s.v3.rainbowMisses++;}
  const lv=speciesLevel(s.xp[p.species]);
  for(let i=0,n=Math.min(V3.affinityMax,poisson(V3.affinity,random));i<n;i++)propose(drawFactor(AFFINITIES[p.species].filter(t=>TRAITS[t].level<=lv),AFFINITY_WEIGHTS[lv-1],random));
  // Rare natural giants remain attainable without appraisal. Ordinary mass spans mini to plump.
  const massRoll=random();let mass=massRoll<.002?5+random()*.6:massRoll<.052?3+random()*1.2:.45+random()*1.9;
  if(b.massGene){const [lo,hi]=massRange(b.massGene);mass=lo+random()*(hi-lo);}
  const exposureMs=b.exposure.reduce((n,e)=>n+e.ms,0);
  for(const e of b.exposure){const [lo,hi]=V3_WEATHER[e.kind].mass;mass+=(lo+random()*(hi-lo))*e.ms/exposureMs;}
  if(fertilizer?.effect==='weight')mass+=fertilizer.mass[0]+random()*(fertilizer.mass[1]-fertilizer.mass[0]);
  if(b.soil===2)mass+=.05+random()*.1;if(b.soil===3)mass+=.15+random()*.1;mass+=b.sunBonus;
  mass=Math.min(8,mass);p.kg=Math.round(SPECIES[p.species].kg*mass*1000)/1000;p.traits=withSize(settleFactors([...p.traits,...candidates]),p.kg/SPECIES[p.species].kg);p.slots=stableSlots(p.traits,p.slots);b.candidates=[];p.value=v3Value(p);
  if(qualityOf(p)==='rainbow'){p.readyAt=Math.min(p.readyAt,b.seedlingEnd);if(!b.candidates.length)recordGarden(s,now,'question','发现一颗可以共同培育的果实',undefined,p.id);}
  recordGarden(s,now,'settlement',`${SPECIES[p.species].name}结算：${p.traits.filter(t=>!old.includes(t)).map(t=>TRAITS[t].name).join('、')||'原生小惊喜'}`,undefined,p.id);
 }
 return changed;
}
export function v3HarvestXp(s:GardenState,p:Produce,now:number):number {refreshV3Day(s,now);const used=s.v3!.xpToday[p.species]??0,xp=Math.min(60-used,Math.round(4*Math.sqrt(SPECIES[p.species].minutes/5))+(used===0?8:0));s.v3!.xpToday[p.species]=used+xp;return Math.max(0,xp);}
export function protectV3(s:GardenState,c:GardenCommand):void {
 if(!s.v3)return;
 const targets:string[]=[];
 for(const [id,a] of Object.entries(s.v3.appraisals))if(!a.done)targets.push(id);
 if(['resolveFactors','appraisePick','appraiseStop'].includes(c.type))return;
 const touches=(id:string)=>('id'in c&&c.id===id)||('target'in c&&c.target===id)||('produce'in c&&c.produce===id)||('first'in c&&(c.first===id||c.second===id))||('ids'in c&&c.ids.includes(id))||('plot'in c&&s.plots[c.plot]?.id===id);
 if(targets.some(touches))throw Error('这颗果实还有待选择的词条或鉴定，请先处理结果');
}
function legacyGenes(p:Produce,selected?:Trait[]):Trait[]{
 if(p.growthVersion===3)return p.slots?.filter((t):t is Trait=>!!t)??cappedTraits(p.traits).filter(t=>traitSlot(t)!=='size');
 const base=p.traits.filter(t=>traitSlot(t)!=='size'),chosen=selected??base;
 if(chosen.some(t=>!base.includes(t))||cappedTraits(chosen).length!==chosen.length)throw Error('旧版收藏请先选一个符合果实1/果皮1/挂饰2的遗传组合');return chosen;
}
export function breedV3(s:GardenState,a:Produce,b:Produce,cmd:Extract<GardenCommand,{type:'breed'}>,now:number,rng:Random):Seed {
 const v=s.v3!;refreshV3Day(s,now);if(a.locked||b.locked||b.traits.includes('mini'))throw Error('亲本需取消收藏锁，且背包父本不能是迷你');
 if(v.breeds>=90)throw Error('本周已完成 90 次繁育，下周可继续');
 const oil=cmd.oil??'normal';if(!Object.hasOwn(v.oils,oil)||v.oils[oil]<=0)throw Error('需要一瓶繁育精油');
 const ag=legacyGenes(a,cmd.firstGenes),bg=legacyGenes(b,cmd.secondGenes),as=a.growthVersion===3?a.slots??geneSlots(ag):geneSlots(ag),bs=b.growthVersion===3?b.slots??geneSlots(bg):geneSlots(bg);
 let genes:Trait[]=[];const inherited=as.map(()=>null) as typeof as;const pool=[...new Set([...ag,...bg])];
 for(let i=0;i<4;i++){const x=as[i],y=bs[i];if((x||y)&&rng.random()<(x&&y ? .3 : .25)){const t=x&&y?(rng.random()<.5?x:y):x??y!;if(fits(genes,t)){genes.push(t);inherited[i]=t;}}}
 if(pool.length){if(!genes.length&&v.geneMisses>=9){genes=[choose(pool,()=>rng.random())];v.geneMisses=0;}else v.geneMisses=genes.length?0:v.geneMisses+1;}
 const sizes=[...new Set([...a.traits,...b.traits].filter(t=>traitSlot(t)==='size'&&t!=='mini'))];let massGene:Trait|undefined;
 if(sizes.length){if(rng.random()<.2||v.sizeMisses>=9){massGene=choose(sizes,()=>rng.random());v.sizeMisses=0;}else v.sizeMisses++;}
 const cap=oil==='rich'?4:3;while(genes.length>cap)genes.splice(Math.floor(rng.random()*genes.length),1);
 const seed:Seed={id:rng.id(),species:rng.random()<.5?a.species:b.species,genes,slots:stableSlots(genes,inherited),massGene,bred:true,parents:[a.species,b.species],lineage:{parents:[a,b].map(p=>({id:p.id,species:p.species,traits:[...p.traits]})),at:now,owner:s.life?.owner}};
 v.oils[oil]--;v.breeds++;a.bred=b.bred=true;recordGarden(s,now,'breed',`繁育出${SPECIES[seed.species].name}种子，保留 ${genes.length} 个因子${massGene?'和'+TRAITS[massGene].name+'体型':''}`);return seed;
}
export function v3Transition(s:GardenState,c:GardenCommand,now:number,rng:Random):{handled:boolean;reveal?:GardenReveal} {
 if(!s.v3)return {handled:false};const v=s.v3;refreshV3Day(s,now);
 const find=(id:string)=>s.produce.find(p=>p.id===id)??s.plots.find(p=>p?.id===id);
 switch(c.type){
 case 'resolveFactors':throw Error('果实现在自动结算，无需选择词条');
 case 'collectionGoal':if(!Object.hasOwn(SPECIES,c.species)||!Array.isArray(c.traits)||!c.traits.length||c.traits.some(t=>!Object.hasOwn(TRAITS,t))||cappedTraits(c.traits).length!==c.traits.length)throw Error('请选择兼容的收藏目标');v.goal={species:c.species,traits:[...c.traits]};return {handled:true};
 case 'clearCollectionGoal':delete v.goal;return {handled:true};
 case 'buyOil':{if(!['normal','rich'].includes(c.kind))throw Error('精油不存在');const price=c.kind==='normal'?35:80;if(s.coins<price)throw Error('花园币不足');s.coins-=price;v.oils[c.kind]++;return {handled:true,reveal:{title:'繁育精油已放好',message:`${c.kind==='normal'?'普通 · 最多保留3因子':'浓缩 · 最多保留4因子'}，每次繁育消耗一瓶`}};}
 case 'upgradeSoil':{if(!Number.isInteger(c.plot)||c.plot<0||c.plot>=6)throw Error('土地不存在');const lv=v.soil[c.plot],cost=lv===1?300:700;if(lv>=3)throw Error('这块地已经养得很好了');if(s.coins<cost)throw Error('花园币不足');s.coins-=cost;v.soil[c.plot]++;recordGarden(s,now,'soil',`${c.plot+1}号地升到${lv+1}级，下一轮生长生效`);return {handled:true};}
 case 'appraiseStart':{const p=find(c.target);if(!p||p.growthVersion!==3||p.locked||needsReveal(p)||p.appraised||!['gold','rainbow'].includes(qualityOf(p))||speciesLevel(s.xp[p.species])<5||('readyAt'in p&&Number(p.readyAt)>now))throw Error('鉴定需 Lv.5 物种的已揭晓金色以上果实，每果一次');if(s.coins<20)throw Error('鉴定需要 20 花园币');s.coins-=20;p.appraised=true;const board=Array.from({length:7},(_,i)=>{const values=i<3?[1.15,1.15,.9]:i<6?[1.35,.85,.85]:[1.6,.7,.7];for(let j=2;j>0;j--){const k=Math.floor(rng.random()*(j+1));[values[j],values[k]]=[values[k],values[j]];}return values;});v.appraisals[p.id]={row:0,factor:1,done:false,board,history:[],baseKg:p.kg,maxRows:speciesLevel(s.xp[p.species])>=10?7:speciesLevel(s.xp[p.species])>=7?5:3};return {handled:true};}
 case 'appraisePick':case 'appraiseStop':{const p=find(c.target),a=v.appraisals[c.target];if(!p||!a||a.done)throw Error('鉴定已结束');if(c.type==='appraisePick'){if(!Number.isInteger(c.column)||c.column<0||c.column>2)throw Error('请选择一格');const m=a.board[a.row][c.column];a.history.push({row:a.row,column:c.column,multiplier:m});a.factor*=m;a.row++;if(m<1||a.row>=a.maxRows)a.done=true;}else a.done=true;if(a.done){p.kg=Math.round(Math.min(SPECIES[p.species].kg*8,Math.max(SPECIES[p.species].kg*.4,a.baseKg*a.factor))*1000)/1000;p.traits=withSize(p.traits,p.kg/SPECIES[p.species].kg);p.value=v3Value(p);p.revealed=true;recordGarden(s,now,'appraise',`鉴定收手：${SPECIES[p.species].name}重量为原来的 ${a.factor.toFixed(2)} 倍`,undefined,p.id);}return {handled:true,reveal:a.done?{title:'果实平安带回来了',message:`最终 ${p.kg.toFixed(3)} kg，鉴定不会销毁果实。`}:undefined};}
 }
 return {handled:false};
}
export function validateV3(s:GardenState):void {
 const v=s.v3;if(!v)return;const num=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
 if(v.version!==3||!num(v.day)||!num(v.week)||!num(v.breeds)||!num(v.rainbowMisses)||!num(v.geneMisses)||!num(v.sizeMisses)||!Array.isArray(v.soil)||v.soil.length!==6||v.soil.some(l=>![1,2,3].includes(l))||!v.oils||!num(v.oils.normal)||!num(v.oils.rich)||!Array.isArray(v.pityEvents)||!Array.isArray(v.records)||!v.counters||!v.xpToday||!Array.isArray(v.sunPartners)||v.sunPartners.length>2||!v.appraisals)throw Error('新版花园记录损坏');
 const slots=(xs:unknown,ts:Trait[])=>Array.isArray(xs)&&xs.length===4&&xs.every((t,i)=>t===null||Object.hasOwn(TRAITS,t)&&ts.includes(t)&&traitSlot(t)===(i===0?'fruit':i===1?'skin':'accessory'))&&new Set(xs.filter(Boolean)).size===xs.filter(Boolean).length;
 if(v.breeds>90||v.rainbowMisses>32||v.geneMisses>9||v.sizeMisses>9||new Set(v.sunPartners).size!==v.sunPartners.length||v.sunPartners.some(x=>typeof x!=='string')||v.records.length>150||v.pityEvents.length>2048||Object.values(v.xpToday).some(x=>!num(x)||x!>60))throw Error('成长进度损坏');
 for(const a of Object.values(v.appraisals))if(!a||!Number.isInteger(a.row)||a.row<0||a.row>a.maxRows||![3,5,7].includes(a.maxRows)||!num(a.factor)||a.factor===0||!num(a.baseKg)||typeof a.done!=='boolean'||!Array.isArray(a.history)||a.history.length!==a.row||!Array.isArray(a.board)||a.board.length!==7||a.board.some((row,i)=>!Array.isArray(row)||row.length!==3||JSON.stringify([...row].sort())!==JSON.stringify((i<3?[1.15,1.15,.9]:i<6?[1.35,.85,.85]:[1.6,.7,.7]).sort())))throw Error('鉴定记录损坏');
 for(const seed of s.seeds)if(seed.slots&&!slots(seed.slots,seed.genes))throw Error('种子槽位损坏');
 for(const p of [...s.produce,...s.plots.filter((p):p is Plant=>!!p)])if(p.growthVersion===3){if(!Array.isArray(p.traits)||p.traits.some(t=>!Object.hasOwn(TRAITS,t))||cappedTraits(p.traits).length!==p.traits.length||(p.slots&&!slots(p.slots,p.traits)))throw Error('新版果实槽位损坏');if(s.plots.includes(p as Plant)&&!('batch'in p))throw Error('缺少批次记录');if('batch'in p){const b=(p as Plant).batch;if(!b||!num(b.seedlingEnd)||!num(b.seed)||typeof b.realm!=='string'||typeof b.settled!=='boolean'||!slots(b.slots,(p as Plant).baseTraits??[])||!Array.isArray(b.candidates)||b.candidates.some(t=>!Object.hasOwn(TRAITS,t))||!Array.isArray(b.exposure)||b.exposure.some(e=>!Object.hasOwn(V3_WEATHER,e.kind)||!num(e.start)||!num(e.end)||e.end<=e.start||e.ms!==e.end-e.start)||![1,2,3].includes(b.soil)||!num(b.sunBonus)||b.sunBonus>.06)throw Error('生长结算记录损坏');}}
}
